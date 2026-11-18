<template>
  <div class="audit-box">
    <div class="header-actions">
      <el-tooltip effect="dark" :content="$t('auditSelectAll')" v-if="isMobile">
        <div class="header-check" :class="{checked: isAllSelected}" @click="toggleSelectAll">
          <Icon v-if="isAllSelected" icon="ep:check" width="14" height="14"/>
        </div>
      </el-tooltip>
      <el-tooltip effect="dark" :content="$t('refresh')">
        <Icon class="icon" icon="ion:reload" width="20" height="20" @click="reload"/>
      </el-tooltip>
      <el-tooltip effect="dark" :content="$t('auditClearAll')">
        <Icon class="icon" icon="fluent:broom-sparkle-16-regular" width="20" height="20" @click="clearAll"/>
      </el-tooltip>
      <el-tooltip effect="dark" :content="$t('auditDeleteSelected')">
        <Icon v-if="selectedLogs.length > 0" class="icon" icon="uiw:delete" width="18" height="18" @click="deleteSelected"/>
      </el-tooltip>
    </div>
    <!-- 原生滚动容器：el-scrollbar 的自定义滑块在手机上不可靠，改用浏览器原生滚动条 + 强制常显样式 -->
    <div class="scrollbar" ref="scrollRef" @scroll="onScroll">
      <div>
        <div class="loading" :class="tableLoading ? 'loading-show' : 'loading-hide'"
             :style="first ? 'background: transparent' : ''">
          <loading/>
        </div>
        <el-table
            v-if="!isMobile"
            :empty-text="first ? '' : null"
            :data="logs"
            style="width: 100%;"
            @row-click="openDetail"
            @selection-change="selectionChange"
        >
          <el-table-column type="selection" width="45"/>
          <el-table-column :label="$t('auditTime')" width="170">
            <template #default="props">
              <span>{{ formatDateTime(props.row.createTime) }}</span>
            </template>
          </el-table-column>
          <el-table-column :label="$t('auditOperator')" min-width="180" show-overflow-tooltip>
            <template #default="props">
              <span>{{ props.row.userEmail }}</span>
            </template>
          </el-table-column>
          <el-table-column :label="$t('auditAction')" width="110">
            <template #default="props">
              <span>{{ $t(auditActionLabelKey(props.row.action)) }}</span>
            </template>
          </el-table-column>
          <el-table-column :label="$t('auditTarget')" min-width="200" show-overflow-tooltip>
            <template #default="props">
              <span>{{ props.row.targetDesc }}</span>
            </template>
          </el-table-column>
          <el-table-column :label="$t('auditDetail')" min-width="200" show-overflow-tooltip>
            <template #default="props">
              <span>{{ props.row.detail || '—' }}</span>
            </template>
          </el-table-column>
          <el-table-column :label="$t('auditOperation')" width="70">
            <template #default="props">
              <el-tooltip effect="dark" :content="$t('delete')">
                <Icon class="icon" icon="fluent:delete-24-regular" width="18" height="18" @click.stop="deleteOne(props.row)"/>
              </el-tooltip>
            </template>
          </el-table-column>
        </el-table>
        <div class="audit-cards" v-else>
          <div v-if="logs.length === 0 && !first" class="audit-empty">{{ $t('auditNoRecords') }}</div>
          <div class="audit-card" :class="{selected: isSelected(row)}" v-for="row in logs" :key="row.logId" @click="openDetail(row)">
            <div class="card-check" :class="{checked: isSelected(row)}" @click.stop="toggleSelect(row)">
              <Icon v-if="isSelected(row)" icon="ep:check" width="14" height="14"/>
            </div>
            <div class="card-body">
              <div class="card-line1">
                <span class="card-action">{{ $t(auditActionLabelKey(row.action)) }}</span>
                <span class="card-time">{{ formatCardTime(row.createTime) }}</span>
              </div>
              <div class="card-operator">{{ row.userEmail }}</div>
              <div class="card-target">{{ row.targetDesc }}</div>
              <div class="card-detail" v-if="row.detail">{{ row.detail }}</div>
            </div>
            <Icon class="icon card-delete" icon="fluent:delete-24-regular" width="18" height="18" @click.stop="deleteOne(row)"/>
          </div>
        </div>
        <div v-if="loadingMore" class="loading-more">{{ $t('loadingMore') }}</div>
      </div>
    </div>
    <el-dialog class="dialog" v-model="detailShow" :title="$t('auditDetailTitle')" :width="isMobile ? '92%' : 520">
      <div class="detail-box" v-if="currentRow">
        <div class="detail-row">
          <span class="detail-label">{{ $t('auditTime') }}</span>
          <span class="detail-value">{{ formatDateTime(currentRow.createTime) }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">{{ $t('auditOperator') }}</span>
          <span class="detail-value">{{ currentRow.userEmail }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">{{ $t('auditAction') }}</span>
          <span class="detail-value">{{ $t(auditActionLabelKey(currentRow.action)) }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">{{ $t('auditTarget') }}</span>
          <span class="detail-value">{{ currentRow.targetDesc }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">{{ $t('auditDetail') }}</span>
          <span class="detail-value detail-text">{{ currentRow.detail || '—' }}</span>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import {ref, reactive, watch, computed, onMounted, onUnmounted, nextTick} from "vue";
import {Icon} from "@iconify/vue";
import {ElMessage, ElMessageBox} from "element-plus";
import {useI18n} from "vue-i18n";
import loading from "@/components/loading/index.vue";
import {auditList, auditDelete, auditClear} from "@/request/audit.js";
import {useAuditStore} from "@/store/audit.js";
import {auditActionLabelKey} from "@/utils/audit-actions.js";

const {t} = useI18n()
const auditStore = useAuditStore()

// 已生效的筛选（来自顶部搜索框的 store）
const params = reactive({
  userEmail: '',
  action: '',
  startDate: '',
  endDate: '',
  num: 1,
  size: 20
})
const logs = ref([])
const total = ref(0)
const tableLoading = ref(false)
const loadingMore = ref(false)
const noMore = ref(false)
const scrollRef = ref(null)
const first = ref(true)
const detailShow = ref(false)
const currentRow = ref(null)
const selectedLogs = ref([])

// 手机端（≤767px）用卡片列表代替表格，表格 7 列太宽、手机上要横向拖动才能看全
const isMobile = ref(window.innerWidth <= 767)

function handleResize() {
  isMobile.value = window.innerWidth <= 767
  // 窗口变高后内容可能不再溢出，补一次自动续载检查
  nextTick(() => maybeLoadMore())
}

watch(isMobile, () => {
  selectedLogs.value = []
})

function isSelected(row) {
  return selectedLogs.value.some(item => item.logId === row.logId)
}

function toggleSelect(row) {
  if (isSelected(row)) {
    selectedLogs.value = selectedLogs.value.filter(item => item.logId !== row.logId)
  } else {
    selectedLogs.value = [...selectedLogs.value, row]
  }
}

// 手机端全选：选已加载的全部记录（无限滚动没有页的概念了）
const isAllSelected = computed(() => logs.value.length > 0 && selectedLogs.value.length === logs.value.length)

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedLogs.value = []
  } else {
    selectedLogs.value = [...logs.value]
  }
}

function applySearchParams(searchParams) {
  params.userEmail = searchParams.userEmail || ''
  params.action = searchParams.action || ''
  params.startDate = searchParams.startDate || ''
  params.endDate = searchParams.endDate || ''
  params.num = 1
}

watch(
  () => auditStore.searchParams,
  () => {
    applySearchParams(auditStore.searchParams)
    reload()
  },
  {deep: true}
)

function formatDateTime(ms) {
  if (!ms) return ''
  const d = new Date(Number(ms))
  if (isNaN(d.getTime())) return ''
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

// 手机卡片上的时间：带年份，不带秒
function formatCardTime(ms) {
  if (!ms) return ''
  const d = new Date(Number(ms))
  if (isNaN(d.getTime())) return ''
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function fetchList(append = false) {
  if (append) {
    loadingMore.value = true
  } else {
    tableLoading.value = true
    noMore.value = false
  }
  const query = {
    userEmail: params.userEmail,
    action: params.action,
    num: params.num,
    size: params.size
  }
  if (params.startDate) {
    query.startTime = new Date(params.startDate + 'T00:00:00').getTime()
  }
  if (params.endDate) {
    query.endTime = new Date(params.endDate + 'T23:59:59.999').getTime()
  }
  auditList(query).then(data => {
    const rows = data.list || []
    total.value = data.total || 0
    logs.value = append ? [...logs.value, ...rows] : rows
    noMore.value = logs.value.length >= total.value || rows.length === 0
  }).finally(() => {
    tableLoading.value = false
    loadingMore.value = false
    first.value = false
    // 首批记录不足一屏时没有滚动条、无限滚动永远触发不了，加载完检查一次自动续载
    nextTick(() => maybeLoadMore())
  })
}

// 从头加载（刷新、筛选、删完之后）：回到第 1 页并滚回顶部
function reload() {
  params.num = 1
  if (scrollRef.value) scrollRef.value.scrollTop = 0
  fetchList()
}

// 内容没撑满容器且还有更多记录时，自动续载下一页（直到撑满或载完为止）
function maybeLoadMore() {
  if (tableLoading.value || loadingMore.value || noMore.value) return
  const wrap = scrollRef.value
  if (!wrap) return
  if (wrap.scrollHeight <= wrap.clientHeight + 120) {
    params.num += 1
    fetchList(true)
  }
}

// 无限滚动：滑到底部自动加载下一页（手机端与桌面端通用，照附件页的做法）
function onScroll(e) {
  if (tableLoading.value || loadingMore.value || noMore.value) return
  const el = e.target
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120) {
    params.num += 1
    fetchList(true)
  }
}

function selectionChange(selection) {
  selectedLogs.value = selection
}

function deleteOne(row) {
  ElMessageBox.confirm(t('auditDeleteOneConfirm'), t('delete'), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    auditDelete([row.logId]).then(() => {
      ElMessage({message: t('delSuccessMsg'), type: 'success', plain: true})
      reload()
    })
  }).catch(() => {
  })
}

function deleteSelected() {
  ElMessageBox.confirm(t('auditDeleteSelectedConfirm'), t('delete'), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    auditDelete(selectedLogs.value.map(r => r.logId)).then(() => {
      ElMessage({message: t('delSuccessMsg'), type: 'success', plain: true})
      selectedLogs.value = []
      reload()
    })
  }).catch(() => {
  })
}

function clearAll() {
  ElMessageBox.confirm(t('auditClearConfirm'), t('auditClearAll'), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    auditClear().then(() => {
      ElMessage({message: t('delSuccessMsg'), type: 'success', plain: true})
      selectedLogs.value = []
      reload()
    })
  }).catch(() => {
  })
}

