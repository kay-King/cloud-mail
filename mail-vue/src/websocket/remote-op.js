// 远端操作事件：另一台设备（或另一个标签页）上的删/恢复/标垃圾/标已读/
// 星标/发信，服务端经 WebSocket 广播过来后，在本设备上应用。
// 复用本地同一套 store 信号，各列表现成的监听器会自己拼行/重拉/改状态；
// 重复收到同一事件（个人 hub 与全部邮件 hub 各推一次）也是幂等的，最多多一次静默重拉。
// 服务端广播没有发送方标识，自己做的操作也会广播回自己：请求层发起操作时记一笔
// （markLocalOp，15 秒有效），收到广播时跳过自己刚做过的那几封——本地已经应用过了，
// 再应用会出毛病（撤销后刚长回来的行被自己晚到的 delete 广播拼掉，又被 restore
// 广播的重拉拉回来，看起来就是出现又消失又出现，用户 2026-11-21 反馈）。
import { useEmailStore } from "@/store/email.js";
import { useSidebarStore } from "@/store/sidebar.js";

const recentLocalOps = new Map()
const LOCAL_OP_WINDOW_MS = 15000
function toIdList(value) {
  if (value == null || value === '') return []
  const arr = Array.isArray(value) ? value : String(value).split(',')
  return arr.map(v => Number(v)).filter(Number.isFinite)
}
export function markLocalOp(op, emailIds) {
  const now = Date.now()
  for (const id of toIdList(emailIds)) recentLocalOps.set(op + ':' + id, now)
  for (const [key, at] of recentLocalOps) {
    if (now - at > LOCAL_OP_WINDOW_MS) recentLocalOps.delete(key)
  }
}
// 本地请求失败时清除标记：否则 15 秒内另一台设备对同一封邮件的同一操作广播回来，
// 会被当作自己的回声跳过，本视图状态不更新
export function unmarkLocalOp(op, emailIds) {
  for (const id of toIdList(emailIds)) recentLocalOps.delete(op + ':' + id)
}
function isLocalOp(op, emailId) {
  const at = recentLocalOps.get(op + ':' + emailId)
  return at != null && Date.now() - at < LOCAL_OP_WINDOW_MS
}

export function applyRemoteOp(payload, { pullLatest } = {}) {
  const emailStore = useEmailStore();
  const sidebarStore = useSidebarStore();
  const { op, emailIds } = payload || {};
  const rawIds = toIdList(emailIds);
  // 自己刚做过的操作广播回来了：只跳过那几封，别的照常应用
  const ids = rawIds.filter(id => !isLocalOp(op, id));

  if (op === 'send') {
    // 发件份是新行：已发送视图整表重拉；全部邮件视图增量补拉（调用方传 pullLatest）
    emailStore.sendScroll?.refreshList?.();
    pullLatest?.();
    return;
  }

  // 全是自己刚做过的：本地已经应用过，跳过（clear-spam 本来就没 id，不走这条）
  if (rawIds.length && !ids.length) return;

  if (op === 'delete' || op === 'restore' || op === 'spam' || op === 'unspam') {
    // 归属变化走现成的 deleteIds 信号：收件箱/星标等拼掉行，全部邮件静默重拉，
    // 移进来的邮件（恢复/取消标垃圾）靠标脏后切回来重拉
    if (ids.length) {
      emailStore.deleteIds = [...ids];
    }
    if (op === 'restore' || op === 'unspam') {
      // 恢复/取消标垃圾的邮件回到了收件箱：deleteIds 只会拼掉各列表里已有的行，
      // 收件箱里本来没有这封，光靠标脏要等切走再回来才重拉；正在看收件箱或
      // 全部邮件的话直接静默重拉，恢复立刻看得见（没挂载时跳过，进来时本来就拉新的）
      emailStore.emailScroll?.silentRefresh?.();
      emailStore.allEmailScroll?.silentRefresh?.();
    }
  } else if (op === 'clear-spam') {
    // 清空垃圾箱：广播没带 id，只能整表重拉（垃圾箱视图的 scroll 已注册在 store 里）
    emailStore.spamScroll?.refreshList?.();
  } else if (op === 'read') {
    ids.forEach(id => emailStore.markListRead(id));
  } else if (op === 'unread') {
    ids.forEach(id => emailStore.markListUnread(id));
  } else if (op === 'star' || op === 'unstar') {
    ids.forEach(id => emailStore.markListStar(id, op === 'star'));
    // 星标视图的成员变了（多一行/少一行），整表重拉
    emailStore.starScroll?.refreshList?.();
  }

  // 删/恢复/标垃圾/已读状态/清空垃圾箱都会动未读数；星标/发信不动
  if (op !== 'star' && op !== 'unstar' && op !== 'send') {
    sidebarStore.refreshUnread();
  }
}
