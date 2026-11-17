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

export function attDelete(attIds) {
    return http.delete('/att/delete?attIds=' + attIds.join(','))
}
