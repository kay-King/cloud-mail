import app from '../hono/hono';
import starService from '../service/star-service';
import userContext from '../security/user-context';
import result from '../model/result';
import { notifyMailOpFromContext } from '../websocket/notify';

app.post('/star/add', async (c) => {
	const userId = userContext.getUserId(c);
	const body = await c.req.json();
	await starService.add(c, body, userId);
	notifyMailOpFromContext(c, { op: 'star', emailIds: [body.emailId], userIds: [userId] });
	return c.json(result.ok());
});

app.get('/star/list', async (c) => {
	const data = await starService.list(c, c.req.query(), userContext.getUserId(c));
	return c.json(result.ok(data));
});

app.delete('/star/cancel', async (c) => {
	const userId = userContext.getUserId(c);
	const query = c.req.query();
	await starService.cancel(c, query, userId);
	notifyMailOpFromContext(c, { op: 'unstar', emailIds: [query.emailId], userIds: [userId] });
	return c.json(result.ok());
});
