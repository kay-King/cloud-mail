import { defineStore } from 'pinia'

export const useAuditStore = defineStore('audit', {
    state: () => ({
        searchParams: {
            userEmail: '',
            action: '',
            startDate: '',
            endDate: '',
        },
    }),
    actions: {
        setSearchParams(params) {
            this.searchParams = {
                ...this.searchParams,
                ...params,
            }
        },
    },
})
