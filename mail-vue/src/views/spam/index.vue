<template>
  <emailScroll type="spam" ref="scroll"
               :show-star="false"
               :getEmailList="getEmailList"
               :emailDelete="emailDelete"
               :emailRestore="unmarkSpamEmails"
               :email-read="handleListRead"
               :email-unread="handleListUnread"
               :show-unread="true"
               :highlight-text="emailStore.searchParams.text"
               actionLeft="4px"
               @jump="jumpContent"
  >
    <template #first>
      <el-tooltip effect="dark" :content="$t('unspamSelected')">
        <Icon v-perm="'email:delete'" class="icon" icon="mdi:restore" width="20" height="20"
              v-if="selectedIds.length > 0"
              @click="handleUnspamSelected"/>
      </el-tooltip>
      <el-tooltip effect="dark" :content="$t('clearSpam')">
        <Icon v-perm="'email:delete'" class="icon" icon="fluent:delete-24-regular" width="20" height="20"
              v-if="spamCount > 0"
              @click="handleClearSpam"/>
      </el-tooltip>
    </template>
  </emailScroll>
</template>

<script setup>
import {useAccountStore} from "@/store/account.js";
import {useEmailStore} from "@/store/email.js";
import {useUiStore} from "@/store/ui.js";
import {useSidebarStore} from "@/store/sidebar.js";
import emailScroll from "@/components/email-scroll/index.vue"
import {Icon} from "@iconify/vue";
import {emailList, emailDelete, emailUnmarkSpam, emailClearSpam, emailRead, emailUnread} from "@/request/email.js";
import {defineOptions, onMounted, ref, watch, computed} from "vue";
import router from "@/router/index.js";
import {ElMessage, ElMessageBox} from "element-plus";
import {useI18n} from "vue-i18n";

defineOptions({
  name: 'spam'
})

const {t} = useI18n()
const emailStore = useEmailStore();
const uiStore = useUiStore();
const accountStore = useAccountStore();
const sidebarStore = useSidebarStore();
const scroll = ref({})

// 列表里的标已读：成功后刷新侧边栏未读数
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

const selectedIds = computed(() => {
  const list = scroll.value?.emailList || []
  return list.filter(e => e.checked).map(e => e.emailId)
})

const spamCount = computed(() => {
  return (scroll.value?.emailList || []).length
})

onMounted(() => {
  emailStore.spamScroll = scroll;
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

function jumpContent(email) {
  emailStore.contentData.email = emailStore.toContentEmail(email)
  emailStore.contentData.delType = 'spam'
  // 垃圾箱的邮件也要点开即标已读（原来是 false，点开不标已读，「有未读时显示」的垃圾箱读完也不消失）
  emailStore.contentData.showUnread = true
  emailStore.contentData.showStar = false
  emailStore.contentData.showReply = false
  if (uiStore.isThreePane) return
  router.push({name: 'content', params: {mailbox: 'spam'}})
}

function getEmailList(emailId, size) {
  const accountId = accountStore.currentAccountId;
  const allReceive = accountStore.currentAccount.allReceive;
  // type=0 只查收到的，spam=1 只查垃圾
  return emailStore.fetchList(full =>
    emailList(accountId, allReceive, emailId, 0, size, 0, full, emailStore.searchParams, 0, 1)
  ).then(data => {
    data.latestEmail.reqAccountId = accountId;
    data.latestEmail.allReceive = allReceive;
    return data;
  })
}

function unmarkSpamEmails(emailIds) {
  return emailUnmarkSpam(emailIds).then(() => {
    ElMessage({
      message: t('unspamSuccessMsg'),
      type: 'success',
      plain: true
    })
    emailStore.deleteIds = Array.isArray(emailIds) ? emailIds : [emailIds];
    // 移出垃圾箱会改变垃圾箱未读数
    sidebarStore.refreshUnread()
  })
}

function handleUnspamSelected() {
  const emailIds = selectedIds.value
  if (emailIds.length > 0) {
    unmarkSpamEmails(emailIds)
  }
}

function handleClearSpam() {
  ElMessageBox.confirm(t('clearSpamConfirm'), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    const accountId = accountStore.currentAccountId;
    const allReceive = accountStore.currentAccount.allReceive;
    emailClearSpam(accountId, allReceive).then(() => {
      ElMessage({
        message: t('clearSpamSuccessMsg'),
        type: 'success',
        plain: true
      })
      scroll.value.refreshList();
      // 清空垃圾箱后未读数归零
      sidebarStore.refreshUnread()
    })
  })
}

</script>
<style>
.icon {
  cursor: pointer;
}
</style>
