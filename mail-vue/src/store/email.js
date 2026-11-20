import { defineStore } from 'pinia'
import { EmailUnreadEnum } from '@/enums/email-enum.js'
import { sanitizeEmailHtml } from '@/utils/email-html.js'

export const useEmailStore = defineStore('email', {
    state: () => ({
        deleteIds: 0,
        starScroll: null,
        emailScroll: null,
        cancelStarEmailId: 0,
        addStarEmailId: 0,
        contentData: {
            email: null,
            delType: null,
            showStar: true,
            showReply: true,
            showUnread: false,
            showSpam: false
        },
        sendScroll: null,
        detailMap: {},
        searchParams: {
            text: '',
            type: 'subject',
            startDate: '',
            endDate: '',
        },
    }),
    persist: {
        pick: ['contentData'],
    },
    actions: {
        setSearchParams(params) {
            this.searchParams = {
                ...this.searchParams,
                ...params,
            }
        },
        fetchList(request) {
            // 预览先出；全文预取等预览回来 + 浏览器空闲后再拉，不跟列表抢带宽
            //（慢网上并行拉全文会把列表本身拖慢；点开还没预取到的邮件时，
            // toContentEmail 会立即触发待处理的预取，不用等空闲）
            const brief = request(0)
            brief.then(() => {
                this.schedulePrefetch(request)
            }).catch(() => {
                // 预览失败时不预取
            })
            return brief
        },
        // 安排一次全文预取（每页各记一条，互不取消；点开邮件时可立即触发全部）
        schedulePrefetch(request) {
            if (!this._pendingPrefetches) {
                this._pendingPrefetches = []
            }
            const entry = { request, timer: null, idle: false }
            const run = () => this.runPrefetch(entry)
            if (typeof window.requestIdleCallback === 'function') {
                entry.idle = true
                entry.timer = window.requestIdleCallback(run, { timeout: 3000 })
            } else {
                entry.timer = setTimeout(run, 2000)
            }
            this._pendingPrefetches.push(entry)
        },
        runPrefetch(entry) {
            const list = this._pendingPrefetches
            if (list) {
                const i = list.indexOf(entry)
                if (i >= 0) list.splice(i, 1)
            }
            entry.request(1).then(fullData => {
                const fullList = Array.isArray(fullData) ? fullData : fullData?.list
                this.applyFullList(fullList)
            }).catch(e => {
                console.error(e)
            })
        },
        // 点开邮件时调用：把所有待处理的预取立刻发出去，不等空闲
        flushPrefetches() {
            const list = this._pendingPrefetches
            if (!list?.length) return
            const pending = list.splice(0, list.length)
            for (const entry of pending) {
                if (entry.timer != null) {
                    if (entry.idle && typeof window.cancelIdleCallback === 'function') {
                        window.cancelIdleCallback(entry.timer)
                    } else {
                        clearTimeout(entry.timer)
                    }
                    entry.timer = null
                }
                this.runPrefetch(entry)
            }
        },
        applyFullList(list) {
            if (!list?.length) return
            const currentId = this.contentData.email?.emailId
            for (const item of list) {
                if (!item?.emailId) continue
                if (item.content) item.content = sanitizeEmailHtml(item.content)
                if (!item.attList) item.attList = []
                // 完整列表可能早于「标已读」返回，避免把本地已读状态盖回未读
                const prev = this.detailMap[item.emailId]
                const keepRead = prev?.unread === EmailUnreadEnum.READ
                    || (currentId === item.emailId && this.contentData.email?.unread === EmailUnreadEnum.READ)
                if (keepRead) {
                    item.unread = EmailUnreadEnum.READ
                }
                this.detailMap[item.emailId] = item
                if (currentId && item.emailId === currentId) {
                    this.contentData.email = item
                }
            }
        },
        toContentEmail(email) {
            const id = email?.emailId
            if (id && this.detailMap[id]) {
                return this.detailMap[id]
            }
            // 详情还没预取到：立即触发待处理的预取，不等空闲；
            // 预取回来后 applyFullList 会把当前打开的详情填上
            this.flushPrefetches()
            return {
                ...email,
                emailId: id || 0,
                content: '',
                text: '',
                attList: [],
                recipient: email?.recipient || '[]',
            }
        },
        markListRead(emailId) {
            const scrolls = [this.emailScroll, this.starScroll, this.sendScroll]
            for (const scroll of scrolls) {
                const list = scroll?.emailList
                if (!list?.length) continue
                const item = list.find(e => e.emailId === emailId)
                if (item) item.unread = EmailUnreadEnum.READ
            }
        },
        // 详情页标为未读的镜像：把各列表里同一封的本地状态改回未读（跟 markListRead 一对）
        markListUnread(emailId) {
            const scrolls = [this.emailScroll, this.starScroll, this.sendScroll]
            for (const scroll of scrolls) {
                const list = scroll?.emailList
                if (!list?.length) continue
                const item = list.find(e => e.emailId === emailId)
                if (item) item.unread = EmailUnreadEnum.UNREAD
            }
        },
    },
})
