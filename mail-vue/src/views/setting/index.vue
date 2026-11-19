<template>
  <div class="settings-page">
    <el-scrollbar height="100%">
  <div class="box">
    <div class="container">
      <div class="title">{{$t('profile')}}</div>
      <div class="item setting-row">
        <div>{{$t('username')}}</div>
        <div>
          <span v-if="setNameShow" class="edit-name-input">
            <el-input v-model="accountName"  ></el-input>
            <span class="edit-name" @click="setName">
             {{$t('save')}}
            </span>
          </span>
          <span v-else class="user-name">
            <span >{{ userStore.user.name }}</span>
            <span class="edit-name" @click="showSetName">
             {{$t('change')}}
            </span>
          </span>
        </div>
      </div>
      <div class="item setting-row">
        <div>{{$t('emailAccount')}}</div>
        <div>{{ userStore.user.email }}</div>
      </div>
      <div class="item setting-row">
        <div>{{$t('password')}}</div>
        <div>
          <el-button type="primary" @click="pwdShow = true">{{$t('changePwdBtn')}}</el-button>
        </div>
      </div>
    </div>
    <div class="language">
      <div class="title">{{$t('language')}}</div>
      <div class="language-row setting-row">
        <div>{{$t('preferredLanguage')}}</div>
        <el-select
            :model-value="langSelect"
            class="language-select"
            placeholder="Select"
            @change="changeLang"
        >
          <el-option label="中文" value="zh" @pointerdown.prevent.stop="changeLang('zh')"/>
          <el-option label="English" value="en" @pointerdown.prevent.stop="changeLang('en')"/>
        </el-select>
      </div>
    </div>
    <div class="preference-item">
      <div class="title" id="theme-label">{{$t('themeStyle')}}</div>
      <ThemeSelector/>
    </div>
    <div class="preference-item">
      <div class="title">{{$t('noticeTitle')}}</div>
      <div class="language-row setting-row">
        <div>{{$t('noticeInfo')}}</div>
        <div>
          <el-button @click="uiStore.showNotice()">{{$t('viewNotice')}}</el-button>
        </div>
      </div>
    </div>
    <div class="preference-item">
      <div class="title">{{$t('importMail')}}</div>
      <div style="color: var(--regular-text-color);">
        {{$t('importMailDesc')}}
      </div>
      <div>
        <el-button type="primary" :loading="importLoading" @click="openImport">{{$t('importMail')}}</el-button>
        <input ref="importRef" type="file" accept=".eml,.zip" multiple style="display: none" @change="onImportFiles"/>
      </div>
    </div>
    <div class="preference-item">
      <div class="title">{{$t('accountForward')}}</div>
      <div style="color: var(--regular-text-color);">
        {{$t('accountForwardDesc', { email: accountStore.currentAccount?.email || '' })}}
      </div>
      <div class="forward-row">
        <el-switch v-model="forwardOn" :active-value="0" :inactive-value="1"/>
        <el-input v-model="forwardTarget" :placeholder="$t('forwardTargetPlaceholder')" :disabled="forwardOn === 1" style="width: 260px"/>
        <el-button type="primary" :loading="forwardLoading" @click="saveForward">{{$t('save')}}</el-button>
      </div>
      <div class="forward-rule-summary" v-show="forwardOn === 0">
        <span class="forward-rule-label">{{ $t('forwardRuleTitle') }}</span>
        <span class="forward-rule-summary-text">{{ forwardRuleSummary }}</span>
        <el-button @click="openForwardRule">{{ $t('forwardRuleSettings') }}</el-button>
      </div>
    </div>
    <div class="preference-item">
      <div class="title">{{$t('blackList')}}</div>
      <div style="color: var(--regular-text-color);">
        {{$t('blackListDesc')}}{{$t('personalBlackListTip')}}
      </div>
      <div class="forward-rule-summary">
        <span class="forward-rule-summary-text">{{ blackListSummary }}</span>
        <el-button @click="openBlackList">{{ $t('blackListSettings') }}</el-button>
      </div>
    </div>
    <div class="preference-item">
      <div class="title">{{$t('interfaceDisplay')}}</div>
      <div style="color: var(--regular-text-color);">
        {{$t('sidebarTip')}}
      </div>
      <div ref="sidebarListRef" class="sidebar-list">
        <div v-for="key in sidebarOrder" :key="key" class="sidebar-row">
          <Icon icon="mdi:drag-vertical" width="20" height="20" class="sidebar-drag-handle" />
          <span class="sidebar-row-name">{{ sidebarItemLabel(key) }}</span>
          <span v-if="!isSidebarHideable(key)" class="sidebar-must-show">{{ $t('mustShow') }}</span>
          <el-switch v-else :model-value="!sidebarStore.hidden.includes(key)" @change="onSidebarToggle(key, $event)" />
        </div>
      </div>
    </div>
    <div class="del-email" v-perm="'my:delete'">
      <div class="title">{{$t('deleteUser')}}</div>
      <div style="color: var(--regular-text-color);">
        {{$t('delAccountMsg')}}
      </div>
      <div>
        <el-button type="primary" @click="deleteConfirm">{{$t('deleteUserBtn')}}</el-button>
      </div>
    </div>
    <el-dialog v-model="pwdShow" :title="$t('changePassword')" width="340">
      <div class="update-pwd">
        <el-input type="password" :placeholder="$t('newPassword')" v-model="form.password" autocomplete="off" @keyup.enter="submitPwd"/>
        <el-input type="password" :placeholder="$t('confirmPassword')" v-model="form.newPwd" autocomplete="off" @keyup.enter="submitPwd"/>
        <el-button type="primary" :loading="setPwdLoading" @click="submitPwd">{{$t('save')}}</el-button>
      </div>
    </el-dialog>
    <el-dialog v-model="forwardRuleShow" class="forward-rule-dialog" :title="$t('forwardRuleTitle')">
      <div class="forward-rule-body">
        <el-input v-model="ruleDraftFrom" :placeholder="$t('forwardRuleFromPlaceholder')" maxlength="500" @keyup.enter="saveForwardRule"/>
        <el-input v-model="ruleDraftSubject" :placeholder="$t('forwardRuleSubjectPlaceholder')" maxlength="500" @keyup.enter="saveForwardRule"/>
        <div class="forward-rule-tip">{{$t('forwardRuleDesc')}}</div>
        <el-checkbox v-model="ruleDraftApplyAll">{{$t('forwardApplyAll')}}</el-checkbox>
      </div>
      <template #footer>
        <el-button @click="forwardRuleShow = false">{{$t('cancel')}}</el-button>
        <el-button type="primary" :loading="forwardLoading" @click="saveForwardRule">{{$t('save')}}</el-button>
      </template>
    </el-dialog>
    <el-dialog v-model="blackListShow" class="forward-rule-dialog" :title="$t('blackList')">
      <el-form>
        <el-form-item :label="t('blackFromDesc')" label-position="top">
          <el-input-tag v-model="blackListDraft.blackFrom" :placeholder="t('blackFromPlaceholder')"/>
        </el-form-item>
        <el-form-item :label="t('blackSubjectDesc')" label-position="top">
          <el-input-tag v-model="blackListDraft.blackSubject" :placeholder="t('blackSubjectPlaceholder')"/>
        </el-form-item>
        <el-form-item :label="t('blackContentDesc')" label-position="top">
          <el-input-tag v-model="blackListDraft.blackContent" :placeholder="t('blackContentPlaceholder')"/>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="blackListShow = false">{{$t('cancel')}}</el-button>
        <el-button type="primary" :loading="blackListLoading" @click="savePersonalBlackList">{{$t('save')}}</el-button>
      </template>
    </el-dialog>
  </div>
    </el-scrollbar>
  </div>
