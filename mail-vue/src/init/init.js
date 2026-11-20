import {useUserStore} from "@/store/user.js";
import {useSettingStore} from "@/store/setting.js";
import {useAccountStore} from "@/store/account.js";
import {useSidebarStore} from "@/store/sidebar.js";
import {loginUserInfo, bootstrap} from "@/request/my.js";
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
async function loadUserWithRetry(userStore) {
    try {
        return await loginUserInfo();
    } catch (e) {
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

// 启动合并接口失败时返回 null，调用方改走以前的分开请求
async function loadBootstrap() {
    try {
        return await bootstrap();
    } catch (e) {
        console.error('启动合并接口失败，改走分开请求', e);
        return null;
    }
}

export async function init() {
    document.title = '\u200B'

    const settingStore = useSettingStore();
    const userStore = useUserStore();
    const accountStore = useAccountStore();
    const sidebarStore = useSidebarStore();

    // 网站配置 + 用户信息写进各 store（user 为 null 时只写配置，不注册路由，跟以前降级一致）
    function applyStartup(setting, user) {
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
    }

    const token = localStorage.getItem('token');
    if (!settingStore.lang) {
        let lang = navigator.language.split('-')[0]
        lang = lang === 'zh' ? lang : 'en'
        settingStore.lang = lang
    }

    i18n.global.locale.value = settingStore.lang

    if (token) {
        // 启动只发一次请求：网站配置 + 用户信息 + 侧边栏配置 + 未读数一次拿完；
        // 失败时改走以前的分开请求，侧边栏照旧由 layout 自己去拉
        const boot = await loadBootstrap();
        if (boot) {
            applyStartup(boot.setting || {...FALLBACK_SETTING}, boot.user);
            if (boot.sidebarConfig && boot.sidebarUnread) {
                sidebarStore.seed(boot.sidebarConfig, boot.sidebarUnread);
            }
        } else {
            const [setting, user] = await Promise.all([loadWebsiteConfig(), loadUserWithRetry(userStore)]);
            applyStartup(setting, user);
        }
    } else {
        applyStartup(await loadWebsiteConfig(), null);
    }
}
