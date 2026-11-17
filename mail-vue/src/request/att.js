import http from "@/axios/index.js";

export function attList(params) {
    return http.get('/att/list', {params})
}

export function attStar(attIds, isStar) {
    return http.put('/att/star', {attIds, isStar})
}