</template>
<script setup>
import {reactive, ref, computed, defineOptions, watch, onMounted, onBeforeUnmount, nextTick} from 'vue'
import {resetPassword, userDelete, getSpamBlocklist, setSpamBlocklist} from "@/request/my.js";
import {useUserStore} from "@/store/user.js";
import router from "@/router/index.js";
import {accountSetName, accountSetForward} from "@/request/account.js";
import {useAccountStore} from "@/store/account.js";
import {useI18n} from "vue-i18n";
import {useSettingStore} from "@/store/setting.js";
import {useUiStore} from "@/store/ui.js";
import ThemeSelector from "@/components/theme-selector/index.vue";
import {emailImport} from "@/request/email.js";
import {useEmailStore} from "@/store/email.js";
import {Icon} from "@iconify/vue";
import Sortable from "@/assets/sortable.esm.js";
import {useSidebarStore, SIDEBAR_DEFAULT_ORDER, SIDEBAR_HIDEABLE} from "@/store/sidebar.js";

const { t } = useI18n()
const accountStore = useAccountStore()
const settingStore = useSettingStore()
const uiStore = useUiStore()
const userStore = useUserStore();
const emailStore = useEmailStore();
const importRef = ref(null)
const importLoading = ref(false)

function openImport() {
  importRef.value?.click();
}

