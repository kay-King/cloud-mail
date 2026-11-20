import { defineStore } from 'pinia'
import { getSidebarConfig, setSidebarConfig, getSidebarUnread } from '@/request/my.js'

// 侧边栏自定义（个人区 9 个条目）：收件箱与设置必须显示，其余 7 个可隐藏，9 个都能调顺序
// 星标与垃圾箱还可以选「有未读时显示」（只有这两个视图有未读概念）
// 配置存在服务器 user.sidebar_config：{ hidden: [...], order: [...], showIfUnread: [...] }，换设备同步
export const SIDEBAR_DEFAULT_ORDER = ['email', 'send', 'draft', 'star', 'spam', 'trash', 'attachments', 'contacts', 'setting']
export const SIDEBAR_HIDEABLE = ['send', 'draft', 'star', 'spam', 'trash', 'attachments', 'contacts']
export const SIDEBAR_UNREAD_KEYS = ['star', 'spam']

function normalize(config) {
  const parsed = config || {}
  // 有未读时显示只认星标与垃圾箱
  const showIfUnread = Array.isArray(parsed.showIfUnread)
    ? [...new Set(parsed.showIfUnread)].filter(key => SIDEBAR_UNREAD_KEYS.includes(key))
    : []
  // hidden 只认可可隐藏的 7 个，收件箱/设置写进来也强制踢掉；与 showIfUnread 互斥
  const hidden = Array.isArray(parsed.hidden)
    ? [...new Set(parsed.hidden)].filter(key => SIDEBAR_HIDEABLE.includes(key) && !showIfUnread.includes(key))
    : []
  // order 只认 9 个已知条目，缺的按默认顺序补到末尾（以后新增条目也不会丢）
  const order = []
  if (Array.isArray(parsed.order)) {
    for (const key of parsed.order) {
      if (SIDEBAR_DEFAULT_ORDER.includes(key) && !order.includes(key)) {
        order.push(key)
      }
    }
  }
  for (const key of SIDEBAR_DEFAULT_ORDER) {
    if (!order.includes(key)) {
      order.push(key)
    }
  }
  return { hidden, order, showIfUnread }
}

// 启动闪烁：侧边栏首屏用默认 state（全显示、默认顺序）渲染，等服务器配置回来才过滤，
// 隐藏/「有未读时显示」的条目会先闪一下再消失。把上次的配置缓存在 localStorage，
// 首屏先用缓存渲染，服务器配置回来后再校正（跟主题设置一个做法）。
// 缓存不区分用户：换账号登录时首屏可能短暂显示上个账号的配置，load() 很快会校正。
const SIDEBAR_CACHE_KEY = 'sidebarConfig'
function loadCached() {
  try {
    const raw = localStorage.getItem(SIDEBAR_CACHE_KEY)
    if (!raw) return null
    return normalize(JSON.parse(raw))
  } catch (e) {
    return null
  }
}
function saveCached(config) {
  try {
    localStorage.setItem(SIDEBAR_CACHE_KEY, JSON.stringify(config))
  } catch (e) {
    // 隐私模式等写不进去时忽略，服务器配置仍是准绳
  }
}

