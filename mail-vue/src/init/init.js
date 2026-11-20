import {useUserStore} from "@/store/user.js";
import {useSettingStore} from "@/store/setting.js";
import {useAccountStore} from "@/store/account.js";
import {loginUserInfo} from "@/request/my.js";
import {permsToRouter} from "@/perm/perm.js";
import router from "@/router";
import {websiteConfig} from "@/request/setting.js";
import i18n from "@/i18n/index.js";

// 网站配置加载失败时的兜底：用默认值继续启动，不要白屏
const FALLBACK_SETTING = {
    r2Domain: '',
    loginOpacity: 1.00,
    title: 'Cloud Mail',
    domainList: []
};

async function loadWebsiteConfig() {
    try {
        return await websiteConfig();
    } catch (e) {
        console.error('网站配置加载失败，使用默认配置', e);
        return {...FALLBACK_SETTING};
    }
}

// 用户信息加载失败时重试一次；仍失败返回 null，由调用方降级处理
// 401 不重试：拦截器已删 token 并跳登录页，再发一次只是无 token 的重复请求
async function loadUserWithRetry(userStore) {
    try {
        return await loginUserInfo();
    } catch (e) {
        if (e?.code === 401 || e?.response?.status === 401) {
            userStore.loadFailed = true;
            return null;
        }
        console.error('用户信息加载失败，1.5 秒后重试', e);
    }
    await new Promise(resolve => setTimeout(resolve, 1500));
    try {
        return await loginUserInfo();
    } catch (e) {
        console.error('用户信息重试失败', e);
        userStore.loadFailed = true;
        return null;
    }
}

export async function init() {
    document.title = '\u200B'

    const settingStore = useSettingStore();
    const userStore = useUserStore();
    const accountStore = useAccountStore();

    const token = localStorage.getItem('token');
    if (!settingStore.lang) {
        let lang = navigator.language.split('-')[0]
        lang = lang === 'zh' ? lang : 'en'
        settingStore.lang = lang
    }

    i18n.global.locale.value = settingStore.lang

    if (token) {
        const [setting, user] = await Promise.all([loadWebsiteConfig(), loadUserWithRetry(userStore)]);
        settingStore.settings = setting;
        settingStore.domainList = setting.domainList || [];
        document.title = setting.title || 'Cloud Mail';

        if (user) {
            accountStore.currentAccountId = user.account.accountId;
            accountStore.currentAccount = user.account;
            userStore.user = user;

            const routers = permsToRouter(user.permKeys);
            routers.forEach(routerData => {
                router.addRoute('layout', routerData);
            });
        }

    } else {
        const setting = await loadWebsiteConfig();
        settingStore.settings = setting;
        settingStore.domainList = setting.domainList || [];
        document.title = setting.title || 'Cloud Mail';
    }
}
