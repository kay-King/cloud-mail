import {createApp} from 'vue';
import App from './App.vue';
import router from './router';
import './style.css';
import './themes.css';
import { init } from '@/init/init.js';
import { createPinia } from 'pinia';
import piniaPersistedState from 'pinia-plugin-persistedstate';
import 'element-plus/theme-chalk/dark/css-vars.css';
import 'nprogress/nprogress.css';
import perm from "@/perm/perm.js";
import {useUiStore} from "@/store/ui.js";
import {initScrollbarAutoHide} from "@/utils/scrollbar-auto-hide.js";
// 启动自救的标记：主文件开始执行即置位；index.html 里的自救脚本 25 秒后检查，
// 若未置位说明主文件没加载起来（旧缓存页面要旧文件），自动清缓存刷新
window.__APP_BOOTED__ = true;
const pinia = createPinia().use(piniaPersistedState)
import i18n from "@/i18n/index.js";
const app = createApp(App).use(pinia)
// 指针类型会话内同步（二合一设备接/拔鼠标时复选框/三栏跟着变）
useUiStore().initPointerListener()
// 滚动条自动隐藏：滚动时显示滑块，停下 1 秒后消失
initScrollbarAutoHide()
// 初始化失败也照常挂载，不要停在白屏；init 内部已做降级，这里是最后一道防线
try {
    await init()
} catch (e) {
    console.error('初始化失败', e)
}
app.use(router).use(i18n).directive('perm',perm)
app.config.devtools = true;

app.mount('#app');
// 挂载完成标记：index.html 里的第二层自救 150 秒后检查；init 挂起（最长约 2 分钟）时挂载
// 一直没发生，说明真卡住了才自救——不等 25 秒那层，避免慢网下打断一次可能成功的 init
window.__APP_MOUNTED__ = true;

// 启动后后台预取各页面代码：每次部署都会换掉页面代码的文件名，手机上开着的旧页面
// 点开还没访问过的页面时，旧文件已不在服务器上（构建时 dist 会清空重建），请求拿到
// 的是首页 HTML，当成代码加载失败，触发整页刷新——只在部署后第一次点开某页面时发生，
// 所以“有时候”才触发。启动时（文件还在服务器上）先把各页面的代码下载到缓存里，
// 之后点开直接用缓存，部署后也不用刷新。等浏览器空闲再取，不抢首屏带宽；取失败只记日志。
// 登录/测试/404 很少从站内点开，不预取，省点流量。
const prefetchRouteChunks = () => {
  const names = ['email', 'star', 'send', 'trash', 'spam', 'attachments', 'contacts', 'setting', 'content', 'exchanged', 'all-email', 'draft']
  for (const name of names) {
    try {
      const route = router.getRoutes().find(r => r.name === name)
      const loader = route?.components?.default
      if (typeof loader === 'function') {
        loader().catch(() => {})
      }
    } catch (e) {
      // 预取失败不影响使用（点开时再正常加载，失败了走路由的自动恢复）
    }
  }
}
if (typeof window.requestIdleCallback === 'function') {
  window.requestIdleCallback(prefetchRouteChunks, {timeout: 8000})
} else {
  setTimeout(prefetchRouteChunks, 3000)
}
