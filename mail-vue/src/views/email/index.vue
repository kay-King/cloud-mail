<template>
  <emailScroll ref="scroll"
               :cancel-success="cancelStar"
               :star-success="addStar"
               :getEmailList="getEmailList"
               :emailDelete="emailDelete"
               :email-spam="markSpamEmails"
               :star-add="handleStarAdd"
               :star-cancel="handleStarCancel"
               :email-read="handleListRead"
               :email-unread="handleListUnread"
               :show-unread="true"
               :highlight-text="emailStore.searchParams.text"
               actionLeft="4px"
               @jump="jumpContent"
               @refresh-success="onRefreshSuccess"
  >
  </emailScroll>
</template>

<script setup>
import {useAccountStore} from "@/store/account.js";
import {useEmailStore} from "@/store/email.js";
import {useUiStore} from "@/store/ui.js";
import {useSidebarStore} from "@/store/sidebar.js";
import emailScroll from "@/components/email-scroll/index.vue"
import {emailList, emailDelete, emailMarkSpam} from "@/request/email.js";
import {useListHandlers} from "@/composables/useListHandlers.js";
import {defineOptions, onMounted, ref, watch} from "vue";
import {ElMessage} from "element-plus";
import {useI18n} from "vue-i18n";
import router from "@/router/index.js";
import { retryInboxWsNow } from "@/websocket/inbox-sync.js";

defineOptions({
  name: 'email'
})

const emailStore = useEmailStore();
const uiStore = useUiStore();
const accountStore = useAccountStore();
const sidebarStore = useSidebarStore();
const {t} = useI18n()
const scroll = ref({})

onMounted(() => {
  emailStore.emailScroll = scroll;
})


watch(() => accountStore.currentAccountId, () => {
  scroll.value.refreshList();
})

watch(
  () => emailStore.searchParams,
  () => {
    scroll.value.refreshList()
  },
  {deep: true}
)


function onRefreshSuccess() {
  retryInboxWsNow()
}

function jumpContent(email) {
  emailStore.contentData.email = emailStore.toContentEmail(email)
  emailStore.contentData.delType = 'logic'
  emailStore.contentData.showUnread = true
  emailStore.contentData.showStar = true
  emailStore.contentData.showReply = true
  emailStore.contentData.showSpam = true
  if (uiStore.isThreePane) return
  router.push({name: 'content', params: {mailbox: 'inbox'}})
}

function markSpamEmails(emailIds) {
  return emailMarkSpam(emailIds).then(() => {
    ElMessage({
      message: t('markSpamSuccessMsg'),
      type: 'success',
      plain: true
    })
    emailStore.deleteIds = Array.isArray(emailIds) ? emailIds : [emailIds];
    // 标垃圾会改变垃圾箱未读数，「有未读时显示」的垃圾箱靠它决定显隐
    sidebarStore.refreshUnread()
  })
}

// 列表里的标已读 / 标为未读 / 星标切换：成功后刷新侧边栏未读数（与星标/垃圾箱视图共用）
const {handleListRead, handleListUnread, handleStarAdd, handleStarCancel} = useListHandlers()


function addStar(email) {
  emailStore.starScroll?.addItem(email)
}

function cancelStar(email) {
  emailStore.starScroll?.deleteEmail([email.emailId])
}

function getEmailList(emailId, size) {
  const accountId =  accountStore.currentAccountId;
  const allReceive = accountStore.currentAccount.allReceive;
  return emailStore.fetchList(full =>
    emailList(accountId, allReceive, emailId, 0, size, 0, full, emailStore.searchParams)
  ).then(data => {
    data.latestEmail.reqAccountId = accountId;
    data.latestEmail.allReceive = allReceive;
    return data;
  })
}

</script>
<style>
.icon {
  cursor: pointer;
}
</style>
