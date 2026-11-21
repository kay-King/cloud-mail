// 滚动条自动隐藏：滚动时给滚动元素加 .is-scrolling，停下 1 秒后摘掉；
// style.css 里滚动条滑块默认透明，只有 .is-scrolling 时才显示。
// el-scrollbar 的滑块在 .el-scrollbar 根节点下、滚动发生在里面的 wrap 上，
// 所以同时给最近的 .el-scrollbar 祖先加 class，CSS 才能选中滑块。
const HIDE_DELAY = 1000

export function initScrollbarAutoHide() {
  const timers = new WeakMap()
  document.addEventListener('scroll', (e) => {
    const el = e.target === document ? document.documentElement : e.target
    if (!(el instanceof HTMLElement)) return
    const hosts = [el]
    const scrollbarHost = el.closest('.el-scrollbar')
    if (scrollbarHost && scrollbarHost !== el) hosts.push(scrollbarHost)
    for (const host of hosts) {
      host.classList.add('is-scrolling')
      clearTimeout(timers.get(host))
      timers.set(host, setTimeout(() => host.classList.remove('is-scrolling'), HIDE_DELAY))
    }
  }, true)
}
