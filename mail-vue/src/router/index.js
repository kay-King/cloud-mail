import {createRouter, createWebHistory} from 'vue-router'
import NProgress from 'nprogress';
import {useUiStore} from "@/store/ui.js";
import {useEmailStore} from "@/store/email.js";
import {useSettingStore} from "@/store/setting.js";
import {cvtR2Url} from "@/utils/convert.js";

// 懒加载页面失败时先重试一次再报错：国内到 Cloudflare 的链路偶有抖动，
// 动态 import 一次失败常常是瞬时的，重试一次能成就不用整页刷新；
// 两次都失败再走下面的 router.onError 自动恢复（注销离线缓存 + 刷新）。
function lazyImport(loader) {
    return () => loader().catch(() => loader());
}

const routes = [
    {
        path: '/',
        name: 'layout',
        redirect: '/inbox',
        component: lazyImport(() => import('@/layout/index.vue')),
        children: [
            {
                path: '/inbox',
                name: 'email',
                component: lazyImport(() => import('@/views/email/index.vue')),
                meta: {
                    title: 'inbox',
                    name: 'email',
                    menu: true
                }
            },
            {
                path: '/:mailbox(inbox|starred|sent|all-mail|trash|spam|exchanged)/messages',
                name: 'content',
                component: lazyImport(() => import('@/views/content/index.vue')),
                meta: {
                    title: 'message',
                    name: 'content',
                    menu: false
                }
            },
            {
                path: '/settings',
                name: 'setting',
                component: lazyImport(() => import('@/views/setting/index.vue')),
                meta: {
                    title: 'settings',
                    name: 'setting',
                    menu: true
                }
            },
            {
                path: '/starred',
                name: 'star',
                component: lazyImport(() => import('@/views/star/index.vue')),
                meta: {
                    title: 'starred',
                    name: 'star',
                    menu: true
                }
            },
            {
                path: '/trash',
                name: 'trash',
                component: lazyImport(() => import('@/views/trash/index.vue')),
                meta: {
                    title: 'trash',
                    name: 'trash',
                    menu: true
                }
            },
            {
                path: '/spam',
                name: 'spam',
                component: lazyImport(() => import('@/views/spam/index.vue')),
                meta: {
                    title: 'spam',
                    name: 'spam',
                    menu: true
                }
            },
            {
                // 往来邮件：发件人卡片「查看往来邮件」点进来，看与某一个人的收发往来；
                // 不在侧边栏里（没有菜单项），只从卡片进入；没带 address 直接回收件箱
                path: '/exchanged',
                name: 'exchanged',
                component: lazyImport(() => import('@/views/exchanged/index.vue')),
                meta: {
                    title: 'exchanged',
                    name: 'exchanged',
                    menu: true
                },
                beforeEnter: (to) => {
                    if (!to.query.address) return {name: 'email'}
                }
            },
            {
                path: '/attachments',
                name: 'attachments',
                component: lazyImport(() => import('@/views/attachments/index.vue')),
                meta: {
                    title: 'myAttachments',
                    name: 'attachments',
                    menu: true
                }
            },
            {
                path: '/contacts',
                name: 'contacts',
                component: lazyImport(() => import('@/views/contacts/index.vue')),
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
        component: lazyImport(() => import('@/views/login/index.vue'))
    },
    {
        path: '/test',
        name: 'test',
        component: lazyImport(() => import('@/views/test/index.vue'))
    },
    {
        path: '/:pathMatch(.*)*',
        name: '404',
        component: lazyImport(() => import('@/views/404/index.vue'))
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
        if (['content', 'email', 'send', 'trash', 'spam', 'exchanged'].includes(to.meta.name)) {
            uiStore.accountShow = window.innerWidth > 767;
        } else {
            uiStore.accountShow = false
        }
    }

    // 切换文件夹时清空正文区，不残留上一个文件夹的邮件；放 afterEach 是因为它每次导航都跑，
    // 不受 keep-alive 停用影响（放 email-scroll 的 watch 里不可靠）。去设置/通讯录等页面
    // 再回来不清空（lastListRoute 只记邮件列表路由，首次为 null 时只记录不清空）。
    // 往来邮件视图不在名单里：它是从详情页点进来的，详情页读的是 contentData（地址栏没邮件 ID），
    // 进来就清空的话点返回会落到空白详情；不记它，返回时正文还在。
    const emailStore = useEmailStore()
    if (['email', 'send', 'star', 'all-email', 'trash', 'spam'].includes(to.name)) {
        if (emailStore.lastListRoute !== null && to.name !== emailStore.lastListRoute) {
            emailStore.contentData.email = null
        }
        emailStore.lastListRoute = to.name
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
    // 写也包 try/catch（照 index.html 自救的写法）：存储不可用时抛错会拦住后面的刷新
    try {
        sessionStorage.setItem(CHUNK_RELOAD_KEY, JSON.stringify(record))
    } catch (e) {
    }
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
