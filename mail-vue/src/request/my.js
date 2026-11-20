import http from '@/axios/index.js';

export function loginUserInfo() {
    return http.get('/my/loginUserInfo')
}

export function resetPassword(password) {
    return http.put('/my/resetPassword', {password})
}

export function userDelete() {
    return http.delete('/my/delete')
}

export function getSpamBlocklist() {
    return http.get('/my/spam-blocklist')
}

export function setSpamBlocklist(form) {
    return http.put('/my/spam-blocklist', form)
}

export function getSidebarConfig() {
    return http.get('/my/sidebar-config')
}

export function setSidebarConfig(config) {
    return http.put('/my/sidebar-config', config)
}

export function getSidebarUnread() {
    return http.get('/my/sidebar-unread')
}

