import http from "@/axios/index.js";
import { markLocalOp, unmarkLocalOp } from "@/websocket/remote-op.js";

export function starAdd(emailId) {
    markLocalOp('star', [emailId])
    return http.post('/star/add', {emailId}).catch(e => {
        unmarkLocalOp('star', [emailId])
        throw e
    })
}

export function starCancel(emailId) {
    markLocalOp('unstar', [emailId])
    return http.delete('/star/cancel', {params: {emailId}}).catch(e => {
        unmarkLocalOp('unstar', [emailId])
        throw e
    })
}

export function starList(emailId,size,full) {
    return http.get('/star/list', {params: {emailId,size,full}})
}