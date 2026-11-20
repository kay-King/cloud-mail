<!-- 附件预览器（附件页与邮件详情页共用）。
     用法：<att-previewer ref="previewerRef" @star-toggled="onStarToggled"/>
     调用 previewerRef.open(rows, row, {admin}) 打开预览。
     桌面端统一进悬浮双栏面板（左侧列表 + 右侧展示区）；手机端图片走
     el-image-viewer，其余走全屏弹窗，不支持预览的格式直接下载。
     rows 里的每行至少要有 attId、key、filename、size；有 isStar 时面板
     顶栏才显示星标（邮件附件行没有 isStar，不显示）。 -->
<template>
  <el-image-viewer v-if="showImagePreview" :url-list="previewImageUrls" :initial-index="previewImageIndex"
                   show-progress @close="showImagePreview = false"/>
  <!-- 桌面端双栏预览面板：悬浮居中，左侧附件列表，右侧展示区；点面板外空白处关闭 -->
  <div v-if="panel.visible" class="att-panel" @click.self="closePanel">
    <div class="panel-box">
      <div class="panel-topbar">
        <span class="panel-title">{{ panelRow ? panelRow.filename : '' }}</span>
        <Icon v-if="showStar && panelRow && panelRow.isStar !== undefined"
              :icon="panelRow.isStar ? 'fluent-color:star-16' : 'fluent:star-20-regular'"
              width="20" height="20" class="panel-star" @click="toggleStar(panelRow)"/>
        <div class="panel-top-actions">
          <el-button text @click="panelRow && downloadRow(panelRow)">
            <Icon icon="fluent:arrow-download-20-regular" width="18" height="18"/>
            {{ $t('download') }}
          </el-button>
          <el-dropdown trigger="click" @command="onPanelMoreCommand">
            <el-button text>
              <Icon icon="fluent:more-horizontal-20-regular" width="18" height="18"/>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="newWindow">{{ $t('openInNewWindow') }}</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-button text :disabled="!hasPrevPanel" @click="stepPanel(-1)">
            <Icon icon="fluent:chevron-up-20-regular" width="18" height="18"/>
            {{ $t('prevItem') }}
          </el-button>
          <el-button text :disabled="!hasNextPanel" @click="stepPanel(1)">
            <Icon icon="fluent:chevron-down-20-regular" width="18" height="18"/>
            {{ $t('nextItem') }}
          </el-button>
          <el-button text @click="closePanel">
            <Icon icon="fluent:dismiss-20-regular" width="18" height="18"/>
          </el-button>
        </div>
      </div>
      <div class="panel-body">
        <div class="panel-list" ref="panelListRef">
          <div class="panel-list-head">{{ $t('previewFiles') }} {{ rows.length }}</div>
          <div class="panel-list-item" v-for="(row, idx) in rows" :key="row.attId"
               :class="{active: idx === panel.index}" :data-att-id="row.attId" @click="jumpPanel(idx)">
            <Icon v-bind="getIconByName(row.filename)"/>
            <span class="panel-list-name">{{ row.filename }}</span>
          </div>
        </div>
        <div class="panel-view">
          <template v-if="panelRow && !panel.error">
            <img v-if="panelType === 'image'" :src="panelUrl" class="panel-img" :alt="panelRow.filename"
                 @click="openPanelImageViewer" @error="panel.error = $t('fetchAttFailed')"/>
            <div v-else-if="panelType === 'pdf'" class="panel-pdf">
              <iframe :src="panelUrl" frameborder="0"></iframe>
            </div>
            <div v-else-if="panelType === 'text'" class="panel-text">
              <pre>{{ panelText }}</pre>
            </div>
            <div v-else-if="panelType === 'audio'" class="panel-media">
              <audio :src="panelUrl" controls autoplay></audio>
            </div>
            <div v-else-if="panelType === 'video'" class="panel-media">
              <video :src="panelUrl" controls autoplay></video>
            </div>
            <div v-else-if="panelType === 'docx' || panelType === 'xlsx'" ref="panelOfficeRef" class="panel-office"></div>
            <div v-else-if="panelType === 'pptx'" ref="panelPptxRef" class="panel-office">
              <component :is="pptxComp" v-if="pptxComp" :src="panelUrl" @error="onPanelPptxError"/>
            </div>
            <div v-else class="panel-state">
              <Icon v-bind="getIconByName(panelRow.filename)" width="40" height="40"/>
              <div class="panel-state-name">{{ panelRow.filename }}</div>
              <div>{{ formatBytes(panelRow.size) }} · {{ $t('previewUnsupported') }}</div>
              <el-button type="primary" @click="downloadRow(panelRow)">{{ $t('download') }}</el-button>
            </div>
          </template>
          <div v-if="panel.error" class="panel-state">
            <div>{{ panel.error }}</div>
            <div v-if="panel.errorDetail" class="panel-error-detail">{{ panel.errorDetail }}</div>
            <el-button type="primary" @click="panelRow && downloadRow(panelRow)">{{ $t('download') }}</el-button>
          </div>
          <div v-if="panel.loading" class="panel-loading">
            <Icon icon="eos-icons:loading" width="32" height="32"/>
            <div>{{ $t('previewLoading') }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <el-dialog v-model="previewDialog.visible" :title="previewDialog.filename" :fullscreen="isMobile"
             :width="isMobile ? '100%' : '720px'" class="att-preview-dialog" @closed="onPreviewClosed">
    <div v-if="previewDialog.type === 'pdf'" class="preview-pdf">
      <iframe :src="previewDialog.url" frameborder="0"></iframe>
    </div>
    <div v-else-if="previewDialog.type === 'text'" class="preview-text">
      <pre>{{ previewDialog.text }}</pre>
    </div>
    <div v-else-if="previewDialog.type === 'audio'" class="preview-media">
      <audio :src="previewDialog.url" controls autoplay></audio>
    </div>
    <div v-else-if="previewDialog.type === 'video'" class="preview-media">
      <video :src="previewDialog.url" controls autoplay></video>
    </div>
    <div v-else-if="previewDialog.type === 'docx' || previewDialog.type === 'xlsx'" class="preview-office">
      <div ref="dialogOfficeRef" class="preview-office-box" v-show="!previewDialog.error"></div>
      <div v-if="previewDialog.loading" class="preview-loading">{{ $t('previewLoading') }}</div>
      <div v-if="previewDialog.error" class="preview-error">{{ previewDialog.error }}
        <div v-if="previewDialog.errorDetail" class="preview-error-detail">{{ previewDialog.errorDetail }}</div>
      </div>
    </div>
    <div v-else-if="previewDialog.type === 'pptx'" ref="dialogPptxRef" class="preview-office">
      <component :is="pptxComp" v-if="pptxComp" v-show="!previewDialog.error" :src="previewDialog.url" @error="onDialogPptxError"/>
      <div v-if="previewDialog.loading" class="preview-loading">{{ $t('previewLoading') }}</div>
      <div v-if="previewDialog.error" class="preview-error">{{ previewDialog.error }}
        <div v-if="previewDialog.errorDetail" class="preview-error-detail">{{ previewDialog.errorDetail }}</div>
      </div>
    </div>
    <template #footer>
      <el-button @click="previewDialog.visible = false">{{ $t('cancel') }}</el-button>
      <el-button @click="previewDialog.row && openPreviewWindow(previewDialog.row, previewDialog.url)">{{ $t('openInNewWindow') }}</el-button>
      <el-button type="primary" @click="downloadRow(previewDialog.row)">{{ $t('download') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import {computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch} from "vue";
import {useI18n} from "vue-i18n";
import {ElMessage} from "element-plus";
import {Icon} from "@iconify/vue";
import {attStar} from "@/request/att.js";
import {formatBytes, getExtName} from "@/utils/file-utils.js";
import {getIconByName} from "@/utils/icon-utils.js";
import {loadOfficeLib, openPreviewWindow} from "@/utils/office-preview.js";
import {cvtR2Url} from "@/utils/convert.js";
import {IMAGE_PREVIEW_EXTS, TEXT_PREVIEW_EXTS, AUDIO_PREVIEW_EXTS, VIDEO_PREVIEW_EXTS, TEXT_PREVIEW_MAX} from "@/utils/preview-types.js";

const {t} = useI18n()

const emit = defineEmits(['star-toggled'])

// 当前预览的附件行集合（附件页传当前列表，邮件详情页传该邮件的附件列表）
const rows = ref([])
const showStar = ref(true)

const isMobile = ref(window.innerWidth <= 767)

function handleResize() {
  isMobile.value = window.innerWidth <= 767
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('keydown', onPanelKeydown)
  panelRenderSeq++
  dialogRenderSeq++
  destroyPanelOffice()
  destroyDialogOffice()
})

function downloadRow(row) {
  if (!row) return
  const a = document.createElement('a')
  a.href = cvtR2Url(row.key)
  a.download = row.filename || ''
  document.body.appendChild(a)
  a.click()
  a.remove()
}

// ---- 点击预览 ----
// 图片 / PDF / 纯文本 / 音频 / 视频 / Office（docx、xls/xlsx、pptx，浏览器本地解析）。
// 扩展名名单在 utils/preview-types.js，与详情页眼睛图标共用；preview.html 里另有一份副本，改名单时同步。

const showImagePreview = ref(false)
const previewImageUrls = ref([])
const previewImageIndex = ref(0)
// pptx 是 Vue 组件（vendored UMD），面板与弹窗共用同一个组件对象
const pptxComp = ref(null)
const previewDialog = reactive({
  visible: false,
  type: '',
  filename: '',
  url: '',
  text: '',
  row: null,
  loading: false,
  error: '',
  errorDetail: '',
})

function previewType(row) {
  const ext = getExtName(row.filename || '')
  if (IMAGE_PREVIEW_EXTS.includes(ext)) return 'image'
  if (ext === 'pdf') return 'pdf'
  if (TEXT_PREVIEW_EXTS.includes(ext) && row.size <= TEXT_PREVIEW_MAX) return 'text'
  if (AUDIO_PREVIEW_EXTS.includes(ext)) return 'audio'
  if (VIDEO_PREVIEW_EXTS.includes(ext)) return 'video'
  if (ext === 'docx') return 'docx'
  if (ext === 'xls' || ext === 'xlsx') return 'xlsx'
  if (ext === 'pptx') return 'pptx'
  return ''
}

// 对外入口：rowsArg 为当前附件行集合，row 为要点开的那一行，opts.admin 为 true 时面板不显示星标
function open(rowsArg, row, opts = {}) {
  rows.value = rowsArg || []
  showStar.value = !opts.admin
  if (!isMobile.value) {
    openPanel(row)
    return
  }
  const type = previewType(row)
  if (!type) {
    downloadRow(row)
    return
  }
  const url = cvtR2Url(row.key)
  if (type === 'image') {
    const images = rows.value.filter(r => previewType(r) === 'image')
    previewImageUrls.value = images.map(r => cvtR2Url(r.key))
    previewImageIndex.value = Math.max(0, images.findIndex(r => r.attId === row.attId))
    showImagePreview.value = true
    return
  }
  openDialog(row, type, url)
}

async function openDialog(row, type, url) {
  if (type === 'text') {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error('fetch failed')
      previewDialog.text = await res.text()
    } catch (e) {
      ElMessage({message: t('fetchAttFailed'), type: 'error', plain: true})
      downloadRow(row)
      return
    }
  }
  previewDialog.type = type
  previewDialog.filename = row.filename
  previewDialog.url = url
  previewDialog.row = row
  previewDialog.error = ''
  previewDialog.visible = true
  if (type === 'docx' || type === 'xlsx' || type === 'pptx') {
    renderDialogOffice()
  }
}

// 是否正打开着任一预览面（桌面面板 / 手机弹窗 / 手机图片查看器）；详情页 Esc 守卫用：
// 预览开着时 Esc 只关预览，不触发详情页返回（面板自己的 Esc 监听与详情页的都在 window 上，
// 详情页的先注册先执行，靠这个检查跳过返回，再由面板自己的监听关闭面板）
function isOpen() {
  return panel.visible || previewDialog.visible || showImagePreview.value
}

defineExpose({open, isOpen})

// ---- 手机端弹窗里的 Office 预览 ----
const dialogOfficeRef = ref(null)
const dialogPptxRef = ref(null)
let dialogOfficeInstance = null
let dialogRenderSeq = 0

function destroyDialogOffice() {
  if (dialogOfficeInstance) {
    try {
      dialogOfficeInstance.destroy()
    } catch (e) {
    }
    dialogOfficeInstance = null
  }
  if (dialogOfficeRef.value) dialogOfficeRef.value.innerHTML = ''
}

// pptx 是 Vue 组件，没有可 await 的渲染完成回调：轮询等第一页幻灯片
// （.pptx-preview-slide-wrapper）出现再撤加载遮罩，否则会先看到渲染器黑底闪一下；
// 最多等 10 秒，切换文件/关闭/出错时提前退出
async function waitForPptxSlide(container, stop) {
  const deadline = Date.now() + 10000
  while (Date.now() < deadline) {
    if (stop()) return
    if (container?.querySelector('.pptx-preview-slide-wrapper')) return
    await new Promise(r => setTimeout(r, 150))
  }
}

async function renderDialogOffice() {
  const seq = ++dialogRenderSeq
  destroyDialogOffice()
  previewDialog.error = ''
  previewDialog.errorDetail = ''
  const type = previewDialog.type
  const url = previewDialog.url
  if (type === 'pptx') {
    previewDialog.loading = true
    try {
      pptxComp.value = await loadOfficeLib('pptx')
      await nextTick()
      await waitForPptxSlide(dialogPptxRef.value, () => seq !== dialogRenderSeq || previewDialog.error)
    } catch (e) {
      if (seq === dialogRenderSeq) {
        previewDialog.error = t('previewFailed')
        previewDialog.errorDetail = errorDetailOf(e)
      }
    } finally {
      if (seq === dialogRenderSeq) previewDialog.loading = false
    }
    return
  }
  previewDialog.loading = true
  try {
    await nextTick()
    if (seq !== dialogRenderSeq) return
    const lib = await loadOfficeLib(type)
    if (seq !== dialogRenderSeq || !previewDialog.visible) return
    const inst = lib.init(dialogOfficeRef.value)
    dialogOfficeInstance = inst
    await inst.preview(url)
  } catch (e) {
    if (seq === dialogRenderSeq) {
      previewDialog.error = t('previewFailed')
      previewDialog.errorDetail = errorDetailOf(e)
    }
  } finally {
    if (seq === dialogRenderSeq) previewDialog.loading = false
  }
}

function onDialogPptxError(e) {
  previewDialog.error = t('previewFailed')
  previewDialog.errorDetail = errorDetailOf(e)
}

// 预览失败时附带的原始错误信息（截断，方便定位是文件问题还是解析库问题）
function errorDetailOf(e) {
  const msg = e && e.message ? String(e.message) : ''
  return msg ? msg.slice(0, 200) : ''
}

function onPreviewClosed() {
  dialogRenderSeq++
  destroyDialogOffice()
  previewDialog.type = ''
  previewDialog.url = ''
  previewDialog.text = ''
  previewDialog.row = null
  previewDialog.loading = false
  previewDialog.error = ''
  previewDialog.errorDetail = ''
}

// ---- 桌面端双栏预览面板 ----
const panel = reactive({
  visible: false,
  index: -1,
  loading: false,
  error: '',
  errorDetail: '',
})
const panelText = ref('')
const panelListRef = ref(null)
const panelOfficeRef = ref(null)
const panelPptxRef = ref(null)
let panelOfficeInstance = null
let panelRenderSeq = 0

const panelRow = computed(() => panel.index >= 0 ? rows.value[panel.index] : null)
const panelType = computed(() => panelRow.value ? previewType(panelRow.value) : '')
const panelUrl = computed(() => panelRow.value ? cvtR2Url(panelRow.value.key) : '')
const hasPrevPanel = computed(() => panel.index > 0)
const hasNextPanel = computed(() => panel.index >= 0 && panel.index < rows.value.length - 1)

function destroyPanelOffice() {
  if (panelOfficeInstance) {
    try {
      panelOfficeInstance.destroy()
    } catch (e) {
    }
    panelOfficeInstance = null
  }
  if (panelOfficeRef.value) panelOfficeRef.value.innerHTML = ''
}

function openPanel(row) {
  const idx = rows.value.findIndex(r => r.attId === row.attId)
  if (idx < 0) return
  panel.index = idx
  panel.visible = true
  window.addEventListener('keydown', onPanelKeydown)
}

function closePanel() {
  panel.visible = false
  panel.index = -1
  panelRenderSeq++
  destroyPanelOffice()
  window.removeEventListener('keydown', onPanelKeydown)
}

function onPanelKeydown(e) {
  if (e.key === 'Escape') closePanel()
}

function stepPanel(d) {
  const next = panel.index + d
  if (next < 0 || next >= rows.value.length) return
  panel.index = next
}

function jumpPanel(idx) {
  if (idx !== panel.index) panel.index = idx
}

function scrollPanelActiveIntoView() {
  nextTick(() => {
    const row = panelRow.value
    if (!row || !panelListRef.value) return
    const el = panelListRef.value.querySelector(`[data-att-id="${row.attId}"]`)
    if (el) el.scrollIntoView({block: 'nearest'})
  })
}

function onPanelMoreCommand(cmd) {
  if (cmd === 'newWindow' && panelRow.value) {
    openPreviewWindow(panelRow.value, panelUrl.value)
  }
}

function onPanelPptxError(e) {
  panel.error = t('previewFailed')
  panel.errorDetail = errorDetailOf(e)
}

// 面板里的图片点一下放大到图片查看器（可缩放/左右切换）
function openPanelImageViewer() {
  if (!panelRow.value) return
  const images = rows.value.filter(r => previewType(r) === 'image')
  previewImageUrls.value = images.map(r => cvtR2Url(r.key))
  previewImageIndex.value = Math.max(0, images.findIndex(r => r.attId === panelRow.value.attId))
  showImagePreview.value = true
}

async function renderPanel() {
  const seq = ++panelRenderSeq
  destroyPanelOffice()
  panel.error = ''
  panel.errorDetail = ''
  panelText.value = ''
  if (!panel.visible || !panelRow.value) return
  const type = panelType.value
  const url = panelUrl.value
  if (type === 'text') {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error('fetch failed')
      if (seq !== panelRenderSeq) return
      const text = await res.text()
      // 读 body 也可能耗时，再查一次 seq：期间切了文件就丢弃，避免旧文本盖新文件
      if (seq !== panelRenderSeq) return
      panelText.value = text
    } catch (e) {
      if (seq === panelRenderSeq) panel.error = t('fetchAttFailed')
    }
    return
  }
  if (type === 'docx' || type === 'xlsx') {
    panel.loading = true
    try {
      await nextTick()
      if (seq !== panelRenderSeq) return
      const lib = await loadOfficeLib(type)
      if (seq !== panelRenderSeq || !panel.visible) return
      const inst = lib.init(panelOfficeRef.value)
      panelOfficeInstance = inst
      await inst.preview(url)
    } catch (e) {
      if (seq === panelRenderSeq) {
        panel.error = t('previewFailed')
        panel.errorDetail = errorDetailOf(e)
      }
    } finally {
      if (seq === panelRenderSeq) panel.loading = false
    }
    return
  }
  if (type === 'pptx') {
    panel.loading = true
    try {
      const comp = await loadOfficeLib('pptx')
      if (seq !== panelRenderSeq) return
      pptxComp.value = comp
      await nextTick()
      // 组件挂上后还要下载并解析 pptx 文件才出第一页：等幻灯片出现再撤遮罩
      await waitForPptxSlide(panelPptxRef.value, () => seq !== panelRenderSeq || panel.error)
    } catch (e) {
      if (seq === panelRenderSeq) {
        panel.error = t('previewFailed')
        panel.errorDetail = errorDetailOf(e)
      }
    } finally {
      if (seq === panelRenderSeq) panel.loading = false
    }
  }
}

