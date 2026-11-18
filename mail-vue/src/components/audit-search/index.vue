<template>
  <div ref="searchRef" class="audit-search">
    <div class="search-placeholder" @click="openSearch">
      <Icon icon="bytesize:search" width="20" height="20"/>
      <span class="search-placeholder-text" :class="{ 'has-search-text': savedSearchSummary }" :title="savedSearchSummary">
        {{ savedSearchSummary || t('auditSearchPlaceholder') }}
      </span>
    </div>
    <el-button
      class="mobile-search-button"
      size="default"
      :aria-label="t('auditSearchPlaceholder')"
      :aria-expanded="visible"
      @click="openSearch"
    >
      <el-icon :size="20">
        <Icon icon="bytesize:search"/>
      </el-icon>
    </el-button>
    <Transition name="search-panel-fade" @after-enter="focusInputOnDesktop">
      <div v-if="visible" class="search-panel-shell" @click.stop>
        <el-card class="search-panel" shadow="always">
          <div class="search-input">
            <el-input
              ref="inputRef"
              v-model="operatorEmail"
              autocomplete="off"
              :placeholder="t('auditOperatorPlaceholder')"
              @keyup.enter="handleSearch"
            />
          </div>
          <div class="search-content">
            <div class="search-content-title">{{ t('auditAction') }}</div>
            <el-select v-model="actionType" class="action-select" :placeholder="t('auditAll')">
              <el-option :label="t('auditAll')" value=""/>
              <el-option v-for="a in AUDIT_ACTION_OPTIONS" :key="a" :label="t(auditActionLabelKey(a))" :value="a"/>
            </el-select>
            <div class="search-date-range">
              <div class="search-date-field">
                <div class="search-date-label">{{ t('auditStartDate') }}</div>
                <el-date-picker
                  v-model="startDate"
                  type="date"
                  :editable="false"
                  value-format="YYYY-MM-DD"
                  :placeholder="t('auditStartDate')"
                />
              </div>
              <div class="search-date-field">
                <div class="search-date-label">{{ t('auditEndDate') }}</div>
                <el-date-picker
                  v-model="endDate"
                  type="date"
                  :editable="false"
                  value-format="YYYY-MM-DD"
                  :placeholder="t('auditEndDate')"
                  :disabled-date="disableEndDate"
                />
              </div>
            </div>
          </div>
          <div class="search-actions">
            <el-button @click="handleReset">{{ t('reset') }}</el-button>
            <el-button type="primary" @click="handleSearch">{{ t('search') }}</el-button>
          </div>
        </el-card>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import {computed, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import {useRoute} from 'vue-router'
import {Icon} from '@iconify/vue'
import {useI18n} from 'vue-i18n'
import {useAuditStore} from '@/store/audit.js'
import {AUDIT_ACTION_OPTIONS, auditActionLabelKey} from '@/utils/audit-actions.js'

const {t} = useI18n()
const emit = defineEmits(['search', 'reset'])
const route = useRoute()
const auditStore = useAuditStore()
let alignFrame = 0
let listObserver = null

const searchRef = ref(null)
const inputRef = ref(null)
const operatorEmail = ref('')
const actionType = ref('')
const startDate = ref('')
const endDate = ref('')
const visible = ref(false)

const savedSearchSummary = computed(() => {
  const params = auditStore.searchParams
  const parts = []
  if (params.userEmail?.trim()) {
    parts.push(params.userEmail.trim())
  }
  if (params.action) {
    parts.push(t(auditActionLabelKey(params.action)))
  }
  if (params.startDate && params.endDate) {
    parts.push(`${params.startDate} ${t('searchSummaryRange')} ${params.endDate}`)
  } else if (params.startDate) {
    parts.push(`${t('searchSummaryAfter')}:${params.startDate}`)
  } else if (params.endDate) {
    parts.push(`${t('searchSummaryBefore')}:${params.endDate}`)
  }
  return parts.filter(Boolean).join('\u00a0\u00a0')
})

watch(startDate, value => {
  if (value && endDate.value && endDate.value < value) {
    endDate.value = ''
  }
})

function openSearch() {
  if (visible.value) {
    closeSearch()
    return
  }

  restoreSavedSearch()
  visible.value = true
}

function focusInput() {
  inputRef.value?.focus()
}

function focusInputOnDesktop() {
  if (!window.matchMedia('(max-width: 1024px)').matches) {
    focusInput()
  }
}

function disableEndDate(date) {
  if (!startDate.value) return false

  const start = new Date(`${startDate.value}T00:00:00`)
  return date < start
}

function closeSearch() {
  visible.value = false
  restoreSavedSearch()
}

function restoreSavedSearch() {
  const params = auditStore.searchParams
  operatorEmail.value = params.userEmail || ''
  actionType.value = AUDIT_ACTION_OPTIONS.includes(params.action) ? params.action : ''
  startDate.value = params.startDate || ''
  endDate.value = params.endDate || ''
}

function handleDocumentKeydown(event) {
  if (event.key === 'Escape' && visible.value) {
    closeSearch()
  }
}

function handleDocumentClick(event) {
  const target = event.target
  // 下拉框与日期选择器的浮层都挂在 body 下，不在搜索框内，点它们不能算点外面
  const isPopup = target?.closest?.(
    '.el-picker__popper, .el-picker-panel, .el-select__popper, .el-select-dropdown'
  )

  if (
    !visible.value
    || searchRef.value?.contains(target)
    || isPopup
  ) {
    return
  }

  event.preventDefault()
  event.stopPropagation()
  closeSearch()
}

function handleSearch() {
  auditStore.setSearchParams({
    userEmail: operatorEmail.value.trim(),
    action: actionType.value,
    startDate: startDate.value,
    endDate: endDate.value,
  })
  emit('search')
  closeSearch()
}

function handleReset() {
  operatorEmail.value = ''
  actionType.value = ''
  startDate.value = ''
  endDate.value = ''
  auditStore.setSearchParams({
    userEmail: '',
    action: '',
    startDate: '',
    endDate: '',
  })
  emit('reset')
  closeSearch()
}

// 搜索框左缘与操作记录表格左缘对齐（照全部邮件与主题列对齐的做法）
function alignSearch() {
  const el = searchRef.value
  if (!el) return
  if (window.matchMedia('(max-width: 767px)').matches) {
    el.style.left = ''
    el.style.marginLeft = ''
    el.style.width = ''
    return
  }

  const anchor = document.querySelector('.audit-box')
  const header = el.offsetParent
  if (!anchor || !header || typeof header.getBoundingClientRect !== 'function') return

  const left = Math.max(150, Math.round(
    anchor.getBoundingClientRect().left - header.getBoundingClientRect().left
  ) + 16)
  const preferred = window.innerWidth <= 1080 ? 400 : 450
  const width = Math.max(220, Math.min(preferred, header.clientWidth - left - 80))
  el.style.marginLeft = '0'
  el.style.left = `${left}px`
  el.style.width = `${width}px`
}

function scheduleAlign() {
  if (alignFrame) return
  alignFrame = requestAnimationFrame(() => {
    alignFrame = 0
    alignSearch()
  })
}

watch(() => route.fullPath, () => {
  scheduleAlign()
  setTimeout(scheduleAlign, 50)
})

onMounted(() => {
  document.addEventListener('click', handleDocumentClick, true)
  document.addEventListener('keydown', handleDocumentKeydown, true)
  scheduleAlign()
  setTimeout(scheduleAlign, 50)
  setTimeout(scheduleAlign, 300)
  window.addEventListener('resize', scheduleAlign)
  const main = document.querySelector('.main-container')
  if (main && typeof ResizeObserver !== 'undefined') {
    listObserver = new ResizeObserver(() => scheduleAlign())
    listObserver.observe(main)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick, true)
  document.removeEventListener('keydown', handleDocumentKeydown, true)
  window.removeEventListener('resize', scheduleAlign)
  listObserver?.disconnect()
  if (alignFrame) cancelAnimationFrame(alignFrame)
})
</script>

<style lang="scss" scoped>
.audit-search {
  position: absolute;
  left: -1;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  width: min(450px, calc(100% - 20px));
  height: 36px;
  @media (max-width: 1080px) {
    width: min(400px, calc(100% - 20px));
  }
  @media (min-width: 768px) {
    /* 桌面端搜索框左缘至少留出标题位置，JS 对齐未跑起来时也不盖住“操作记录” */
    left: 150px;
  }
}

.search-placeholder {
  width: 100%;
  height: 36px;
  border-radius: 6px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
  text-align: left;
  white-space: nowrap;
  cursor: text;
  position: relative;
  z-index: 0;
}

.search-placeholder-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 15px;
}

