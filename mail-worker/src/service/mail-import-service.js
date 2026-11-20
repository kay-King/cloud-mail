// 邮件导入：解析 .eml（或含 .eml 的 zip），按收信流程入库到指定邮箱。
// 附件与内嵌图走正常保存路径（加密、去重）；同邮箱下 Message-ID 已存在的跳过，避免重复导入。
import PostalMime from 'postal-mime';
import orm from '../entity/orm';
import { email } from '../entity/email';
import { eq, and } from 'drizzle-orm';
import emailService from './email-service';
import attService from './att-service';
import fileUtils from '../utils/file-utils';
import constant from '../const/constant';
import emailUtils from '../utils/email-utils';
import { emailConst, isDel, attConst } from '../const/entity-const';
import { unzipSync } from '../utils/fflate.js';

export const MAX_IMPORT_MAILS = 100;
export const MAX_IMPORT_BYTES = 25 * 1024 * 1024;

// Date 头转 D1 时间格式（UTC）；解析失败返回 undefined（用入库时间）
function toSqlTime(dateValue) {
	if (!dateValue) return undefined;
	const d = new Date(dateValue);
	if (isNaN(d.getTime())) return undefined;
	return d.toISOString().slice(0, 19).replace('T', ' ');
}

const mailImportService = {

	// 导入一封 .eml，返回 imported / skipped(duplicate) / failed
	// 注意：把原始 buffer 直接交给 PostalMime 解析，不要先 TextDecoder 成字符串——
	// TextDecoder 默认按 UTF-8 解码，GBK 等 8bit 编码的邮件正文会先被替换成 U+FFFD 再被
	// 按 GBK 二次解码，变成「锟斤拷」；PostalMime 按邮件声明的 charset 自己解码才正确
	// （上游收信路径也是直接传 buffer）。已用手造 GBK 8bit 邮件本地实测验证。
	async importEml(c, buffer, accountRow, userId) {
		const parsed = await PostalMime.parse(buffer);

		const messageId = parsed.messageId || '';
		if (messageId) {
			const exists = await orm(c).select({ emailId: email.emailId }).from(email)
				.where(and(eq(email.accountId, accountRow.accountId), eq(email.messageId, messageId))).get();
			if (exists) return { status: 'skipped', reason: 'duplicate' };
		}

		const fromAddress = parsed.from?.address || '';
		const toList = parsed.to || [];
		const params = {
			toEmail: accountRow.email,
			toName: toList.find(item => item.address?.toLowerCase() === accountRow.email.toLowerCase())?.name || '',
			sendEmail: fromAddress,
			name: parsed.from?.name || emailUtils.getName(fromAddress),
			senderEmail: fromAddress,
			subject: parsed.subject || '',
			code: '',
			content: parsed.html || '',
			text: parsed.text || '',
			cc: parsed.cc ? JSON.stringify(parsed.cc) : '[]',
			bcc: parsed.bcc ? JSON.stringify(parsed.bcc) : '[]',
			recipient: JSON.stringify(toList),
			inReplyTo: parsed.inReplyTo || '',
			relation: parsed.references || '',
			messageId,
			userId,
			accountId: accountRow.accountId,
			isDel: isDel.NORMAL,
			status: emailConst.status.RECEIVE,
			type: emailConst.type.RECEIVE,
			unread: emailConst.unread.UNREAD,
		};
		const createTime = toSqlTime(parsed.date);
		if (createTime) params.createTime = createTime;

		const attachments = [];
		const cidAttachments = [];
		for (const item of (parsed.attachments || [])) {
			const attachment = { ...item };
			attachment.key = constant.ATTACHMENT_PREFIX + await fileUtils.getBuffHash(attachment.content);
			attachment.size = item.content.length ?? item.content.byteLength;
			attachments.push(attachment);
			if (attachment.contentId) {
				attachment.type = attConst.type.EMBED;
				cidAttachments.push(attachment);
			}
		}

		const emailRow = await emailService.receive(c, params, cidAttachments, '');
		attachments.forEach(attachment => {
			attachment.emailId = emailRow.emailId;
			attachment.userId = userId;
			attachment.accountId = accountRow.accountId;
		});
		if (attachments.length > 0) {
			await attService.addAtt(c, attachments);
		}
		return { status: 'imported', emailId: emailRow.emailId };
	},

	// 导入多个上传文件（.eml 或 .zip），返回汇总
	async importFiles(c, files, accountRow, userId) {
		const summary = { imported: 0, skipped: 0, failed: 0, errors: [] };
		let total = 0;
		for (const file of files) {
			const buf = new Uint8Array(await file.arrayBuffer());
			const name = (file.name || '').toLowerCase();
			const emlList = [];
			if (name.endsWith('.zip')) {
				let entries;
				try {
					entries = unzipSync(buf);
				} catch (e) {
					summary.failed++;
					summary.errors.push(`${file.name}: zip 解压失败`);
					continue;
				}
				for (const [entryName, data] of Object.entries(entries)) {
					if (entryName.toLowerCase().endsWith('.eml')) emlList.push({ name: entryName, data });
				}
				if (emlList.length === 0) {
					summary.failed++;
					summary.errors.push(`${file.name}: 压缩包里没有 .eml 文件`);
				}
			} else if (name.endsWith('.eml')) {
				emlList.push({ name: file.name, data: buf });
			} else {
				summary.failed++;
				summary.errors.push(`${file.name}: 只支持 .eml 或 .zip 文件`);
				continue;
			}
			for (const eml of emlList) {
				if (total >= MAX_IMPORT_MAILS) {
					summary.failed++;
					summary.errors.push(`一次最多导入 ${MAX_IMPORT_MAILS} 封，超出部分未处理`);
					break;
				}
				total++;
				try {
					const r = await this.importEml(c, eml.data, accountRow, userId);
					if (r.status === 'imported') summary.imported++;
					else summary.skipped++;
				} catch (e) {
					summary.failed++;
					if (summary.errors.length < 5) summary.errors.push(`${eml.name}: ${e.message || '解析失败'}`);
				}
			}
		}
		return summary;
	}
};

export default mailImportService;
