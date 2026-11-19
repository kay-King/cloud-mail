<template>
  <div class="settings-container">
    <div class="loading" :class="firstLoading ? 'loading-show' : 'loading-hide'">
      <loading/>
    </div>
    <el-scrollbar class="scroll" v-if="!firstLoading">
      <div class="scroll-body">
        <div class="card-grid">
          <!-- Basic Settings Card -->
          <div class="settings-card">
            <div class="card-title">{{ $t('websiteSetting') }}</div>
            <div class="card-content">
              <div class="setting-item">
                <div><span>{{ $t('websiteReg') }}</span></div>
                <div>
                  <el-switch @change="change" :before-change="beforeChange" :active-value="0" :inactive-value="1"
                             v-model="setting.register"/>
                </div>
              </div>
              <div class="setting-item">
                <div><span>{{ $t('loginDomain') }}</span></div>
                <div>
                  <el-switch @change="change" :before-change="beforeChange" :active-value="1" :inactive-value="0"
                             v-model="setting.loginDomain"/>
                </div>
              </div>
              <div class="setting-item">
                <div><span>{{ $t('regKey') }}</span></div>
                <div>
                  <el-select
                      @change="change"
                      :style="`width: ${ locale === 'en' ?  100 : 80 }px;`"
                      v-model="setting.regKey"
                      placeholder="Select"
                  >
                    <el-option
                        v-for="item in regKeyOptions"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value"
                    />
                  </el-select>
                </div>
              </div>
              <div class="setting-item">
                <div><span>{{ $t('addAccount') }}</span></div>
                <div>
                  <el-switch @change="change" :before-change="beforeChange" :active-value="0" :inactive-value="1"
                             v-model="setting.addEmail"/>
                </div>
              </div>
              <div class="setting-item">
                <div>
                  <span>{{ $t('multipleEmail') }}</span>
                  <el-tooltip effect="dark" :content="$t('multipleEmailDesc')">
                    <Icon class="warning" icon="fe:warning" width="18" height="18"/>
                  </el-tooltip>
                </div>
                <div>
                  <el-switch @change="change" :before-change="beforeChange" :active-value="0" :inactive-value="1"
                             v-model="setting.manyEmail"/>
                </div>
              </div>
              <div class="setting-item">
                <div>
                  <span>{{ $t('syncDelete') }}</span>
                  <el-tooltip effect="dark" :content="$t('syncDeleteDesc')">
                    <Icon class="warning" icon="fe:warning" width="18" height="18"/>
                  </el-tooltip>
                </div>
                <div>
                  <el-switch @change="change" :before-change="beforeChange" :active-value="0" :inactive-value="1"
                             v-model="setting.syncDelete"/>
                </div>
              </div>
              <div class="setting-item">
                <div>
                  <span>{{ $t('emailPrefix') }}</span>
                </div>
                <div class="forward">
                  <el-button class="opt-button" size="small" type="primary" @click="openEmailPrefix">
                    <Icon icon="fluent:settings-48-regular" width="18" height="18"/>
                  </el-button>
                </div>
              </div>
            </div>
          </div>

          <!-- Personalization Settings Card -->
          <div class="settings-card">
            <div class="card-title">{{ $t('customization') }}</div>
            <div class="card-content">
              <div class="setting-item">
                <div class="title-item"><span>{{ $t('websiteTitle') }}</span></div>
                <div class="email-title">
                  <span>{{ setting.title }}</span>
                  <el-button class="opt-button" size="small" type="primary" @click="editTitleShow = true">
                    <Icon icon="lsicon:edit-outline" width="16" height="16"/>
                  </el-button>
                </div>
              </div>
              <div class="setting-item">
                <div class="title-item"><span>{{ $t('loginBoxOpacity') }}</span></div>
                <div>
                  <el-input-number size="small" v-model="loginOpacity" @change="opacityChange" :precision="2"
                                   :step="0.01" :max="1" :min="0"/>
                </div>
              </div>
              <div class="setting-item personalized">
                <div><span>{{ $t('loginBackground') }}</span></div>
                <div>
                  <div v-if="currentPresetId" class="background"><BgPreset :id="currentPresetId"/></div>
                  <div v-else-if="!setting.background" class="background bg-preset-default"></div>
                  <el-image v-else
                      class="background"
                      :src="cvtR2Url(setting.background)"
                      :preview-src-list="[cvtR2Url(setting.background)]"
                      show-progress
                      fit="cover"
                  >
                    <template #error>
                      <div class="error-image">
                        <Icon icon="ph:image" width="24" height="24"/>
                      </div>
                    </template>
                  </el-image>
                  <div class="background-btn">
                    <el-button class="opt-button" size="small" type="primary" @click="openSetBackground">
                      <Icon icon="lsicon:edit-outline" width="16" height="16"/>
                    </el-button>
                    <el-button class="opt-button" size="small" type="primary" @click="delBackground">
                      <Icon icon="material-symbols:delete-outline-rounded" width="16" height="16"/>
                    </el-button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Email Sending Settings Card -->
          <div class="settings-card">
            <div class="card-title">{{ $t('emailSetting') }}</div>
            <div class="card-content">
              <div class="setting-item">
                <div><span>{{ $t('receiveEmail') }}</span></div>
                <div>
                  <el-switch @change="change" :before-change="beforeChange" :active-value="0" :inactive-value="1"
                             v-model="setting.receive"/>
                </div>
              </div>
              <div class="setting-item">
                <div>
                  <span>{{ $t('autoRefresh') }}</span>
                  <el-tooltip effect="dark" :content="$t('autoRefreshDesc')">
                    <Icon class="warning" icon="fe:warning" width="18" height="18"/>
                  </el-tooltip>
                </div>
                <div>
                  <el-select
                      @change="change"
                      :style="`width: ${ locale === 'en' ? 100 : 80 }px;`"
                      v-model="setting.autoRefresh"
                      placeholder="Select"
                  >
                    <el-option
                        v-for="item in authRefreshOptions"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value"
                    />
                  </el-select>
                </div>
              </div>
              <div class="setting-item">
                <div><span>{{ $t('sendEmail') }}</span></div>
                <div>
                  <el-switch @change="change" :before-change="beforeChange" :active-value="0" :inactive-value="1"
                             v-model="setting.send"/>
                </div>
              </div>
              <div class="setting-item">
                <div>
                  <span>{{ $t('noRecipientTitle') }}</span>
                  <el-tooltip effect="dark" :content="$t('noRecipientDesc')">
                    <Icon class="warning" icon="fe:warning" width="18" height="18"/>
                  </el-tooltip>
                </div>
                <div>
                  <el-switch @change="change" :before-change="beforeChange" :active-value="0" :inactive-value="1"
                             v-model="setting.noRecipient"/>
                </div>
              </div>
              <div class="setting-item">
                <div>
                  <span>{{ $t('sendProvider') }}</span>
                  <el-tooltip effect="dark" :content="$t('sendProviderDesc')">
                    <Icon class="warning" icon="fe:warning" width="18" height="18"/>
                  </el-tooltip>
                </div>
                <div>
                  <el-select v-model="manageProvider" style="width: 140px">
                    <el-option label="Resend" value="resend" :style="sendProviderOptionStyle('resend')"/>
                    <el-option label="Sendkit" value="sendkit" :style="sendProviderOptionStyle('sendkit')"/>
                    <el-option label="Brevo" value="brevo" :style="sendProviderOptionStyle('brevo')"/>
                  </el-select>
                </div>
              </div>
              <div class="setting-item">
                <div><span>{{ $t(manageProviderTokenLabel) }}</span></div>
                <div>
                  <el-button class="opt-button" style="margin-top: 0" @click="openSendProviderList" size="small"
                             type="primary">
                    <Icon icon="ic:round-list" width="18" height="18"/>
                  </el-button>
                  <el-button class="opt-button" style="margin-top: 0" @click="openSendProviderForm" size="small"
                             type="primary">
                    <Icon icon="material-symbols:add-rounded" width="16" height="16"/>
                  </el-button>
                </div>
              </div>
              <div class="setting-item">
                <div><span>{{ $t('blackList') }}</span></div>
                <div>
                  <el-button class="opt-button" style="margin-top: 0" @click="openBlackListForm" size="small"
                             type="primary">
                    <Icon icon="fluent:settings-48-regular" width="16" height="16"/>
                  </el-button>
                </div>
              </div>
              <div class="setting-item">
                <div>
                  <span>{{ $t('autoClean') }}</span>
                  <el-tooltip effect="dark" :content="$t('autoCleanDesc')">
                    <Icon class="warning" icon="fe:warning" width="18" height="18"/>
                  </el-tooltip>
                </div>
                <div class="forward">
                  <span>{{ setting.autoCleanDays > 0 ? $t('autoCleanRetain', { days: setting.autoCleanDays }) : $t('disabled') }}</span>
                  <el-button class="opt-button" style="margin-top: 0" @click="openAutoClean" size="small"
                             type="primary">
                    <Icon icon="fluent:settings-48-regular" width="16" height="16"/>
                  </el-button>
                </div>
              </div>
              <div class="setting-item">
                <div>
                  <span>{{ $t('auditClean') }}</span>
                  <el-tooltip effect="dark" :content="$t('auditCleanDesc')">
                    <Icon class="warning" icon="fe:warning" width="18" height="18"/>
                  </el-tooltip>
                </div>
                <div class="forward">
                  <span>{{ setting.auditCleanDays > 0 ? $t('autoCleanRetain', { days: setting.auditCleanDays }) : $t('disabled') }}</span>
                  <el-button class="opt-button" style="margin-top: 0" @click="openAuditClean" size="small"
                             type="primary">
                    <Icon icon="fluent:settings-48-regular" width="16" height="16"/>
                  </el-button>
                </div>
              </div>
            </div>
          </div>

          <div class="settings-card">
            <div class="card-title">{{ $t('emailPush') }}</div>
            <div class="card-content">
              <div class="setting-item">
                <div><span>{{ $t('tgBot') }}</span></div>
                <div class="forward">
                  <span>{{ (setting.tgConfig?.tgBotStatus ?? setting.tgBotStatus) === 0 ? $t('enabled') : $t('disabled') }}</span>
                  <el-button class="opt-button" size="small" type="primary" @click="openTgSetting">
                    <Icon icon="fluent:settings-48-regular" width="18" height="18"/>
                  </el-button>
                </div>
              </div>
              <div class="setting-item">
                <div><span>{{ $t('webhook') }}</span></div>
                <div class="forward">
                  <span>{{ setting.webhookStatus === 0 ? $t('enabled') : $t('disabled') }}</span>
                  <el-button class="opt-button" size="small" type="primary" @click="openWebhookSetting">
                    <Icon icon="fluent:settings-48-regular" width="18" height="18"/>
                  </el-button>
                </div>
              </div>
              <div class="setting-item">
                <div><span>{{ $t('globalForward') }}</span></div>
                <div class="forward">
                  <span>{{ setting.globalForward?.forwardStatus === 0 ? $t('enabled') : $t('disabled') }}</span>
                  <el-button class="opt-button" size="small" type="primary" @click="openGlobalForward">
                    <Icon icon="fluent:settings-48-regular" width="18" height="18"/>
                  </el-button>
                </div>
              </div>
              <div class="setting-item">
                <div><span>{{ $t('notifyEmail') }}</span></div>
                <div class="forward">
                  <span>{{ setting.notifyFlags?.notifyStatus === 1 ? $t('disabled') : $t('enabled') }}</span>
                  <el-button class="opt-button" size="small" type="primary" @click="openNotifySetting">
                    <Icon icon="fluent:settings-48-regular" width="18" height="18"/>
                  </el-button>
                </div>
              </div>
            </div>
          </div>

          <!-- Object Storage Card -->
          <div class="settings-card">
            <div class="card-title">{{ $t('oss') }}</div>
            <div class="card-content">
              <div class="setting-item">
                <div>
                  <span>{{ $t('s3Configuration') }}</span>
                </div>
                <div class="r2domain">
                  <el-button class="opt-button" size="small" type="primary" @click="addS3Show = true">
                    <Icon icon="fluent:settings-48-regular" width="16" height="16"/>
                  </el-button>
                </div>
              </div>
              <div class="setting-item">
                <div>
                  <span>{{ $t('storageType') }}</span>
                </div>
                <div class="r2domain">
                  <div class="storage-type">
                    <el-tag>{{ setting.storageType }}</el-tag>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Attachment Encryption Card -->
          <div class="settings-card">
            <div class="card-title">{{ $t('attEncrypt') }}</div>
            <div class="card-content">
              <div class="setting-item">
                <div>
                  <span>{{ $t('attEncrypt') }}</span>
                  <el-tooltip effect="dark" :content="$t('attEncryptDesc')">
                    <Icon class="warning" icon="fe:warning" width="18" height="18"/>
                  </el-tooltip>
                </div>
                <div>
                  <el-switch @change="change" :before-change="beforeChange" :active-value="1" :inactive-value="0"
                             v-model="setting.attEncrypt"/>
                </div>
              </div>
              <div class="setting-item">
                <div>
                  <span>{{ $t('attKeyFingerprint') }}</span>
                </div>
                <div class="r2domain">
                  <el-tag v-if="attStatus.fingerprint">{{ attStatus.fingerprint }}</el-tag>
                  <el-tag v-else type="info">{{ $t('attNoKey') }}</el-tag>
                </div>
              </div>
              <div class="setting-item">
                <div>
                  <span>{{ $t('attRotateKey') }}</span>
                </div>
                <div class="r2domain">
                  <el-button class="opt-button" size="small" type="primary" :loading="attRotateLoading"
                             @click="rotateAttKey">
                    {{ $t('attRotateKey') }}
                  </el-button>
                </div>
              </div>
            </div>
          </div>

          <!-- System Notification Switches Card -->
          <div class="settings-card">
            <div class="card-title">{{ $t('systemNotify') }}</div>
            <div class="card-content">
              <div class="setting-item">
                <div>
                  <span>{{ $t('forwardFailNotify') }}</span>
                  <el-tooltip effect="dark" :content="$t('forwardFailNotifyDesc')">
                    <Icon class="warning" icon="fe:warning" width="18" height="18"/>
                  </el-tooltip>
                </div>
                <div>
                  <el-switch @change="change" :active-value="1" :inactive-value="0"
                             v-model="setting.notifyFlags.forwardFailNotify"/>
                </div>
              </div>
              <div class="setting-item">
                <div>
                  <span>{{ $t('backupFailNotify') }}</span>
                  <el-tooltip effect="dark" :content="$t('backupFailNotifyDesc')">
                    <Icon class="warning" icon="fe:warning" width="18" height="18"/>
                  </el-tooltip>
                </div>
                <div>
                  <el-switch @change="change" :active-value="1" :inactive-value="0"
                             v-model="setting.notifyFlags.backupFailNotify"/>
                </div>
              </div>
              <div class="setting-item">
                <div>
                  <span>{{ $t('adminDelNotify') }}</span>
                  <el-tooltip effect="dark" :content="$t('adminDelNotifyDesc')">
                    <Icon class="warning" icon="fe:warning" width="18" height="18"/>
                  </el-tooltip>
                </div>
                <div>
                  <el-switch @change="change" :active-value="1" :inactive-value="0"
                             v-model="setting.notifyFlags.adminDelNotify"/>
                </div>
              </div>
            </div>
          </div>

          <!-- Data Backup Card -->
          <div class="settings-card">
            <div class="card-title">{{ $t('dataBackup') }}</div>
            <div class="card-content">
              <div class="setting-item">
                <div>
                  <span>{{ $t('autoBackup') }}</span>
                  <el-tooltip effect="dark" :content="$t('autoBackupDesc')">
                    <Icon class="warning" icon="fe:warning" width="18" height="18"/>
                  </el-tooltip>
                </div>
                <div>
                  <el-switch @change="change" :active-value="1" :inactive-value="0"
                             v-model="setting.backupConfig.autoBackup"/>
                </div>
              </div>
              <div class="setting-item" v-if="setting.backupConfig?.autoBackup === 1">
                <div>
                  <span>{{ $t('backupProvider') }}</span>
                </div>
                <div class="r2domain">
                  <span>{{ backupProviderLabel }}</span>
                  <el-button class="opt-button" size="small" type="primary" @click="openBackupS3">
                    <Icon icon="fluent:settings-48-regular" width="16" height="16"/>
                  </el-button>
                </div>
              </div>
              <div v-if="setting.backupConfig?.autoBackup === 1 && backupStatus.type === 'kv'" class="backup-kv-tip">
                {{ $t('backupKvTip') }}
              </div>
              <div class="setting-item">
                <div>
                  <span>{{ $t('lastBackup') }}</span>
                </div>
                <div class="r2domain">
                  <span v-if="backupStatus.lastRun">{{ new Date(backupStatus.lastRun).toLocaleString() }}</span>
                  <span v-else>{{ backupStatus.configured ? $t('noBackupYet') : $t('backupNoProvider') }}</span>
                </div>
              </div>
              <div class="setting-item">
                <div>
                  <span>{{ $t('backupExport') }}</span>
                </div>
                <div class="r2domain">
                  <el-button class="opt-button" size="small" type="primary" :loading="backupExportLoading"
                             @click="handleBackupExport">
                    {{ $t('backupExport') }}
                  </el-button>
                  <el-button class="opt-button" size="small" :loading="restoreLoading"
                             @click="openRestoreFile">
                    {{ $t('restoreBackup') }}
                  </el-button>
                  <input ref="restoreFileInput" type="file" accept=".json" style="display: none" @change="handleRestoreFile"/>
                </div>
              </div>
            </div>
          </div>

          <!-- Turnstile Verification Card -->
          <div class="settings-card">
            <div class="card-title">{{ $t('turnstileSetting') }}</div>
            <div class="card-content">
              <div class="setting-item">
                <div><span>{{ $t('signUpVerification') }}</span></div>
                <div>
                  <el-button class="opt-button" size="small" type="primary" @click="openRegVerifyCount">
                    <Icon icon="fluent:settings-48-regular" width="18" height="18"/>
                  </el-button>
                  <el-select
                      @change="change"
                      :style="`width: ${ locale === 'en' ? 100 : 80 }px;`"
                      v-model="setting.verifyConfig.registerVerify"
                      placeholder="Select"
                      class="bot-verify-select"
                  >
                    <el-option key="1" :value="0" :label="$t('enable')"/>
                    <el-option key="1" :value="1" :label="$t('disable')"/>
                    <el-option key="1" :value="2" :label="$t('rulesVerify')"/>
                  </el-select>
                </div>
              </div>
              <div class="setting-item">
                <div><span>{{ $t('addEmailVerification') }}</span></div>
                <div>
                  <el-button class="opt-button" size="small" type="primary" @click="openAddVerifyCount">
                    <Icon icon="fluent:settings-48-regular" width="18" height="18"/>
                  </el-button>
                  <el-select
                      @change="change"
                      :style="`width: ${ locale === 'en' ? 100 : 80 }px;`"
                      v-model="setting.verifyConfig.addEmailVerify"
                      placeholder="Select"
                      class="bot-verify-select"
                  >
                    <el-option key="1" :value="0" :label="$t('enable')"/>
                    <el-option key="1" :value="1" :label="$t('disable')"/>
                    <el-option key="1" :value="2" :label="$t('rulesVerify')"/>
                  </el-select>
                </div>
              </div>
              <div class="setting-item">
                <div><span>Site key</span></div>
                <div class="bot-verify">
                  <span>{{ maskSiteKey(setting.siteKey) }}</span>
                  <el-button class="opt-button" size="small" type="primary" @click="turnstileShow = true">
                    <Icon icon="lsicon:edit-outline" width="16" height="16"/>
                  </el-button>
                </div>
              </div>
              <div class="setting-item">
                <div><span>Secret key</span></div>
                <div class="bot-verify">
                  <span> {{ setting.secretKey }} </span>
                  <el-button class="opt-button" size="small" type="primary" @click="turnstileShow = true">
                    <Icon icon="lsicon:edit-outline" width="16" height="16"/>
                  </el-button>
                </div>
              </div>
            </div>
          </div>

          <div class="settings-card">
            <div class="card-title">{{ $t('noticeTitle') }}</div>
            <div class="card-content">
              <div class="setting-item">
                <div><span>{{ $t('noticePopup') }}</span></div>
                <div class="forward">
                  <span>{{ (setting.noticeConfig?.notice ?? setting.notice) === 0 ? $t('enabled') : $t('disabled') }}</span>
                  <el-button class="opt-button" size="small" type="primary" @click="openNoticePopupSetting">
                    <Icon icon="fluent:settings-48-regular" width="18" height="18"/>
                  </el-button>
                </div>
              </div>
              <div class="setting-item">
                <div><span>{{ $t('popUp') }}</span></div>
                <div class="forward">
                  <el-button class="opt-button" size="small" type="primary" @click="openNoticePopup">
                    <Icon icon="mynaui:click-solid" width="18" height="18"/>
                  </el-button>
                </div>
              </div>
            </div>
          </div>

          <div class="settings-card">
            <div class="card-title">Workers AI</div>
            <div class="card-content">
              <div class="setting-item">
                <div><span>{{ $t('codeRecognition') }}</span></div>
                <div>
                  <el-switch @change="changeField('aiCode', $event)" :before-change="beforeChange" :active-value="0" :inactive-value="1"
                             v-model="setting.aiCode"/>
                </div>
              </div>
              <div class="setting-item">
                <div><span>{{ $t('codeRecognitionRules') }}</span></div>
                <div class="forward">
                  <el-button class="opt-button" size="small" type="primary" @click="openAiCodeFilter">
                    <Icon icon="fluent:settings-48-regular" width="18" height="18"/>
                  </el-button>
                </div>
              </div>
            </div>
          </div>

          <!-- OAuth Login Card -->
          <div class="settings-card">
            <div class="card-title">{{ $t('oauthLogin') }}</div>
            <div class="card-content">
              <div class="setting-item" v-for="p in oauthPlatforms" :key="p.key">
                <div>
                  <el-avatar v-if="p.iconType === 'image'" :src="p.icon" :size="22" class="oauth-icon"/>
                  <Icon v-else :icon="p.icon" width="22" height="22" class="oauth-icon"/>
                  <span>{{ p.label }}</span>
                </div>
                <div class="forward">
                  <span>{{ (setting.oauthConfig?.[p.key + 'Switch'] ?? setting[p.key + 'Switch']) === 0 ? $t('enabled') : $t('disabled') }}</span>
                  <el-button class="opt-button" size="small" type="primary" @click="openOauthSetting(p)">
                    <Icon icon="fluent:settings-48-regular" width="18" height="18"/>
                  </el-button>
                </div>
              </div>
            </div>
          </div>

          <div class="settings-card about">
            <div class="card-title">{{ $t('about') }}</div>
            <div class="card-content">
              <div class="concerning-item">
                <span>{{ $t('version') }} :</span>
                <el-badge is-dot :hidden="!hasUpdate">
                  <el-button @click="jump('https://github.com/maillab/cloud-mail/releases')">
                    {{ currentVersion }}
                    <template #icon>
                      <Icon icon="qlementine-icons:version-control-16" style="font-size: 20px" color="var(--el-color-primary)"/>
                    </template>
                  </el-button>
                </el-badge>
              </div>
              <div class="concerning-item">
                <span>{{ $t('community') }} : </span>
                <div class="community">
                  <el-button @click="jump('https://github.com/maillab/cloud-mail')">
                    Github
                    <template #icon>
                      <Icon icon="codicon:github-inverted" width="22" height="22"/>
                    </template>
                  </el-button>
                  <el-button @click="jump('https://t.me/cloud_mail_tg')">
                    Telegram
                    <template #icon>
                      <Icon icon="logos:telegram" width="30" height="30"/>
                    </template>
                  </el-button>
                </div>
              </div>
              <div class="concerning-item">
                <span>{{ $t('support') }} : </span>
                <el-button @click="jump('https://docs.skymail.ink/support.html')">
                  {{ t('supportDesc') }}
                  <template #icon>
                    <Icon color="#79D6B5" icon="simple-icons:buymeacoffee" width="20" height="20"/>
                  </template>
                </el-button>
              </div>
              <div class="concerning-item">
                <span>{{ $t('help') }} : </span>
                <el-button @click="jump('https://docs.skymail.ink')">
                  {{ t('document') }}
                  <template #icon>
                    <Icon color="#79D6B5" icon="fluent-color:document-32" width="18" height="18"/>
                  </template>
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Dialogs remain the same -->
      <el-dialog v-model="editTitleShow" :title="$t('changeTitle')" width="340" @closed="editTitle = setting.title">
        <form @submit.prevent>
          <el-input type="text" :placeholder="$t('websiteTitle')" v-model="editTitle" @keyup.enter="saveTitle"/>
          <el-button type="primary" :loading="settingLoading" @click="saveTitle">{{ $t('save') }}</el-button>
        </form>
      </el-dialog>
      <el-dialog v-model="resendTokenFormShow" :title="$t('resendToken')" width="340" @closed="cleanResendTokenForm">
        <form @submit.prevent>
          <el-select style="margin-bottom: 15px" v-model="resendTokenForm.domain" placeholder="Select">
            <el-option
                v-for="item in settingStore.domainList"
                :key="item"
                :label="item"
                :value="item"
            />
          </el-select>
          <el-input type="text" :placeholder="$t('addResendTokenDesc')" v-model="resendTokenForm.token" @keyup.enter="saveResendToken"/>
          <el-button type="primary" :loading="settingLoading" @click="saveResendToken">{{ $t('save') }}</el-button>
        </form>
      </el-dialog>
      <el-dialog v-model="sendkitTokenFormShow" :title="$t('sendkitToken')" width="340" @closed="cleanSendkitTokenForm">
        <form @submit.prevent>
          <el-select style="margin-bottom: 15px" v-model="sendkitTokenForm.domain" placeholder="Select">
            <el-option
                v-for="item in settingStore.domainList"
                :key="item"
                :label="item"
                :value="item"
            />
          </el-select>
          <el-input type="text" :placeholder="$t('addSendkitTokenDesc')" v-model="sendkitTokenForm.token" @keyup.enter="saveSendkitToken"/>
          <el-button type="primary" :loading="settingLoading" @click="saveSendkitToken">{{ $t('save') }}</el-button>
        </form>
      </el-dialog>
      <el-dialog v-model="brevoTokenFormShow" :title="$t('brevoToken')" width="340" @closed="cleanBrevoTokenForm">
        <form @submit.prevent>
          <el-select style="margin-bottom: 15px" v-model="brevoTokenForm.domain" placeholder="Select">
            <el-option
                v-for="item in settingStore.domainList"
                :key="item"
                :label="item"
                :value="item"
            />
          </el-select>
          <el-input type="text" :placeholder="$t('addBrevoTokenDesc')" v-model="brevoTokenForm.token" @keyup.enter="saveBrevoToken"/>
          <el-button type="primary" :loading="settingLoading" @click="saveBrevoToken">{{ $t('save') }}</el-button>
        </form>
      </el-dialog>
      <el-dialog v-model="turnstileShow" :title="$t('addTurnstileSecret')" width="340"
                 @closed="turnstileForm.secretKey = '';turnstileForm.siteKey = ''">
        <form @submit.prevent>
          <el-input type="text" placeholder="Site key" v-model="turnstileForm.siteKey" @keyup.enter="saveTurnstileKey"/>
          <el-input type="text" style="margin-top: 15px" placeholder="Secret key" v-model="turnstileForm.secretKey" @keyup.enter="saveTurnstileKey"/>
          <el-button type="primary" :loading="settingLoading" @click="saveTurnstileKey">{{ $t('save') }}</el-button>
        </form>
      </el-dialog>
      <el-dialog v-model="oauthSettingShow" :title="$t('oauthSetting') + ' - ' + oauthForm.label" width="340"
                 @closed="oauthForm.clientId = ''; oauthForm.clientSecret = ''; oauthForm.switch = 1">
        <div class="dialog-content">
          <el-input type="text" :placeholder="$t('clientId')" v-model="oauthForm.clientId"/>
          <el-input type="text" style="margin-top: 15px" :placeholder="$t('clientSecret')" v-model="oauthForm.clientSecret"/>
        </div>
        <template #footer>
          <div class="dialog-footer">
            <el-switch v-model="oauthForm.switch" :active-value="0" :inactive-value="1" :active-text="$t('enable')"
                       :inactive-text="$t('disable')"/>
            <el-button type="primary" :loading="settingLoading" @click="saveOauth">{{ $t('save') }}</el-button>
          </div>
        </template>
      </el-dialog>
      <el-dialog
          v-model="showSetBackground"
          class="cut-dialog"
          @closed="closedSetBackground"
      >
        <template #header>
          <span style="font-size: 18px">
            {{ $t('backgroundTitle') }}
            <el-tooltip>
              <template #content>
                <span>{{ $t('backgroundWarning') }}</span>
              </template>
              <Icon class="title-icon  warning" icon="fe:warning" width="18" height="18"/>
            </el-tooltip>
          </span>
        </template>
        <el-input :placeholder="$t('backgroundUrlDesc')" v-model="backgroundUrl" v-if="!localUpShow"
                  class="background-url" @keyup.enter="saveBackground" @input="selectedPreset = null"/>
        <el-image
            v-if="localUpShow"
            :preview-src-list="[backgroundImage]"
            show-progress
            class="cropper"
            fit="cover"
            :src="backgroundImage"
        ></el-image>
        <div v-if="!localUpShow" class="bg-preset-box">
          <div class="bg-preset-head">
            <div class="bg-preset-label">{{ $t('bgPresetLibrary') }}</div>
            <div class="bg-preset-tip">{{ $t('bgPresetTip') }}</div>
          </div>
          <div class="bg-preset-grid">
            <div class="bg-preset-item bg-preset-default" :class="{active: (selectedPreset !== null ? selectedPreset === '' : !setting.background)}" @click="selectPreset('')">
              <span>{{ $t('bgPresetDefault') }}</span>
            </div>
            <div v-for="p in BG_PRESETS" :key="p.id" class="bg-preset-item" :class="[{active: (selectedPreset !== null ? selectedPreset === p.id : currentPresetId === p.id)}]" @click="selectPreset(p.id)">
              <BgPreset :id="p.id"/>
              <span>{{ $t(p.nameKey) }}</span>
            </div>
          </div>
        </div>
        <div class="cut-button">
          <el-button type="primary" link @click="openCut" v-if="!localUpShow">
            {{ $t('localUpload') }}
          </el-button>
          <el-button type="primary" link @click="localUpShow = false" v-if="localUpShow">
            {{ $t('imageLink') }}
          </el-button>
          <el-button type="primary" :loading="settingLoading" @click="saveBackground">{{ $t('save') }}</el-button>
        </div>
      </el-dialog>
      <el-dialog
          v-model="tgSettingShow"
          class="forward-dialog"
      >
        <template #header>
          <div class="forward-head">
            <span class="forward-set-title">{{ $t('tgBot') }}</span>
            <el-tooltip effect="dark" :content="$t('tgBotDesc')">
              <Icon class="warning" icon="fe:warning" width="18" height="18"/>
            </el-tooltip>
          </div>
        </template>
        <div class="forward-set-body">
          <el-input :placeholder="setting.tgConfig?.tgBotToken || $t('tgBotToken')" v-model="tgBotToken" @keyup.enter="tgBotSave"></el-input>
          <el-input-tag tag-type="warning" :placeholder="$t('toBotTokenDesc')" v-model="tgChatId"
                        @add-tag="addChatTag"></el-input-tag>
          <el-input tag-type="warning" :placeholder="$t('customDomainDesc')" v-model="customDomain" @keyup.enter="tgBotSave"></el-input>
          <div class="tg-msg-label">
            <span>{{t('from')}}</span>
            <el-select  v-model="tgMsgFrom" >
              <el-option
                  v-for="item in tgMsgFromOption"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
              />
            </el-select>
          </div>
          <div class="tg-msg-label">
            <span>{{t('recipient')}}</span>
            <el-select  v-model="tgMsgTo" >
              <el-option
                  v-for="item in tgMsgToOption"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
              />
            </el-select>
          </div>
          <div class="tg-msg-label">
            <span>{{t('emailText')}}</span>
            <el-select  v-model="tgMsgText" >
              <el-option
                  v-for="item in tgMsgTextOption"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
              />
            </el-select>
          </div>
        </div>
        <template #footer>
          <div class="dialog-footer">
            <el-switch v-model="tgBotStatus" :active-value="0" :inactive-value="1" :active-text="$t('enable')"
                       :inactive-text="$t('disable')"/>
            <el-button :loading="settingLoading" type="primary" @click="tgBotSave">
              {{ $t('save') }}
            </el-button>
          </div>
        </template>
      </el-dialog>
      <el-dialog
          v-model="notifySettingShow"
          class="forward-dialog"
      >
        <template #header>
          <div class="forward-head">
            <span class="forward-set-title">{{ $t('notifyEmail') }}</span>
            <el-tooltip effect="dark" :content="$t('notifyEmailDesc')">
              <Icon class="warning" icon="fe:warning" width="18" height="18"/>
            </el-tooltip>
          </div>
        </template>
        <div class="forward-set-body">
          <el-input :placeholder="$t('notifyEmailPlaceholder')" v-model="notifyEmailInput" @keyup.enter="notifySave"></el-input>
          <div class="forward-tip">{{ $t('notifyStatusTip') }}</div>
        </div>
        <template #footer>
          <div class="dialog-footer">
            <el-switch v-model="notifyStatusInput" :active-value="0" :inactive-value="1" :active-text="$t('enable')"
                       :inactive-text="$t('disable')"/>
            <el-button :loading="settingLoading" type="primary" @click="notifySave">
              {{ $t('save') }}
            </el-button>
          </div>
        </template>
      </el-dialog>
      <el-dialog
          v-model="webhookShow"
          class="forward-dialog"
          @closed="webhookFormatShow = false"
      >
        <template #header>
          <div class="forward-head">
            <span class="forward-set-title">{{ $t('webhook') }}</span>
            <el-tooltip effect="dark" :content="$t('webhookDesc')">
              <Icon class="warning" icon="fe:warning" width="18" height="18"/>
            </el-tooltip>
          </div>
        </template>
        <div class="forward-set-body">
          <el-input :placeholder="$t('webhookUrl')" v-model="webhookUrl" @keyup.enter="webhookSave"></el-input>
          <el-input :placeholder="$t('webhookSecret')" v-model="webhookSecret" @keyup.enter="webhookSave"></el-input>
          <div class="tg-msg-label">
            <span>{{ t('webhookRetry') }}</span>
            <el-input-number v-model="webhookRetry" :min="0" :max="5" controls-position="right"/>
          </div>
          <div v-show="webhookFormatShow" class="webhook-format">
            <pre>Content-Type: application/json
