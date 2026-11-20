<template>
  <div class="email-container">
    <div class="header-actions">
      <!-- 移动端默认不显示全选框，进入选择模式（长按勾选）后才出现 -->
      <el-checkbox
          v-if="!isMobile || selectMode"
          v-model="checkAll"
          :indeterminate="isIndeterminate"
          :disabled="!emailList.length || loading"
          @change="handleCheckAllChange"
      >
      </el-checkbox>
      <div class="header-left" :style="'padding-left:' + actionLeft">

        <el-tooltip effect="dark" :content="$t('refresh')">
          <Icon class="icon reload" icon="ion:reload" width="20" height="20" @click="refresh"/>
        </el-tooltip>
        <slot name="first"></slot>
        <el-tooltip effect="dark" :content="props.type === 'trash' ? $t('deleteForeverSelected') : $t('deleteSelected')">
          <Icon v-perm="'email:delete'" class="icon delete" icon="uiw:delete" width="18" height="18"
                v-if="getSelectedMailsIds().length > 0"
                @click="handleDelete"/>
        </el-tooltip>
        <el-tooltip effect="dark" :content="$t('exportSelected')">
          <Icon class="icon" icon="system-uicons:push-down" width="22" height="22"
                v-if="getSelectedMailsIds().length > 0 && props.type !== 'draft'"
                @click="handleExport"/>
        </el-tooltip>
        <el-tooltip effect="dark" :content="$t('markAsRead')">
          <Icon v-perm="'email:delete'" class="icon delete" icon="fluent:mail-read-20-regular" width="20" height="20"
                v-if="getSelectedMailsIds().length > 0 && showUnread && props.emailRead"
                @click="handleRead"/>
        </el-tooltip>
        <el-tooltip effect="dark" :content="$t('markAsUnread')">
          <Icon v-perm="'email:delete'" class="icon delete" icon="fluent:mail-unread-20-regular" width="20" height="20"
                v-if="getSelectedMailsIds().length > 0 && showUnread && props.emailUnread"
                @click="handleUnread"/>
        </el-tooltip>
      </div>

      <div class="header-right">
        <span class="email-count" v-if="total">{{ $t('emailCount', {total: total}) }}</span>
        <el-tooltip effect="dark" :content="$t('toggleAccountPanel')">
          <Icon v-if="showAccountIcon" class="more-icon icon" width="16" height="16" icon="akar-icons:dot-grid-fill"
                @click="changeAccountShow"/>
        </el-tooltip>
      </div>
    </div>

    <div ref="scroll" class="scroll">
      <UseVirtualList ref="scrollbarRef"
                        @scroll="onScroll"
                        :list="list"
                        :options="{ itemHeight: itemHeight, overscan: 15 }"
                        class="virtual"
                        style="height: 100%"
                        v-if="!loading && emailList.length > 0"
                        :key="keyCount"
        >
          <template #default="{ data: item, index }" >
            <div :class="['email-row', props.type, { 'right-checked': item.rightChecked, 'pressing': item.pressing }]"
                 :data-checked="item.checked"
                 @click="jumpDetails(item)"
                 v-if="!item.expand"
                 :key="item.emailId"
                 @contextmenu="handleContextmenu($event, item)"
                 @touchstart="onRowTouchStart($event, item)"
                 @touchmove="onRowTouchMove"
                 @touchend="onRowTouchEnd"
                 @touchcancel="onRowTouchEnd"
            >
              <!-- 移动端：头像与复选框共用一个位置，默认显示头像，长按进入选择模式后显示复选框 -->
              <div v-if="isMobile" class="avatar-slot">
                <!-- 选择模式下已勾选的行：头像位置显示浅蓝底圆圈 + 蓝色对勾；未勾选的行仍显示头像 -->
                <div v-if="selectMode && item.checked" class="sender-avatar avatar-checked">
                  <Icon icon="mdi:check" width="22" height="22" />
                </div>
                <div v-else class="sender-avatar" :class="{ 'brand-avatar': showBrandImg(item) }" :style="showBrandImg(item) ? {} : { background: item.avatarColor }">
                  <img v-if="item.avatarBrand && !item.brandFailed" :src="'/brand/' + item.avatarBrand + '.svg'" @error="item.brandFailed = true" :alt="item.avatarLetter">
                  <img v-else-if="item.avatarBrandDomain && !item.brandFailed" :src="'/api/brand-icon?domain=' + item.avatarBrandDomain" @error="item.brandFailed = true" :alt="item.avatarLetter">
                  <template v-else>{{ item.avatarLetter }}</template>
                </div>
              </div>
              <el-checkbox v-if="!isMobile" :class=" props.type === 'all-email' ? 'all-email-checkbox' : 'checkbox'"
                           v-model="item.checked"
                           :disabled="!item.checked && isSelectMax"
                           @click.stop></el-checkbox>
              <el-tooltip effect="dark" :content="item.isStar ? $t('unstar') : $t('starIt')">
                <div @click.stop="starChange(item)" class="pc-star" v-if="showStar">
                  <Icon v-if="item.isStar" icon="fluent-color:star-16" width="20" height="20"/>
                  <Icon v-else icon="solar:star-line-duotone" width="18" height="18"/>
                </div>
              </el-tooltip>
              <div v-if="!showStar"></div>
              <!-- 桌面端发件人头像 -->
              <div v-if="!isMobile" class="sender-avatar sender-avatar-pc" :class="{ 'brand-avatar': showBrandImg(item) }" :style="showBrandImg(item) ? {} : { background: item.avatarColor }">
                <img v-if="item.avatarBrand && !item.brandFailed" :src="'/brand/' + item.avatarBrand + '.svg'" @error="item.brandFailed = true" :alt="item.avatarLetter">
                <img v-else-if="item.avatarBrandDomain && !item.brandFailed" :src="'/api/brand-icon?domain=' + item.avatarBrandDomain" @error="item.brandFailed = true" :alt="item.avatarLetter">
                <template v-else>{{ item.avatarLetter }}</template>
              </div>
              <div class="title" :class="accountShow ? 'title-column' : 'title-column'">

                <div class="email-sender" :style=" (showStatus ? 'gap: 10px;' : '') + (isUnreadRow(item) ? 'font-weight: bold' : '')">
                  <div class="email-status" v-if="showStatus">
                    <el-tooltip v-if="item.statusIcon" effect="dark" :content="item.statusIcon.content">
                      <Icon :icon="item.statusIcon.icon" :style="`color: ${item.statusIcon.color}`" width="20" height="20"/>
                    </el-tooltip>
                    <div class="del-status" v-if="item.isDel && item.status !== 6">
                      <el-tooltip effect="dark" :content="item.isDelContent">
                        <Icon class="icon" icon="mdi:email-remove" width="20" height="20"/>
                      </el-tooltip>
                    </div>
                  </div>
                  <div v-else></div>
                  <span class="name">
                    <span>
                      <div class="unread" v-if="isMobile && isUnreadRow(item)"/>
                      <slot name="name" :email="item"><span v-html="item.nameHtml"></span></slot>
                    </span>
                    <span>
                      <Icon v-if="item.isStar" icon="fluent-color:star-16" width="18" height="18"/>
                    </span>
                  </span>
                  <span class="phone-time">{{ item.formatCreateTime }}</span>
                </div>
                <div>
                  <div class="email-text">
                    <span class="email-subject" :style="isUnreadRow(item) ? 'font-weight: bold' : ''">
                      <div class="unread" v-if="!isMobile && isUnreadRow(item)"/>
                      <span v-if="item.code" class="code-tag" @click.stop="copyCode(item.code)">[{{ t('codeLabel') }}{{ item.code }}]</span>
                      <span class="subject-text">
                        <slot name="subject" :email="item" >
                          <span v-html="item.subjectHtml"></span>
                        </slot>
                      </span>
                      <el-tooltip effect="dark" :content="$t('hasAttachmentTip')">
                        <Icon v-if="item.hasAttachment" icon="iconamoon:attachment-fill" width="16" height="16" class="attachment-icon"/>
                      </el-tooltip>
                      <el-tooltip effect="dark" :content="$t('hasImageTip')">
                        <Icon v-if="item.hasInlineImage" icon="mdi:image" width="16" height="16" class="attachment-icon"/>
                      </el-tooltip>
                      <el-tooltip effect="dark" :content="$t('pairCountTip', {count: item.pairCount})">
                        <Icon v-if="item.pairCount > 1" icon="fluent:mail-copy-20-regular" width="16" height="16" class="attachment-icon"/>
                      </el-tooltip>
                    </span>
                    <span class="email-content" v-html="item.listHtml"></span>
                  </div>
                  <div class="user-info" v-if="showUserInfo">
                    <div class="user">
                      <span>
                        <el-tooltip effect="dark" :content="$t('sender')">
                          <Icon icon="mynaui:user" width="20" height="20"/>
                        </el-tooltip>
                      </span>
                      <span v-html="item.senderEmailHtml"></span>
                    </div>
                    <div class="account">
                      <span>
                        <el-tooltip effect="dark" :content="$t('recipient')">
                          <Icon icon="mdi-light:email" width="20" height="20"/>
                        </el-tooltip>
                      </span>
                      <span v-html="item.recipientEmailHtml"></span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="email-right" :style="showUserInfo ? 'align-self: start;':''">
                <span class="email-time" :style="isUnreadRow(item) ? 'font-weight: bold' : ''">{{ item.formatCreateTime }}</span>
              </div>
            </div>
            <skeletonBlock v-else-if="item.expand === 'loading'"
                           :rows="1"
                           :is-mobile="isMobile"
                           :showStar="showStar"
                           :accountShow="accountShow"
                           :showStatus="showStatus"
                           :showUserInfo="showUserInfo"
                           :type="type"/>
            <div class="noLoading" v-else-if="item.expand === 'noMoreData'">
              <div>{{ $t('noMoreData') }}</div>
            </div>
          </template>
        </UseVirtualList>
      <skeletonBlock v-if="firstLoad && showFirstLoading"
                       :rows="20"
                       :is-mobile="isMobile"
                       :showStar="showStar"
                       :accountShow="accountShow"
                       :showStatus="showStatus"
                       :showUserInfo="showUserInfo"
                       :type="type"/>
      <skeletonBlock v-if="loading"
                       :rows="skeletonRows"
                       :is-mobile="isMobile"
                       :showStar="showStar"
                       :accountShow="accountShow"
                       :showStatus="showStatus"
                       :showUserInfo="showUserInfo"
                       :type="type"/>
      <div class="empty" v-if="noLoading && emailList.length === 0 && !loading">
        <el-empty :image-size="isMobile ? 120 : null" :description="$t('noMessagesFound')"/>
      </div>
    </div>
    <el-dropdown
        ref="dropdownRef"
        @visible-change="visibleChange"
        :virtual-ref="triggerRef"
        :show-arrow="false"
        :popper-options="{
      modifiers: [{ name: 'offset', options: { offset: [0, 0] } }],
    }"
        virtual-triggering
        trigger="contextmenu"
        placement="bottom-start"
    >
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item v-if="rightClickEmail.code" @click="copyCode(rightClickEmail.code)" >
            <template #default>
              <div class="right-dropdown-item">
                <Icon icon="fluent-color:clipboard-24" width="20" height="20" />
                <span>{{t('copyCode')}}</span>
              </div>
            </template>
          </el-dropdown-item>
          <el-dropdown-item v-if="['email'].includes(props.type)" @click="emailRead(rightClickEmail.emailId)" >
            <template #default>
              <div class="right-dropdown-item">
                <Icon icon="fluent:mail-read-20-regular" width="20" height="20" />
                <span>{{t('markAsRead')}}</span>
              </div>
            </template>
          </el-dropdown-item>
          <el-dropdown-item v-if="['email','star'].includes(props.type)" @click="openReply(rightClickEmail)">
            <template #default>
              <div class="right-dropdown-item">
                <Icon icon="fluent-mdl2:reply" width="19" height="19"  />
                <span>{{t('reply')}}</span>
              </div>
            </template>
          </el-dropdown-item>
          <el-dropdown-item v-if="['email','send', 'star'].includes(props.type)" @click="openForward(rightClickEmail)">
            <template #default>
              <div class="right-dropdown-item">
                <Icon icon="iconoir:arrow-up-right" width="19" height="19"  />
                <span>{{t('forward')}}</span>
              </div>
            </template>
          </el-dropdown-item>
          <el-dropdown-item v-if="['email','send', 'star'].includes(props.type)" @click="starChange(rightClickEmail)">
            <template #default>
              <div class="right-dropdown-item">
                <Icon icon="solar:star-line-duotone" width="19" height="19"/>
                <span>{{t('star')}}</span>
              </div>
            </template>
          </el-dropdown-item>
          <el-dropdown-item v-if="['email'].includes(props.type)" @click="rightSpam(rightClickEmail.emailId)">
            <template #default>
              <div class="right-dropdown-item">
                <Icon icon="hugeicons:mail-block-01" width="19" height="19" />
                <span>{{t('markSpam')}}</span>
              </div>
            </template>
          </el-dropdown-item>
          <el-dropdown-item v-if="props.type === 'all-email'" @click="handleSearch('user', rightClickEmail.userEmail)">
            <template #default>
              <div class="right-dropdown-item">
                <Icon icon="iconoir:search" width="20" height="20" />
                <span>{{t('searchUser')}}</span>
              </div>
            </template>
          </el-dropdown-item>
          <el-dropdown-item v-if="props.type === 'all-email' " @click="handleSearch('account', rightClickEmail.type === 0 ? rightClickEmail.toEmail : rightClickEmail.sendEmail)">
            <template #default>
              <div class="right-dropdown-item">
                <Icon icon="iconoir:search" width="20" height="20" />
                <span>{{t('searchEmail')}}</span>
              </div>
            </template>
          </el-dropdown-item>
          <el-dropdown-item v-if="props.type === 'all-email' " @click="handleSearch('name', rightClickEmail.name)">
            <template #default>
              <div class="right-dropdown-item">
                <Icon icon="iconoir:search" width="20" height="20" />
                <span>{{t('searchSender')}}</span>
              </div>
            </template>
          </el-dropdown-item>
          <el-dropdown-item v-if="props.type === 'trash'" @click="rightRestore(rightClickEmail.emailId)">
            <template #default>
              <div class="right-dropdown-item">
                <Icon icon="mdi:restore" width="19" height="19" />
                <span>{{t('restore')}}</span>
              </div>
            </template>
          </el-dropdown-item>
          <el-dropdown-item v-if="props.type === 'spam'" @click="rightRestore(rightClickEmail.emailId)">
            <template #default>
              <div class="right-dropdown-item">
                <Icon icon="mdi:restore" width="19" height="19" />
                <span>{{t('notSpam')}}</span>
              </div>
            </template>
          </el-dropdown-item>
          <el-dropdown-item v-if="props.type !== 'draft'" @click="rightExport(rightClickEmail.emailId)">
            <template #default>
              <div class="right-dropdown-item">
                <Icon icon="system-uicons:push-down" width="19" height="19" />
                <span>{{t('exportMail')}}</span>
              </div>
            </template>
          </el-dropdown-item>
          <el-dropdown-item @click="rightDelete(rightClickEmail.emailId)">
            <template #default>
              <div class="right-dropdown-item">
                <Icon icon="uiw:delete" width="16" height="20" style="margin-left: 1px;margin-right: 3px" />
                <span>{{props.type === 'trash' ? t('deleteForever') : t('delete')}}</span>
              </div>
            </template>
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
    <delete-notify-dialog v-model="notifyDialog.visible" :message="notifyDialog.message"
                          :show-notify="notifyDialog.showNotify" :has-pair="notifyDialog.hasPair"
                          @confirm="onNotifyDialogConfirm"/>
  </div>
