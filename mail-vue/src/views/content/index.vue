<template>
  <div class="box" :class="{ pane: props.pane }">
    <div class="header-actions">
      <el-tooltip v-if="!props.pane" effect="dark" :content="$t('back')">
        <Icon class="icon" icon="material-symbols-light:arrow-back-ios-new" width="20" height="20" @click="handleBack"/>
      </el-tooltip>
      <el-tooltip effect="dark" :content="emailStore.contentData.delType === 'trash' ? $t('deleteForever') : $t('delete')">
        <Icon v-perm="'email:delete'" class="icon" icon="uiw:delete" width="16" height="16" @click="handleDelete"/>
      </el-tooltip>
      <el-tooltip effect="dark" :content="$t('restore')">
        <Icon v-if="emailStore.contentData.delType === 'trash'" v-perm="'email:delete'" class="icon" icon="mdi:restore" width="20" height="20" @click="handleRestore"/>
      </el-tooltip>
      <el-tooltip effect="dark" :content="$t('markSpam')">
        <Icon v-if="emailStore.contentData.showSpam" v-perm="'email:delete'" class="icon" icon="hugeicons:mail-block-01" width="20" height="20" @click="handleMarkSpam"/>
      </el-tooltip>
      <el-tooltip effect="dark" :content="$t('notSpam')">
        <Icon v-if="emailStore.contentData.delType === 'spam'" v-perm="'email:delete'" class="icon" icon="mdi:restore" width="20" height="20" @click="handleUnspam"/>
      </el-tooltip>
      <span class="star" v-if="emailStore.contentData.showStar">
        <el-tooltip v-if="email.isStar" effect="dark" :content="$t('unstar')">
          <Icon class="icon" @click="changeStar" icon="fluent-color:star-16" width="20" height="20"/>
        </el-tooltip>
        <el-tooltip v-else effect="dark" :content="$t('starIt')">
          <Icon class="icon" @click="changeStar" icon="solar:star-line-duotone" width="18.5" height="18.5"/>
        </el-tooltip>
      </span>
      <el-tooltip effect="dark" :content="$t('markAsUnread')">
        <Icon class="icon" v-if="['logic', 'spam'].includes(emailStore.contentData.delType) && email.unread === EmailUnreadEnum.READ" @click="handleMarkUnread" icon="fluent:mail-unread-20-regular" width="20" height="20" />
      </el-tooltip>
      <el-tooltip effect="dark" :content="$t('reply')">
        <Icon class="icon" v-if="emailStore.contentData.showReply" v-perm="'email:send'"  @click="openReply" icon="fluent-mdl2:reply" width="19" height="19" />
      </el-tooltip>
      <el-tooltip effect="dark" :content="$t('forward')">
        <Icon class="icon" v-if="emailStore.contentData.showReply" v-perm="'email:send'"  @click="openForward" icon="iconoir:arrow-up-right" width="20" height="20" />
      </el-tooltip>
      <el-tooltip effect="dark" :content="$t('exportMail')">
        <Icon class="icon" @click="handleExport" icon="system-uicons:push-down" width="22" height="22" />
      </el-tooltip>
    </div>
    <div></div>
    <el-scrollbar class="scrollbar">
      <div class="container">
        <div class="email-title">
          {{ email.subject }}
        </div>
        <div class="content">
          <div class="email-info">
            <div class="address-meta">
              <div class="send"><span class="send-source">{{$t('from')}}</span>
                <!-- 发件人卡片（Gmail 式）：悬停/点发件人弹出，显示头像、名字、邮箱再决定加不加；已发送的发件人是自己，不弹 -->
                <el-popover
                    placement="bottom-start"
                    :width="300"
                    :trigger="['hover', 'click']"
                    :show-after="300"
                    :disabled="email.type !== 0"
                    @show="onSenderCardShow"
                >
                  <template #reference>
                    <div class="send-name" ref="sendNameRef" :class="{ 'is-wrapped': senderWrapped, 'can-card': email.type === 0 }">
                      <span class="send-name-title">{{ email.name }}</span>
                      <span class="send-email"><{{ email.sendEmail }}></span>
                      <span class="sent-via" v-if="sentViaEmail">
                        <el-tooltip effect="dark" :content="$t('sentVia', { email: sentViaEmail })">
                          <span>
                            <el-tag size="small" disable-transitions>{{ $t('sentViaTag') }}</el-tag>
                          </span>
                        </el-tooltip>
                      </span>
                    </div>
                  </template>
                  <div class="sender-card">
                    <div class="sender-card-top">
                      <span class="sender-card-avatar" :style="{ backgroundColor: senderAvatar.color }">{{ senderAvatar.letter }}</span>
                      <div class="sender-card-info">
                        <div class="sender-card-name">{{ email.name }}</div>
                        <div class="sender-card-email">{{ email.sendEmail }}</div>
                      </div>
                    </div>
                    <el-button v-if="!senderInContacts" type="primary" size="small" :loading="senderCardAdding" class="sender-card-btn" @click="addSenderFromCard">
                      <Icon icon="fluent:person-add-20-regular" width="16" height="16" style="margin-right: 4px"/>{{ $t('addToContacts') }}
                    </el-button>
                    <div v-else class="sender-card-added">
                      <Icon icon="mdi:check" width="16" height="16"/>{{ $t('alreadyInContacts') }}
                    </div>
                  </div>
                </el-popover>
              </div>
              <div class="receive"><span class="source">{{$t('recipient')}}</span><span class="receive-email">{{  formateReceive(email.recipient) }}</span></div>
              <div class="receive" v-if="ccText"><span class="source">{{$t('cc')}}</span><span class="receive-email">{{ ccText }}</span></div>
              <div class="date">
                <div>{{ formatDetailDate(email.createTime) }}</div>
              </div>
              <div class="pair-count" v-if="email.pairCount > 1">
                <Icon icon="fluent:mail-copy-20-regular" width="16" height="16"/>
                <span>{{ $t('pairCountTip', {count: email.pairCount}) }}</span>
              </div>
            </div>
            <el-alert v-if="email.status === 3" :closable="false" :title="toMessage(email.message)" class="email-msg" type="error" show-icon />
            <el-alert v-if="email.status === 4" :closable="false" :title="$t('complained')" class="email-msg" type="warning" show-icon />
            <el-alert v-if="email.status === 5" :closable="false" :title="$t('delayed')" class="email-msg" type="warning" show-icon />
          </div>
          <el-scrollbar class="htm-scrollbar" :class="!email.attList?.length ? 'bottom-distance' : ''">
            <ShadowHtml class="shadow-html" :html="formatImage(email.content)" v-if="email.content" />
            <pre v-else class="email-text" >{{email.text}}</pre>
          </el-scrollbar>
          <div class="att" v-if="email.attList?.length > 0">
            <div class="att-title">
              <span>{{$t('attachments')}}</span>
              <span>{{$t('attCount',{total: email.attList.length})}}</span>
            </div>
            <div class="att-box">

              <div class="att-item" v-for="att in email.attList" :key="att.attId">
                <div class="att-icon" @click="previewerRef.open(email.attList, att)">
                  <Icon v-bind="getIconByName(att.filename)" />
                </div>
                <div class="att-name" @click="previewerRef.open(email.attList, att)">
                  {{ att.filename }}
                </div>
                <div class="att-size">{{ formatBytes(att.size) }}</div>
                <div class="opt-icon att-icon">
                  <el-tooltip effect="dark" :content="$t('view')">
                    <Icon v-if="isImage(att.filename)" icon="hugeicons:view" width="22" height="22" @click="showImage(att)"/>
                  </el-tooltip>
                  <el-tooltip effect="dark" :content="$t('download')">
                    <a :href="cvtR2Url(att.key)" download>
                      <Icon icon="system-uicons:push-down" width="22" height="22"/>
                    </a>
                  </el-tooltip>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-scrollbar>
    <el-image-viewer
        v-if="showPreview"
        :url-list="srcList"
        show-progress
        @close="showPreview = false"
    />
    <delete-notify-dialog v-model="notifyDialog.visible" :message="notifyDialog.message"
                          :show-notify="notifyDialog.showNotify" :has-pair="notifyDialog.hasPair"
                          @confirm="onNotifyDialogConfirm"/>
    <att-previewer ref="previewerRef"/>
  </div>