function onImportFiles(e) {
  const files = Array.from(e.target.files || []);
  e.target.value = '';
  if (files.length === 0) return;
  const accountId = accountStore.currentAccountId;
  if (!accountId) {
    ElMessage({message: t('selectAccountFirst'), type: 'warning', plain: true});
    return;
  }
  importLoading.value = true
  emailImport(accountId, files).then(summary => {
    ElMessage({
      message: t('importResult', {imported: summary.imported, skipped: summary.skipped, failed: summary.failed}),
      type: summary.failed > 0 ? 'warning' : 'success',
      plain: true,
    });
    if (summary.imported > 0) {
      emailStore.emailScroll?.refreshList();
    }
  }).catch(err => {
    console.error(err);
    ElMessage({message: err?.message || t('importFailed'), type: 'error', plain: true});
  }).finally(() => {
    importLoading.value = false
  });
}
const setPwdLoading = ref(false)
const setNameShow = ref(false)
const accountName = ref(null)
const langSelect = ref(settingStore.lang)

// 邮件转发：针对当前邮箱
const forwardOn = ref(1)
const forwardTarget = ref('')
const forwardRuleFrom = ref('')
const forwardRuleSubject = ref('')
const forwardApplyAll = ref(false)
const forwardLoading = ref(false)

// 个人黑名单：针对当前登录用户（所有邮箱通用），与系统黑名单任一命中都进垃圾箱
// 行内只留摘要，三个输入框收进弹窗（跟转发规则一个做法）
const personalBlackList = ref({ blackFrom: [], blackSubject: [], blackContent: [] })
const blackListLoading = ref(false)
const blackListShow = ref(false)
const blackListDraft = ref({ blackFrom: [], blackSubject: [], blackContent: [] })
const blackListSummary = computed(() => {
  const total = personalBlackList.value.blackFrom.length + personalBlackList.value.blackSubject.length + personalBlackList.value.blackContent.length
  return total === 0 ? t('blackListEmpty') : t('blackListCount', { count: total })
})

onMounted(() => {
  getSpamBlocklist().then(data => {
    personalBlackList.value = {
      blackFrom: data.blackFrom ? data.blackFrom.split(',').filter(Boolean) : [],
      blackSubject: data.blackSubject ? data.blackSubject.split(',').filter(Boolean) : [],
      blackContent: data.blackContent ? data.blackContent.split(',').filter(Boolean) : []
    }
  })
})

function openBlackList() {
  blackListDraft.value = {
    blackFrom: [...personalBlackList.value.blackFrom],
    blackSubject: [...personalBlackList.value.blackSubject],
    blackContent: [...personalBlackList.value.blackContent]
  }
  blackListShow.value = true
}

