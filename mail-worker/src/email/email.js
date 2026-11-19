import PostalMime from 'postal-mime';
import emailService from '../service/email-service';
import accountService from '../service/account-service';
import settingService from '../service/setting-service';
import attService from '../service/att-service';
import constant from '../const/constant';
import fileUtils from '../utils/file-utils';
import { emailConst, isDel, settingConst, attConst } from '../const/entity-const';
import emailUtils from '../utils/email-utils';
import roleService from '../service/role-service';
import userService from '../service/user-service';
import telegramService from '../service/telegram-service';
import aiService from '../service/ai-service';
import webhookService from '../service/webhook-service';
import { notifyMailWs } from '../websocket/notify';
import { matchesForwardRule } from '../utils/forward-rule';
import { mergeForwardTargets } from '../utils/forward-targets';

export async function email(message, env, ctx) {

	try {

		const setting = await settingService.query({ env });
		const { tgChatId, tgBotStatus } = settingService.tgConfig(setting);
		const { webhookStatus, webhookUrl, webhookRetry, webhookSecret } = settingService.webhookConfig(setting);
		const { blackSubject, blackContent, blackFrom } = settingService.blacklistConfig(setting);
		const { aiCode, aiCodeFilter } = settingService.aiCodeConfig(setting);
		const {
			receive,
			r2Domain,
			noRecipient
		} = setting;
		const { ruleEmail, ruleType, ruleMatch, forwardEmail, forwardStatus } = settingService.globalForward(setting);

		if (receive === settingConst.receive.CLOSE) {
			message.setReject('Service suspended');
			return;
		}

		const reader = message.raw.getReader();
		let content = '';

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			content += new TextDecoder().decode(value);
		}

		const email = await PostalMime.parse(content);


		// 黑名单命中不再直接拒收，改为进垃圾箱（拒收会丢信、误伤找不回来；进垃圾箱还能在里面翻出来）
		let blockFlag = checkBlock(blackSubject, blackContent, blackFrom, email);

		let account = await accountService.selectByEmailIncludeDel({ env: env }, message.to);

		if (!account) {
			const baseEmail = emailUtils.getBaseEmail(message.to);
			if (baseEmail && baseEmail !== message.to) {
				account = await accountService.selectByEmailIncludeDel({ env: env }, baseEmail);
			}
		}

		if (!account && noRecipient === settingConst.noRecipient.CLOSE) {
			message.setReject('Recipient not found');
			return;
		}

		let userRow = {}

		if (account) {
			 userRow = await userService.selectByIdIncludeDel({ env: env }, account.userId);
		}

		// 个人黑名单（收件人自己在个人设置里管的）：与全局黑名单任一命中都进垃圾箱
		if (account && userRow.spamBlocklist && !blockFlag) {
			let personal = {};
			try {
				personal = JSON.parse(userRow.spamBlocklist);
			} catch {
				personal = {};
			}
			blockFlag = checkBlock(personal.blackSubject || '', personal.blackContent || '', personal.blackFrom || '', email);
		}

		if (account && userRow.email !== env.admin) {

			let { banEmail, availDomain } = await roleService.selectByUserId({ env: env }, account.userId);

			if (!roleService.hasAvailDomainPerm(availDomain, message.to)) {
				message.setReject('The recipient is not authorized to use this domain.');
				return;
			}

			if(roleService.isBanEmail(banEmail, email.from.address)) {
				message.setReject('The recipient is disabled from receiving emails.');
				return;
			}

		}


		if (!email.to) {
			email.to = [{ address: message.to, name: emailUtils.getName(message.to)}]
		}

		const toName = email.to.find(item => item.address === message.to)?.name || '';
		const code = await aiService.extractCode({ env }, email, { aiCode, aiCodeFilter });
		const fromAddress = email.from?.address || '';

		const params = {
			toEmail: message.to,
			toName: toName,
			sendEmail: fromAddress,
			name: email.from?.name || emailUtils.getName(fromAddress),
			senderEmail: message.from || '',
			subject: email.subject,
			code,
			content: email.html,
			text: email.text,
			cc: email.cc ? JSON.stringify(email.cc) : '[]',
			bcc: email.bcc ? JSON.stringify(email.bcc) : '[]',
			recipient: JSON.stringify(email.to),
			inReplyTo: email.inReplyTo,
			relation: email.references,
			messageId: email.messageId,
			userId: account ? account.userId : 0,
			accountId: account ? account.accountId : 0,
			isDel: isDel.DELETE,
			isSpam: blockFlag ? 1 : 0,
			status: emailConst.status.SAVING
		};

		const attachments = [];
		const cidAttachments = [];

		for (let item of email.attachments) {
			let attachment = { ...item };
			// key 只用内容哈希，不带扩展名，避免从对象名泄露文件类型
			attachment.key = constant.ATTACHMENT_PREFIX + await fileUtils.getBuffHash(attachment.content);
			attachment.size = item.content.length ?? item.content.byteLength;
			attachments.push(attachment);
			if (attachment.contentId) {
				// 带 Content-ID 的是正文内嵌图，标成 EMBED，列表显示图片标志而不是回形针
				attachment.type = attConst.type.EMBED;
				cidAttachments.push(attachment);
			}
		}

		let emailRow = await emailService.receive({ env }, params, cidAttachments, r2Domain);

		attachments.forEach(attachment => {
			attachment.emailId = emailRow.emailId;
			attachment.userId = emailRow.userId;
			attachment.accountId = emailRow.accountId;
		});

		try {
			if (attachments.length > 0) {
				await attService.addAtt({ env }, attachments);
			}
		} catch (e) {
			console.error(e);
		}

		emailRow = await emailService.completeReceive({ env }, account ? emailConst.status.RECEIVE : emailConst.status.NOONE, emailRow.emailId);

		// 垃圾邮件不推收件箱、不转发、不推 TG/Webhook，只静静进垃圾箱
		if (!blockFlag) {
			// 有账号才推个人收件箱；无人收件（无 account / userId=0）只推全部邮件。
			notifyMailWs(env, ctx, emailRow);
		}

		// 转发规则影响全局转发、TG 与 Webhook 推送；按账号转发用各自的发件人/主题规则，不受此规则限制。
		// 名单匹配方式：mailbox=跟收件邮箱地址比（默认），user=跟收件邮箱所属用户的登录邮箱比。
		const ruleMatched = ruleType !== settingConst.ruleType.RULE || emailService.matchForwardRule({
			ruleEmail,
			userEmail: userRow?.email,
			toEmail: message.to,
			ruleMatch
		});

		//转发到TG
		if (!blockFlag && ruleMatched && tgBotStatus === settingConst.tgBotStatus.OPEN && tgChatId) {
			await telegramService.sendEmailToBot({ env }, emailRow)
		}

		//按收件账号转发与全局转发并存：两边各算各的目标，合在一起去重后各发一份；
		//同一封邮件发到同一个目标只发一次（全局管的范围更大，不因账号转发接手了就不转）
		const accountTargets = [];
		if (!blockFlag && account && account.forwardStatus === settingConst.forwardStatus.OPEN && account.forwardEmail
			&& matchesForwardRule(account, { from: emailRow.sendEmail, subject: emailRow.subject })) {
			account.forwardEmail.split(',').map(e => e.trim()).filter(Boolean)
				.forEach(email => accountTargets.push({ email, accountId: account.accountId, source: '账号' }));
		}

		const globalTargets = [];
		if (!blockFlag && forwardStatus === settingConst.forwardStatus.OPEN && forwardEmail && ruleMatched) {
			forwardEmail.split(',').map(e => e.trim()).filter(Boolean)
				.forEach(email => globalTargets.push({ email, accountId: undefined, source: '全局' }));
		}

		await Promise.all(mergeForwardTargets(accountTargets, globalTargets).map(async ({ email, accountId, source }) => {

			try {
				await message.forward(email);
			} catch (e) {
				console.error(`转发邮箱 ${email} 失败（${source}）：`, e);
				await emailService.notifyForwardFailed({ env }, { address: email, rows: [emailRow], error: e, accountId });
			}

		}));

		//转发到 Webhook
		if (!blockFlag && ruleMatched && webhookStatus === settingConst.webhookStatus.OPEN && webhookUrl) {
			await webhookService.sendEmail({ env }, emailRow, webhookUrl, webhookRetry, webhookSecret);
		}

	} catch (e) {
		console.error('邮件接收异常: ', e);
		throw e
	}
}

function checkBlock(blackSubjectStr, blackContentStr, blackFromStr, email) {

	const blackFromList = blackFromStr ? blackFromStr.split(',') : []
	const blackContentList = blackContentStr ? blackContentStr.split(',') : []
	const blackSubjectList = blackSubjectStr ? blackSubjectStr.split(',') : []

	for (const blackSubject of blackSubjectList) {
		if (email.subject?.includes(blackSubject)) {
			return true
		}
	}

	for (const blackContent of blackContentList) {
		if (email.html?.includes(blackContent) || email.text?.includes(blackContent)) {
			return true
		}
	}

	for (const blackFrom of blackFromList) {
		if (email.from.address === blackFrom || emailUtils.getDomain(email.from.address) === blackFrom) {
			return true
		}
	}

	return false

}