export const useSidebarStore = defineStore('sidebar', {
  state: () => {
    const cached = loadCached()
    return {
      hidden: cached?.hidden || [],
      order: cached?.order || [...SIDEBAR_DEFAULT_ORDER],
      showIfUnread: cached?.showIfUnread || [],
      // 「有未读时显示」与数字角标用的未读数（收件箱、星标、垃圾箱）；未读数不缓存，初始为 0，
      // 「有未读时显示」的条目首屏先隐藏、有未读时再出现（只进不出，不会闪错）
      unread: { star: 0, spam: 0, inbox: 0 },
      loaded: false,
      loading: false
    }
  },
  getters: {
    // 侧边栏实际显示的条目：隐藏的不显示；「有未读时显示」的只有未读数 > 0 才显示
    visibleKeys: (state) => state.order.filter(key => {
      if (state.hidden.includes(key)) {
        return false
      }
      if (state.showIfUnread.includes(key)) {
        return (state.unread[key] || 0) > 0
      }
      return true
    })
  },
  actions: {
    async load(force = false) {
      if (this.loaded && !force) {
        return
      }
      // 侧边栏与设置页都会调 load：请求进行中时返回同一个 Promise 等它完成，
      // 不能直接 return——否则设置页会拿着还没加载完的默认顺序去同步本地列表，
      // 刷新后设置列表显示默认顺序、侧边栏却是已保存顺序（2026-11-19 浏览器验证发现）
      if (this.loading && this.loadPromise) {
        return this.loadPromise
      }
      this.loading = true
      this.loadPromise = (async () => {
        try {
          const [data, unread] = await Promise.all([getSidebarConfig(), getSidebarUnread()])
          const { hidden, order, showIfUnread } = normalize(data)
          this.hidden = hidden
          this.order = order
          this.showIfUnread = showIfUnread
          this.unread = { star: unread?.star || 0, spam: unread?.spam || 0, inbox: unread?.inbox || 0 }
          this.loaded = true
          saveCached({ hidden, order, showIfUnread })
        } catch (e) {
          // 加载失败就用默认（全显示、默认顺序），不要让侧边栏空白
          console.error('load sidebar config failed', e)
        } finally {
          this.loading = false
          this.loadPromise = null
        }
      })()
      return this.loadPromise
    },
    // 启动合并接口带回来的侧边栏数据：直接写进 state 并标已加载，
    // 之后 layout 调 load() 会因 loaded=true 跳过，不再发请求；
    // 没带回来（某段失败）时不调它，load() 照旧自己去拉
    seed(config, unread) {
      const { hidden, order, showIfUnread } = normalize(config)
      this.hidden = hidden
      this.order = order
      this.showIfUnread = showIfUnread
      this.unread = { star: unread?.star || 0, spam: unread?.spam || 0, inbox: unread?.inbox || 0 }
      this.loaded = true
      saveCached({ hidden, order, showIfUnread })
    },
    // 只刷新未读数（新邮件到达、标已读、星标/垃圾切换后调）；进行中时复用同一个请求
    async refreshUnread() {
      if (this.unreadPromise) {
        return this.unreadPromise
      }
      this.unreadPromise = (async () => {
        try {
          const unread = await getSidebarUnread()
          this.unread = { star: unread?.star || 0, spam: unread?.spam || 0, inbox: unread?.inbox || 0 }
        } catch (e) {
          console.error('refresh sidebar unread failed', e)
        } finally {
          this.unreadPromise = null
        }
      })()
      return this.unreadPromise
    },
    // 弹窗保存时用：把草稿一次性写进 state（先 normalize），再由 save() 提交服务器
    applyConfig(config) {
      const { hidden, order, showIfUnread } = normalize(config)
      this.hidden = hidden
      this.order = order
      this.showIfUnread = showIfUnread
    },
    // 保存当前 hidden/order/showIfUnread 到服务器；失败时抛错，调用方负责提示与回滚
    async save() {
      const data = await setSidebarConfig({ hidden: this.hidden, order: this.order, showIfUnread: this.showIfUnread })
      const { hidden, order, showIfUnread } = normalize(data)
      this.hidden = hidden
      this.order = order
      this.showIfUnread = showIfUnread
      saveCached({ hidden, order, showIfUnread })
    },
    // 三段显隐：show 显示 / hide 隐藏 / unread 有未读时显示（仅星标与垃圾箱）
    setVisibility(key, mode) {
      if (!SIDEBAR_HIDEABLE.includes(key)) {
        return
      }
      if (mode === 'unread' && !SIDEBAR_UNREAD_KEYS.includes(key)) {
        return
      }
      this.hidden = mode === 'hide'
        ? [...new Set([...this.hidden, key])]
        : this.hidden.filter(k => k !== key)
      this.showIfUnread = mode === 'unread'
        ? [...new Set([...this.showIfUnread, key])]
        : this.showIfUnread.filter(k => k !== key)
    }
  }
})