function savePersonalBlackList() {
  blackListLoading.value = true
  setSpamBlocklist({
    blackFrom: blackListDraft.value.blackFrom + '',
    blackSubject: blackListDraft.value.blackSubject + '',
    blackContent: blackListDraft.value.blackContent + ''
  }).then(() => {
    personalBlackList.value = {
      blackFrom: [...blackListDraft.value.blackFrom],
      blackSubject: [...blackListDraft.value.blackSubject],
      blackContent: [...blackListDraft.value.blackContent]
    }
    blackListShow.value = false
    ElMessage({ message: t('setSuccess'), type: 'success', plain: true })
  }).finally(() => {
    blackListLoading.value = false
  })
}

// 界面与显示：侧边栏个人区 9 个条目，拖动排序 + 开关显隐，改完立即保存（侧边栏实时跟着变）
// 列表用本地副本：拖动时先改本地，拖完再写回 store 并保存，避免 Sortable 的 DOM 移动与 Vue 渲染打架
const sidebarStore = useSidebarStore()
const sidebarListRef = ref(null)
const sidebarOrder = ref([...SIDEBAR_DEFAULT_ORDER])
let sidebarSortable = null
const sidebarItemLabels = {
  email: 'inbox', send: 'sent', draft: 'drafts', star: 'starred', spam: 'spam',
  trash: 'trash', attachments: 'myAttachments', contacts: 'contacts', setting: 'settings'
}
function sidebarItemLabel(key) {
  return t(sidebarItemLabels[key] || key)
}
function isSidebarHideable(key) {
  return SIDEBAR_HIDEABLE.includes(key)
}
// 保存失败：提示并从服务器重载，把本地与侧边栏都恢复成服务器的样子
function revertSidebarConfig() {
  ElMessage({ message: t('saveFailed'), type: 'error', plain: true })
  sidebarStore.load(true).then(() => {
    sidebarOrder.value = [...sidebarStore.order]
  })
}
function onSidebarToggle(key, show) {
  sidebarStore.setHidden(key, !show)
  sidebarStore.save().catch(revertSidebarConfig)
}
function onSidebarDragEnd(evt) {
  const { oldIndex, newIndex } = evt
  if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) {
    return
  }
  const order = [...sidebarOrder.value]
  const [moved] = order.splice(oldIndex, 1)
  order.splice(newIndex, 0, moved)
  sidebarOrder.value = order
  sidebarStore.order = order
  sidebarStore.save().catch(revertSidebarConfig)
}

onMounted(() => {
  sidebarStore.load().then(() => {
    sidebarOrder.value = [...sidebarStore.order]
    return nextTick()
  }).then(() => {
    if (!sidebarListRef.value) {
      return
    }
    // 拖动只从把手开始（手机上点别处仍可滚动列表）；触摸延迟 120ms，避免一碰就拖
    sidebarSortable = new Sortable(sidebarListRef.value, {
      handle: '.sidebar-drag-handle',
      animation: 150,
      delay: 120,
      delayOnTouchOnly: true,
      ghostClass: 'sidebar-drag-ghost',
      onEnd: onSidebarDragEnd
    })
  }).catch(err => console.error('sidebar drag init failed', err))
})

onBeforeUnmount(() => {
  sidebarSortable?.destroy?.()
  sidebarSortable = null
})

// 转发规则弹窗：弹窗里改草稿，点保存才写回并提交；取消则丢弃
const forwardRuleShow = ref(false)
const ruleDraftFrom = ref('')
const ruleDraftSubject = ref('')
const ruleDraftApplyAll = ref(false)
const forwardRuleSummary = computed(() => {
  const hasRule = forwardRuleFrom.value.trim() || forwardRuleSubject.value.trim()
  return hasRule ? t('forwardRuleFiltered') : t('forwardAll')
})

function openForwardRule() {
  ruleDraftFrom.value = forwardRuleFrom.value
  ruleDraftSubject.value = forwardRuleSubject.value
  ruleDraftApplyAll.value = forwardApplyAll.value
  forwardRuleShow.value = true
}

