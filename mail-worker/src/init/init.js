import settingService from '../service/setting-service';
import emailUtils from '../utils/email-utils';
import {emailConst} from "../const/entity-const";
import userService from '../service/user-service';

const dbInit = {
	async init(c) {

		const secret = c.req.param('secret');

		if (secret !== c.env.jwt_secret) {
			return c.text('❌ JWT secret mismatch');
		}

		await this.intDB(c);
		await this.v1_1DB(c);
		await this.v1_2DB(c);
		await this.v1_3DB(c);
		await this.v1_3_1DB(c);
		await this.v1_4DB(c);
		await this.v1_5DB(c);
		await this.v1_6DB(c);
		await this.v1_7DB(c);
		await this.v2DB(c);
		await this.v2_3DB(c);
		await this.v2_4DB(c);
		await this.v2_5DB(c);
		await this.v2_6DB(c);
		await this.v2_7DB(c);
		await this.v2_8DB(c);
		await this.v2_9DB(c);
		await this.v3_0DB(c);
		await this.v3_1DB(c);
		await this.v3_2DB(c);
		await this.v3_3DB(c);
		await this.v3_4DB(c);
		await this.v3_5DB(c);
		await this.v3_6DB(c);
		await this.v3_7DB(c);
		await this.v3_8DB(c);
		await this.v3_9DB(c);
		await this.v3_10DB(c);
		await this.v3_11DB(c);
		await this.v3_12DB(c);
		await this.v3_13DB(c);
		await this.v3_14DB(c);
		await this.v3_15DB(c);
		await this.v3_15_1DB(c);
		await this.v3_16DB(c);
		await this.v3_17DB(c);
		await this.v3_17_1DB(c);
		await this.v3_18DB(c);
		await this.v3_18_1DB(c);
		await this.v3_19DB(c);
		await this.v3_20DB(c);
		await this.v3_21DB(c);
		await this.v3_22DB(c);
		await this.v3_23DB(c);
		await this.v3_24DB(c);
		await this.v3_25DB(c);
		await this.v3_26DB(c);
		await this.v3_27DB(c);
		await this.v3_28DB(c);
		await this.v3_29DB(c);
		await this.v3_30DB(c);
		await userService.initAdmin(c);
		await settingService.refresh(c);
		return c.text('success');
	},

	async v3_15DB(c) {
		// D1 单表最多 100 列，setting 表已满：先删两个死列再加新列。
		// login_bg_css（自定义 CSS 功能已移除）、send_provider（原项目遗留，收信服务商下拉是纯前端状态），前后端均无引用。
		try {
			await c.env.db.prepare(`ALTER TABLE setting DROP COLUMN login_bg_css;`).run();
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}
		try {
			await c.env.db.prepare(`ALTER TABLE setting DROP COLUMN send_provider;`).run();
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}
		try {
			await c.env.db.batch([
				c.env.db.prepare(`ALTER TABLE setting ADD COLUMN forward_fail_notify INTEGER NOT NULL DEFAULT 1;`),
				c.env.db.prepare(`ALTER TABLE setting ADD COLUMN backup_fail_notify INTEGER NOT NULL DEFAULT 1;`)
			]);
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}
	},
	async v3_15_1DB(c) {
		// 补开发期直接 DDL 加的列（当时没写进迁移）：管理员删除通知开关（v3_16 打包要读）与
		// 垃圾邮件/附件星标/个人黑名单/侧边栏配置 4 个功能列。全部独立 try/catch，已有就是 no-op。
		for (const sql of [
			`ALTER TABLE setting ADD COLUMN admin_del_notify INTEGER NOT NULL DEFAULT 1;`,
			`ALTER TABLE email ADD COLUMN is_spam INTEGER NOT NULL DEFAULT 0;`,
			`ALTER TABLE attachments ADD COLUMN is_star INTEGER NOT NULL DEFAULT 0;`,
			`ALTER TABLE user ADD COLUMN spam_blocklist TEXT NOT NULL DEFAULT '{}';`,
			`ALTER TABLE user ADD COLUMN sidebar_config TEXT NOT NULL DEFAULT '{}';`
		]) {
			try {
				await c.env.db.prepare(sql).run();
			} catch (e) {
				console.warn(`跳过字段：${e.message}`);
			}
		}
	},


	async v3_16DB(c) {
		// 通知 4 开关打包进 notify_flags JSON 列（4 列变 1 列，腾 3 个空位；D1 单表最多 100 列）。
		// 顺序：先读出现有值 → 删 4 个旧列（表已满 100 列，必须先删后加）→ 加 notify_flags 列 → 把值写回去。
		// 各步独立 try/catch，重复跑也不怕：旧列读不到说明已迁过，直接跳过。
		let flags = null;
		try {
			const row = await c.env.db.prepare(`SELECT notify_status, admin_del_notify, forward_fail_notify, backup_fail_notify FROM setting`).first();
			if (row) {
				flags = {
					notifyStatus: row.notify_status ?? 0,
					adminDelNotify: row.admin_del_notify ?? 1,
					forwardFailNotify: row.forward_fail_notify ?? 1,
					backupFailNotify: row.backup_fail_notify ?? 1
				};
			}
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}
		for (const col of ['notify_status', 'admin_del_notify', 'forward_fail_notify', 'backup_fail_notify']) {
			try {
				await c.env.db.prepare(`ALTER TABLE setting DROP COLUMN ${col};`).run();
			} catch (e) {
				console.warn(`跳过字段：${e.message}`);
			}
		}
		try {
			await c.env.db.prepare(`ALTER TABLE setting ADD COLUMN notify_flags TEXT NOT NULL DEFAULT '{}';`).run();
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}
		if (flags) {
			try {
				await c.env.db.prepare(`UPDATE setting SET notify_flags = ?`).bind(JSON.stringify(flags)).run();
			} catch (e) {
				console.warn(`跳过字段：${e.message}`);
			}
		}
	},

	async v3_17DB(c) {
		// 全局转发 4 项打包进 global_forward JSON 列（4 列变 1 列，腾 3 个空位）。
		// 顺序：先读出现有值 → 删 4 个旧列 → 加 global_forward 列 → 把值写回去。各步独立 try/catch，重复跑也不怕。
		let config = null;
		try {
			const row = await c.env.db.prepare(`SELECT forward_email, forward_status, rule_email, rule_type FROM setting`).first();
			if (row) {
				config = {
					forwardEmail: row.forward_email ?? '',
					forwardStatus: row.forward_status ?? 1,
					ruleEmail: row.rule_email ?? '',
					ruleType: row.rule_type ?? 0
				};
			}
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}
		for (const col of ['forward_email', 'forward_status', 'rule_email', 'rule_type']) {
			try {
				await c.env.db.prepare(`ALTER TABLE setting DROP COLUMN ${col};`).run();
			} catch (e) {
				console.warn(`跳过字段：${e.message}`);
			}
		}
		try {
			await c.env.db.prepare(`ALTER TABLE setting ADD COLUMN global_forward TEXT NOT NULL DEFAULT '{}';`).run();
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}
		if (config) {
			try {
				await c.env.db.prepare(`UPDATE setting SET global_forward = ?`).bind(JSON.stringify(config)).run();
			} catch (e) {
				console.warn(`跳过字段：${e.message}`);
			}
		}
	},
	async v3_17_1DB(c) {
		// 补备份功能 15 个平铺列（开发期直接 DDL 加的，上游没有）：v3_18 打包要读它们。
		// 放在 v3_17 之后是为避开 D1 单表 100 列上限（v3_16/v3_17 打包已各腾 3 列）。
		for (const sql of [
			`ALTER TABLE setting ADD COLUMN auto_backup INTEGER NOT NULL DEFAULT 1;`,
			`ALTER TABLE setting ADD COLUMN backup_type TEXT NOT NULL DEFAULT 's3';`,
			`ALTER TABLE setting ADD COLUMN backup_bucket TEXT NOT NULL DEFAULT '';`,
			`ALTER TABLE setting ADD COLUMN backup_region TEXT NOT NULL DEFAULT '';`,
			`ALTER TABLE setting ADD COLUMN backup_endpoint TEXT NOT NULL DEFAULT '';`,
			`ALTER TABLE setting ADD COLUMN backup_s3_access_key TEXT NOT NULL DEFAULT '';`,
			`ALTER TABLE setting ADD COLUMN backup_s3_secret_key TEXT NOT NULL DEFAULT '';`,
			`ALTER TABLE setting ADD COLUMN backup_force_path_style INTEGER NOT NULL DEFAULT 1;`,
			`ALTER TABLE setting ADD COLUMN backup_r2_account_id TEXT NOT NULL DEFAULT '';`,
			`ALTER TABLE setting ADD COLUMN backup_r2_bucket TEXT NOT NULL DEFAULT '';`,
			`ALTER TABLE setting ADD COLUMN backup_r2_access_key TEXT NOT NULL DEFAULT '';`,
			`ALTER TABLE setting ADD COLUMN backup_r2_secret_key TEXT NOT NULL DEFAULT '';`,
			`ALTER TABLE setting ADD COLUMN backup_webdav_url TEXT NOT NULL DEFAULT '';`,
			`ALTER TABLE setting ADD COLUMN backup_webdav_username TEXT NOT NULL DEFAULT '';`,
			`ALTER TABLE setting ADD COLUMN backup_webdav_password TEXT NOT NULL DEFAULT '';`
		]) {
			try {
				await c.env.db.prepare(sql).run();
			} catch (e) {
				console.warn(`跳过字段：${e.message}`);
			}
		}
	},


	async v3_18DB(c) {
		// 备份设置 15 项打包进 backup_config JSON 列（15 列变 1 列，腾 14 个空位）。
		// 顺序：先读出现有值 → 删 15 个旧列 → 加 backup_config 列 → 把值写回去。各步独立 try/catch，重复跑也不怕。
		let config = null;
		try {
			const row = await c.env.db.prepare(`SELECT auto_backup, backup_type, backup_bucket, backup_region, backup_endpoint, backup_s3_access_key, backup_s3_secret_key, backup_force_path_style, backup_r2_account_id, backup_r2_bucket, backup_r2_access_key, backup_r2_secret_key, backup_webdav_url, backup_webdav_username, backup_webdav_password FROM setting`).first();
			if (row) {
				config = {
					autoBackup: row.auto_backup ?? 1,
					backupType: row.backup_type ?? 's3',
					backupBucket: row.backup_bucket ?? '',
					backupRegion: row.backup_region ?? '',
					backupEndpoint: row.backup_endpoint ?? '',
					backupS3AccessKey: row.backup_s3_access_key ?? '',
					backupS3SecretKey: row.backup_s3_secret_key ?? '',
					backupForcePathStyle: row.backup_force_path_style ?? 1,
					backupR2AccountId: row.backup_r2_account_id ?? '',
					backupR2Bucket: row.backup_r2_bucket ?? '',
					backupR2AccessKey: row.backup_r2_access_key ?? '',
					backupR2SecretKey: row.backup_r2_secret_key ?? '',
					backupWebdavUrl: row.backup_webdav_url ?? '',
					backupWebdavUsername: row.backup_webdav_username ?? '',
					backupWebdavPassword: row.backup_webdav_password ?? ''
				};
			}
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}
		for (const col of ['auto_backup', 'backup_type', 'backup_bucket', 'backup_region', 'backup_endpoint', 'backup_s3_access_key', 'backup_s3_secret_key', 'backup_force_path_style', 'backup_r2_account_id', 'backup_r2_bucket', 'backup_r2_access_key', 'backup_r2_secret_key', 'backup_webdav_url', 'backup_webdav_username', 'backup_webdav_password']) {
			try {
				await c.env.db.prepare(`ALTER TABLE setting DROP COLUMN ${col};`).run();
			} catch (e) {
				console.warn(`跳过字段：${e.message}`);
			}
		}
		try {
			await c.env.db.prepare(`ALTER TABLE setting ADD COLUMN backup_config TEXT NOT NULL DEFAULT '{}';`).run();
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}
		if (config) {
			try {
				await c.env.db.prepare(`UPDATE setting SET backup_config = ?`).bind(JSON.stringify(config)).run();
			} catch (e) {
				console.warn(`跳过字段：${e.message}`);
			}
		}
	},
	async v3_18_1DB(c) {
		// 补附件存储 8 个平铺列（开发期直接 DDL 加的，上游没有）：v3_19 打包要读它们。
		// 放在 v3_18 之后是为避开 D1 单表 100 列上限（v3_18 打包腾了 14 列）。
		for (const sql of [
			`ALTER TABLE setting ADD COLUMN att_storage_type TEXT NOT NULL DEFAULT 's3';`,
			`ALTER TABLE setting ADD COLUMN r2_account_id TEXT NOT NULL DEFAULT '';`,
			`ALTER TABLE setting ADD COLUMN r2_bucket TEXT NOT NULL DEFAULT '';`,
			`ALTER TABLE setting ADD COLUMN r2_access_key TEXT NOT NULL DEFAULT '';`,
			`ALTER TABLE setting ADD COLUMN r2_secret_key TEXT NOT NULL DEFAULT '';`,
			`ALTER TABLE setting ADD COLUMN webdav_url TEXT NOT NULL DEFAULT '';`,
			`ALTER TABLE setting ADD COLUMN webdav_username TEXT NOT NULL DEFAULT '';`,
			`ALTER TABLE setting ADD COLUMN webdav_password TEXT NOT NULL DEFAULT '';`
		]) {
			try {
				await c.env.db.prepare(sql).run();
			} catch (e) {
				console.warn(`跳过字段：${e.message}`);
			}
		}
	},


	async v3_19DB(c) {
		// 附件存储 14 项打包进 att_storage JSON 列（14 列变 1 列，腾 13 个空位；customDomain 是 TG 用的，归 TG 组）。
		// 顺序：先读出现有值 → 删 14 个旧列 → 加 att_storage 列 → 把值写回去。各步独立 try/catch，重复跑也不怕。
		let config = null;
		try {
			const row = await c.env.db.prepare(`SELECT bucket, region, endpoint, s3_access_key, s3_secret_key, force_path_style, att_storage_type, r2_account_id, r2_bucket, r2_access_key, r2_secret_key, webdav_url, webdav_username, webdav_password FROM setting`).first();
			if (row) {
				config = {
					bucket: row.bucket ?? '',
					region: row.region ?? '',
					endpoint: row.endpoint ?? '',
					s3AccessKey: row.s3_access_key ?? '',
					s3SecretKey: row.s3_secret_key ?? '',
					forcePathStyle: row.force_path_style ?? 1,
					attStorageType: row.att_storage_type ?? 's3',
					r2AccountId: row.r2_account_id ?? '',
					r2Bucket: row.r2_bucket ?? '',
					r2AccessKey: row.r2_access_key ?? '',
					r2SecretKey: row.r2_secret_key ?? '',
					webdavUrl: row.webdav_url ?? '',
					webdavUsername: row.webdav_username ?? '',
					webdavPassword: row.webdav_password ?? ''
				};
			}
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}
		for (const col of ['bucket', 'region', 'endpoint', 's3_access_key', 's3_secret_key', 'force_path_style', 'att_storage_type', 'r2_account_id', 'r2_bucket', 'r2_access_key', 'r2_secret_key', 'webdav_url', 'webdav_username', 'webdav_password']) {
			try {
				await c.env.db.prepare(`ALTER TABLE setting DROP COLUMN ${col};`).run();
			} catch (e) {
				console.warn(`跳过字段：${e.message}`);
			}
		}
		try {
			await c.env.db.prepare(`ALTER TABLE setting ADD COLUMN att_storage TEXT NOT NULL DEFAULT '{}';`).run();
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}
		if (config) {
			try {
				await c.env.db.prepare(`UPDATE setting SET att_storage = ?`).bind(JSON.stringify(config)).run();
			} catch (e) {
				console.warn(`跳过字段：${e.message}`);
			}
		}
	},

	async v3_20DB(c) {
		// 第三方登录 9 项打包进 oauth_config JSON 列（9 列变 1 列，腾 8 个空位）。
		// 顺序：先读出现有值 → 删 9 个旧列 → 加 oauth_config 列 → 把值写回去。各步独立 try/catch，重复跑也不怕。
		let config = null;
		try {
			const row = await c.env.db.prepare(`SELECT linuxdo_client_id, linuxdo_client_secret, linuxdo_switch, github_client_id, github_client_secret, github_switch, google_client_id, google_client_secret, google_switch FROM setting`).first();
			if (row) {
				config = {
					linuxdoClientId: row.linuxdo_client_id ?? '',
					linuxdoClientSecret: row.linuxdo_client_secret ?? '',
					linuxdoSwitch: row.linuxdo_switch ?? 1,
					githubClientId: row.github_client_id ?? '',
					githubClientSecret: row.github_client_secret ?? '',
					githubSwitch: row.github_switch ?? 1,
					googleClientId: row.google_client_id ?? '',
					googleClientSecret: row.google_client_secret ?? '',
					googleSwitch: row.google_switch ?? 1
				};
			}
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}
		for (const col of ['linuxdo_client_id', 'linuxdo_client_secret', 'linuxdo_switch', 'github_client_id', 'github_client_secret', 'github_switch', 'google_client_id', 'google_client_secret', 'google_switch']) {
			try {
				await c.env.db.prepare(`ALTER TABLE setting DROP COLUMN ${col};`).run();
			} catch (e) {
				console.warn(`跳过字段：${e.message}`);
			}
		}
		try {
			await c.env.db.prepare(`ALTER TABLE setting ADD COLUMN oauth_config TEXT NOT NULL DEFAULT '{}';`).run();
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}
		if (config) {
			try {
				await c.env.db.prepare(`UPDATE setting SET oauth_config = ?`).bind(JSON.stringify(config)).run();
			} catch (e) {
				console.warn(`跳过字段：${e.message}`);
			}
		}
	},

	async v3_21DB(c) {
		// 系统公告 8 项打包进 notice_config JSON 列（8 列变 1 列，腾 7 个空位）。
		// 顺序：先读出现有值 → 删 8 个旧列 → 加 notice_config 列 → 把值写回去。各步独立 try/catch，重复跑也不怕。
		let config = null;
		try {
			const row = await c.env.db.prepare(`SELECT notice_title, notice_content, notice_type, notice_duration, notice_position, notice_offset, notice_width, notice FROM setting`).first();
			if (row) {
				config = {
					noticeTitle: row.notice_title ?? '',
					noticeContent: row.notice_content ?? '',
					noticeType: row.notice_type ?? '',
					noticeDuration: row.notice_duration ?? 0,
					noticePosition: row.notice_position ?? '',
					noticeOffset: row.notice_offset ?? 0,
					noticeWidth: row.notice_width ?? 400,
					notice: row.notice ?? 0
				};
			}
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}
		for (const col of ['notice_title', 'notice_content', 'notice_type', 'notice_duration', 'notice_position', 'notice_offset', 'notice_width', 'notice']) {
			try {
				await c.env.db.prepare(`ALTER TABLE setting DROP COLUMN ${col};`).run();
			} catch (e) {
				console.warn(`跳过字段：${e.message}`);
			}
		}
		try {
			await c.env.db.prepare(`ALTER TABLE setting ADD COLUMN notice_config TEXT NOT NULL DEFAULT '{}';`).run();
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}
		if (config) {
			try {
				await c.env.db.prepare(`UPDATE setting SET notice_config = ?`).bind(JSON.stringify(config)).run();
			} catch (e) {
				console.warn(`跳过字段：${e.message}`);
			}
		}
	},

	async v3_22DB(c) {
		// TG 机器人 7 项打包进 tg_config JSON 列（7 列变 1 列，腾 6 个空位；customDomain 是 TG 小程序网址，随 TG 一起打包）。
		// 顺序：先读出现有值 → 删 7 个旧列 → 加 tg_config 列 → 把值写回去。各步独立 try/catch，重复跑也不怕。
		let config = null;
		try {
			const row = await c.env.db.prepare(`SELECT tg_bot_token, tg_chat_id, tg_bot_status, custom_domain, tg_msg_from, tg_msg_to, tg_msg_text FROM setting`).first();
			if (row) {
				config = {
					tgBotToken: row.tg_bot_token ?? '',
					tgChatId: row.tg_chat_id ?? '',
					tgBotStatus: row.tg_bot_status ?? 1,
					customDomain: row.custom_domain ?? '',
					tgMsgFrom: row.tg_msg_from ?? 'only-name',
					tgMsgTo: row.tg_msg_to ?? 'show',
					tgMsgText: row.tg_msg_text ?? 'hide'
				};
			}
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}
		for (const col of ['tg_bot_token', 'tg_chat_id', 'tg_bot_status', 'custom_domain', 'tg_msg_from', 'tg_msg_to', 'tg_msg_text']) {
			try {
				await c.env.db.prepare(`ALTER TABLE setting DROP COLUMN ${col};`).run();
			} catch (e) {
				console.warn(`跳过字段：${e.message}`);
			}
		}
		try {
			await c.env.db.prepare(`ALTER TABLE setting ADD COLUMN tg_config TEXT NOT NULL DEFAULT '{}';`).run();
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}
		if (config) {
			try {
				await c.env.db.prepare(`UPDATE setting SET tg_config = ?`).bind(JSON.stringify(config)).run();
			} catch (e) {
				console.warn(`跳过字段：${e.message}`);
			}
		}
	},

	async v3_23DB(c) {
		// 验证相关 4 项打包进 verify_config JSON 列（4 列变 1 列，腾 3 个空位）。
		// 顺序：先读出现有值 → 删 4 个旧列 → 加 verify_config 列 → 把值写回去。各步独立 try/catch，重复跑也不怕。
		let config = null;
		try {
			const row = await c.env.db.prepare(`SELECT add_email_verify, register_verify, reg_verify_count, add_verify_count FROM setting`).first();
			if (row) {
				config = {
					addEmailVerify: row.add_email_verify ?? 1,
					registerVerify: row.register_verify ?? 1,
					regVerifyCount: row.reg_verify_count ?? 1,
					addVerifyCount: row.add_verify_count ?? 1
				};
			}
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}
		for (const col of ['add_email_verify', 'register_verify', 'reg_verify_count', 'add_verify_count']) {
			try {
				await c.env.db.prepare(`ALTER TABLE setting DROP COLUMN ${col};`).run();
			} catch (e) {
				console.warn(`跳过字段：${e.message}`);
			}
		}
		try {
			await c.env.db.prepare(`ALTER TABLE setting ADD COLUMN verify_config TEXT NOT NULL DEFAULT '{}';`).run();
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}
		if (config) {
			try {
				await c.env.db.prepare(`UPDATE setting SET verify_config = ?`).bind(JSON.stringify(config)).run();
			} catch (e) {
				console.warn(`跳过字段：${e.message}`);
			}
		}
	},

	async v3_24DB(c) {
		// Webhook 4 项打包进 webhook_config JSON 列（4 列变 1 列，腾 3 个空位）。
		// 顺序：先读出现有值 → 删 4 个旧列 → 加 webhook_config 列 → 把值写回去。各步独立 try/catch，重复跑也不怕。
		let config = null;
		try {
			const row = await c.env.db.prepare(`SELECT webhook_url, webhook_status, webhook_retry, webhook_secret FROM setting`).first();
			if (row) {
				config = {
					webhookUrl: row.webhook_url ?? '',
					webhookStatus: row.webhook_status ?? 1,
					webhookRetry: row.webhook_retry ?? 0,
					webhookSecret: row.webhook_secret ?? ''
				};
			}
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}
		for (const col of ['webhook_url', 'webhook_status', 'webhook_retry', 'webhook_secret']) {
			try {
				await c.env.db.prepare(`ALTER TABLE setting DROP COLUMN ${col};`).run();
			} catch (e) {
				console.warn(`跳过字段：${e.message}`);
			}
		}
		try {
			await c.env.db.prepare(`ALTER TABLE setting ADD COLUMN webhook_config TEXT NOT NULL DEFAULT '{}';`).run();
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}
		if (config) {
			try {
				await c.env.db.prepare(`UPDATE setting SET webhook_config = ?`).bind(JSON.stringify(config)).run();
			} catch (e) {
				console.warn(`跳过字段：${e.message}`);
			}
		}
	},

	async v3_25DB(c) {
		// 黑名单 3 项打包进 blacklist_config JSON 列（3 列变 1 列，腾 2 个空位）。
		// 顺序：先读出现有值 → 删 3 个旧列 → 加 blacklist_config 列 → 把值写回去。各步独立 try/catch，重复跑也不怕。
		let config = null;
		try {
			const row = await c.env.db.prepare(`SELECT black_subject, black_content, black_from FROM setting`).first();
			if (row) {
				config = {
					blackSubject: row.black_subject ?? '',
					blackContent: row.black_content ?? '',
					blackFrom: row.black_from ?? ''
				};
			}
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}
		for (const col of ['black_subject', 'black_content', 'black_from']) {
			try {
				await c.env.db.prepare(`ALTER TABLE setting DROP COLUMN ${col};`).run();
			} catch (e) {
				console.warn(`跳过字段：${e.message}`);
			}
		}
		try {
			await c.env.db.prepare(`ALTER TABLE setting ADD COLUMN blacklist_config TEXT NOT NULL DEFAULT '{}';`).run();
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}
		if (config) {
			try {
				await c.env.db.prepare(`UPDATE setting SET blacklist_config = ?`).bind(JSON.stringify(config)).run();
			} catch (e) {
				console.warn(`跳过字段：${e.message}`);
			}
		}
	},

	async v3_26DB(c) {
		// 自动清理 3 项打包进 auto_clean_config JSON 列（3 列变 1 列，腾 2 个空位）。
		// 顺序：先读出现有值 → 删 3 个旧列 → 加 auto_clean_config 列 → 把值写回去。各步独立 try/catch，重复跑也不怕。
		let config = null;
		try {
			const row = await c.env.db.prepare(`SELECT auto_clean_days, auto_clean_exclude, audit_clean_days FROM setting`).first();
			if (row) {
				config = {
					autoCleanDays: row.auto_clean_days ?? 0,
					autoCleanExclude: row.auto_clean_exclude ?? '',
					auditCleanDays: row.audit_clean_days ?? 0
				};
			}
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}
		for (const col of ['auto_clean_days', 'auto_clean_exclude', 'audit_clean_days']) {
			try {
				await c.env.db.prepare(`ALTER TABLE setting DROP COLUMN ${col};`).run();
			} catch (e) {
				console.warn(`跳过字段：${e.message}`);
			}
		}
		try {
			await c.env.db.prepare(`ALTER TABLE setting ADD COLUMN auto_clean_config TEXT NOT NULL DEFAULT '{}';`).run();
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}
		if (config) {
			try {
				await c.env.db.prepare(`UPDATE setting SET auto_clean_config = ?`).bind(JSON.stringify(config)).run();
			} catch (e) {
				console.warn(`跳过字段：${e.message}`);
			}
		}
	},

	async v3_27DB(c) {
		// AI 验证码 2 项打包进 ai_code_config JSON 列（2 列变 1 列，腾 1 个空位）。
		// 顺序：先读出现有值 → 删 2 个旧列 → 加 ai_code_config 列 → 把值写回去。各步独立 try/catch，重复跑也不怕。
		let config = null;
		try {
			const row = await c.env.db.prepare(`SELECT ai_code, ai_code_filter FROM setting`).first();
			if (row) {
				config = {
					aiCode: row.ai_code ?? 1,
					aiCodeFilter: row.ai_code_filter ?? ''
				};
			}
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}
		for (const col of ['ai_code', 'ai_code_filter']) {
			try {
				await c.env.db.prepare(`ALTER TABLE setting DROP COLUMN ${col};`).run();
			} catch (e) {
				console.warn(`跳过字段：${e.message}`);
			}
		}
		try {
			await c.env.db.prepare(`ALTER TABLE setting ADD COLUMN ai_code_config TEXT NOT NULL DEFAULT '{}';`).run();
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}
		if (config) {
			try {
				await c.env.db.prepare(`UPDATE setting SET ai_code_config = ?`).bind(JSON.stringify(config)).run();
			} catch (e) {
				console.warn(`跳过字段：${e.message}`);
			}
		}
	},

	async v3_28DB(c) {
		// 邮箱前缀 2 项打包进 email_prefix_config JSON 列（2 列变 1 列，腾 1 个空位）。
		// 顺序：先读出现有值 → 删 2 个旧列 → 加 email_prefix_config 列 → 把值写回去。各步独立 try/catch，重复跑也不怕。
		let config = null;
		try {
			const row = await c.env.db.prepare(`SELECT min_email_prefix, email_prefix_filter FROM setting`).first();
			if (row) {
				config = {
					minEmailPrefix: row.min_email_prefix ?? 0,
					emailPrefixFilter: row.email_prefix_filter ?? ''
				};
			}
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}
		for (const col of ['min_email_prefix', 'email_prefix_filter']) {
			try {
				await c.env.db.prepare(`ALTER TABLE setting DROP COLUMN ${col};`).run();
			} catch (e) {
				console.warn(`跳过字段：${e.message}`);
			}
		}
		try {
			await c.env.db.prepare(`ALTER TABLE setting ADD COLUMN email_prefix_config TEXT NOT NULL DEFAULT '{}';`).run();
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}
		if (config) {
			try {
				await c.env.db.prepare(`UPDATE setting SET email_prefix_config = ?`).bind(JSON.stringify(config)).run();
			} catch (e) {
				console.warn(`跳过字段：${e.message}`);
			}
		}
	},

	async v3_29DB(c) {
		// 上游 f001fa5 登录验证码 2 项（开关 loginVerify、次数 loginVerifyCount），打包进
		// login_verify_config JSON 列：先把平铺旧值（上游 v3_6DB 建的列）读出来写进 JSON，再删平铺列。
		// 新装无旧值，只加列，读值时 helper 兜底（开关默认 1=关，次数默认 1）。
		let config = null;
		try {
			const row = await c.env.db.prepare(`SELECT login_verify, login_verify_count FROM setting`).first();
			if (row) {
				config = {
					loginVerify: row.login_verify ?? 1,
					loginVerifyCount: row.login_verify_count ?? 1
				};
			}
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}
		for (const col of ['login_verify', 'login_verify_count']) {
			try {
				await c.env.db.prepare(`ALTER TABLE setting DROP COLUMN ${col};`).run();
			} catch (e) {
				console.warn(`跳过字段：${e.message}`);
			}
		}
		try {
			await c.env.db.prepare(`ALTER TABLE setting ADD COLUMN login_verify_config TEXT NOT NULL DEFAULT '{}';`).run();
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}
		if (config) {
			try {
				await c.env.db.prepare(`UPDATE setting SET login_verify_config = ?`).bind(JSON.stringify(config)).run();
			} catch (e) {
				console.warn(`跳过字段：${e.message}`);
			}
		}
	},

	async v3_30DB(c) {
		// 上游 0abdbc7 实时推送：autoRefresh 由轮询秒数（0=关、3/5/10…=间隔）改成两档开关（1=关、2=开）。
		// 旧值里只有 1 保持关闭，其余（0、3、5…）一律改成 2 开启。
		try {
			await c.env.db.prepare(`UPDATE setting SET auto_refresh = 2 WHERE auto_refresh != 1`).run();
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}
	},

	async v3_14DB(c) {
		try {
			await c.env.db.prepare(`ALTER TABLE setting ADD COLUMN notify_status INTEGER NOT NULL DEFAULT 0;`).run();
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}
	},

	async v3_13DB(c) {
		try {
			await c.env.db.batch([
				c.env.db.prepare(`ALTER TABLE account ADD COLUMN forward_rule_from TEXT NOT NULL DEFAULT '';`),
				c.env.db.prepare(`ALTER TABLE account ADD COLUMN forward_rule_subject TEXT NOT NULL DEFAULT '';`)
			]);
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}
	},

	async v3_12DB(c) {
		try {
			await c.env.db.prepare(`ALTER TABLE setting ADD COLUMN audit_clean_days INTEGER NOT NULL DEFAULT 0;`).run();
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}
	},

	async v3_11DB(c) {
		try {
			await c.env.db.prepare(`CREATE TABLE IF NOT EXISTS audit_log (
				log_id INTEGER PRIMARY KEY AUTOINCREMENT,
				user_id INTEGER NOT NULL,
				user_email TEXT NOT NULL DEFAULT '',
				action TEXT NOT NULL,
				target_type TEXT NOT NULL DEFAULT '',
				target_desc TEXT NOT NULL DEFAULT '',
				detail TEXT NOT NULL DEFAULT '',
				create_time INTEGER NOT NULL
			);`).run();
			await c.env.db.prepare(`INSERT INTO perm (perm_id, name, perm_key, pid, type, sort)
				SELECT 37, '操作记录', NULL, 0, 1, 7
				WHERE NOT EXISTS (SELECT 1 FROM perm WHERE perm_id = 37)`).run();
			await c.env.db.prepare(`INSERT INTO perm (perm_id, name, perm_key, pid, type, sort)
				SELECT 38, '记录查看', 'audit:query', 37, 2, 0
				WHERE NOT EXISTS (SELECT 1 FROM perm WHERE perm_key = 'audit:query')`).run();
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}
	},

	async v3_10DB(c) {
		try {
			await c.env.db.prepare(`ALTER TABLE setting ADD COLUMN notify_email TEXT NOT NULL DEFAULT '';`).run();
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}
	},

	async v3_9DB(c) {
		try {
			await c.env.db.batch([
				c.env.db.prepare(`ALTER TABLE account ADD COLUMN forward_email TEXT NOT NULL DEFAULT '';`),
				c.env.db.prepare(`ALTER TABLE account ADD COLUMN forward_status INTEGER NOT NULL DEFAULT 1;`)
			]);
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}
	},

	async v3_8DB(c) {
		try {
			await c.env.db.prepare(`ALTER TABLE setting ADD COLUMN att_encrypt INTEGER NOT NULL DEFAULT 1;`).run();
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}
	},

	async v3_7DB(c) {
		try {
			await c.env.db.prepare(`ALTER TABLE setting ADD COLUMN brevo_tokens TEXT NOT NULL DEFAULT '{}';`).run();
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}
	},

	async v3_6DB(c) {
		// 上游原版：旧 auto_refresh 值映射（0→1 关，其余→2 开），保留 1/2 不动。
		try {
			// 保留当前的 1（关闭）和 2（开启），只转换旧版的关闭值和刷新间隔。
			await c.env.db.prepare(`
				UPDATE setting SET auto_refresh = CASE WHEN auto_refresh = 0 THEN 1 ELSE 2 END
				WHERE auto_refresh NOT IN (1, 2)
			`).run();
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}

		// 上游原版：登录验证码 2 个平铺列（v3_29DB 会打包进 login_verify_config 并删掉这两列）。
		try {
			await c.env.db.batch([
				c.env.db.prepare(`ALTER TABLE setting ADD COLUMN login_verify INTEGER NOT NULL DEFAULT 1`),
				c.env.db.prepare(`ALTER TABLE setting ADD COLUMN login_verify_count INTEGER NOT NULL DEFAULT 1`)
			]);
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}

		// 我方新增：Sendkit 发信 token（上游只有 Resend）。
		try {
			await c.env.db.prepare(`ALTER TABLE setting ADD COLUMN sendkit_tokens TEXT NOT NULL DEFAULT '{}';`).run();
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}
	},

	async v3_5DB(c) {
		await c.env.db.prepare(`CREATE INDEX IF NOT EXISTS idx_email_user_create_time ON email(user_id, create_time)`).run();
	},

	async v3_4DB(c) {
		try {
			await c.env.db.prepare(`ALTER TABLE email ADD COLUMN sender_email TEXT NOT NULL DEFAULT '';`).run();
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}
	},

	async v3_3DB(c) {
		try {
			await c.env.db.batch([
				c.env.db.prepare(`ALTER TABLE setting ADD COLUMN auto_clean_days INTEGER NOT NULL DEFAULT 0;`),
				c.env.db.prepare(`ALTER TABLE setting ADD COLUMN auto_clean_exclude TEXT NOT NULL DEFAULT '';`),
				c.env.db.prepare(`CREATE INDEX IF NOT EXISTS idx_email_create_time ON email(create_time)`)
			]);
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}

		try {
			await c.env.db.batch([
				c.env.db.prepare(`ALTER TABLE setting ADD COLUMN webhook_url TEXT NOT NULL DEFAULT '';`),
				c.env.db.prepare(`ALTER TABLE setting ADD COLUMN webhook_status INTEGER NOT NULL DEFAULT 1;`),
				c.env.db.prepare(`ALTER TABLE setting ADD COLUMN webhook_retry INTEGER NOT NULL DEFAULT 0;`),
				c.env.db.prepare(`ALTER TABLE setting ADD COLUMN webhook_secret TEXT NOT NULL DEFAULT '';`)
			]);
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}
	},

	async v3_2DB(c) {
		try {
			await c.env.db.batch([
				await c.env.db.prepare(`ALTER TABLE setting ADD COLUMN linuxdo_client_id TEXT NOT NULL DEFAULT '';`),
				await c.env.db.prepare(`ALTER TABLE setting ADD COLUMN linuxdo_client_secret TEXT NOT NULL DEFAULT '';`),
				await c.env.db.prepare(`ALTER TABLE setting ADD COLUMN github_client_id TEXT NOT NULL DEFAULT '';`),
				await c.env.db.prepare(`ALTER TABLE setting ADD COLUMN github_client_secret TEXT NOT NULL DEFAULT '';`),
				await c.env.db.prepare(`ALTER TABLE setting ADD COLUMN google_client_id TEXT NOT NULL DEFAULT '';`),
				await c.env.db.prepare(`ALTER TABLE setting ADD COLUMN google_client_secret TEXT NOT NULL DEFAULT '';`),
				await c.env.db.prepare(`ALTER TABLE setting ADD COLUMN linuxdo_switch INTEGER NOT NULL DEFAULT 1;`),
				await c.env.db.prepare(`ALTER TABLE setting ADD COLUMN github_switch INTEGER NOT NULL DEFAULT 1;`),
				await c.env.db.prepare(`ALTER TABLE setting ADD COLUMN google_switch INTEGER NOT NULL DEFAULT 1;`)
			]);
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}

		try {
			await c.env.db.batch([
				c.env.db.prepare(`CREATE INDEX IF NOT EXISTS idx_email_list_user ON email(user_id, type, is_del, email_id)`),
				c.env.db.prepare(`CREATE INDEX IF NOT EXISTS idx_email_list_account ON email(user_id, account_id, type, is_del, email_id)`),
				c.env.db.prepare(`CREATE INDEX IF NOT EXISTS idx_star_user_email ON star(user_id, email_id)`),
				c.env.db.prepare(`CREATE INDEX IF NOT EXISTS idx_star_email_user ON star(email_id, user_id)`),
				c.env.db.prepare(`CREATE INDEX IF NOT EXISTS idx_email_name_nocase ON email(name COLLATE NOCASE)`),
				c.env.db.prepare(`CREATE INDEX IF NOT EXISTS idx_email_subject_nocase ON email(subject COLLATE NOCASE)`),
				c.env.db.prepare(`CREATE INDEX IF NOT EXISTS idx_user_email_nocase ON user(email COLLATE NOCASE)`),
				c.env.db.prepare(`CREATE INDEX IF NOT EXISTS idx_email_to_email_nocase ON email(to_email COLLATE NOCASE)`),
				c.env.db.prepare(`CREATE INDEX IF NOT EXISTS idx_email_send_email_nocase ON email(send_email COLLATE NOCASE)`),
				c.env.db.prepare(`CREATE INDEX IF NOT EXISTS idx_email_noone_id ON email(email_id) WHERE status = 7`),
				c.env.db.prepare(`CREATE INDEX IF NOT EXISTS idx_email_type_id ON email(type, email_id)`),
				c.env.db.prepare(`CREATE INDEX IF NOT EXISTS idx_account_user_del_sort ON account(user_id, is_del, sort, account_id)`),
				c.env.db.prepare(`CREATE INDEX IF NOT EXISTS idx_email_saving_account ON email(account_id) WHERE status = 6`),
				c.env.db.prepare(`CREATE INDEX IF NOT EXISTS idx_email_type_name ON email(type, name)`),
				c.env.db.prepare(`CREATE INDEX IF NOT EXISTS idx_email_type_create_time ON email(type, create_time)`),
				c.env.db.prepare(`CREATE INDEX IF NOT EXISTS idx_user_create_time ON user(create_time)`),
				c.env.db.prepare(`CREATE INDEX IF NOT EXISTS idx_user_type ON user(type)`),
				c.env.db.prepare(`CREATE INDEX IF NOT EXISTS idx_attachments_email_type ON attachments(email_id, type)`),
				c.env.db.prepare(`CREATE INDEX IF NOT EXISTS idx_role_perm_role ON role_perm(role_id)`),
				c.env.db.prepare(`CREATE INDEX IF NOT EXISTS idx_oauth_oauth_user_id ON oauth(oauth_user_id)`),
				c.env.db.prepare(`CREATE INDEX IF NOT EXISTS idx_oauth_user_id ON oauth(user_id)`)
			]);
		} catch (e) {
			console.warn(`跳过索引：${e.message}`);
		}
	},

	async v3_1DB(c) {
		try {
			await c.env.db.prepare(`ALTER TABLE setting ADD COLUMN sync_delete INTEGER NOT NULL DEFAULT 0;`).run();
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}
	},


	async v3_0DB(c) {
		try {
			await c.env.db.batch([
				await c.env.db.prepare(`ALTER TABLE email ADD COLUMN code TEXT NOT NULL DEFAULT '';`),
				await c.env.db.prepare(`ALTER TABLE setting ADD COLUMN ai_code INTEGER NOT NULL DEFAULT 1;`),
				await c.env.db.prepare(`ALTER TABLE setting ADD COLUMN ai_code_filter TEXT NOT NULL DEFAULT '';`)
			]);
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}

		try {
			await c.env.db.batch([
				c.env.db.prepare(`ALTER TABLE setting ADD COLUMN black_subject TEXT NOT NULL DEFAULT '';`),
				c.env.db.prepare(`ALTER TABLE setting ADD COLUMN black_content TEXT NOT NULL DEFAULT '';`),
				c.env.db.prepare(`ALTER TABLE setting ADD COLUMN black_from TEXT NOT NULL DEFAULT '';`)
			]);
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}

	},

	async v2_9DB(c) {
		try {
			await c.env.db.prepare(`UPDATE setting SET auto_refresh = 5 WHERE auto_refresh = 1;`).run();
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}
	},

	async v2_8DB(c) {
		try {
			await c.env.db.batch([
				c.env.db.prepare(`ALTER TABLE account ADD COLUMN sort INTEGER NOT NULL DEFAULT 0;`)
			]);
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}
	},

	async v2_7DB(c) {
		try {
			await c.env.db.batch([
				c.env.db.prepare(`ALTER TABLE setting RENAME COLUMN auto_refresh_time TO auto_refresh;`)
			]);
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}
	},

	async v2_6DB(c) {
		try {
			await c.env.db.prepare(`ALTER TABLE account ADD COLUMN all_receive INTEGER NOT NULL DEFAULT 0;`).run();
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}
	},

	async v2_5DB(c) {

		try {
			await c.env.db.prepare(`ALTER TABLE setting ADD COLUMN email_prefix_filter text NOT NULL DEFAULT '';`).run();
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}

		try {
			await c.env.db.batch([
				c.env.db.prepare(`ALTER TABLE email ADD COLUMN unread INTEGER NOT NULL DEFAULT 0;`),
				c.env.db.prepare(`UPDATE email SET unread = 1;`)
			]);
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}

	},

	async v2_4DB(c) {
		try {
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
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}

		try {
			await c.env.db.prepare(`ALTER TABLE setting ADD COLUMN min_email_prefix INTEGER NOT NULL DEFAULT 1;`).run();
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}

	},

	async v2_3DB(c) {
		try {
			await c.env.db.batch([
				c.env.db.prepare(`ALTER TABLE setting ADD COLUMN force_path_style	INTEGER NOT NULL DEFAULT 1;`),
				c.env.db.prepare(`ALTER TABLE setting ADD COLUMN custom_domain TEXT NOT NULL DEFAULT '';`),
				c.env.db.prepare(`ALTER TABLE setting ADD COLUMN tg_msg_to TEXT NOT NULL DEFAULT 'show';`),
				c.env.db.prepare(`ALTER TABLE setting ADD COLUMN tg_msg_from TEXT NOT NULL DEFAULT 'only-name';`)
			]);
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}

		try {
			await c.env.db.prepare(`ALTER TABLE setting ADD COLUMN tg_msg_text TEXT NOT NULL DEFAULT 'show';`).run();
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}

	},

	async v2DB(c) {
		try {
			await c.env.db.batch([
				c.env.db.prepare(`ALTER TABLE setting ADD COLUMN bucket TEXT NOT NULL DEFAULT '';`),
				c.env.db.prepare(`ALTER TABLE setting ADD COLUMN region TEXT NOT NULL DEFAULT '';`),
				c.env.db.prepare(`ALTER TABLE setting ADD COLUMN endpoint TEXT NOT NULL DEFAULT '';`),
				c.env.db.prepare(`ALTER TABLE setting ADD COLUMN s3_access_key TEXT NOT NULL DEFAULT '';`),
				c.env.db.prepare(`ALTER TABLE setting ADD COLUMN s3_secret_key TEXT NOT NULL DEFAULT '';`),
				c.env.db.prepare(`DELETE FROM perm WHERE perm_key = 'setting:clean'`)
			]);
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}
	},

	async v1_7DB(c) {
		try {
			await c.env.db.prepare(`ALTER TABLE setting ADD COLUMN login_domain INTEGER NOT NULL DEFAULT 0;`).run();
		} catch (e) {
			console.warn(`跳过字段：${e.message}`);
		}
	},

	async v1_6DB(c) {

		const noticeContent = '本项目仅供学习交流，禁止用于违法业务\n' +
			'<br>\n' +
			'请遵守当地法规，作者不承担任何法律责任'

		const ADD_COLUMN_SQL_LIST = [
			`ALTER TABLE setting ADD COLUMN reg_verify_count INTEGER NOT NULL DEFAULT 1;`,
			`ALTER TABLE setting ADD COLUMN add_verify_count INTEGER NOT NULL DEFAULT 1;`,
			`CREATE TABLE IF NOT EXISTS verify_record (
				vr_id INTEGER PRIMARY KEY AUTOINCREMENT,
				ip TEXT NOT NULL DEFAULT '',
				count INTEGER NOT NULL DEFAULT 1,
				type INTEGER NOT NULL DEFAULT 0,
				update_time DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
			`ALTER TABLE setting ADD COLUMN notice_title TEXT NOT NULL DEFAULT 'Cloud Mail';`,
			`ALTER TABLE setting ADD COLUMN notice_content TEXT NOT NULL DEFAULT '';`,
			`ALTER TABLE setting ADD COLUMN notice_type TEXT NOT NULL DEFAULT 'none';`,
			`ALTER TABLE setting ADD COLUMN notice_duration INTEGER NOT NULL DEFAULT 0;`,
			`ALTER TABLE setting ADD COLUMN notice_offset INTEGER NOT NULL DEFAULT 0;`,
			`ALTER TABLE setting ADD COLUMN notice_position TEXT NOT NULL DEFAULT 'top-right';`,
			`ALTER TABLE setting ADD COLUMN notice_width INTEGER NOT NULL DEFAULT 340;`,
			`ALTER TABLE setting ADD COLUMN notice INTEGER NOT NULL DEFAULT 0;`,
			`ALTER TABLE setting ADD COLUMN no_recipient INTEGER NOT NULL DEFAULT 1;`,
			`UPDATE role SET avail_domain = '' WHERE role.avail_domain LIKE '@%';`,
			`CREATE INDEX IF NOT EXISTS idx_email_user_id_account_id ON email(user_id, account_id);`
		];

		const promises = ADD_COLUMN_SQL_LIST.map(async (sql) => {
			try {
				await c.env.db.prepare(sql).run();
			} catch (e) {
				console.warn(`跳过字段：${e.message}`);
			}
		});

		await Promise.all(promises);
		await c.env.db.prepare(`UPDATE setting SET notice_content = ? WHERE notice_content = '';`).bind(noticeContent).run();
		try {
			await c.env.db.batch([
				c.env.db.prepare(`DROP INDEX IF EXISTS idx_account_email`),
				c.env.db.prepare(`DROP INDEX IF EXISTS idx_user_email`),
				c.env.db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_account_email_nocase ON account (email COLLATE NOCASE)`),
				c.env.db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_user_email_nocase ON user (email COLLATE NOCASE)`)
			]);
		} catch (e) {
			console.warn(e.message)
		}

	},

	async v1_5DB(c) {
		await c.env.db.prepare(`UPDATE perm SET perm_key = 'all-email:query' WHERE perm_key = 'sys-email:query'`).run();
		await c.env.db.prepare(`UPDATE perm SET perm_key = 'all-email:delete' WHERE perm_key = 'sys-email:delete'`).run();
		try {
			await c.env.db.prepare(`ALTER TABLE role ADD COLUMN avail_domain TEXT NOT NULL DEFAULT ''`).run();
		} catch (e) {
			console.warn(`跳过字段添加：${e.message}`);
		}
	},

	async v1_4DB(c) {
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

		// 添加不区分大小写的唯一索引
		try {
			await c.env.db.prepare(`
				CREATE UNIQUE INDEX IF NOT EXISTS idx_setting_code ON reg_key(code COLLATE NOCASE)
			`).run();
		} catch (e) {
			console.warn(`跳过创建索引：${e.message}`);
		}


		try {
			await c.env.db.prepare(`
        INSERT INTO perm (perm_id, name, perm_key, pid, type, sort) VALUES
        (33,'注册密钥', NULL, 0, 1, 5.1),
        (34,'密钥查看', 'reg-key:query', 33, 2, 0),
        (35,'密钥添加', 'reg-key:add', 33, 2, 1),
        (36,'密钥删除', 'reg-key:delete', 33, 2, 2)`).run();
		} catch (e) {
			console.warn(`跳过数据：${e.message}`);
		}

		const ADD_COLUMN_SQL_LIST = [
			`ALTER TABLE setting ADD COLUMN reg_key INTEGER NOT NULL DEFAULT 1;`,
			`ALTER TABLE role ADD COLUMN ban_email TEXT NOT NULL DEFAULT '';`,
			`ALTER TABLE role ADD COLUMN ban_email_type INTEGER NOT NULL DEFAULT 0;`,
			`ALTER TABLE user ADD COLUMN reg_key_id INTEGER NOT NULL DEFAULT 0;`
		];

		const promises = ADD_COLUMN_SQL_LIST.map(async (sql) => {
			try {
				await c.env.db.prepare(sql).run();
			} catch (e) {
				console.warn(`跳过字段添加：${e.message}`);
			}
		});

		await Promise.all(promises);

	},

	async v1_3_1DB(c) {
		await c.env.db.prepare(`UPDATE email SET name = SUBSTR(send_email, 1, INSTR(send_email, '@') - 1) WHERE (name IS NULL OR name = '') AND type = ${emailConst.type.RECEIVE}`).run();
	},

	async v1_3DB(c) {

		const ADD_COLUMN_SQL_LIST = [
			`ALTER TABLE setting ADD COLUMN tg_bot_token TEXT NOT NULL DEFAULT '';`,
			`ALTER TABLE setting ADD COLUMN tg_chat_id TEXT NOT NULL DEFAULT '';`,
			`ALTER TABLE setting ADD COLUMN tg_bot_status INTEGER NOT NULL DEFAULT 1;`,
			`ALTER TABLE setting ADD COLUMN forward_email TEXT NOT NULL DEFAULT '';`,
			`ALTER TABLE setting ADD COLUMN forward_status INTEGER TIME NOT NULL DEFAULT 1;`,
			`ALTER TABLE setting ADD COLUMN rule_email TEXT NOT NULL DEFAULT '';`,
			`ALTER TABLE setting ADD COLUMN rule_type INTEGER NOT NULL DEFAULT 0;`
		];

		const promises = ADD_COLUMN_SQL_LIST.map(async (sql) => {
			try {
				await c.env.db.prepare(sql).run();
			} catch (e) {
				console.warn(`跳过字段添加：${e.message}`);
			}
		});

		await Promise.all(promises);

		const nameColumn = await c.env.db.prepare(`SELECT * FROM pragma_table_info('email') WHERE name = 'to_email' limit 1`).first();

		if (nameColumn) {
			return
		}

		const queryList = []

		queryList.push(c.env.db.prepare(`ALTER TABLE email ADD COLUMN to_email TEXT NOT NULL DEFAULT ''`));
		queryList.push(c.env.db.prepare(`ALTER TABLE email ADD COLUMN to_name TEXT NOT NULL DEFAULT ''`));
		queryList.push(c.env.db.prepare(`UPDATE email SET to_email = json_extract(recipient, '$[0].address'), to_name = json_extract(recipient, '$[0].name')`));

		await c.env.db.batch(queryList);

	},

	async v1_2DB(c){

		const ADD_COLUMN_SQL_LIST = [
			`ALTER TABLE email ADD COLUMN recipient TEXT NOT NULL DEFAULT '[]';`,
			`ALTER TABLE email ADD COLUMN cc TEXT NOT NULL DEFAULT '[]';`,
			`ALTER TABLE email ADD COLUMN bcc TEXT NOT NULL DEFAULT '[]';`,
			`ALTER TABLE email ADD COLUMN message_id TEXT NOT NULL DEFAULT '';`,
			`ALTER TABLE email ADD COLUMN in_reply_to TEXT NOT NULL DEFAULT '';`,
			`ALTER TABLE email ADD COLUMN relation TEXT NOT NULL DEFAULT '';`
		];

		const promises = ADD_COLUMN_SQL_LIST.map(async (sql) => {
			try {
				await c.env.db.prepare(sql).run();
			} catch (e) {
				console.warn(`跳过字段添加：${e.message}`);
			}
		});

		await Promise.all(promises);

		await this.receiveEmailToRecipient(c);
		await this.initAccountName(c);

		try {
			await c.env.db.prepare(`
        INSERT INTO perm (perm_id, name, perm_key, pid, type, sort) VALUES
        (31,'分析页', NULL, 0, 1, 2.1),
        (32,'数据查看', 'analysis:query', 31, 2, 1)`).run();
		} catch (e) {
			console.warn(`跳过数据：${e.message}`);
		}

	},

	async v1_1DB(c) {
		// 添加字段
		const ADD_COLUMN_SQL_LIST = [
			`ALTER TABLE email ADD COLUMN type INTEGER NOT NULL DEFAULT 0;`,
			`ALTER TABLE email ADD COLUMN status INTEGER NOT NULL DEFAULT 0;`,
			`ALTER TABLE email ADD COLUMN resend_email_id TEXT;`,
			`ALTER TABLE email ADD COLUMN message TEXT;`,

			`ALTER TABLE setting ADD COLUMN resend_tokens TEXT NOT NULL DEFAULT '{}';`,
			`ALTER TABLE setting ADD COLUMN send INTEGER NOT NULL DEFAULT 0;`,
			`ALTER TABLE setting ADD COLUMN r2_domain TEXT;`,
			`ALTER TABLE setting ADD COLUMN site_key TEXT;`,
			`ALTER TABLE setting ADD COLUMN secret_key TEXT;`,
			`ALTER TABLE setting ADD COLUMN background TEXT;`,
			`ALTER TABLE setting ADD COLUMN login_opacity INTEGER NOT NULL DEFAULT 0.90;`,

			`ALTER TABLE user ADD COLUMN create_ip TEXT;`,
			`ALTER TABLE user ADD COLUMN active_ip TEXT;`,
			`ALTER TABLE user ADD COLUMN os TEXT;`,
			`ALTER TABLE user ADD COLUMN browser TEXT;`,
			`ALTER TABLE user ADD COLUMN device TEXT;`,
			`ALTER TABLE user ADD COLUMN sort INTEGER NOT NULL DEFAULT 0;`,
			`ALTER TABLE user ADD COLUMN send_count INTEGER NOT NULL DEFAULT 0;`,

			`ALTER TABLE attachments ADD COLUMN status INTEGER NOT NULL DEFAULT 0;`,
			`ALTER TABLE attachments ADD COLUMN type INTEGER NOT NULL DEFAULT 0;`
		];

		const promises = ADD_COLUMN_SQL_LIST.map(async (sql) => {
			try {
				await c.env.db.prepare(sql).run();
			} catch (e) {
				console.warn(`跳过字段添加：${e.message}`);
			}
		});

		await Promise.all(promises);

		// 创建 perm 表并初始化
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
        (12, '用户收藏', 'user:star', 6, 2, 5),
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
				(30, '身份添加', 'role:add', 13, 2, -1)
      `).run();
		}

		await c.env.db.prepare(`UPDATE perm SET perm_key = 'setting:clean' WHERE perm_key = 'seting:clear'`).run();
		await c.env.db.prepare(`DELETE FROM perm WHERE perm_key = 'user:star'`).run();
		// 创建 role 表并插入默认身份
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
      )
    `).run();

		const { roleCount } = await c.env.db.prepare(`SELECT COUNT(*) as roleCount FROM role`).first();
		if (roleCount === 0) {
			await c.env.db.prepare(`
        INSERT INTO role (
          role_id, name, key, create_time, sort, description, user_id, is_default, send_count, send_type, account_count
        ) VALUES (
          1, '普通用户', NULL, '0000-00-00 00:00:00', 0, '只有普通使用权限', 0, 1, NULL, 'ban', 10
        )
      `).run();
		}

		// 创建 role_perm 表并初始化数据
		await c.env.db.prepare(`
      CREATE TABLE IF NOT EXISTS role_perm (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role_id INTEGER,
        perm_id INTEGER
      )
    `).run();

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

	async intDB(c) {
		// 初始化数据库表结构：建表语句就是最终形态（2026-11-19 重构），新装一次建表即得最终结构。
		// 已初始化过的库不受影响（CREATE TABLE IF NOT EXISTS 与种子守卫都是 no-op）。
		// 旧库升级靠 init() 里随后跑的 v1_1–v3_30 增量迁移补列/补表/迁数据（每条独立 try/catch，
		// 已迁过就是 no-op）；折叠建表只做新装加速，不能替代迁移层（2026-11-20 审计修复）。

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
		  , status INTEGER NOT NULL DEFAULT 0, type INTEGER NOT NULL DEFAULT 0, resend_email_id TEXT, message TEXT, message_id TEXT NOT NULL DEFAULT '', relation TEXT NOT NULL DEFAULT '', in_reply_to TEXT NOT NULL DEFAULT '', bcc TEXT NOT NULL DEFAULT '[]', cc TEXT NOT NULL DEFAULT '[]', recipient TEXT NOT NULL DEFAULT '[]', to_email TEXT NOT NULL DEFAULT '', to_name TEXT NOT NULL DEFAULT '', unread INTEGER NOT NULL DEFAULT 0, code TEXT NOT NULL DEFAULT '', sender_email TEXT NOT NULL DEFAULT '', is_spam INTEGER NOT NULL DEFAULT 0)
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
		  CREATE TABLE IF NOT EXISTS contact (
			contact_id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			name TEXT NOT NULL DEFAULT '',
			email TEXT NOT NULL,
			remark TEXT NOT NULL DEFAULT '',
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
		  , send_count INTEGER NOT NULL DEFAULT 0, sort INTEGER NOT NULL DEFAULT 0, os TEXT, device TEXT, create_ip TEXT, active_ip TEXT, browser TEXT, reg_key_id INTEGER NOT NULL DEFAULT 0, spam_blocklist TEXT NOT NULL DEFAULT '{}', sidebar_config TEXT NOT NULL DEFAULT '{}')
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

	async receiveEmailToRecipient(c) {

		const receiveEmailColumn = await c.env.db.prepare(`SELECT * FROM pragma_table_info('email') WHERE name = 'receive_email' limit 1`).first();

		if (!receiveEmailColumn) {
			return
		}

		const queryList = []
		const {results} = await c.env.db.prepare('SELECT receive_email,email_id FROM email').all();
		results.forEach(emailRow => {
			const recipient = {}
			recipient.address = emailRow.receive_email
			recipient.name = ''
			const recipientStr = JSON.stringify([recipient]);
			const sql = c.env.db.prepare('UPDATE email SET recipient = ? WHERE email_id = ?').bind(recipientStr,emailRow.email_id);
			queryList.push(sql)
		})

		queryList.push(c.env.db.prepare("ALTER TABLE email DROP COLUMN receive_email"));

		await c.env.db.batch(queryList);
	},


	async initAccountName(c) {

		const nameColumn = await c.env.db.prepare(`SELECT * FROM pragma_table_info('account') WHERE name = 'name' limit 1`).first();

		if (nameColumn) {
			return
		}

		const queryList = []

		queryList.push(c.env.db.prepare(`ALTER TABLE account ADD COLUMN name TEXT NOT NULL DEFAULT ''`));

		const {results} = await c.env.db.prepare(`SELECT account_id, email FROM account`).all();

		results.forEach(accountRow => {
			const name = emailUtils.getName(accountRow.email);
			const sql = c.env.db.prepare('UPDATE account SET name = ? WHERE account_id = ?').bind(name,accountRow.account_id);
			queryList.push(sql)
		})

		await c.env.db.batch(queryList);
	}
};
export { dbInit };
