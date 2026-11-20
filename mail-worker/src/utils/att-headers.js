// 公开对象（/oss、/attachments、/static）的响应头。
// 只允许栅格图 inline；SVG/HTML 等一律当附件，并加 nosniff + CSP sandbox。

const SAFE_INLINE_TYPES = new Set([
	'image/jpeg',
	'image/jpg',
	'image/png',
	'image/gif',
	'image/webp',
	'image/avif',
	'image/bmp',
	'image/x-icon',
	'image/vnd.microsoft.icon'
]);

export function mimeTypeOf(contentType) {
	if (!contentType) {
		return '';
	}
	return String(contentType).split(';')[0].trim().toLowerCase();
}

export function isSafeInlineAtt(contentType) {
	return SAFE_INLINE_TYPES.has(mimeTypeOf(contentType));
}

export function isDangerousAttType(contentType) {
	const type = mimeTypeOf(contentType);
	return /svg|html|xml|javascript|ecmascript/.test(type);
}

export function publicFileHeaders({ contentType, contentDisposition, cacheControl } = {}) {
	const type = mimeTypeOf(contentType);
	const safeInline = SAFE_INLINE_TYPES.has(type);
	const headers = {
		'Content-Type': isDangerousAttType(type) || !type
			? 'application/octet-stream'
			: contentType,
		'Content-Disposition': safeInline
			? (contentDisposition || 'inline')
			: toAttachmentDisposition(contentDisposition),
		'X-Content-Type-Options': 'nosniff',
		'Content-Security-Policy': 'sandbox'
	};

	if (cacheControl) {
		headers['Cache-Control'] = cacheControl;
	}

	return headers;
}

function toAttachmentDisposition(disposition) {
	if (!disposition) {
		return 'attachment';
	}
	const value = String(disposition);
	if (/^\s*inline\b/i.test(value)) {
		return value.replace(/^\s*inline/i, 'attachment');
	}
	if (/^\s*attachment\b/i.test(value)) {
		return value;
	}
	return `attachment; ${value}`;
}

// 从文件名拼 Content-Disposition：纯 ASCII 安全名用引号形式，其余用 RFC 5987 编码
// （B2 的 S3 接口不接受非 ASCII 文件名，中文名会报 invalid b2-content-disposition；
//  r2-service 下载时与 s3-service 上传时共用这一套，下载时浏览器能还原原名）
export function buildContentDisposition(type, filename) {
	if (/^[A-Za-z0-9._-]+$/.test(filename)) {
		return `${type}; filename="${filename}"`;
	}
	const encoded = encodeURIComponent(filename).replace(/['()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'));
	return `${type}; filename*=UTF-8''${encoded}`;
}