watch([() => panel.visible, () => panel.index], () => {
  if (panel.visible) {
    renderPanel()
    scrollPanelActiveIntoView()
  }
})

async function toggleStar(row) {
  const next = row.isStar ? 0 : 1
  try {
    await attStar([row.attId], next)
  } catch (e) {
    // 失败不改本地状态、不发 star-toggled，弹提示（照详情页星标的 catch：失败回滚本地状态）
    ElMessage({message: t('starToggleFailed'), type: 'error', plain: true})
    return
  }
  row.isStar = next
  emit('star-toggled', row, next)
}
</script>

<style scoped>
.preview-pdf iframe {
  width: 100%;
  height: 70vh;
  border: 0;
  display: block;
}

.preview-text {
  max-height: 70vh;
  overflow: auto;
}

.preview-text pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 14px;
  line-height: 1.6;
}

.preview-media audio {
  width: 100%;
}

.preview-media video {
  width: 100%;
  max-height: 70vh;
  display: block;
}

.preview-office {
  position: relative;
  height: 70vh;
}

.preview-office-box {
  height: 100%;
  overflow-x: hidden;
}

.preview-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--loadding-background);
  color: var(--secondary-text-color);
  font-size: 14px;
}

.preview-error {
  padding: 40px 20px;
  text-align: center;
  color: #f56c6c;
  font-size: 14px;
}

