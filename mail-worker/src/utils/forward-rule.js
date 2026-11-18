// 按账号转发规则：发件人关键词 + 主题关键词，两维都是包含匹配（不区分大小写）、
// 逗号分隔多个关键词取或；两维都填时须同时命中；两维都空 = 不设规则，全部转发。
function parseKeywords(value) {
	return (value || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
}

export function matchesForwardRule(account, { from, subject }) {
	const fromKeywords = parseKeywords(account?.forwardRuleFrom);
	const subjectKeywords = parseKeywords(account?.forwardRuleSubject);
	if (fromKeywords.length === 0 && subjectKeywords.length === 0) {
		return true;
	}
	const fromText = (from || '').toLowerCase();
	const subjectText = (subject || '').toLowerCase();
	if (fromKeywords.length > 0 && !fromKeywords.some(k => fromText.includes(k))) {
		return false;
	}
	if (subjectKeywords.length > 0 && !subjectKeywords.some(k => subjectText.includes(k))) {
		return false;
	}
	return true;
}

export default { matchesForwardRule };
