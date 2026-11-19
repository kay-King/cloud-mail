import orm from '../entity/orm';
import { contact } from '../entity/contact';
import BizError from '../error/biz-error';
import { and, asc, count, desc, eq, inArray, like, or } from 'drizzle-orm';
import verifyUtils from '../utils/verify-utils';
import { t } from '../i18n/i18n';

const contactService = {

	// 通讯录列表：只查自己的；keyword 匹配姓名/邮箱/备注；按姓名排序
	async list(c, params, userId) {
		let { keyword = '', page = 1, size = 50 } = params;
		page = Math.max(Number(page) || 1, 1);
		size = Math.min(Math.max(Number(size) || 50, 1), 200);
		keyword = String(keyword).trim();

		const conditions = [eq(contact.userId, userId)];
		if (keyword) {
			const pattern = `%${keyword}%`;
			conditions.push(or(
				like(contact.name, pattern),
				like(contact.email, pattern),
				like(contact.remark, pattern)
			));
		}
		const where = and(...conditions);

		const totalRow = await orm(c).select({ total: count() }).from(contact).where(where).get();
		const list = await orm(c).select().from(contact)
			.where(where)
			.orderBy(asc(contact.name), asc(contact.contactId))
			.limit(size)
			.offset((page - 1) * size)
			.all();

		return { list, total: totalRow?.total || 0 };
	},

	// 写信时收件人联想：按关键词匹配姓名/邮箱，取前 10 条
	async suggest(c, params, userId) {
		const keyword = String(params.keyword || '').trim();
		if (!keyword) {
			return [];
		}
		const pattern = `%${keyword}%`;
		return orm(c).select().from(contact)
			.where(and(
				eq(contact.userId, userId),
				or(
					like(contact.name, pattern),
					like(contact.email, pattern)
				)
			))
			.orderBy(asc(contact.name))
			.limit(10)
			.all();
	},

	async add(c, params, userId) {
		const { name = '', email, remark = '' } = params;
		if (!email || !verifyUtils.isEmail(email)) {
			throw new BizError(t('notEmail'));
		}
		// 同一用户下邮箱不重复：已有的直接返回，不建两条
		const exist = await orm(c).select().from(contact).where(
			and(
				eq(contact.userId, userId),
				eq(contact.email, email)))
			.get();
		if (exist) {
			return exist;
		}
		const row = await orm(c).insert(contact).values({
			userId,
			name: String(name).trim(),
			email: email.trim(),
			remark: String(remark).trim()
		}).returning().get();
		return row;
	},

	async update(c, params, userId) {
		const { contactId, name = '', email, remark = '' } = params;
		if (!email || !verifyUtils.isEmail(email)) {
			throw new BizError(t('notEmail'));
		}
		const row = await orm(c).select().from(contact).where(
			and(
				eq(contact.contactId, Number(contactId)),
				eq(contact.userId, userId)))
			.get();
		if (!row) {
			throw new BizError(t('notExistContact'));
		}
		await orm(c).update(contact).set({
			name: String(name).trim(),
			email: email.trim(),
			remark: String(remark).trim()
		}).where(eq(contact.contactId, Number(contactId))).run();
	},

	async delete(c, params, userId) {
		const contactIds = (params.contactIds || '').split(',').map(Number).filter(n => !isNaN(n));
		if (contactIds.length === 0) {
			return;
		}
		await orm(c).delete(contact).where(
			and(
				eq(contact.userId, userId),
				inArray(contact.contactId, contactIds)))
			.run();
	},
};

export default contactService;
