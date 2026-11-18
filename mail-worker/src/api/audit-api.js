import app from '../hono/hono';
import result from '../model/result';
import auditService from '../service/audit-service';
import userContext from '../security/user-context';
import userService from '../service/user-service';
import BizError from '../error/biz-error';

// 操作记录列表：仅管理员
app.get('/audit/list', async (c) => {
	const userId = userContext.getUserId(c);
	const userRow = await userService.selectById(c, userId);
	if (!userRow || userRow.email !== c.env.admin) {
		throw new BizError('无权操作', 403);
	}
	const data = await auditService.list(c, c.req.query());
	return c.json(result.ok(data));
});

// 删除指定操作记录：仅管理员；删操作记录本身不记日志
app.delete('/audit/delete', async (c) => {
	const userId = userContext.getUserId(c);
	const userRow = await userService.selectById(c, userId);
	if (!userRow || userRow.email !== c.env.admin) {
		throw new BizError('无权操作', 403);
	}
	const logIds = (c.req.query('logIds') || '').split(',').map(Number).filter(n => Number.isInteger(n) && n > 0);
	const data = await auditService.deleteByIds(c, logIds);
	return c.json(result.ok(data));
});

// 清空全部操作记录：仅管理员
app.delete('/audit/clear', async (c) => {
	const userId = userContext.getUserId(c);
	const userRow = await userService.selectById(c, userId);
	if (!userRow || userRow.email !== c.env.admin) {
		throw new BizError('无权操作', 403);
	}
	const data = await auditService.clearAll(c);
	return c.json(result.ok(data));
});
