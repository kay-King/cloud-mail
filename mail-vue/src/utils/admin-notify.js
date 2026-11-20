// 管理员删除通知开关：全部邮件页与 email-scroll 各有一份，抽到这里共用。
// 开关默认开：值为 undefined/null（老缓存没这个字段）或非 0 都算开，0 为关
import {useSettingStore} from "@/store/setting.js";

export function isAdminDelNotifyEnabled() {
  const v = useSettingStore().settings.adminDelNotify
  return v === undefined || v === null || v !== 0
}
