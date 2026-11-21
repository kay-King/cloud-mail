<template>
  <emailScroll type="trash" ref="scroll"
               :show-star="false"
               :getEmailList="getEmailList"
               :emailDelete="emailPhysicsDelete"
               :emailRestore="restoreEmails"
               :show-unread="false"
               :highlight-text="emailStore.searchParams.text"
               actionLeft="4px"
               @jump="jumpContent"
  >
    <template #first>
      <button v-perm="'email:delete'" class="toolbar-btn"
              @click="handleRestoreSelected">
        <Icon icon="fluent:arrow-undo-20-regular" width="16" height="16"/>
        <span>{{ $t('restore') }}</span>
      </button>
    </template>
    <!-- 顶栏窄了恢复按钮被收进 ⋮ 时的菜单项（跟顶栏按钮同一个操作） -->
    <template #overflow>
      <el-dropdown-item v-perm="'email:delete'" @click="handleRestoreSelected">
        <div class="right-dropdown-item">
          <Icon icon="fluent:arrow-undo-20-regular" width="20" height="20"/>
          <span>{{ $t('restore') }}</span>
        </div>
      </el-dropdown-item>
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
import {emailList, emailPhysicsDelete, emailRestore} from "@/request/email.js";
import {useSelectedIds} from "@/composables/useListHandlers.js";
import {defineOptions, onMounted, ref, watch} from "vue";
import router from "@/router/index.js";
import {ElMessage} from "element-plus";
import {useI18n} from "vue-i18n";

defineOptions({
  name: 'trash'
})

const {t} = useI18n()
const emailStore = useEmailStore();
const uiStore = useUiStore();
const accountStore = useAccountStore();
const sidebarStore = useSidebarStore();
const scroll = ref({})

const selectedIds = useSelectedIds(scroll)

onMounted(() => {
  emailStore.trashScroll = scroll;
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
  emailStore.contentData.delType = 'trash'
  emailStore.contentData.showUnread = false
  emailStore.contentData.showStar = false
  emailStore.contentData.showReply = false
  emailStore.contentData.showSpam = false
  if (uiStore.isThreePane) return
  router.push({name: 'content', params: {mailbox: 'trash'}})
}

function getEmailList(emailId, size) {
  const accountId = accountStore.currentAccountId;
  const allReceive = accountStore.currentAccount.allReceive;
  // type=-1 收发都查，del=1 只查已删除
  return emailStore.fetchList(full =>
    emailList(accountId, allReceive, emailId, 0, size, -1, full, emailStore.searchParams, 1)
  ).then(data => {
    data.latestEmail.reqAccountId = accountId;
    data.latestEmail.allReceive = allReceive;
    return data;
  })
}

function restoreEmails(emailIds) {
  return emailRestore(emailIds).then(() => {
    ElMessage({
      message: t('restoreSuccessMsg'),
      type: 'success',
      plain: true
    })
    emailStore.deleteIds = Array.isArray(emailIds) ? emailIds : [emailIds];
    sidebarStore.refreshUnread()
  })
}

function handleRestoreSelected() {
  const emailIds = selectedIds.value
  if (emailIds.length === 0) {
    ElMessage({message: t('noSelectedEmail'), type: 'warning', plain: true})
    return
  }
  restoreEmails(emailIds)
}

</script>
<style>
.icon {
  cursor: pointer;
}
</style>
