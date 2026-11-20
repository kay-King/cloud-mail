// 发件人头像：首字母 + 按发件身份哈希取色，同一发件人颜色固定
//（邮件列表与详情页发件人卡片共用）
export const AVATAR_COLORS = ['#7C4DFF', '#009688', '#FF7043', '#5C6BC0', '#26A69A', '#EC407A', '#AB47BC', '#42A5F5', '#66BB6A', '#FFA726', '#8D6E63', '#78909C'];

export function avatarLetter(name, addr) {
  const n = (name || '').trim();
  const a = (addr || '').trim();
  const first = n ? Array.from(n)[0] : (a ? a[0] : '?');
  const key = (n + '|' + a).toLowerCase();
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return {letter: first.toUpperCase(), color: AVATAR_COLORS[hash % AVATAR_COLORS.length]};
}