function saveForwardRule() {
  forwardRuleFrom.value = ruleDraftFrom.value.trim()
  forwardRuleSubject.value = ruleDraftSubject.value.trim()
  forwardApplyAll.value = ruleDraftApplyAll.value
  saveForward().then((ok) => {
    if (ok) forwardRuleShow.value = false
  }).catch(() => {
  })
}

function loadForward() {
  const acc = accountStore.currentAccount
  forwardOn.value = acc?.forwardStatus ?? 1
  forwardTarget.value = acc?.forwardEmail || ''
  forwardRuleFrom.value = acc?.forwardRuleFrom || ''
  forwardRuleSubject.value = acc?.forwardRuleSubject || ''
  forwardApplyAll.value = false
}
loadForward()
watch(() => accountStore.currentAccountId, loadForward)

function saveForward() {
  const accountId = accountStore.currentAccountId
  if (!accountId) {
    ElMessage({message: t('selectAccountFirst'), type: 'warning', plain: true});
    return Promise.resolve(false)
  }
  const target = forwardTarget.value.trim()
  if (forwardOn.value === 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
    ElMessage({message: t('forwardEmailInvalid'), type: 'error', plain: true});
    return Promise.resolve(false)
  }
  forwardLoading.value = true
  const ruleFrom = forwardRuleFrom.value.trim()
  const ruleSubject = forwardRuleSubject.value.trim()
  const applyAll = forwardApplyAll.value
  return accountSetForward(accountId, target, forwardOn.value, ruleFrom, ruleSubject, applyAll).then((data) => {
    if (accountStore.currentAccount) {
      accountStore.currentAccount.forwardEmail = forwardOn.value === 0 ? target : ''
      accountStore.currentAccount.forwardStatus = forwardOn.value
      accountStore.currentAccount.forwardRuleFrom = ruleFrom
      accountStore.currentAccount.forwardRuleSubject = ruleSubject
    }
    // 开启转发时按自动添加的结果提示验证步骤；关闭时只提示已保存
    const status = data?.verifyStatus
    const msgKey = {
      added: 'forwardVerifyAdded',
      exists: 'forwardVerifyExists',
      verified: 'forwardVerifyVerified',
      failed: 'forwardVerifyFailed',
      'no-token': 'forwardVerifyManual',
    }[status] || 'saveSuccessMsg'
    let message = t(msgKey)
    const appliedCount = data?.appliedCount || 1
    if (appliedCount > 1) {
      message += t('forwardAppliedAll', { count: appliedCount - 1 })
    }
    ElMessage({
      message,
      type: ['exists', 'failed', 'no-token'].includes(status) ? 'warning' : 'success',
      plain: true,
      duration: 5000,
    });
    return true
  }).finally(() => {
    forwardLoading.value = false
    forwardApplyAll.value = false
  })
}

defineOptions({
  name: 'setting'
})

function showSetName() {
  accountName.value = userStore.user.name
  setNameShow.value = true
}

function setName() {

  if (!accountName.value) {
    ElMessage({
      message: t('emptyUserNameMsg'),
      type: 'error',
      plain: true,
    })
    return;
  }

  setNameShow.value = false
  let name = accountName.value

  if (name === userStore.user.name) {
    return
  }

  userStore.user.name = accountName.value

  accountSetName(userStore.user.account.accountId,name).then(() => {
    ElMessage({
      message: t('saveSuccessMsg'),
      type: 'success',
      plain: true,
    })

    accountStore.changeUserAccountName = name

  }).catch(() => {
    userStore.user.name = name
  })
}

function changeLang(lang) {
  let setting = {}
  try {
    setting = JSON.parse(localStorage.getItem('setting') || '{}')
  } catch (e) {
    setting = {}
  }
  localStorage.setItem('setting', JSON.stringify({...setting, lang}))
  window.location.reload()
}

const pwdShow = ref(false)
const form = reactive({
  password: '',
  newPwd: '',
})

const deleteConfirm = () => {
  ElMessageBox.confirm(t('delAccountConfirm'), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    userDelete().then(() => {
      localStorage.removeItem('token');
      router.replace('/login');
      ElMessage({
        message: t('delSuccessMsg'),
        type: 'success',
        plain: true,
      })
    })
  })
}


