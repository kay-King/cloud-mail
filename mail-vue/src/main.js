import {createApp} from 'vue';
import App from './App.vue';
import router from './router';
import './style.css';
import { init } from '@/init/init.js';
import { createPinia } from 'pinia';
import piniaPersistedState from 'pinia-plugin-persistedstate';
import 'element-plus/theme-chalk/dark/css-vars.css';
import 'nprogress/nprogress.css';
import perm from "@/perm/perm.js";
// 启动自救的标记：主文件开始执行即置位；index.html 里的自救脚本 25 秒后检查，
// 若未置位说明主文件没加载起来（旧缓存页面要旧文件），自动清缓存刷新
window.__APP_BOOTED__ = true;
const pinia = createPinia().use(piniaPersistedState)
import i18n from "@/i18n/index.js";
const app = createApp(App).use(pinia)
// 初始化失败也照常挂载，不要停在白屏；init 内部已做降级，这里是最后一道防线
try {
    await init()
} catch (e) {
    console.error('初始化失败', e)
}
app.use(router).use(i18n).directive('perm',perm)
app.config.devtools = true;

app.mount('#app');
