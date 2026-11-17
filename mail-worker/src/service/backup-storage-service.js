// 备份专用存储：两种目的地（二选一）。
// - s3：用备份设置里的 S3 兼容服务商配置（与附件存储相互独立）。
// - kv：直接存到 Cloudflare KV（与系统共用同一个 KV 命名空间），不用填任何配置；
//      单个备份最大 25MB（KV 单值上限），超了会抛错，由调用方按上传失败处理。
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import settingService from './setting-service';
import domainUtils from '../utils/domain-uitls';
import { settingConst } from '../const/entity-const';

const backupStorageService = {

	async config(c) {
		const { backupType, backupBucket, backupRegion, backupEndpoint, backupS3AccessKey, backupS3SecretKey, backupForcePathStyle } = await settingService.query(c);
		return {
			type: backupType || 's3',
			bucket: backupBucket,
			region: backupRegion,
			endpoint: backupEndpoint,
			accessKey: backupS3AccessKey,
			secretKey: backupS3SecretKey,
			forcePathStyle: backupForcePathStyle
		};
	},

	async isConfigured(c) {
		const cfg = await this.config(c);
		if (cfg.type === 'kv') return true;
		return !!(cfg.bucket && cfg.endpoint && cfg.accessKey && cfg.secretKey);
	},

	async client(c) {
		const cfg = await this.config(c);
		return new S3Client({
			region: cfg.region || 'auto',
			endpoint: domainUtils.toOssDomain(cfg.endpoint),
			forcePathStyle: cfg.forcePathStyle === settingConst.forcePathStyle.OPEN,
			credentials: {
				accessKeyId: cfg.accessKey,
				secretAccessKey: cfg.secretKey,
			}
		});
	},

	async putObj(c, key, content) {
		const cfg = await this.config(c);
		if (cfg.type === 'kv') {
			await c.env.kv.put(key, content);
			return;
		}
		const client = await this.client(c);
		await client.send(new PutObjectCommand({
			Bucket: cfg.bucket,
			Key: key,
			Body: content,
			ContentType: 'application/octet-stream'
		}));
	},

	async getObj(c, key) {
		const cfg = await this.config(c);
		if (cfg.type === 'kv') {
			const buf = await c.env.kv.get(key, 'arrayBuffer');
			return buf ? new Uint8Array(buf) : null;
		}
		const client = await this.client(c);
		try {
			const out = await client.send(new GetObjectCommand({ Bucket: cfg.bucket, Key: key }));
			return new Uint8Array(await out.Body.arrayBuffer());
		} catch (e) {
			if (e.name === 'NoSuchKey' || e.$metadata?.httpStatusCode === 404) return null;
			throw e;
		}
	},

	async deleteObj(c, key) {
		const cfg = await this.config(c);
		if (cfg.type === 'kv') {
			await c.env.kv.delete(key);
			return;
		}
		const client = await this.client(c);
		await client.send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }));
	}
};

export default backupStorageService;
