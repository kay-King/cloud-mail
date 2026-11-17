import orm from '../entity/orm';
import { att } from '../entity/att';
import { email } from '../entity/email';
import { account } from '../entity/account';
import { and, eq, isNull, inArray, desc, like, or, sql } from 'drizzle-orm';
import r2Service from './r2-service';
import constant from '../const/constant';
import fileUtils from '../utils/file-utils';
import { attConst } from '../const/entity-const';
import { parseHTML } from 'linkedom';
import { v4 as uuidv4 } from 'uuid';
import domainUtils from '../utils/domain-uitls';
import settingService from "./setting-service";

const attService = {

	async addAtt(c, attachments) {

		for (let attachment of attachments) {

			let metadate = {
				contentType: attachment.mimeType,
			}

			if (!attachment.contentId) {
				// 不把原始文件名写进对象元数据，服务商看不到文件名；下载时从 D1 取文件名拼 Content-Disposition
				metadate.contentDisposition = `attachment`
			} else {
				metadate.contentDisposition = `inline`
				metadate.cacheControl = `max-age=259200`
			}

			await r2Service.putObj(c, attachment.key, attachment.content, metadate);

		}

		await orm(c).insert(att).values(attachments).run();
	},

	list(c, params, userId) {
		const { emailId } = params;

		return orm(c).select().from(att).where(
			and(
				eq(att.emailId, emailId),
				eq(att.userId, userId),
				eq(att.type, attConst.type.ATT),
				isNull(att.contentId)
			)
		).all();
	},

	async toImageUrlHtml(c, content) {

		const { r2Domain } = await settingService.query(c);

		const { document } = parseHTML(content);

		const images = Array.from(document.querySelectorAll('img'));

		let imageDataList = [];

		for (const img of images) {

			//邮件正文base64图片转cid附件
			const src = img.getAttribute('src');
			if (src && src.startsWith('data:image')) {
				const file = fileUtils.base64ToFile(src);
				const buff = await file.arrayBuffer();
				const cid = uuidv4().replace(/-/g, '');
				// key 只用内容哈希，不带扩展名，避免从对象名泄露文件类型
				const key = constant.ATTACHMENT_PREFIX + await fileUtils.getBuffHash(buff);

				img.setAttribute('src', 'cid:' + cid);

				const attData = {};
				attData.key = key;
				attData.filename = file.name;
				attData.mimeType = file.type;
				attData.size = file.size;
				attData.buff = buff;
				attData.content = fileUtils.base64ToDataStr(src);
				attData.contentId = cid;

				imageDataList.push(attData);
			}

			//邮件正文站内图片转cid附件
			if (src && (src.startsWith(domainUtils.toOssDomain(r2Domain)) || src.startsWith('attachments/'))) {

				const cid = uuidv4().replace(/-/g, '')
				img.setAttribute('src', 'cid:' + cid);

				const attData = {};

				if (src.startsWith(domainUtils.toOssDomain(r2Domain))) {
					attData.key = src.replace(domainUtils.toOssDomain(r2Domain) + '/','');
				}

				if (src.startsWith('attachments/')) {
					attData.key = src;
				}

				attData.contentId = cid;
				attData.type = attConst.type.EMBED;
				imageDataList.push(attData);

			}

			const hasInlineWidth = img.hasAttribute('width');
			const style = img.getAttribute('style') || '';
			const hasStyleWidth = /(^|\s)width\s*:\s*[^;]+/.test(style);

			if (!hasInlineWidth && !hasStyleWidth) {
				const newStyle = (style ? style.trim().replace(/;$/, '') + '; ' : '') + 'max-width: 100%;';
				img.setAttribute('style', newStyle);
			}
		}

		//查询已有内嵌url图片信息
		const keys = [...new Set(imageDataList.filter(item => !item.content).map(item => item.key))];
		const dbImageList  = await this.selectOneByKeys(c, keys);

		//设置给当前附件
		await Promise.all(imageDataList.map(async image => {
			if (image.content) {
				return;
			}

			const dbImage = dbImageList.find(dbImage => image.key === dbImage.key);
			if (!dbImage) {
				return;
			}

			image.size = dbImage.size;
			image.filename = dbImage.filename;
			image.mimeType = dbImage.mimeType;
			image.contentType = dbImage.mimeType;

			const obj = await r2Service.getObj(c, image.key);
			if (!obj) {
				return;
			}

			image.content = obj instanceof ArrayBuffer ? obj : await obj.arrayBuffer();
		}))

		imageDataList = imageDataList.filter(image => image.content);

		return { imageDataList, html: document.toString() };
	},

	async saveSendAtt(c, attList, userId, accountId, emailId) {

		const attDataList = [];

		for (let att of attList) {
			att.buff = fileUtils.base64ToUint8Array(att.content);
			// key 只用内容哈希，不带扩展名，避免从对象名泄露文件类型
			att.key = constant.ATTACHMENT_PREFIX + await fileUtils.getBuffHash(att.buff);
			const attData = { userId, accountId, emailId };
			attData.key = att.key;
			attData.size = att.buff.length;
			attData.filename = att.filename;
			attData.mimeType = att.type;
			attData.type = attConst.type.ATT;
			attDataList.push(attData);
		}

		//先上传对象，全部成功后再写数据库，避免上传失败留下指向不存在对象的记录
		//并行上传：多附件时不再一张一张串行等，任一失败仍整体中止
		await Promise.all(attList.map(att => r2Service.putObj(c, att.key, att.buff, {
			contentType: att.type,
			contentDisposition: `attachment`
		})));

		await orm(c).insert(att).values(attDataList).run();

	},

	async saveArticleAtt(c, attDataList, userId, accountId, emailId) {

		for (let attData of attDataList) {
			attData.userId = userId;
			attData.emailId = emailId;
			attData.accountId = accountId;
			attData.type = attConst.type.EMBED;
			if (!attData.buff) {
				continue;
			}
			await r2Service.putObj(c, attData.key, attData.buff, {
				contentType: attData.mimeType,
				cacheControl: `max-age=259200`,
				contentDisposition: `inline`
			});
			delete attData.buff;
		}

		await orm(c).insert(att).values(attDataList).run();

	},

	async removeByUserIds(c, userIds) {
		await this.removeAttByField(c, 'user_id', userIds);
	},

	async removeByEmailIds(c, emailIds) {
		await this.removeAttByField(c, 'email_id', emailIds);
	},

	selectByEmailIds(c, emailIds) {
		return orm(c).select().from(att).where(
			and(
				inArray(att.emailId, emailIds),
				eq(att.type, attConst.type.ATT)
			))
			.all();
	},

	// 含内嵌图的全量附件（站内投递复制给收件副本时用，selectByEmailIds 只返回真正附件）
	selectAllByEmailIds(c, emailIds) {
		return orm(c).select().from(att).where(
			inArray(att.emailId, emailIds)
		).all();
	},

	async removeAttByField(c, fieldName, fieldValues) {

		const sqlList = [];

		fieldValues.forEach(value => {

			sqlList.push(

				c.env.db.prepare(
					`SELECT a.key, a.att_id
						FROM attachments a
							   JOIN (SELECT key
									 FROM attachments
									 GROUP BY key
									 HAVING COUNT (*) = 1) t
									ON a.key = t.key
						WHERE a.${fieldName} = ?;`
					).bind(value)
			)

			sqlList.push(c.env.db.prepare(`DELETE FROM attachments WHERE ${fieldName} = ?`).bind(value))

		});

		const attListResult = await c.env.db.batch(sqlList);

		const delKeyList = attListResult.flatMap(r => r.results ? r.results.map(row => row.key) : []);

		if (delKeyList.length > 0) {
			try {
				await this.batchDelete(c, delKeyList);
			} catch (e) {
				console.error('删除附件文件失败：', e);
			}
		}

	},

	async batchDelete(c, keys) {
		if (!keys.length) return;

		const BATCH_SIZE = 1000;

		for (let i = 0; i < keys.length; i += BATCH_SIZE) {
			const batch = keys.slice(i, i + BATCH_SIZE);
			await r2Service.delete(c, batch);
		}

	},

	async removeByAccountId(c, accountId) {
		await this.removeAttByField(c, "account_id", [accountId])
	},

	selectOneByKeys(c, keys) {
		if (!keys || keys.length === 0) {
			return []
		}
		return orm(c).select().from(att).where(inArray(att.key, keys)).orderBy(desc(att.attId)).groupBy(att.key).all();
	},

	// 全部附件页：只列真正附件（type=ATT），内嵌图（EMBED）不算；已删邮件的附件不列
	async listAll(c, params, userId) {

		let { num, size, keyword, category, star } = params;

		size = Number(size);
		num = Number(num);
		if (isNaN(size) || size <= 0) size = 20;
		if (size > 100) size = 100;
		if (isNaN(num) || num <= 0) num = 1;
		star = Number(star) === 1;

		const conditions = [
			eq(att.userId, userId),
			eq(att.type, attConst.type.ATT),
			eq(email.isDel, 0),
		];

		if (keyword) {
			// instr 做纯子串匹配，不用 LIKE，避免 % _ 通配符与 ESCAPE 转义问题
			conditions.push(sql`instr(lower(${att.filename}), lower(${String(keyword)})) > 0`);
		}

		if (star) {
			conditions.push(eq(att.isStar, 1));
		}

		if (category && category !== 'all') {
			const catCond = categoryCondition(category);
			if (catCond) conditions.push(catCond);
		}

		const where = and(...conditions);

		const list = await orm(c).select({
			attId: att.attId,
			key: att.key,
			filename: att.filename,
			mimeType: att.mimeType,
			size: att.size,
			isStar: att.isStar,
			createTime: att.createTime,
			emailId: email.emailId,
			subject: email.subject,
			sendEmail: email.sendEmail,
			senderName: email.name,
			emailType: email.type,
		}).from(att)
			.innerJoin(email, eq(att.emailId, email.emailId))
			.where(where)
			.orderBy(desc(att.createTime), desc(att.attId))
			.limit(size).offset((num - 1) * size).all();

		const totalRow = await orm(c).select({ total: sql`COUNT(*)` })
			.from(att)
			.innerJoin(email, eq(att.emailId, email.emailId))
			.where(where).get();

		return { list, total: totalRow ? Number(totalRow.total) : 0 };
	},

	// 管理员全部附件：不按用户隔离，多返回所属邮箱（附件所属账号地址）
	async listAllAdmin(c, params) {

		let { num, size, keyword, category } = params;

		size = Number(size);
		num = Number(num);
		if (isNaN(size) || size <= 0) size = 20;
		if (size > 100) size = 100;
		if (isNaN(num) || num <= 0) num = 1;

		const conditions = [
			eq(att.type, attConst.type.ATT),
			eq(email.isDel, 0),
		];

		if (keyword) {
			// instr 做纯子串匹配，不用 LIKE，避免 % _ 通配符与 ESCAPE 转义问题
			conditions.push(sql`instr(lower(${att.filename}), lower(${String(keyword)})) > 0`);
		}

		if (category && category !== 'all') {
			const catCond = categoryCondition(category);
			if (catCond) conditions.push(catCond);
		}

		const where = and(...conditions);

		const list = await orm(c).select({
			attId: att.attId,
			key: att.key,
			filename: att.filename,
			mimeType: att.mimeType,
			size: att.size,
			isStar: att.isStar,
			createTime: att.createTime,
			emailId: email.emailId,
			subject: email.subject,
			sendEmail: email.sendEmail,
			senderName: email.name,
			emailType: email.type,
			ownerEmail: account.email,
		}).from(att)
			.innerJoin(email, eq(att.emailId, email.emailId))
			.leftJoin(account, eq(att.accountId, account.accountId))
			.where(where)
			.orderBy(desc(att.createTime), desc(att.attId))
			.limit(size).offset((num - 1) * size).all();

		const totalRow = await orm(c).select({ total: sql`COUNT(*)` })
			.from(att)
			.innerJoin(email, eq(att.emailId, email.emailId))
			.where(where).get();

		return { list, total: totalRow ? Number(totalRow.total) : 0 };
	},

// 单独删除附件：只删 ATT 行（内嵌图不删）；文件对象等最后一个引用删掉时才删
	async deleteByIds(c, attIds, userId, isAdmin) {

		const ids = attIds.map(Number).filter(n => !isNaN(n));
		if (ids.length === 0) return 0;

		const conds = [inArray(att.attId, ids), eq(att.type, attConst.type.ATT)];
		if (!isAdmin) conds.push(eq(att.userId, userId));
		// 删前取行：供删除通知用（带所属邮件主题）
		const rows = await orm(c).select({
			attId: att.attId,
			key: att.key,
			userId: att.userId,
			accountId: att.accountId,
			filename: att.filename,
			size: att.size,
			subject: email.subject,
		}).from(att)
			.innerJoin(email, eq(att.emailId, email.emailId))
			.where(and(...conds)).all();
		if (rows.length === 0) return { deleted: 0, rows: [] };

		const delIds = rows.map(r => r.attId);
		await orm(c).delete(att).where(inArray(att.attId, delIds)).run();

		// 还有其他行引用同一文件时不删对象
		const keys = [...new Set(rows.map(r => r.key))];
		const remaining = await orm(c).select({ key: att.key }).from(att)
			.where(inArray(att.key, keys)).groupBy(att.key).all();
		const remainingKeys = new Set(remaining.map(r => r.key));
		const orphanKeys = keys.filter(k => !remainingKeys.has(k));
		if (orphanKeys.length > 0) {
			try {
				await this.batchDelete(c, orphanKeys);
			} catch (e) {
				console.error('删除附件文件失败：', e);
			}
		}
		return { deleted: delIds.length, rows };
	},

	// 批量收藏 / 取消收藏附件（按行收藏，同一文件在多封邮件里各算各的）
	async setStar(c, params, userId) {
		let { attIds, isStar } = params;
		if (!Array.isArray(attIds)) attIds = attIds ? [attIds] : [];
		attIds = attIds.map(Number).filter(n => !isNaN(n));
		if (attIds.length === 0) return;
		await orm(c).update(att).set({ isStar: Number(isStar) === 1 ? 1 : 0 })
			.where(and(inArray(att.attId, attIds), eq(att.userId, userId))).run();
	}
};

// 附件分类：按文件扩展名划分
const CATEGORY_EXTS = {
	image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico', 'heic', 'heif', 'tif', 'tiff', 'avif'],
	doc: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md', 'rtf', 'csv', 'pages', 'numbers', 'key', 'odt', 'ods', 'odp'],
	audio: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'oga', 'm4a', 'wma', 'opus'],
	video: ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v', '3gp'],
	archive: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'iso'],
};

function categoryCondition(category) {
	if (category === 'other') {
		const all = Object.values(CATEGORY_EXTS).flat();
		return sql`NOT (${or(...all.map(e => sql`lower(${att.filename}) LIKE ${'%.' + e}`))})`;
	}
	const exts = CATEGORY_EXTS[category];
	if (!exts) return null;
	return or(...exts.map(e => sql`lower(${att.filename}) LIKE ${'%.' + e}`));
}

export default attService;
