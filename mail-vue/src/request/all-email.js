import http from '@/axios/index.js';
import { markLocalOp, unmarkLocalOp } from '@/websocket/remote-op.js';

export function allEmailList(params) {
    return http.get('/allEmail/list', {params: {...params}})
}

export function allEmailDelete(emailIds, opts = {}) {
    markLocalOp('delete', emailIds)
    let url = '/allEmail/delete?emailIds=' + emailIds
    if (opts.notify) {
        url += '&notify=1&reason=' + encodeURIComponent(opts.reason || '')
    }
    if (opts.pair) {
        url += '&pair=1'
    }
    return http.delete(url).catch(e => {
        unmarkLocalOp('delete', emailIds)
        throw e
    })
}

export function allEmailBatchDelete(params) {
    return http.delete('/allEmail/batchDelete', {params: params} )
}

export function allEmailLatest(emailId) {
    return http.get('/allEmail/latest', {params: {emailId}, noMsg: true, timeout: 35 * 1000})
}
