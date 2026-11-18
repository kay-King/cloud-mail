// Office 本地预览库的懒加载器
// 三个库 vendored 在 public/preview-libs/（见同目录 README.md），不走 pnpm 安装。
// 首次预览某类 Office 文件时才下载对应脚本，失败时可重试（不缓存失败结果）。
import * as Vue from 'vue'

const BASE = import.meta.env.BASE_URL || '/'
const DIR = `${BASE}preview-libs/`

const LIBS = {
  docx: {js: 'js-preview-docx-1.6.4.umd.js', css: 'js-preview-docx-1.6.4.css', global: 'jsPreviewDocx'},
  xlsx: {js: 'js-preview-excel-1.7.14.umd.js', css: 'js-preview-excel-1.7.14.css', global: 'jsPreviewExcel'},
  pptx: {js: 'vue-office-pptx-1.0.1.umd.js', css: null, global: 'vue-office-pptx'},
}

const loaded = {}
const cssLoaded = new Set()

function loadScript(url) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = url
    s.onload = resolve
    s.onerror = () => reject(new Error('script load failed: ' + url))
    document.head.appendChild(s)
  })
}

function loadCss(url) {
  if (cssLoaded.has(url)) return Promise.resolve()
  cssLoaded.add(url)
  return new Promise((resolve, reject) => {
    const l = document.createElement('link')
    l.rel = 'stylesheet'
    l.href = url
    l.onload = resolve
    l.onerror = () => {
      cssLoaded.delete(url)
      reject(new Error('css load failed: ' + url))
    }
    document.head.appendChild(l)
  })
}

// 载入指定 Office 预览库，返回全局对象：
// docx/xlsx 返回 js-preview 工厂（{init}），pptx 返回 Vue 组件对象。
export function loadOfficeLib(kind) {
  if (loaded[kind]) return loaded[kind]
  const lib = LIBS[kind]
  if (!lib) return Promise.reject(new Error('unknown office lib: ' + kind))
  if (kind === 'pptx') {
    // pptx UMD 的全局分支需要 window.Vue 与 window.VueDemi；
    // vue-demi 在 Vue 3 下就是 Vue 本身加两个标记，用应用自带的 Vue 拼一个。
    if (!window.Vue) window.Vue = Vue
    if (!window.VueDemi) window.VueDemi = {...Vue, isVue2: false, isVue3: true}
    // pptx UMD 内嵌的 ECharts 在求值时读 process.env.NODE_ENV；浏览器里没有
    // process，不垫一个会抛错、全局对象挂不上（实测报错：process is not defined）。
    if (typeof window.process === 'undefined') {
      window.process = {env: {NODE_ENV: 'production'}}
    } else if (!window.process.env) {
      window.process.env = {NODE_ENV: 'production'}
    }
  }
  const tasks = [loadScript(DIR + lib.js)]
  if (lib.css) tasks.push(loadCss(DIR + lib.css))
  const p = Promise.all(tasks).then(() => {
    const g = window[lib.global]
    if (!g) throw new Error('office lib global not found: ' + lib.global)
    return g
  }).catch(e => {
    delete loaded[kind]
    throw e
  })
  loaded[kind] = p
  return p
}

// 打开独立预览窗口（新标签页）：文件地址是公开的内容哈希 URL，无需登录。
// 注意用 /preview 而不是 /preview.html：Workers 静态资源会把 .html 请求 307 到去后缀路径。
export function openPreviewWindow(row, url) {
  const href = `${BASE}preview?src=${encodeURIComponent(url)}&name=${encodeURIComponent(row.filename || '')}`
  window.open(href, '_blank', 'noopener')
}
