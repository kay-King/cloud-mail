// 邮件导出：把 D1 里的邮件拼成标准 .eml（RFC 822），单封直接下载，多封打成 zip。
// 附件从对象存储取回（自动解密）再以 base64 内嵌；正文内嵌图按 contentId 还原成 cid: 引用。
import orm from '../entity/orm';
import { email } from '../entity/email';
import { eq, inArray, and } from 'drizzle-orm';
import attService from './att-service';
import r2Service from './r2-service';
import { attConst, emailConst } from '../const/entity-const';
import { zipSync } from '../utils/fflate.js';

export const MAX_EXPORT = 50;

function uint8ToBase64(bytes) {
	let binary = '';
	const CHUNK = 0x8000;
	for (let i = 0; i < bytes.length; i += CHUNK) {
		binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
	}
	return btoa(binary);
}

function utf8ToBase64(str) {
	return uint8ToBase64(new TextEncoder().encode(str));
}

function wrapBase64(b64) {
	return b64.replace(/.{76}(?=.)/g, '$&\r\n');
}

// RFC 2047：非 ASCII 文本编成 =?UTF-8?B?...?=，按字符切块不断多字节字符
function encodeWord(str) {
	if (!str) return '';
	if (/^[\x20-\x7E]*$/.test(str)) return str;
	const words = [];
	let cur = '';
	const enc = new TextEncoder();
	for (const ch of str) {
		const next = cur + ch;
		if (enc.encode(next).length > 45 && cur) {
			words.push('=?UTF-8?B?' + utf8ToBase64(cur) + '?=');
			cur = ch;
		} else {
			cur = next;
		}
	}
	if (cur) words.push('=?UTF-8?B?' + utf8ToBase64(cur) + '?=');
	return words.join(' ');
}

