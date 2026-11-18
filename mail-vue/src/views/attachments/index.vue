<template>
  <div class="attachments-page" @scroll="onPageScroll">
    <div class="att-header">
      <div class="att-tabs" v-if="!admin">
        <span class="att-tab" :class="{active: tab === 'all'}" @click="switchTab('all')">{{ $t('allAttachments') }}</span>
        <span class="tab-divider">|</span>
        <span class="att-tab" :class="{active: tab === 'fav'}" @click="switchTab('fav')">{{ $t('favoriteAttachments') }}</span>
      </div>
      <div class="att-title" v-else>{{ $t('allAttachments') }}</div>
      <el-input v-model="keyword" :placeholder="$t('searchAttachments')" clearable class="att-search"
                @keyup.enter="onSearch" @clear="onSearch">
        <template #prefix>
          <Icon icon="bytesize:search" width="16" height="16"/>
        </template>
      </el-input>
    </div>

    <div class="cat-tabs" v-if="isMobile">
      <span class="cat-tab" :class="{active: category === opt.value || (opt.value === 'media' && (category === 'image' || category === 'video'))}"
            v-for="opt in mobileCategoryTabs" :key="opt.value" @click="switchCategory(opt.value)">{{ opt.label }}</span>
    </div>

    <div class="att-actions" v-if="!isMobile || selected.length > 0">
      <el-button :disabled="selected.length === 0" @click="downloadSelected">
        <Icon icon="system-uicons:push-down" width="18" height="18"/>
        {{ $t('download') }}
      </el-button>
      <el-button :disabled="selected.length === 0" :loading="sending" @click="sendSelected" v-if="!admin">
        <Icon icon="cil:send" width="18" height="18"/>
        {{ $t('send') }}
      </el-button>
      <el-button :disabled="selected.length === 0" @click="starSelected" v-if="!admin">
        <Icon icon="solar:star-line-duotone" width="18" height="18"/>
        {{ tab === 'fav' ? $t('unFavorite') : $t('favorite') }}
      </el-button>
      <el-button :disabled="selected.length === 0" @click="deleteSelected">
        <Icon icon="fluent:delete-24-regular" width="18" height="18"/>
        {{ $t('deleted') }}
      </el-button>
      <el-select v-model="category" class="att-filter" @change="reload" v-if="!isMobile">
        <el-option v-for="opt in categoryOptions" :key="opt.value" :label="opt.label" :value="opt.value"/>
      </el-select>
    </div>

    <el-table :data="list" v-loading="loading" @selection-change="onSelectionChange"
              :empty-text="$t('noAttachments')" class="att-table" v-if="!isMobile">
      <el-table-column type="selection" width="40"/>
      <el-table-column :label="$t('fileName')" :min-width="isMobile ? 150 : 240">
        <template #default="{row}">
          <div class="file-cell" @click="previewAttachment(row)">
            <Icon v-bind="getIconByName(row.filename)"/>
            <span class="file-name">{{ row.filename }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column width="44" v-if="!admin">
        <template #default="{row}">
          <Icon v-if="row.isStar" icon="fluent-color:star-16" width="20" height="20"
                class="star-icon" @click="toggleStar(row)"/>
          <Icon v-else icon="solar:star-line-duotone" width="20" height="20"
                class="star-icon" @click="toggleStar(row)"/>
        </template>
      </el-table-column>
      <el-table-column :label="$t('fileSize')" width="100">
        <template #default="{row}">{{ formatBytes(row.size) }}</template>
      </el-table-column>
      <el-table-column :label="$t('ownerEmail')" width="190" show-overflow-tooltip v-if="admin && !isMobile">
        <template #default="{row}">{{ row.ownerEmail }}</template>
      </el-table-column>
      <el-table-column :label="$t('sender')" width="190" show-overflow-tooltip v-if="!isMobile">
        <template #default="{row}">{{ row.senderName || row.sendEmail }}</template>
      </el-table-column>
      <el-table-column :label="$t('subject')" min-width="200" show-overflow-tooltip v-if="!isMobile">
        <template #default="{row}">
          <span v-if="admin">{{ row.subject }}</span>
          <span v-else class="subject-cell" @click="jumpToEmail(row)">{{ row.subject }}</span>
        </template>
      </el-table-column>
    </el-table>

    <div class="att-cards" v-else v-loading="loading">
      <div v-if="list.length === 0 && !loading" class="att-empty">{{ $t('noAttachments') }}</div>
      <div class="att-card" :class="{selected: isSelected(row)}" v-for="row in list" :key="row.attId"
           @click="previewAttachment(row)">
        <div class="card-icon" :class="{checked: isSelected(row)}" @click.stop="toggleSelect(row)">
          <Icon v-if="!isSelected(row)" v-bind="getIconByName(row.filename)"/>
          <Icon v-else icon="ep:check" width="22" height="22" color="#fff"/>
        </div>
        <div class="card-body">
          <div class="card-name">{{ row.filename }}</div>
          <div class="card-meta">{{ formatBytes(row.size) }} · {{ formatCardDate(row.createTime) }}</div>
          <div class="card-sub" v-if="cardSub(row)" @click.stop="!admin && jumpToEmail(row)">{{ cardSub(row) }}</div>
        </div>
        <Icon v-if="!admin" :icon="row.isStar ? 'fluent-color:star-16' : 'solar:star-line-duotone'"
              width="20" height="20" class="card-star" @click.stop="toggleStar(row)"/>
      </div>
    </div>

    <div v-if="loadingMore" class="att-more">{{ $t('loadingMore') }}</div>
    <div v-else-if="noMore && list.length > 0" class="att-more">{{ $t('noMoreData') }}</div>
    <delete-notify-dialog v-model="notifyDialog.visible" :message="notifyDialog.message"
                          @confirm="onNotifyDialogConfirm"/>
    <att-previewer ref="previewerRef" @star-toggled="onPreviewerStarToggled"/>
  </div>
</template>

<script setup>
import {computed, onBeforeUnmount, onMounted, reactive, ref, watch} from "vue";
import {useI18n} from "vue-i18n";
import {ElMessage, ElMessageBox} from "element-plus";
import {Icon} from "@iconify/vue";
import deleteNotifyDialog from "@/components/delete-notify-dialog/index.vue";
import attPreviewer from "@/components/att-previewer/index.vue";
import {attList, attAllList, attStar, attDelete} from "@/request/att.js";
import {emailInfo} from "@/request/email.js";
import {formatBytes, fileToBase64} from "@/utils/file-utils.js";
import {getIconByName} from "@/utils/icon-utils.js";
import {cvtR2Url} from "@/utils/convert.js";
import {useEmailStore} from "@/store/email.js";
import {useSettingStore} from "@/store/setting.js";
import {useUserStore} from "@/store/user.js";
import {useUiStore} from "@/store/ui.js";
import router from "@/router/index.js";

const {t} = useI18n()
const emailStore = useEmailStore()
const settingStore = useSettingStore()
const userStore = useUserStore()
const uiStore = useUiStore()

// admin=true 时为管理区的全部附件：全站所有用户，无收藏/发送，主题不可跳转
const props = defineProps({
  admin: {type: Boolean, default: false}
})
const admin = computed(() => props.admin)

const tab = ref('all')
const keyword = ref('')
const category = ref('all')
const list = ref([])
const total = ref(0)
const loading = ref(false)
const loadingMore = ref(false)
const noMore = ref(false)
const sending = ref(false)
const selected = ref([])

const params = reactive({
  num: 1,
  size: 20,
})

const categoryOptions = computed(() => [
  {value: 'all', label: t('allTypes')},
  {value: 'image', label: t('imageType')},
  {value: 'doc', label: t('docType')},
  {value: 'audio', label: t('audioType')},
  {value: 'video', label: t('videoType')},
  {value: 'archive', label: t('archiveType')},
  {value: 'other', label: t('otherType')},
])

// 手机端分类标签：图片与视频合并为一个 tab
const mobileCategoryTabs = computed(() => [
  {value: 'all', label: t('all')},
  {value: 'media', label: t('mediaType')},
  {value: 'audio', label: t('audioType')},
  {value: 'doc', label: t('docType')},
  {value: 'archive', label: t('archiveType')},
  {value: 'other', label: t('otherType')},
])

function switchCategory(value) {
  if (category.value === value) return
  category.value = value
  reload()
}

onMounted(() => {
  fetchList()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})

// 手机端（≤767px）只保留勾选、文件名、收藏、大小四列，发件人/主题/所属邮箱隐藏
const isMobile = ref(window.innerWidth <= 767)

function handleResize() {
  isMobile.value = window.innerWidth <= 767
}

// 宽窄屏切换时清空勾选；切到手机端时把图片/视频单类归并到图片视频
watch(isMobile, (mobile) => {
  selected.value = []
  if (mobile && (category.value === 'image' || category.value === 'video')) {
    category.value = 'media'
    reload()
  }
})

// ---- 手机端卡片列表 ----
function isSelected(row) {
  return selected.value.some(item => item.attId === row.attId)
}

function toggleSelect(row) {
  if (isSelected(row)) {
    selected.value = selected.value.filter(item => item.attId !== row.attId)
  } else {
    selected.value = [...selected.value, row]
  }
}

// 卡片第二行日期：库里存的是 UTC 时间，转本地后显示「M月D日」，往年加年份
function formatCardDate(createTime) {
  if (!createTime) return ''
  const d = new Date(String(createTime).replace(' ', 'T') + 'Z')
  if (isNaN(d.getTime())) return ''
  const now = new Date()
  const md = `${d.getMonth() + 1}月${d.getDate()}日`
  return d.getFullYear() === now.getFullYear() ? md : `${d.getFullYear()}年${md}`
}

// 卡片第三行：主题 | 发件人（管理区显示主题 | 所属邮箱）
function cardSub(row) {
  const who = admin.value ? row.ownerEmail : (row.senderName || row.sendEmail)
  return [row.subject, who].filter(Boolean).join(' | ')
}

function fetchList(append = false) {
  if (append) {
    loadingMore.value = true
  } else {
    loading.value = true
    noMore.value = false
  }
  const fetcher = admin.value ? attAllList : attList
  fetcher({
    num: params.num,
    size: params.size,
    keyword: keyword.value,
    category: category.value,
    star: tab.value === 'fav' ? 1 : 0,
  }).then(data => {
    const rows = data.list || []
    total.value = data.total || 0
    list.value = append ? [...list.value, ...rows] : rows
    noMore.value = list.value.length >= total.value
  }).finally(() => {
    loading.value = false
    loadingMore.value = false
  })
}

// 无限滚动：滑到底部自动加载下一页（手机端与桌面端通用）
function onPageScroll(e) {
  if (loading.value || loadingMore.value || noMore.value) return
  const el = e.target
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120) {
    params.num += 1
    fetchList(true)
  }
}

