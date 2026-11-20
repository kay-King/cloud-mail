import app from '../hono/hono';
import userService from '../service/user-service';
import settingService from '../service/setting-service';
import result from '../model/result';
import userContext from '../security/user-context';

app.get('/my/loginUserInfo', async (c) => {
	const user = await userService.loginUserInfo(c, userContext.getUserId(c));
	return c.json(result.ok(user));
});

// 启动合并接口：一次拿完网站配置 + 用户信息 + 侧边栏配置 + 未读数，
// 慢网上少跑三趟；各段独立兜底，某段失败只返回 null，前端按段降级
app.get('/my/bootstrap', async (c) => {
	const userId = userContext.getUserId(c);
	const [setting, user, sidebarConfig, sidebarUnread] = await Promise.all([
		settingService.websiteConfig(c).catch(() => null),
		userService.loginUserInfo(c, userId).catch(() => null),
		userService.getSidebarConfig(c, userId).catch(() => null),
		userService.getSidebarUnread(c, userId).catch(() => null),
	]);
	return c.json(result.ok({ setting, user, sidebarConfig, sidebarUnread }));
});

app.put('/my/resetPassword', async (c) => {
	await userService.resetPassword(c, await c.req.json(), userContext.getUserId(c));
	return c.json(result.ok());
});

app.get('/my/spam-blocklist', async (c) => {
	const data = await userService.getSpamBlocklist(c, userContext.getUserId(c));
	return c.json(result.ok(data));
});

app.put('/my/spam-blocklist', async (c) => {
	await userService.setSpamBlocklist(c, await c.req.json(), userContext.getUserId(c));
	return c.json(result.ok());
});

app.get('/my/sidebar-config', async (c) => {
	const data = await userService.getSidebarConfig(c, userContext.getUserId(c));
	return c.json(result.ok(data));
});

app.put('/my/sidebar-config', async (c) => {
	const data = await userService.setSidebarConfig(c, await c.req.json(), userContext.getUserId(c));
	return c.json(result.ok(data));
});

app.get('/my/sidebar-unread', async (c) => {
	const data = await userService.getSidebarUnread(c, userContext.getUserId(c));
	return c.json(result.ok(data));
});

app.delete('/my/delete', async (c) => {
	await userService.delete(c, userContext.getUserId(c));
	return c.json(result.ok());
});


