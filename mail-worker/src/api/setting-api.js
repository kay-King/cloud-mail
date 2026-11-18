import app from '../hono/hono';
import result from '../model/result';
import settingService from '../service/setting-service';
import emailService from '../service/email-service';
import auditService from '../service/audit-service';
import userContext from "../security/user-context";
import verifyUtils from '../utils/verify-utils';
import { settingConst } from '../const/entity-const';
import BizError from '../error/biz-error';
import { t } from '../i18n/i18n';

app.put('/setting/set', async (c) => {
	const body = await c.req.json();
	const snapshot = { ...body };
	const before = await settingService.query(c);
	await settingService.set(c, body);
	const changed = auditService.diffSettingLabels(before, snapshot);
	if (changed.length > 0) {
		const labels = changed.slice(0, 10).join('、') + (changed.length > 10 ? `等 ${changed.length} 项` : '');
		await auditService.logFor(c, { action: 'update_setting', targetType: 'setting', targetDesc: '系统设置', detail: `修改了：${labels}` });
	}
	return c.json(result.ok());
});

app.put('/setting/setGlobalForward', async (c) => {
	const { forwardEmail, forwardStatus, ruleType, ruleEmail } = await c.req.json();
	const status = Number(forwardStatus) === settingConst.forwardStatus.OPEN
		? settingConst.forwardStatus.OPEN : settingConst.forwardStatus.CLOSE;
	const targets = (forwardEmail || '').split(',').map(s => s.trim()).filter(Boolean);
	if (status === settingConst.forwardStatus.OPEN) {
		if (targets.length === 0 || targets.some(e => !verifyUtils.isEmail(e))) {
			throw new BizError(t('notEmail'));
		}
	}
	const type = Number(ruleType) === settingConst.ruleType.RULE
		? settingConst.ruleType.RULE : settingConst.ruleType.ALL;
	const rules = (ruleEmail || '').split(',').map(s => s.trim()).filter(Boolean);
	if (type === settingConst.ruleType.RULE) {
		if (rules.length === 0 || rules.some(e => !verifyUtils.isEmail(e))) {
			throw new BizError(t('notEmail'));
		}
	}
	const values = {
		forwardEmail: status === settingConst.forwardStatus.OPEN ? targets.join(',') : '',
		forwardStatus: status,
		ruleType: type,
		ruleEmail: rules.join(',')
	};
	const before = await settingService.query(c);
	await settingService.set(c, values);
	const changed = auditService.diffSettingLabels(before, { ...values });
	if (changed.length > 0) {
		const labels = changed.slice(0, 10).join('、') + (changed.length > 10 ? `等 ${changed.length} 项` : '');
		await auditService.logFor(c, { action: 'update_setting', targetType: 'setting', targetDesc: '系统设置', detail: `修改了：${labels}` });
	}
	if (status !== settingConst.forwardStatus.OPEN) {
		return c.json(result.ok({ verifyStatus: 'off' }));
	}
	if (!c.env.cf_routing_token || !c.env.cf_account_id) {
		return c.json(result.ok({ verifyStatus: 'no-token' }));
	}
	// 多个目标逐个验证，取最需要用户处理的那个状态
	const statuses = [];
	for (const target of targets) {
		statuses.push(await emailService.ensureDestinationVerified(c, target));
	}
	const priority = ['failed', 'added', 'exists', 'verified'];
	const verifyStatus = priority.find(p => statuses.includes(p)) || 'verified';
	return c.json(result.ok({ verifyStatus }));
});

app.get('/setting/query', async (c) => {
	const setting = await settingService.get(c);
	return c.json(result.ok(setting));
});

app.get('/setting/websiteConfig', async (c) => {
	const setting = await settingService.websiteConfig(c);
	return c.json(result.ok(setting));
})

app.put('/setting/setBackground', async (c) => {
	const key = await settingService.setBackground(c, await c.req.json());
	await auditService.logFor(c, { action: 'update_setting', targetType: 'setting', targetDesc: '登录背景', detail: '更换登录背景' });
	return c.json(result.ok(key));
});

app.delete('/setting/deleteBackground', async (c) => {
	await settingService.deleteBackground(c);
	await auditService.logFor(c, { action: 'update_setting', targetType: 'setting', targetDesc: '登录背景', detail: '删除登录背景' });
	return c.json(result.ok());
});

app.put('/setting/setBlacklist', async (c) => {
	const setting = await settingService.setBlacklist(c, await c.req.json());
	return c.json(result.ok(setting));
})

