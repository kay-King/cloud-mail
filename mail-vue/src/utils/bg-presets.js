// 内置登录背景壁纸库：DOM 元素 + CSS 动画，不占存储、不联网
// 渲染见组件 components/bg-preset/index.vue（登录页全屏与设置弹窗缩略图共用）
// 存法：复用 background 设置，值为 preset:<id>；空 = 默认云朵
export const BG_PRESET_PREFIX = 'preset:'

export const BG_PRESETS = [
  { id: 'dawn', nameKey: 'bgPresetDawn' },
  { id: 'sunset', nameKey: 'bgPresetSunset' },
  { id: 'starry', nameKey: 'bgPresetStarry' },
  { id: 'ocean', nameKey: 'bgPresetOcean' },
  { id: 'sakura', nameKey: 'bgPresetSakura' },
  { id: 'aurora', nameKey: 'bgPresetAurora' },
  { id: 'meteors', nameKey: 'bgPresetMeteors' },
  { id: 'rays', nameKey: 'bgPresetRays' },
  { id: 'snow', nameKey: 'bgPresetSnow' },
  { id: 'mesh', nameKey: 'bgPresetMesh' },
  { id: 'waves', nameKey: 'bgPresetWaves' },
  { id: 'beach', nameKey: 'bgPresetBeach' },
  { id: 'butterfly', nameKey: 'bgPresetButterfly' },
  { id: 'balloons', nameKey: 'bgPresetBalloons' },
  { id: 'ribbons', nameKey: 'bgPresetRibbons' },
]

// 取出 background 设置里的壁纸 id；不是壁纸或 id 已不存在时返回 ''
export function getPresetId(background) {
  if (!background || !background.startsWith(BG_PRESET_PREFIX)) return ''
  const id = background.slice(BG_PRESET_PREFIX.length)
  return BG_PRESETS.some(p => p.id === id) ? id : ''
}
