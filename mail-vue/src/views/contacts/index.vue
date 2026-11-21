<template>
  <div class="contacts-page">
    <div class="contacts-header">
      <div v-if="total > 0" class="contacts-title">{{ $t('contactsCount', {total}) }}</div>
      <el-input v-model="keyword" :placeholder="$t('searchContacts')" clearable class="contacts-search"
                @keyup.enter="onSearch" @clear="onSearch">
        <template #prefix>
          <Icon icon="fluent:search-20-regular" width="16" height="16"/>
        </template>
      </el-input>
      <el-button type="primary" @click="openAdd">{{ $t('addContact') }}</el-button>
    </div>

    <div class="contacts-list-wrap">
      <!-- 加载遮罩：跟全站同一个四点加载图标，居中覆盖列表区（2026-11-21 统一） -->
      <div class="loading" :class="loading ? 'loading-show' : 'loading-hide'"
           :style="!loaded ? 'background: transparent' : ''">
        <Loading/>
      </div>
      <el-table :data="list" :empty-text="loaded ? $t('noContacts') : ' '" class="contacts-table" v-if="!isMobile" @row-click="openEdit">
        <el-table-column :label="$t('contactName')" min-width="160">
          <template #default="{row}">
            <div class="name-cell">
              <span class="avatar">{{ avatarText(row) }}</span>
              <span class="name-text">{{ row.name || row.email }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column :label="$t('contactEmail')" min-width="230" show-overflow-tooltip>
          <template #default="{row}">{{ row.email }}</template>
        </el-table-column>
        <el-table-column :label="$t('contactRemark')" min-width="160" show-overflow-tooltip>
          <template #default="{row}">{{ row.remark }}</template>
        </el-table-column>
        <el-table-column width="200" align="right">
          <template #default="{row}">
            <el-button link type="primary" v-perm="'email:send'" @click.stop="writeTo(row)">{{ $t('writeMail') }}</el-button>
            <el-button link type="primary" @click.stop="openEdit(row)">{{ $t('change') }}</el-button>
            <el-button link type="danger" @click.stop="deleteRow(row)">{{ $t('deleted') }}</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="contacts-cards" v-else>
        <div v-if="list.length === 0 && !loading" class="contacts-empty">{{ $t('noContacts') }}</div>
        <div class="contact-card" v-for="row in list" :key="row.contactId" @click="openEdit(row)">
          <span class="avatar">{{ avatarText(row) }}</span>
          <div class="card-body">
            <div class="card-name">{{ row.name || row.email }}</div>
            <div class="card-email">{{ row.email }}</div>
            <div class="card-remark" v-if="row.remark">{{ row.remark }}</div>
          </div>
          <div class="card-actions">
            <button type="button" class="card-action-btn" :aria-label="$t('writeMail')" v-perm="'email:send'" @click.stop="writeTo(row)"><Icon icon="fluent:send-20-regular" width="20" height="20"/></button>
            <button type="button" class="card-action-btn" :aria-label="$t('change')" @click.stop="openEdit(row)"><Icon icon="fluent:edit-20-regular" width="20" height="20"/></button>
            <button type="button" class="card-action-btn" :aria-label="$t('deleted')" @click.stop="deleteRow(row)"><Icon class="icon-huge" icon="hugeicons:delete-02" width="20" height="20"/></button>
          </div>
        </div>
      </div>

    </div>
    <el-pagination v-if="total > size" class="contacts-pager" layout="prev, pager, next"
                   :current-page="page" :page-size="size" :total="total" @current-change="onPageChange"/>

    <el-dialog v-model="dialogShow" :title="editing ? $t('editContact') : $t('addContact')" width="420" class="contact-dialog">
      <el-form>
        <el-form-item :label="t('contactName')" label-position="top">
          <el-input v-model="form.name" :placeholder="t('contactNamePlaceholder')" maxlength="50"/>
        </el-form-item>
        <el-form-item :label="t('contactEmail')" label-position="top">
          <el-input v-model="form.email" :placeholder="t('contactEmailPlaceholder')" maxlength="100" @keyup.enter="saveContact"/>
        </el-form-item>
        <el-form-item :label="t('contactRemark')" label-position="top">
          <el-input v-model="form.remark" :placeholder="t('contactRemarkPlaceholder')" maxlength="100" @keyup.enter="saveContact"/>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogShow = false">{{$t('cancel')}}</el-button>
        <el-button type="primary" :loading="saving" @click="saveContact">{{$t('save')}}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import {onBeforeUnmount, onMounted, ref} from "vue";
import {useI18n} from "vue-i18n";
import {ElMessage, ElMessageBox} from "element-plus";
import {Icon} from "@iconify/vue";
import {contactAdd, contactDelete, contactList, contactUpdate} from "@/request/contact.js";
import {isEmail} from "@/utils/verify-utils.js";
import {useUiStore} from "@/store/ui.js";
import Loading from "@/components/loading/index.vue"; // 大写 Loading：小写 loading 已是加载状态 ref

const {t} = useI18n()
const uiStore = useUiStore()

const list = ref([])
const loading = ref(true)
const loaded = ref(false)
const total = ref(0)
const keyword = ref('')
const page = ref(1)
const size = 50

const dialogShow = ref(false)
const saving = ref(false)
const editing = ref(null)
const form = ref({name: '', email: '', remark: ''})

const isMobile = ref(window.innerWidth <= 767)
function onResize() {
  isMobile.value = window.innerWidth <= 767
}

onMounted(() => {
  window.addEventListener('resize', onResize)
  load()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
})

function load() {
  loading.value = true
  contactList({keyword: keyword.value.trim(), page: page.value, size}).then(data => {
    list.value = data.list
    total.value = data.total
  }).finally(() => {
    loading.value = false
    loaded.value = true
  })
}

function onSearch() {
  page.value = 1
  load()
}

function onPageChange(p) {
  page.value = p
  load()
}

// 头像字：姓名首字，没有姓名取邮箱首字母
function avatarText(row) {
  const text = (row.name || row.email || '').trim()
  return text ? text[0].toUpperCase() : '?'
}

function openAdd() {
  editing.value = null
  form.value = {name: '', email: '', remark: ''}
  dialogShow.value = true
}

function openEdit(row) {
  editing.value = row
  form.value = {name: row.name || '', email: row.email, remark: row.remark || ''}
  dialogShow.value = true
}

function saveContact() {
  const email = form.value.email.trim()
  if (!isEmail(email)) {
    ElMessage({message: t('notEmailMsg'), type: 'warning', plain: true});
    return
  }
  saving.value = true
  const payload = {name: form.value.name.trim(), email, remark: form.value.remark.trim()}
  const req = editing.value
      ? contactUpdate({...payload, contactId: editing.value.contactId})
      : contactAdd(payload)
  req.then(() => {
    dialogShow.value = false
    ElMessage({message: t('setSuccess'), type: 'success', plain: true});
    load()
  }).finally(() => {
    saving.value = false
  })
}

function deleteRow(row) {
  ElMessageBox.confirm(t('deleteContactConfirm'), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    contactDelete([row.contactId]).then(() => {
      ElMessage({message: t('setSuccess'), type: 'success', plain: true});
      if (list.value.length === 1 && page.value > 1) page.value--
      load()
    })
  }).catch(() => {
  })
}