Authorization: &lt;secret&gt;</pre>
            <pre>{{ webhookPayloadExample }}</pre>
          </div>
        </div>
        <template #footer>
          <div class="dialog-footer">
            <el-switch v-model="webhookStatus" :active-value="0" :inactive-value="1" :active-text="$t('enable')"
                       :inactive-text="$t('disable')"/>
            <div class="webhook-footer-right">
              <div class="webhook-format-title" @click="webhookFormatShow = !webhookFormatShow">
                <span>{{ $t('webhookFormat') }}</span>
                <Icon class="webhook-format-icon" :class="{ open: webhookFormatShow }" icon="mingcute:down-small-fill" width="18" height="18"/>
              </div>
              <el-button :loading="settingLoading" type="primary" @click="webhookSave">
                {{ $t('save') }}
              </el-button>
            </div>
          </div>
        </template>
      </el-dialog>
      <el-dialog
          v-model="globalForwardShow"
          class="forward-dialog"
      >
        <template #header>
          <div class="forward-head">
            <span class="forward-set-title">{{ $t('globalForward') }}</span>
            <el-tooltip effect="dark" :content="$t('globalForwardDesc')">
              <Icon class="warning" icon="fe:warning" width="18" height="18"/>
            </el-tooltip>
          </div>
        </template>
        <div class="forward-set-body">
          <el-input :placeholder="$t('globalForwardTarget')" v-model="globalForwardEmail"
                    @keyup.enter="globalForwardSave"></el-input>
          <el-radio-group v-model="globalRuleType" class="forward-rule-row">
            <el-radio-button :value="0">{{ $t('forwardAll') }}</el-radio-button>
            <el-radio-button :value="1">{{ $t('rules') }}</el-radio-button>
          </el-radio-group>
          <el-input v-if="globalRuleType === 1" :placeholder="$t('globalForwardRulePlaceholder')"
                    v-model="globalRuleEmail" @keyup.enter="globalForwardSave"></el-input>
          <div class="forward-tip">{{ $t('globalForwardTip') }}</div>
        </div>
        <template #footer>
          <div class="dialog-footer">
            <el-switch v-model="globalForwardStatus" :active-value="0" :inactive-value="1" :active-text="$t('enable')"
                       :inactive-text="$t('disable')"/>
            <el-button :loading="settingLoading" type="primary" @click="globalForwardSave">
              {{ $t('save') }}
            </el-button>
          </div>
        </template>
      </el-dialog>
      <el-dialog class="resend-table" v-model="showResendList" :title="$t('resendTokenList')">
        <el-table :data="resendList">
          <el-table-column :min-width="emailColumnWidth" property="key" :label="$t('domain')"
                           :show-overflow-tooltip="true"/>
          <el-table-column :width="tokenColumnWidth" property="value" label="Token" fixed="right"
                           :show-overflow-tooltip="true"/>
        </el-table>
      </el-dialog>
      <el-dialog class="resend-table" v-model="showSendkitList" :title="$t('sendkitTokenList')">
        <el-table :data="sendkitList">
          <el-table-column :min-width="emailColumnWidth" property="key" :label="$t('domain')"
                           :show-overflow-tooltip="true"/>
          <el-table-column :width="tokenColumnWidth" property="value" label="API Key" fixed="right"
                           :show-overflow-tooltip="true"/>
        </el-table>
      </el-dialog>
      <el-dialog class="resend-table" v-model="showBrevoList" :title="$t('brevoTokenList')">
        <el-table :data="brevoList">
          <el-table-column :min-width="emailColumnWidth" property="key" :label="$t('domain')"
                           :show-overflow-tooltip="true"/>
          <el-table-column :width="tokenColumnWidth" property="value" label="API Key" fixed="right"
                           :show-overflow-tooltip="true"/>
        </el-table>
      </el-dialog>
      <el-dialog v-model="regVerifyCountShow" :title="$t('rulesVerifyTitle',{count: regVerifyCount})"
                 @closed="regVerifyCount = setting.verifyConfig.regVerifyCount">
        <form @submit.prevent>
          <el-input-number type="text" v-model="regVerifyCount" :min="1" @keyup.enter="saveRegVerifyCount">
          </el-input-number>
          <el-button type="primary" :loading="settingLoading" @click="saveRegVerifyCount">{{ $t('save') }}</el-button>
        </form>
      </el-dialog>
      <el-dialog v-model="addVerifyCountShow" :title="$t('rulesVerifyTitle',{count: addVerifyCount})"
                 @closed="addVerifyCount = setting.verifyConfig.addVerifyCount">
        <form @submit.prevent>
          <el-input-number type="text" v-model="addVerifyCount" :min="1" @keyup.enter="saveAddVerifyCount"/>
          <el-button type="primary" :loading="settingLoading" @click="saveAddVerifyCount">{{ $t('save') }}</el-button>
        </form>
      </el-dialog>
      <el-dialog top="5vh" v-model="noticePopupShow" :title="$t('noticePopup')" class="notice-popup"
                 @closed="resetNoticeForm">
        <form @submit.prevent>
          <el-input v-model="noticeForm.noticeTitle" :placeholder="t('titleDesc')" @keyup.enter="saveNoticePopup"/>
          <div class="notice-line-item">
            <el-select v-model="noticeForm.noticeType">
              <template #prefix>
                <span style="margin-right: 10px">{{ $t('icon') }}</span>
              </template>
              <el-option key="none" label="None" value="none"/>
              <el-option key="primary" label="Primary" value="primary"/>
              <el-option key="success" label="Success" value="success"/>
              <el-option key="warning" label="Warning" value="warning"/>
              <el-option key="info" label="Info" value="info"/>
            </el-select>
            <el-select v-model="noticeForm.noticePosition">
              <template #prefix>
                <span style="margin-right: 10px">{{ $t('position') }}</span>
              </template>
              <el-option key="top-left" :label="t('topLeft')" value="top-left"/>
              <el-option key="top-right" :label="t('topRight')" value="top-right"/>
              <el-option key="bottom-left" :label="t('bottomLeft')" value="bottom-left"/>
              <el-option key="bottom-right" :label="t('bottomRight')" value="bottom-right"/>
            </el-select>
            <el-input-number v-model="noticeForm.noticeWidth">
              <template #prefix>
                {{ $t('width') }}
              </template>
              <template #suffix>
                px
              </template>
            </el-input-number>
            <el-input-number v-model="noticeForm.noticeOffset">
              <template #prefix>
                {{ $t('offset') }}
              </template>
              <template #suffix>
                px
              </template>
            </el-input-number>
            <el-input-number v-model="noticeForm.noticeDuration">
              <template #prefix>
                {{ $t('duration') }}
              </template>
              <template #suffix>
                ms
              </template>
            </el-input-number>
          </div>
          <div class="notice-popup-item">
            <el-input
                v-model="noticeForm.noticeContent"
                :autosize="{ minRows: 15, maxRows: 25 }"
                type="textarea"
                :placeholder="t('noticeContentDesc')"
            />
          </div>
        </form>
        <template #footer>
          <div class="dialog-footer">
            <el-switch v-model="noticeForm.notice" :active-value="0" :inactive-value="1" :active-text="$t('enable')"
                       :inactive-text="$t('disable')"/>
            <div>
              <el-button @click="previewNoticePopup">
                {{ $t('preview') }}
              </el-button>
              <el-button :loading="settingLoading" type="primary" @click="saveNoticePopup">
                {{ $t('save') }}
              </el-button>
            </div>
          </div>
        </template>
      </el-dialog>
      <el-dialog v-model="addS3Show" :title="t('s3Configuration')" width="340" @closed="resetAddS3Form">
        <form @submit.prevent>
          <div class="backup-field-label">
            <span>{{ t('attStorageType') }}</span>
          </div>
          <el-select v-model="s3.type" style="width: 100%; margin-bottom: 15px">
            <el-option :label="t('attStorageTypeKv')" value="kv"/>
            <el-option :label="t('attStorageTypeS3')" value="s3"/>
            <el-option :label="t('attStorageTypeR2')" value="r2"/>
            <el-option :label="t('attStorageTypeWebdav')" value="webdav"/>
          </el-select>
          <template v-if="s3.type === 's3'">
          <div class="backup-field-label">
            <span>{{ t('backupBucket') }}</span>
            <el-tooltip effect="dark" :content="$t('backupBucketHint')">
              <Icon class="warning" icon="fe:warning" width="16" height="16"/>
            </el-tooltip>
          </div>
          <el-input class="dialog-input" type="text" placeholder="例如：muse-mail" v-model="s3.bucket" @keyup.enter="saveS3"/>
          <div class="backup-field-label">
            <span>{{ t('backupEndpoint') }}</span>
            <el-tooltip effect="dark" :content="$t('backupEndpointHint')">
              <Icon class="warning" icon="fe:warning" width="16" height="16"/>
            </el-tooltip>
          </div>
          <el-input class="dialog-input" type="text" placeholder="例如：s3.us-east-005.backblazeb2.com" v-model="s3.endpoint" @keyup.enter="saveS3"/>
          <div class="backup-field-label">
            <span>{{ t('backupRegion') }}</span>
            <el-tooltip effect="dark" :content="$t('backupRegionHint')">
              <Icon class="warning" icon="fe:warning" width="16" height="16"/>
            </el-tooltip>
          </div>
          <el-input class="dialog-input" type="text" placeholder="例如：us-east-005" v-model="s3.region" @keyup.enter="saveS3"/>
          <div class="backup-field-label">
            <span>{{ t('backupAccessKey') }}</span>
            <el-tooltip effect="dark" :content="$t('backupAccessKeyHint')">
              <Icon class="warning" icon="fe:warning" width="16" height="16"/>
            </el-tooltip>
          </div>
          <el-input class="dialog-input" type="text" :placeholder="setting.attStorage?.s3AccessKey || 'Access key'"
                    v-model="s3.s3AccessKey" @keyup.enter="saveS3"/>
          <div class="backup-field-label">
            <span>{{ t('backupSecretKey') }}</span>
            <el-tooltip effect="dark" :content="$t('backupSecretKeyHint')">
              <Icon class="warning" icon="fe:warning" width="16" height="16"/>
            </el-tooltip>
          </div>
          <el-input style="margin-bottom: 10px" type="text" :placeholder="setting.attStorage?.s3SecretKey || 'Secret key'" v-model="s3.s3SecretKey" @keyup.enter="saveS3"/>
          <div class="force-path-style">
            <div class="force-path-style-left">
              <span>ForcePathStyle</span>
              <el-tooltip effect="dark" :content="$t('forcePathStyleDesc')">
                <Icon class="warning" icon="fe:warning" width="18" height="18"/>
              </el-tooltip>
            </div>
            <el-switch :before-change="beforeChange" :active-value="0" :inactive-value="1"
                       v-model="s3.forcePathStyle"/>
          </div>
          </template>
          <template v-else-if="s3.type === 'r2'">
          <div class="backup-field-label">
            <span>{{ t('r2AccountId') }}</span>
            <el-tooltip effect="dark" :content="$t('r2AccountIdHint')">
              <Icon class="warning" icon="fe:warning" width="16" height="16"/>
            </el-tooltip>
          </div>
          <el-input class="dialog-input" type="text" placeholder="例如：32 位十六进制字符" v-model="r2.accountId" @keyup.enter="saveS3"/>
          <div class="backup-field-label">
            <span>{{ t('backupBucket') }}</span>
            <el-tooltip effect="dark" :content="$t('backupBucketHint')">
              <Icon class="warning" icon="fe:warning" width="16" height="16"/>
            </el-tooltip>
          </div>
          <el-input class="dialog-input" type="text" placeholder="例如：cloud-mail-attachments" v-model="r2.bucket" @keyup.enter="saveS3"/>
          <div class="backup-field-label">
            <span>{{ t('backupAccessKey') }}</span>
            <el-tooltip effect="dark" :content="$t('backupAccessKeyHint')">
              <Icon class="warning" icon="fe:warning" width="16" height="16"/>
            </el-tooltip>
          </div>
          <el-input class="dialog-input" type="text" :placeholder="setting.attStorage?.r2AccessKey || 'Access key'"
                    v-model="r2.accessKey" @keyup.enter="saveS3"/>
          <div class="backup-field-label">
            <span>{{ t('backupSecretKey') }}</span>
            <el-tooltip effect="dark" :content="$t('backupSecretKeyHint')">
              <Icon class="warning" icon="fe:warning" width="16" height="16"/>
            </el-tooltip>
          </div>
          <el-input style="margin-bottom: 10px" type="text" :placeholder="setting.attStorage?.r2SecretKey || 'Secret key'" v-model="r2.secretKey" @keyup.enter="saveS3"/>
          <div class="backup-kv-note" style="margin-bottom: 15px">{{ t('attStorageR2ApiNote') }}</div>
          </template>
          <template v-else-if="s3.type === 'webdav'">
          <div class="backup-field-label">
            <span>{{ t('webdavUrl') }}</span>
            <el-tooltip effect="dark" :content="$t('webdavUrlHint')">
              <Icon class="warning" icon="fe:warning" width="16" height="16"/>
            </el-tooltip>
          </div>
          <el-input class="dialog-input" type="text" placeholder="例如：https://dav.jianguoyun.com/dav/" v-model="webdav.url" @keyup.enter="saveS3"/>
          <div class="backup-field-label">
            <span>{{ t('webdavUsername') }}</span>
          </div>
          <el-input class="dialog-input" type="text" :placeholder="setting.attStorage?.webdavUsername || 'Username'" v-model="webdav.username" @keyup.enter="saveS3"/>
          <div class="backup-field-label">
            <span>{{ t('webdavPassword') }}</span>
          </div>
          <el-input style="margin-bottom: 10px" type="password" :placeholder="setting.attStorage?.webdavPassword || 'Password'" v-model="webdav.password" @keyup.enter="saveS3" show-password/>
          <div class="backup-kv-note" style="margin-bottom: 15px">{{ t('attStorageWebdavNote') }}</div>
          </template>
          <template v-else-if="s3.type === 'kv'">
            <div class="backup-kv-note">{{ t('attStorageKvNote') }}</div>
          </template>
          <div class="s3-button">
            <el-button :loading="clearS3Loading" :disabled="s3.type === 'kv'" @click="clearS3">{{ t('clear') }}</el-button>
            <el-button type="primary" :loading="settingLoading && !clearS3Loading" @click="saveS3">{{ t('save') }}</el-button>
          </div>
        </form>
      </el-dialog>
      <el-dialog v-model="backupS3Show" :title="t('backupProvider')" width="340" @closed="resetBackupS3Form">
        <form @submit.prevent>
          <div class="backup-field-label">
            <span>{{ t('backupType') }}</span>
          </div>
          <el-select v-model="backupS3.type" style="width: 100%; margin-bottom: 15px">
            <el-option :label="t('backupTypeKv')" value="kv"/>
            <el-option :label="t('backupTypeS3')" value="s3"/>
            <el-option :label="t('backupTypeR2')" value="r2"/>
            <el-option :label="t('backupTypeWebdav')" value="webdav"/>
          </el-select>
          <template v-if="backupS3.type === 'kv'">
            <div class="backup-kv-note">{{ t('backupKvNote') }}</div>
          </template>
          <template v-else-if="backupS3.type === 'r2'">
          <div class="backup-field-label">
            <span>{{ t('r2AccountId') }}</span>
            <el-tooltip effect="dark" :content="$t('r2AccountIdHint')">
              <Icon class="warning" icon="fe:warning" width="16" height="16"/>
            </el-tooltip>
          </div>
          <el-input class="dialog-input" type="text" placeholder="例如：32 位十六进制字符" v-model="backupR2.accountId" @keyup.enter="saveBackupS3"/>
          <div class="backup-field-label">
            <span>{{ t('backupBucket') }}</span>
            <el-tooltip effect="dark" :content="$t('backupBucketHint')">
              <Icon class="warning" icon="fe:warning" width="16" height="16"/>
            </el-tooltip>
          </div>
          <el-input class="dialog-input" type="text" placeholder="例如：cloud-mail-backups" v-model="backupR2.bucket" @keyup.enter="saveBackupS3"/>
          <div class="backup-field-label">
            <span>{{ t('backupAccessKey') }}</span>
            <el-tooltip effect="dark" :content="$t('backupAccessKeyHint')">
              <Icon class="warning" icon="fe:warning" width="16" height="16"/>
            </el-tooltip>
          </div>
          <el-input class="dialog-input" type="text" :placeholder="setting.backupConfig?.backupR2AccessKey || 'Access key'"
                    v-model="backupR2.accessKey" @keyup.enter="saveBackupS3"/>
          <div class="backup-field-label">
            <span>{{ t('backupSecretKey') }}</span>
            <el-tooltip effect="dark" :content="$t('backupSecretKeyHint')">
              <Icon class="warning" icon="fe:warning" width="16" height="16"/>
            </el-tooltip>
          </div>
          <el-input style="margin-bottom: 10px" type="text" :placeholder="setting.backupConfig?.backupR2SecretKey || 'Secret key'" v-model="backupR2.secretKey" @keyup.enter="saveBackupS3"/>
          <div class="backup-kv-note" style="margin-bottom: 15px">{{ t('attStorageR2ApiNote') }}</div>
          </template>
          <template v-else-if="backupS3.type === 'webdav'">
          <div class="backup-field-label">
            <span>{{ t('webdavUrl') }}</span>
            <el-tooltip effect="dark" :content="$t('webdavUrlHint')">
              <Icon class="warning" icon="fe:warning" width="16" height="16"/>
            </el-tooltip>
          </div>
          <el-input class="dialog-input" type="text" placeholder="例如：https://dav.jianguoyun.com/dav/" v-model="backupWebdav.url" @keyup.enter="saveBackupS3"/>
          <div class="backup-field-label">
            <span>{{ t('webdavUsername') }}</span>
          </div>
          <el-input class="dialog-input" type="text" :placeholder="setting.backupConfig?.backupWebdavUsername || 'Username'" v-model="backupWebdav.username" @keyup.enter="saveBackupS3"/>
          <div class="backup-field-label">
            <span>{{ t('webdavPassword') }}</span>
          </div>
          <el-input style="margin-bottom: 10px" type="password" :placeholder="setting.backupConfig?.backupWebdavPassword || 'Password'" v-model="backupWebdav.password" @keyup.enter="saveBackupS3" show-password/>
          <div class="backup-kv-note" style="margin-bottom: 15px">{{ t('attStorageWebdavNote') }}</div>
          </template>
          <template v-else>
          <div class="backup-field-label">
            <span>{{ t('backupBucket') }}</span>
            <el-tooltip effect="dark" :content="$t('backupBucketHint')">
              <Icon class="warning" icon="fe:warning" width="16" height="16"/>
            </el-tooltip>
          </div>
          <el-input class="dialog-input" type="text" placeholder="例如：muse-mail" v-model="backupS3.bucket" @keyup.enter="saveBackupS3"/>
          <div class="backup-field-label">
            <span>{{ t('backupEndpoint') }}</span>
            <el-tooltip effect="dark" :content="$t('backupEndpointHint')">
              <Icon class="warning" icon="fe:warning" width="16" height="16"/>
            </el-tooltip>
          </div>
          <el-input class="dialog-input" type="text" placeholder="例如：s3.us-east-005.backblazeb2.com" v-model="backupS3.endpoint" @keyup.enter="saveBackupS3"/>
          <div class="backup-field-label">
            <span>{{ t('backupRegion') }}</span>
            <el-tooltip effect="dark" :content="$t('backupRegionHint')">
              <Icon class="warning" icon="fe:warning" width="16" height="16"/>
            </el-tooltip>
          </div>
          <el-input class="dialog-input" type="text" placeholder="例如：us-east-005" v-model="backupS3.region" @keyup.enter="saveBackupS3"/>
          <div class="backup-field-label">
            <span>{{ t('backupAccessKey') }}</span>
            <el-tooltip effect="dark" :content="$t('backupAccessKeyHint')">
              <Icon class="warning" icon="fe:warning" width="16" height="16"/>
            </el-tooltip>
          </div>
          <el-input class="dialog-input" type="text" :placeholder="setting.backupConfig?.backupS3AccessKey || 'Access key'"
                    v-model="backupS3.s3AccessKey" @keyup.enter="saveBackupS3"/>
          <div class="backup-field-label">
            <span>{{ t('backupSecretKey') }}</span>
            <el-tooltip effect="dark" :content="$t('backupSecretKeyHint')">
              <Icon class="warning" icon="fe:warning" width="16" height="16"/>
            </el-tooltip>
          </div>
          <el-input style="margin-bottom: 10px" type="text" :placeholder="setting.backupConfig?.backupS3SecretKey || 'Secret key'" v-model="backupS3.s3SecretKey" @keyup.enter="saveBackupS3"/>
          <div class="force-path-style">
            <div class="force-path-style-left">
              <span>ForcePathStyle</span>
              <el-tooltip effect="dark" :content="$t('forcePathStyleDesc')">
                <Icon class="warning" icon="fe:warning" width="18" height="18"/>
              </el-tooltip>
            </div>
            <el-switch :before-change="beforeChange" :active-value="0" :inactive-value="1"
                       v-model="backupS3.forcePathStyle"/>
          </div>
          </template>
          <div class="s3-button">
            <el-button :loading="clearBackupS3Loading" :disabled="backupS3.type === 'kv'" @click="clearBackupS3">{{ t('clear') }}</el-button>
            <el-button type="primary" :loading="settingLoading && !clearBackupS3Loading" @click="saveBackupS3">{{ t('save') }}</el-button>
          </div>
        </form>
      </el-dialog>
      <el-dialog v-model="emailPrefixShow" :title="t('emailPrefix')"  @closed="resetEmailPrefix"  >
        <div class="email-prefix">
          <div>{{ t('atLeast') }}</div>
          <el-input-number v-model="minEmailPrefix" :min="1" :max="20" style="width: 150px" @keyup.enter="saveEmailPrefix" >
            <template #suffix>
              <span>{{ t('character') }}</span>
            </template>
          </el-input-number>
        </div>
        <div class="prefix-filter">
          <div style="margin-bottom: 10px;">{{ t('mustNotContain') }}</div>
          <el-input-tag style="margin-bottom: 10px;" v-model="emailPrefixFilter"  />
        </div>
        <el-button type="primary" style="width: 100%;" :loading="settingLoading" @click="saveEmailPrefix">{{ $t('save') }}</el-button>
      </el-dialog>
      <el-dialog v-model="blackFormShow" class="forward-dialog" @closed="resetBlackList">
        <template #header>
          <div class="forward-head">
            <span class="forward-set-title">{{ $t('blackList') }}</span>
            <el-tooltip effect="dark" :content="$t('blackListDesc')">
              <Icon class="warning" icon="fe:warning" width="18" height="18"/>
            </el-tooltip>
          </div>
        </template>
        <el-form>
          <el-form-item :label="t('blackFromDesc')" label-position="top">
            <el-input-tag v-model="blackListForm.blackFrom" @add-tag="banEmailAddTag"  />
          </el-form-item>
          <el-form-item :label="t('blackSubjectDesc')" label-position="top">
            <el-input-tag v-model="blackListForm.blackSubject"/>
          </el-form-item>
          <el-form-item :label="t('blackContentDesc')" label-position="top">
            <el-input-tag v-model="blackListForm.blackContent"/>
          </el-form-item>
        </el-form>
        <el-button type="primary" style="width: 100%;" :loading="settingLoading" @click="saveBlackList">{{ $t('save') }}</el-button>
      </el-dialog>
      <el-dialog v-model="autoCleanShow" :title="t('autoClean')" class="forward-dialog" @closed="resetAutoClean">
        <el-form>
          <el-form-item :label="t('autoCleanDays')" label-position="top">
            <el-input-number v-model="autoCleanDays" :min="0" :max="3650" style="width: 100%"/>
          </el-form-item>
          <el-form-item :label="t('autoCleanExclude')" label-position="top">
            <el-input-tag
                tag-type="warning"
                :placeholder="$t('autoCleanExcludeDesc')"
                v-model="autoCleanExclude"
                @add-tag="autoCleanExcludeAddTag"
            />
          </el-form-item>
        </el-form>
        <el-button type="primary" style="width: 100%;" :loading="settingLoading" @click="saveAutoClean">{{ $t('save') }}</el-button>
      </el-dialog>
      <el-dialog v-model="auditCleanShow" :title="t('auditClean')" class="forward-dialog" @closed="resetAuditClean">
        <el-form>
          <el-form-item :label="t('autoCleanDays')" label-position="top">
            <el-input-number v-model="auditCleanDays" :min="0" :max="3650" style="width: 100%"/>
          </el-form-item>
        </el-form>
        <el-button type="primary" style="width: 100%;" :loading="settingLoading" @click="saveAuditClean">{{ $t('save') }}</el-button>
      </el-dialog>
      <el-dialog v-model="aiCodeFilterShow" class="forward-dialog" @closed="resetAiCodeFilter">
        <template #header>
          <div class="forward-head">
            <span class="forward-set-title">{{ $t('codeRecognitionRules') }}</span>
            <el-tooltip effect="dark" :content="$t('codeRecognitionRulesDesc')">
              <Icon class="warning" icon="fe:warning" width="18" height="18"/>
            </el-tooltip>
          </div>
        </template>
        <el-form>
          <el-form-item :label="t('senderRules')" label-position="top">
            <el-input-tag v-model="aiCodeFilter" @add-tag="aiCodeFilterAddTag"/>
          </el-form-item>
        </el-form>
        <el-button type="primary" style="width: 100%;" :loading="settingLoading" @click="saveAiCodeFilter">{{ $t('save') }}</el-button>
      </el-dialog>
    </el-scrollbar>
  </div>