</template>
<script setup>
import ShadowHtml from '@/components/shadow-html/index.vue'
import deleteNotifyDialog from "@/components/delete-notify-dialog/index.vue"
import {computed, reactive, ref, watch, onMounted, onUnmounted, nextTick} from "vue";
import {useRouter} from 'vue-router'
import {ElMessage, ElMessageBox} from 'element-plus'
import {emailDelete, emailRead, emailUnread, emailRestore, emailPhysicsDelete, emailExport, downloadExport, emailMarkSpam, emailUnmarkSpam} from "@/request/email.js";
import {contactAdd, contactSuggest} from "@/request/contact.js";
import {avatarLetter} from "@/utils/avatar.js";
import {Icon} from "@iconify/vue";
import {useEmailStore} from "@/store/email.js";
import {useSidebarStore} from "@/store/sidebar.js";
import {useUserStore} from "@/store/user.js";
import {useAccountStore} from "@/store/account.js";
import {formatDetailDate} from "@/utils/day.js";
import {starAdd, starCancel} from "@/request/star.js";
import {getExtName, formatBytes} from "@/utils/file-utils.js";
import {cvtR2Url,toOssDomain} from "@/utils/convert.js";
import {getIconByName} from "@/utils/icon-utils.js";
import attPreviewer from "@/components/att-previewer/index.vue";
import {useSettingStore} from "@/store/setting.js";
import {allEmailDelete} from "@/request/all-email.js";
import {useUiStore} from "@/store/ui.js";
import {useI18n} from "vue-i18n";
import {EmailUnreadEnum} from "@/enums/email-enum.js";
const { t } = useI18n()

