// 备份专用存储：四种目的地（与附件存储相互独立）。
// - s3：用备份设置里的 S3 兼容服务商配置。
// - r2：部署时绑了 R2 bucket 走原生绑定，否则走备份设置里填的 R2 S3 兼容 API。
// - webdav：用备份设置里填的 WebDAV 服务器（坚果云、Nextcloud、群晖等）。
// - kv：直接存到 Cloudflare KV（与系统共用同一个 KV 命名空间），不用填任何配置；
//      单个备份最大 25MB（KV 单值上限），超了会抛错，由调用方按上传失败处理。
// KV 是兜底：所选类型没配好时自动走 KV，保证部署完不用填任何东西就能自动备份。
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import settingService from './setting-service';
import webdavService from './webdav-service';
import domainUtils from '../utils/domain-uitls';
import { settingConst } from '../const/entity-const';

const backupStorageService = {

	async config(c) {
		const setting = await settingService.query(c);
		return {
			type: setting.backupType || 's3',
			bucket: setting.backupBucket,
			region: setting.backupRegion,
			endpoint: setting.backupEndpoint,
			accessKey: setting.backupS3AccessKey,
			secretKey: setting.backupS3SecretKey,
			forcePathStyle: setting.backupForcePathStyle,
			r2AccountId: setting.backupR2AccountId,
			r2Bucket: setting.backupR2Bucket,
			r2AccessKey: setting.backupR2AccessKey,
			r2SecretKey: setting.backupR2SecretKey,
			webdavUrl: setting.backupWebdavUrl,
			webdavUsername: setting.backupWebdavUsername,
			webdavPassword: setting.backupWebdavPassword
		};
	},

	s3Ready(cfg) {
		return !!(cfg.bucket && cfg.endpoint && cfg.accessKey && cfg.secretKey);
	},

	r2ApiConfig(cfg) {
		const accountId = (cfg.r2AccountId || '').trim();
		const bucket = (cfg.r2Bucket || '').trim();
		const accessKey = (cfg.r2AccessKey || '').trim();
		const secretKey = (cfg.r2SecretKey || '').trim();
		if (!(accountId && bucket && accessKey && secretKey)) {
			return null;
		}
		return {
			bucket,
			endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
			region: 'auto',
			accessKey,
			secretKey
		};
	},

	webdavConfig(cfg) {
		const config = {
			url: (cfg.webdavUrl || '').trim(),
			username: (cfg.webdavUsername || '').trim(),
			password: (cfg.webdavPassword || '').trim()
		};
		return webdavService.isConfigured(config) ? config : null;
	},

	// 实际生效的目的地：所选类型配好了就用它，否则兜底 KV
	async effectiveType(c) {
		const cfg = await this.config(c);
		if (cfg.type === 's3' && this.s3Ready(cfg)) return 's3';
		if (cfg.type === 'r2' && (c.env.r2 || this.r2ApiConfig(cfg))) return 'r2';
		if (cfg.type === 'webdav' && this.webdavConfig(cfg)) return 'webdav';
		return 'kv';
	},

	// KV 永远可用，所以备份服务商永远算已配置
	async isConfigured(c) {
		return true;
	},

	async client(c, override) {
		const cfg = await this.config(c);
		const conf = override || {
			region: cfg.region,
			endpoint: cfg.endpoint,
			accessKey: cfg.accessKey,
			secretKey: cfg.secretKey,
			forcePathStyle: cfg.forcePathStyle
		};
		return new S3Client({
			region: conf.region || 'auto',
			endpoint: domainUtils.toOssDomain(conf.endpoint),
			forcePathStyle: conf.forcePathStyle === settingConst.forcePathStyle.OPEN,
			credentials: {
				accessKeyId: conf.accessKey,
				secretAccessKey: conf.secretKey,
			}
		});
	},

	async putObj(c, key, content) {
		const type = await this.effectiveType(c);
		if (type === 'kv') {
			await c.env.kv.put(key, content);
			return;
		}
		if (type === 'webdav') {
			const cfg = await this.config(c);
			await webdavService.putObj(this.webdavConfig(cfg), key, content);
			return;
		}
		if (type === 'r2') {
			if (c.env.r2) {
				await c.env.r2.put(key, content, {
					httpMetadata: { contentType: 'application/octet-stream' }
				});
				return;
			}
			const cfg = await this.config(c);
			const r2 = this.r2ApiConfig(cfg);
			const client = await this.client(c, { ...r2, forcePathStyle: settingConst.forcePathStyle.CLOSE });
			await client.send(new PutObjectCommand({
				Bucket: r2.bucket,
				Key: key,
				Body: content,
				ContentType: 'application/octet-stream'
			}));
			return;
		}
		const cfg = await this.config(c);
		const client = await this.client(c);
		await client.send(new PutObjectCommand({
			Bucket: cfg.bucket,
			Key: key,
			Body: content,
			ContentType: 'application/octet-stream'
		}));
	},

	async getObj(c, key) {
		const type = await this.effectiveType(c);
		if (type === 'kv') {
			const buf = await c.env.kv.get(key, 'arrayBuffer');
			return buf ? new Uint8Array(buf) : null;
		}
		if (type === 'webdav') {
			const cfg = await this.config(c);
			const res = await webdavService.getObj(this.webdavConfig(cfg), key);
			return res ? new Uint8Array(await res.arrayBuffer()) : null;
		}
		if (type === 'r2' && c.env.r2) {
			const obj = await c.env.r2.get(key);
			return obj ? new Uint8Array(await obj.arrayBuffer()) : null;
		}
		const cfg = await this.config(c);
		let bucket = cfg.bucket;
		let client = await this.client(c);
		if (type === 'r2') {
			const r2 = this.r2ApiConfig(cfg);
			bucket = r2.bucket;
			client = await this.client(c, { ...r2, forcePathStyle: settingConst.forcePathStyle.CLOSE });
		}
		try {
			const out = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
			return new Uint8Array(await out.Body.arrayBuffer());
		} catch (e) {
			if (e.name === 'NoSuchKey' || e.$metadata?.httpStatusCode === 404) return null;
			throw e;
		}
	},

	async deleteObj(c, key) {
		const type = await this.effectiveType(c);
		if (type === 'kv') {
			await c.env.kv.delete(key);
			return;
		}
		if (type === 'webdav') {
			const cfg = await this.config(c);
			await webdavService.deleteObj(this.webdavConfig(cfg), key);
			return;
		}
		if (type === 'r2' && c.env.r2) {
			await c.env.r2.delete(key);
			return;
		}
		const cfg = await this.config(c);
		let bucket = cfg.bucket;
		let client = await this.client(c);
		if (type === 'r2') {
			const r2 = this.r2ApiConfig(cfg);
			bucket = r2.bucket;
			client = await this.client(c, { ...r2, forcePathStyle: settingConst.forcePathStyle.CLOSE });
		}
		await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
	}
};

export default backupStorageService;