.search-placeholder-text.has-search-text {
  color: var(--el-text-color-primary);
}

.mobile-search-button {
  display: none;
}

@media (max-width: 767px) {
  .audit-search {
    position: static;
    transform: none;
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    margin-left: auto;
  }

  .search-placeholder {
    display: none;
  }

  .mobile-search-button {
    display: inline-flex;
    width: 32px;
    height: 32px;
    padding: 0;
    border: none;
    background: transparent;
    box-shadow: none;
    --el-button-bg-color: transparent;
    --el-button-border-color: transparent;
    --el-button-hover-bg-color: transparent;
    --el-button-hover-border-color: transparent;
    --el-button-active-bg-color: transparent;
    --el-button-active-border-color: transparent;
    --el-button-outline-color: transparent;
  }

  .audit-search .search-panel-shell {
    top: calc(100% + 8px);
    left: 50%;
    right: auto;
    width: min(450px, calc(100vw - 30px));
    translate: -50% 0;
  }
}

.search-panel-shell {
  position: absolute;
  top: -4px;
  left: 0;
  z-index: 1001;
  width: 100%;
  box-sizing: border-box;
  background: var(--el-bg-color-overlay);
}

.search-panel {
  width: 100%;
  height: auto;
  min-height: 0;
  box-sizing: border-box;
  --el-card-bg-color: var(--el-bg-color-overlay);
  background-color: var(--el-card-bg-color) !important;
  border-radius: 6px !important;
  border: 1px solid var(--el-border-color) !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12) !important;
  overflow: hidden;
  isolation: isolate;
}

