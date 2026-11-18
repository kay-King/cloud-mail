import app from '../hono/hono';
import userService from '../service/user-service';
import auditService from '../service/audit-service';
import result from '../model/result';
import userContext from '../security/user-context';
import accountService from '../service/account-service';
import { userConst } from '../const/entity-const';

app.delete('/user/delete', async (c) => {
	const query = c.req.query();
	const userIds = (query.userIds || '').split(',').map(Number).filter(n => !isNaN(n));
	const targets = [];
	for (const id of userIds) {
		const row = await userService.selectById(c, id);
		if (row) targets.push(row.email);
	}
	await userService.physicsDelete(c, query);
	if (targets.length > 0) {
		const targetDesc = targets.slice(0, 3).join('、') + (targets.length > 3 ? `等 ${targets.length} 位` : '');
		await auditService.logFor(c, { action: 'delete_user', targetType: 'user', targetDesc });
	}
	return c.json(result.ok());
});

app.put('/user/setPwd', async (c) => {
	await userService.setPwd(c, await c.req.json());
	return c.json(result.ok());
});

app.put('/user/setStatus', async (c) => {
	const body = await c.req.json();
	const target = await userService.selectById(c, body.userId);
	await userService.setStatus(c, body);
	const action = Number(body.status) === userConst.status.BAN ? 'disable_user' : 'enable_user';
	await auditService.logFor(c, { action, targetType: 'user', targetDesc: target?.email || `用户 ${body.userId}` });
	return c.json(result.ok());
});

app.put('/user/setType', async (c) => {
	await userService.setType(c, await c.req.json());
	return c.json(result.ok());
});

app.get('/user/list', async (c) => {
	const data = await userService.list(c, c.req.query(), userContext.getUserId(c));
	return c.json(result.ok(data));
});

app.post('/user/add', async (c) => {
	await userService.add(c, await c.req.json());
	return c.json(result.ok());
});

app.put('/user/resetSendCount', async (c) => {
	await userService.resetSendCount(c, await c.req.json());
	return c.json(result.ok());
});

app.put('/user/restore', async (c) => {
	await userService.restore(c, await c.req.json());
	return c.json(result.ok());
});

app.get('/user/allAccount', async (c) => {
	const data = await accountService.allAccount(c, c.req.query());
	return c.json(result.ok(data));
});

app.delete('/user/deleteAccount', async (c) => {
	await accountService.physicsDelete(c, c.req.query());
	return c.json(result.ok());
});


