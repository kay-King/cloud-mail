import http from "@/axios/index.js";
import { markLocalOp } from "@/websocket/remote-op.js";

export function starAdd(emailId) {
    markLocalOp('star', [emailId])
    return http.post('/star/add', {emailId})
}

export function starCancel(emailId) {
    markLocalOp('unstar', [emailId])
    return http.delete('/star/cancel', {params: {emailId}})
}

export function starList(emailId,size,full) {
    return http.get('/star/list', {params: {emailId,size,full}})
}