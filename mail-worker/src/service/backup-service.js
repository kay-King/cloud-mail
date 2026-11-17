// 数据备份：把 D1 全库（表结构 + 所有行）与 KV 全量键值打成一个 JSON 备份。
// 定时备份（每小时触发、每天最多一次）加密后存到备份服务商，保留最近 7 份；
// 手动导出直接下载明文 JSON（配了服务商也同步存一份加密副本）。
// 注意：备份含 KV 里的附件加密钥匙与用户密码哈希，本地文件请妥善保管，勿外传。
import settingService from './setting-service';
import backupStorageService from './backup-storage-service';
import attCrypto from './att-crypto';
import constant from '../const/constant';
import BizError from '../error/biz-error';

const LAST_RUN_KEY = 'backup:last-run:';
const LIST_KEY = 'backup:list:';
const KEEP_COUNT = 7;
const MIN_INTERVAL_MS = 20 * 60 * 60 * 1000;

const backupService = {

	async isEnabled(c) {
		const { autoBackup } = await settingService.query(c);
		return autoBackup !== 0;
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
		const backup = { version: 1, exportedAt: new Date().toISOString(), d1, kv };
		return new TextEncoder().encode(JSON.stringify(backup));
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
		const plain = await this.buildBackup(c);
		const now = new Date();
		const key = this.backupFilename(now);
		let uploaded = false;
		let uploadError = null;
		if (configured) {
			try {
				const encrypted = await attCrypto.encrypt(c, key, plain);
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