.preview-error-detail {
  margin-top: 8px;
  color: var(--el-text-color-placeholder);
  font-size: 12px;
  word-break: break-all;
}

/* 桌面端双栏预览面板：悬浮居中浮层 */
.att-panel {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  padding: 32px 48px;
}

.panel-box {
  flex: 1;
  min-width: 0;
  min-height: 0;
  background: var(--el-bg-color);
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-topbar {
  height: 56px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.panel-star {
  cursor: pointer;
  flex-shrink: 0;
}

.panel-top-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.panel-top-actions .el-button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.panel-body {
  flex: 1;
  display: flex;
  min-height: 0;
}

.panel-list {
  width: 260px;
  flex-shrink: 0;
  border-right: 1px solid var(--el-border-color-lighter);
  overflow-y: auto;
}

.panel-list-head {
  padding: 12px 14px;
  font-size: 15px;
  font-weight: 700;
  position: sticky;
  top: 0;
  background: var(--el-bg-color);
  z-index: 1;
}

.panel-list-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  cursor: pointer;
}

.panel-list-item:hover {
  background: var(--light-ill);
}

.panel-list-item.active {
  background: var(--el-color-primary-light-9);
}

.panel-list-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
}

.panel-view {
  flex: 1;
  min-width: 0;
  background: var(--light-ill);
  overflow: auto;
  display: flex;
  position: relative;
}

