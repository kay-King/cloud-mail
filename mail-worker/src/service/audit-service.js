import orm from '../entity/orm';
import { auditLog } from '../entity/audit-log';
import { and, desc, eq, gte, inArray, lt, lte, sql } from 'drizzle-orm';
import userContext from '../security/user-context';
import userService from './user-service';
import settingService from './setting-service';

// 设置列名（camelCase）→ 中文标签；只列名，不记值，密钥类只显示名称
const SETTING_LABELS = {
	title: '网站标题',
	register: '开放注册',
	regKey: '邀请码注册',
	verifyConfig: '验证设置',
	receive: '收信',
	addEmail: '添加邮箱',
	manyEmail: '多邮箱',
	autoRefresh: '自动刷新',
	send: '发信',
	noticeConfig: '系统公告',
	tgConfig: 'TG 机器人',
	webhookConfig: 'Webhook 推送',
	syncDelete: '同步删除',
	autoCleanConfig: '自动清理',
	attEncrypt: '附件加密',
	attStorage: '附件存储',
	notifyFlags: '通知开关',
	notifyEmail: '系统通知邮箱',
	backupConfig: '备份设置',
	r2Domain: 'R2 域名',
	loginOpacity: '登录透明度',
	background: '登录背景',
	globalForward: '全局转发',
	blacklistConfig: '黑名单',
	aiCode: 'AI 识别',
	emailPrefixFilter: '邮箱前缀过滤',
	minEmailPrefix: '邮箱前缀最短长度',
	loginDomain: '登录域名',
	noRecipient: '无收件人',
	resendTokens: 'Resend 密钥',
	sendkitTokens: 'Sendkit 密钥',
	brevoTokens: 'Brevo 密钥',
	siteKey: '验证 Site Key',
	secretKey: '验证 Secret Key',
	oauthConfig: '第三方登录',
};

function normalizeValue(v) {
	if (v === undefined || v === null) return '';
	if (Array.isArray(v)) return v.join(',');
	if (typeof v === 'object') return JSON.stringify(v);
	return String(v);
}

const auditService = {

	// 记一条操作记录；内部吞掉一切异常，记日志绝不能拖垮主操作
	async log(c, { userId, userEmail, action, targetType = '', targetDesc = '', detail = '' }) {
		try {
			if (!userId || !action) return;
			await orm(c).insert(auditLog).values({
				userId,
				userEmail: userEmail || '',
				action,
				targetType,
				targetDesc: String(targetDesc || '').slice(0, 500),
				detail: String(detail || '').slice(0, 2000),
				createTime: Date.now()
			}).run();
		} catch (e) {
			console.error('audit log failed', e);
		}
	},

	// handler 层专用：自动从当前登录用户取操作人信息
	async logFor(c, { action, targetType = '', targetDesc = '', detail = '' }) {
		try {
			const userId = userContext.getUserId(c);
			const userRow = await userService.selectById(c, userId);
			await this.log(c, { userId, userEmail: userRow?.email || '', action, targetType, targetDesc, detail });
		} catch (e) {
			console.error('audit log failed', e);
		}
	},

	// 对比设置保存前后的值，返回变化的列中文标签（只列名，不含值）
	diffSettingLabels(before, params) {
		const labels = [];
		if (!before || !params) return labels;
		for (const key of Object.keys(params)) {
			if (!(key in before)) continue;
			const pv = params[key], bv = before[key];
			if (pv && typeof pv === 'object' && !Array.isArray(pv) && bv && typeof bv === 'object' && !Array.isArray(bv)) {
				// JSON 打包列：只比较请求里带了的键，缺的键按未改处理（密钥类字段前端会删掉不发，整对象比会误报）
				let changed = false;
				for (const k of Object.keys(pv)) {
					if (normalizeValue(bv[k]) !== normalizeValue(pv[k])) {
						changed = true;
						break;
					}
				}
				if (changed) labels.push(SETTING_LABELS[key] || key);
			} else if (normalizeValue(bv) !== normalizeValue(pv)) {
				labels.push(SETTING_LABELS[key] || key);
			}
		}
		return labels;
	},

	async list(c, params) {
		let { num, size, userEmail, action, startTime, endTime } = params;
		size = Math.min(Math.max(Number(size) || 20, 1), 100);
		num = Math.max(Number(num) || 1, 1);
		const conditions = [];
		if (userEmail) {
			conditions.push(sql`instr(lower(${auditLog.userEmail}), lower(${String(userEmail)})) > 0`);
		}
		if (action) {
			conditions.push(eq(auditLog.action, action));
		}
		const start = Number(startTime);
		if (!isNaN(start) && start > 0) {
			conditions.push(gte(auditLog.createTime, start));
		}
		const end = Number(endTime);
		if (!isNaN(end) && end > 0) {
			conditions.push(lte(auditLog.createTime, end));
		}
		const where = conditions.length > 0 ? and(...conditions) : undefined;
		const totalRow = await orm(c).select({ total: sql`count(*)` }).from(auditLog).where(where).get();
		const list = await orm(c).select().from(auditLog).where(where)
			.orderBy(desc(auditLog.createTime), desc(auditLog.logId))
			.limit(size).offset((num - 1) * size).all();
		return { list, total: totalRow?.total || 0 };
	},

	// 按 id 删除指定记录（删操作记录本身不记日志）
	async deleteByIds(c, ids) {
		const list = (Array.isArray(ids) ? ids : [ids]).map(Number).filter(n => Number.isInteger(n) && n > 0);
		if (list.length === 0) return { deleted: 0 };
		const res = await orm(c).delete(auditLog).where(inArray(auditLog.logId, list)).run();
		return { deleted: res?.changes || 0 };
	},

	// 清空全部记录
	async clearAll(c) {
		const res = await orm(c).delete(auditLog).run();
		return { deleted: res?.changes || 0 };
	},

	// 定时清理：删除超过保留天数的操作记录；0 = 不自动清理（照邮件自动清理的做法）
	async cleanOld(c) {
		try {
			const settingRow = await settingService.query(c);
			const days = Number(settingService.autoCleanConfig(settingRow).auditCleanDays);
			if (!days || days <= 0) return { deleted: 0 };
			const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
			const res = await orm(c).delete(auditLog).where(lt(auditLog.createTime, cutoff)).run();
			return { deleted: res?.changes || 0 };
		} catch (e) {
			console.error('audit clean failed', e);
			return { deleted: 0 };
		}
	},
};

export default auditService;
