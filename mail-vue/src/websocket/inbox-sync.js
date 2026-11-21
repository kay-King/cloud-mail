// 收件箱实时同步：WS 客户端的生命周期挂在主布局上（登录会话全程在线），
// 而不是收件箱视图上。原来 start/stop 在收件箱视图的 onMounted/onBeforeUnmount 里，
// 会话从非收件箱路由开始（直接打开 /spam、刷新停在设置页等）时收件箱视图从未挂载，
// WS 根本不连，所有实时广播（删/标已读/清空垃圾箱等）都收不到。
// 新邮件补拉（pullLatest）仍只针对收件箱列表：收件箱没挂载过时跳过，进来时本来就拉新的。
import { inboxWs, isAutoRefreshEnabled } from './client.js';
import { applyRemoteOp } from './remote-op.js';
import { useAccountStore } from '@/store/account.js';
import { useEmailStore } from '@/store/email.js';
import { useSettingStore } from '@/store/setting.js';
import { useSidebarStore } from '@/store/sidebar.js';
import { emailLatest } from '@/request/email.js';
import { sleep } from '@/utils/time-utils.js';

let pullTimer = null;
// 已补拉进列表的 id（去重用；与原收件箱视图里的 existIds 同一只集合，只是挪到了模块级）
const existIds = new Set();

export function startInboxWs() {
  const settingStore = useSettingStore();
  // 收件箱实时：推送或重连后再拉 emailLatest，不按间隔轮询
  inboxWs.start({
    isEnabled: () => isAutoRefreshEnabled(settingStore.settings.autoRefresh),
    onMessage: onWsMessage,
    onReconnect: () => schedulePullLatest(),
  });
}

export function stopInboxWs() {
  if (pullTimer) {
    window.clearTimeout(pullTimer);
    pullTimer = null;
  }
  inboxWs.stop();
}

export function syncInboxWs() {
  inboxWs.sync();
}

export function retryInboxWsNow() {
  inboxWs.retryNow();
}

// 推送到达：非「全部收取」时忽略其它账号的信。
function onWsMessage(event) {
  // 远端操作事件（另一台设备上删/标已读/星标等）：直接应用到各列表，不走补拉
  if (event?.type === 'mail_op') {
    applyRemoteOp(event);
    return;
  }
  // 新邮件到达可能改变星标/垃圾箱未读数（未读数是按用户汇总的，不分当前账号）
  const sidebarStore = useSidebarStore();
  sidebarStore.refreshUnread();
  const accountStore = useAccountStore();
  const allReceive = accountStore.currentAccount.allReceive;
  if (!allReceive && event?.accountId != null && Number(event.accountId) !== Number(accountStore.currentAccountId)) {
    return;
  }
  schedulePullLatest();
}

// 短时间多条推送合并成一次补拉。
function schedulePullLatest() {
  if (pullTimer) {
    window.clearTimeout(pullTimer);
  }
  pullTimer = window.setTimeout(() => {
    pullTimer = null;
    void pullLatest();
  }, 150);
}

// 按当前列表最新 id 拉取之后的新邮件并插入。
async function pullLatest() {
  const emailStore = useEmailStore();
  const accountStore = useAccountStore();
  const settingStore = useSettingStore();
  // 收件箱视图还没挂载过（会话从别的路由开始）：没列表可补，进来时本来就拉新的
  const scroll = emailStore.emailScroll;
  if (!scroll) {
    return;
  }
  const searchParams = emailStore.searchParams;
  if (searchParams.text || searchParams.startDate || searchParams.endDate) {
    return;
  }

  if (scroll.firstLoad) {
    return;
  }

  const latestId = scroll.latestEmail?.emailId;
  const accountId = accountStore.currentAccountId;
  const allReceive = scroll.latestEmail?.allReceive;

  if (accountId !== scroll.latestEmail?.reqAccountId) {
    return;
  }

  try {
    const list = await emailLatest(latestId, accountId, allReceive);

    if (accountId !== accountStore.currentAccountId || allReceive !== accountStore.currentAccount.allReceive) {
      return;
    }

    if (list.length > 0) {
      emailStore.applyFullList(list);

      for (let email of list) {

        email.reqAccountId = accountId;
        email.allReceive = allReceive;

        if (!existIds.has(email.emailId)) {

          existIds.add(email.emailId);
          scroll.addItem(email);

          await sleep(50);
        }

      }

    }
  } catch (e) {
    if (e.code === 401 || e.code === 403) {
      settingStore.settings.autoRefresh = 1;
      inboxWs.sync();
    }
    console.error(e);
  }
}
