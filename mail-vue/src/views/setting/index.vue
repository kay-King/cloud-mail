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
      <div class="forward-rule-row" v-show="forwardOn === 0">
        <el-input v-model="forwardRuleFrom" :placeholder="$t('forwardRuleFromPlaceholder')" maxlength="500" style="width: 260px"/>
        <el-input v-model="forwardRuleSubject" :placeholder="$t('forwardRuleSubjectPlaceholder')" maxlength="500" style="width: 260px"/>
      </div>
      <div class="forward-rule-tip" v-show="forwardOn === 0">{{$t('forwardRuleDesc')}}</div>
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
  </div>
    </el-scrollbar>
  </div>
</template>
<script setup>
import {reactive, ref, defineOptions, watch} from 'vue'
import {resetPassword, userDelete} from "@/request/my.js";
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
const forwardLoading = ref(false)

function loadForward() {
  const acc = accountStore.currentAccount
  forwardOn.value = acc?.forwardStatus ?? 1
  forwardTarget.value = acc?.forwardEmail || ''
  forwardRuleFrom.value = acc?.forwardRuleFrom || ''
  forwardRuleSubject.value = acc?.forwardRuleSubject || ''
}
loadForward()
watch(() => accountStore.currentAccountId, loadForward)

function saveForward() {
  const accountId = accountStore.currentAccountId
  if (!accountId) {
    ElMessage({message: t('selectAccountFirst'), type: 'warning', plain: true});
    return
  }
  const target = forwardTarget.value.trim()
  if (forwardOn.value === 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
    ElMessage({message: t('forwardEmailInvalid'), type: 'error', plain: true});
    return
  }
  forwardLoading.value = true
  const ruleFrom = forwardRuleFrom.value.trim()
  const ruleSubject = forwardRuleSubject.value.trim()
  accountSetForward(accountId, target, forwardOn.value, ruleFrom, ruleSubject).then((data) => {
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
    ElMessage({
      message: t(msgKey),
      type: ['exists', 'failed', 'no-token'].includes(status) ? 'warning' : 'success',
      plain: true,
      duration: 5000,
    });
  }).finally(() => {
    forwardLoading.value = false
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

  .forward-rule-row {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
  }

  .forward-rule-tip {
    font-size: 12px;
    color: var(--regular-text-color);
  }
}
</style>