// pane 模式：嵌在三栏阅读的右边看正文，返回/删除等操作只清掉当前选中，不跳路由
const props = defineProps({
  pane: {
    type: Boolean,
    default: false
  }
})

const uiStore = useUiStore();
const settingStore = useSettingStore();
const accountStore = useAccountStore();
const emailStore = useEmailStore();
const sidebarStore = useSidebarStore();
const userStore = useUserStore();
const router = useRouter()

// 管理员删除通知弹窗：仅全部邮件详情页，删到别人的邮件、或邮件带副本时出现
const notifyDialog = reactive({
  visible: false,
  message: '',
  showNotify: true,
  hasPair: false,
})

function onNotifyDialogConfirm(opts) {
  allEmailDelete(email.value.emailId, opts).then((deletedIds) => {
    ElMessage({
      message: t('delSuccessMsg'),
      type: 'success',
      plain: true,
    })
    // 成对删除时后端返回实际删掉的全部 id（含副本），列表按它移除
    emailStore.deleteIds = Array.isArray(deletedIds) && deletedIds.length ? deletedIds : [email.value.emailId]
  })
  handleBack()
}
const sendNameRef = ref(null)
const senderWrapped = ref(false)
let senderResizeObserver = null

const showPreview = ref(false)
const srcList = reactive([])
const previewerRef = ref(null)


const email = computed(() => emailStore.contentData.email || {
  emailId: 0,
  attList: [],
  content: '',
  text: '',
  recipient: '[]',
})

const ccText = computed(() => formateReceive(email.value.cc))

const sentViaEmail = computed(() => {
  const raw = String(email.value.senderEmail || '').trim()
  if (!raw) return ''
  const matched = raw.match(/<([^>]+)>/)
  const address = (matched ? matched[1] : raw).trim()
  if (!address || address.toLowerCase() === String(email.value.sendEmail || '').trim().toLowerCase()) return ''
  return address
})

// 发件人卡片（Gmail 式）：弹出时查是否已在通讯录里
const senderInContacts = ref(false)
const senderCardAdding = ref(false)
const senderAvatar = computed(() => avatarLetter(email.value?.name, email.value?.sendEmail))

watch(() => email.value?.emailId, () => {
  senderInContacts.value = false
})

async function onSenderCardShow() {
  const addr = String(email.value?.sendEmail || '').trim()
  if (!addr) return
  try {
    const found = await contactSuggest(addr)
    senderInContacts.value = (found || []).some(c => String(c.email || '').toLowerCase() === addr.toLowerCase())
  } catch (e) {
    console.error(e)
  }
}

async function addSenderFromCard() {
  const addr = String(email.value?.sendEmail || '').trim()
  if (!addr) return
  senderCardAdding.value = true
  try {
    await contactAdd({name: email.value?.name || '', email: addr})
    senderInContacts.value = true
    ElMessage({message: t('addedToContacts'), type: 'success', plain: true})
  } catch (e) {
    // 失败提示由 axios 拦截器统一弹出，这里只记日志
    console.error(e)
  }
  senderCardAdding.value = false
}

watch(() => accountStore.currentAccountId, () => {
  handleBack()
})

let readRequesting = false

function contentWidth(el) {
  const range = document.createRange()
  range.selectNodeContents(el)
  const width = range.getBoundingClientRect().width
  range.detach()
  return width
}

