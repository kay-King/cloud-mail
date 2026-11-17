import app from '../hono/hono';
import result from '../model/result';
import attCrypto from '../service/att-crypto';
import attService from '../service/att-service';
import adminNotifyService from '../service/admin-notify-service';
import userContext from '../security/user-context';
import userService from '../service/user-service';
import BizError from '../error/biz-error';

async function requireAdmin(c) {
	const userId = userContext.getUserId(c);
	const userRow = await userService.selectById(c, userId);
	if (!userRow || userRow.email !== c.env.admin) {
		throw new BizError('无权操作', 403);
	}
}

async function checkAdmin(c) {
	const userId = userContext.getUserId(c);
	const userRow = await userService.selectById(c, userId);
	return !!userRow && userRow.email === c.env.admin;
}

// 附件加密状态：开关 + 当前钥匙指纹（无钥匙时 fingerprint 为 null，不触发生成）
app.get('/att/status', async (c) => {
	await requireAdmin(c);
	const enabled = await attCrypto.isEncryptionEnabled(c);
	const fingerprint = await attCrypto.getCurrentFingerprint(c);
	return c.json(result.ok({ enabled, fingerprint, hasKey: !!fingerprint }));
});

// 重新生成钥匙：生成一把新的当当前钥匙，旧钥匙留在历史里，旧附件不受影响
app.post('/att/rotate', async (c) => {
	await requireAdmin(c);
	const b64 = await attCrypto.rotateKey(c);
	return c.json(result.ok({ fingerprint: await attCrypto.fingerprint(b64) }));
});

// 全部附件列表：只列真正附件（内嵌图不算），按用户隔离
app.get('/att/list', async (c) => {
	const data = await attService.listAll(c, c.req.query(), userContext.getUserId(c));
	return c.json(result.ok(data));
});

// 管理员全部附件：全站所有用户的附件，多一列所属邮箱
app.get('/att/all', async (c) => {
	await requireAdmin(c);
	const data = await attService.listAllAdmin(c, c.req.query());
	return c.json(result.ok(data));
});

// 批量收藏 / 取消收藏附件
app.put('/att/star', async (c) => {
	await attService.setStar(c, await c.req.json(), userContext.getUserId(c));
	return c.json(result.ok());
});

// 单独删除附件：只删选中的行，邮件还在；管理员可删全站的
app.delete('/att/delete', async (c) => {
	const userId = userContext.getUserId(c);
	const isAdmin = await checkAdmin(c);
	const query = c.req.query();
	const notify = query.notify === '1';
	const reason = (query.reason || '').slice(0, 200);
	const { deleted, rows } = await attService.deleteByIds(c, (query.attIds || '').split(','), userId, isAdmin);
	if (notify && rows.length > 0 && await adminNotifyService.isEnabled(c)) {
		await adminNotifyService.notifyAttDeleted(c, rows, reason);
	}
	return c.json(result.ok({ deleted }));
});