function openDetail(row) {
  currentRow.value = row
  detailShow.value = true
}

onMounted(() => {
  // 从其他页面回来时，沿用顶部搜索框里已生效的筛选
  applySearchParams(auditStore.searchParams)
  fetchList()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.audit-box {
  width: 100%;
  /* 高度必须用视口单位写死，不能用 height: 100%：祖先链里有 min-height: auto 的 flex 项，
     百分比高度在内容撑高时会被当成 auto，整个页面变高、滚动跑到外层容器去了，
     列表 div 自己不滚动、滚动条永远出不来（2026-11-18 实测） */
  height: calc(100vh - 60px);
  height: calc(100dvh - 60px);
  display: flex;
  flex-direction: column;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 12px 16px;
  flex-wrap: wrap;
}

.icon {
  cursor: pointer;
  color: var(--el-text-color-regular);
}

/* 手机端顶部全选圆圈，跟卡片里的勾选圆圈一个样式 */
.header-check {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1.5px solid #dcdfe6;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #fff;
  flex-shrink: 0;
}

.header-check.checked {
  background: var(--el-color-primary);
  border-color: var(--el-color-primary);
}

.scrollbar {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* 手机端强制显示滚动条：手机浏览器默认只在滑动时闪一下，改成一直可见 */
@media (max-width: 767px) {
  /* 手机端顶部标题栏是 50px（桌面端 60px） */
  .audit-box {
    height: calc(100vh - 50px);
    height: calc(100dvh - 50px);
  }
  .scrollbar {
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 0, 0, 0.25) transparent;
  }
  .scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .scrollbar::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.25);
    border-radius: 4px;
  }
}