</template>

<script setup>
import {Icon} from "@iconify/vue";
import skeletonBlock from "@/components/email-scroll/skeleton/index.vue"
import deleteNotifyDialog from "@/components/delete-notify-dialog/index.vue"
import {computed, onActivated, reactive, ref, watch, nextTick, onMounted, onUnmounted } from "vue";
import {useEmailStore} from "@/store/email.js";
import {emailExport, downloadExport} from "@/request/email.js";
import {useUserStore} from "@/store/user.js";
import {useUiStore} from "@/store/ui.js";
import {useSettingStore} from "@/store/setting.js";
import {useSidebarStore} from "@/store/sidebar.js";
import {sleep} from "@/utils/time-utils.js"
import {fromNow} from "@/utils/day.js";
import {useI18n} from "vue-i18n";
import {EmailUnreadEnum} from "@/enums/email-enum.js";
import { UseVirtualList } from '@vueuse/components'
import { useScroll } from '@vueuse/core'

const props = defineProps({
  getEmailList: Function,
  emailDelete: Function,
  emailRestore: Function,
  emailSpam: Function,
  emailRead: Function,
  emailUnread: Function,
  starAdd: Function,
  starCancel: Function,
  cancelSuccess: Function,
  starSuccess: Function,
  actionLeft: {
    type: String,
    default: '0'
  },
  timeSort: {
    type: Number,
    default: 0,
  },
  showStatus: {
    type: Boolean,
    default: false
  },
  showAccountIcon: {
    type: Boolean,
    default: true,
  },
  showUserInfo: {
    type: Boolean,
    default: false
  },
  showStar: {
    type: Boolean,
    default: true
  },
  allowStar: {
    type: Boolean,
    default: true
  },
  type: {
    type: String,
    default: 'email'
  },
  showFirstLoading: {
    type: Boolean,
    default: true
  },
  showUnread: {
    type: Boolean,
    default: false
  },
  highlightText: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['jump', 'refresh-before', 'refresh-success', 'delete-draft', 'right-search'])

const {t} = useI18n()
const settingStore = useSettingStore()
const uiStore = useUiStore();
const emailStore = useEmailStore();
const userStore = useUserStore();
const sidebarStore = useSidebarStore();

// 管理员删除通知弹窗：仅全部邮件视图、开关开启、且删到别人的邮件时出现
const notifyDialog = reactive({
  visible: false,
  message: '',
  emailIds: [],
  showNotify: true,
  hasPair: false,
})

function notifyEnabled() {
  const v = settingStore.settings.adminDelNotify
  return v === undefined || v === null || v !== 0
}

function involvesOtherUser(emailIds) {
  const myEmail = (userStore.user.email || '').toLowerCase()
  return emailIds.some(id => {
    const item = emailList.find(e => e.emailId === id)
    return item && item.userEmail && item.userEmail.toLowerCase() !== myEmail
  })
}

// 选中的邮件里是否有带副本的（全部邮件列表才有 pairCount）
function hasPairIds(emailIds) {
  return emailIds.some(id => {
    const item = emailList.find(e => e.emailId === id)
    return item && item.pairCount > 1
  })
}

function openNotifyDialog(emailIds, message, opts = {}) {
  notifyDialog.emailIds = emailIds
  notifyDialog.message = message
  notifyDialog.showNotify = opts.showNotify !== false
  notifyDialog.hasPair = opts.hasPair === true
  notifyDialog.visible = true
}

function onNotifyDialogConfirm(opts) {
  const emailIds = notifyDialog.emailIds
  props.emailDelete(emailIds, opts).then((deletedIds) => {
    ElMessage({
      message: t('delSuccessMsg'),
      type: 'success',
      plain: true
    })
    // 成对删除时后端返回实际删掉的全部 id（含副本），列表按它移除
    emailStore.deleteIds = Array.isArray(deletedIds) && deletedIds.length ? deletedIds : emailIds;
    // 删掉未读邮件会改变侧边栏未读数，立即刷新，不用等切页面
    sidebarStore.refreshUnread()
  })
}
const loading = ref(false);
const followLoading = ref(false);
const noLoading = ref(false);
const emailList = reactive([])
const expandList = reactive([])
const total = ref(0);
const checkAll = ref(false);
const isIndeterminate = ref(false);
const scroll = ref(null)
const firstLoad = ref(true)
let scrollTop = 0
const latestEmail = ref(null)
const scrollbarRef = ref(null)
// iPad can report a Mac platform when requesting desktop websites.
const isMacOS = /Mac/.test(navigator.platform) && navigator.maxTouchPoints <= 1
let reqLock = false
let isMobile = ref(innerWidth < 1367)
let skeletonRows = 0
const timePaddingRight = ref('');
const keyCount = ref(0);
const dropdownRef = ref(null);
const dropdownCloseLock = ref(false);
const dropdownShow = ref(false);
const rightClickEmail = ref({});
const MAX_SELECT_COUNT = 95;
const checkedEmailCount = ref(0);
const isSelectMax = computed(() => checkedEmailCount.value >= MAX_SELECT_COUNT);
// 选择模式：有任意邮件被勾选时进入（移动端长按勾选第一封即进入；全部取消勾选即退出）
const selectMode = computed(() => checkedEmailCount.value > 0);
let timer = null
const position = ref(
    DOMRect.fromRect({
      x: 0,
      y: 0,
    })
)

const triggerRef = ref({
  getBoundingClientRect() {
    return position.value;
  }
})

const queryParam = reactive({
  size: 50
});

defineExpose({
  refreshList,
  deleteEmail,
  addItem,
  handleList,
  emailList,
  firstLoad,
  latestEmail,
  noLoading,
  total
})

onActivated(() => {
  requestAnimationFrame(() => {
    const index = scrollTop / itemHeight.value
    scrollbarRef.value?.scrollTo(index);
  })
})

onMounted(() => {
  timer = setInterval(() => {
    emailList.forEach(email => {
      email.formatCreateTime = fromNow(email.createTime);
    })
  }, 1000 * 60);
})

onUnmounted(() => {
  clearInterval(timer)
})

getEmailList()

window.onresize = () => {
  isMobile.value = innerWidth < 1367
}

function onScroll(e) {
  scrollTop = e.target.scrollTop;
}

const { arrivedState } = useScroll(scrollbarRef, {
  offset: { bottom: isMobile.value ? 2200 : 1500 }
})


const list = computed(() => {
  return [...emailList, ...expandList]
})

const itemHeight = computed(() => {
    if (props.type === 'all-email') {
      return isMobile.value ? 132 : 65;
    } else  {
      return isMobile.value ? 83 : 48;
    }
})

watch(emailList, () => {
  updateHasScrollbar();
})

watch(scrollbarRef, () => {
  updateHasScrollbar();
})

// 强制刷新 (itemHeight 更改后虚拟滚动列表不会自己更新)
watch(itemHeight, () => {
  keyCount.value ++
})

watch(followLoading, (isFollowLoading) => {
  if (isFollowLoading) {
    expandList.push({
      emailId: 0,
      expand: 'loading'
    })
  } else {
    const index = expandList.findIndex(item => item.expand === 'loading')
    expandList.splice(index, 1);
  }
});

watch(noLoading, (isNoLoading) => {
  if (isNoLoading) {
    expandList.push({
      emailId: 0,
      expand: 'noMoreData'
    })
  } else {
    const index = expandList.findIndex(item => item.expand === 'noMoreData')
    expandList.splice(index, 1);
  }
})


// 监听是否到达底部
watch(() => arrivedState.bottom, (isBottom) => {
  if (isBottom && !loading.value) {
    loadData();
  }
});

watch(
    () => emailList.map(item => item.checked),
    () => {
      // 直接调 updateCheckStatus：它对空列表也算得对（计数 0、全选关），
      // 原先先把计数写成 emailList.length 再纠正是多余的错值
      updateCheckStatus();
    },
    {deep: true}
);


watch(() => emailStore.deleteIds, () => {
  if (emailStore.deleteIds) {
    deleteEmail(emailStore.deleteIds)
  }
})

watch(() => emailStore.cancelStarEmailId, () => {
  emailList.forEach(email => {
    if (email.emailId === emailStore.cancelStarEmailId) {
      email.isStar = 0
    }
  })
})

watch(() => emailStore.addStarEmailId, () => {
  emailList.forEach(email => {
    if (email.emailId === emailStore.addStarEmailId) {
      email.isStar = 1
    }
  })
})

window.addEventListener('wheel', (event) => {
  if (dropdownShow.value) {
    dropdownRef.value.handleClose();
  }
})

function openReply(email) {
  const fullEmail = emailStore.detailMap[email.emailId]
  if (!fullEmail) return
  uiStore.writerRef.openReply(fullEmail)
}

function openForward(email) {
  const fullEmail = emailStore.detailMap[email.emailId]
  if (!fullEmail) return
  uiStore.writerRef.openForward(fullEmail)
}

function visibleChange(e) {
  dropdownShow.value = e;
  dropdownCloseLock.value = true;
  setTimeout(() => {
    dropdownCloseLock.value = false;
  },1500)

  if (!e && rightClickEmail.value.rightChecked) {
    rightClickEmail.value.rightChecked = false
  }
}

const handleContextmenu = (event, email) => {

  // 触屏长按是用来进入选择模式的，不弹右键菜单；仍要 preventDefault 拦掉系统长按菜单
  if (touchActive) {
    event.preventDefault();
    return;
  }

  if (props.type === 'draft') {
    return
  }

  if (rightClickEmail.value.rightChecked) {
    rightClickEmail.value.rightChecked = false
  }

  const { clientX, clientY } = event
  position.value = DOMRect.fromRect({
    x: clientX,
    y: clientY,
  })
  event.preventDefault();
  dropdownRef.value?.handleOpen();

  rightClickEmail.value = email;
  rightClickEmail.value.rightChecked = true
}

function updateHasScrollbar() {
  nextTick(() => {

    if (isMacOS) {
      timePaddingRight.value = '15px'
      return
    }

    const doc = document.querySelector('.virtual');
    if (doc) {
      if (doc.scrollHeight > doc.clientHeight) {
        timePaddingRight.value = '6px';
      } else {
        timePaddingRight.value = '15px'
      }
    }
  })
}

function getSkeletonRows() {
  if (emailList.length > 20) return skeletonRows = 20
  if (emailList.length === 0) return skeletonRows = 1
  skeletonRows = emailList.length
}

const accountShow = computed(() => {
  return uiStore.accountShow && settingStore.settings.manyEmail === 0
})

function starChange(email) {

  if (!email.isStar) {

    if (!props.allowStar) return;

    email.isStar = 1;
    props.starAdd(email.emailId).then(() => {
      email.isStar = 1;
      props.starSuccess(email)
    }).catch(e => {
      console.error(e)
      email.isStar = 0
    })
  } else {

    email.isStar = 0;
    props.starCancel(email.emailId).then(() => {
      email.isStar = 0;
      props.cancelSuccess?.(email)
    }).catch(e => {
      console.error(e)
      email.isStar = 1;
    })
  }
}

function changeAccountShow() {
  uiStore.accountShow = !uiStore.accountShow;
}

const handleRead = () => {
  const emailIds = getSelectedMailsIds();
  props.emailRead(emailIds);
  localRead(emailIds);
}

const handleUnread = () => {
  const emailIds = getSelectedMailsIds();
  props.emailUnread(emailIds);
  localUnread(emailIds);
}

function emailRead(emailId) {
  props.emailRead([emailId])
  localRead([emailId]);
}

function localRead(emailIds) {
  emailIds.forEach(emailId => {
    const index = emailList.findIndex(email => email.emailId === emailId);
    if (index > -1) {
      emailList[index].unread = EmailUnreadEnum.READ;
      emailList[index].checked = false;
    }
  })
}

// 标为未读的本地状态：localRead 的镜像，行变回加粗 + 蓝点，勾选清除
function localUnread(emailIds) {
  emailIds.forEach(emailId => {
    const index = emailList.findIndex(email => email.emailId === emailId);
    if (index > -1) {
      emailList[index].unread = EmailUnreadEnum.UNREAD;
      emailList[index].checked = false;
    }
  })
}

// 未读样式（加粗 + 蓝点）只给收到的邮件：发件份在库里 unread 也是 0（保存时没置已读），
// 只看 unread 会把已发邮件错标成未读——全部邮件视图同时有收发两份时尤其明显
function isUnreadRow(item) {
  return props.showUnread && item.unread === EmailUnreadEnum.UNREAD && item.type === 0
}

function rightRestore(emailId) {
  if (!props.emailRestore) {
    return;
  }
  props.emailRestore([emailId])
}

function rightSpam(emailId) {
  if (!props.emailSpam) {
    return;
  }
  props.emailSpam([emailId])
}

function doExport(emailIds) {
  emailExport(emailIds).then(res => {
    downloadExport(res);
  }).catch(e => {
    console.error(e);
    ElMessage({message: t('exportFailed'), type: 'error', plain: true});
  });
}

function handleExport() {
  const emailIds = getSelectedMailsIds();
  if (emailIds.length === 0) return;
  doExport(emailIds);
}

function rightExport(emailId) {
  doExport([emailId]);
}

function rightDelete(emailId) {

  if (props.type === 'all-email' || props.type === 'trash') {
    if (props.type === 'all-email') {
      const showNotify = notifyEnabled() && involvesOtherUser([emailId])
      const hasPair = hasPairIds([emailId])
      if (showNotify || hasPair) {
        openNotifyDialog([emailId], t('delOneEmailConfirm'), {showNotify, hasPair})
        return
      }
    }
    ElMessageBox.confirm(props.type === 'trash' ? t('delForeverOneConfirm') : t('delOneEmailConfirm'), {
      confirmButtonText: t('confirm'),
      cancelButtonText: t('cancel'),
      type: 'warning'
    }).then(() => {
      props.emailDelete([emailId]).then(() => {
        ElMessage({
          message: t('delSuccessMsg'),
          type: 'success',
          plain: true
        })
        emailStore.deleteIds = [emailId];
      })
    })
    return;
  }
  props.emailDelete([emailId]).then(() => {
    ElMessage({
      message: t('delSuccessMsg'),
      type: 'success',
      plain: true
    })
    emailStore.deleteIds = [emailId];
  })
}

function handleSearch(type, value) {
  emit('right-search', type, value);
}

async function copyCode(code) {
  try {
    await navigator.clipboard.writeText(code);
    ElMessage({
      message: t('copySuccessMsg'),
      type: 'success',
      plain: true
    })
  } catch (err) {
    console.error(`${t('copyFailMsg')}:`, err);
    ElMessage({
      message: t('copyFailMsg'),
      type: 'error',
      plain: true
    })
  }
}

function handleDelete() {
  if (props.type === 'all-email') {
    const emailIds = getSelectedMailsIds();
    const showNotify = notifyEnabled() && involvesOtherUser(emailIds)
    const hasPair = hasPairIds(emailIds)
    if (showNotify || hasPair) {
      openNotifyDialog(emailIds, t('delEmailsConfirm'), {showNotify, hasPair})
      return
    }
  }
  ElMessageBox.confirm(props.type === 'trash' ? t('delForeverConfirm') : t('delEmailsConfirm'), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {

    if (props.type === 'draft') {
      const draftIds = getSelectedDraftsIds();
      emit('delete-draft', draftIds);
      return;
    }

    const emailIds = getSelectedMailsIds();
    props.emailDelete(emailIds).then(() => {
      ElMessage({
        message: t('delSuccessMsg'),
        type: 'success',
        plain: true
      })
      emailStore.deleteIds = emailIds;
      // 删掉未读邮件会改变侧边栏未读数，立即刷新，不用等切页面
      sidebarStore.refreshUnread()
    })
  })
}

function deleteEmail(emailIds) {
  let removed = 0
  emailIds.forEach(emailId => {
    emailList.forEach((item, index) => {
      if (emailId === item.emailId) {
        emailList.splice(index, 1);
        removed++
      }
    })
  })
  // 删完总数马上跟着变（只按实际从列表里移除的行数减）
  if (removed > 0) {
    total.value = Math.max(0, total.value - removed)
  }
  if (emailList.length < queryParam.size && !noLoading.value) {
    getEmailList()
  }
}

function addItem(email) {

  const existIndex = emailList.findIndex(item => item.emailId === email.emailId)

  if (existIndex > -1) {
    return false;
  }

  email.formatCreateTime = fromNow(email.formatCreateTime);

  if (props.timeSort) {
    if (noLoading.value) {
      handleList([email]);
      emailList.push(email);
    }

    if (email.emailId > latestEmail.value?.emailId) {
      latestEmail.value = email
    }

    total.value++
    return true;
  }


  const index = emailList.findIndex(item => item.emailId < email.emailId)

  if (index !== -1) {
    handleList([email]);
    emailList.splice(index, 0, email);
  } else {
    if (noLoading.value) {
      handleList([email]);
      emailList.push(email);
    }
  }

  if (email.emailId > latestEmail.value?.emailId) {
    latestEmail.value = email
  }

  total.value++
  return true;
}

function handleCheckAllChange(val) {
  if (val) {
    let count = 0;
    emailList.forEach(item => {
      if (count < MAX_SELECT_COUNT) {
        item.checked = true;
        count++;
      } else {
        item.checked = false;
      }
    });
  } else {
    emailList.forEach(item => item.checked = false);
  }
  isIndeterminate.value = false;
}

// 获取选中的邮件列表id
function getSelectedMailsIds() {
  return emailList.filter(item => item.checked).map(item => item.emailId);
}

function getSelectedDraftsIds() {
  return emailList.filter(item => item.checked).map(item => item.draftId);
}

function updateCheckStatus() {
  const checkedCount = emailList.filter(item => item.checked).length;
  checkedEmailCount.value = checkedCount;
  const atMax = checkedCount >= MAX_SELECT_COUNT;
  checkAll.value = emailList.length > 0 && (checkedCount === emailList.length || atMax);
  isIndeterminate.value = checkedCount > 0 && !checkAll.value;
}

function toggleRowChecked(email) {
  if (!email.checked && isSelectMax.value) {
    return
  }
  email.checked = !email.checked
}

function jumpDetails(email) {

  // 长按勾选后手指抬起会合成一次 click，直接放行会把刚勾上的又取消掉
  if (Date.now() < suppressClickUntil) return;

  if (dropdownShow.value) {
    dropdownRef.value.handleClose();
    return;
  }

  if (!dropdownCloseLock.value) {
    const sel = window.getSelection();
    if (sel.toString().trim()) {
      return
    }
  }

  if (checkedEmailCount.value > 0) {
    toggleRowChecked(email)
    return
  }

  emit('jump', email)
}


function getEmailList(refresh = false) {

  if (reqLock) return Promise.resolve(false);

  let emailId = emailList.length > 0 ? emailList.at(-1).emailId : 0;

  reqLock = true

  if (!refresh) {

    if (loading.value || noLoading.value) {
      reqLock = false
      return Promise.resolve(false)
    }

  } else {
    getSkeletonRows()
    emailId = 0
    loading.value = true
    scrollTop = 0
  }

  if (emailList.length === 0) {
    loading.value = true
  } else {
    followLoading.value = !refresh;
  }
  let start = Date.now();

  return props.getEmailList(emailId, queryParam.size).then(async data => {
    let end = Date.now();
    let duration = end - start;
    if (duration < 300 && !emailId) {
        await sleep(300 - duration)
    }
    firstLoad.value = false

    let list = data.list.map(item => ({
      ...item,
      checked: false
    }));


    if (refresh) {
      emailList.length = 0
    }

    latestEmail.value = data.latestEmail

    handleList(list);
    emailList.push(...list);
    if (refresh) scrollbarRef.value?.setScrollTop(0);

    noLoading.value = data.list.length < queryParam.size;
    followLoading.value = data.list.length >= queryParam.size;

    total.value = data.total;
    return true;
  }).finally(() => {
    loading.value = false
    reqLock = false
  })
}

// 发件人头像：品牌 logo（白底圆圈）或首字母 + 哈希取色的圆底。
// 品牌 logo 不用手维护名单：谷歌/微软用内置多彩版（图标库里是单色的不好看），
// 其余一律走 /api/brand-icon，由 Worker 按发件域名去 Simple Icons（约 3000 个品牌）取，
// 未收录的 404，前端回落首字母头像。
const AVATAR_COLORS = ['#7C4DFF', '#009688', '#FF7043', '#5C6BC0', '#26A69A', '#EC407A', '#AB47BC', '#42A5F5', '#66BB6A', '#FFA726', '#8D6E63', '#78909C'];
const BUNDLED_BRANDS = {
  'google.com': 'google',
  'microsoft.com': 'microsoft',
};
// 免费邮箱域名：发件人用的服务商、不是发件方本身，不出品牌 logo
//（后端 brand-icon-service 里有一份同样的表，两边改要同步）
const FREEMAIL_DOMAINS = [
  'gmail.com', 'googlemail.com',
  'outlook.com', 'hotmail.com', 'live.com', 'live.cn', 'msn.com',
  'icloud.com', 'me.com', 'mac.com',
  'yahoo.com', 'yahoo.cn', 'ymail.com',
  'qq.com', 'foxmail.com',
  '163.com', '126.com', 'yeah.net',
  'sina.com', 'sina.cn', 'sohu.com', 'tom.com',
  '139.com', '189.cn', 'aliyun.com',
  'protonmail.com', 'proton.me', 'pm.me',
  'tutanota.com', 'tuta.io',
  'zoho.com', 'yandex.com', 'yandex.ru',
  'mail.com', 'gmx.com', 'gmx.net', 'aol.com',
];
function domainMatches(domain, base) {
  return domain === base || domain.endsWith('.' + base);
}
function avatarFor(email) {
  const name = (email.name || '').trim();
  const addr = (email.sendEmail || email.toEmail || '').trim();
  const domain = (addr.split('@')[1] || '').toLowerCase();
  let brand = null;
  let brandDomain = null;
  if (domain && !FREEMAIL_DOMAINS.some(base => domainMatches(domain, base))) {
    for (const base in BUNDLED_BRANDS) {
      if (domainMatches(domain, base)) {
        brand = BUNDLED_BRANDS[base];
        break;
      }
    }
    if (!brand) brandDomain = domain;
  }
  const first = name ? Array.from(name)[0] : (addr ? addr[0] : '?');
  const key = (name + '|' + addr).toLowerCase();
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return { letter: first.toUpperCase(), color: AVATAR_COLORS[hash % AVATAR_COLORS.length], brand, brandDomain };
}
// 是否显示品牌图（内置或接口取到的；加载失败后回落首字母）
function showBrandImg(item) {
  return (item.avatarBrand || item.avatarBrandDomain) && !item.brandFailed;
}

// 移动端长按进入选择模式（Gmail 做法：默认无复选框，长按勾选）
let longPressTimer = null;
let touchStartX = 0, touchStartY = 0;
let touchActive = false;
let suppressClickUntil = 0;
let pressingEmail = null;
function onRowTouchStart(e, email) {
  if (!isMobile.value) return;
  touchActive = true;
  const t = e.touches[0];
  touchStartX = t.clientX;
  touchStartY = t.clientY;
  pressingEmail = email;
  email.pressing = true;
  clearTimeout(longPressTimer);
  longPressTimer = setTimeout(() => {
    longPressTimer = null;
    if (!email.checked && isSelectMax.value) return;
    email.checked = true;
    suppressClickUntil = Date.now() + 600;
    if (navigator.vibrate) navigator.vibrate(10);
  }, 350);
}
function onRowTouchMove(e) {
  if (!longPressTimer) return;
  const t = e.touches[0];
  if (Math.abs(t.clientX - touchStartX) > 20 || Math.abs(t.clientY - touchStartY) > 20) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
    if (pressingEmail) {
      pressingEmail.pressing = false;
      pressingEmail = null;
    }
  }
}
function onRowTouchEnd() {
  clearTimeout(longPressTimer);
  longPressTimer = null;
  if (pressingEmail) {
    pressingEmail.pressing = false;
    pressingEmail = null;
  }
  setTimeout(() => { touchActive = false; }, 500);
}

