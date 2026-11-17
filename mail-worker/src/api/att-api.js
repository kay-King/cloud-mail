import app from '../hono/hono';
import result from '../model/result';
import attCrypto from '../service/att-crypto';
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
