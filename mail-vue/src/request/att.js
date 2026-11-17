import http from "@/axios/index.js";

export function attList(params) {
    return http.get('/att/list', {params})
}

export function attAllList(params) {
    return http.get('/att/all', {params})
}

export function attStar(attIds, isStar) {
    return http.put('/att/star', {attIds, isStar})
}

export function attDelete(attIds, opts = {}) {
    let url = '/att/delete?attIds=' + attIds.join(',')
    if (opts.notify) {
        url += '&notify=1&reason=' + encodeURIComponent(opts.reason || '')
    }
    return http.delete(url)
}
