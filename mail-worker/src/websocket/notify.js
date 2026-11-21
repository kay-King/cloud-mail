// 全部邮件页共用的 Durable Object 名；个人收件箱用 userId。
export const ALL_EMAIL_HUB = 'all-email';

// 新邮件入库后推送：有 userId 则通知该用户收件箱；始终通知全部邮件通道。
// 无人收件时 userId 为 0，没有个人收件箱，只推全部邮件。
// 失败不影响收信，用 waitUntil 挂到当前 Worker 生命周期。
export function notifyMailWs(env, ctx, emailRow) {
	if (!env?.ws) {
		return;
	}

	const payload = {
		type: 'new_message',
		emailId: emailRow?.emailId,
		accountId: emailRow?.accountId,
		userId: emailRow?.userId || 0
	};

	const tasks = [];
	if (emailRow?.userId) {
		tasks.push(env.ws.getByName(String(emailRow.userId)).notify(payload));
	}
	tasks.push(env.ws.getByName(ALL_EMAIL_HUB).notify(payload));

	const task = Promise.all(tasks).catch(err => {
		console.error('ws notify failed', err);
	});

	if (ctx && typeof ctx.waitUntil === 'function') {
		ctx.waitUntil(task);
	} else {
		void task;
	}
}

// Hono 请求里取 executionCtx 再推送（站内互发走 HTTP，没有独立的 email handler ctx）。
export function notifyMailWsFromContext(c, emailRow) {
	let ctx;
	try {
		ctx = c.executionCtx;
	} catch {
		ctx = undefined;
	}
	notifyMailWs(c.env, ctx, emailRow);
}

// 邮件 id 归一化：数组 / 逗号字符串 / 单个数字都转成数字数组。
function toIdList(value) {
	if (value == null || value === '') {
		return [];
	}
	const arr = Array.isArray(value) ? value : String(value).split(',');
	return arr.map(v => Number(v)).filter(n => Number.isFinite(n));
}

// 操作事件广播：删/恢复/标垃圾/标已读/星标/发信等操作成功后通知各设备同步列表。
// 与新邮件同路：发给每个受影响用户的 hub（自己的其它设备）+ 全部邮件共享 hub
// （管理员的全部邮件视图）。op：delete/restore/spam/unspam/read/unread/star/unstar/send/clear-spam。
// 失败不影响主操作，用 waitUntil 挂到当前 Worker 生命周期。
export function notifyMailOp(env, ctx, { op, emailIds, userIds }) {
	if (!env?.ws) {
		return;
	}

	const payload = {
		type: 'mail_op',
		op,
		emailIds: toIdList(emailIds),
		userIds: toIdList(userIds)
	};

	const tasks = [];
	for (const uid of new Set(payload.userIds)) {
		if (uid) {
			tasks.push(env.ws.getByName(String(uid)).notify(payload));
		}
	}
	tasks.push(env.ws.getByName(ALL_EMAIL_HUB).notify(payload));

	const task = Promise.all(tasks).catch(err => {
		console.error('ws op notify failed', err);
	});

	if (ctx && typeof ctx.waitUntil === 'function') {
		ctx.waitUntil(task);
	} else {
		void task;
	}
}

// Hono 请求里取 executionCtx 再推送操作事件。
export function notifyMailOpFromContext(c, { op, emailIds, userIds }) {
	let ctx;
	try {
		ctx = c.executionCtx;
	} catch {
		ctx = undefined;
	}
	notifyMailOp(c.env, ctx, { op, emailIds, userIds });
}
