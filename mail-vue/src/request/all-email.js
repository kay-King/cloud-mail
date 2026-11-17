import http from '@/axios/index.js';

export function allEmailList(params) {
    return http.get('/allEmail/list', {params: {...params}})
}

export function allEmailDelete(emailIds, opts = {}) {
    let url = '/allEmail/delete?emailIds=' + emailIds
    if (opts.notify) {
        url += '&notify=1&reason=' + encodeURIComponent(opts.reason || '')
    }
    return http.delete(url)
}

export function allEmailBatchDelete(params) {
    return http.delete('/allEmail/batchDelete', {params: params} )
}

export function allEmailLatest(emailId) {
    return http.get('/allEmail/latest', {params: {emailId}, noMsg: true, timeout: 35 * 1000})
}
