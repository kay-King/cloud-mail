<template>
  <div class="attachments-page">
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

    <div class="att-actions">
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
      <el-select v-model="category" class="att-filter" @change="reload">
        <el-option v-for="opt in categoryOptions" :key="opt.value" :label="opt.label" :value="opt.value"/>
      </el-select>
    </div>

    <el-table :data="list" v-loading="loading" @selection-change="onSelectionChange"
              :empty-text="$t('noAttachments')" class="att-table">
      <el-table-column type="selection" width="40"/>
      <el-table-column :label="$t('fileName')" min-width="240">
        <template #default="{row}">
          <div class="file-cell" @click="downloadOne(row)">
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
      <el-table-column :label="$t('ownerEmail')" width="190" show-overflow-tooltip v-if="admin">
        <template #default="{row}">{{ row.ownerEmail }}</template>
      </el-table-column>
      <el-table-column :label="$t('sender')" width="190" show-overflow-tooltip>
        <template #default="{row}">{{ row.senderName || row.sendEmail }}</template>
      </el-table-column>
      <el-table-column :label="$t('subject')" min-width="200" show-overflow-tooltip>
        <template #default="{row}">
          <span v-if="admin">{{ row.subject }}</span>
          <span v-else class="subject-cell" @click="jumpToEmail(row)">{{ row.subject }}</span>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination" v-if="total > 0">
      <el-pagination
          :current-page="params.num"
          :page-size="params.size"
          :page-sizes="[15, 20, 30, 50]"
          :total="total"
          background
          layout="total, sizes, prev, pager, next"
          @size-change="sizeChange"
          @current-change="numChange"
      />
    </div>
  </div>
</template>

<script setup>
import {computed, onMounted, reactive, ref} from "vue";
import {useI18n} from "vue-i18n";
import {ElMessage} from "element-plus";
import {Icon} from "@iconify/vue";
import {attList, attAllList, attStar} from "@/request/att.js";
import {emailInfo} from "@/request/email.js";
import {formatBytes, fileToBase64} from "@/utils/file-utils.js";
import {getIconByName} from "@/utils/icon-utils.js";
import {cvtR2Url} from "@/utils/convert.js";
import {useEmailStore} from "@/store/email.js";
import {useUiStore} from "@/store/ui.js";
import router from "@/router/index.js";

const {t} = useI18n()
const emailStore = useEmailStore()
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

onMounted(() => {
  fetchList()
})

function fetchList() {
  loading.value = true
  const fetcher = admin.value ? attAllList : attList
  fetcher({
    num: params.num,
    size: params.size,
    keyword: keyword.value,
    category: category.value,
    star: tab.value === 'fav' ? 1 : 0,
  }).then(data => {
    list.value = data.list || []
    total.value = data.total || 0
  }).finally(() => {
    loading.value = false
  })
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

function numChange(num) {
  params.num = num
  fetchList()
}

function sizeChange(size) {
  params.size = size
  fetchList()
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
  color: #666;
}

.att-tab.active {
  color: #222;
  font-weight: 700;
}

.att-title {
  font-size: 16px;
  color: #222;
  font-weight: 700;
}

.tab-divider {
  color: #ddd;
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
  color: #666;
}

.subject-cell:hover {
  color: var(--el-color-primary);
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
