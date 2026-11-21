<template>
  <div class="exchanged-view">
    <!-- 标题栏：返回 + 往来对象；本视图不在侧边栏里，没有标题栏就不知道在看谁的邮件 -->
    <div class="exchanged-title">
      <Icon class="icon" icon="fluent:chevron-left-20-regular" width="20" height="20" @click="router.back()"/>
      <span class="exchanged-title-text">{{ $t('viewExchangedEmails') }}：{{ address }}</span>
    </div>
    <div class="exchanged-list-wrap">
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
                   :show-status="true"
                   :highlight-text="address"
                   actionLeft="4px"
                   @jump="jumpContent"
      />
    </div>
  </div>
</template>

<script setup>
import {useAccountStore} from "@/store/account.js";
import {useEmailStore} from "@/store/email.js";
import {useUiStore} from "@/store/ui.js";
import {useSidebarStore} from "@/store/sidebar.js";
import emailScroll from "@/components/email-scroll/index.vue"
import {Icon} from "@iconify/vue";
import {emailList, emailDelete, emailMarkSpam} from "@/request/email.js";
import {useListHandlers} from "@/composables/useListHandlers.js";
import {defineOptions, ref, watch, computed} from "vue";
import router from "@/router/index.js";
import {useRoute} from "vue-router";
import {ElMessage} from "element-plus";
import {useI18n} from "vue-i18n";

defineOptions({
  name: 'exchanged'
})

const emailStore = useEmailStore();
const uiStore = useUiStore();
const accountStore = useAccountStore();
const sidebarStore = useSidebarStore();
const {t} = useI18n()
const route = useRoute();
const scroll = ref({})

// 往来对象：发件人卡片「查看往来邮件」带过来的地址（路由守卫已保证非空）
const address = computed(() => route.query.address || '')

watch(() => accountStore.currentAccountId, () => {
  scroll.value.refreshList();
})

function getEmailList(emailId, size) {
  const accountId = accountStore.currentAccountId;
  const allReceive = accountStore.currentAccount.allReceive;
  // type=-1：收发都查（服务端 emailListFilters 已支持，回收站同款）；
  // correspondent：发件或收件地址命中对方，来信和自己发给对方的都在一页里
  return emailStore.fetchList(full =>
    emailList(accountId, allReceive, emailId, 0, size, -1, full, {type: 'correspondent', text: address.value})
  )
}

function jumpContent(email) {
  emailStore.contentData.email = emailStore.toContentEmail(email)
  emailStore.contentData.delType = 'logic'
  emailStore.contentData.showStar = true
  emailStore.contentData.showReply = true
  // 发件份没有未读概念、也不能标垃圾，按邮件类型区分（收件份照收件箱，发件份照已发送）
  emailStore.contentData.showUnread = email.type !== 1
  emailStore.contentData.showSpam = email.type !== 1
  if (uiStore.isThreePane) return
  router.push({name: 'content', params: {mailbox: 'exchanged'}})
}

// 标为垃圾：只处理收件份。列表里混着发件份，服务端会忽略它们，但 deleteIds 信号
// 会把勾选的发件份也从列表里拼掉——所以先按类型过滤，只把收件份的 id 交下去
function markSpamEmails(emailIds) {
  const ids = Array.isArray(emailIds) ? emailIds : [emailIds]
  const list = scroll.value?.emailList || []
  const receivedIds = ids.filter(id => {
    const mail = list.find(e => e.emailId === id)
    return !mail || mail.type !== 1
  })
  if (receivedIds.length === 0) return Promise.resolve()
  return emailMarkSpam(receivedIds).then(() => {
    ElMessage({
      message: t('markSpamSuccessMsg'),
      type: 'success',
      plain: true
    })
    emailStore.deleteIds = receivedIds;
    sidebarStore.refreshUnread()
  })
}

const {handleListRead, handleListUnread, handleStarAdd, handleStarCancel} = useListHandlers()

function addStar(email) {
  emailStore.starScroll?.addItem(email)
}

function cancelStar(email) {
  emailStore.starScroll?.deleteEmail([email.emailId])
}
</script>

<style>
.exchanged-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.exchanged-title {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
}
.exchanged-title .icon {
  cursor: pointer;
  flex-shrink: 0;
}
.exchanged-title-text {
  font-size: 14px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.exchanged-list-wrap {
  flex: 1;
  min-height: 0;
}
.icon {
  cursor: pointer;
}
</style>
