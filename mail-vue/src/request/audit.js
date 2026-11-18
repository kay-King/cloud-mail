import http from "@/axios/index.js";

export function auditList(params) {
    return http.get('/audit/list', {params})
}

export function auditDelete(logIds) {
    return http.delete('/audit/delete?logIds=' + logIds.join(','))
}

export function auditClear() {
    return http.delete('/audit/clear')
}