</template>

<script setup>
import {computed, defineOptions, nextTick, reactive, ref} from "vue";
import {attKeyStatus, attRotateKey, deleteBackground, setBackground, setBlackList, settingQuery, settingSet, settingSetGlobalForward, backupStatus as backupStatusReq, backupExport, backupRestore} from "@/request/setting.js";
import {downloadExport} from "@/request/email.js";
import {useSettingStore} from "@/store/setting.js";
import {useUiStore} from "@/store/ui.js";
import {useUserStore} from "@/store/user.js";
import {useAccountStore} from "@/store/account.js";
import {Icon} from "@iconify/vue";
import {cvtR2Url, toOssDomain} from "@/utils/convert.js";
import {storeToRefs} from "pinia";
import {debounce} from 'lodash-es'
import {isDomain, isEmail, isIpUrl} from "@/utils/verify-utils.js";
import loading from "@/components/loading/index.vue";
import BgPreset from "@/components/bg-preset/index.vue";
import {getTextWidth} from "@/utils/text.js";
import {fileToBase64, compressImage, formatBytes} from "@/utils/file-utils.js"
import {BG_PRESETS, BG_PRESET_PREFIX, getPresetId} from "@/utils/bg-presets.js";
import {useI18n} from 'vue-i18n';
import axios from "axios";