function reload() {
  params.num = 1
  fetchList()
}

function switchTab(next) {
  if (tab.value === next) return
  tab.value = next
  selected.value = []
  reload()
}

function onSearch() {
  reload()
}

function onSelectionChange(rows) {
  selected.value = rows
}

function downloadOne(row) {
  const a = document.createElement('a')
  a.href = cvtR2Url(row.key)
  a.download = row.filename || ''
  document.body.appendChild(a)
  a.click()
  a.remove()
}

function downloadSelected() {
  selected.value.forEach((row, index) => {
    setTimeout(() => downloadOne(row), index * 300)
  })
}

// 点击预览：转交给公共预览组件（附件页与邮件详情页共用）
const previewerRef = ref(null)

function previewAttachment(row) {
  previewerRef.value?.open(list.value, row, {admin: admin.value})
}

// 面板里取消收藏：收藏 tab 下把该行从列表里去掉
function onPreviewerStarToggled(row, next) {
  if (tab.value === 'fav' && next === 0) {
    list.value = list.value.filter(item => item.attId !== row.attId)
    total.value -= 1
  }
}

async function toggleStar(row) {
  const next = row.isStar ? 0 : 1
  await attStar([row.attId], next)
  row.isStar = next
  if (tab.value === 'fav' && next === 0) {
    list.value = list.value.filter(item => item.attId !== row.attId)
    total.value -= 1
  }
}

