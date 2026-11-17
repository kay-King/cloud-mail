import app from '../hono/hono';
import emailService from '../service/email-service';
import adminNotifyService from '../service/admin-notify-service';
import result from '../model/result';

app.get('/allEmail/list', async (c) => {
	const data = await emailService.allList(c, c.req.query());
	return c.json(result.ok(data));
})

app.delete('/allEmail/delete', async (c) => {
	const query = c.req.query();
	const notify = query.notify === '1';
	const reason = (query.reason || '').slice(0, 200);
	const rows = notify ? await emailService.selectByIds(c, (query.emailIds || '').split(',')) : [];
	const list = await emailService.physicsDelete(c, query);
	if (notify && rows.length > 0 && await adminNotifyService.isEnabled(c)) {
		await adminNotifyService.notifyEmailDeleted(c, rows, reason);
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
	return c.json(result.ok());
})

app.get('/allEmail/latest', async (c) => {
	const list = await emailService.allEmailLatest(c, c.req.query());
	return c.json(result.ok(list));
})