function writeTo(row) {
  uiStore.writerRef.openTo(row.email)
}
</script>

<style lang="scss" scoped>
.contacts-page {
  padding: 16px 20px;
  height: 100%;
  overflow-y: auto;
  box-sizing: border-box;
  /* 纵向 flex：列表区 flex: 1 撑满剩余高度，加载图标才能居中到内容区正中（跟附件页一致） */
  display: flex;
  flex-direction: column;
}

.contacts-header {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

/* 标题已在顶栏显示，这里只留计数（共 N 位），不再重复「通讯录」 */
.contacts-title {
  font-size: 13px;
  color: var(--secondary-text-color);
  margin-right: auto;
}

.contacts-search {
  width: 260px;
}

.name-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.avatar {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--el-fill-color-light);
  color: var(--el-color-primary);
  font-size: 15px;
  font-weight: 600;
}

.name-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.contacts-list-wrap {
  position: relative;
  flex: 1;
}

/* 加载遮罩：跟用户/角色/操作记录页同一套（四点图标 + 居中 + 蒙层 + 淡入淡出） */
.loading {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--loadding-background);
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  z-index: 2;
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

.contacts-pager {
  margin-top: 16px;
  justify-content: center;
}

.contacts-cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.contact-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 10px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  cursor: pointer;
}

// 桌面表格行可点：鼠标放上去是手形
:deep(.contacts-table .el-table__row) {
  cursor: pointer;
}

.card-body {
  flex: 1;
  min-width: 0;
}

.card-name {
  font-size: 15px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-email, .card-remark {
  font-size: 13px;
  color: var(--secondary-text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-actions {
  flex-shrink: 0;
  display: flex;
  gap: 16px;
  color: var(--secondary-text-color);
}

.card-action-btn {
  padding: 0;
  border: none;
  background: none;
  color: inherit;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
}

.contacts-empty {
  text-align: center;
  padding: 48px 0;
  color: var(--secondary-text-color);
}

@media (max-width: 767px) {
  .contacts-page {
    padding: 12px;
  }

  .contacts-search {
    width: 100%;
    order: 3;
  }
}

// 新增/编辑弹窗：内容被传送到 body 下，样式须挂在弹窗根类上，不能放在 .contacts-page 里
// 手机上弹窗改成几乎全宽（左右各留 20px），不再固定 420px 撑出屏幕
:deep(.contact-dialog.el-dialog) {
  @media (max-width: 540px) {
    width: calc(100% - 40px) !important;
    margin-right: 20px !important;
    margin-left: 20px !important;
  }
}
</style>