defineOptions({
  name: 'sys-setting'
})

const currentVersion = 'v3.6.0'
const hasUpdate = ref(false)
let getUpdateErrorCount = 1;
const {t, locale} = useI18n();
const firstLoading = ref(true)
const settingReady = ref(false)
const backgroundImage = ref('')
const localUpShow = ref(false)
const accountStore = useAccountStore();
const userStore = useUserStore();
const editTitleShow = ref(false)
const resendTokenFormShow = ref(false)
const sendkitTokenFormShow = ref(false)
const brevoTokenFormShow = ref(false)
const blackFormShow = ref(false)
const autoCleanShow = ref(false)
const auditCleanShow = ref(false)
const aiCodeFilterShow = ref(false)
const turnstileShow = ref(false)
const tgSettingShow = ref(false)
const notifySettingShow = ref(false)
const notifyEmailInput = ref('')
const notifyStatusInput = ref(0)
const noticePopupShow = ref(false)
const webhookShow = ref(false)
const globalForwardShow = ref(false)
const globalForwardEmail = ref('')
const globalForwardStatus = ref(1)
const globalRuleType = ref(0)
const globalRuleEmail = ref('')
const emailPrefixShow = ref(false)
const showResendList = ref(false)
const showSendkitList = ref(false)
const showBrevoList = ref(false)
const settingStore = useSettingStore();
const uiStore = useUiStore();
const {settings: setting} = storeToRefs(settingStore);
const editTitle = ref('')
const settingLoading = ref(false)
const attStatus = ref({enabled: true, fingerprint: null, hasKey: false})
const attRotateLoading = ref(false)
const clearS3Loading = ref(false)
const loginOpacity = ref(0)
const minEmailPrefix = ref(0)
const emailPrefixFilter = ref([])
const autoCleanDays = ref(0)
const auditCleanDays = ref(0)
const autoCleanExclude = ref([])
const backgroundUrl = ref('')
let backgroundFile = {}
const showSetBackground = ref(false)
let regVerifyCount = ref(1)
let addVerifyCount = ref(1)
let backup = '{}'
const addS3Show = ref(false)
const addVerifyCountShow = ref(false)
const regVerifyCountShow = ref(false)
const resendTokenForm = reactive({
  domain: '',
  token: '',
})
const sendkitTokenForm = reactive({
  domain: '',
  token: '',
})
const brevoTokenForm = reactive({
  domain: '',
  token: '',
})
const turnstileForm = reactive({
  siteKey: '',
  secretKey: ''
})