.search-panel :deep(.el-card__body) {
  position: relative;
  z-index: 1;
  padding: 3px;
  background-color: var(--el-card-bg-color) !important;
}

.search-panel-fade-enter-active,
.search-panel-fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.search-panel-fade-enter-from,
.search-panel-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.search-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 25px;
  padding-bottom: 15px;
  padding-right: 15px;
}

.search-content {
  padding: 20px 15px 0;
}

.search-content-title {
  font-size: 14px;
  font-weight: 700;
  line-height: 20px;
  color: var(--el-text-color-primary);
  width: 100%;
  text-align: left !important;
}

.action-select {
  width: 100%;
  margin-top: 8px;
}

.search-date-range {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.search-date-field {
  flex: 1;
  min-width: 0;
}

.search-date-label {
  margin-bottom: 4px;
  font-size: 14px;
  font-weight: 700;
  line-height: 20px;
  color: var(--el-text-color-primary);
  text-align: left;
}

.search-date-field :deep(.el-date-editor) {
  width: 100%;
}

.search-input {
  --el-input-bg-color: var(--el-bg-color-overlay);
  margin: 4px -3px 0;
  padding: 0 8px 6px;
  border-bottom: solid 1px var(--el-border-color);
}

.search-input :deep(.el-input__wrapper),
.search-input :deep(.el-input__wrapper.is-focus) {
  box-shadow: none !important;
}

.search-input :deep(.el-input__inner::placeholder) {
  font-size: 15px;
}
</style>