function submitPwd() {

  if (setPwdLoading.value) return

  if (!form.password) {
    ElMessage({
      message: t('emptyPwdMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (form.password.length < 6) {
    ElMessage({
      message: t('pwdLengthMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (form.password !== form.newPwd) {
    ElMessage({
      message: t('confirmPwdFailMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  setPwdLoading.value = true
  resetPassword(form.password).then(() => {
    ElMessage({
      message: t('saveSuccessMsg'),
      type: 'success',
      plain: true,
    })
    pwdShow.value = false
    setPwdLoading.value = false
    form.password = ''
    form.newPwd = ''
  }).catch(() => {
    setPwdLoading.value = false
  })

}

</script>
<style scoped lang="scss">
.settings-page {
  height: 100%;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}

.box {
  padding: 40px 40px;

  @media (max-width: 767px) {
    padding: 30px 30px;
  }

  .update-pwd {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .title {
    font-size: 18px;
    font-weight: bold;
  }

  .container {
    font-size: 14px;
    display: grid;
    gap: 20px;
    margin-bottom: 40px;

    .item {
      position: relative;
      .user-name {
        display: grid;
        grid-template-columns: minmax(0, auto) max-content;
        justify-content: start;
        align-items: center;
        span:first-child {
          min-width: 0;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }
      }

      .edit-name-input {
        position: absolute;
        bottom: -6px;
        .el-input {
          width: min(200px,calc(100vw - 222px));
        }
      }

      .edit-name {
        color: var(--el-color-primary-light-3);
        padding-left: 10px;
        white-space: nowrap;
        cursor: pointer;
      }

    }
  }

  .preference-item,
  .language {
    display: flex;
    flex-direction: column;
    gap: 20px;
    margin-bottom: 40px;
    align-items: flex-start;

  }

  .setting-row {
    width: 100%;
    display: grid;
    grid-template-columns: 120px 220px;
    align-items: center;
    column-gap: 110px;
    font-size: 14px;

    > div:first-child {
      font-weight: bold;
      min-width: 0;
      text-align: left;
    }

    > div:last-child {
      min-width: 0;
      overflow: hidden;
      text-align: left;
    }

    @media (max-width: 767px) {
      grid-template-columns: 120px minmax(0, 1fr);
      column-gap: 24px;
    }
  }

  .language-select {
    width: 110px;
    max-width: 100%;
  }

  .del-email {
    font-size: 14px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .forward-row {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
  }

  .forward-rule-summary {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .forward-rule-label {
    flex-shrink: 0;
    color: var(--regular-text-color);
  }

  .forward-rule-summary-text {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  // 界面与显示：侧边栏条目列表（拖动排序 + 开关显隐）
  .sidebar-list {
    width: 100%;
    max-width: 420px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .sidebar-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: 6px;
    font-size: 14px;
    background: var(--el-fill-color-light);
  }

  .sidebar-drag-handle {
    flex-shrink: 0;
    color: var(--regular-text-color);
    cursor: grab;
    // 把手上禁止触摸滚动，手机上按住把手拖动时页面不会跟着滑
    touch-action: none;
  }

  .sidebar-row-name {
    flex: 1;
    min-width: 0;
  }

  .sidebar-must-show {
    font-size: 12px;
    color: var(--regular-text-color);
  }

  .sidebar-drag-ghost {
    opacity: 0.4;
  }
}

// 转发规则弹窗：内容被传送到 body 下，样式须挂在弹窗根类上，不能放在 .box 里
.forward-rule-dialog {
  .forward-rule-body {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .forward-rule-tip {
    font-size: 12px;
    color: var(--regular-text-color);
  }
}

:deep(.forward-rule-dialog.el-dialog) {
  width: 500px !important;
  @media (max-width: 540px) {
    width: calc(100% - 40px) !important;
    margin-right: 20px !important;
    margin-left: 20px !important;
  }
}
</style>
