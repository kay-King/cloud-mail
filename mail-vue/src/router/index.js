import {createRouter, createWebHistory} from 'vue-router'
import NProgress from 'nprogress';
import {useUiStore} from "@/store/ui.js";
import {useSettingStore} from "@/store/setting.js";
import {cvtR2Url} from "@/utils/convert.js";

const routes = [
    {
        path: '/',
        name: 'layout',
        redirect: '/inbox',
        component: () => import('@/layout/index.vue'),
        children: [
            {
                path: '/inbox',
                name: 'email',
                component: () => import('@/views/email/index.vue'),
                meta: {
                    title: 'inbox',
                    name: 'email',
                    menu: true
                }
            },
            {
                path: '/:mailbox(inbox|starred|sent|all-mail|trash|spam)/messages',
                name: 'content',
                component: () => import('@/views/content/index.vue'),
                meta: {
                    title: 'message',
                    name: 'content',
                    menu: false
                }
            },
            {
                path: '/settings',
                name: 'setting',
                component: () => import('@/views/setting/index.vue'),
                meta: {
                    title: 'settings',
                    name: 'setting',
                    menu: true
                }
            },
            {
                path: '/starred',
                name: 'star',
                component: () => import('@/views/star/index.vue'),
                meta: {
                    title: 'starred',
                    name: 'star',
                    menu: true
                }
            },
            {
                path: '/trash',
                name: 'trash',
                component: () => import('@/views/trash/index.vue'),
                meta: {
                    title: 'trash',
                    name: 'trash',
                    menu: true
                }
            },
            {
                path: '/spam',
                name: 'spam',
                component: () => import('@/views/spam/index.vue'),
                meta: {
                    title: 'spam',
                    name: 'spam',
                    menu: true
                }
            },
            {
                path: '/attachments',
                name: 'attachments',
                component: () => import('@/views/attachments/index.vue'),
                meta: {
                    title: 'myAttachments',
                    name: 'attachments',
                    menu: true
                }
            },
            {
                path: '/contacts',
                name: 'contacts',
                component: () => import('@/views/contacts/index.vue'),
                meta: {
                    title: 'contacts',
                    name: 'contacts',
                    menu: true
                }
            },
        ]

    },
    {
        path: '/messages',
        redirect: '/inbox/messages'
    },
    {
        path: '/login',
        name: 'login',
        component: () => import('@/views/login/index.vue')
    },
    {
        path: '/test',
        name: 'test',
        component: () => import('@/views/test/index.vue')
    },
    {
        path: '/:pathMatch(.*)*',
        name: '404',
        component: () => import('@/views/404/index.vue')
    }
]


const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes
})

NProgress.configure({
    showSpinner: false,   // 不显示旋转图标
    trickleSpeed: 50,    // 自动递增速度
    minimum: 0.1          // 最小百分比
});

let timer
let first = true

router.beforeEach((to, from, next) => {

    if (timer) {
        clearTimeout(timer)
    }

    if (!first) {
        timer = setTimeout(() => {
            NProgress.start()
        }, 100)
    }

    const token = localStorage.getItem('token')

    if (!token && !to.path.startsWith('/login')) {
        return next({name: 'login'})
    }

    if (!token && to.path.startsWith('/login')) {
        loadBackground(next)
        return
    }

    if (token && to.path.startsWith('/login')) {
        return next(from.path)
    }

    next()

})

function loadBackground(next) {

    const settingStore = useSettingStore();

    if (settingStore.settings.background) {

        const src = cvtR2Url(settingStore.settings.background);

        const img = new Image();
        img.src = src;

        img.onload = () => {
            next()
        };

        img.onerror = () => {
            console.warn("背景图片加载失败:", img.src);
            next()
        };

        setTimeout(() => {
            console.warn("背景加载超时，已放行");
            next()
        }, 3000)

    } else {
        next()
    }

}

router.afterEach((to) => {

    clearTimeout(timer)
    if (first) {
        removeLoading()
    } else {
        NProgress.done();
    }

    const uiStore = useUiStore()
    if (to.meta.menu) {
        if (['content', 'email', 'send', 'trash'].includes(to.meta.name)) {
            uiStore.accountShow = window.innerWidth > 767;
        } else {
            uiStore.accountShow = false
        }
    }

    if (window.innerWidth < 1025) {
        uiStore.asideShow = false
    }

    first = false
})

function removeLoading() {
    const doc = document.getElementById('loading-first');
    if (!doc) {
        return;
    }

    doc.remove()
}

// 页面文件加载失败：九成是刚部署过新版，手机里还是旧页面在要旧文件
// （旧文件部署后就不存在了，点多少次菜单都一样失败）。
// 静默自动恢复：注销离线缓存（防止它继续给旧页面），再刷新拿新版。
// 60 秒内最多自动恢复两次（离线缓存有时要两次刷新才肯放手），防循环刷新。
// 不弹任何提示（用户要求去掉提示）。
const CHUNK_RELOAD_KEY = 'cloudmail-chunk-reload'

function isChunkLoadError(error) {
    const msg = String(error && error.message ? error.message : error)
    return /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk|ChunkLoadError|Failed to load module script/i.test(msg)
}

router.onError((error) => {
    NProgress.done()
    console.error('路由加载失败', error)
    if (!isChunkLoadError(error)) return
    let record = {count: 0, first: 0}
    try {
        record = JSON.parse(sessionStorage.getItem(CHUNK_RELOAD_KEY) || '{"count":0,"first":0}')
    } catch (e) {
    }
    if (Date.now() - record.first > 60000) {
        record = {count: 0, first: Date.now()}
    }
    if (record.count >= 2) return
    record.count++
    sessionStorage.setItem(CHUNK_RELOAD_KEY, JSON.stringify(record))
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
        navigator.serviceWorker.getRegistrations()
            .then(rs => Promise.all(rs.map(r => r.unregister())))
            .catch(() => {
            })
            .finally(() => location.reload())
    } else {
        location.reload()
    }
})

export default router