function updateSenderWrap() {
  const root = sendNameRef.value
  if (!root) return
  const name = root.querySelector('.send-name-title')
  const mail = root.querySelector('.send-email')
  const tag = root.querySelector('.sent-via')
  if (!name || !mail) {
    senderWrapped.value = false
    return
  }
  const gap = 6
  let need = contentWidth(name) + gap + contentWidth(mail)
  if (tag) need += gap + contentWidth(tag)
  senderWrapped.value = need > root.clientWidth + 0.5
}


function tryMarkRead() {
  if (!emailStore.contentData.showUnread || readRequesting) return
  const current = email.value
  if (!current?.emailId || current.unread !== EmailUnreadEnum.UNREAD) return

  // 等详情数据就绪（detailMap 已写入，或正文已有内容）再标已读
  const full = emailStore.detailMap[current.emailId]
  const detailReady = !!full || !!(current.content || current.text)
  if (!detailReady) return

  readRequesting = true
  const emailId = current.emailId
  current.unread = EmailUnreadEnum.READ
  if (emailStore.detailMap[emailId]) {
    emailStore.detailMap[emailId].unread = EmailUnreadEnum.READ
  }
  emailStore.markListRead(emailId)
  emailRead([emailId]).finally(() => {
    readRequesting = false
    // 点开邮件即标已读，未读数变了，「有未读时显示」的条目靠它决定显隐
    sidebarStore.refreshUnread()
  })
}

// 详情页标为未读：tryMarkRead 的反向操作，本地状态先改回未读，成功后刷新侧边栏未读数
const handleMarkUnread = () => {
  const current = email.value
  if (!current?.emailId || current.unread !== EmailUnreadEnum.READ) return
  const emailId = current.emailId
  current.unread = EmailUnreadEnum.UNREAD
  if (emailStore.detailMap[emailId]) {
    emailStore.detailMap[emailId].unread = EmailUnreadEnum.UNREAD
  }
  emailStore.markListUnread(emailId)
  emailUnread([emailId]).then(() => {
    sidebarStore.refreshUnread()
  })
}

watch(
  () => [
    email.value?.emailId,
    email.value?.content,
    email.value?.text,
    emailStore.detailMap[email.value?.emailId]
  ],
  () => tryMarkRead(),
  { flush: 'post' }
)

watch(
  () => [email.value?.name, email.value?.sendEmail, sentViaEmail.value],
  () => nextTick(updateSenderWrap)
)

onMounted(() => {
  tryMarkRead()
  window.addEventListener('keydown', handleKeyDown);
  senderResizeObserver = new ResizeObserver(() => updateSenderWrap())
  if (sendNameRef.value) senderResizeObserver.observe(sendNameRef.value)
  nextTick(updateSenderWrap)
})

onUnmounted(() => {
  emailStore.contentData.showUnread = false;
  readRequesting = false
  window.removeEventListener('keydown', handleKeyDown);
  senderResizeObserver?.disconnect()
})

function handleKeyDown(event) {
  if (event.key !== 'Escape') return;
  if (showPreview.value) return;
  if (document.querySelector('.el-message-box')) return;
  const writeBox = document.querySelector('.write-box');
  if (writeBox && writeBox.offsetParent !== null) return;
  handleBack();
}

function openReply() {
  uiStore.writerRef.openReply(email.value)
}

function openForward() {
  uiStore.writerRef.openForward(email.value)
}

function toMessage(message) {
  return  message ? JSON.parse(message).message : '';
}

function formatImage(content) {
  content = content || '';
  const domain = settingStore.settings.r2Domain;
  return  content.replace(/{{domain}}/g, toOssDomain(domain) + '/');
}

function showImage(att) {
  // 注意按文件名判图片：附件 key 是纯内容哈希、没有扩展名，按 key 判永远是假
  if (!isImage(att.filename)) return;
  const url = cvtR2Url(att.key)
  srcList.length = 0
  srcList.push(url)
  showPreview.value = true
}

function isImage(filename) {
  return ['png', 'jpg', 'jpeg', 'bmp', 'gif', 'jfif', 'webp', 'avif', 'svg', 'ico'].includes(getExtName(filename))
}

function formateReceive(recipient) {
  if (!recipient) return ''
  recipient = JSON.parse(recipient)
  return recipient.map(item => item.address).join(', ')
}

