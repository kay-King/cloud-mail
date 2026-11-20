// 附件预览的文件类型常量：应用内预览（att-previewer）与详情页（图片眼睛图标）共用。
// preview.html（新窗口独立预览页）有自己的同名副本，改这里的扩展名名单时要同步改那边。
// 注意按文件名判类型：附件 key 是纯内容哈希、没有扩展名，按 key 判永远是假。
export const IMAGE_PREVIEW_EXTS = ['jpg', 'jpeg', 'jfif', 'png', 'gif', 'webp', 'bmp', 'svg', 'ico', 'avif']
export const TEXT_PREVIEW_EXTS = ['txt', 'md', 'log', 'ini', 'conf', 'json', 'xml', 'csv', 'yaml', 'yml']
export const AUDIO_PREVIEW_EXTS = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'oga', 'm4a', 'opus']
export const VIDEO_PREVIEW_EXTS = ['mp4', 'webm', 'm4v', 'ogv']
export const TEXT_PREVIEW_MAX = 512 * 1024

export function isImageFilename(filename) {
  if (!filename) return false
  const dot = filename.lastIndexOf('.')
  const ext = dot === -1 ? '' : filename.slice(dot + 1).toLowerCase()
  return IMAGE_PREVIEW_EXTS.includes(ext)
}
