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
// 启动自救的标记：主文件开始执行即置位；index.html 里的自救脚本 25 秒后检查，
// 若未置位说明主文件没加载起来（旧缓存页面要旧文件），自动清缓存刷新
window.__APP_BOOTED__ = true;
const pinia = createPinia().use(piniaPersistedState)
import i18n from "@/i18n/index.js";
const app = createApp(App).use(pinia)
// 指针类型会话内同步（二合一设备接/拔鼠标时复选框/三栏跟着变）
useUiStore().initPointerListener()
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