const oauthPlatforms = [
  { key: 'google', label: 'Google', icon: 'devicon:google', iconType: 'iconify' },
  { key: 'github', label: 'GitHub', icon: 'codicon:github-inverted', iconType: 'iconify' },
  { key: 'linuxdo', label: 'LinuxDo', icon: '/image/linuxdo.webp', iconType: 'image' },
]
const oauthSettingShow = ref(false)
const oauthForm = reactive({
  key: '',
  label: '',
  clientId: '',
  clientSecret: '',
  switch: 1,
})

const s3 = reactive({
  type: 's3',
  bucket: '',
  endpoint: '',
  region: '',
  s3AccessKey: '',
  s3SecretKey: '',
  forcePathStyle: 1
})

const r2 = reactive({
  accountId: '',
  bucket: '',
  accessKey: '',
  secretKey: ''
})

const webdav = reactive({
  url: '',
  username: '',
  password: ''
})

const backupStatus = reactive({
  configured: false,
  type: 's3',
  lastRun: null
})
const backupS3Show = ref(false)
const backupExportLoading = ref(false)
const clearBackupS3Loading = ref(false)
const restoreFileInput = ref(null)
const restoreLoading = ref(false)

const backupS3 = reactive({
  type: 's3',
  bucket: '',
  endpoint: '',
  region: '',
  s3AccessKey: '',
  s3SecretKey: '',
  forcePathStyle: 1
})

const backupR2 = reactive({
  accountId: '',
  bucket: '',
  accessKey: '',
  secretKey: ''
})

const backupWebdav = reactive({
  url: '',
  username: '',
  password: ''
})

const backupProviderLabel = computed(() => {
  const type = backupStatus.type || 's3'
  if (type === 's3') return t('backupProviderS3')
  if (type === 'r2') return t('backupProviderR2')
  if (type === 'webdav') return t('backupProviderWebdav')
  return t('backupProviderKv')
})

const noticeForm = reactive({
  noticeTitle: '',
  noticeContent: '',
  noticeType: '',
  noticeDuration: '',
  noticePosition: '',
  noticeOffset: 0,
  notice: 0,
  noticeWidth: 0
})

const regKeyOptions = computed(() => [
  {label: t('enable'), value: 0},
  {label: t('disable'), value: 1},
  {label: t('optional'), value: 2},
])

const blackListForm = ref({
  blackSubject: [],
  blackContent: [],
  blackFrom: []
})
const aiCodeFilter = ref([])

const authRefreshOptions = computed(() => [
  {label: t('disable'), value: 0},
  {label: '3s', value: 3},
  {label: '5s', value: 5},
  {label: '10s', value: 10},
  {label: '15s', value: 15},
  {label: '20s', value: 20},
])

const tgChatId = ref([])
const customDomain = ref('')
const tgBotStatus = ref(0)
const tgBotToken = ref('')
const webhookUrl = ref('')
const webhookStatus = ref(1)
const webhookRetry = ref(0)
const webhookSecret = ref('')
const webhookFormatShow = ref(false)
const webhookPayloadExample = `{
  "emailId": 1,
  "sendEmail": "hello@example.com",
  "sendName": "hello",
  "toEmail": "admin@example.com",
  "toName": "admin",
  "subject": "Hello",
  "text": "Hello",
  "content": "<div>Hello</div>",
  "code": "123456",
  "createTime": "2099-12-30 23:59:59"
}`
const emailColumnWidth = ref(0)
const tokenColumnWidth = ref(0)
const tgMsgFrom = ref('')
const tgMsgTo = ref('')
const tgMsgText = ref('')

const tgMsgFromOption = [{label: t('show'), value: 'show'}, {label: t('hide'), value: 'hide'}, {label: t('onlyName'), value:'only-name'}]
const tgMsgToOption = [{label: t('show'), value: 'show'}, {label: t('hide'), value: 'hide'}]
const tgMsgTextOption = [{label: t('show'), value: 'show'}, {label: t('hide'), value: 'hide'}]
const tgMsgLabelWidth = computed(() => locale.value === 'en' ? '120px' : '100px');

getSettings()
getUpdate()
loadAttStatus()
loadBackupStatus()

function maskSiteKey(value) {
  return value ? `${String(value).slice(0, 6)}******` : ''
}

function getSettings() {
  settingReady.value = false
  settingQuery().then(settingData => {
    // 通知开关默认值兜底：notifyFlags 是打包后的 JSON 对象；缓存是旧版时只有平铺字段，两边都兜底，缺值按默认开处理，避免开关误显示关闭
    const f = settingData.notifyFlags || {}
    settingData.notifyFlags = {
      notifyStatus: f.notifyStatus ?? settingData.notifyStatus ?? 0,
      adminDelNotify: f.adminDelNotify ?? settingData.adminDelNotify ?? 1,
      forwardFailNotify: f.forwardFailNotify ?? settingData.forwardFailNotify ?? 1,
      backupFailNotify: f.backupFailNotify ?? settingData.backupFailNotify ?? 1
    }
    // 全局转发默认值兜底：globalForward 是打包后的 JSON 对象；缓存是旧版时只有平铺字段，两边都兜底
    const g = settingData.globalForward || {}
    settingData.globalForward = {
      forwardEmail: g.forwardEmail ?? settingData.forwardEmail ?? '',
      forwardStatus: g.forwardStatus ?? settingData.forwardStatus ?? 1,
      ruleEmail: g.ruleEmail ?? settingData.ruleEmail ?? '',
      ruleType: g.ruleType ?? settingData.ruleType ?? 0
    }
    // 备份配置默认值兜底：backupConfig 是打包后的 JSON 对象；缓存是旧版时只有平铺字段，两边都兜底
    const bc = settingData.backupConfig || {}
    settingData.backupConfig = {
      autoBackup: bc.autoBackup ?? settingData.autoBackup ?? 1,
      backupType: bc.backupType ?? settingData.backupType ?? 's3',
      backupBucket: bc.backupBucket ?? settingData.backupBucket ?? '',
      backupRegion: bc.backupRegion ?? settingData.backupRegion ?? '',
      backupEndpoint: bc.backupEndpoint ?? settingData.backupEndpoint ?? '',
      backupS3AccessKey: bc.backupS3AccessKey ?? settingData.backupS3AccessKey ?? '',
      backupS3SecretKey: bc.backupS3SecretKey ?? settingData.backupS3SecretKey ?? '',
      backupForcePathStyle: bc.backupForcePathStyle ?? settingData.backupForcePathStyle ?? 1,
      backupR2AccountId: bc.backupR2AccountId ?? settingData.backupR2AccountId ?? '',
      backupR2Bucket: bc.backupR2Bucket ?? settingData.backupR2Bucket ?? '',
      backupR2AccessKey: bc.backupR2AccessKey ?? settingData.backupR2AccessKey ?? '',
      backupR2SecretKey: bc.backupR2SecretKey ?? settingData.backupR2SecretKey ?? '',
      backupWebdavUrl: bc.backupWebdavUrl ?? settingData.backupWebdavUrl ?? '',
      backupWebdavUsername: bc.backupWebdavUsername ?? settingData.backupWebdavUsername ?? '',
      backupWebdavPassword: bc.backupWebdavPassword ?? settingData.backupWebdavPassword ?? ''
    }
    const as = settingData.attStorage || {}
    settingData.attStorage = {
      bucket: as.bucket ?? settingData.bucket ?? '',
      region: as.region ?? settingData.region ?? '',
      endpoint: as.endpoint ?? settingData.endpoint ?? '',
      s3AccessKey: as.s3AccessKey ?? settingData.s3AccessKey ?? '',
      s3SecretKey: as.s3SecretKey ?? settingData.s3SecretKey ?? '',
      forcePathStyle: as.forcePathStyle ?? settingData.forcePathStyle ?? 1,
      attStorageType: as.attStorageType ?? settingData.attStorageType ?? 's3',
      r2AccountId: as.r2AccountId ?? settingData.r2AccountId ?? '',
      r2Bucket: as.r2Bucket ?? settingData.r2Bucket ?? '',
      r2AccessKey: as.r2AccessKey ?? settingData.r2AccessKey ?? '',
      r2SecretKey: as.r2SecretKey ?? settingData.r2SecretKey ?? '',
      webdavUrl: as.webdavUrl ?? settingData.webdavUrl ?? '',
      webdavUsername: as.webdavUsername ?? settingData.webdavUsername ?? '',
      webdavPassword: as.webdavPassword ?? settingData.webdavPassword ?? ''
    }
    const oc = settingData.oauthConfig || {}
    settingData.oauthConfig = {
      linuxdoClientId: oc.linuxdoClientId ?? settingData.linuxdoClientId ?? '',
      linuxdoClientSecret: oc.linuxdoClientSecret ?? settingData.linuxdoClientSecret ?? '',
      linuxdoSwitch: oc.linuxdoSwitch ?? settingData.linuxdoSwitch ?? 1,
      githubClientId: oc.githubClientId ?? settingData.githubClientId ?? '',
      githubClientSecret: oc.githubClientSecret ?? settingData.githubClientSecret ?? '',
      githubSwitch: oc.githubSwitch ?? settingData.githubSwitch ?? 1,
      googleClientId: oc.googleClientId ?? settingData.googleClientId ?? '',
      googleClientSecret: oc.googleClientSecret ?? settingData.googleClientSecret ?? '',
      googleSwitch: oc.googleSwitch ?? settingData.googleSwitch ?? 1
    }
    const nc = settingData.noticeConfig || {}
    settingData.noticeConfig = {
      noticeTitle: nc.noticeTitle ?? settingData.noticeTitle ?? '',
      noticeContent: nc.noticeContent ?? settingData.noticeContent ?? '',
      noticeType: nc.noticeType ?? settingData.noticeType ?? '',
      noticeDuration: nc.noticeDuration ?? settingData.noticeDuration ?? 0,
      noticePosition: nc.noticePosition ?? settingData.noticePosition ?? '',
      noticeOffset: nc.noticeOffset ?? settingData.noticeOffset ?? 0,
      noticeWidth: nc.noticeWidth ?? settingData.noticeWidth ?? 400,
      notice: nc.notice ?? settingData.notice ?? 0
    }
    const tc = settingData.tgConfig || {}
    settingData.tgConfig = {
      tgBotToken: tc.tgBotToken ?? settingData.tgBotToken ?? '',
      tgChatId: tc.tgChatId ?? settingData.tgChatId ?? '',
      tgBotStatus: tc.tgBotStatus ?? settingData.tgBotStatus ?? 1,
      customDomain: tc.customDomain ?? settingData.customDomain ?? '',
      tgMsgFrom: tc.tgMsgFrom ?? settingData.tgMsgFrom ?? 'only-name',
      tgMsgTo: tc.tgMsgTo ?? settingData.tgMsgTo ?? 'show',
      tgMsgText: tc.tgMsgText ?? settingData.tgMsgText ?? 'hide'
    }
    const vc = settingData.verifyConfig || {}
    settingData.verifyConfig = {
      addEmailVerify: vc.addEmailVerify ?? settingData.addEmailVerify ?? 1,
      registerVerify: vc.registerVerify ?? settingData.registerVerify ?? 1,
      regVerifyCount: vc.regVerifyCount ?? settingData.regVerifyCount ?? 1,
      addVerifyCount: vc.addVerifyCount ?? settingData.addVerifyCount ?? 1
    }
    setting.value = settingData
    settingStore.domainList = settingData.domainList;
    resendTokenForm.domain = setting.value.domainList[0]
    sendkitTokenForm.domain = setting.value.domainList[0]
    brevoTokenForm.domain = setting.value.domainList[0]
    loginOpacity.value = setting.value.loginOpacity
    minEmailPrefix.value = setting.value.minEmailPrefix
    firstLoading.value = false
    pickDefaultSendProvider()
    backgroundUrl.value = setting.value.background?.startsWith('http') ? setting.value.background : ''
    editTitle.value = setting.value.title
    addVerifyCount.value = setting.value.verifyConfig?.addVerifyCount ?? setting.value.addVerifyCount
    regVerifyCount.value = setting.value.verifyConfig?.regVerifyCount ?? setting.value.regVerifyCount
    resetNoticeForm()
    resetAddS3Form()
    resetEmailPrefix()
    resetBlackList()
    resetAiCodeFilter()
    nextTick(() => {
      settingReady.value = true
    })
  })
}


