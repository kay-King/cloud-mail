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
		settingRow.backupConfig = JSON.parse(settingRow.backupConfig || '{}');
		settingRow.attStorage = JSON.parse(settingRow.attStorage || '{}');
		settingRow.oauthConfig = JSON.parse(settingRow.oauthConfig || '{}');
		settingRow.noticeConfig = JSON.parse(settingRow.noticeConfig || '{}');
		settingRow.tgConfig = JSON.parse(settingRow.tgConfig || '{}');
		settingRow.verifyConfig = JSON.parse(settingRow.verifyConfig || '{}');
		settingRow.webhookConfig = JSON.parse(settingRow.webhookConfig || '{}');
		settingRow.blacklistConfig = JSON.parse(settingRow.blacklistConfig || '{}');
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

	// 备份配置读值（backup_config 打包后）：新格式是 setting.backupConfig 对象里的字段；
	// 旧缓存里是平铺字段，两边都兜底；都没有时按默认。
	backupConfig(setting) {
		const b = setting?.backupConfig;
		const pick = (key, def) => {
			if (b && typeof b === 'object' && b[key] !== undefined && b[key] !== null) return b[key];
			if (setting && setting[key] !== undefined && setting[key] !== null) return setting[key];
			return def;
		};
		return {
			autoBackup: pick('autoBackup', 1),
			backupType: pick('backupType', 's3'),
			backupBucket: pick('backupBucket', ''),
			backupRegion: pick('backupRegion', ''),
			backupEndpoint: pick('backupEndpoint', ''),
			backupS3AccessKey: pick('backupS3AccessKey', ''),
			backupS3SecretKey: pick('backupS3SecretKey', ''),
			backupForcePathStyle: pick('backupForcePathStyle', 1),
			backupR2AccountId: pick('backupR2AccountId', ''),
			backupR2Bucket: pick('backupR2Bucket', ''),
			backupR2AccessKey: pick('backupR2AccessKey', ''),
			backupR2SecretKey: pick('backupR2SecretKey', ''),
			backupWebdavUrl: pick('backupWebdavUrl', ''),
			backupWebdavUsername: pick('backupWebdavUsername', ''),
			backupWebdavPassword: pick('backupWebdavPassword', '')
		};
	},

	// 附件存储配置读值（att_storage 打包后）：新格式是 setting.attStorage 对象里的字段；
	// 旧缓存里是平铺字段，两边都兜底；都没有时按默认。
	attStorage(setting) {
		const a = setting?.attStorage;
		const pick = (key, def) => {
			if (a && typeof a === 'object' && a[key] !== undefined && a[key] !== null) return a[key];
			if (setting && setting[key] !== undefined && setting[key] !== null) return setting[key];
			return def;
		};
		return {
			bucket: pick('bucket', ''),
			region: pick('region', ''),
			endpoint: pick('endpoint', ''),
			s3AccessKey: pick('s3AccessKey', ''),
			s3SecretKey: pick('s3SecretKey', ''),
			forcePathStyle: pick('forcePathStyle', 1),
			attStorageType: pick('attStorageType', 's3'),
			r2AccountId: pick('r2AccountId', ''),
			r2Bucket: pick('r2Bucket', ''),
			r2AccessKey: pick('r2AccessKey', ''),
			r2SecretKey: pick('r2SecretKey', ''),
			webdavUrl: pick('webdavUrl', ''),
			webdavUsername: pick('webdavUsername', ''),
			webdavPassword: pick('webdavPassword', '')
		};
	},

	// 第三方登录配置读值（oauth_config 打包后）：新格式是 setting.oauthConfig 对象里的字段；
	// 旧缓存里是平铺字段，两边都兜底；都没有时按默认（开关默认 1=关）。
	oauthConfig(setting) {
		const o = setting?.oauthConfig;
		const pick = (key, def) => {
			if (o && typeof o === 'object' && o[key] !== undefined && o[key] !== null) return o[key];
			if (setting && setting[key] !== undefined && setting[key] !== null) return setting[key];
			return def;
		};
		return {
			linuxdoClientId: pick('linuxdoClientId', ''),
			linuxdoClientSecret: pick('linuxdoClientSecret', ''),
			linuxdoSwitch: pick('linuxdoSwitch', 1),
			githubClientId: pick('githubClientId', ''),
			githubClientSecret: pick('githubClientSecret', ''),
			githubSwitch: pick('githubSwitch', 1),
			googleClientId: pick('googleClientId', ''),
			googleClientSecret: pick('googleClientSecret', ''),
			googleSwitch: pick('googleSwitch', 1)
		};
	},

	// 系统公告配置读值（notice_config 打包后）：新格式是 setting.noticeConfig 对象里的字段；
	// 旧缓存里是平铺字段，两边都兜底；都没有时按默认（notice 0=开，noticeWidth 400）。
	noticeConfig(setting) {
		const n = setting?.noticeConfig;
		const pick = (key, def) => {
			if (n && typeof n === 'object' && n[key] !== undefined && n[key] !== null) return n[key];
			if (setting && setting[key] !== undefined && setting[key] !== null) return setting[key];
			return def;
		};
		return {
			noticeTitle: pick('noticeTitle', ''),
			noticeContent: pick('noticeContent', ''),
			noticeType: pick('noticeType', ''),
			noticeDuration: pick('noticeDuration', 0),
			noticePosition: pick('noticePosition', ''),
			noticeOffset: pick('noticeOffset', 0),
			noticeWidth: pick('noticeWidth', 400),
			notice: pick('notice', 0)
		};
	},

	// TG 机器人配置读值（tg_config 打包后）：新格式是 setting.tgConfig 对象里的字段；
	// 旧缓存里是平铺字段，两边都兜底；都没有时按默认（开关默认 1=关，消息格式按原项目默认）。
	tgConfig(setting) {
		const t = setting?.tgConfig;
		const pick = (key, def) => {
			if (t && typeof t === 'object' && t[key] !== undefined && t[key] !== null) return t[key];
			if (setting && setting[key] !== undefined && setting[key] !== null) return setting[key];
			return def;
		};
		return {
			tgBotToken: pick('tgBotToken', ''),
			tgChatId: pick('tgChatId', ''),
			tgBotStatus: pick('tgBotStatus', 1),
			customDomain: pick('customDomain', ''),
			tgMsgFrom: pick('tgMsgFrom', 'only-name'),
			tgMsgTo: pick('tgMsgTo', 'show'),
			tgMsgText: pick('tgMsgText', 'hide')
		};
	},

	// 验证配置读值（verify_config 打包后）：新格式是 setting.verifyConfig 对象里的字段；
	// 旧缓存里是平铺字段，两边都兜底；都没有时按默认（开关默认 1=关，次数默认 1）。
	verifyConfig(setting) {
		const v = setting?.verifyConfig;
		const pick = (key, def) => {
			if (v && typeof v === 'object' && v[key] !== undefined && v[key] !== null) return v[key];
			if (setting && setting[key] !== undefined && setting[key] !== null) return setting[key];
			return def;
		};
		return {
			addEmailVerify: pick('addEmailVerify', 1),
			registerVerify: pick('registerVerify', 1),
			regVerifyCount: pick('regVerifyCount', 1),
			addVerifyCount: pick('addVerifyCount', 1)
		};
	},

	// Webhook 配置读值（webhook_config 打包后）：新格式是 setting.webhookConfig 对象里的字段；
	// 旧缓存里是平铺字段，两边都兜底；都没有时按默认（开关默认 1=关，重试默认 0）。
	webhookConfig(setting) {
		const w = setting?.webhookConfig;
		const pick = (key, def) => {
			if (w && typeof w === 'object' && w[key] !== undefined && w[key] !== null) return w[key];
			if (setting && setting[key] !== undefined && setting[key] !== null) return setting[key];
			return def;
		};
		return {
			webhookUrl: pick('webhookUrl', ''),
			webhookStatus: pick('webhookStatus', 1),
			webhookRetry: pick('webhookRetry', 0),
			webhookSecret: pick('webhookSecret', '')
		};
	},

	// 黑名单配置读值（blacklist_config 打包后）：新格式是 setting.blacklistConfig 对象里的字段；
	// 旧缓存里是平铺字段，两边都兜底；都没有时按默认（3 项都为空字符串）。
	blacklistConfig(setting) {
		const b = setting?.blacklistConfig;
		const pick = (key, def) => {
			if (b && typeof b === 'object' && b[key] !== undefined && b[key] !== null) return b[key];
			if (setting && setting[key] !== undefined && setting[key] !== null) return setting[key];
			return def;
		};
		return {
			blackSubject: pick('blackSubject', ''),
			blackContent: pick('blackContent', ''),
			blackFrom: pick('blackFrom', '')
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

		// 附件密钥脱敏：新格式在 attStorage 对象里，旧缓存是平铺字段，两边都脱敏
		const _as = settingRow.attStorage || {};
		for (const k of ['s3AccessKey', 's3SecretKey', 'r2AccessKey', 'r2SecretKey', 'webdavUsername', 'webdavPassword']) {
			if (_as[k]) _as[k] = `${String(_as[k]).slice(0, 12)}******`;
			if (settingRow[k]) settingRow[k] = `${String(settingRow[k]).slice(0, 12)}******`;
		}
		// 备份密钥脱敏：新格式在 backupConfig 对象里，旧缓存是平铺字段，两边都脱敏
		const _bc = settingRow.backupConfig || {};
		for (const k of ['backupR2AccessKey', 'backupR2SecretKey', 'backupWebdavUsername', 'backupWebdavPassword', 'backupS3AccessKey', 'backupS3SecretKey']) {
			if (_bc[k]) _bc[k] = `${String(_bc[k]).slice(0, 12)}******`;
			if (settingRow[k]) settingRow[k] = `${String(settingRow[k]).slice(0, 12)}******`;
		}
		// TG 机器人 Token 脱敏：新格式在 tgConfig 对象里，旧缓存是平铺字段，两边都脱敏
		if (settingRow.tgConfig?.tgBotToken) settingRow.tgConfig.tgBotToken = `${String(settingRow.tgConfig.tgBotToken).slice(0, 20)}******`;
		if (settingRow.tgBotToken) settingRow.tgBotToken = `${String(settingRow.tgBotToken).slice(0, 20)}******`;
		settingRow.hasR2 = !!c.env.r2
		settingRow.hasCfEmail = !!c.env.email

		let regVerifyOpen = false
		let addVerifyOpen = false

		recordList.forEach(row => {
			if (row.type === verifyRecordType.REG) {
				regVerifyOpen = row.count >= this.verifyConfig(settingRow).regVerifyCount
			}
			if (row.type === verifyRecordType.ADD) {
				addVerifyOpen = row.count >= this.verifyConfig(settingRow).addVerifyCount
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

		// Webhook 地址进了 webhookConfig 对象，域名规范化随之挪到对象里的字段上
		if (params.webhookConfig?.webhookUrl !== undefined) {
			params.webhookConfig.webhookUrl = domainUtils.toOssDomain(params.webhookConfig.webhookUrl) || '';
		}

		let notifyFlags = { ...(settingData.notifyFlags || {}) };
		if (params.notifyFlags && typeof params.notifyFlags === 'object') {
			notifyFlags = { ...notifyFlags, ...params.notifyFlags };
		}
		let globalForward = { ...(settingData.globalForward || {}) };
		if (params.globalForward && typeof params.globalForward === 'object') {
			globalForward = { ...globalForward, ...params.globalForward };
		}
		let backupConfig = { ...(settingData.backupConfig || {}) };
		if (params.backupConfig && typeof params.backupConfig === 'object') {
			for (const [k, v] of Object.entries(params.backupConfig)) {
				// 带 ****** 的是前端回显的脱敏值，不是真实密钥，跳过不覆盖
				if (typeof v === 'string' && v.includes('******')) continue;
				backupConfig[k] = v;
			}
		}
		let attStorage = { ...(settingData.attStorage || {}) };
		if (params.attStorage && typeof params.attStorage === 'object') {
			for (const [k, v] of Object.entries(params.attStorage)) {
				// 带 ****** 的是前端回显的脱敏值，不是真实密钥，跳过不覆盖
				if (typeof v === 'string' && v.includes('******')) continue;
				attStorage[k] = v;
			}
		}
		let oauthConfig = { ...(settingData.oauthConfig || {}) };
		if (params.oauthConfig && typeof params.oauthConfig === 'object') {
			for (const [k, v] of Object.entries(params.oauthConfig)) {
				// 带 ****** 的是前端回显的脱敏值，不是真实密钥，跳过不覆盖
				if (typeof v === 'string' && v.includes('******')) continue;
				oauthConfig[k] = v;
			}
		}
		let noticeConfig = { ...(settingData.noticeConfig || {}) };
		if (params.noticeConfig && typeof params.noticeConfig === 'object') {
			for (const [k, v] of Object.entries(params.noticeConfig)) {
				// 带 ****** 的是前端回显的脱敏值，不是真实密钥，跳过不覆盖
				if (typeof v === 'string' && v.includes('******')) continue;
				noticeConfig[k] = v;
			}
		}
		let tgConfig = { ...(settingData.tgConfig || {}) };
		if (params.tgConfig && typeof params.tgConfig === 'object') {
			for (const [k, v] of Object.entries(params.tgConfig)) {
				// 带 ****** 的是前端回显的脱敏值，不是真实密钥，跳过不覆盖
				if (typeof v === 'string' && v.includes('******')) continue;
				tgConfig[k] = v;
			}
		}
		let verifyConfig = { ...(settingData.verifyConfig || {}) };
		if (params.verifyConfig && typeof params.verifyConfig === 'object') {
			for (const [k, v] of Object.entries(params.verifyConfig)) {
				// 带 ****** 的是前端回显的脱敏值，不是真实密钥，跳过不覆盖
				if (typeof v === 'string' && v.includes('******')) continue;
				verifyConfig[k] = v;
			}
		}
		let webhookConfig = { ...(settingData.webhookConfig || {}) };
		if (params.webhookConfig && typeof params.webhookConfig === 'object') {
			for (const [k, v] of Object.entries(params.webhookConfig)) {
				// 带 ****** 的是前端回显的脱敏值，不是真实密钥，跳过不覆盖
				if (typeof v === 'string' && v.includes('******')) continue;
				webhookConfig[k] = v;
			}
		}
		let blacklistConfig = { ...(settingData.blacklistConfig || {}) };
		if (params.blacklistConfig && typeof params.blacklistConfig === 'object') {
			for (const [k, v] of Object.entries(params.blacklistConfig)) {
				// 带 ****** 的是前端回显的脱敏值，不是真实密钥，跳过不覆盖
				if (typeof v === 'string' && v.includes('******')) continue;
				blacklistConfig[k] = v;
			}
		}

		params.resendTokens = JSON.stringify(resendTokens);
		params.sendkitTokens = JSON.stringify(sendkitTokens);
		params.brevoTokens = JSON.stringify(brevoTokens);
		params.notifyFlags = JSON.stringify(notifyFlags);
		params.globalForward = JSON.stringify(globalForward);
		params.backupConfig = JSON.stringify(backupConfig);
		params.attStorage = JSON.stringify(attStorage);
		params.oauthConfig = JSON.stringify(oauthConfig);
		params.noticeConfig = JSON.stringify(noticeConfig);
		params.tgConfig = JSON.stringify(tgConfig);
		params.verifyConfig = JSON.stringify(verifyConfig);
		params.webhookConfig = JSON.stringify(webhookConfig);
		params.blacklistConfig = JSON.stringify(blacklistConfig);

		// 旧版平铺列已打包进 JSON 列，旧客户端可能还带这些字段，删掉避免写不存在的列
		delete params.notifyStatus;
		delete params.adminDelNotify;
		delete params.forwardFailNotify;
		delete params.backupFailNotify;
		delete params.forwardEmail;
		delete params.forwardStatus;
		delete params.ruleEmail;
		delete params.ruleType;
		delete params.autoBackup;
		delete params.backupType;
		delete params.backupBucket;
		delete params.backupRegion;
		delete params.backupEndpoint;
		delete params.backupS3AccessKey;
		delete params.backupS3SecretKey;
		delete params.backupForcePathStyle;
		delete params.backupR2AccountId;
		delete params.backupR2Bucket;
		delete params.backupR2AccessKey;
		delete params.backupR2SecretKey;
		delete params.backupWebdavUrl;
		delete params.backupWebdavUsername;
		delete params.backupWebdavPassword;
		delete params.bucket;
		delete params.region;
		delete params.endpoint;
		delete params.s3AccessKey;
		delete params.s3SecretKey;
		delete params.forcePathStyle;
		delete params.attStorageType;
		delete params.r2AccountId;
		delete params.r2Bucket;
		delete params.r2AccessKey;
		delete params.r2SecretKey;
		delete params.webdavUrl;
		delete params.webdavUsername;
		delete params.webdavPassword;
		delete params.linuxdoClientId;
		delete params.linuxdoClientSecret;
		delete params.linuxdoSwitch;
		delete params.githubClientId;
		delete params.githubClientSecret;
		delete params.githubSwitch;
		delete params.googleClientId;
		delete params.googleClientSecret;
		delete params.googleSwitch;
		delete params.noticeTitle;
		delete params.noticeContent;
		delete params.noticeType;
		delete params.noticeDuration;
		delete params.noticePosition;
		delete params.noticeOffset;
		delete params.noticeWidth;
		delete params.notice;
		delete params.tgBotToken;
		delete params.tgChatId;
		delete params.tgBotStatus;
		delete params.customDomain;
		delete params.tgMsgFrom;
		delete params.tgMsgTo;
		delete params.tgMsgText;
		delete params.addEmailVerify;
		delete params.registerVerify;
		delete params.regVerifyCount;
		delete params.addVerifyCount;
		delete params.webhookUrl;
		delete params.webhookStatus;
		delete params.webhookRetry;
		delete params.webhookSecret;
		delete params.blackSubject;
		delete params.blackContent;
		delete params.blackFrom;

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
		// 入参仍是 3 个平铺字段（前端黑名单弹窗的约定不变），内部合并进 blacklistConfig JSON 列再写库
		const { blackSubject, blackContent, blackFrom } = params
		const merged = { ...this.blacklistConfig(await this.query(c)) };
		if (blackSubject !== undefined) merged.blackSubject = blackSubject;
		if (blackContent !== undefined) merged.blackContent = blackContent;
		if (blackFrom !== undefined) merged.blackFrom = blackFrom;
		await orm(c).update(setting).set({ blacklistConfig: JSON.stringify(merged) }).run();
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
			addEmailVerify: this.verifyConfig(settingRow).addEmailVerify,
			registerVerify: this.verifyConfig(settingRow).registerVerify,
			send: settingRow.send,
			r2Domain: settingRow.r2Domain,
			siteKey: settingRow.siteKey,
			background: settingRow.background,
			loginOpacity: settingRow.loginOpacity,
			domainList: settingRow.loginDomain === 1 && !token ? [] : settingRow.domainList,
			regKey: settingRow.regKey,
			regVerifyOpen: settingRow.regVerifyOpen,
			addVerifyOpen: settingRow.addVerifyOpen,
			noticeTitle: this.noticeConfig(settingRow).noticeTitle,
			noticeContent: this.noticeConfig(settingRow).noticeContent,
			noticeType: this.noticeConfig(settingRow).noticeType,
			noticeDuration: this.noticeConfig(settingRow).noticeDuration,
			noticePosition: this.noticeConfig(settingRow).noticePosition,
			noticeWidth: this.noticeConfig(settingRow).noticeWidth,
			noticeOffset: this.noticeConfig(settingRow).noticeOffset,
			notice: this.noticeConfig(settingRow).notice,
			loginDomain: settingRow.loginDomain,
			linuxdoClientId: this.oauthConfig(settingRow).linuxdoClientId,
			linuxdoSwitch: this.oauthConfig(settingRow).linuxdoSwitch,
			githubClientId: this.oauthConfig(settingRow).githubClientId,
			githubSwitch: this.oauthConfig(settingRow).githubSwitch,
			googleClientId: this.oauthConfig(settingRow).googleClientId,
			googleSwitch: this.oauthConfig(settingRow).googleSwitch,
			minEmailPrefix: settingRow.minEmailPrefix,
			projectLink: settingRow.projectLink,
			adminDelNotify: this.notifyFlag(settingRow, 'adminDelNotify'),
			autoBackup: this.backupConfig(settingRow).autoBackup
		};
	},

};

export default settingService;