async function starSelected() {
  const next = tab.value === 'fav' ? 0 : 1
  const ids = selected.value.map(row => row.attId)
  await attStar(ids, next)
  ElMessage({message: t(next === 1 ? 'favoriteSuccess' : 'unFavoriteSuccess'), type: 'success', plain: true})
  selected.value = []
  fetchList()
}

function deleteSelected() {
  if (admin.value) {
    const v = settingStore.settings.adminDelNotify
    const enabled = v === undefined || v === null || v !== 0
    // 全部附件已按存储文件去重：一行可能对应多个用户的引用行，
    // 用后端算好的 hasOtherOwner 判断是否删到别人的附件（不能只看代表行的所属邮箱）
    const other = selected.value.some(row => row.hasOtherOwner === 1)
    if (enabled && other) {
      notifyDialog.message = t('deleteAttConfirm')
      notifyDialog.visible = true
      return
    }
  }
  ElMessageBox.confirm(t('deleteAttConfirm'), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(async () => {
    const ids = selected.value.map(row => row.attId)
    await attDelete(ids, {allCopies: admin.value})
    ElMessage({message: t('delSuccessMsg'), type: 'success', plain: true})
    selected.value = []
    fetchList()
  }).catch(() => {
  })
}

// 管理员删除通知弹窗：仅全部附件页、开关开启、且删到别人的附件时出现
const notifyDialog = reactive({
  visible: false,
  message: '',
})

async function onNotifyDialogConfirm(opts) {
  const ids = selected.value.map(row => row.attId)
  await attDelete(ids, {...opts, allCopies: admin.value})
  ElMessage({message: t('delSuccessMsg'), type: 'success', plain: true})
  selected.value = []
  fetchList()
}

async function sendSelected() {
  if (selected.value.length > 10) {
    ElMessage({message: t('sendTooMany'), type: 'warning', plain: true})
    return
  }
  sending.value = true
  try {
    const files = []
    for (const row of selected.value) {
      const res = await fetch(cvtR2Url(row.key))
      if (!res.ok) throw new Error(row.filename)
      const blob = await res.blob()
      const content = await fileToBase64(blob)
      files.push({content, filename: row.filename, size: row.size, contentType: row.mimeType || blob.type})
    }
    uiStore.writerRef.openWithAttachments(files)
  } catch (e) {
    ElMessage({message: t('fetchAttFailed'), type: 'error', plain: true})
  } finally {
    sending.value = false
  }
}

async function jumpToEmail(row) {
  const full = await emailInfo(row.emailId)
  emailStore.applyFullList([full])
  emailStore.contentData.email = emailStore.toContentEmail(full)
  emailStore.contentData.delType = 'logic'
  emailStore.contentData.showUnread = true
  emailStore.contentData.showStar = true
  emailStore.contentData.showReply = true
  router.push({name: 'content', params: {mailbox: row.emailType === 1 ? 'sent' : 'inbox'}})
}
</script>

<style scoped>
.attachments-page {
  padding: 16px 20px;
  height: 100%;
  overflow-y: auto;
  box-sizing: border-box;
}

.att-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.att-tabs {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 16px;
}

.att-tab {
  cursor: pointer;
  color: var(--el-text-color-regular);
}

.att-tab.active {
  color: var(--el-text-color-primary);
  font-weight: 700;
}

.att-title {
  font-size: 16px;
  color: var(--el-text-color-primary);
  font-weight: 700;
}

.tab-divider {
  color: var(--el-border-color);
}

.att-search {
  width: 260px;
}

.att-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.att-actions .el-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.att-filter {
  width: 130px;
  margin-left: auto;
}

.att-table {
  width: 100%;
}

.file-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  min-width: 0;
}