function openNoticePopup() {
  uiStore.showNotice()
}

function openAddVerifyCount() {
  if (settingLoading.value) return
  addVerifyCountShow.value = true
}

function openRegVerifyCount() {
  if (settingLoading.value) return
  regVerifyCountShow.value = true
}

function resetAddS3Form() {
  const a = setting.value.attStorage || {}
  s3.type = a.attStorageType ?? setting.value.attStorageType ?? 's3'
  s3.bucket = a.bucket ?? setting.value.bucket
  s3.endpoint = a.endpoint ?? setting.value.endpoint
  s3.region = a.region ?? setting.value.region
  s3.s3AccessKey = ''
  s3.s3SecretKey = ''
  s3.forcePathStyle = a.forcePathStyle ?? setting.value.forcePathStyle
  r2.accountId = a.r2AccountId ?? setting.value.r2AccountId
  r2.bucket = a.r2Bucket ?? setting.value.r2Bucket
  r2.accessKey = ''
  r2.secretKey = ''
  webdav.url = a.webdavUrl ?? setting.value.webdavUrl
  webdav.username = ''
  webdav.password = ''
}

const resendList = computed(() => {

  let list = Object.keys(setting.value.resendTokens).map(key => {
    return {
      key: key,
      value: setting.value.resendTokens[key]
    };
  })

  if (list.length > 0) {

    const key = list.reduce((a, b) => compareByLengthAndUpperCase(a, b, 'key')).key;
    emailColumnWidth.value = getTextWidth(key) + 30;

    const value = list.reduce((a, b) => compareByLengthAndUpperCase(a, b, 'value')).value;
    tokenColumnWidth.value = getTextWidth(value) + 30;

  }

  return list;
});

const sendkitList = computed(() => {

  let list = Object.keys(setting.value.sendkitTokens || {}).map(key => {
    return {
      key: key,
      value: setting.value.sendkitTokens[key]
    };
  })

  if (list.length > 0) {

    const key = list.reduce((a, b) => compareByLengthAndUpperCase(a, b, 'key')).key;
    emailColumnWidth.value = getTextWidth(key) + 30;

    const value = list.reduce((a, b) => compareByLengthAndUpperCase(a, b, 'value')).value;
    tokenColumnWidth.value = getTextWidth(value) + 30;

  }

  return list;
});

const brevoList = computed(() => {

  let list = Object.keys(setting.value.brevoTokens || {}).map(key => {
    return {
      key: key,
      value: setting.value.brevoTokens[key]
    };
  })

  if (list.length > 0) {

    const key = list.reduce((a, b) => compareByLengthAndUpperCase(a, b, 'key')).key;
    emailColumnWidth.value = getTextWidth(key) + 30;

    const value = list.reduce((a, b) => compareByLengthAndUpperCase(a, b, 'value')).value;
    tokenColumnWidth.value = getTextWidth(value) + 30;

  }

  return list;
});

function getUpdate() {
  if (getUpdateErrorCount > 5 || !getUpdateErrorCount) return
  axios.get('https://api.github.com/repos/maillab/cloud-mail/releases/latest').then(({data}) => {
    hasUpdate.value = data.name !== currentVersion
    getUpdateErrorCount = 0
  }).catch(e => {
    getUpdateErrorCount++
    setTimeout(() => {
      getUpdate()
    }, 2000)
    console.error('检查更新失败：', e)
  })
}

function saveAddVerifyCount() {
  if (!addVerifyCount.value) {
    addVerifyCount.value = 1
  }
  editSetting({verifyConfig: {addVerifyCount: addVerifyCount.value}})
}

function saveRegVerifyCount() {
  if (!regVerifyCount.value) {
    regVerifyCount.value = 1
  }
  editSetting({verifyConfig: {regVerifyCount: regVerifyCount.value}})
}

const compareByLengthAndUpperCase = (a, b, key) => {
  const getUpperCaseCount = (str) => (str.match(/[A-Z]/g) || []).length;
  if (a[key].length === b[key].length) {
    return getUpperCaseCount(a[key]) > getUpperCaseCount(b[key]) ? a : b;
  }
  return a[key].length > b[key].length ? a : b;
};


function closedSetBackground() {
  backgroundImage.value = ''
  localUpShow.value = false
  backgroundUrl.value = setting.value.background?.startsWith('http') ? setting.value.background : ''
}

function openTgSetting() {
  const t = setting.value.tgConfig || {}
  tgBotStatus.value = t.tgBotStatus ?? setting.value.tgBotStatus
  tgBotToken.value = ''
  customDomain.value = t.customDomain ?? setting.value.customDomain
  tgMsgFrom.value = t.tgMsgFrom ?? setting.value.tgMsgFrom
  tgMsgText.value = t.tgMsgText ?? setting.value.tgMsgText
  tgMsgTo.value = t.tgMsgTo ?? setting.value.tgMsgTo
  tgChatId.value = []
  const chatId = t.tgChatId ?? setting.value.tgChatId
  if (chatId) {
    const list = chatId.split(',')
    tgChatId.value.push(...list)
  }
  tgSettingShow.value = true
}

function openNotifySetting() {
  notifyEmailInput.value = setting.value.notifyEmail || ''
  notifyStatusInput.value = setting.value.notifyFlags?.notifyStatus ?? 0
  notifySettingShow.value = true
}

function notifySave() {
  const email = notifyEmailInput.value.trim()
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    ElMessage({message: t('forwardEmailInvalid'), type: 'error', plain: true});
    return
  }
  editSetting({notifyEmail: email, notifyFlags: {...setting.value.notifyFlags, notifyStatus: notifyStatusInput.value}})
}

function openNoticePopupSetting() {
  noticePopupShow.value = true
}

function openResendList() {
  showResendList.value = true
}

function openSendkitList() {
  showSendkitList.value = true
}

function openBrevoList() {
  showBrevoList.value = true
}

// 发信服务商下拉切换：下拉选服务商，下面显示该服务商的单条目（合并前的老样式）；
// 只切换查看，不保存、不改变发送优先级；首次加载默认选中第一个已配置的服务商
const manageProvider = ref('resend')
let sendProviderPicked = false

function pickDefaultSendProvider() {
  if (sendProviderPicked) return
  sendProviderPicked = true
  if (Object.keys(setting.value.resendTokens || {}).length > 0) manageProvider.value = 'resend'
  else if (Object.keys(setting.value.sendkitTokens || {}).length > 0) manageProvider.value = 'sendkit'
  else if (Object.keys(setting.value.brevoTokens || {}).length > 0) manageProvider.value = 'brevo'
}

// 服务商是否配了密钥（至少一个域名）
function sendProviderConfigured(p) {
  const tokens = p === 'resend' ? setting.value.resendTokens
    : p === 'sendkit' ? setting.value.sendkitTokens
    : setting.value.brevoTokens
  return Object.keys(tokens || {}).length > 0
}

// 下拉条目颜色：已配置正常色，未配置浅灰色，以此区分
function sendProviderOptionStyle(p) {
  return sendProviderConfigured(p) ? {} : { color: 'var(--el-text-color-placeholder)' }
}

// 当前服务商单条目的标题（合并前的老文案：Resend Token / Sendkit API Key / Brevo API Key）
const manageProviderTokenLabel = computed(() => {
  if (manageProvider.value === 'resend') return 'resendToken'
  if (manageProvider.value === 'sendkit') return 'sendkitToken'
  return 'brevoToken'
})

function openSendProviderList() {
  if (manageProvider.value === 'resend') openResendList()
  else if (manageProvider.value === 'sendkit') openSendkitList()
  else if (manageProvider.value === 'brevo') openBrevoList()
}

function openSendProviderForm() {
  if (manageProvider.value === 'resend') openResendForm()
  else if (manageProvider.value === 'sendkit') openSendkitForm()
  else if (manageProvider.value === 'brevo') openBrevoForm()
}

function resetNoticeForm() {
  const n = setting.value.noticeConfig || {}
  noticeForm.notice = n.notice ?? setting.value.notice
  noticeForm.noticeContent = n.noticeContent ?? setting.value.noticeContent
  noticeForm.noticeDuration = n.noticeDuration ?? setting.value.noticeDuration
  noticeForm.noticeTitle = n.noticeTitle ?? setting.value.noticeTitle
  noticeForm.noticePosition = n.noticePosition ?? setting.value.noticePosition
  noticeForm.noticeType = n.noticeType ?? setting.value.noticeType
  noticeForm.noticeOffset = n.noticeOffset ?? setting.value.noticeOffset
  noticeForm.noticeWidth = n.noticeWidth ?? setting.value.noticeWidth
}

function saveNoticePopup() {
  noticeForm.noticeOffset = noticeForm.noticeOffset || 0
  noticeForm.noticeWidth = noticeForm.noticeWidth || 0
  noticeForm.noticeDuration = noticeForm.noticeDuration || 0
  editSetting({noticeConfig: {...noticeForm}})
}

function previewNoticePopup() {
  uiStore.previewNotice({...noticeForm})
}

function openWebhookSetting() {
  webhookStatus.value = setting.value.webhookStatus
  webhookUrl.value = setting.value.webhookUrl || ''
  webhookRetry.value = setting.value.webhookRetry ?? 0
  webhookSecret.value = setting.value.webhookSecret || ''
  webhookShow.value = true
}

function openEmailPrefix() {
  emailPrefixShow.value = true
}

function openAutoClean() {
  autoCleanDays.value = setting.value.autoCleanDays ?? 0
  autoCleanExclude.value = setting.value.autoCleanExclude
      ? setting.value.autoCleanExclude.split(',').filter(Boolean)
      : []
  autoCleanShow.value = true
}

function openAuditClean() {
  auditCleanDays.value = setting.value.auditCleanDays ?? 0
  auditCleanShow.value = true
}

function addChatTag(val) {

  const chatIds = Array.from(new Set(
      val.split(/[,，]/).map(item => item.trim()).filter(item => item)
  ));

  tgChatId.value.splice(tgChatId.value.length - 1, 1)

  chatIds.forEach(id => {
    if (!isNaN(Number(id))) {
      tgChatId.value.push(id)
    }
  })
}

function clearS3() {

  if (s3.type === 'kv') {
    return
  }

  const form = {
    attStorageType: s3.type
  }

  if (s3.type === 'r2') {
    form.r2AccountId = ''
    form.r2Bucket = ''
    form.r2AccessKey = ''
    form.r2SecretKey = ''
  } else if (s3.type === 'webdav') {
    form.webdavUrl = ''
    form.webdavUsername = ''
    form.webdavPassword = ''
  } else {
    form.bucket = ''
    form.endpoint = ''
    form.region = ''
    form.s3AccessKey = ''
    form.s3SecretKey = ''
    form.forcePathStyle = 1
  }
  clearS3Loading.value = true
  editSetting(form)
}

function saveS3() {

  const as = {
    attStorageType: s3.type,
    bucket: s3.bucket,
    endpoint: s3.endpoint,
    region: s3.region,
    forcePathStyle: s3.forcePathStyle,
    r2AccountId: r2.accountId,
    r2Bucket: r2.bucket,
    webdavUrl: webdav.url
  }

  if (s3.s3AccessKey) as.s3AccessKey = s3.s3AccessKey
  if (s3.s3SecretKey) as.s3SecretKey = s3.s3SecretKey
  if (r2.accessKey) as.r2AccessKey = r2.accessKey
  if (r2.secretKey) as.r2SecretKey = r2.secretKey
  if (webdav.username) as.webdavUsername = webdav.username
  if (webdav.password) as.webdavPassword = webdav.password

  editSetting({attStorage: as})
}

function tgBotSave() {
  const tc = {
    customDomain: customDomain.value,
    tgBotStatus: tgBotStatus.value,
    tgChatId: tgChatId.value + '',
    tgMsgFrom: tgMsgFrom.value,
    tgMsgText: tgMsgText.value,
    tgMsgTo: tgMsgTo.value
  }
  if (tgBotToken.value) tc.tgBotToken = tgBotToken.value
  editSetting({tgConfig: tc})
}

function webhookSave() {
  let retry = Number(webhookRetry.value)
  if (isNaN(retry) || retry < 0) {
    retry = 0
  }
  const url = toOssDomain(webhookUrl.value.trim())
  if (isIpUrl(url)) {
    ElMessage({
      message: t('webhookIpNotSupported'),
      type: 'warning',
      plain: true
    })
    return
  }
  const form = {
    webhookStatus: webhookStatus.value,
    webhookUrl: url,
    webhookRetry: retry,
    webhookSecret: webhookSecret.value.trim()
  }
  editSetting(form)
}

