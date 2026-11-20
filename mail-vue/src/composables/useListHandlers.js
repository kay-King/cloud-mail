// 邮件列表视图共用的行处理函数：收件箱 / 星标 / 垃圾箱三处原来逐字重复，抽到这里。
import {computed} from "vue";
import {useSidebarStore} from "@/store/sidebar.js";
import {emailRead, emailUnread} from "@/request/email.js";
import {starAdd, starCancel} from "@/request/star.js";

// 列表里的标已读 / 标为未读 / 加星 / 取消星：成功后刷新侧边栏未读数
// （各视图按需取用：垃圾箱只用前两个，收件箱与星标四个都用）
export function useListHandlers() {
  const sidebarStore = useSidebarStore()

  function handleListRead(emailIds) {
    return emailRead(emailIds).then(() => {
      sidebarStore.refreshUnread()
    })
  }

  // 列表里的标为未读：handleListRead 的镜像
  function handleListUnread(emailIds) {
    return emailUnread(emailIds).then(() => {
      sidebarStore.refreshUnread()
    })
  }

  function handleStarAdd(emailId) {
    return starAdd(emailId).then(() => {
      sidebarStore.refreshUnread()
    })
  }

  function handleStarCancel(emailId) {
    return starCancel(emailId).then(() => {
      sidebarStore.refreshUnread()
    })
  }

  return {handleListRead, handleListUnread, handleStarAdd, handleStarCancel}
}

// 勾选的邮件 id 列表：基于 email-scroll 暴露的 emailList（收件箱 / 垃圾箱 / 回收站三处共用）
export function useSelectedIds(scroll) {
  return computed(() => {
    const list = scroll.value?.emailList || []
    return list.filter(e => e.checked).map(e => e.emailId)
  })
}
