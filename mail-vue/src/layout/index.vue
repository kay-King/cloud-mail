<template>
  <!-- 顶栏通栏：el-header 在最上层横贯整屏，☰ 固定在屏幕左上角，侧边栏展开/收起时位置不变；侧边栏与内容区在顶栏下方 -->
  <el-container class="layout" direction="vertical">
    <el-header>
      <Header />
    </el-header>
    <el-container class="main-container">
      <el-aside
          class="aside"
          :class="uiStore.asideShow ? 'aside-show' : 'el-aside-hide'">
        <Aside />
      </el-aside>
      <div
          :class="(uiStore.asideShow && isMobile)? 'overlay-show':'overlay-hide'"
          @click="uiStore.asideShow = false"
      ></div>
      <el-main>
        <Main />
      </el-main>
    </el-container>
  </el-container>
  <writer ref="writerRef" />
</template>

<script setup>
import Aside from '@/layout/aside/index.vue'
import Header from '@/layout/header/index.vue'
import Main from '@/layout/main/index.vue'
import { ref, onMounted, onBeforeUnmount } from 'vue'
import {useUiStore} from "@/store/ui.js";
import {useUserStore} from "@/store/user.js";
import i18n from "@/i18n/index.js";
import writer from '@/layout/write/index.vue'

const uiStore = useUiStore();
const userStore = useUserStore();
const writerRef = ref({})
const isMobile = ref(window.innerWidth < 1025)
const handleResize = () => {
  isMobile.value = window.innerWidth < 1025
  uiStore.asideShow = window.innerWidth > 1024;
}

onMounted(() => {
  uiStore.writerRef = writerRef

  window.addEventListener('resize', handleResize)
  handleResize()

  // 启动时用户信息没加载到：菜单已按无权限降级，提示用户刷新恢复
  if (userStore.loadFailed) {
    ElMessage.warning(i18n.global.t('userInfoLoadFailed'))
  }

  // 空闲时预取分析页与附件页 chunk，点菜单时不用现下载（慢网下最能感觉到）
  const prefetchRoutes = () => {
    import('@/views/analysis/index.vue').catch(() => {})
    import('@/views/attachments/index.vue').catch(() => {})
  }
  if ('requestIdleCallback' in window) {
    requestIdleCallback(prefetchRoutes, {timeout: 8000})
  } else {
    setTimeout(prefetchRoutes, 5000)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style lang="scss" scoped>
.el-aside-hide {
  position: fixed;
  left: 0;
  height: 100%;
  z-index: 100;
  transform: translateX(-100%);
  transition: all 100ms ease;
}

.aside-show {
  -webkit-box-shadow: var(--aside-right-border);
  box-shadow: var(--aside-right-border);
  transform: translateX(0);
  transition: all 100ms ease;
  z-index: 101;
  @media (max-width: 1025px) {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 101;
    height: 100%;
    background: var(--el-bg-color);
  }
}

.el-aside {
  width: auto;
  transition: all 100ms ease;
}

.layout {
  height: 100%;
  position: fixed;
  width: 100%;
  top: 0;
  left: 0;
  overflow: hidden;
}

/* 顶栏已移到布局最上层：这里只放侧边栏与内容区，高度由 flex 分配（顶栏 60px，其余归这里）；滚动改由 el-main 承担，侧边栏不跟着滚 */
.main-container {
  background: var(--el-bg-color);
  overflow: hidden;
}

.el-main {
  padding: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.el-header {
  background: var(--el-bg-color);
  border-bottom: solid 1px var(--el-border-color);
  padding: 0 0 0 0;
  @media (max-width: 767px) {
    height: 50px;
  }
}

.overlay-show {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.4);
  z-index: 99;
  transition: all 0.3s;
}

.overlay-hide {
  display: flex;
  pointer-events: none;
  opacity: 0;
}

</style>