function openGlobalForward() {
  const g = setting.value.globalForward || {}
  globalForwardEmail.value = (g.forwardEmail ?? setting.value.forwardEmail) || ''
  globalForwardStatus.value = g.forwardStatus ?? setting.value.forwardStatus ?? 1
  globalRuleType.value = g.ruleType ?? setting.value.ruleType ?? 0
  globalRuleEmail.value = (g.ruleEmail ?? setting.value.ruleEmail) || ''
  globalForwardShow.value = true
}

function globalForwardSave() {
  const targets = globalForwardEmail.value.split(',').map(s => s.trim()).filter(Boolean)
  if (globalForwardStatus.value === 0 && (targets.length === 0 || targets.some(e => !isEmail(e)))) {
    ElMessage({message: t('forwardEmailInvalid'), type: 'error', plain: true})
    return
  }
  const rules = globalRuleEmail.value.split(',').map(s => s.trim()).filter(Boolean)
  if (globalRuleType.value === 1 && (rules.length === 0 || rules.some(e => !isEmail(e)))) {
    ElMessage({message: t('forwardEmailInvalid'), type: 'error', plain: true})
    return
  }
  if (settingLoading.value) return
  settingLoading.value = true
  settingSetGlobalForward({
    forwardEmail: targets.join(','),
    forwardStatus: globalForwardStatus.value,
    ruleType: globalRuleType.value,
    ruleEmail: rules.join(',')
  }).then((data) => {
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
    })
    globalForwardShow.value = false
    getSettings()
  }).finally(() => {
    settingLoading.value = false
  })
}


function doOpacityChange() {
  if (!settingReady.value) return
  const form = {}
  form.loginOpacity = loginOpacity.value
  editSetting(form, true)
}

function resetEmailPrefix() {
  minEmailPrefix.value = setting.value.minEmailPrefix
  emailPrefixFilter.value = setting.value.emailPrefixFilter
}

function resetBlackList() {
  blackListForm.value.blackFrom = setting.value.blackFrom ? setting.value.blackFrom.split(',') : []
  blackListForm.value.blackContent = setting.value.blackContent ? setting.value.blackContent.split(',') : []
  blackListForm.value.blackSubject = setting.value.blackSubject ? setting.value.blackSubject.split(',') : []
}

function resetAutoClean() {
  autoCleanDays.value = setting.value.autoCleanDays ?? 0
  autoCleanExclude.value = setting.value.autoCleanExclude
      ? setting.value.autoCleanExclude.split(',').filter(Boolean)
      : []
}

function resetAuditClean() {
  auditCleanDays.value = setting.value.auditCleanDays ?? 0
}

function resetAiCodeFilter() {
  aiCodeFilter.value = setting.value.aiCodeFilter ? setting.value.aiCodeFilter.split(',') : []
}

function saveEmailPrefix() {
  const form = {}
  form.minEmailPrefix = minEmailPrefix.value
  form.emailPrefixFilter = emailPrefixFilter.value
  editSetting(form, true)
}

function saveAutoClean() {
  editSetting({
    autoCleanDays: autoCleanDays.value,
    autoCleanExclude: autoCleanExclude.value.join(',')
  }, true)
}

function saveAuditClean() {
  editSetting({
    auditCleanDays: auditCleanDays.value
  }, true)
}

function saveAiCodeFilter() {
  editSetting({aiCodeFilter: aiCodeFilter.value + ''})
}

const opacityChange = debounce(doOpacityChange, 1000, {
  leading: false,
  trailing: true
})

function saveBlackList() {

  let form = {
    blackContent: blackListForm.value.blackContent + '',
    blackSubject: blackListForm.value.blackSubject + '',
    blackFrom: blackListForm.value.blackFrom + ''
  }

  settingLoading.value = true

  setBlackList(form).then(() => {
    getSettings()
    ElMessage({
      message: t('setSuccess'),
      type: "success",
      plain: true
    })
    blackFormShow.value = false;
  }).finally(() => {
    settingLoading.value = false;
  })
}

function banEmailAddTag(val) {
  const emails = Array.from(new Set(
      val.split(/[,，]/).map(item => item.trim()).filter(item => item)
  ));

  blackListForm.value.blackFrom.splice(blackListForm.value.blackFrom.length - 1, 1)

  emails.forEach(email => {
    if ((isEmail(email) || isDomain(email)) && !blackListForm.value.blackFrom.includes(email)) {
      blackListForm.value.blackFrom.push(email)
    }
  })
}

function autoCleanExcludeAddTag(val) {
  const emails = Array.from(new Set(
      val.split(/[,，]/).map(item => item.trim()).filter(item => item)
  ));

  autoCleanExclude.value.splice(autoCleanExclude.value.length - 1, 1)

  emails.forEach(email => {
    if (isEmail(email) && !autoCleanExclude.value.includes(email)) {
      autoCleanExclude.value.push(email)
    }
  })
}

function aiCodeFilterAddTag(val) {
  const emails = Array.from(new Set(
      val.split(/[,，]/).map(item => item.trim()).filter(item => item)
  ));

  aiCodeFilter.value.splice(aiCodeFilter.value.length - 1, 1)

  emails.forEach(email => {
    if ((isEmail(email) || isDomain(email)) && !aiCodeFilter.value.includes(email)) {
      aiCodeFilter.value.push(email)
    }
  })
}


function delBackground() {
  ElMessageBox.confirm(t('delBackgroundConfirm'), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    deleteBackground().then(() => {
      backgroundUrl.value = ''
      setting.value.background = null
      ElMessage({
        message: t('delSuccessMsg'),
        type: "success",
        plain: true
      })
    })
  })
}

function openOauthSetting(p) {
  const o = setting.value.oauthConfig || {}
  oauthForm.key = p.key
  oauthForm.label = p.label
  oauthForm.clientId = o[p.key + 'ClientId'] ?? setting.value[p.key + 'ClientId'] ?? ''
  oauthForm.clientSecret = o[p.key + 'ClientSecret'] ?? setting.value[p.key + 'ClientSecret'] ?? ''
  oauthForm.switch = o[p.key + 'Switch'] ?? setting.value[p.key + 'Switch'] ?? 1
  oauthSettingShow.value = true
}

function saveOauth() {
  const oc = {}
  oc[oauthForm.key + 'ClientId'] = oauthForm.clientId
  oc[oauthForm.key + 'ClientSecret'] = oauthForm.clientSecret
  oc[oauthForm.key + 'Switch'] = oauthForm.switch
  editSetting({oauthConfig: oc})
}

function saveTurnstileKey() {
  const settingForm = {}
  settingForm.siteKey = turnstileForm.siteKey
  settingForm.secretKey = turnstileForm.secretKey
  editSetting(settingForm)
}

async function saveBackground() {

  if (settingLoading.value) return

  // 壁纸库：本次选了壁纸，先处理壁纸选择（与当前相同则只是关闭，不动背景）
  if (selectedPreset.value !== null) {
    if (selectedPreset.value !== currentChoice.value) {
      savePresetChoice()
    } else {
      showSetBackground.value = false
    }
    return
  }

  let image = ''
  let compressedInfo = null

  if (localUpShow.value) {
    // 本地上传的背景图先在浏览器里压缩再上传：超过 512KB 的图缩到 2560px 内、转 JPEG，
    // 质量 0.92（清晰度优先，肉眼看不出区别）；动图跳过压缩保动画；压缩失败退回原图，不阻塞保存
    let fileToUpload = backgroundFile
    try {
      const compressed = await compressImage(backgroundFile, {
        quality: 0.92,
        maxWidth: 2560,
        maxHeight: 2560,
        convertSize: 512 * 1024
      })
      if (compressed !== backgroundFile && compressed.size < backgroundFile.size) {
        compressedInfo = {before: formatBytes(backgroundFile.size), after: formatBytes(compressed.size)}
        fileToUpload = compressed
      }
    } catch (e) {
      console.error(e)
    }
    image = await fileToBase64(fileToUpload, true);
  } else {
    if (backgroundUrl.value && !backgroundUrl.value.startsWith('http')) {
      ElMessage({
        message: t('imageLinkErrorMsg'),
        type: "error",
        plain: true
      })
      return
    }
    image = backgroundUrl.value
  }
  settingLoading.value = true

  setBackground(image).then(key => {
    setting.value.background = key
    showSetBackground.value = false
    ElMessage({
      message: compressedInfo ? t('backgroundCompressed', compressedInfo) : t('saveSuccessMsg'),
      type: "success",
      plain: true
    })
    localUpShow.value = false
    backgroundImage.value = ''
  }).finally(() => {
    settingLoading.value = false
  })

}

// 壁纸库本次弹窗里的选择：null = 还没选（显示当前生效的）；'' = 默认云朵；否则为壁纸 id
// 点小图只选中，不保存；点保存才生效（用户要求：不要点一下就自动保存）
const selectedPreset = ref(null)

function openSetBackground() {
  selectedPreset.value = null
  showSetBackground.value = true
}

// 当前生效的壁纸 id；空 = 图片背景或默认云朵
const currentPresetId = computed(() => getPresetId(setting.value.background))

// 当前生效的选择（含自定义图片，用 '__image__' 区分默认云朵，供保存时比对）
const currentChoice = computed(() => {
  const bg = setting.value.background
  if (!bg) return ''
  return getPresetId(bg) || '__image__'
})

// 壁纸库：点小图只选中（同时清空链接与本地上传，免得保存时分不清要哪个）
function selectPreset(id) {
  selectedPreset.value = id
  backgroundUrl.value = ''
  localUpShow.value = false
  backgroundImage.value = ''
}

// 保存选中的壁纸（存为 preset:<id>）；选默认云朵则清除背景
function savePresetChoice() {
  if (settingLoading.value) return
  settingLoading.value = true
  const id = selectedPreset.value
  const req = id ? setBackground(BG_PRESET_PREFIX + id) : deleteBackground()
  req.then(() => {
    setting.value.background = id ? BG_PRESET_PREFIX + id : ''
    showSetBackground.value = false
    ElMessage({
      message: t('saveSuccessMsg'),
      type: "success",
      plain: true
    })
  }).finally(() => {
    settingLoading.value = false
  })
}

function openCut() {
  const doc = document.createElement('input')
  doc.setAttribute('type', 'file')
  doc.setAttribute('accept', 'image/*')
  doc.click()
  doc.onchange = async (e) => {
    backgroundFile = e.target.files[0]
    backgroundImage.value = URL.createObjectURL(e.target.files[0])
    localUpShow.value = true
    selectedPreset.value = null
  }
}

function openResendForm() {
  resendTokenFormShow.value = true
}

function openSendkitForm() {
  sendkitTokenFormShow.value = true
}

function openBrevoForm() {
  brevoTokenFormShow.value = true
}

function openBlackListForm() {
  blackFormShow.value = true
}

function openAiCodeFilter() {
  aiCodeFilterShow.value = true
}

function saveResendToken() {
  const settingForm = {
    resendTokens: {}
  }
  const domain = resendTokenForm.domain.slice(1)
  settingForm.resendTokens[domain] = resendTokenForm.token
  editSetting(settingForm)
}

function saveSendkitToken() {
  const settingForm = {
    sendkitTokens: {}
  }
  const domain = sendkitTokenForm.domain.slice(1)
  settingForm.sendkitTokens[domain] = sendkitTokenForm.token
  editSetting(settingForm)
}

function saveBrevoToken() {
  const settingForm = {
    brevoTokens: {}
  }
  const domain = brevoTokenForm.domain.slice(1)
  settingForm.brevoTokens[domain] = brevoTokenForm.token
  editSetting(settingForm)
}

function backupSetting() {
  const settingForm = {...setting.value}
  delete settingForm.resendTokens
  delete settingForm.sendkitTokens
  delete settingForm.brevoTokens
  delete settingForm.siteKey
  delete settingForm.secretKey
  backup = JSON.stringify(setting.value)
}

function cleanResendTokenForm() {
  resendTokenForm.token = ''
}

function cleanSendkitTokenForm() {
  sendkitTokenForm.token = ''
}

function cleanBrevoTokenForm() {
  brevoTokenForm.token = ''
}

function beforeChange() {
  if (!settingReady.value || settingLoading.value) return false
  backupSetting()
  return true
}

function change(e) {
  if (!settingReady.value) return
  const settingForm = {...setting.value}
  delete settingForm.siteKey
  delete settingForm.secretKey
  // 附件密钥在 attStorage 对象里，整包发过去会带上脱敏值，先从副本里去掉（后端合并时保留现值）
  if (settingForm.attStorage) {
    const as = {...settingForm.attStorage}
    delete as.s3AccessKey
    delete as.s3SecretKey
    delete as.r2AccessKey
    delete as.r2SecretKey
    delete as.webdavUsername
    delete as.webdavPassword
    settingForm.attStorage = as
  }
  // 备份密钥在 backupConfig 对象里，整包发过去会带上脱敏值，先从副本里去掉（后端合并时保留现值）
  if (settingForm.backupConfig) {
    const bc = {...settingForm.backupConfig}
    delete bc.backupS3AccessKey
    delete bc.backupS3SecretKey
    delete bc.backupR2AccessKey
    delete bc.backupR2SecretKey
    delete bc.backupWebdavUsername
    delete bc.backupWebdavPassword
    settingForm.backupConfig = bc
  }
  // TG Token 在 tgConfig 对象里，整包发过去会带上脱敏值，先从副本里去掉（后端合并时保留现值）
  if (settingForm.tgConfig) {
    const tc = {...settingForm.tgConfig}
    delete tc.tgBotToken
    settingForm.tgConfig = tc
  }
  delete settingForm.resendTokens
  delete settingForm.sendkitTokens
  delete settingForm.brevoTokens
  editSetting(settingForm, false)
}

function changeField(key, value) {
  if (!settingReady.value || settingLoading.value) return
  setting.value[key] = value
  editSetting({[key]: value}, false)
}

function loadAttStatus() {
  attKeyStatus().then(data => {
    attStatus.value = data
  }).catch(() => {
  })
}

function loadBackupStatus() {
  backupStatusReq().then(data => {
    Object.assign(backupStatus, data)
  }).catch(() => {
  })
}

function handleBackupExport() {
  backupExportLoading.value = true
  backupExport().then(async res => {
    if (await downloadBackupRes(res, 'backupFailed')) loadBackupStatus()
  }).catch(e => {
    console.error(e)
    ElMessage({message: t('backupFailed'), type: 'error', plain: true})
  }).finally(() => {
    backupExportLoading.value = false
  })
}

// 备份下载响应校验：服务端报错时返回的是不带 Content-Disposition 的 JSON，
// 直接下载会把报错内容存成文件且无任何提示；此时解析 message 弹错，不下载
async function downloadBackupRes(res, failKey) {
  if (!res.headers['content-disposition']) {
    let msg = t(failKey)
    try {
      const j = JSON.parse(await res.data.text())
      if (j.message) msg = j.message
    } catch {
    }
    ElMessage({message: msg, type: 'error', plain: true})
    return false
  }
  downloadExport(res)
  return true
}

function openBackupS3() {
  if (settingLoading.value) return
  resetBackupS3Form()
  backupS3Show.value = true
}

