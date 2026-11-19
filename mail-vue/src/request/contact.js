import http from "@/axios/index.js";

export function contactList(params) {
    return http.get('/contact/list', {params})
}

export function contactSuggest(keyword) {
    return http.get('/contact/suggest', {params: {keyword}})
}

export function contactAdd(form) {
    return http.post('/contact/add', form)
}

export function contactUpdate(form) {
    return http.put('/contact/update', form)
}

export function contactDelete(contactIds) {
    return http.delete('/contact/delete?contactIds=' + contactIds.join(','))
}
