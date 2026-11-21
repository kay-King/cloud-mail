import { defineStore } from 'pinia'
import { nextTick } from 'vue'
import { EmailUnreadEnum } from '@/enums/email-enum.js'
import { sanitizeEmailHtml } from '@/utils/email-html.js'

// deleteIds 暂存集合：deleteIds 是全站「归属变更」信号，同一 tick 内多次直接赋值会
// 合并成一次 watch 回调，后赋的值盖掉先赋的（F5）。push 时先并入集合再整体赋值，
// 下一个 tick 清掉集合（watch 在 flush 里跑，nextTick 在 flush 之后，清集合不影响已赋值的数组）
const pendingDeleteIds = new Set();

export const useEmailStore = defineStore('email', {
    state: () => ({
        deleteIds: 0,
        starScroll: null,
        spamScroll: null,
        emailScroll: null,
        cancelStarEmailId: 0,
        addStarEmailId: 0,
        lastListRoute: null,
        contentData: {
            email: null,
            delType: null,
            showStar: true,
            showReply: true,
            showUnread: false,
            showSpam: false
        },
        sendScroll: null,
        allEmailScroll: null,
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
        // 发归属变更信号：同一 tick 内的多次 push 合并成一个数组发出去，不互相覆盖
        pushDeleteIds(ids) {
            const list = Array.isArray(ids) ? ids : [ids];
            list.forEach(id => pendingDeleteIds.add(id));
            this.deleteIds = [...pendingDeleteIds];
            nextTick(() => pendingDeleteIds.clear());
        },
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
            const scrolls = [this.emailScroll, this.starScroll, this.sendScroll, this.allEmailScroll, this.spamScroll]
            for (const scroll of scrolls) {
                const list = scroll?.emailList
                if (!list?.length) continue
                const item = list.find(e => e.emailId === emailId)
                if (item) item.unread = EmailUnreadEnum.READ
            }
        },
        // 详情页标为未读的镜像：把各列表里同一封的本地状态改回未读（跟 markListRead 一对）
        markListUnread(emailId) {
            const scrolls = [this.emailScroll, this.starScroll, this.sendScroll, this.allEmailScroll, this.spamScroll]
            for (const scroll of scrolls) {
                const list = scroll?.emailList
                if (!list?.length) continue
                const item = list.find(e => e.emailId === emailId)
                if (item) item.unread = EmailUnreadEnum.UNREAD
            }
        },
        // 远端星标同步：把各列表里同一封的星标状态改掉（跟 markListRead 一对）；
        // 星标视图的成员变化（多一行/少一行）由调用方 refreshList 重拉
        markListStar(emailId, starred) {
            const scrolls = [this.emailScroll, this.starScroll, this.sendScroll, this.allEmailScroll, this.spamScroll]
            for (const scroll of scrolls) {
                const list = scroll?.emailList
                if (!list?.length) continue
                const item = list.find(e => e.emailId === emailId)
                if (item) item.isStar = starred ? 1 : 0
            }
        },
    },
})
