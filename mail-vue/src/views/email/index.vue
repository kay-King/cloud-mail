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
    <template #first>
      <el-tooltip effect="dark" :content="$t('markSpamSelected')">
        <Icon v-perm="'email:delete'" class="icon" icon="hugeicons:mail-block-01" width="20" height="20"
              v-if="selectedIds.length > 0"
              @click="handleMarkSpamSelected"/>
      </el-tooltip>
    </template>
  </emailScroll>
</template>

<script setup>
import {useAccountStore} from "@/store/account.js";
import {useEmailStore} from "@/store/email.js";
import {useUiStore} from "@/store/ui.js";
import {useSettingStore} from "@/store/setting.js";
import {useSidebarStore} from "@/store/sidebar.js";
import emailScroll from "@/components/email-scroll/index.vue"
import {Icon} from "@iconify/vue";
import {emailList, emailDelete, emailLatest, emailMarkSpam} from "@/request/email.js";
import {useListHandlers, useSelectedIds} from "@/composables/useListHandlers.js";
import {defineOptions, onBeforeUnmount, onMounted, ref, watch} from "vue";
import {ElMessage} from "element-plus";
import {useI18n} from "vue-i18n";
import {sleep} from "@/utils/time-utils.js";
import router from "@/router/index.js";
import {
  inboxWs,
  isAutoRefreshEnabled,
} from "@/websocket/client.js";

defineOptions({
  name: 'email'
})

const emailStore = useEmailStore();
const uiStore = useUiStore();
const accountStore = useAccountStore();
const settingStore = useSettingStore();
const sidebarStore = useSidebarStore();
const {t} = useI18n()
const scroll = ref({})
const existIds = new Set();
let pullTimer = null

onMounted(() => {
  emailStore.emailScroll = scroll;
  // 收件箱实时：推送或重连后再拉 emailLatest，不按间隔轮询
  inboxWs.start({
    isEnabled: () => isAutoRefreshEnabled(settingStore.settings.autoRefresh),
    onMessage: onWsMessage,
    onReconnect: () => schedulePullLatest(),
  });
})

onBeforeUnmount(() => {
  if (pullTimer) {
    window.clearTimeout(pullTimer)
    pullTimer = null
  }
  inboxWs.stop()
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

watch(() => settingStore.settings.autoRefresh, () => {
  inboxWs.sync()
})

function onRefreshSuccess() {
  inboxWs.retryNow()
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

const selectedIds = useSelectedIds(scroll)

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

function handleMarkSpamSelected() {
  const emailIds = selectedIds.value
  if (emailIds.length > 0) {
    markSpamEmails(emailIds)
  }
}

// 推送到达：非「全部收取」时忽略其它账号的信。
function onWsMessage(event) {
  // 新邮件到达可能改变星标/垃圾箱未读数（未读数是按用户汇总的，不分当前账号）
  sidebarStore.refreshUnread()
  const allReceive = accountStore.currentAccount.allReceive
  if (!allReceive && event?.accountId != null && Number(event.accountId) !== Number(accountStore.currentAccountId)) {
    return
  }
  schedulePullLatest()
}

// 短时间多条推送合并成一次补拉。
function schedulePullLatest() {
  if (pullTimer) {
    window.clearTimeout(pullTimer)
  }
  pullTimer = window.setTimeout(() => {
    pullTimer = null
    void pullLatest()
  }, 150)
}

// 按当前列表最新 id 拉取之后的新邮件并插入。
async function pullLatest() {
  const searchParams = emailStore.searchParams
  if (searchParams.text || searchParams.startDate || searchParams.endDate) {
    return
  }

  if (scroll.value.firstLoad) {
    return
  }

  const latestId = scroll.value.latestEmail?.emailId
  const accountId = accountStore.currentAccountId
  const allReceive = scroll.value.latestEmail?.allReceive

  if (accountId !== scroll.value.latestEmail?.reqAccountId) {
    return
  }

  try {
    const list = await emailLatest(latestId, accountId, allReceive);

    if (accountId !== accountStore.currentAccountId || allReceive !== accountStore.currentAccount.allReceive) {
      return
    }

    if (list.length > 0) {
      emailStore.applyFullList(list)

      for (let email of list) {

        email.reqAccountId = accountId;
        email.allReceive = allReceive;

        if (!existIds.has(email.emailId)) {

          existIds.add(email.emailId)
          scroll.value.addItem(email)

          await sleep(50)
        }

      }

    }
  } catch (e) {
    if (e.code === 401 || e.code === 403) {
      settingStore.settings.autoRefresh = 1;
      inboxWs.sync();
    }
    console.error(e)
  }
}

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