.loading {
  display: flex;
  justify-content: center;
  padding: 20px 0;
}

.loading-hide {
  display: none;
}

.loading-more {
  text-align: center;
  color: #999;
  font-size: 13px;
  padding: 16px 0;
}

.detail-box {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.detail-label {
  width: 70px;
  flex-shrink: 0;
  color: var(--el-text-color-secondary);
}

.detail-value {
  word-break: break-all;
}

.detail-text {
  white-space: pre-wrap;
}

/* 手机端卡片列表（照附件页的卡片样式） */
.audit-cards {
  min-height: 200px;
}

.audit-empty {
  text-align: center;
  color: #999;
  padding: 60px 0;
  font-size: 14px;
}

.audit-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid #f5f5f5;
  cursor: pointer;
}

.audit-card.selected {
  background: #f0f7ff;
}

.card-check {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  margin-top: 2px;
  border-radius: 50%;
  border: 1.5px solid #dcdfe6;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #fff;
}

.card-check.checked {
  background: var(--el-color-primary);
  border-color: var(--el-color-primary);
}

.card-body {
  flex: 1;
  min-width: 0;
}

.card-line1 {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.card-action {
  font-size: 15px;
  font-weight: 500;
  color: #222;
}

.card-time {
  font-size: 13px;
  color: #999;
  flex-shrink: 0;
}

.card-operator {
  font-size: 13px;
  color: #999;
  margin-top: 5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-target {
  font-size: 14px;
  color: #444;
  margin-top: 5px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-all;
}

.card-detail {
  font-size: 13px;
  color: #999;
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-delete {
  flex-shrink: 0;
  margin-top: 2px;
}
</style>
