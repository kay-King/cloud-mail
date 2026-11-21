import http from '@/axios/index.js';
import { markLocalOp, unmarkLocalOp } from '@/websocket/remote-op.js';

export function emailList(accountId, allReceive, emailId, timeSort, size, type, full, searchParams = {}, del = 0, spam = 0) {
    const {type: searchType, text, startDate, endDate} = searchParams
    return http.get('/email/list', {params: {accountId, allReceive, emailId, timeSort, size, type, full, searchType, text, startDate, endDate, del, spam}})
}

export function emailDelete(emailIds) {
    markLocalOp('delete', emailIds)
    return http.delete('/email/delete?emailIds=' + emailIds).catch(e => {
        unmarkLocalOp('delete', emailIds)
        throw e
    })
}

export function emailRestore(emailIds) {
    markLocalOp('restore', emailIds)
    return http.put('/email/restore', {emailIds}).catch(e => {
        unmarkLocalOp('restore', emailIds)
        throw e
    })
}

export function emailMarkSpam(emailIds) {
    markLocalOp('spam', emailIds)
    return http.put('/email/spam', {emailIds}).catch(e => {
        unmarkLocalOp('spam', emailIds)
        throw e
    })
}

export function emailUnmarkSpam(emailIds) {
    markLocalOp('unspam', emailIds)
    return http.put('/email/unspam', {emailIds}).catch(e => {
        unmarkLocalOp('unspam', emailIds)
        throw e
    })
}

export function emailClearSpam(accountId, allReceive) {
    return http.delete('/email/clear-spam?accountId=' + accountId + '&allReceive=' + allReceive)
}

export function emailPhysicsDelete(emailIds) {
    markLocalOp('delete', emailIds)
    return http.delete('/email/physics-delete?emailIds=' + emailIds).catch(e => {
        unmarkLocalOp('delete', emailIds)
        throw e
    })
}

export function emailLatest(emailId, accountId, allReceive) {
    return http.get('/email/latest', {params: {emailId, accountId, allReceive}, noMsg: true, timeout: 35 * 1000})
}

export function emailInfo(emailId) {
    return http.get('/email/info', {params: {emailId}})
}

export function emailRead(emailIds) {
    markLocalOp('read', emailIds)
    return http.put('/email/read', {emailIds}).catch(e => {
        unmarkLocalOp('read', emailIds)
        throw e
    })
}

export function emailUnread(emailIds) {
    markLocalOp('unread', emailIds)
    return http.put('/email/unread', {emailIds}).catch(e => {
        unmarkLocalOp('unread', emailIds)
        throw e
    })
}

export function emailSend(form,progress) {
    return http.post('/email/send', form,{
        onUploadProgress: (e) => {
            progress(e)
        },
        noMsg: true,
        timeout: 120 * 1000
    })
}

export function emailExport(emailIds) {
    return http.get('/email/export?emailIds=' + emailIds, {responseType: 'blob', raw: true, noMsg: true, timeout: 120 * 1000})
}

export function emailImport(accountId, files) {
    const form = new FormData();
    form.append('accountId', accountId);
    files.forEach(f => form.append('files', f));
    return http.post('/email/import', form, {noMsg: true, timeout: 120 * 1000})
}

// 把导出接口的 blob 响应存成文件（文件名取 Content-Disposition）
export function downloadExport(res) {
    const disposition = res.headers['content-disposition'] || '';
    let filename = 'mail-export.zip';
    const m = disposition.match(/filename\*=UTF-8''([^;]+)/);
    const m2 = disposition.match(/filename="?([^";]+)"?/);
    if (m) {
        try { filename = decodeURIComponent(m[1]); } catch { /* keep default */ }
    } else if (m2) {
        filename = m2[1];
    }
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
}
