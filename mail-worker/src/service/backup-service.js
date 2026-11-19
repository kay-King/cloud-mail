// 数据备份：把 D1 全库（表结构 + 所有行）与 KV 全量键值打成一个 JSON 备份。
// 定时备份（每小时触发、每天最多一次）加密后存到备份服务商，保留最近 7 份；
// 手动导出直接下载明文 JSON（配了服务商也同步存一份加密副本）。
// 注意：备份含 KV 里的附件加密钥匙与用户密码哈希，本地文件请妥善保管，勿外传。
// 目的地是 KV 时例外：存的副本只留 D1 + 加密钥匙（KV 里唯一不可再生的东西），
// 其余 KV 内容（设置缓存、登录 token、节流标记）都是可重建或临时的，
// 不存回同一个 KV 里；手动下载的文件永远是全量（下载到手就是异地备份）。
import settingService from './setting-service';
import backupStorageService from './backup-storage-service';
import emailService from './email-service';
import attCrypto from './att-crypto';
import constant from '../const/constant';
import BizError from '../error/biz-error';

const LAST_RUN_KEY = 'backup:last-run:';
const LIST_KEY = 'backup:list:';
const KEEP_COUNT = 7;
const MIN_INTERVAL_MS = 20 * 60 * 60 * 1000;
// 备份失败提醒节流：24 小时内只提醒一次，避免备份持续故障时刷屏
const FAIL_NOTIFY_KEY = 'backup-fail-notify-last:';
const FAIL_NOTIFY_INTERVAL_MS = 24 * 60 * 60 * 1000;
// KV 里唯一不可再生的东西：附件加密钥匙（只在 KV 里有，D1 里没有）。
// 目的地是 KV 时，存的副本只保留这两条钥匙，其余 KV 内容一律不存。
const KV_KEY_PREFIXES = ['att-current-key:', 'att-key-history:'];

