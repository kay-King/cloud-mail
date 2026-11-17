import app from '../hono/hono';
import emailService from '../service/email-service';
import result from '../model/result';
import userContext from '../security/user-context';
import attService from '../service/att-service';
import mailExportService, { MAX_EXPORT } from '../service/mail-export-service';
import mailImportService, { MAX_IMPORT_BYTES } from '../service/mail-import-service';
import accountService from '../service/account-service';
import userService from '../service/user-service';
import BizError from '../error/biz-error';

async function checkAdmin(c) {
	const userRow = await userService.selectById(c, userContext.getUserId(c));
	return userRow && userRow.email === c.env.admin;
}

function downloadResponse(data, filename, contentType) {
	const encoded = encodeURIComponent(filename).replace(/['()]/g, ch => '%' + ch.charCodeAt(0).toString(16).toUpperCase());
	return new Response(data, {
		headers: {
			'Content-Type': contentType,
			'Content-Disposition': `attachment; filename*=UTF-8''${encoded}`,
			'Content-Length': String(data.length ?? data.byteLength ?? 0)
		}
	});
}

app.get('/email/list', async (c) => {
	const data = await emailService.list(c, c.req.query(), userContext.getUserId(c));
	return c.json(result.ok(data));
});

app.get('/email/latest', async (c) => {
	const list = await emailService.latest(c, c.req.query(), userContext.getUserId(c));
	return c.json(result.ok(list));
});

app.get('/email/info', async (c) => {
	const email = await emailService.info(c, c.req.query(), userContext.getUserId(c));
	return c.json(result.ok(email));
});

app.delete('/email/delete', async (c) => {
	await emailService.delete(c, c.req.query(), userContext.getUserId(c));
	return c.json(result.ok());
});

app.put('/email/restore', async (c) => {
	await emailService.restore(c, await c.req.json(), userContext.getUserId(c));
	return c.json(result.ok());
});

app.delete('/email/physics-delete', async (c) => {
	await emailService.physicsDeleteByUser(c, c.req.query(), userContext.getUserId(c));
	return c.json(result.ok());
});

app.get('/email/attList', async (c) => {
	const attList = await attService.list(c, c.req.query(), userContext.getUserId(c));
	return c.json(result.ok(attList));
});

app.post('/email/send', async (c) => {
	const email = await emailService.send(c, await c.req.json(), userContext.getUserId(c));
	return c.json(result.ok(email));
});

app.put('/email/read', async (c) => {
	await emailService.read(c, await c.req.json(), userContext.getUserId(c));
	return c.json(result.ok());
})

// 导出邮件：1 封下 .eml，多封打成 zip；普通用户只导自己的，管理员可导全站的
app.get('/email/export', async (c) => {
	const userId = userContext.getUserId(c);
	const isAdmin = await checkAdmin(c);
	const emailIds = (c.req.query().emailIds || '').split(',').filter(Boolean);
	if (emailIds.length === 0) {
		throw new BizError('请选择要导出的邮件', 400);
	}
	if (emailIds.length > MAX_EXPORT) {
		throw new BizError(`一次最多导出 ${MAX_EXPORT} 封`, 400);
	}
	const rows = await mailExportService.selectRows(c, emailIds, userId, isAdmin);
	if (rows.length === 0) {
		throw new BizError('没有可导出的邮件', 404);
	}
	const out = await mailExportService.export(c, rows);
	return downloadResponse(out.data, out.filename, out.contentType);
});

// 导入邮件：上传 .eml 或含 .eml 的 zip，导入到指定邮箱（须是自己的邮箱）
app.post('/email/import', async (c) => {
	const userId = userContext.getUserId(c);
	const form = await c.req.formData();
	const accountId = Number(form.get('accountId'));
	const accountRow = await accountService.selectById(c, accountId);
	if (!accountRow || accountRow.userId !== userId) {
		throw new BizError('目标邮箱不存在', 404);
	}
	const files = form.getAll('files').filter(f => f && typeof f.arrayBuffer === 'function');
	if (files.length === 0) {
		throw new BizError('请选择要导入的文件', 400);
	}
	const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);
	if (totalSize > MAX_IMPORT_BYTES) {
		throw new BizError('上传文件总大小不能超过 25MB', 400);
	}
	const summary = await mailImportService.importFiles(c, files, accountRow, userId);
	return c.json(result.ok(summary));
})

