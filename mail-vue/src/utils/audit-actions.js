// 操作记录的操作类型（顶部搜索组件与列表页共用）
export const AUDIT_ACTION_OPTIONS = [
  'delete_email', 'delete_attachment', 'delete_user', 'disable_user', 'enable_user',
  'update_setting', 'add_role', 'update_role', 'delete_role', 'set_default_role'
]

const AUDIT_ACTION_LABEL_MAP = {
  delete_email: 'auditDeleteEmail',
  delete_attachment: 'auditDeleteAttachment',
  delete_user: 'auditDeleteUser',
  disable_user: 'auditDisableUser',
  enable_user: 'auditEnableUser',
  update_setting: 'auditUpdateSetting',
  add_role: 'auditAddRole',
  update_role: 'auditUpdateRole',
  delete_role: 'auditDeleteRole',
  set_default_role: 'auditSetDefaultRole'
}

export function auditActionLabelKey(action) {
  return AUDIT_ACTION_LABEL_MAP[action] || action
}
