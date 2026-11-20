<template>
  <el-scrollbar class="scroll">
    <div>
      <div class="title" :class="{ 'title-display': titleUsesDisplayFont }">
        <img class="logo" :src="logoUrl" alt="" />
        <div>{{settingStore.settings.title}}</div>
      </div>
      <button v-perm="'email:send'" class="compose-bar" type="button" @click="openCompose">
        <Icon class="icon-huge" icon="hugeicons:quill-write-01" width="22" height="22" />
        <span>{{ $t('compose') }}</span>
      </button>
      <el-menu :collapse="false" style="margin-top: 6px">
        <!-- 个人区：顺序与显隐由 sidebarStore 控制（个人设置「界面与显示」里改） -->
        <el-menu-item v-for="item in visiblePersonalItems" :key="item.key"
                      @click="router.push({name: item.key})" :index="item.key"
                      :class="route.meta.name === item.key ? 'choose-item' : ''">
          <Icon :icon="item.icon" :width="item.size" :height="item.size" :class="item.cls" />
          <span class="menu-name" :style="{ marginLeft: (item.labelMargin || 16) + 'px' }">{{$t(item.label)}}</span>
          <span v-if="unreadBadge(item.key)" class="menu-badge">{{ unreadBadge(item.key) }}</span>
        </el-menu-item>
        <div class="manage-title" v-perm="['all-email:query','user:query','role:query','setting:query','analysis:query','reg-key:query','audit:query']">
          <div>{{$t('manage')}}</div>
        </div>
        <el-menu-item @click="router.push({name: 'analysis'})" index="analysis" v-perm="'analysis:query'"
                      :class="route.meta.name === 'analysis' ? 'choose-item' : ''">
          <Icon icon="fluent:data-pie-20-regular" width="20" height="20" />
          <span class="menu-name" style="margin-left: 16px">{{$t('analytics')}}</span>
        </el-menu-item>
        <el-menu-item @click="router.push({name: 'user'})" index="setting" v-perm="'user:query'"
                      :class="route.meta.name === 'user' ? 'choose-item' : ''">
          <Icon icon="fluent:person-20-regular" width="20" height="20" />
          <span class="menu-name" style="margin-left: 16px">{{$t('allUsers')}}</span>
        </el-menu-item>
        <el-menu-item @click="router.push({name: 'all-email'})" index="all-email" v-perm="'all-email:query'"
                      :class="route.meta.name === 'all-email' ? 'choose-item' : ''">
          <Icon icon="fluent:mail-list-20-regular" width="20" height="20" />
          <span class="menu-name" style="margin-left: 16px">{{$t('allMail')}}</span>
        </el-menu-item>
        <el-menu-item @click="router.push({name: 'all-attachments'})" index="all-attachments" v-perm="'all-email:query'"
                      :class="route.meta.name === 'all-attachments' ? 'choose-item' : ''">
          <Icon icon="fluent:attach-20-regular" width="20" height="20" />
          <span class="menu-name" style="margin-left: 16px">{{$t('allAttachments')}}</span>
        </el-menu-item>
        <el-menu-item @click="router.push({name: 'audit'})" index="audit" v-perm="'audit:query'"
                      :class="route.meta.name === 'audit' ? 'choose-item' : ''">
          <Icon icon="fluent:history-20-regular" width="20" height="20" />
          <span class="menu-name" style="margin-left: 16px">{{$t('auditLog')}}</span>
        </el-menu-item>
        <el-menu-item @click="router.push({name: 'role'})" index="setting" v-perm="'role:query'"
                      :class="route.meta.name === 'role' ? 'choose-item' : ''">
          <Icon icon="fluent:lock-closed-20-regular" width="20" height="20" />
          <span class="menu-name" style="margin-left: 16px">{{$t('permissions')}}</span>
        </el-menu-item>
        <el-menu-item @click="router.push({name: 'reg-key'})" index="reg-key" v-perm="'reg-key:query'"
                      :class="route.meta.name === 'reg-key' ? 'choose-item' : ''">
          <Icon icon="fluent:fingerprint-20-regular" width="20" height="20" />
          <span class="menu-name" style="margin-left: 16px">{{$t('inviteCode')}}</span>
        </el-menu-item>
        <el-menu-item @click="router.push({name: 'sys-setting'})" index="sys-setting" v-perm="'setting:query'"
                      :class="route.meta.name === 'sys-setting' ? 'choose-item' : ''">
          <Icon icon="fluent:server-20-regular" width="20" height="20" />
          <span class="menu-name" style="margin-left: 16px">{{$t('SystemSettings')}}</span>
        </el-menu-item>
      </el-menu>
    </div>
  </el-scrollbar>
</template>

<script setup>
import router from "@/router/index.js";
import {computed, onMounted, watch} from "vue";
import { useRoute } from "vue-router";
import {Icon} from "@iconify/vue";
import {useSettingStore} from "@/store/setting.js";
import {useUiStore} from "@/store/ui.js";
import {useSidebarStore} from "@/store/sidebar.js";
import {hasPerm} from "@/perm/perm.js";

const settingStore = useSettingStore();
const uiStore = useUiStore();
const sidebarStore = useSidebarStore();
const route = useRoute();

