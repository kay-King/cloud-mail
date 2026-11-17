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
      <el-tooltip effect="dark" :content="$t('restoreSelected')">
        <Icon v-perm="'email:delete'" class="icon" icon="mdi:restore" width="20" height="20"
              v-if="selectedIds.length > 0"
              @click="handleRestoreSelected"/>
      </el-tooltip>
    </template>
  </emailScroll>
</template>

<script setup>
import {useAccountStore} from "@/store/account.js";
import {useEmailStore} from "@/store/email.js";
import emailScroll from "@/components/email-scroll/index.vue"
import {Icon} from "@iconify/vue";
import {emailList, emailPhysicsDelete, emailRestore} from "@/request/email.js";
import {defineOptions, onMounted, ref, watch, computed} from "vue";
import router from "@/router/index.js";
import {ElMessage} from "element-plus";
import {useI18n} from "vue-i18n";

defineOptions({
  name: 'trash'
})

const {t} = useI18n()
const emailStore = useEmailStore();
const accountStore = useAccountStore();
const scroll = ref({})

const selectedIds = computed(() => {
  const list = scroll.value?.emailList || []
  return list.filter(e => e.checked).map(e => e.emailId)
})

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
  })
}

function handleRestoreSelected() {
  const emailIds = selectedIds.value
  if (emailIds.length > 0) {
    restoreEmails(emailIds)
  }
}

</script>
<style>
.icon {
  cursor: pointer;
}
</style>
