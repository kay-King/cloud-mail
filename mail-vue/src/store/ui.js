import { defineStore } from 'pinia'

export const useUiStore = defineStore('ui', {
    state: () => ({
        asideShow: window.innerWidth > 1024,
        accountShow: false,
        backgroundLoading: true,
        changeNotice: 0,
        writerRef: null,
        changePreview: 0,
        previewData: {},
        key: 0,
        dark: false,
        // 界面主题（品牌风）：default 默认 / gmail / outlook / qq / apple，与深浅 dark 正交
        brand: 'default',
        asideCount: {
            email: 0,
            send: 0,
            sysEmail: 0
        },
        // 三栏阅读：桌面端（鼠标）默认开，点邮件正文直接在右边打开；触屏设备不启用
        readingPane: true,
        finePointer: window.matchMedia('(pointer: fine)').matches,
    }),
    getters: {
        isThreePane: (state) => state.readingPane && state.finePointer,
    },
    actions: {
        showNotice() {
            this.changeNotice ++
        },
        previewNotice(data) {
            this.previewData = data
            this.changePreview ++
        },
        // finePointer 会话内也要跟着变（二合一设备接/拔鼠标、平板接键盘），否则复选框/三栏/头像的显示逻辑须刷新才生效
        initPointerListener() {
            const mq = window.matchMedia('(pointer: fine)')
            const sync = () => { this.finePointer = mq.matches }
            if (typeof mq.addEventListener === 'function') {
                mq.addEventListener('change', sync)
            } else if (typeof mq.addListener === 'function') {
                mq.addListener(sync)
            }
        }
    },
    persist: {
        pick: ['accountShow','dark','brand','readingPane'],
    },
})
