// 远端操作事件：另一台设备（或另一个标签页）上的删/恢复/标垃圾/标已读/
// 星标/发信，服务端经 WebSocket 广播过来后，在本设备上应用。
// 复用本地同一套 store 信号，各列表现成的监听器会自己拼行/重拉/改状态；
// 重复收到同一事件（个人 hub 与全部邮件 hub 各推一次）也是幂等的，最多多一次静默重拉。
import { useEmailStore } from "@/store/email.js";
import { useSidebarStore } from "@/store/sidebar.js";

export function applyRemoteOp(payload, { pullLatest } = {}) {
  const emailStore = useEmailStore();
  const sidebarStore = useSidebarStore();
  const { op, emailIds } = payload || {};
  const ids = (emailIds || []).map(Number).filter(Number.isFinite);

  if (op === 'send') {
    // 发件份是新行：已发送视图整表重拉；全部邮件视图增量补拉（调用方传 pullLatest）
    emailStore.sendScroll?.refreshList?.();
    pullLatest?.();
    return;
  }

  if (op === 'delete' || op === 'restore' || op === 'spam' || op === 'unspam') {
    // 归属变化走现成的 deleteIds 信号：收件箱/星标等拼掉行，全部邮件静默重拉，
    // 移进来的邮件（恢复/取消标垃圾）靠标脏后切回来重拉
    if (ids.length) {
      emailStore.deleteIds = [...ids];
    }
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
