// 品牌头像：按发件域名取品牌 logo（Simple Icons 图标库，约 3000 个品牌），
// Worker 代拉并在边缘缓存，浏览器不直连第三方、不泄露发件方域名。
// 未收录的品牌、免费邮箱域名一律 404，前端回落首字母头像。

// 免费邮箱域名：发件人用的服务商、不是发件方本身，不出品牌 logo
//（前端 avatarFor 里有一份同样的表，两边改要同步）
const FREEMAIL_DOMAINS = new Set([
	'gmail.com', 'googlemail.com',
	'outlook.com', 'hotmail.com', 'live.com', 'live.cn', 'msn.com',
	'icloud.com', 'me.com', 'mac.com',
	'yahoo.com', 'yahoo.cn', 'ymail.com',
	'qq.com', 'foxmail.com',
	'163.com', '126.com', 'yeah.net',
	'sina.com', 'sina.cn', 'sohu.com', 'tom.com',
	'139.com', '189.cn', 'aliyun.com',
	'protonmail.com', 'proton.me', 'pm.me',
	'tutanota.com', 'tuta.io',
	'zoho.com', 'yandex.com', 'yandex.ru',
	'mail.com', 'gmx.com', 'gmx.net', 'aol.com',
]);

// 常见的双段公共后缀（注册域名取最后三段，否则取最后两段）
const TWO_PART_SUFFIXES = new Set([
	'co.uk', 'org.uk', 'ac.uk', 'gov.uk',
	'com.cn', 'net.cn', 'org.cn', 'gov.cn',
	'com.au', 'net.au', 'org.au',
	'co.jp', 'or.jp', 'ne.jp',
	'com.br', 'com.tw', 'com.hk', 'com.sg', 'com.my', 'co.kr', 'co.nz', 'com.ru',
]);

const ICON_CDN = 'https://cdn.simpleicons.org/';
const HIT_TTL = 604800; // 命中缓存 7 天
const MISS_TTL = 86400; // 未收录缓存 1 天
const MAX_SVG_BYTES = 65536;

const brandIconService = {

	// 入口：/api/brand-icon?domain=xxx.com
	async fetchIcon(params) {
		const raw = (params.get('domain') || '').trim().toLowerCase();
		const domain = this.validDomain(raw);
		if (!domain) {
			return new Response('Bad domain', { status: 400 });
		}
		if (this.isFreemail(domain)) {
			return new Response('Not a brand domain', { status: 404 });
		}
		const slug = this.slugFor(domain);
		if (!slug) {
			return new Response('Not a brand domain', { status: 404 });
		}

		const cacheKey = new Request(`https://brand-icon.local/${slug}`);
		try {
			const cached = await caches.default.match(cacheKey);
			if (cached) {
				return cached;
			}
		} catch (e) {
			// 缓存不可用时继续走拉取，不阻塞
		}

		let res;
		try {
			res = await fetch(ICON_CDN + slug, { headers: { 'Accept': 'image/svg+xml' } });
		} catch (e) {
			return new Response('Upstream error', { status: 502 });
		}
		if (!res.ok) {
			const miss = new Response('No brand icon', {
				status: 404,
				headers: { 'Cache-Control': `public, max-age=${MISS_TTL}` },
			});
			try {
				await caches.default.put(cacheKey, miss.clone());
			} catch (e) {
			}
			return miss;
		}
		const svg = await res.text();
		if (!svg.startsWith('<svg') || svg.length > MAX_SVG_BYTES) {
			return new Response('Bad icon', { status: 502 });
		}
		const hit = new Response(svg, {
			headers: {
				'Content-Type': 'image/svg+xml',
				'Cache-Control': `public, max-age=${HIT_TTL}`,
			},
		});
		try {
			await caches.default.put(cacheKey, hit.clone());
		} catch (e) {
		}
		return hit;
	},

	validDomain(raw) {
		if (!raw || raw.length > 253) {
			return null;
		}
		if (!/^[a-z0-9.-]+$/.test(raw)) {
			return null;
		}
		const labels = raw.split('.');
		if (labels.length < 2) {
			return null;
		}
		for (const l of labels) {
			if (!l || l.length > 63 || l.startsWith('-') || l.endsWith('-')) {
				return null;
			}
		}
		return raw;
	},

	isFreemail(domain) {
		if (FREEMAIL_DOMAINS.has(domain)) {
			return true;
		}
		for (const base of FREEMAIL_DOMAINS) {
			if (domain.endsWith('.' + base)) {
				return true;
			}
		}
		return false;
	},

	// 注册域名 -> 图标库 slug（取注册域名的首段，如 accounts.google.com -> google）
	slugFor(domain) {
		const labels = domain.split('.');
		let reg;
		const last2 = labels.slice(-2).join('.');
		if (TWO_PART_SUFFIXES.has(last2) && labels.length >= 3) {
			reg = labels.slice(-3).join('.');
		} else {
			reg = last2;
		}
		const slug = reg.split('.')[0].replace(/[^a-z0-9-]/g, '');
		return slug || null;
	},
};

export default brandIconService;
