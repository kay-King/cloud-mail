// 按账号转发与全局转发并存：两边各算各的目标，合在一起去重后各发一份；
// 同一封邮件发到同一个目标只发一次（邮箱不区分大小写，先出现的保留，
// 所以两边目标相同时保留账号那条，失败提醒发给邮箱拥有者）。
export function mergeForwardTargets(accountTargets, globalTargets) {
	const seen = new Set();
	const merged = [];
	for (const target of [...(accountTargets || []), ...(globalTargets || [])]) {
		const key = (target?.email || '').toLowerCase();
		if (!key || seen.has(key)) continue;
		seen.add(key);
		merged.push(target);
	}
	return merged;
}

export default { mergeForwardTargets };