function handleList(list) {
  list.forEach(email => {
    email.formatCreateTime = fromNow(email.createTime);
    email.test = t('received')
    const av = avatarFor(email);
    email.avatarLetter = av.letter;
    email.avatarColor = av.color;
    email.avatarBrand = av.brand;
    email.avatarBrandDomain = av.brandDomain;
    const statusIconMap = {
      0: { icon: 'ic:round-mark-email-read', color: '#51C76B', content: t('received') },
      1: { icon: 'bi:send-arrow-up-fill',  color: 'var(--el-color-primary)', content: t('sent') },
      2: { icon: 'bi:send-check-fill',     color: 'var(--el-color-primary)', content: t('delivered') },
      3: { icon: 'bi:send-x-fill',         color: '#F56C6C', content: t('bounced') },
      8: { icon: 'bi:send-x-fill',         color: '#F56C6C', content: t('bounced') },
      4: { icon: 'bi:send-exclamation-fill', color: '#FBBD08', content: t('complained') },
      5: { icon: 'bi:send-arrow-up-fill',  color: '#FBBD08', content: t('delayed') },
      6: { icon: 'mdi:email-lock', color: '#909399', content: t('saving') },
      7: { icon: 'ic:round-mark-email-read', color: '#FBBD08', content: t('noRecipient') },
    };

    if (email.isDel) {
      email.isDelContent = t('movedToTrash');
    }
    email.statusIcon = statusIconMap[email.status];
    applyHighlight(email);
  })
}