function escapeHtml(s) {
	return String(s ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

// D1 存的时间是 UTC，转北京时间显示
function nowCST() {
	return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');
}

// manual=true 是手动导出时触发：备份文件本身已下载成功，失败的只是往服务商存副本那一步
function buildBackupFailNotice(error, manual) {
	const reason = String(error?.message || error || '未知原因').slice(0, 200);
	const now = nowCST();
	const manualLine = manual ? '<p>你刚才下载的备份文件本身是完整的，这次失败的只是往服务商上存副本那一步。</p>' : '';
	const manualText = manual ? '\n你刚才下载的备份文件本身是完整的，这次失败的只是往服务商上存副本那一步。\n' : '';
	return {
		subject: '备份失败提醒',
		html: `<p>你好：</p><p>备份失败了，备份没有存到备份服务商上。</p>${manualLine}<p>失败时间：${now}</p><p>失败原因：${escapeHtml(reason)}</p><p>数据本身不受影响。请检查系统设置 → 数据备份里的备份服务商配置是否正确（如地址、密钥有没有填错），修好后下一次备份会自动重试。</p>`,
		text: `你好：\n\n备份失败了，备份没有存到备份服务商上。${manualText}\n失败时间：${now}\n失败原因：${reason}\n\n数据本身不受影响。请检查系统设置 → 数据备份里的备份服务商配置是否正确（如地址、密钥有没有填错），修好后下一次备份会自动重试。`
	};
}

const backupService = {

	async isEnabled(c) {
		const setting = await settingService.query(c);
		return settingService.backupConfig(setting).autoBackup !== 0;
	},

	async dumpDatabase(c) {
		const db = c.env.db;
		const tablesRes = await db.prepare(
			"SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
		).all();
		const tables = [];
		for (const t of (tablesRes.results || [])) {
			// 跳过 Cloudflare 内部表（如 _cf_KV）：D1 禁止用户读取，读了会抛 SQLITE_AUTH
			if (String(t.name).startsWith('_cf_')) continue;
			let rows;
			try {
				const rowsRes = await db.prepare(`SELECT * FROM "${String(t.name).replace(/"/g, '""')}"`).all();
				rows = rowsRes.results || [];
			} catch (e) {
				// 单张表读失败不中断整个备份，记日志后跳过
				console.error('Backup skipped unreadable table', t.name, e);
				continue;
			}
			tables.push({ name: t.name, sql: t.sql, rows });
		}
		return { tables };
	},

	async dumpKv(c) {
		const kv = {};
		let cursor;
		do {
			const page = await c.env.kv.list(cursor ? { cursor } : {});
			for (const k of page.keys) {
				// 备份自身的元数据不进备份，避免自引用
				if (k.name === LAST_RUN_KEY || k.name === LIST_KEY) continue;
				// KV 方式存的备份对象（backups/ 前缀）不进备份，否则备份会把旧备份越包越大
				if (k.name.startsWith(constant.BACKUP_PREFIX)) continue;
				// static/ 下是二进制大对象（如登录背景图，单个可达 10MB），
				// 正式内容走对象存储、KV 里只是旧时代残留，带上会把备份撑大上千倍，直接跳过
				if (k.name.startsWith('static/')) continue;
				kv[k.name] = await c.env.kv.get(k.name);
			}
			cursor = page.list_complete ? undefined : page.cursor;
		} while (cursor);
		return kv;
	},

	async buildBackup(c) {
		const [d1, kv] = await Promise.all([this.dumpDatabase(c), this.dumpKv(c)]);
		return { version: 1, exportedAt: new Date().toISOString(), d1, kv };
	},

	// 目的地是 KV 时的精简版：D1 全留，KV 只留加密钥匙
	slimBackupForKv(backup) {
		const kv = {};
		for (const [k, v] of Object.entries(backup.kv || {})) {
			if (KV_KEY_PREFIXES.some(p => k.startsWith(p))) kv[k] = v;
		}
		return { ...backup, kv };
	},

	backupFilename(date) {
		const ts = date.toISOString().slice(0, 19).replace(/[-:T]/g, '');
		return `${constant.BACKUP_PREFIX}cloud-mail-backup-${ts}.json`;
	},

	async listBackups(c) {
		try {
			return JSON.parse(await c.env.kv.get(LIST_KEY) || '[]');
		} catch {
			return [];
		}
	},

	// 执行一次备份。force=true 为手动导出（不受开关与间隔限制）；
	// force=false 为定时触发（开关关、未配服务商、20 小时内已备过都跳过）。
	// 返回 {status, key, size, uploaded, uploadError, time, data}
	async runBackup(c, { force = false } = {}) {
		if (!force && !await this.isEnabled(c)) {
			return { status: 'disabled' };
		}
		const configured = await backupStorageService.isConfigured(c);
		if (!force && !configured) {
			return { status: 'not-configured' };
		}
		if (!force) {
			const lastRun = await c.env.kv.get(LAST_RUN_KEY);
			if (lastRun && Date.now() - Number(lastRun) < MIN_INTERVAL_MS) {
				return { status: 'skipped', lastRun: Number(lastRun) };
			}
		}
		const backup = await this.buildBackup(c);
		// 下载用的永远是全量；往服务商存的副本按目的地决定（KV 只存 D1 + 钥匙）
		const plain = new TextEncoder().encode(JSON.stringify(backup));
		const now = new Date();
		const key = this.backupFilename(now);
		let uploaded = false;
		let uploadError = null;
		if (configured) {
			try {
				let uploadData = plain;
				const type = await backupStorageService.effectiveType(c);
				if (type === 'kv') {
					uploadData = new TextEncoder().encode(JSON.stringify(this.slimBackupForKv(backup)));
				}
				const encrypted = await attCrypto.encrypt(c, key, uploadData);
				await backupStorageService.putObj(c, key, encrypted);
				const list = await this.listBackups(c);
				list.unshift({ key, time: now.getTime(), size: plain.length });
				const pruned = list.splice(KEEP_COUNT);
				await c.env.kv.put(LIST_KEY, JSON.stringify(list));
				await c.env.kv.put(LAST_RUN_KEY, String(now.getTime()));
				for (const old of pruned) {
					try {
						await backupStorageService.deleteObj(c, old.key);
					} catch (e) {
						console.error('Failed to prune backup', old.key, e);
					}
				}
				uploaded = true;
			} catch (e) {
				uploadError = e.message || String(e);
				console.error('Backup upload failed', e);
				// 定时与手动都提醒：定时失败本就静默，手动导出时用户只拿到下载文件，
				// 存副本失败不提醒就没人知道；节流保证 24 小时内只提醒一次
				await this.notifyBackupFailed(c, uploadError, { manual: force });
			}
		}
		return { status: 'done', key, size: plain.length, uploaded, uploadError, time: now.getTime(), data: plain };
	},

	async getStatus(c) {
		const enabled = await this.isEnabled(c);
		const configured = await backupStorageService.isConfigured(c);
		const type = await backupStorageService.effectiveType(c);
		const list = await this.listBackups(c);
		const lastRun = await c.env.kv.get(LAST_RUN_KEY);
		return {
			enabled,
			configured,
			type,
			count: list.length,
			lastRun: lastRun ? Number(lastRun) : null,
			latest: list[0] || null
		};
	},

	// 备份失败提醒：发给管理员（发件走系统通知邮箱），24 小时内只提醒一次。
	// 提醒本身绝不能抛错影响备份流程，全程 try/catch，只记日志。
	async notifyBackupFailed(c, error, { manual = false } = {}) {
		try {
			if (!await emailService.isBackupFailNotifyEnabled(c)) return;
			const sender = await emailService.getNotifySender(c);
			if (!sender) return;
			const kv = c.env?.kv;
			if (kv) {
				try {
					const last = await kv.get(FAIL_NOTIFY_KEY);
					if (last && Date.now() - Number(last) < FAIL_NOTIFY_INTERVAL_MS) return;
					await kv.put(FAIL_NOTIFY_KEY, String(Date.now()));
				} catch (e) {
					console.error('备份失败提醒节流读写失败：', e);
				}
			}
			const notice = buildBackupFailNotice(error, manual);
			await emailService.send(c, {
				accountId: sender.accountId,
				name: '系统通知',
				receiveEmail: [c.env.admin],
				subject: notice.subject,
				content: notice.html,
				text: notice.text,
				skipForward: true
			}, sender.userId);
		} catch (e) {
			console.error('备份失败提醒发送失败：', e);
		}
	},

	// 取服务商上最新的一份备份并解密；没有返回 null
	async downloadLatest(c) {
		const list = await this.listBackups(c);
		if (list.length === 0) return null;
		const latest = list[0];
		const encrypted = await backupStorageService.getObj(c, latest.key);
		if (!encrypted) return null;
		const plain = await attCrypto.decrypt(c, latest.key, encrypted);
		return { key: latest.key, time: latest.time, data: plain };
	},

	// 从备份 JSON 恢复：D1 各表先清后插（批量单事务执行，任一失败整体回滚），
	// KV 逐键写回，最后刷新设置缓存。备份里没有的表/键保持不动。
	async restoreBackup(c, backup) {
		if (!backup || backup.version !== 1 || !backup.d1 || !Array.isArray(backup.d1.tables) || !backup.kv || typeof backup.kv !== 'object') {
			throw new BizError('不是有效的备份文件', 400);
		}
		const db = c.env.db;
		const statements = [];
		let rowCount = 0;
		const nameRe = /^[A-Za-z_][A-Za-z0-9_]*$/;
		for (const table of backup.d1.tables) {
			if (!table || !nameRe.test(table.name) || !Array.isArray(table.rows)) {
				throw new BizError('备份数据不合法', 400);
			}
			// 备份里有建表语句时先确保表存在（防备份来自更新版本）
			if (typeof table.sql === 'string' && /^CREATE TABLE/i.test(table.sql)) {
				statements.push(db.prepare(table.sql.replace(/^CREATE TABLE/i, 'CREATE TABLE IF NOT EXISTS')));
			}
			statements.push(db.prepare(`DELETE FROM "${table.name}"`));
			for (const row of table.rows) {
				const cols = Object.keys(row);
				for (const col of cols) {
					if (!nameRe.test(col)) throw new BizError('备份数据不合法', 400);
				}
				if (cols.length === 0) continue;
				const placeholders = cols.map(() => '?').join(', ');
				const values = cols.map(k => {
					const v = row[k];
					if (typeof v === 'boolean') return v ? 1 : 0;
					return v;
				});
				statements.push(db.prepare(`INSERT INTO "${table.name}" ("${cols.join('", "')}") VALUES (${placeholders})`).bind(...values));
				rowCount++;
			}
		}
		const BATCH_SIZE = 1000;
		for (let i = 0; i < statements.length; i += BATCH_SIZE) {
			await db.batch(statements.slice(i, i + BATCH_SIZE));
		}
		// 自增序号重建：删掉 sqlite_sequence 里对应行，SQLite 下次插入时按 MAX(id)+1 推导；失败不影响恢复
		try {
			const seqStmts = backup.d1.tables.map(t => db.prepare('DELETE FROM sqlite_sequence WHERE name = ?').bind(t.name));
			if (seqStmts.length > 0) await db.batch(seqStmts);
		} catch (e) {
			console.error('Restore: failed to reset sqlite_sequence', e);
		}
		// KV 写回（跳过空值与备份自身元数据）
		let kvCount = 0;
		for (const [key, value] of Object.entries(backup.kv)) {
			if (value === null || value === undefined) continue;
			if (key === LAST_RUN_KEY || key === LIST_KEY) continue;
			await c.env.kv.put(key, String(value));
			kvCount++;
		}
		// 设置表已恢复，重建 KV 里的设置缓存
		await settingService.refresh(c);
		return { tables: backup.d1.tables.length, rows: rowCount, kvKeys: kvCount };
	}
};

export default backupService;
