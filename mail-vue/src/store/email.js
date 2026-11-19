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
            // 预览与完整列表并行拉取：以前是串行（等预览回来才发完整请求），慢网上等于两倍延迟；
            // 两者互不依赖，并行后列表照样先出，详情预取也更快到；完整请求失败只记日志，不影响列表显示
            request(1).then(fullData => {
                const list = Array.isArray(fullData) ? fullData : fullData?.list
                this.applyFullList(list)
            }).catch(e => {
                console.error(e)
            })
            return request(0)
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
    },
})