function applyHighlight(email) {
  email.nameHtml = renderHighlight(email.name);
  email.subjectHtml = renderHighlight(email.subject);
  email.listHtml = renderHighlight(email.listText || email.text);
  email.senderEmailHtml = renderHighlight(email.sendEmail);
  email.recipientEmailHtml = renderHighlight(firstRecipient(email));
}

// 收件地址：收件人存在 recipient JSON 里（已发邮件的 to_email 为空），取第一个收件地址
function firstRecipient(email) {
  try {
    const list = JSON.parse(email.recipient || '[]')
    if (Array.isArray(list) && list.length > 0) return list[0].address || ''
  } catch (e) {}
  return email.toEmail || ''
}

watch(() => props.highlightText, () => {
  emailList.forEach(applyHighlight);
})

function refresh() {
  emit('refresh-before')
  if (props.skeleton) {
    scrollbarRef.value.setScrollTop(0)
  }
  checkAll.value = false;
  isIndeterminate.value = false;
  getEmailList(true).then(ok => {
    if (ok) emit('refresh-success')
  }).catch(() => {})
}

function refreshList() {
  checkAll.value = false;
  isIndeterminate.value = false;
  getEmailList(true);
}

function loadData() {
  getEmailList()
}


function escapeHtml(value) {
  return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
}