function changeStar() {
  if (email.value.isStar) {
    email.value.isStar = 0;
    starCancel(email.value.emailId).then(() => {
      email.value.isStar = 0;
      emailStore.cancelStarEmailId = email.value.emailId
      setTimeout(() => emailStore.cancelStarEmailId = 0)
      emailStore.starScroll?.deleteEmail([email.value.emailId])
      sidebarStore.refreshUnread()
    }).catch((e) => {
      console.error(e)
      email.value.isStar = 1;
    })
  } else {
    email.value.isStar = 1;
    starAdd(email.value.emailId).then(() => {
      email.value.isStar = 1;
      emailStore.addStarEmailId = email.value.emailId
      setTimeout(() => emailStore.addStarEmailId = 0)
      emailStore.starScroll?.addItem(email.value)
      sidebarStore.refreshUnread()
    }).catch((e) => {
      console.error(e)
      email.value.isStar = 0;
    })
  }
}

const handleBack = () => {
  if (props.pane) {
    emailStore.contentData.email = null
    return
  }
  router.back()
}

const handleExport = () => {
  if (!email.value?.emailId) return;
  emailExport([email.value.emailId]).then(res => {
    downloadExport(res);
  }).catch(e => {
    console.error(e);
    ElMessage({message: t('exportFailed'), type: 'error', plain: true});
  });
}

const handleDelete = () => {
  const delType = emailStore.contentData.delType
  if (delType !== 'logic' && delType !== 'trash' && delType !== 'spam') {
    const v = settingStore.settings.adminDelNotify
    const enabled = v === undefined || v === null || v !== 0
    const myEmail = (userStore.user.email || '').toLowerCase()
    const other = email.value.userEmail && email.value.userEmail.toLowerCase() !== myEmail
    const showNotify = enabled && other
    const hasPair = email.value.pairCount > 1
    if (showNotify || hasPair) {
      notifyDialog.message = t('delEmailConfirm')
      notifyDialog.showNotify = showNotify
      notifyDialog.hasPair = hasPair
      notifyDialog.visible = true
      return
    }
  }
  ElMessageBox.confirm(emailStore.contentData.delType === 'trash' ? t('delForeverOneConfirm') : t('delEmailConfirm'), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    if (emailStore.contentData.delType === 'logic' || emailStore.contentData.delType === 'spam') {
      emailDelete(email.value.emailId).then(() => {
        ElMessage({
          message: t('delSuccessMsg'),
          type: 'success',
          plain: true,
        })
        emailStore.deleteIds = [email.value.emailId]
        sidebarStore.refreshUnread()
      })
    } else if (emailStore.contentData.delType === 'trash') {

      emailPhysicsDelete(email.value.emailId).then(() => {
        ElMessage({
          message: t('delSuccessMsg'),
          type: 'success',
          plain: true,
        })
        emailStore.deleteIds = [email.value.emailId]
        sidebarStore.refreshUnread()
      })
    } else  {

      allEmailDelete(email.value.emailId).then(() => {
        ElMessage({
          message: t('delSuccessMsg'),
          type: 'success',
          plain: true,
        })
        emailStore.deleteIds = [email.value.emailId]
        sidebarStore.refreshUnread()
      })
    }

    handleBack()
  })
}

const handleRestore = () => {
  emailRestore([email.value.emailId]).then(() => {
    ElMessage({
      message: t('restoreSuccessMsg'),
      type: 'success',
      plain: true,
    })
    emailStore.deleteIds = [email.value.emailId]
    handleBack()
  })
}

const handleMarkSpam = () => {
  emailMarkSpam([email.value.emailId]).then(() => {
    ElMessage({
      message: t('markSpamSuccessMsg'),
      type: 'success',
      plain: true,
    })
    emailStore.deleteIds = [email.value.emailId]
    handleBack()
  })
}

const handleUnspam = () => {
  emailUnmarkSpam([email.value.emailId]).then(() => {
    ElMessage({
      message: t('unspamSuccessMsg'),
      type: 'success',
      plain: true,
    })
    emailStore.deleteIds = [email.value.emailId]
    handleBack()
  })
}
</script>
<style scoped lang="scss">
.box {
  height: 100%;
  overflow: hidden;
}

/* 三栏阅读窗：正文区收窄一点，附件盒子不设最小宽，避免窄窗下被裁 */
.box.pane {
  .container {
    padding-left: 16px;
    padding-right: 16px;
  }
  .att-box {
    min-width: 0;
  }
}

.header-actions {
  padding: 9px 15px 9px;
  display: flex;
  align-items: center;
  gap: 20px;
  box-shadow: var(--header-actions-border);
  font-size: 18px;
  .star {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 21px;
  }
  .icon {
    cursor: pointer;
  }
}