.file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-name:hover {
  color: var(--el-color-primary);
}

.star-icon {
  cursor: pointer;
  flex-shrink: 0;
}

.subject-cell {
  cursor: pointer;
  color: var(--el-text-color-regular);
}

.subject-cell:hover {
  color: var(--el-color-primary);
}

.cat-tabs {
  display: flex;
  gap: 22px;
  overflow-x: auto;
  scrollbar-width: none;
  border-bottom: 1px solid var(--el-border-color-lighter);
  margin-bottom: 4px;
}

.cat-tabs::-webkit-scrollbar {
  display: none;
}

.cat-tab {
  flex-shrink: 0;
  padding: 6px 2px 10px;
  font-size: 15px;
  color: var(--secondary-text-color);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}

.cat-tab.active {
  color: var(--el-text-color-primary);
  font-weight: 600;
  border-bottom-color: var(--el-color-primary);
}

.att-cards {
  min-height: 200px;
}

.att-empty {
  text-align: center;
  color: var(--secondary-text-color);
  padding: 60px 0;
  font-size: 14px;
}

.att-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 2px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  cursor: pointer;
}

.att-card.selected {
  background: var(--el-color-primary-light-9);
}

.card-icon {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 10px;
  background: var(--light-ill);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.card-icon.checked {
  background: var(--el-color-primary);
}

.card-body {
  flex: 1;
  min-width: 0;
}

.card-name {
  font-size: 15px;
  color: var(--el-text-color-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-meta {
  font-size: 13px;
  color: var(--secondary-text-color);
  margin-top: 5px;
}

.card-sub {
  font-size: 13px;
  color: var(--secondary-text-color);
  margin-top: 5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-star {
  flex-shrink: 0;
  cursor: pointer;
}

.att-more {
  text-align: center;
  color: var(--secondary-text-color);
  font-size: 13px;
  padding: 16px 0;
}

@media (max-width: 767px) {
  .attachments-page {
    padding: 12px;
  }

  .att-header {
    flex-wrap: wrap;
    gap: 10px;
  }

  .att-search {
    flex: 1 1 100%;
    width: auto;
  }

  .att-actions {
    flex-wrap: wrap;
  }

  .att-filter {
    margin-left: 0;
  }

  .preview-pdf iframe {
    height: calc(100vh - 150px);
  }

  .preview-text {
    max-height: calc(100vh - 150px);
  }

  .preview-media video {
    max-height: calc(100vh - 170px);
  }

  .preview-office {
    height: calc(100vh - 150px);
  }
}
</style>
