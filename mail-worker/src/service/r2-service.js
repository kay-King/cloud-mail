import s3Service from './s3-service';
import settingService from './setting-service';
import kvObjService from './kv-obj-service';
import attCrypto from './att-crypto';
import webdavService from './webdav-service';
import orm from '../entity/orm';
import { att } from '../entity/att';
import { eq } from 'drizzle-orm';
import { attConst, settingConst } from '../const/entity-const';

// 从文件名拼 Content-Disposition：纯 ASCII 安全名用引号形式，其余用 RFC 5987 编码
//（与 s3-service 的 sanitizeContentDisposition 同一套规则，避免非 ASCII 文件名被拒收）
function buildContentDisposition(type, filename) {
	if (/^[A-Za-z0-9._-]+$/.test(filename)) {
		return `${type}; filename="${filename}"`;
	}
	const encoded = encodeURIComponent(filename).replace(/['()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'));
	return `${type}; filename*=UTF-8''${encoded}`;
}

const r2Service = {

	// 各存储类型是否配好（KV 永远可用）；供写入回落、读取兜底与删除清理共用
	readyTypes(c, setting) {
		const s3Ready = !!(setting.bucket && setting.endpoint && setting.s3AccessKey && setting.s3SecretKey);
		const r2Ready = !!(c.env.r2 || this.r2ApiConfig(setting));
		const webdavReady = webdavService.isConfigured({
			url: setting.webdavUrl, username: setting.webdavUsername, password: setting.webdavPassword
		});
		return { s3: s3Ready, r2: r2Ready, webdav: webdavReady, kv: true };
	},

	async storageType(c, setting) {

		setting = setting || await settingService.query(c);
		const ready = this.readyTypes(c, setting);
		const type = setting.attStorageType || 's3';

		// 显式选择优先；所选类型不可用时按 S3 → R2 → WebDAV → KV 安全回落，保证读写不断
		if (type === 's3' && ready.s3) {
			return 'S3';
		}

		if (type === 'r2' && ready.r2) {
			return 'R2';
		}

		if (type === 'webdav' && ready.webdav) {
			return 'WebDAV';
		}

		if (type === 'kv') {
			return 'KV';
		}

		if (ready.s3) {
			return 'S3';
		}

		if (ready.r2) {
			return 'R2';
		}

		if (ready.webdav) {
			return 'WebDAV';
		}

		return 'KV';
	},

	// 附件 WebDAV 配置（三项齐全才可用）
	webdavConfig(setting) {
		const config = {
			url: (setting.webdavUrl || '').trim(),
			username: (setting.webdavUsername || '').trim(),
			password: (setting.webdavPassword || '').trim()
		};
		return webdavService.isConfigured(config) ? config : null;
	},

	// R2 的 S3 兼容 API 配置（网页里填的账号 ID + bucket + API 令牌），四项齐全才可用；
	// 返回 null 表示未配，走绑定或回落。endpoint 由账号 ID 固定拼出，region 恒为 auto。
	r2ApiConfig(setting) {
		const accountId = (setting.r2AccountId || '').trim();
		const bucket = (setting.r2Bucket || '').trim();
		const s3AccessKey = (setting.r2AccessKey || '').trim();
		const s3SecretKey = (setting.r2SecretKey || '').trim();
		if (!(accountId && bucket && s3AccessKey && s3SecretKey)) {
			return null;
		}
		return {
			bucket,
			endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
			region: 'auto',
			s3AccessKey,
			s3SecretKey,
			// R2 标准用法是虚拟主机式（bucket 在域名里），不强制路径式
			forcePathStyle: settingConst.forcePathStyle.CLOSE,
		};
	},

	// R2 读写：有绑定走原生绑定，否则走 S3 兼容 API；两者都没有时返回 false
	async r2PutObj(c, key, content, metadata) {
		if (c.env.r2) {
			await c.env.r2.put(key, content, {
				httpMetadata: { ...metadata }
			});
			return true;
		}
		const config = this.r2ApiConfig(await settingService.query(c));
		if (!config) {
			return false;
		}
		await s3Service.putObj(c, key, content, metadata, config);
		return true;
	},

	async r2GetObj(c, key) {
		if (c.env.r2) {
			const obj = await c.env.r2.get(key);
			if (!obj) {
				return null;
			}
			return new Response(obj.body, {
				headers: {
					'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream',
					'Content-Disposition': obj.httpMetadata?.contentDisposition || null,
					'Cache-Control': obj.httpMetadata?.cacheControl || null
				}
			});
		}
		const config = this.r2ApiConfig(await settingService.query(c));
		if (!config) {
			return null;
		}
		return await s3Service.getObj(c, key, config);
	},

	async r2Delete(c, key) {
		if (c.env.r2) {
			await c.env.r2.delete(key);
			return true;
		}
		const config = this.r2ApiConfig(await settingService.query(c));
		if (!config) {
			return false;
		}
		await s3Service.deleteObj(c, key, config);
		return true;
	},

	async putObj(c, key, content, metadata) {

		// 附件先在 Worker 里加密再上传，服务商只存密文；非附件 key 或未配密钥时原样透传
		content = await attCrypto.encrypt(c, key, content);

		const storageType = await this.storageType(c);

		if (storageType === 'KV') {
			await kvObjService.putObj(c, key, content, metadata);
		}

		if (storageType === 'R2') {
			await this.r2PutObj(c, key, content, metadata);
		}

		if (storageType === 'S3') {
			await s3Service.putObj(c, key, content, metadata);
		}

		if (storageType === 'WebDAV') {
			const config = this.webdavConfig(await settingService.query(c));
			await webdavService.putObj(config, key, content, metadata?.contentType);
		}

	},

	// S3/R2 API 找不到文件时抛 NoSuchKey 而不是返回 null，这里统一识别为“没找到”
	isNotFoundError(e) {
		const status = e?.$metadata?.httpStatusCode;
		const code = e?.name || e?.Code || e?.code;
		return status === 404 || code === 'NoSuchKey' || code === 'NotFound';
	},

	// 在单个存储里读原始对象：找到返回 Response，找不到返回 null；
	// 非 404 的报错（如密钥失效）直接抛给调用方处理
	async getRawFrom(c, key, type, setting) {
		try {
			if (type === 'KV') {
				return await kvObjService.getObj(c, key);
			}
			if (type === 'R2') {
				return await this.r2GetObj(c, key);
			}
			if (type === 'S3') {
				return await s3Service.getObj(c, key);
			}
			if (type === 'WebDAV') {
				const config = this.webdavConfig(setting);
				if (!config) {
					return null;
				}
				return await webdavService.getObj(config, key);
			}
		} catch (e) {
			if (this.isNotFoundError(e)) {
				return null;
			}
			throw e;
		}
		return null;
	},

	// 返回存储侧原始 Response（不解密），供需要检查密文本身的场景使用；
	// 读取多存储兜底：先找当前存储，找不到依次试其他已配存储——切换存储后
	// 旧附件不用迁移，照常下载；新附件只写当前存储
	async getRawObj(c, key) {
		const setting = await settingService.query(c);
		const current = await this.storageType(c, setting);
		const ready = this.readyTypes(c, setting);
		const order = ['S3', 'R2', 'WebDAV', 'KV'];
		const types = [current, ...order.filter(t => t !== current && ready[t.toLowerCase()])];

		let firstError = null;
		for (const type of types) {
			try {
				const resp = await this.getRawFrom(c, key, type, setting);
				if (resp) {
					return resp;
				}
			} catch (e) {
				if (!firstError) {
					firstError = e;
				}
			}
		}
		// 全都没找到：有真实报错就抛出来（不是 404），否则返回 null
		if (firstError) {
			throw firstError;
		}
		return null;
	},

	// 统一返回 Response（或 null），读取时自动解密；明文对象（无魔术头）直接透传
	async getObj(c, key) {
		const resp = await this.getRawObj(c, key);

		if (!resp) {
			return null;
		}

		const plain = await attCrypto.decrypt(c, key, resp);
		const headers = new Headers(resp.headers);

		// 附件文件名不存对象元数据，下载时从 D1 按 key 查文件名再拼 Content-Disposition；
		// 查不到记录（如孤儿对象）时保留存储侧的头，下载不受影响
		if (attCrypto.isAttachmentKey(key)) {
			try {
				const rows = await orm(c).select().from(att).where(eq(att.key, key)).all();
				if (rows.length > 0) {
					const attRow = rows.find(r => r.type === attConst.type.ATT && r.filename) || rows[0];
					if (attRow.type === attConst.type.ATT && attRow.filename) {
						headers.set('Content-Disposition', buildContentDisposition('attachment', attRow.filename));
					} else {
						headers.set('Content-Disposition', 'inline');
					}
				}
			} catch (e) {
				console.error('Failed to resolve attachment filename for', key, e);
			}
		}

		return new Response(plain, { headers });
	},

	/**
	 * Always returns a Response (or null if missing) so HTTP handlers
	 * can serve KV / R2 / S3 the same way.
	 */
	async toObjResp(c, key) {
		try {
			return await this.getObj(c, key);
		} catch (e) {
			const status = e?.$metadata?.httpStatusCode;
			const code = e?.name || e?.Code || e?.code;
			if (status === 404 || code === 'NoSuchKey' || code === 'NotFound') {
				return null;
			}
			throw e;
		}
	},

	// 删除要清掉所有已配存储里的副本，否则读取兜底会把已删文件又找回来；
	// 各家独立 try/catch，一家失败不影响其他家；key 可传单个或数组
	async delete(c, key) {

		const keys = Array.isArray(key) ? key : [key];
		if (keys.length === 0) {
			return;
		}

		const setting = await settingService.query(c);
		const ready = this.readyTypes(c, setting);
		const order = ['S3', 'R2', 'WebDAV', 'KV'];

		for (const type of order) {
			if (!ready[type.toLowerCase()]) {
				continue;
			}
			try {
				if (type === 'KV') {
					await kvObjService.deleteObj(c, keys);
				} else if (type === 'R2') {
					await this.r2Delete(c, keys);
				} else if (type === 'S3') {
					await s3Service.deleteObj(c, keys);
				} else if (type === 'WebDAV') {
					const config = this.webdavConfig(setting);
					if (!config) {
						continue;
					}
					for (const k of keys) {
						await webdavService.deleteObj(config, k);
					}
				}
			} catch (e) {
				console.error('Failed to delete', keys, 'from', type, e);
			}
		}

	}

};
export default r2Service;