function renderHighlight(value) {
  const text = value == null ? '' : String(value)
  if (!text) return '\u200B'
  const keyword = props.highlightText?.trim()
  if (!keyword) return escapeHtml(text)
  const pattern = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
  let html = ''
  let lastIndex = 0
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0
    html += escapeHtml(text.slice(lastIndex, index))
    html += `<mark class="search-hit">${escapeHtml(match[0])}</mark>`
    lastIndex = index + match[0].length
  }
  html += escapeHtml(text.slice(lastIndex))
  return html
}

</script>
<style lang="scss" scoped>
:deep(.search-hit) {
  background-color: var(--search-hit-background);
  color: inherit;
  padding: 0;
  border-radius: 2px;
}


.email-container {
  display: grid;
  grid-template-rows: auto 1fr;
  padding: 0;
  font-size: 14px;
  color: var(--el-text-color-primary);
  overflow: hidden;
  height: 100%;
}

.scroll {
  margin: 0;
  height: 100%;
  overflow: hidden;

  .virtual {
    will-change: scroll-position;
  }

  .empty {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    width: 100%;
  }

  .noLoading {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 15px 0 0 0;
    color: var(--secondary-text-color);
  }

  .follow-loading {
    height: 60px;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .loading {
    display: flex;
    justify-content: center;
    align-items: center;
    background: var(--loadding-background);
    height: 100%;
    width: 100%;
    position: absolute;
    z-index: 1;
    top: 0;
    left: 0;
  }

  .loading-show {
    transition: all 200ms ease 200ms;
    opacity: 1;
  }

  .loading-hide {
    pointer-events: none;
    transition: var(--loading-hide-transition);
    opacity: 0;
  }
}

:deep(.email-row) {
  display: flex;
  padding: 8px 0;
  justify-content: space-between;
  box-shadow: var(--header-actions-border);
  cursor: pointer;
  align-items: center;
  position: relative;
  transition: background 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
  height: 48px;
  @media (max-width: 1366px) {
    height: 83px;
  }

  @media (pointer: coarse) {
    /* 触屏 */
    user-select: none;
    -webkit-touch-callout: none;
  }

  /* 按下反馈：手指一碰上行就高亮 + 头像微缩，长按等待时手感跟手 */
  &.pressing {
    background: var(--el-fill-color-light);
    .sender-avatar {
      transform: scale(0.92);
    }
  }
  &.all-email {
    height: 65px;
    @media (max-width: 1366px) {
      height: 132px;
    }
  }
  .user-info {
    display: flex;
    flex-wrap: wrap;
    column-gap: 10px;
    margin-top: 5px;
    margin-bottom: 2px;
    color: var(--email-scroll-content-color);
    @media (max-width: 1366px) {
      flex-direction: column;
    }

    .user, .account {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      transition: all 300ms;
      line-height: 12px;
      max-width: 300px;
      min-width: 0;

      @media (max-width: 1223px) {
        max-width: 280px;
      }

      span:first-child {
        position: relative;
      }

      span:last-child {
        margin-left: 5px;
        position: relative;
        bottom: 5px;
      }
    }
  }

  .checkbox {
    display: flex;
    padding-left: 15px;
    padding-right: 20px;
    justify-content: center;
  }

  .all-email-checkbox {
    display: flex;
    padding-left: 15px;
    padding-right: 20px;
    justify-content: center;
    @media (min-width: 1367px) {
      justify-content: start;
      height: 100%;
      align-self: start;
      padding-bottom: 30px;
    }
  }

  /* 发件人头像：移动端 40px，与复选框共用一个位置（长按进入选择模式时互换，不移位） */
  .avatar-slot {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    align-self: flex-start;
    margin: 0 12px 0 15px;
  }

  /* 选择模式下已勾选的行：浅色圆底 + 品牌色对勾（跟随当前主题主色） */
  .avatar-checked {
    background: var(--el-color-primary-light-7);
    color: var(--el-color-primary);
  }

  .sender-avatar {
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
    -webkit-user-select: none;
    transition: transform 0.15s ease;
  }

  /* 桌面端头像 32px，跟在星标后面、名字前面 */
  .sender-avatar-pc {
    width: 32px;
    height: 32px;
    font-size: 14px;
    margin-right: 12px;
  }

  /* 品牌头像：白底圆圈 + 品牌 logo（细边框在白底列表上勾出圆圈轮廓） */
  .brand-avatar {
    background: #fff;
    border: 1px solid var(--el-border-color-lighter);
    img {
      width: 60%;
      height: 60%;
      object-fit: contain;
    }
  }

  .title-column {
    @media (max-width: 1366px) {
      grid-template-columns: 1fr !important;
      gap: 4px !important;
    }
  }

  .title {
    flex: 1;
    display: grid;
    grid-template-columns: 240px 1fr;
    @media (max-width: 1366px) {
      padding-right: 15px;
    }
    @media (max-width: 1366px) {
      grid-template-columns: 1fr;
      gap: 4px;
    }

    .email-sender {
      color: var(--el-text-color-primary);
      display: grid;
      grid-template-columns: auto 1fr auto;

      .email-status {
        display: flex;
        flex-direction: column;
        align-content: center;
        @media (max-width: 1366px) {
          flex-direction: row;
          gap: 5px;
        }
      }

      .name {
        display: grid;
        gap: 5px;
        grid-template-columns: auto auto 1fr;
        /* 发件人名字加大加粗（照手机邮箱 App 的列表样式，未读时外层再加粗到 700） */
        font-size: 16px;
        font-weight: 600;

        > span:last-child {
          display: flex;
          align-items: center;
        }

        @media (min-width: 1366px) {
          grid-template-columns: 1fr auto;
          > span:last-child {
            display: none;
          }
        }

        > span:first-child {
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .name-skeleton {
          width: 150px;
          height: 1rem;
          @media (max-width: 767px) {
            width: 130px;
          }
        }
      }

      .phone-time {
        font-weight: normal;
        font-size: 12px;
        @media (min-width: 1367px) {
          display: none;
        }
      }
    }

    .email-text-skeleton {
      .text-skeleton-one {
        width: 80%;
        height: 16px;
        @media (max-width: 1366px) {
          width: 40%;
        }
        @media (max-width: 767px) {
          width: 70%;
        }
      }

      .text-skeleton-two {
        width: min(300px, 100%);
        height: 16px;
        @media (min-width: 1367px) {
          display: none;
        }
        @media (max-width: 1366px) {
          width: 100%;
        }
      }
    }

    .email-text {
      display: grid;
      grid-template-columns: auto 1fr;
      @media (max-width: 1366px) {
        grid-template-columns: 1fr;
      }

      .email-subject {
        display: flex;
        align-items: center;
        gap: 6px;
        overflow: hidden;
        white-space: nowrap;
        min-width: 0;
        @media (min-width: 1367px) {
          padding-left: 5px;
        }
      }

      .code-tag {
        flex: 0 0 auto;
        max-width: 170px;
        height: 20px;
        line-height: 20px;
        font-size: 14px;
        color: var(--el-text-color-primary);
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        cursor: pointer;
      }

      .subject-text {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        min-width: 0;
      }

      .email-content {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        padding-left: 10px;
        color: var(--email-scroll-content-color);
        @media (max-width: 1366px) {
          padding-left: 0;
          margin-top: 0;
        }
      }
    }
  }


  .email-right {
    text-align: right;
    font-size: 12px;
    white-space: nowrap;
    display: flex;
    padding-left: 15px;
    align-items: center;
    @media (max-width: 1366px) {
      display: none;
    }
  }

  .email-right-skeleton {
    @media (max-width: 1366px) {
      display: none;
    }
  }

  &:hover {
    background-color: var(--email-hover-background);
    z-index: 0;
  }

  &.right-checked,
  &.right-checked:hover {
    background-color: var(--email-right-click-background);
  }

  &[data-checked="true"],
  &[data-checked="true"]:hover,
  &.right-checked[data-checked="true"],
  &.right-checked[data-checked="true"]:hover {
    background-color: var(--email-hover-background);
  }
}


.phone-star {
  display: none;
}

.pc-star {
  display: flex;
  width: 40px;
}

@media (max-width: 1366px) {
  .pc-star {
    display: none;
  }
  .phone-star {
    display: block;
    align-self: end;
    padding-right: 16px;
    padding-top: 8px;
  }
  .star-pd {
    padding-top: 6px !important;
  }
}

.email-time {
  padding-right: v-bind(timePaddingRight);
}

:deep(.el-scrollbar__view) {
  height: 100%;
}

.header-actions {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 15px;
  padding: 8px 15px;
  box-shadow: var(--header-actions-border);

  .header-left {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    position: relative;
    column-gap: 20px;
    row-gap: 8px;
    padding-left: 2px;
    color: var(--el-text-color-primary);;
  }

  .header-right {
    display: grid;
    grid-template-columns: auto auto;
    align-items: start;
    /* 窄窗口（<1367px，如 1366 笔记本）时复选框隐藏，header-right 落进 1fr 列被拉满宽，
       auto 列默认会被拉伸均分，图标会被推到行中间去；贴紧右端，跟宽屏一致 */
    justify-content: end;
    height: 100%;
    color: var(--el-text-color-primary);;

    .email-count {
      white-space: nowrap;
      margin-top: 6px;
    }
  }

  .icon {
    font-size: 18px;
    cursor: pointer;
  }

  .reload {
    margin-left: 2px;
  }

  .more-icon {
    margin-top: 8px;
    margin-left: 15px;
  }
}

.del-status {
  color: var(--el-color-info);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  bottom: 1px;
}



.right-dropdown-item {
  display: flex;
  gap: 10px;
}

:deep(.el-dropdown-menu__item:last-child) {
  padding-bottom: 10px;
}

:deep(.el-dropdown-menu__item:first-child) {
  padding-top: 10px;
}

:deep(.el-dropdown-menu__item) {
  padding-right: 14px;
  padding-left: 14px;
}

.unread {
  height: 6px;
  width: 6px;
  background: var(--el-color-primary);
  margin-bottom: 2px;
  margin-right: 5px;
  border-radius: 50%;
  display: inline-block;
  justify-content: center;
}

ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

</style>