// 个人区条目（图标尺寸与边距照抄原来的写法，外观不变；顺序与显隐由 sidebarStore 控制）
const personalItems = [
  { key: 'email', icon: 'fluent:mail-inbox-20-regular', size: 20, label: 'inbox', perm: null },
  { key: 'send', icon: 'fluent:send-20-regular', size: 20, label: 'sent', perm: 'email:send' },
  { key: 'draft', icon: 'fluent:document-20-regular', size: 20, label: 'drafts', perm: 'email:send' },
  { key: 'star', icon: 'fluent:star-20-regular', size: 20, label: 'starred', perm: null },
  { key: 'spam', icon: 'fluent:folder-prohibited-20-regular', size: 20, label: 'spam', perm: null },
  { key: 'trash', icon: 'hugeicons:delete-02', size: 20, label: 'trash', perm: null, cls: 'icon-huge' },
  { key: 'attachments', icon: 'fluent:attach-20-regular', size: 20, label: 'myAttachments', perm: null },
  { key: 'contacts', icon: 'fluent:people-20-regular', size: 20, label: 'contacts', perm: null },
  { key: 'setting', icon: 'fluent:settings-20-regular', size: 20, label: 'settings', perm: null },
]
// 权限过滤走 hasPerm（计算属性，权限晚到也能补上；原来的 v-perm 指令在 mounted 时删元素，权限晚到就回不来了）
const visiblePersonalItems = computed(() => {
  const byKey = Object.fromEntries(personalItems.map(item => [item.key, item]))
  return sidebarStore.visibleKeys
    .map(key => byKey[key])
    .filter(item => item && (!item.perm || hasPerm(item.perm)))
})

// 未读数字角标：收件箱/星标/垃圾邮件在行尾显示未读数，超过 99 显示 99+，没有未读不显示
const UNREAD_BADGE_KEYS = ['email', 'star', 'spam']
function unreadBadge(key) {
  if (!UNREAD_BADGE_KEYS.includes(key)) {
    return ''
  }
  const count = sidebarStore.unread[key === 'email' ? 'inbox' : key] || 0
  if (count <= 0) {
    return ''
  }
  return count > 99 ? '99+' : String(count)
}

onMounted(() => {
  sidebarStore.load()
})

// 每次切页面都刷新一次未读数：「有未读时显示」的条目靠它决定显隐，
// 标已读、星标/垃圾切换这些操作做完切页面时，未读数跟着更新
watch(() => route.fullPath, () => {
  sidebarStore.refreshUnread()
})
const logoUrl = computed(() => {
  // Logo 跟随品牌主题：默认用 mail.png，各品牌用对应的 SVG 信封
  const brand = uiStore.brand
  const file = brand === 'default' ? 'mail.png' : `mail-${brand}.svg`
  return `${import.meta.env.BASE_URL}${file}`
})
const titleUsesDisplayFont = computed(() => !/\p{Script=Han}/u.test(settingStore.settings.title || ''))

function openCompose() {
  uiStore.writerRef.open()
}

</script>

<style lang="scss" scoped>

@font-face {
  font-family: "BAHAMASB";
  src: url("/fonts/BAHAMASB.woff") format("woff");
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

.title {
  margin: 10px 6px;
  height: 45px;
  border-radius: 6px;
  display: flex;
  position: relative;
  font-size: 18px;
  font-weight: 600;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  color: var(--aside-text-color);
  transition: all 0.3s ease;
  max-width: 240px;
  padding: 0 10px;
  > div {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    max-width: calc(240px - 20px - 32px - 5px);
  }

  .logo {
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    object-fit: contain;
  }

  .user-right-icon {
    align-self: center;
    position: absolute;
    font-size: 12px;
    right: 8px;
    color: var(--aside-text-color);
  }

}

.title.title-display {
  font-family: "BAHAMASB", Inter, "Helvetica Neue", Helvetica, sans-serif;
  font-size: 22px;
  font-weight: normal;
}

.compose-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: calc(100% - 24px);
  height: 42px;
  margin-right: 12px;
  margin-left: 12px;
  margin-bottom: 15px;
  border: 0;
  border-radius: 8px;
  background: var(--el-color-primary);
  color: #ffffff;
  font-family: inherit;
  font-size: 15px;
  line-height: 1;
  cursor: pointer;

  &:hover {
    background: var(--el-color-primary-dark-2);
  }

  @media (max-width: 767px) {
    display: none;
  }
}

.manage-title {
  margin-top: 12px;
  padding-left: 20px;
  color: var(--aside-text-color);
}

.el-menu-item {
  margin: 3px 12px !important;
  border-radius: 6px;
  height: 36px;
  padding: 10px !important;
}

.choose-item {
  font-weight: 400;
  background: var(--aside-menu-active-background) !important;
  /* 当前选中菜单的文字与图标跟随品牌主色（默认主题保持白色） */
  color: var(--aside-active-color) !important;
  backdrop-filter: blur(4px);
}

/* 未读数字角标：行尾小圆角牌，浅灰底灰字；选中与未选中一个样，选中态由菜单行自己的底色块表达，不跟角标变色 */
.menu-badge {
  margin-left: auto;
  min-width: 24px;
  height: 22px;
  padding: 0 6px;
  border-radius: 6px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-regular);
  font-size: 12px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

@media (hover: hover) {
  .el-menu-item:hover {
    background: var(--aside-hover-bg) !important;
  }
}

.menu-name {
  user-select: none;
}


:deep(.el-scrollbar__wrap--hidden-default ) {
  background: var(--aside-backgound) !important;
}

:deep(.el-menu-item) {
  background: var(--aside-backgound);
}

:deep(.el-menu) {
  background: var(--aside-backgound);
}

.el-menu {
  border-right: 0;
  width: 260px;
  /* 菜单文字/悬停跟随品牌主题（原 text-color/active-text-color 属性已改由变量控制） */
  --el-menu-text-color: var(--aside-text-color);
  --el-menu-active-color: var(--aside-text-color);
  --el-menu-bg-color: transparent;
  --el-menu-hover-bg-color: var(--aside-hover-bg);
}

:deep(.el-divider__text) {
  background: var(--aside-backgound);
  color: var(--aside-text-color);
}

.scroll {

}
</style>