function formatAddress(name, address) {
	if (!address) return '';
	if (!name) return address;
	if (/^[\x20-\x7E]*$/.test(name)) {
		if (/[",<>@]/.test(name)) return `"${name.replace(/"/g, '\\"')}" <${address}>`;
		return `${name} <${address}>`;
	}
	return `${encodeWord(name)} <${address}>`;
}

function formatAddressList(json) {
	try {
		const list = JSON.parse(json || '[]');
		if (!Array.isArray(list)) return '';
		return list.map(item => formatAddress(item.name, item.address)).filter(Boolean).join(', ');
	} catch {
		return '';
	}
}

// D1 存的是 UTC 时间，转 RFC 2822 日期头
function formatDate(createTime) {
	if (!createTime) return new Date().toUTCString();
	const d = new Date(String(createTime).replace(' ', 'T') + 'Z');
	return isNaN(d.getTime()) ? new Date().toUTCString() : d.toUTCString();
}

// 文件名净化：去掉路径分隔符与非法字符
function sanitizeFilename(name) {
	const clean = String(name || '').replace(/[\\/:*?"<>|\r\n\t]/g, '_').replace(/\s+/g, ' ').trim();
	return clean.slice(0, 100) || 'no-subject';
}

function emlFilename(row) {
	const date = String(row.createTime || '').slice(0, 10).replace(/-/g, '') || 'nodate';
	return `${date}_${sanitizeFilename(row.subject)}.eml`;
}

function rfc5987(str) {
	return encodeURIComponent(str).replace(/['()]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

const mailExportService = {

	// 取导出所需的邮件行（管理员不过滤 userId）
	async selectRows(c, emailIds, userId, isAdmin) {
		const ids = emailIds.map(Number).filter(n => !isNaN(n)).slice(0, MAX_EXPORT);
		if (ids.length === 0) return [];
		const conds = [inArray(email.emailId, ids)];
		if (!isAdmin) conds.push(eq(email.userId, userId));
		return await orm(c).select().from(email).where(and(...conds)).all();
	},

	async buildEml(c, row) {
		const atts = await attService.selectAllByEmailIds(c, [row.emailId]);
		const realAtts = atts.filter(a => a.type === attConst.type.ATT);
		const images = atts.filter(a => a.type === attConst.type.EMBED && a.contentId);

		// 正文里的图片地址（{{domain}}attachments/<hash> 或绝对地址）还原成 cid: 引用
		let html = row.content || '';
		for (const img of images) {
			const cid = String(img.contentId).replace(/^<|>$/g, '');
			const hash = String(img.key).split('/').pop();
			const escHash = hash.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			html = html.replace(new RegExp('({{domain}}|https?://[^/\\s\'"]+)?/(attachments|oss)/' + escHash, 'g'), 'cid:' + cid);
		}

		const toList = formatAddressList(row.recipient) || row.toEmail || '';
		const ccList = formatAddressList(row.cc);
		// 密送只在自己发的邮件上补：收到的邮件没有发件方的 Bcc 名单，bcc 列是空的
		const bccList = row.type === emailConst.type.SEND ? formatAddressList(row.bcc) : '';
		const boundaryMixed = '----=_CloudMail_Mixed_' + row.emailId + '_' + Date.now();
		const boundaryAlt = '----=_CloudMail_Alt_' + row.emailId + '_' + Date.now();
		const boundaryRelated = '----=_CloudMail_Related_' + row.emailId + '_' + Date.now();
		const messageId = row.messageId || `<export-${row.emailId}@cloudmail.local>`;

		const headers = [];
		headers.push(`From: ${formatAddress(row.name, row.sendEmail)}`);
		if (toList) headers.push(`To: ${toList}`);
		if (ccList) headers.push(`Cc: ${ccList}`);
		if (bccList) headers.push(`Bcc: ${bccList}`);
		headers.push(`Subject: ${encodeWord(row.subject || '')}`);
		headers.push(`Date: ${formatDate(row.createTime)}`);
		headers.push(`Message-ID: ${messageId}`);
		if (row.inReplyTo) headers.push(`In-Reply-To: ${row.inReplyTo}`);
		if (row.relation) headers.push(`References: ${row.relation}`);
		headers.push('MIME-Version: 1.0');

		const textPart = [
			'Content-Type: text/plain; charset="UTF-8"',
			'Content-Transfer-Encoding: base64',
			'',
			wrapBase64(utf8ToBase64(row.text || stripHtml(html) || ''))
		].join('\r\n');

		const htmlPart = html ? [
			'Content-Type: text/html; charset="UTF-8"',
			'Content-Transfer-Encoding: base64',
			'',
			wrapBase64(utf8ToBase64(html))
		].join('\r\n') : null;

		const altBody = htmlPart
			? [`--${boundaryAlt}`, textPart, `--${boundaryAlt}`, htmlPart, `--${boundaryAlt}--`, ''].join('\r\n')
			: null;

		// 第一部分：正文（有 HTML 时是 alternative，没有时就是纯文本段）
		const firstPart = htmlPart
			? [`Content-Type: multipart/alternative; boundary="${boundaryAlt}"`, '', altBody].join('\r\n')
			: textPart;

		let body = '';
		let contentType = '';

		// 内嵌图段（related 专用）
		const imageParts = [];
		for (const img of images) {
			const part = await this.buildAttachmentPart(c, img, true);
			if (part) imageParts.push(part);
		}
		// 真附件段
		const attParts = [];
		for (const att of realAtts) {
			const part = await this.buildAttachmentPart(c, att, false);
			if (part) attParts.push(part);
		}

		if (imageParts.length > 0) {
			// related 包正文 + 内嵌图；有真附件时再由 mixed 包 related + 真附件
			const relatedBody = [`--${boundaryRelated}`, firstPart,
				...imageParts.flatMap(p => [`--${boundaryRelated}`, p]),
				`--${boundaryRelated}--`, ''].join('\r\n');
			if (attParts.length > 0) {
				contentType = `multipart/mixed; boundary="${boundaryMixed}"`;
				body = [`--${boundaryMixed}`, `Content-Type: multipart/related; boundary="${boundaryRelated}"`, '', relatedBody,
					...attParts.flatMap(p => [`--${boundaryMixed}`, p]),
					`--${boundaryMixed}--`, ''].join('\r\n');
			} else {
				contentType = `multipart/related; boundary="${boundaryRelated}"`;
				body = relatedBody;
			}
		} else if (attParts.length > 0) {
			contentType = `multipart/mixed; boundary="${boundaryMixed}"`;
			body = [`--${boundaryMixed}`, firstPart,
				...attParts.flatMap(p => [`--${boundaryMixed}`, p]),
				`--${boundaryMixed}--`, ''].join('\r\n');
		} else if (htmlPart) {
			contentType = `multipart/alternative; boundary="${boundaryAlt}"`;
			body = altBody;
		} else {
			contentType = 'text/plain; charset="UTF-8"';
			body = textPart.split('\r\n\r\n', 2)[1] || '';
			headers.push('Content-Transfer-Encoding: base64');
		}

		headers.push(`Content-Type: ${contentType}`);
		return new TextEncoder().encode(headers.join('\r\n') + '\r\n\r\n' + body);
	},

	// 附件 MIME 段：inline=true 时是内嵌图（带 Content-ID），否则是真附件
	async buildAttachmentPart(c, attRow, inline) {
		const resp = await r2Service.getObj(c, attRow.key);
		if (!resp) return null;
		const bytes = new Uint8Array(await resp.arrayBuffer());
		const cid = attRow.contentId ? String(attRow.contentId).replace(/^<|>$/g, '') : '';
		const filename = attRow.filename || 'attachment';
		const lines = [];
		lines.push(`Content-Type: ${attRow.mimeType || 'application/octet-stream'}; name="${rfc5987(filename)}"`);
		lines.push('Content-Transfer-Encoding: base64');
		if (inline && cid) {
			lines.push(`Content-ID: <${cid}>`);
			lines.push(`Content-Disposition: inline; filename="${rfc5987(filename)}"`);
		} else {
			lines.push(`Content-Disposition: attachment; filename*=UTF-8''${rfc5987(filename)}`);
		}
		lines.push('', wrapBase64(uint8ToBase64(bytes)));
		return lines.join('\r\n');
	},

	// 导出：1 封返回 .eml，多封返回 zip
	async export(c, rows) {
		if (rows.length === 1) {
			const data = await this.buildEml(c, rows[0]);
			return {
				filename: emlFilename(rows[0]),
				contentType: 'message/rfc822',
				data
			};
		}
		const files = {};
		const used = new Set();
		for (const row of rows) {
			let name = emlFilename(row);
			if (used.has(name)) {
				const base = name.slice(0, -4);
				let i = 2;
				while (used.has(`${base}_${i}.eml`)) i++;
				name = `${base}_${i}.eml`;
			}
			used.add(name);
			files[name] = await this.buildEml(c, row);
		}
		const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
		return {
			filename: `mail-export-${date}.zip`,
			contentType: 'application/zip',
			data: zipSync(files, { level: 6 })
		};
	}
};

function stripHtml(html) {
	return String(html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export default mailExportService;
