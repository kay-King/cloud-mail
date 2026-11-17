import s3Service from './s3-service';
import settingService from './setting-service';
import kvObjService from './kv-obj-service';
import attCrypto from './att-crypto';
import orm from '../entity/orm';
import { att } from '../entity/att';
import { eq } from 'drizzle-orm';
import { attConst } from '../const/entity-const';

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

	async storageType(c) {

		const setting = await settingService.query(c);
		const { bucket, endpoint, s3AccessKey, s3SecretKey } = setting;

		if (!!(bucket && endpoint && s3AccessKey && s3SecretKey)) {
			return 'S3';
		}

		if (c.env.r2) {
			return 'R2';
		}

		return 'KV';
	},

	async putObj(c, key, content, metadata) {

		// 附件先在 Worker 里加密再上传，服务商只存密文；非附件 key 或未配密钥时原样透传
		content = await attCrypto.encrypt(c, key, content);

		const storageType = await this.storageType(c);

		if (storageType === 'KV') {
			await kvObjService.putObj(c, key, content, metadata);
		}

		if (storageType === 'R2') {
			await c.env.r2.put(key, content, {
				httpMetadata: { ...metadata }
			});
		}

		if (storageType === 'S3') {
			await s3Service.putObj(c, key, content, metadata);
		}

	},

	// 返回存储侧原始 Response（不解密），供需要检查密文本身的场景使用
	async getRawObj(c, key) {
		const storageType = await this.storageType(c);

		if (storageType === 'KV') {
			return await kvObjService.getObj(c, key);
		}

		if (storageType === 'R2') {
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

		if (storageType === 'S3') {
			return await s3Service.getObj(c, key);
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

	async delete(c, key) {

		const storageType = await this.storageType(c);

		if (storageType === 'KV') {
			await kvObjService.deleteObj(c, key);
		}

		if (storageType === 'R2') {
			await c.env.r2.delete(key);
		}

		if (storageType === 'S3'){
			await s3Service.deleteObj(c, key);
		}

	}

};
export default r2Service;
