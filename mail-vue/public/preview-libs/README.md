# Office 本地预览库（vendored）

附件页的 Office 文档在浏览器本地解析预览，不经过任何第三方服务器。
沙箱里 pnpm 装不了新包，所以这三个库直接从 npm 下载 UMD 构建放进这里，
文件名带版本号，升级时换文件名即可（浏览器缓存按 URL 区分）。

| 文件 | 来源 | 版本 | 说明 |
|---|---|---|---|
| js-preview-docx-1.6.4.umd.js / .css | npm @js-preview/docx | 1.6.4 | docx 预览，底层 docx-preview |
| js-preview-excel-1.7.14.umd.js / .css | npm @js-preview/excel | 1.7.14 | xls/xlsx 预览，底层 exceljs + xlsx |
| vue-office-pptx-1.0.1.umd.js | npm @vue-office/pptx（v3 构建） | 1.0.1 | pptx 预览，Vue 3 组件 |
| vue.global.prod-3.5.20.js | node_modules/vue/dist/vue.global.prod.js | 3.5.20 | Vue 全局构建，供 preview.html 的 pptx 预览用（独立页面没有 Vue 运行时）；升级 Vue 时同步重拷 |

用法：
- 应用内：`src/utils/office-preview.js` 按需加载（首次预览某类文件时才下载对应脚本）。
- 新窗口：`public/preview.html` 直接引用这些文件（含 Vue 全局构建，不再走 CDN）。

注意：docx 的 UMD 在浏览器全局分支下运行，`stream`/`buffer` 等 Node 内置模块
的引用在浏览器里是 undefined，库内部不依赖它们（项目官方 demo-cdn 同样这样用）。