function openRestoreFile() {
  restoreFileInput.value?.click()
}

async function handleRestoreFile(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  let backup
  try {
    backup = JSON.parse(await file.text())
  } catch {
    ElMessage({message: t('restoreInvalidFile'), type: 'error', plain: true})
    return
  }
  if (!backup || backup.version !== 1 || !backup.d1 || !Array.isArray(backup.d1.tables) || !backup.kv) {
    ElMessage({message: t('restoreInvalidFile'), type: 'error', plain: true})
    return
  }
  ElMessageBox.confirm(t('restoreBackupConfirm'), t('restoreBackup'), {type: 'warning'}).then(() => {
    restoreLoading.value = true
    const formData = new FormData()
    formData.append('file', file)
    backupRestore(formData).then(data => {
      ElMessage({
        message: `${t('restoreBackupSuccess')} (${data.tables} tables, ${data.rows} rows, ${data.kvKeys} KV keys)`,
        type: 'success',
        plain: true
      })
      getSettings()
      loadBackupStatus()
    }).catch(err => {
      console.error(err)
      ElMessage({message: t('restoreBackupFailed'), type: 'error', plain: true})
    }).finally(() => {
      restoreLoading.value = false
    })
  }).catch(() => {
  })
}

function resetBackupS3Form() {
  const b = setting.value.backupConfig || {}
  backupS3.type = (b.backupType ?? setting.value.backupType) || 's3'
  backupS3.bucket = b.backupBucket ?? setting.value.backupBucket
  backupS3.endpoint = b.backupEndpoint ?? setting.value.backupEndpoint
  backupS3.region = b.backupRegion ?? setting.value.backupRegion
  backupS3.s3AccessKey = ''
  backupS3.s3SecretKey = ''
  backupS3.forcePathStyle = b.backupForcePathStyle ?? setting.value.backupForcePathStyle
  backupR2.accountId = b.backupR2AccountId ?? setting.value.backupR2AccountId
  backupR2.bucket = b.backupR2Bucket ?? setting.value.backupR2Bucket
  backupR2.accessKey = ''
  backupR2.secretKey = ''
  backupWebdav.url = b.backupWebdavUrl ?? setting.value.backupWebdavUrl
  backupWebdav.username = ''
  backupWebdav.password = ''
}

function saveBackupS3() {
  const bc = {
    backupType: backupS3.type,
    backupBucket: backupS3.bucket,
    backupEndpoint: backupS3.endpoint,
    backupRegion: backupS3.region,
    backupForcePathStyle: backupS3.forcePathStyle,
    backupR2AccountId: backupR2.accountId,
    backupR2Bucket: backupR2.bucket,
    backupWebdavUrl: backupWebdav.url
  }
  if (backupS3.s3AccessKey) bc.backupS3AccessKey = backupS3.s3AccessKey
  if (backupS3.s3SecretKey) bc.backupS3SecretKey = backupS3.s3SecretKey
  if (backupR2.accessKey) bc.backupR2AccessKey = backupR2.accessKey
  if (backupR2.secretKey) bc.backupR2SecretKey = backupR2.secretKey
  if (backupWebdav.username) bc.backupWebdavUsername = backupWebdav.username
  if (backupWebdav.password) bc.backupWebdavPassword = backupWebdav.password
  editSetting({backupConfig: bc})
}

function clearBackupS3() {
  if (backupS3.type === 'kv') {
    return
  }
  const form = {
    backupType: backupS3.type
  }
  if (backupS3.type === 'r2') {
    form.backupR2AccountId = ''
    form.backupR2Bucket = ''
    form.backupR2AccessKey = ''
    form.backupR2SecretKey = ''
  } else if (backupS3.type === 'webdav') {
    form.backupWebdavUrl = ''
    form.backupWebdavUsername = ''
    form.backupWebdavPassword = ''
  } else {
    form.backupBucket = ''
    form.backupEndpoint = ''
    form.backupRegion = ''
    form.backupS3AccessKey = ''
    form.backupS3SecretKey = ''
    form.backupForcePathStyle = 1
  }
  clearBackupS3Loading.value = true
  editSetting(form)
}

function rotateAttKey() {
  ElMessageBox.confirm(t('attRotateConfirm'), t('attRotateKey'), {type: 'warning'}).then(() => {
    attRotateLoading.value = true
    attRotateKey().then(data => {
      attStatus.value.fingerprint = data.fingerprint
      attStatus.value.hasKey = true
      ElMessage({
        message: t('attRotateSuccess'),
        type: "success",
        plain: true
      })
    }).finally(() => {
      attRotateLoading.value = false
    })
  }).catch(() => {
  })
}

function saveTitle() {
  editSetting({title: editTitle.value})
}

function jump(href) {
  const doc = document.createElement('a')
  doc.href = href
  doc.target = '_blank'
  doc.click()
}

function editSetting(settingForm, refreshStatus = true) {
  if (settingLoading.value) return
  settingLoading.value = true

  settingSet(settingForm).then(() => {
    settingLoading.value = false
    ElMessage({
      message: t('saveSuccessMsg'),
      type: "success",
      plain: true
    })
    if (setting.value.manyEmail === 1) {
      accountStore.currentAccountId = userStore.user.account.accountId;
    }
    if (refreshStatus) {
      getSettings()
    }
    editTitleShow.value = false
    resendTokenFormShow.value = false
    sendkitTokenFormShow.value = false
    brevoTokenFormShow.value = false
    turnstileShow.value = false
    tgSettingShow.value = false
    notifySettingShow.value = false
    webhookShow.value = false
    addVerifyCountShow.value = false
    regVerifyCountShow.value = false
    noticePopupShow.value = false
    addS3Show.value = false
    backupS3Show.value = false
    emailPrefixShow.value = false
    aiCodeFilterShow.value = false
    autoCleanShow.value = false
    auditCleanShow.value = false
    oauthSettingShow.value = false
  }).catch((e) => {
    loginOpacity.value = setting.value.loginOpacity
    setting.value = {...setting.value, ...JSON.parse(backup)}
  }).finally(() => {
    settingLoading.value = false
    clearS3Loading.value = false
    clearBackupS3Loading.value = false
    loadBackupStatus()
  })
}
</script>

<style scoped lang="scss">
.settings-container {
  height: 100%;
  overflow: hidden;
  background: var(--settings-page-background) !important;
  position: relative;

  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    z-index: 2;
    width: 100%;
    position: absolute;
    top: 0;
    left: 0;
  }

  .loading-show {
    transition: all 200ms ease 200ms;
    opacity: 1;
  }

  .loading-hide {
    transition: var(--loading-hide-transition);
    pointer-events: none;
    opacity: 0;
  }
}

.scroll {
  width: 100%;
  min-height: 100%;

  :deep(.el-scrollbar__view) {
    height: 100%;
  }

  .scroll-body {
    min-height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
}

.card-grid {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  gap: 20px;
  @media (max-width: 1023px) {
    gap: 15px;
    padding: 15px;
  }
}

.background {
  width: 249px;
  height: 140px;
  border-radius: 4px;
  border: 1px solid var(--light-border);
  overflow: hidden;
  @media (max-width: 500px) {
    width: 160px;
    height: 90px;
  }
}

.background-btn {
  display: flex;
  gap: 10px;
  flex-direction: column;
}

.bot-verify-select {
  margin-left: 10px;
}

.settings-card {
  background-color: var(--el-bg-color);
  border-radius: 6px;
  border: 1px solid var(--el-border-color);
  transition: all 300ms;
  overflow: hidden;
  max-width: 900px;
  width: 100%;
}


.card-title {
  font-size: 15px;
  font-weight: bold;
  padding: 15px 20px 12px;
  border-bottom: 1px solid var(--el-border-color);
}

.card-content {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.backup-kv-tip {
  font-size: 12px;
  color: var(--secondary-text-color);
  line-height: 1.6;
  margin-top: -6px;
}

.setting-item {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
  font-weight: normal;

  > div:first-child {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  > div:last-child {
    display: grid;
    grid-template-columns: 1fr auto;
    justify-items: flex-end;
    font-weight: normal;
  }
}

.oauth-icon {
  width: 22px !important;
  height: 22px !important;
  min-width: 22px;
  flex-shrink: 0;
  margin-right: 2px;
}

.title-icon.warning {
  position: relative;
  top: 2px;
  cursor: pointer;
  margin-left: 2px;
}

.warning {
  margin-left: 2px;
  color: grey;
  cursor: pointer;
}

.cropper {
  border-radius: 4px;
  border: 1px solid var(--el-border-color);
  height: 397px;
  width: 705px;
  @media (max-width: 767px) {
    width: calc(100vw - 60px);
    height: calc((100vw - 60px) * 9 / 16);
  }
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.webhook-footer-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.webhook-format-title {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
  color: var(--el-color-primary);
  font-size: 13px;
}

.webhook-format-icon {
  transition: transform 0.2s;
  &.open {
    transform: rotate(180deg);
  }
}

.notice-popup-item {
  margin-top: 15px;
}

.notice-line-item {
  margin-top: 15px;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 15px;

  > * {
    width: 100%;
  }

  @media (max-width: 840px) {
    grid-template-columns: 1fr 1fr;
  }
  @media (max-width: 580px) {
    grid-template-columns: 1fr;
  }
}

.background-url {
  width: min(calc(100vw - 70px), 500px);
}


:deep(.el-dialog) {
  width: 400px !important;
  @media (max-width: 440px) {
    width: calc(100% - 40px) !important;
    margin-right: 20px !important;
    margin-left: 20px !important;
  }
}

:deep(.resend-table.el-dialog) {
  min-height: 300px;
  width: 500px !important;
  @media (max-width: 540px) {
    width: calc(100% - 40px) !important;
    margin-right: 20px !important;
    margin-left: 20px !important;
  }
}

:deep(.notice-popup.el-dialog) {
  min-height: 300px;
  width: 820px !important;
  @media (max-width: 860px) {
    width: calc(100% - 40px) !important;
    margin-right: 20px !important;
    margin-left: 20px !important;
  }
}

:deep(.resend-table .el-dialog__header) {
  padding-bottom: 5px;
}

:deep(.el-table__inner-wrapper:before) {
  background: var(--el-bg-color);
}

:deep(.cut-dialog.el-dialog) {
  width: fit-content !important;
  height: fit-content !important;
}

.bg-preset-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 420px;
  max-width: calc(100vw - 60px);
}

.bg-preset-head {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.bg-preset-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.bg-preset-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.bg-preset-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.bg-preset-item {
  height: 64px;
  border-radius: 8px;
  cursor: pointer;
  border: 2px solid transparent;
  position: relative;
  overflow: hidden;
}

.bg-preset-item span {
  position: absolute;
  left: 8px;
  bottom: 6px;
  z-index: 1;
  font-size: 12px;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

.bg-preset-item.active {
  border-color: var(--el-color-primary);
}

.bg-preset-default {
  background: linear-gradient(to bottom, #2980b9, #6dd5fa, #fff);
  position: relative;
  overflow: hidden;
}


:deep(.forward-dialog.el-dialog) {
  width: 500px !important;
  @media (max-width: 540px) {
    width: calc(100% - 40px) !important;
    margin-right: 20px !important;
    margin-left: 20px !important;
  }
}

.forward-dialog {
  .forward-head {
    display: flex;
    align-items: center;

    .forward-set-title {
      top: 1px;
      padding-right: 5px;
      position: relative;
      font-size: 16px;
      font-weight: bold;;
    }
  }
}

.error-image {
  background: var(--light-ill);
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.cut-button {
  padding-top: 15px;
  width: 100%;
  display: flex;
  justify-content: space-between;

  .el-button {
    width: fit-content;
  }
}

.bot-verify {
  display: grid;
  grid-template-columns: 1fr auto;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;

  span {
    display: flex;
    align-items: center;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    min-width: 0;
  }

  .el-button {
    width: 48px;
    margin: 0 0 0 10px;
  }
}

.forward-set-body {
  display: flex;
  flex-direction: column;

  .el-switch {
    align-self: end;
  }

  > *:nth-child(-n+2) {
    margin-bottom: 15px;
  }

  .forward-tip {
    margin-top: 12px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    line-height: 1.6;
  }

  .tg-msg-label {
    margin-top: 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    .el-select {
      width: v-bind(tgMsgLabelWidth);
    }
    .el-input-number {
      width: 120px;
    }
  }

  .webhook-format pre {
    margin: 8px 0 0;
    padding: 10px;
    font-size: 12px;
    line-height: 1.5;
    overflow-x: auto;
    border-radius: 4px;
    background: var(--el-fill-color-light);
  }
}

.forward {
  span {
    display: flex;
    align-items: center;
  }

  .el-button {
    width: 48px;
    margin: 0 0 0 10px;
  }
}

.opt-button {
  width: fit-content !important;
}

.email-prefix {
  display: flex;
  justify-content: space-between;
}

.prefix-filter {
  display: flex;
  flex-direction: column;
}

.s3-button {
  display: grid;
  grid-template-columns: 80px 1fr;
  gap: 15px;

  .el-button {
    margin-left: 0;
  }
}

.r2domain {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;

  .storage-type {
    margin-right: 3px;
  }

  span {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .el-button {
    width: 48px;
    margin: 0 0 0 10px;
  }
}

.personalized {
  align-items: start;

  > div:last-child {
    display: flex;
    justify-content: end;

    .el-button {
      margin-left: 10px;
      margin-top: 0;
    }
  }
}

.dialog-input {
  margin-bottom: 15px;
}

.backup-field-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--el-text-color-primary);
  margin-bottom: 4px;
}

.backup-kv-note {
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-text-color-regular);
  background: var(--light-ill);
  border-radius: 4px;
  padding: 8px 10px;
  margin-bottom: 15px;
}

.force-path-style {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  .force-path-style-left {
    padding-left: 2px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 5px;
  }
}

.concerning-item {
  display: flex;
  align-items: center;

  .community {
    display: flex;
    row-gap: 10px;
    flex-wrap: wrap;
  }

  :deep(.el-button) {
    padding: 0 10px;
    font-weight: normal;

    i {
      font-size: 22px;
    }
  }

  > span:first-child {
    font-weight: normal;
    padding-right: 20px;
    white-space: nowrap;
  }
}

.email-title {
  font-weight: normal !important;
  display: grid;
  gap: 10px;
  grid-template-columns: 1fr auto;
  align-items: center;

  span {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .el-button {
    margin-top: 0;
  }
}

.token-item {
  padding-top: 0;

  div:last-child {
    font-weight: normal;
  }
}

form .el-button {
  margin-top: 10px;
  width: 100%;
}

.el-switch {
  height: 28px;
}


:deep(.el-button--small) {
  margin-top: 2px !important;
  margin-bottom: 2px !important;
  height: 24px;
}

:deep(.el-select__wrapper) {
  min-height: 28px;
}

</style>

<style>
.el-popper.is-dark {
}
</style>
