import s3Service from './s3-service';
import settingService from './setting-service';
import kvObjService from './kv-obj-service';
import attCrypto from './att-crypto';

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

	// 统一返回 Response（或 null），读取时自动解密；明文对象（无魔术头）直接透传
	async getObj(c, key) {
		const storageType = await this.storageType(c);

		let resp = null;

		if (storageType === 'KV') {
			resp = await kvObjService.getObj(c, key);
		}

		if (storageType === 'R2') {
			const obj = await c.env.r2.get(key);
			if (!obj) {
				return null;
			}
			resp = new Response(obj.body, {
				headers: {
					'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream',
					'Content-Disposition': obj.httpMetadata?.contentDisposition || null,
					'Cache-Control': obj.httpMetadata?.cacheControl || null
				}
			});
		}

		if (storageType === 'S3') {
			resp = await s3Service.getObj(c, key);
		}

		if (!resp) {
			return null;
		}

		const plain = await attCrypto.decrypt(c, key, resp);
		return new Response(plain, { headers: resp.headers });
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
