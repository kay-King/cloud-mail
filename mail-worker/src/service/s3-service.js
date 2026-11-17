import { S3Client, PutObjectCommand, DeleteObjectsCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import settingService from './setting-service';
import domainUtils from '../utils/domain-uitls';
import { settingConst } from '../const/entity-const';

// B2 的 S3 接口不接受 Content-Disposition 里的非 ASCII 文件名（中文名会报 invalid b2-content-disposition），
// 非纯 ASCII 文件名改用 RFC 5987 编码，下载时浏览器能还原原名。
function sanitizeContentDisposition(disposition) {
	const match = disposition.match(/^(attachment|inline);\s*filename=(.*)$/i);
	if (!match) return disposition;
	const type = match[1].toLowerCase();
	let filename = match[2].trim();
	if (filename.startsWith('"') && filename.endsWith('"')) {
		filename = filename.slice(1, -1);
	}
	if (/^[A-Za-z0-9._-]+$/.test(filename)) {
		return `${type}; filename="${filename}"`;
	}
	const encoded = encodeURIComponent(filename).replace(/['()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'));
	return `${type}; filename*=UTF-8''${encoded}`;
}

const s3Service = {

	async putObj(c, key, content, metadata) {

		const client = await this.client(c);

		const { bucket } = await settingService.query(c);

		let obj = { Bucket: bucket, Key: key, Body: content,
			CacheControl: metadata.cacheControl
		}

		if (metadata.cacheControl) {
			obj.CacheControl = metadata.cacheControl
		}

		if (metadata.contentDisposition) {
			obj.ContentDisposition = sanitizeContentDisposition(metadata.contentDisposition)
		}

		if (metadata.contentType) {
			obj.ContentType = metadata.contentType
		}

		await client.send(new PutObjectCommand(obj))
	},

	async deleteObj(c, keys) {

		if (typeof keys === 'string') {
			keys = [keys];
		}

		if (keys.length === 0) {
			return;
		}

		const client = await this.client(c);
		const { bucket } = await settingService.query(c);


		client.middlewareStack.add(
			(next) => async (args) => {

				const body = args.request.body

				// 计算 MD5 校验和并转换为 Base64 编码
				const encoder = new TextEncoder();
				const data = encoder.encode(body);

				// 使用 Web Crypto API 计算 MD5 校验和
				const hashBuffer = await crypto.subtle.digest('MD5', data);
				const hashArray = new Uint8Array(hashBuffer);
				const contentMD5 = btoa(String.fromCharCode.apply(null, hashArray));

				args.request.headers["Content-MD5"] = contentMD5;

				return next(args);
			},
			{ step: "build", name: "inspectRequestMiddleware" }
		);


		await client.send(
			new DeleteObjectsCommand({
				Bucket: bucket,
				Delete: {
					Objects: keys.map(key => ({ Key: key }))
				}
			})
		);
	},

	async getObj(c, key) {
		const client = await this.client(c);
		const { bucket } = await settingService.query(c);
		const result = await client.send(new GetObjectCommand({
			Bucket: bucket,
			Key: key
		}));

		return new Response(result.Body, {
			headers: {
				'Content-Type': result.ContentType || 'application/octet-stream',
				'Content-Disposition': result.ContentDisposition || null,
				'Cache-Control': result.CacheControl || null
			}
		});
	},


	async client(c) {
		const { region, endpoint, s3AccessKey, s3SecretKey, forcePathStyle } = await settingService.query(c);
		return new S3Client({
			region: region || 'auto',
			endpoint: domainUtils.toOssDomain(endpoint),
			forcePathStyle: forcePathStyle === settingConst.forcePathStyle.OPEN,
			credentials: {
				accessKeyId: s3AccessKey,
				secretAccessKey: s3SecretKey,
			}
		});
	}
}

export default s3Service
