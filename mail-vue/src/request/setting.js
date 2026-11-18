import http from '@/axios/index.js';

export function settingSet(setting) {
    return http.put('/setting/set', setting)
}

export function settingQuery() {
    return http.get('/setting/query')
}

export function websiteConfig() {
    return http.get('/setting/websiteConfig')
}

export function setBackground(background) {
    return http.put('/setting/setBackground',{background})
}

export function deleteBackground() {
    return http.delete('/setting/deleteBackground')
}

export function setBlackList(params) {
    return http.put('/setting/setBlacklist', params)
}

export function attKeyStatus() {
    return http.get('/att/status')
}

export function attRotateKey() {
    return http.post('/att/rotate')
}

export function backupStatus() {
    return http.get('/backup/status', {noMsg: true})
}

export function backupExport() {
    return http.post('/backup/export', {}, {responseType: 'blob', raw: true, timeout: 120 * 1000})
}

export function backupRestore(formData) {
    return http.post('/backup/restore', formData, {timeout: 120000})
}