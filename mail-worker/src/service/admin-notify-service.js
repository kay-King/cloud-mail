// 管理员删除通知：管理员在全部邮件 / 全部附件里删了其他用户的邮件或附件后，
// 按账号分组给受影响的用户各发一封站内通知邮件（模板内置，原因由管理员删除时填写）。
// 删除自己的东西不通知；通知走正常站内发送，发件人显示为“系统通知”，已发送里会留一份。
import orm from '../entity/orm';
import { account } from '../entity/account';
import { inArray, eq } from 'drizzle-orm';
import emailService from './email-service';
import settingService from './setting-service';

function escapeHtml(s) {
	return String(s ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

// D1 存的时间是 UTC，转北京时间显示
function toCST(s) {
	if (!s) return '';
	const d = new Date(String(s).replace(' ', 'T') + 'Z');
	if (isNaN(d.getTime())) return String(s);
	return new Date(d.getTime() + 8 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');
}

function nowCST() {
	return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');
}

function formatSize(size) {
	size = Number(size) || 0;
	if (size < 1024) return size + ' B';
	if (size < 1024 * 1024) return (size / 1024).toFixed(2) + ' KB';
	return (size / 1024 / 1024).toFixed(2) + ' MB';
}

function buildEmailNotice(items, reason) {
	const lines = items.map(item => {
		const dir = item.type === 1 ? '发出' : '收到';
		const sender = item.name || item.sendEmail || '';
		return `<li>《${escapeHtml(item.subject || '(无主题)')}》——${dir}，发件人 ${escapeHtml(sender)}，${toCST(item.createTime)}</li>`;
	});
	const textLines = items.map(item => {
		const dir = item.type === 1 ? '发出' : '收到';
		const sender = item.name || item.sendEmail || '';
		return `· 《${item.subject || '(无主题)'}》——${dir}，发件人 ${sender}，${toCST(item.createTime)}`;
	});
	const reasonText = (reason || '').trim() || '管理员未填写删除原因';
	const now = nowCST();
	return {
		subject: '系统通知：你的邮件已被管理员删除',
		html: `<p>你好：</p><p>以下邮件已被管理员删除：</p><ul>${lines.join('')}</ul><p>删除原因：${escapeHtml(reasonText)}</p><p>删除时间：${now}</p><p>如有疑问，请联系管理员。</p>`,
		text: `你好：\n\n以下邮件已被管理员删除：\n${textLines.join('\n')}\n\n删除原因：${reasonText}\n删除时间：${now}\n\n如有疑问，请联系管理员。`
	};
}

function buildAttNotice(items, reason) {
	const lines = items.map(item =>
		`<li>${escapeHtml(item.filename)}（${formatSize(item.size)}，所属邮件《${escapeHtml(item.subject || '(无主题)')}》）</li>`);
	const textLines = items.map(item =>
		`· ${item.filename}（${formatSize(item.size)}，所属邮件《${item.subject || '(无主题)'}》）`);
	const reasonText = (reason || '').trim() || '管理员未填写删除原因';
	const now = nowCST();
	return {
		subject: '系统通知：你的附件已被管理员删除',
		html: `<p>你好：</p><p>以下附件已被管理员删除（邮件还在）：</p><ul>${lines.join('')}</ul><p>删除原因：${reasonText ? escapeHtml(reasonText) : ''}</p><p>删除时间：${now}</p><p>如有疑问，请联系管理员。</p>`,
		text: `你好：\n\n以下附件已被管理员删除（邮件还在）：\n${textLines.join('\n')}\n\n删除原因：${reasonText}\n删除时间：${now}\n\n如有疑问，请联系管理员。`
	};
}

const adminNotifyService = {

	// 设置开关（默认开）：关掉后管理员删除时不弹通知选项，也不发通知
	async isEnabled(c) {
		const setting = await settingService.query(c);
		return !setting || setting.adminDelNotify === undefined || setting.adminDelNotify === null || setting.adminDelNotify !== 0;
	},

	// 发件账号：优先用系统设置里的通知邮箱，找不到时退回管理员账号
	async getAdminSender(c) {
		return await emailService.getNotifySender(c);
	},

	async sendOne(c, sender, targetEmail, notice) {
		try {
			await emailService.send(c, {
				accountId: sender.accountId,
				name: '系统通知',
				receiveEmail: [targetEmail],
				subject: notice.subject,
				content: notice.html,
				text: notice.text,
				skipForward: true
			}, sender.userId);
		} catch (e) {
			console.error('删除通知发送失败：', e);
		}
	},

	// 按账号分组发通知；管理员自己的账号跳过
	async notifyByAccount(c, rows, reason, buildNotice) {
		if (!rows || rows.length === 0) return;
		const sender = await this.getAdminSender(c);
		if (!sender) return;
		const accountIds = [...new Set(rows.map(r => r.accountId))];
		const accounts = await orm(c).select().from(account).where(inArray(account.accountId, accountIds)).all();
		const emailByAccount = new Map(accounts.map(a => [a.accountId, a.email]));
		const groups = new Map();
		for (const row of rows) {
			if (row.userId === sender.userId) continue;
			if (!groups.has(row.accountId)) groups.set(row.accountId, []);
			groups.get(row.accountId).push(row);
		}
		for (const [accountId, items] of groups) {
			const targetEmail = emailByAccount.get(accountId);
			if (!targetEmail) continue;
			await this.sendOne(c, sender, targetEmail, buildNotice(items, reason));
		}
	},

	// rows: [{userId, accountId, subject, sendEmail, name, type, createTime}]
	async notifyEmailDeleted(c, rows, reason) {
		await this.notifyByAccount(c, rows, reason, buildEmailNotice);
	},

	// rows: [{userId, accountId, filename, size, subject}]
	async notifyAttDeleted(c, rows, reason) {
		await this.notifyByAccount(c, rows, reason, buildAttNotice);
	}
};

export default adminNotifyService;
