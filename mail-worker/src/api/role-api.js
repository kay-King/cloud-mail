import app from '../hono/hono';
import roleService from '../service/role-service';
import auditService from '../service/audit-service';
import userContext from '../security/user-context';
import result from '../model/result';
import permService from '../service/perm-service';

app.post('/role/add', async (c) => {
	const body = await c.req.json();
	await roleService.add(c, body, userContext.getUserId(c));
	await auditService.logFor(c, { action: 'add_role', targetType: 'role', targetDesc: body.name || '' });
	return c.json(result.ok());
});

app.put('/role/setDefault', async (c) => {
	const body = await c.req.json();
	const target = await roleService.selectById(c, body.roleId);
	await roleService.setDefault(c, body);
	await auditService.logFor(c, { action: 'set_default_role', targetType: 'role', targetDesc: target?.name || '' });
	return c.json(result.ok());
});

app.put('/role/set', async (c) => {
	const body = await c.req.json();
	await roleService.setRole(c, body);
	await auditService.logFor(c, { action: 'update_role', targetType: 'role', targetDesc: body.name || '' });
	return c.json(result.ok());
});

app.get('/role/tree', async (c) => {
	const tree = await permService.tree(c);
	return c.json(result.ok(tree));
});

app.delete('/role/delete', async (c) => {
	const query = c.req.query();
	const target = await roleService.selectById(c, query.roleId);
	await roleService.delete(c, query);
	await auditService.logFor(c, { action: 'delete_role', targetType: 'role', targetDesc: target?.name || '' });
	return c.json(result.ok());
});

app.get('/role/list', async (c) => {
	const roleList = await roleService.roleList(c);
	return c.json(result.ok(roleList));
});

app.get('/role/selectUse', async (c) => {
	const roleList = await roleService.roleSelectUse(c);
	return c.json(result.ok(roleList));
});



