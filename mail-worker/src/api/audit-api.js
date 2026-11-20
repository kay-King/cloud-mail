import app from '../hono/hono';
import result from '../model/result';
import auditService from '../service/audit-service';
import userContext from '../security/user-context';
import userService from '../service/user-service';
import BizError from '../error/biz-error';

// 操作记录列表：走 audit:query 权限（security.js 登记；前端菜单/路由也按该权限门控），
// 管理员的 permKeys 是 '*'，不会被锁在外面；不要在这里再加管理员硬校验（两套鉴权会矛盾）
app.get('/audit/list', async (c) => {
	const data = await auditService.list(c, c.req.query());
	return c.json(result.ok(data));
});

// 删除指定操作记录：仅管理员。破坏性操作、没有对应的权限条目，保留 handler 硬校验
// （与 backup-api 同款做法）；有 audit:query 的非管理员能看到删除按钮，点了会 403
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

// 清空全部操作记录：仅管理员（同上，破坏性操作保留 handler 硬校验）；删操作记录本身不记日志
app.delete('/audit/clear', async (c) => {
	const userId = userContext.getUserId(c);
	const userRow = await userService.selectById(c, userId);
	if (!userRow || userRow.email !== c.env.admin) {
		throw new BizError('无权操作', 403);
	}
	const data = await auditService.clearAll(c);
	return c.json(result.ok(data));
});
