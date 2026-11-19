import { defineStore } from 'pinia'
import { getSidebarConfig, setSidebarConfig } from '@/request/my.js'

// 侧边栏自定义（个人区 9 个条目）：收件箱与设置必须显示，其余 7 个可隐藏，9 个都能调顺序
// 配置存在服务器 user.sidebar_config：{ hidden: [...], order: [...] }，换设备同步
export const SIDEBAR_DEFAULT_ORDER = ['email', 'send', 'draft', 'star', 'spam', 'trash', 'attachments', 'contacts', 'setting']
export const SIDEBAR_HIDEABLE = ['send', 'draft', 'star', 'spam', 'trash', 'attachments', 'contacts']

function normalize(config) {
  const parsed = config || {}
  // hidden 只认可可隐藏的 7 个，收件箱/设置写进来也强制踢掉
  const hidden = Array.isArray(parsed.hidden)
    ? [...new Set(parsed.hidden)].filter(key => SIDEBAR_HIDEABLE.includes(key))
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
  return { hidden, order }
}

export const useSidebarStore = defineStore('sidebar', {
  state: () => ({
    hidden: [],
    order: [...SIDEBAR_DEFAULT_ORDER],
    loaded: false,
    loading: false
  }),
  getters: {
    // 侧边栏实际显示的条目（按顺序、去掉隐藏的）
    visibleKeys: (state) => state.order.filter(key => !state.hidden.includes(key))
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
          const data = await getSidebarConfig()
          const { hidden, order } = normalize(data)
          this.hidden = hidden
          this.order = order
          this.loaded = true
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
    // 保存当前 hidden/order 到服务器；失败时抛错，调用方负责提示与回滚
    async save() {
      const data = await setSidebarConfig({ hidden: this.hidden, order: this.order })
      const { hidden, order } = normalize(data)
      this.hidden = hidden
      this.order = order
    },
    setHidden(key, hide) {
      if (!SIDEBAR_HIDEABLE.includes(key)) {
        return
      }
      this.hidden = hide
        ? [...new Set([...this.hidden, key])]
        : this.hidden.filter(k => k !== key)
    }
  }
})
