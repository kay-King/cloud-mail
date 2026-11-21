<template>
  <div class="theme-selector">
    <div class="theme-group-label">{{ t('themeBrand') }}</div>
    <div class="theme-options brand-options" role="radiogroup" :aria-label="t('themeBrand')">
      <label
        v-for="option in brandOptions"
        :key="option.brand"
        class="theme-card"
        :class="{ 'is-selected': uiStore.brand === option.brand }"
      >
        <span class="theme-preview brand-preview" :style="uiStore.dark ? option.previewStyleDark : option.previewStyle" aria-hidden="true">
          <span class="preview-sidebar"><i/><i/><i/></span>
          <span class="preview-main"><i/><i/><i/></span>
        </span>
        <span class="theme-caption">
          <span>{{ t(option.label) }}</span>
          <input
            type="radio"
            :name="brandGroupName"
            :value="option.brand"
            :checked="uiStore.brand === option.brand"
            @change="selectBrand(option.brand, $event)"
          >
        </span>
      </label>
    </div>
    <div class="theme-group-label">{{ t('themeShade') }}</div>
    <div class="theme-options" role="radiogroup" :aria-label="t('themeShade')">
      <label
        v-for="option in themeOptions"
        :key="option.label"
        class="theme-card"
        :class="{ 'is-selected': uiStore.dark === option.dark }"
      >
        <span class="theme-preview" :class="{ 'preview-dark': option.dark }" aria-hidden="true">
          <span class="preview-sidebar"><i/><i/><i/></span>
          <span class="preview-main"><i/><i/><i/></span>
        </span>
        <span class="theme-caption">
          <span>{{ t(option.label) }}</span>
          <input
            type="radio"
            :name="groupName"
            :value="option.dark"
            :checked="uiStore.dark === option.dark"
            @change="selectTheme(option.dark, $event)"
          >
        </span>
      </label>
    </div>
  </div>
</template>

<script setup>
import {useId} from 'vue'
import {useI18n} from 'vue-i18n'
import {useUiStore} from '@/store/ui.js'

const {t} = useI18n()
const uiStore = useUiStore()
const groupName = useId()
const brandGroupName = useId()
const themeOptions = [
  {label: 'lightTheme', dark: false},
  {label: 'darkTheme', dark: true},
]
// 品牌风主题：小预览用各品牌自己的配色（侧栏底 + 主色），与当前主题无关；
// 深色下切深色版预览（侧栏/主区用品牌深色值），避免白底小图在深色页里扎眼
const brandOptions = [
  {label: 'themeDefault', brand: 'default',
   previewStyle: {'--pv-sidebar': '#191a23', '--pv-accent': '#1890ff', '--pv-main': '#ffffff', '--pv-line': '#e2e4e8', '--pv-line-dark': 'rgba(255,255,255,0.25)'},
   previewStyleDark: {'--pv-sidebar': '#141414', '--pv-accent': '#1890ff', '--pv-main': '#1c1c1e', '--pv-line': '#505359', '--pv-line-dark': 'rgba(255,255,255,0.25)'}},
  {label: 'themeGmail', brand: 'gmail',
   previewStyle: {'--pv-sidebar': '#f6f8fc', '--pv-accent': '#1a73e8', '--pv-main': '#ffffff', '--pv-line': '#e2e4e8', '--pv-line-dark': '#e2e4e8'},
   previewStyleDark: {'--pv-sidebar': '#202124', '--pv-accent': '#8ab4f8', '--pv-main': '#1a1b1e', '--pv-line': '#3c4043', '--pv-line-dark': '#3c4043'}},
  {label: 'themeOutlook', brand: 'outlook',
   previewStyle: {'--pv-sidebar': '#f3f2f1', '--pv-accent': '#0f6cbd', '--pv-main': '#ffffff', '--pv-line': '#e2e4e8', '--pv-line-dark': '#e2e4e8'},
   previewStyleDark: {'--pv-sidebar': '#1f1f1f', '--pv-accent': '#479ef5', '--pv-main': '#1a1a1a', '--pv-line': '#3b3b3b', '--pv-line-dark': '#3b3b3b'}},
  {label: 'themeQq', brand: 'qq',
   previewStyle: {'--pv-sidebar': '#eef4fb', '--pv-accent': '#2f9be8', '--pv-main': '#ffffff', '--pv-line': '#e2e4e8', '--pv-line-dark': '#e2e4e8'},
   previewStyleDark: {'--pv-sidebar': '#1a1a1a', '--pv-accent': '#53a8ff', '--pv-main': '#161616', '--pv-line': '#333333', '--pv-line-dark': '#333333'}},
  {label: 'themeApple', brand: 'apple',
   previewStyle: {'--pv-sidebar': '#ececf1', '--pv-accent': '#007aff', '--pv-main': '#ffffff', '--pv-line': '#e2e4e8', '--pv-line-dark': '#e2e4e8'},
   previewStyleDark: {'--pv-sidebar': '#1c1c1e', '--pv-accent': '#0a84ff', '--pv-main': '#17171a', '--pv-line': '#38383a', '--pv-line-dark': '#38383a'}},
  {label: 'theme163', brand: '163',
   previewStyle: {'--pv-sidebar': '#f7f7f7', '--pv-accent': '#d71918', '--pv-main': '#ffffff', '--pv-line': '#e2e4e8', '--pv-line-dark': '#e2e4e8'},
   previewStyleDark: {'--pv-sidebar': '#1a1a1a', '--pv-accent': '#f07070', '--pv-main': '#161616', '--pv-line': '#333333', '--pv-line-dark': '#333333'}},
  {label: 'themeYahoo', brand: 'yahoo',
   previewStyle: {'--pv-sidebar': '#f5f2fa', '--pv-accent': '#6001d2', '--pv-main': '#ffffff', '--pv-line': '#e2e4e8', '--pv-line-dark': '#e2e4e8'},
   previewStyleDark: {'--pv-sidebar': '#17121f', '--pv-accent': '#b07ff0', '--pv-main': '#14101a', '--pv-line': '#38383a', '--pv-line-dark': '#38383a'}},
]

