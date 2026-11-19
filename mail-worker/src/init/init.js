import settingService from '../service/setting-service';
import userService from '../service/user-service';

const dbInit = {
	async init(c) {

		const secret = c.req.param('secret');

		if (secret !== c.env.jwt_secret) {
			return c.text('❌ JWT secret mismatch');
		}

		await this.intDB(c);
		await userService.initAdmin(c);
		await settingService.refresh(c);
		return c.text('success');
	},

	async intDB(c) {
		// 初始化数据库表结构：建表语句就是最终形态（2026-11-19 重构）。
		// 历史迁移（v1_1–v3_30）已全部折进下面的 CREATE TABLE / CREATE INDEX / 种子数据：
		// 新装一次建表即得最终结构，不再逐条跑几十个 ALTER。已初始化过的库不受影响
		//（CREATE TABLE IF NOT EXISTS 与种子守卫都是 no-op）。
		// 注意：旧库升级不再走这里补迁移——生产库已是最终结构；从旧版本升级请先跑旧版 init 再升级。

		await c.env.db.prepare(`
		  CREATE TABLE IF NOT EXISTS email (
			email_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
			send_email TEXT,
			name TEXT,
			account_id INTEGER NOT NULL,
			user_id INTEGER NOT NULL,
			subject TEXT,
			content TEXT,
			text TEXT,
			create_time DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
			is_del INTEGER DEFAULT 0 NOT NULL
		  , status INTEGER NOT NULL DEFAULT 0, type INTEGER NOT NULL DEFAULT 0, resend_email_id TEXT, message TEXT, message_id TEXT NOT NULL DEFAULT '', relation TEXT NOT NULL DEFAULT '', in_reply_to TEXT NOT NULL DEFAULT '', bcc TEXT NOT NULL DEFAULT '[]', cc TEXT NOT NULL DEFAULT '[]', recipient TEXT NOT NULL DEFAULT '[]', to_email TEXT NOT NULL DEFAULT '', to_name TEXT NOT NULL DEFAULT '', unread INTEGER NOT NULL DEFAULT 0, code TEXT NOT NULL DEFAULT '', sender_email TEXT NOT NULL DEFAULT '')
		`).run();
		await c.env.db.prepare(`
		  CREATE TABLE IF NOT EXISTS star (
			star_id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			email_id INTEGER NOT NULL,
			create_time DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
		  )
		`).run();
		await c.env.db.prepare(`
		  CREATE TABLE IF NOT EXISTS attachments (
			att_id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			email_id INTEGER NOT NULL,
			account_id INTEGER NOT NULL,
			key TEXT NOT NULL,
			filename TEXT,
			mime_type TEXT,
			size INTEGER,
			disposition TEXT,
			related TEXT,
			content_id TEXT,
			encoding TEXT,
			create_time DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
		  , status INTEGER NOT NULL DEFAULT 0, type INTEGER NOT NULL DEFAULT 0, is_star INTEGER NOT NULL DEFAULT 0)
		`).run();
		await c.env.db.prepare(`
		  CREATE TABLE IF NOT EXISTS user (
			user_id INTEGER PRIMARY KEY AUTOINCREMENT,
			email TEXT NOT NULL,
			type INTEGER DEFAULT 1 NOT NULL,
			password TEXT NOT NULL,
			salt TEXT NOT NULL,
			status INTEGER DEFAULT 0 NOT NULL,
			create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
			active_time DATETIME,
			is_del INTEGER DEFAULT 0 NOT NULL
		  , send_count INTEGER NOT NULL DEFAULT 0, sort INTEGER NOT NULL DEFAULT 0, os TEXT, device TEXT, create_ip TEXT, active_ip TEXT, browser TEXT, reg_key_id INTEGER NOT NULL DEFAULT 0)
		`).run();
		await c.env.db.prepare(`
		  CREATE TABLE IF NOT EXISTS account (
			account_id INTEGER PRIMARY KEY AUTOINCREMENT,
			email TEXT NOT NULL,
			status INTEGER DEFAULT 0 NOT NULL,
			latest_email_time DATETIME,
			create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
			user_id INTEGER NOT NULL,
			is_del INTEGER DEFAULT 0 NOT NULL
		  , name TEXT NOT NULL DEFAULT '', all_receive INTEGER NOT NULL DEFAULT 0, sort INTEGER NOT NULL DEFAULT 0, forward_email TEXT NOT NULL DEFAULT '', forward_status INTEGER NOT NULL DEFAULT 1, forward_rule_from TEXT NOT NULL DEFAULT '', forward_rule_subject TEXT NOT NULL DEFAULT '')
		`).run();
		await c.env.db.prepare(`
		  CREATE TABLE IF NOT EXISTS setting (
			register INTEGER NOT NULL,
			receive INTEGER NOT NULL,
			add_email INTEGER NOT NULL,
			many_email INTEGER NOT NULL,
			title TEXT NOT NULL,
			auto_refresh INTEGER NOT NULL,
			r2_domain TEXT, login_opacity INTEGER NOT NULL DEFAULT 0.90, site_key TEXT, send INTEGER NOT NULL DEFAULT 0, resend_tokens TEXT NOT NULL DEFAULT '{}', secret_key TEXT, background TEXT, reg_key INTEGER NOT NULL DEFAULT 1, no_recipient INTEGER NOT NULL DEFAULT 1, login_domain INTEGER NOT NULL DEFAULT 0, sync_delete INTEGER NOT NULL DEFAULT 0, sendkit_tokens TEXT NOT NULL DEFAULT '{}', brevo_tokens TEXT NOT NULL DEFAULT '{}', att_encrypt INTEGER NOT NULL DEFAULT 1, notify_email TEXT NOT NULL DEFAULT '', notify_flags TEXT NOT NULL DEFAULT '{}', global_forward TEXT NOT NULL DEFAULT '{}', backup_config TEXT NOT NULL DEFAULT '{}', att_storage TEXT NOT NULL DEFAULT '{}', oauth_config TEXT NOT NULL DEFAULT '{}', notice_config TEXT NOT NULL DEFAULT '{}', tg_config TEXT NOT NULL DEFAULT '{}', verify_config TEXT NOT NULL DEFAULT '{}', webhook_config TEXT NOT NULL DEFAULT '{}', blacklist_config TEXT NOT NULL DEFAULT '{}', auto_clean_config TEXT NOT NULL DEFAULT '{}', ai_code_config TEXT NOT NULL DEFAULT '{}', email_prefix_config TEXT NOT NULL DEFAULT '{}', login_verify_config TEXT NOT NULL DEFAULT '{}')
		`).run();
		await c.env.db.prepare(`
		  CREATE TABLE IF NOT EXISTS perm (
        perm_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        perm_key TEXT,
        pid INTEGER NOT NULL DEFAULT 0,
        type INTEGER NOT NULL DEFAULT 2,
        sort INTEGER
      )
		`).run();
		await c.env.db.prepare(`
		  CREATE TABLE IF NOT EXISTS role (
        role_id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        key TEXT,
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        sort INTEGER DEFAULT 0,
        description TEXT,
        user_id INTEGER,
        is_default INTEGER DEFAULT 0,
        send_count INTEGER,
        send_type TEXT NOT NULL DEFAULT 'count',
        account_count INTEGER
      , ban_email TEXT NOT NULL DEFAULT '', ban_email_type INTEGER NOT NULL DEFAULT 0, avail_domain TEXT NOT NULL DEFAULT '')
		`).run();
		await c.env.db.prepare(`
		  CREATE TABLE IF NOT EXISTS role_perm (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role_id INTEGER,
        perm_id INTEGER
      )
		`).run();
		await c.env.db.prepare(`
		  CREATE TABLE IF NOT EXISTS reg_key (
				rege_key_id INTEGER PRIMARY KEY AUTOINCREMENT,
				code TEXT NOT NULL COLLATE NOCASE DEFAULT '',
				count INTEGER NOT NULL DEFAULT 0,
				role_id INTEGER NOT NULL DEFAULT 0,
				user_id INTEGER NOT NULL DEFAULT 0,
				expire_time DATETIME,
				create_time DATETIME DEFAULT CURRENT_TIMESTAMP
      )
		`).run();
		await c.env.db.prepare(`
		  CREATE TABLE IF NOT EXISTS verify_record (
				vr_id INTEGER PRIMARY KEY AUTOINCREMENT,
				ip TEXT NOT NULL DEFAULT '',
				count INTEGER NOT NULL DEFAULT 1,
				type INTEGER NOT NULL DEFAULT 0,
				update_time DATETIME DEFAULT CURRENT_TIMESTAMP
      )
		`).run();
		await c.env.db.prepare(`
		  CREATE TABLE IF NOT EXISTS oauth (
					oauth_id INTEGER PRIMARY KEY AUTOINCREMENT,
					oauth_user_id TEXT,
					username TEXT,
					name TEXT,
					avatar TEXT,
					active INTEGER,
					trust_level INTEGER,
					silenced INTEGER,
					create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
					platform INTEGER NOT NULL DEFAULT 0,
					user_id INTEGER NOT NULL DEFAULT 0
				)
		`).run();
		await c.env.db.prepare(`
		  CREATE TABLE IF NOT EXISTS audit_log (
        log_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        user_email TEXT NOT NULL DEFAULT '',
        action TEXT NOT NULL,
        target_type TEXT NOT NULL DEFAULT '',
        target_desc TEXT NOT NULL DEFAULT '',
        detail TEXT NOT NULL DEFAULT '',
        create_time INTEGER NOT NULL
    )
		`).run();

		// 索引
		await c.env.db.prepare(`
		  CREATE UNIQUE INDEX IF NOT EXISTS idx_account_email_nocase ON account (email COLLATE NOCASE)
		`).run();
		await c.env.db.prepare(`
		  CREATE INDEX IF NOT EXISTS idx_account_user_del_sort ON account(user_id, is_del, sort, account_id)
		`).run();
		await c.env.db.prepare(`
		  CREATE INDEX IF NOT EXISTS idx_attachments_email_type ON attachments(email_id, type)
		`).run();
		await c.env.db.prepare(`
		  CREATE INDEX IF NOT EXISTS idx_email_create_time ON email(create_time)
		`).run();
		await c.env.db.prepare(`
		  CREATE INDEX IF NOT EXISTS idx_email_list_account ON email(user_id, account_id, type, is_del, email_id)
		`).run();
		await c.env.db.prepare(`
		  CREATE INDEX IF NOT EXISTS idx_email_list_user ON email(user_id, type, is_del, email_id)
		`).run();
		await c.env.db.prepare(`
		  CREATE INDEX IF NOT EXISTS idx_email_name_nocase ON email(name COLLATE NOCASE)
		`).run();
		await c.env.db.prepare(`
		  CREATE INDEX IF NOT EXISTS idx_email_noone_id ON email(email_id) WHERE status = 7
		`).run();
		await c.env.db.prepare(`
		  CREATE INDEX IF NOT EXISTS idx_email_saving_account ON email(account_id) WHERE status = 6
		`).run();
		await c.env.db.prepare(`
		  CREATE INDEX IF NOT EXISTS idx_email_send_email_nocase ON email(send_email COLLATE NOCASE)
		`).run();
		await c.env.db.prepare(`
		  CREATE INDEX IF NOT EXISTS idx_email_subject_nocase ON email(subject COLLATE NOCASE)
		`).run();
		await c.env.db.prepare(`
		  CREATE INDEX IF NOT EXISTS idx_email_to_email_nocase ON email(to_email COLLATE NOCASE)
		`).run();
		await c.env.db.prepare(`
		  CREATE INDEX IF NOT EXISTS idx_email_type_create_time ON email(type, create_time)
		`).run();
		await c.env.db.prepare(`
		  CREATE INDEX IF NOT EXISTS idx_email_type_id ON email(type, email_id)
		`).run();
		await c.env.db.prepare(`
		  CREATE INDEX IF NOT EXISTS idx_email_type_name ON email(type, name)
		`).run();
		await c.env.db.prepare(`
		  CREATE INDEX IF NOT EXISTS idx_email_user_create_time ON email(user_id, create_time)
		`).run();
		await c.env.db.prepare(`
		  CREATE INDEX IF NOT EXISTS idx_email_user_id_account_id ON email(user_id, account_id)
		`).run();
		await c.env.db.prepare(`
		  CREATE INDEX IF NOT EXISTS idx_oauth_oauth_user_id ON oauth(oauth_user_id)
		`).run();
		await c.env.db.prepare(`
		  CREATE INDEX IF NOT EXISTS idx_oauth_user_id ON oauth(user_id)
		`).run();
		await c.env.db.prepare(`
		  CREATE INDEX IF NOT EXISTS idx_role_perm_role ON role_perm(role_id)
		`).run();
		await c.env.db.prepare(`
		  CREATE UNIQUE INDEX IF NOT EXISTS idx_setting_code ON reg_key(code COLLATE NOCASE)
		`).run();
		await c.env.db.prepare(`
		  CREATE INDEX IF NOT EXISTS idx_star_email_user ON star(email_id, user_id)
		`).run();
		await c.env.db.prepare(`
		  CREATE INDEX IF NOT EXISTS idx_star_user_email ON star(user_id, email_id)
		`).run();
		await c.env.db.prepare(`
		  CREATE INDEX IF NOT EXISTS idx_user_create_time ON user(create_time)
		`).run();
		await c.env.db.prepare(`
		  CREATE UNIQUE INDEX IF NOT EXISTS idx_user_email_nocase ON user (email COLLATE NOCASE)
		`).run();
		await c.env.db.prepare(`
		  CREATE INDEX IF NOT EXISTS idx_user_type ON user(type)
		`).run();

		// setting 种子行（仅当 setting 为空时插入；JSON 配置列直接写满默认值）
		try {
			await c.env.db.prepare(`
			  INSERT INTO setting (
				register, receive, add_email, many_email, title, auto_refresh, resend_tokens, send, r2_domain, site_key, secret_key, background, login_opacity, reg_key, no_recipient, login_domain, sync_delete, sendkit_tokens, brevo_tokens, att_encrypt, notify_email, notify_flags, global_forward, backup_config, att_storage, oauth_config, notice_config, tg_config, verify_config, webhook_config, blacklist_config, auto_clean_config, ai_code_config, email_prefix_config, login_verify_config
			  )
			  SELECT 0, 0, 0, 0, 'Cloud Mail', 2, '{}', 0, NULL, NULL, NULL, NULL, 0.9, 1, 1, 0, 0, '{}', '{}', 1, '', '{"notifyStatus":0,"adminDelNotify":1,"forwardFailNotify":1,"backupFailNotify":1}', '{"forwardEmail":"","forwardStatus":1,"ruleEmail":"","ruleType":0}', '{"autoBackup":1,"backupType":"s3","backupBucket":"","backupRegion":"","backupEndpoint":"","backupS3AccessKey":"","backupS3SecretKey":"","backupForcePathStyle":1,"backupR2AccountId":"","backupR2Bucket":"","backupR2AccessKey":"","backupR2SecretKey":"","backupWebdavUrl":"","backupWebdavUsername":"","backupWebdavPassword":""}', '{"bucket":"","region":"","endpoint":"","s3AccessKey":"","s3SecretKey":"","forcePathStyle":1,"attStorageType":"s3","r2AccountId":"","r2Bucket":"","r2AccessKey":"","r2SecretKey":"","webdavUrl":"","webdavUsername":"","webdavPassword":""}', '{"linuxdoClientId":"","linuxdoClientSecret":"","linuxdoSwitch":1,"githubClientId":"","githubClientSecret":"","githubSwitch":1,"googleClientId":"","googleClientSecret":"","googleSwitch":1}', '{"noticeTitle":"Cloud Mail","noticeContent":"本项目仅供学习交流，禁止用于违法业务\\n<br>\\n请遵守当地法规，作者不承担任何法律责任","noticeType":"none","noticeDuration":0,"noticePosition":"top-right","noticeOffset":0,"noticeWidth":340,"notice":0}', '{"tgBotToken":"","tgChatId":"","tgBotStatus":1,"customDomain":"","tgMsgFrom":"only-name","tgMsgTo":"show","tgMsgText":"show"}', '{"addEmailVerify":1,"registerVerify":1,"regVerifyCount":1,"addVerifyCount":1}', '{"webhookUrl":"","webhookStatus":1,"webhookRetry":0,"webhookSecret":""}', '{"blackSubject":"","blackContent":"","blackFrom":""}', '{"autoCleanDays":0,"autoCleanExclude":"","auditCleanDays":0}', '{"aiCode":1,"aiCodeFilter":""}', '{"minEmailPrefix":1,"emailPrefixFilter":""}', '{"loginVerify":1,"loginVerifyCount":1}'
			  WHERE NOT EXISTS (SELECT 1 FROM setting)
			`).run();
		} catch (e) {
			console.warn(e)
		}

		// perm 种子（36 条；12 用户收藏与 setting:clean 已在历史迁移中删除，不再种子）
		const {permTotal} = await c.env.db.prepare(`SELECT COUNT(*) as permTotal FROM perm`).first();
		if (permTotal === 0) {
			await c.env.db.prepare(`
			  INSERT INTO perm (perm_id, name, perm_key, pid, type, sort) VALUES
			(1, '邮件', NULL, 0, 0, 0),
			(2, '邮件删除', 'email:delete', 1, 2, 1),
			(3, '邮件发送', 'email:send', 1, 2, 0),
			(4, '个人设置', '', 0, 1, 2),
			(5, '用户注销', 'my:delete', 4, 2, 0),
			(6, '用户信息', NULL, 0, 1, 3),
			(7, '用户查看', 'user:query', 6, 2, 0),
			(8, '密码修改', 'user:set-pwd', 6, 2, 2),
			(9, '状态修改', 'user:set-status', 6, 2, 3),
			(10, '权限修改', 'user:set-type', 6, 2, 4),
			(11, '用户删除', 'user:delete', 6, 2, 7),
			(13, '权限控制', '', 0, 1, 5),
			(14, '身份查看', 'role:query', 13, 2, 0),
			(15, '身份修改', 'role:set', 13, 2, 1),
			(16, '身份删除', 'role:delete', 13, 2, 2),
			(17, '系统设置', '', 0, 1, 6),
			(18, '设置查看', 'setting:query', 17, 2, 0),
			(19, '设置修改', 'setting:set', 17, 2, 1),
			(21, '邮箱侧栏', '', 0, 0, 1),
			(22, '邮箱查看', 'account:query', 21, 2, 0),
			(23, '邮箱添加', 'account:add', 21, 2, 1),
			(24, '邮箱删除', 'account:delete', 21, 2, 2),
			(25, '用户添加', 'user:add', 6, 2, 1),
			(26, '发件重置', 'user:reset-send', 6, 2, 6),
			(27, '邮件列表', '', 0, 1, 4),
			(28, '邮件查看', 'all-email:query', 27, 2, 0),
			(29, '邮件删除', 'all-email:delete', 27, 2, 0),
			(30, '身份添加', 'role:add', 13, 2, -1),
			(31, '分析页', NULL, 0, 1, 2.1),
			(32, '数据查看', 'analysis:query', 31, 2, 1),
			(33, '注册密钥', NULL, 0, 1, 5.1),
			(34, '密钥查看', 'reg-key:query', 33, 2, 0),
			(35, '密钥添加', 'reg-key:add', 33, 2, 1),
			(36, '密钥删除', 'reg-key:delete', 33, 2, 2),
			(37, '操作记录', NULL, 0, 1, 7),
			(38, '记录查看', 'audit:query', 37, 2, 0)
			`).run();
		}

		// role 种子（默认身份“普通用户”；Muse助手/系统通知等自定义身份由管理员在界面里建）
		const { roleCount } = await c.env.db.prepare(`SELECT COUNT(*) as roleCount FROM role`).first();
		if (roleCount === 0) {
			await c.env.db.prepare(`
			  INSERT INTO role (
			  role_id, name, key, create_time, sort, description, user_id, is_default, send_count, send_type, account_count, ban_email, ban_email_type, avail_domain
			) VALUES (
			  1, '普通用户', NULL, '0000-00-00 00:00:00', 0, '只有普通使用权限', 0, 1, NULL, 'ban', 10, '', 0, ''
			)
			`).run();
		}

		// role_perm 种子（普通用户的 9 个默认权限）
		const {rolePermCount} = await c.env.db.prepare(`SELECT COUNT(*) as rolePermCount FROM role_perm`).first();
		if (rolePermCount === 0) {
			await c.env.db.prepare(`
			  INSERT INTO role_perm (id, role_id, perm_id) VALUES
			(100, 1, 2),
			(101, 1, 21),
			(102, 1, 22),
			(103, 1, 23),
			(104, 1, 24),
			(105, 1, 4),
			(106, 1, 5),
			(107, 1, 1),
			(108, 1, 3)
			`).run();
		}
	},
};
export { dbInit };
