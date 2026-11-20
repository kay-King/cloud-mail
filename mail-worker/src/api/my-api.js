import app from '../hono/hono';
import userService from '../service/user-service';
import result from '../model/result';
import userContext from '../security/user-context';

app.get('/my/loginUserInfo', async (c) => {
	const user = await userService.loginUserInfo(c, userContext.getUserId(c));
	return c.json(result.ok(user));
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