function selectTheme(dark, event) {
  const bounds = event.currentTarget.closest('.theme-card')?.getBoundingClientRect()
  changeDark(dark, {
    x: bounds ? bounds.left + bounds.width / 2 : window.innerWidth / 2,
    y: bounds ? bounds.top + bounds.height / 2 : window.innerHeight / 2,
  })
}

function selectBrand(brand, event) {
  if (brand === uiStore.brand) return
  const bounds = event.currentTarget.closest('.theme-card')?.getBoundingClientRect()
  const origin = {
    x: bounds ? bounds.left + bounds.width / 2 : window.innerWidth / 2,
    y: bounds ? bounds.top + bounds.height / 2 : window.innerHeight / 2,
  }
  animateThemeChange(() => {
    document.documentElement.setAttribute('data-brand', brand)
    uiStore.brand = brand
  }, origin, 'brand')
}

// 通用主题切换动画：从点击点径向扩散（深浅与品牌共用；data-theme-to 的方向样式在 style.css）
function animateThemeChange(applyTheme, origin, direction) {
  const root = document.documentElement
  if (!document.startViewTransition) {
    applyTheme()
    return
  }
  const endRadius = Math.hypot(
    Math.max(origin.x, window.innerWidth - origin.x),
    Math.max(origin.y, window.innerHeight - origin.y)
  )
  root.setAttribute('data-theme-to', direction)
  root.style.setProperty('--vt-x', `${origin.x}px`)
  root.style.setProperty('--vt-y', `${origin.y}px`)
  root.style.setProperty('--vt-end-radius', `${endRadius + 10}px`)
  const transition = document.startViewTransition(applyTheme)
  transition.finished.finally(() => root.removeAttribute('data-theme-to'))
}

function changeDark(nextIsDark, origin) {
  if (nextIsDark === uiStore.dark) return

  const root = document.documentElement
  const applyTheme = () => {
    root.classList.toggle('dark', nextIsDark)
    const isMobile = !window.matchMedia("(pointer: fine) and (hover: hover)").matches
    document.getElementById('theme-color-meta')?.setAttribute(
      'content',
      nextIsDark ? (isMobile ? '#141414' : '#000000') : (isMobile ? '#191A23' : '#F1F1F1')
    )
    uiStore.dark = nextIsDark
  }

  animateThemeChange(applyTheme, origin, nextIsDark ? 'dark' : 'light')
}
</script>

<style scoped lang="scss">
.theme-selector {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.theme-group-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.theme-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 180px));
  gap: 16px;
  width: 100%;
  max-width: 376px;
}

.brand-options {
  grid-template-columns: repeat(5, minmax(0, 1fr));
  max-width: 640px;

  @media (max-width: 767px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
}

.theme-card {
  min-width: 0;
  padding: 8px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  cursor: pointer;

  &:hover,
  &.is-selected {
    border-color: var(--el-color-primary);
  }

  &.is-selected {
    box-shadow: 0 0 0 1px var(--el-color-primary);
  }

  &:has(input:focus-visible) {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 3px;
  }
}

.theme-preview {
  display: flex;
  aspect-ratio: 1.6;
  overflow: hidden;
  border: 1px solid #dfe1e5;
  border-radius: 4px;
  background: #ffffff;

  i {
    display: block;
    height: 6px;
    border-radius: 2px;
    background: #e2e4e8;
  }

  .preview-sidebar {
    display: grid;
    align-content: start;
    gap: 8px;
    width: 28%;
    padding: 12px 6px;
    background: #f0f1f3;

    i:first-child {
      background: #91caff;
    }
  }

  .preview-main {
    display: grid;
    flex: 1;
    align-content: start;
    gap: 12px;
    padding: 12px;

    i:first-child {
      width: 55%;
    }
  }

  &.preview-dark {
    background: #202124;
    border-color: #45474b;

    i {
      background: #505359;
    }

    .preview-sidebar {
      background: #303236;

      i:first-child {
        background: #409eff;
      }
    }
  }

  &.brand-preview {
    background: var(--pv-main);
    border-color: #dfe1e5;

    i {
      background: var(--pv-line);
    }

    .preview-sidebar {
      background: var(--pv-sidebar);

      i {
        background: var(--pv-line-dark);
      }

      i:first-child {
        background: var(--pv-accent);
      }
    }
  }
}

/* 深色下品牌小预览的边框跟随变暗（.dark 在 html 上，scoped 下仍能匹配祖先） */
.dark .theme-preview.brand-preview {
  border-color: #45474b;
}

.theme-caption {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 32px;
  padding-top: 4px;
  font-size: 14px;
  color: var(--el-text-color-primary);

  input {
    flex-shrink: 0;
    margin: 0;
    accent-color: var(--el-color-primary);
    cursor: pointer;
  }
}
</style>