.panel-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  margin: auto;
  cursor: zoom-in;
}

.panel-pdf {
  flex: 1;
  min-width: 0;
}

.panel-pdf iframe {
  width: 100%;
  height: 100%;
  border: 0;
  display: block;
}

.panel-text {
  flex: 1;
  min-width: 0;
  overflow: auto;
  padding: 20px;
}

.panel-text pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 14px;
  line-height: 1.6;
}

.panel-media {
  margin: auto;
  width: 100%;
  max-width: 900px;
  padding: 20px;
}

.panel-media audio {
  width: 100%;
}

.panel-media video {
  width: 100%;
  max-height: 80vh;
  display: block;
}

.panel-office {
  flex: 1;
  min-width: 0;
  min-height: 0;
  /* pptx 幻灯片按容器宽渲染，竖向滚动条出现后会宽出十几像素，禁横向滚动 */
  overflow-x: hidden;
}

/* pptx 组件的根节点必须有高度：它内部容器是 height:100%，父级没高度就量不到，
   预览器会回落到 540px 高、幻灯片下半截只能靠滚动看（标题正好被截在折叠处） */
.panel-office :deep(.vue-office-pptx),
.preview-office :deep(.vue-office-pptx) {
  height: 100%;
}

/* 预览器内层滚动容器：竖向滚动条出现后幻灯片会宽出滚动条的宽度，禁横向滚动；
   库默认黑底，渲染前会黑屏闪一下，改成浅灰底（库是行内样式，须 !important 覆盖） */
.panel-office :deep(.pptx-preview-wrapper),
.preview-office :deep(.pptx-preview-wrapper) {
  overflow-x: hidden;
  background: var(--light-ill) !important;
}

.panel-state {
  margin: auto;
  text-align: center;
  color: var(--secondary-text-color);
  font-size: 14px;
  line-height: 2;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.panel-state-name {
  color: var(--el-text-color-primary);
  font-size: 15px;
  word-break: break-all;
}

.panel-error-detail {
  color: var(--el-text-color-placeholder);
  font-size: 12px;
  line-height: 1.5;
  word-break: break-all;
  max-width: 560px;
}

.panel-loading {
  position: absolute;
  inset: 0;
  background: var(--light-ill);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--secondary-text-color);
  font-size: 14px;
  z-index: 5;
}
</style>
