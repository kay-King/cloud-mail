import KvConst from '../const/kv-const';
import setting from '../entity/setting';
import orm from '../entity/orm';
import {verifyRecordType} from '../const/entity-const';
import fileUtils from '../utils/file-utils';
import r2Service from './r2-service';
import constant from '../const/constant';
import BizError from '../error/biz-error';
import {t} from '../i18n/i18n'
import verifyRecordService from './verify-record-service';
import userContext from '../security/user-context';
import domainUtils from '../utils/domain-uitls';

const settingService = {

	async refresh(c) {
		const settingRow = await orm(c).select().from(setting).get();
		settingRow.resendTokens = JSON.parse(settingRow.resendTokens);
		settingRow.sendkitTokens = JSON.parse(settingRow.sendkitTokens || '{}');
		settingRow.brevoTokens = JSON.parse(settingRow.brevoTokens || '{}');
		settingRow.notifyFlags = JSON.parse(settingRow.notifyFlags || '{}');
		settingRow.globalForward = JSON.parse(settingRow.globalForward || '{}');
		settingRow.r2Domain = '';
		c.set('setting', settingRow);
		await c.env.kv.put(KvConst.SETTING, JSON.stringify(settingRow));
	},

	// 通知开关读值（notify_flags 打包后）：新格式是 setting.notifyFlags 对象里的字段；
	// 旧缓存里是平铺字段，两者都兜底；都没有时按默认开。notifyStatus：0=开、1=关；其余三项：1=开、0=关。
	notifyFlag(setting, key) {
		const flags = setting?.notifyFlags;
		if (flags && typeof flags === 'object' && flags[key] !== undefined && flags[key] !== null) {
			return flags[key];
		}
		if (setting && setting[key] !== undefined && setting[key] !== null) {
			return setting[key];
		}
		return key === 'notifyStatus' ? 0 : 1;
	},

	// 全局转发配置读值（global_forward 打包后）：新格式是 setting.globalForward 对象里的字段；
	// 旧缓存里是平铺字段，两边都兜底；都没有时按默认（关闭、规则全部）。forwardStatus：0=开、1=关；ruleType：0=全部、1=按规则。
	globalForward(setting) {
		const g = setting?.globalForward;
		const pick = (key, def) => {
			if (g && typeof g === 'object' && g[key] !== undefined && g[key] !== null) return g[key];
			if (setting && setting[key] !== undefined && setting[key] !== null) return setting[key];
			return def;
		};
		return {
			forwardEmail: pick('forwardEmail', ''),
			forwardStatus: pick('forwardStatus', 1),
			ruleEmail: pick('ruleEmail', ''),
			ruleType: pick('ruleType', 0)
		};
	},

	async query(c) {

		if (c.get?.('setting')) {
			return c.get('setting')
		}

		const setting = await c.env.kv.get(KvConst.SETTING, { type: 'json' });

		if (!setting) {
			throw new BizError('数据库未初始化 Database not initialized.');
		}

		let domainList = c.env.domain;

		if (typeof domainList === 'string') {
			try {
				domainList = JSON.parse(domainList)
			} catch (error) {
				throw new BizError(t('notJsonDomain'));
			}
		}

		if (!c.env.domain) {
			throw new BizError(t('noDomainVariable'));
		}

		domainList = domainList.map(item => '@' + item);
		setting.domainList = domainList;

		let projectLink = c.env.project_link;
		if (typeof projectLink === 'string' && projectLink === 'false') {
			projectLink = false
		} else if (projectLink === false) {
			projectLink = false
		} else {
			projectLink = true
		}

		setting.projectLink = projectLink;

		setting.emailPrefixFilter = setting.emailPrefixFilter.split(",").filter(Boolean);

		c.set?.('setting', setting);
		return setting;
	},

	async get(c) {

		const [settingRow, recordList] = await Promise.all([
			await this.query(c),
			verifyRecordService.selectListByIP(c)
		]);

		settingRow.secretKey = settingRow.secretKey ? `${settingRow.secretKey.slice(0, 6)}******` : null;

		Object.keys(settingRow.resendTokens).forEach(key => {
			settingRow.resendTokens[key] = `${settingRow.resendTokens[key].slice(0, 12)}******`;
		});

		Object.keys(settingRow.sendkitTokens || {}).forEach(key => {
			settingRow.sendkitTokens[key] = `${settingRow.sendkitTokens[key].slice(0, 12)}******`;
		});

		Object.keys(settingRow.brevoTokens || {}).forEach(key => {
			settingRow.brevoTokens[key] = `${settingRow.brevoTokens[key].slice(0, 12)}******`;
		});

		settingRow.s3AccessKey = settingRow.s3AccessKey ? `${settingRow.s3AccessKey.slice(0, 12)}******` : null;
		settingRow.s3SecretKey = settingRow.s3SecretKey ? `${settingRow.s3SecretKey.slice(0, 12)}******` : null;
		settingRow.r2AccessKey = settingRow.r2AccessKey ? `${settingRow.r2AccessKey.slice(0, 12)}******` : null;
		settingRow.r2SecretKey = settingRow.r2SecretKey ? `${settingRow.r2SecretKey.slice(0, 12)}******` : null;
		settingRow.webdavUsername = settingRow.webdavUsername ? `${settingRow.webdavUsername.slice(0, 12)}******` : null;
		settingRow.webdavPassword = settingRow.webdavPassword ? `${settingRow.webdavPassword.slice(0, 12)}******` : null;
		settingRow.backupR2AccessKey = settingRow.backupR2AccessKey ? `${settingRow.backupR2AccessKey.slice(0, 12)}******` : null;
		settingRow.backupR2SecretKey = settingRow.backupR2SecretKey ? `${settingRow.backupR2SecretKey.slice(0, 12)}******` : null;
		settingRow.backupWebdavUsername = settingRow.backupWebdavUsername ? `${settingRow.backupWebdavUsername.slice(0, 12)}******` : null;
		settingRow.backupWebdavPassword = settingRow.backupWebdavPassword ? `${settingRow.backupWebdavPassword.slice(0, 12)}******` : null;
		settingRow.backupS3AccessKey = settingRow.backupS3AccessKey ? `${settingRow.backupS3AccessKey.slice(0, 12)}******` : null;
		settingRow.backupS3SecretKey = settingRow.backupS3SecretKey ? `${settingRow.backupS3SecretKey.slice(0, 12)}******` : null;
		settingRow.tgBotToken = settingRow.tgBotToken ? `${settingRow.tgBotToken.slice(0, 20)}******` : null;
		settingRow.hasR2 = !!c.env.r2
		settingRow.hasCfEmail = !!c.env.email

		let regVerifyOpen = false
		let addVerifyOpen = false

		recordList.forEach(row => {
			if (row.type === verifyRecordType.REG) {
				regVerifyOpen = row.count >= settingRow.regVerifyCount
			}
			if (row.type === verifyRecordType.ADD) {
				addVerifyOpen = row.count >= settingRow.addVerifyCount
			}
		})

		settingRow.regVerifyOpen = regVerifyOpen
		settingRow.addVerifyOpen = addVerifyOpen

		settingRow.storageType = await r2Service.storageType(c);

		return settingRow;
	},

	async set(c, params) {
		const settingData = await this.query(c);
		let resendTokens = { ...settingData.resendTokens, ...params.resendTokens };
		Object.keys(resendTokens).forEach(domain => {
			if (!resendTokens[domain]) delete resendTokens[domain];
		});
		let sendkitTokens = { ...(settingData.sendkitTokens || {}), ...params.sendkitTokens };
		Object.keys(sendkitTokens).forEach(domain => {
			if (!sendkitTokens[domain]) delete sendkitTokens[domain];
		});
		let brevoTokens = { ...(settingData.brevoTokens || {}), ...params.brevoTokens };
		Object.keys(brevoTokens).forEach(domain => {
			if (!brevoTokens[domain]) delete brevoTokens[domain];
		});

		if (Array.isArray(params.emailPrefixFilter)) {
			params.emailPrefixFilter = params.emailPrefixFilter + '';
		}

		if (Array.isArray(params.aiCodeFilter)) {
			params.aiCodeFilter = params.aiCodeFilter + '';
		}

		if (params.webhookUrl !== undefined) {
			params.webhookUrl = domainUtils.toOssDomain(params.webhookUrl) || '';
		}

		let notifyFlags = { ...(settingData.notifyFlags || {}) };
		if (params.notifyFlags && typeof params.notifyFlags === 'object') {
			notifyFlags = { ...notifyFlags, ...params.notifyFlags };
		}
		let globalForward = { ...(settingData.globalForward || {}) };
		if (params.globalForward && typeof params.globalForward === 'object') {
			globalForward = { ...globalForward, ...params.globalForward };
		}

		params.resendTokens = JSON.stringify(resendTokens);
		params.sendkitTokens = JSON.stringify(sendkitTokens);
		params.brevoTokens = JSON.stringify(brevoTokens);
		params.notifyFlags = JSON.stringify(notifyFlags);
		params.globalForward = JSON.stringify(globalForward);

		// 旧版平铺的通知开关与全局转发列已打包进 JSON 列，旧客户端可能还带这些字段，删掉避免写不存在的列
		delete params.notifyStatus;
		delete params.adminDelNotify;
		delete params.forwardFailNotify;
		delete params.backupFailNotify;
		delete params.forwardEmail;
		delete params.forwardStatus;
		delete params.ruleEmail;
		delete params.ruleType;

		await orm(c).update(setting).set({ ...params }).returning().get();
		await this.refresh(c);
	},

	async deleteBackground(c) {

		const { background } = await this.query(c);
		if (!background) return

		// 外链与壁纸库（preset:<id>）没有存对象，直接清设置即可
		if (background.startsWith('http') || background.startsWith('preset:')) {
			await orm(c).update(setting).set({ background: '' }).run();
			await this.refresh(c)
			return;
		}

		if (background) {
			await r2Service.delete(c,background)
			await orm(c).update(setting).set({ background: '' }).run();
			await this.refresh(c)
		}
	},

	async setBackground(c, params) {

		let { background } = params

		await this.deleteBackground(c);

		// 外链与壁纸库（preset:<id>）直接存值；其余当作 base64 图片上传存对象
		if (background && !background.startsWith('http') && !background.startsWith('preset:')) {

			const file = fileUtils.base64ToFile(background)

			const arrayBuffer = await file.arrayBuffer();
			background = constant.BACKGROUND_PREFIX + await fileUtils.getBuffHash(arrayBuffer) + fileUtils.getExtFileName(file.name);


			await r2Service.putObj(c, background, arrayBuffer, {
				contentType: file.type,
				cacheControl: `public, max-age=31536000, immutable`,
				contentDisposition: `inline; filename="${file.name}"`
			});

		}

		await orm(c).update(setting).set({ background }).run();
		await this.refresh(c);
		return background;
	},

	async setBlacklist(c, params) {
		const { blackSubject, blackContent, blackFrom  } = params
		await orm(c).update(setting).set({ blackSubject, blackContent, blackFrom }).run();
		await this.refresh(c);
		return this.get(c);
	},

	async websiteConfig(c) {

		const settingRow = await this.get(c);
		const token = await userContext.getToken(c);

		return {
			register: settingRow.register,
			title: settingRow.title,
			manyEmail: settingRow.manyEmail,
			addEmail: settingRow.addEmail,
			autoRefresh: settingRow.autoRefresh,
			addEmailVerify: settingRow.addEmailVerify,
			registerVerify: settingRow.registerVerify,
			send: settingRow.send,
			r2Domain: settingRow.r2Domain,
			siteKey: settingRow.siteKey,
			background: settingRow.background,
			loginOpacity: settingRow.loginOpacity,
			domainList: settingRow.loginDomain === 1 && !token ? [] : settingRow.domainList,
			regKey: settingRow.regKey,
			regVerifyOpen: settingRow.regVerifyOpen,
			addVerifyOpen: settingRow.addVerifyOpen,
			noticeTitle: settingRow.noticeTitle,
			noticeContent: settingRow.noticeContent,
			noticeType: settingRow.noticeType,
			noticeDuration: settingRow.noticeDuration,
			noticePosition: settingRow.noticePosition,
			noticeWidth: settingRow.noticeWidth,
			noticeOffset: settingRow.noticeOffset,
			notice: settingRow.notice,
			loginDomain: settingRow.loginDomain,
			linuxdoClientId: settingRow.linuxdoClientId,
			linuxdoSwitch: settingRow.linuxdoSwitch,
			githubClientId: settingRow.githubClientId,
			githubSwitch: settingRow.githubSwitch,
			googleClientId: settingRow.googleClientId,
			googleSwitch: settingRow.googleSwitch,
			minEmailPrefix: settingRow.minEmailPrefix,
			projectLink: settingRow.projectLink,
			adminDelNotify: this.notifyFlag(settingRow, 'adminDelNotify'),
			autoBackup: settingRow.autoBackup
		};
	},

};

export default settingService;
