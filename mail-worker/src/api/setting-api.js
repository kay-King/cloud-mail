import app from '../hono/hono';
import result from '../model/result';
import settingService from '../service/setting-service';
import auditService from '../service/audit-service';
import userContext from "../security/user-context";

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

