<template>
  <emailScroll type="star" ref="scroll"
               :allow-star="false"
               :cancel-success="cancelStar"
               :getEmailList="getEmailList"
               :emailDelete="emailDelete"
               :email-read="handleListRead"
               :email-unread="handleListUnread"
               :show-unread="true"
               :star-add="handleStarAdd"
               :star-cancel="handleStarCancel"
               @jump="jumpContent"
               actionLeft="6px"
               :show-account-icon="false"
  />
</template>

<script setup>
import emailScroll from "@/components/email-scroll/index.vue"
import {emailDelete, emailRead, emailUnread} from "@/request/email.js";
import {starAdd, starCancel, starList} from "@/request/star.js";
import {useEmailStore} from "@/store/email.js";
import {useUiStore} from "@/store/ui.js";
import {useSidebarStore} from "@/store/sidebar.js";
import {defineOptions, onMounted, ref} from "vue";
import router from "@/router/index.js";

defineOptions({
  name: 'star'
})

const scroll = ref({})
const emailStore = useEmailStore();
const uiStore = useUiStore();
const sidebarStore = useSidebarStore();

// 列表里的标已读 / 星标切换：成功后刷新侧边栏未读数
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

function jumpContent(email) {
  emailStore.contentData.email = emailStore.toContentEmail(email)
  emailStore.contentData.delType = 'logic'
  // 星标邮件也要点开即标已读（原来没设，点开不标已读，「有未读时显示」的星标读完也不消失）
  emailStore.contentData.showUnread = true
  emailStore.contentData.showStar = true
  emailStore.contentData.showReply = true
  if (uiStore.isThreePane) return
  router.push({name: 'content', params: {mailbox: 'starred'}})
}

function getEmailList(emailId, size) {
  return emailStore.fetchList(full => starList(emailId, size, full))
}

function cancelStar(email) {
  emailStore.cancelStarEmailId = email.emailId
  scroll.value.deleteEmail([email.emailId])
}

onMounted(() => {
  emailStore.starScroll = scroll
})

</script>