.scrollbar {
  height: calc(100% - 38px);
  width: 100%;
}

/* 发件人卡片（el-popover 内容传送到 body，样式须放顶层，不能嵌在 .container 下面） */
.sender-card {
  .sender-card-top {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }
  .sender-card-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 17px;
    font-weight: 600;
    flex-shrink: 0;
    user-select: none;
  }
  .sender-card-info {
    min-width: 0;
  }
  .sender-card-name {
    font-size: 15px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    overflow-wrap: anywhere;
  }
  .sender-card-email {
    font-size: 13px;
    color: var(--el-text-color-secondary);
    overflow-wrap: anywhere;
  }
  .sender-card-btn {
    width: 100%;
  }
  .sender-card-added {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    font-size: 13px;
    color: var(--el-text-color-secondary);
    padding: 4px 0;
  }
}

.container {
  font-size: 14px;
  padding-left: 20px;
  padding-right: 20px;
  padding-top: 10px;
  @media (max-width: 1023px) {
    padding-left: 15px;
    padding-right: 15px;
  }

  .email-title {
    font-size: 20px;
    font-weight: bold;
    margin-bottom: 10px;
  }

  .htm-scrollbar {
  }

  .content {
    display: flex;
    flex-direction: column;

    .att {
      margin-top: 30px;
      margin-bottom: 30px;
      border: 1px solid var(--light-border-color);
      padding: 14px;
      border-radius: 6px;
      width: fit-content;
      .att-box {
        min-width: min(410px,calc(100vw - 60px));
        max-width: 600px;
        display: grid;
        gap: 12px;
        grid-template-rows: 1fr;
      }

      .att-title {
        margin-bottom: 8px;
        display: flex;
        justify-content: space-between;
        span:first-child {
          font-weight: bold;
        }
      }

      .att-item {
        cursor: pointer;
        div {
          align-self: center;
        }
        background: var(--light-ill);
        padding: 5px 7px;
        border-radius: 4px;
        align-self: start;
        display: grid;
        grid-template-columns: auto 1fr auto auto;
        .att-icon {
          display: grid;
        }

        .att-size {
          color: var(--secondary-text-color);
        }

        .att-name {
          margin-left: 8px;
          margin-right: 8px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          word-break: break-all;
        }

        .att-image {
          width: 60px;
          height: 60px;
          object-fit: contain;
        }

        .opt-icon {
          padding-left: 10px;
          color: var(--secondary-text-color);
          align-items: center;
          display: flex;
          gap: 8px;
          cursor: pointer;
          a {
            color: var(--secondary-text-color);
            align-items: center;
            display: flex;
          }
        }
      }
    }

    .email-info {

      border-bottom: 1px solid var(--light-border-color);
      margin-bottom: 20px;
      padding-bottom: 8px;
      @media (max-width: 1024px) {
        margin-bottom: 15px;
      }
      .date {
        color: var(--regular-text-color);
        margin-bottom: 6px;
      }

      .pair-count {
        display: flex;
        align-items: center;
        gap: 4px;
        color: var(--regular-text-color);
        margin-bottom: 6px;
      }

      .email-msg {
        max-width: 400px;
        width: fit-content;
        margin-bottom: 15px;
      }

      .address-meta {
        display: grid;
        grid-template-columns: max-content minmax(0, 1fr);
        column-gap: 10px;
        row-gap: 6px;
        align-items: baseline;
      }

      .send,
      .receive {
        display: contents;
      }

      .send {
        .send-name {
          color: var(--regular-text-color);
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          column-gap: 6px;

          &.can-card {
            cursor: pointer;
          }

          .send-email {
            max-width: 100%;
            overflow-wrap: anywhere;
          }

          &.is-wrapped {
            .send-name-title {
              order: 1;
            }

            .sent-via {
              order: 2;
            }

            .send-email {
              order: 3;
              flex-basis: 100%;
            }
          }
        }
      }

      .receive {
        .receive-email {
          max-width: 700px;
          word-break: break-word;
        }
        span:nth-child(2) {
          color: var(--regular-text-color);
        }
      }

      .date {
        grid-column: 1 / -1;
      }

      .send-source,
      .source {
        white-space: nowrap;
        font-weight: bold;
        text-align: left;
      }
    }
  }
}

.shadow-html::after  {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--message-block-color); /* 半透明黑色蒙层 */
  pointer-events: none; /* 不影响点击 */
}

.email-text {
  font-family: inherit;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
}

.bottom-distance {
  margin-bottom: 30px;
}


</style>
