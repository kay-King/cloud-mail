import app from '../hono/hono';
import emailService from '../service/email-service';
import adminNotifyService from '../service/admin-notify-service';
import auditService from '../service/audit-service';
import result from '../model/result';

// 操作记录里的对象摘要：取前 3 个主题，多的折成“等 N 封”
function subjectDesc(rows) {
	const names = rows.slice(0, 3).map(r => `《${r.subject || r.sendEmail || ''}》`);
	return names.join('、') + (rows.length > 3 ? `等 ${rows.length} 封` : '');
}

app.get('/allEmail/list', async (c) => {
	const data = await emailService.allList(c, c.req.query());
	return c.json(result.ok(data));
})

app.delete('/allEmail/delete', async (c) => {
	const query = c.req.query();
	const notify = query.notify === '1';
	const reason = (query.reason || '').slice(0, 200);
	let emailIds = (query.emailIds || '').split(',').filter(Boolean).map(Number);
	// pair=1：成对删除，把同一批发送的发件份与收件份一起删掉
	if (query.pair === '1' && emailIds.length > 0) {
		emailIds = await emailService.expandToSendGroup(c, emailIds);
	}
	const rows = await emailService.selectByIds(c, emailIds);
	const list = await emailService.physicsDelete(c, { emailIds: emailIds.join(',') });
	if (notify && rows.length > 0 && await adminNotifyService.isEnabled(c)) {
		await adminNotifyService.notifyEmailDeleted(c, rows, reason);
	}
	if (rows.length > 0) {
		await auditService.logFor(c, { action: 'delete_email', targetType: 'email', targetDesc: subjectDesc(rows), detail: reason });
	}
	return c.json(result.ok(list));
})

app.delete('/allEmail/batchDelete', async (c) => {
	const query = c.req.query();
	const notify = query.notify === '1';
	const reason = (query.reason || '').slice(0, 200);
	const rows = await emailService.batchDelete(c, query);
	if (notify && rows.length > 0 && await adminNotifyService.isEnabled(c)) {
		await adminNotifyService.notifyEmailDeleted(c, rows, reason);
	}
	if (rows.length > 0) {
		await auditService.logFor(c, { action: 'delete_email', targetType: 'email', targetDesc: subjectDesc(rows), detail: reason });
	}
	return c.json(result.ok());
})

app.get('/allEmail/latest', async (c) => {
	const list = await emailService.allEmailLatest(c, c.req.query());
	return c.json(result.ok(list));
})
