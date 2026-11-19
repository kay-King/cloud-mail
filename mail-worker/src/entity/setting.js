import { sqliteTable, text, integer} from 'drizzle-orm/sqlite-core';
export const setting = sqliteTable('setting', {
	register: integer('register').default(0).notNull(),
	receive: integer('receive').default(0).notNull(),
	title: text('title').default('').notNull(),
	manyEmail: integer('many_email').default(0).notNull(),
	addEmail: integer('add_email').default(0).notNull(),
	autoRefresh: integer('auto_refresh').default(0).notNull(),
	// 验证相关 4 项打包进一个 JSON 列，4 列变 1 列腾 3 个空位
	verifyConfig: text('verify_config').default('{}').notNull(),
	send: integer('send').default(1).notNull(),
	r2Domain: text('r2_domain'),
	secretKey: text('secret_key'),
	siteKey: text('site_key'),
	regKey: integer('reg_key').default(1).notNull(),
	background: text('background'),
	// TG 机器人 7 项打包进一个 JSON 列，7 列变 1 列腾 6 个空位（customDomain 是 TG 小程序网址，随 TG 一起打包）
	tgConfig: text('tg_config').default('{}').notNull(),
	// 全局转发 4 项打包进一个 JSON 列（forwardEmail/forwardStatus/ruleEmail/ruleType），4 列变 1 列腾 3 个空位；规则与 TG/Webhook 推送共用
	globalForward: text('global_forward').default('{}').notNull(),
	loginOpacity: integer('login_opacity').default(0.88),
	resendTokens: text('resend_tokens').default("{}").notNull(),
	sendkitTokens: text('sendkit_tokens').default("{}").notNull(),
	brevoTokens: text('brevo_tokens').default("{}").notNull(),
	// 系统公告 8 项打包进一个 JSON 列，8 列变 1 列腾 7 个空位
	noticeConfig: text('notice_config').default('{}').notNull(),
	noRecipient: integer('no_recipient').default(1).notNull(),
	loginDomain: integer('login_domain').default(0).notNull(),
	// 附件存储 14 项打包进一个 JSON 列，14 列变 1 列腾 13 个空位
	attStorage: text('att_storage').default('{}').notNull(),
	minEmailPrefix: integer('min_email_prefix').default(0).notNull(),
	emailPrefixFilter: text('email_prefix_filter').default('').notNull(),
	// 黑名单 3 项打包进一个 JSON 列，3 列变 1 列腾 2 个空位
	blacklistConfig: text('blacklist_config').default('{}').notNull(),
	aiCode: integer('ai_code').default(1).notNull(),
	syncDelete: integer('sync_delete').default(1).notNull(),
	aiCodeFilter: text('ai_code_filter').default('').notNull(),
	// 第三方登录 9 项打包进一个 JSON 列，9 列变 1 列腾 8 个空位（功能未配置但 oauth-service 代码活着，只能打包不能删）
	oauthConfig: text('oauth_config').default('{}').notNull(),
	autoCleanDays: integer('auto_clean_days').default(0).notNull(),
	autoCleanExclude: text('auto_clean_exclude').default('').notNull(),
	auditCleanDays: integer('audit_clean_days').default(0).notNull(),
	// Webhook 4 项打包进一个 JSON 列，4 列变 1 列腾 3 个空位
	webhookConfig: text('webhook_config').default('{}').notNull(),
	attEncrypt: integer('att_encrypt').default(1).notNull(),
	// 通知 4 开关打包进一个 JSON 列（notifyStatus/adminDelNotify/forwardFailNotify/backupFailNotify），4 列变 1 列腾 3 个空位
	notifyFlags: text('notify_flags').default('{}').notNull(),
	notifyEmail: text('notify_email').default('').notNull(),
	// 备份设置 15 项打包进一个 JSON 列，15 列变 1 列腾 14 个空位
	backupConfig: text('backup_config').default('{}').notNull()
});
export default setting
