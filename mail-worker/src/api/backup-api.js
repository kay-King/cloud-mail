import app from '../hono/hono';
import result from '../model/result';
import userContext from '../security/user-context';
import userService from '../service/user-service';
import backupService from '../service/backup-service';
import BizError from '../error/biz-error';

async function requireAdmin(c) {
	const userRow = await userService.selectById(c, userContext.getUserId(c));
	if (!userRow || userRow.email !== c.env.admin) {
		throw new BizError('无权操作', 403);
	}
}

function downloadResponse(data, filename) {
	return new Response(data, {
		headers: {
			'Content-Type': 'application/json',
			'Content-Disposition': `attachment; filename="${filename}"`,
			'Content-Length': String(data.length)
		}
	});
}

app.get('/backup/status', async (c) => {
	await requireAdmin(c);
	return c.json(result.ok(await backupService.getStatus(c)));
});

// 立即备份导出：生成备份（配了服务商也同步存一份加密副本），直接下载明文 JSON
app.post('/backup/export', async (c) => {
	await requireAdmin(c);
	const r = await backupService.runBackup(c, { force: true });
	const date = new Date(r.time).toISOString().slice(0, 10).replace(/-/g, '');
	return downloadResponse(r.data, `cloud-mail-backup-${date}.json`);
});

const MAX_RESTORE_BYTES = 25 * 1024 * 1024;

// 从备份文件恢复：上传备份 JSON，覆盖恢复 D1 与 KV（管理员专属）
app.post('/backup/restore', async (c) => {
	await requireAdmin(c);
	const form = await c.req.formData();
	const file = form.get('file');
	if (!file || typeof file.text !== 'function') {
		throw new BizError('请选择要恢复的备份文件', 400);
	}
	if (file.size > MAX_RESTORE_BYTES) {
		throw new BizError('备份文件不能超过 25MB', 400);
	}
	let backup;
	try {
		backup = JSON.parse(await file.text());
	} catch {
		throw new BizError('不是有效的备份文件', 400);
	}
	const summary = await backupService.restoreBackup(c, backup);
	return c.json(result.ok(summary));
});

// 下载服务商上最新的一份备份（解密后返回；供手动取回恢复用，界面暂无入口）
app.get('/backup/download', async (c) => {
	await requireAdmin(c);
	const latest = await backupService.downloadLatest(c);
	if (!latest) {
		throw new BizError('暂无备份', 404);
	}
	const date = new Date(latest.time).toISOString().slice(0, 10).replace(/-/g, '');
	return downloadResponse(latest.data, `cloud-mail-backup-${date}.json`);
});
