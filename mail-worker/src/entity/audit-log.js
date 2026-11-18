import { sqliteTable, text, integer} from 'drizzle-orm/sqlite-core';
export const auditLog = sqliteTable('audit_log', {
	logId: integer('log_id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id').notNull(),
	userEmail: text('user_email').default('').notNull(),
	action: text('action').notNull(),
	targetType: text('target_type').default('').notNull(),
	targetDesc: text('target_desc').default('').notNull(),
	detail: text('detail').default('').notNull(),
	createTime: integer('create_time').notNull(),
});
export default auditLog
