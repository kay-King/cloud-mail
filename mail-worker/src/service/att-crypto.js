// 附件客户端加密：上传到对象存储前在 Worker 里用 AES-256-GCM 加密，
// 下载时解密，服务商只能看到密文。密钥来自 Worker secret
// ATTACH_ENCRYPTION_KEY（base64 编码的 32 字节），不要写进代码或仓库。
//
// 密文格式 v2（当前）：'CMA2'(4 字节) + 钥匙标记(8 字节，钥匙 SHA-256 前 8 字节)
// + IV(12 字节随机) + ciphertext + GCM tag(16 字节，WebCrypto 追加在密文末尾)。
// 标记让解密时直接找到对应的钥匙，不用逐个试。
// 密文格式 v1（旧对象）：'CMA1'(4 字节) + IV(12 字节) + ciphertext + tag，无标记，
// 解密时按历史从新到旧逐个试。
//
// 钥匙轮换：Worker 在 KV 里维护一份钥匙历史（att-key-history:，新在前）。
// 每次加解密时，若当前 secret 钥匙还没记下来就自动记一笔；旧附件一直用旧钥匙
// 解，不做重加密迁移，新附件用当前钥匙加密。用户在 CF 后台直接改 secret 就能
// 换钥匙，全程不断。注意：历史存在 KV 里，CF 账号能读 KV 的人就能看到钥匙——
// 本部署的邮件正文与发信 key 本来就明文在 CF 里，这套加密防的是对象存储
// 服务商，不是 CF。
//
// 只加密 attachments/ 前缀的对象（邮件附件与正文内嵌图）；static/ 等其他
// 前缀（如登录页背景图）不加密，避免影响公开访问与缓存语义。
import constant from '../const/constant';
import KvConst from '../const/kv-const';

const MAGIC_V1 = 'CMA1';
const MAGIC_V2 = 'CMA2';
const MAGIC_V1_BYTES = new TextEncoder().encode(MAGIC_V1);
const MAGIC_V2_BYTES = new TextEncoder().encode(MAGIC_V2);
const KEY_ID_LEN = 8;
const IV_LEN = 12;
const KEY_LEN = 32;
const MAX_HISTORY = 20; // 安全上限；钥匙只增不减，轮换次数到不了这个数

// 按 base64 字面值缓存 CryptoKey，换密钥后新值自动走新缓存项
const keyCache = new Map();
// 按 base64 字面值缓存钥匙标记（SHA-256 前 8 字节）
const keyIdCache = new Map();

function base64ToBytes(base64) {
	if (typeof Buffer !== 'undefined') {
		return new Uint8Array(Buffer.from(base64, 'base64'));
	}
	const bin = atob(base64);
	const bytes = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) {
		bytes[i] = bin.charCodeAt(i);
	}
	return bytes;
}

function getCurrentKeyB64(c) {
	return c?.env?.ATTACH_ENCRYPTION_KEY || null;
}

async function importKeyFromB64(b64) {
	if (!keyCache.has(b64)) {
		const raw = base64ToBytes(b64);
		if (raw.length !== KEY_LEN) {
			throw new Error('ATTACH_ENCRYPTION_KEY must be 32 bytes (base64)');
		}
		keyCache.set(b64, await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']));
	}
	return keyCache.get(b64);
}

// 钥匙标记：钥匙 SHA-256 的前 8 字节，写进密文头，供解密时定位钥匙
async function keyIdBytes(b64) {
	if (!keyIdCache.has(b64)) {
		const digest = await crypto.subtle.digest('SHA-256', base64ToBytes(b64));
		keyIdCache.set(b64, new Uint8Array(digest).slice(0, KEY_ID_LEN));
	}
	return keyIdCache.get(b64);
}

// 钥匙指纹（SHA-256 前 8 位 hex），只用于日志，绝不记钥匙本身
async function fingerprint(b64) {
	const id = await keyIdBytes(b64);
	return Array.from(id.slice(0, 4)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function bytesEqual(a, b) {
	if (a.length !== b.length) {
		return false;
	}
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) {
			return false;
		}
	}
	return true;
}

// 钥匙历史：base64 数组，新在前；读不到时返回 []，不让 KV 故障拖垮加解密
async function getHistory(c) {
	try {
		const list = await c.env.kv.get(KvConst.ATT_KEY_HISTORY, { type: 'json' });
		if (!Array.isArray(list)) {
			return [];
		}
		return list.filter(x => typeof x === 'string' && x.length > 0);
	} catch (e) {
		console.error('Failed to read attachment key history', e);
		return [];
	}
}

async function setHistory(c, list) {
	await c.env.kv.put(KvConst.ATT_KEY_HISTORY, JSON.stringify(list.slice(0, MAX_HISTORY)));
}

// 当前钥匙还没记进历史就记一笔；返回记录后的历史。记不上也不影响本次加解密
async function ensureKeyRecorded(c, b64) {
	if (!b64) {
		return getHistory(c);
	}
	try {
		const history = await getHistory(c);
		if (history.includes(b64)) {
			return history;
		}
		history.unshift(b64);
		await setHistory(c, history);
		return history;
	} catch (e) {
		console.error('Failed to record attachment key', e);
		return [];
	}
}

function isAttachmentKey(key) {
	return typeof key === 'string' && key.startsWith(constant.ATTACHMENT_PREFIX);
}

function startsWith(bytes, prefix) {
	if (bytes.length < prefix.length) {
		return false;
	}
	for (let i = 0; i < prefix.length; i++) {
		if (bytes[i] !== prefix[i]) {
			return false;
		}
	}
	return true;
}

function isEncrypted(bytes) {
	return startsWith(bytes, MAGIC_V1_BYTES) || startsWith(bytes, MAGIC_V2_BYTES);
}

// 解析密文头：v2 带钥匙标记，v1 不带；明文返回 null
function parseHeader(bytes) {
	if (startsWith(bytes, MAGIC_V2_BYTES)) {
		return {
			version: 2,
			keyId: bytes.slice(MAGIC_V2_BYTES.length, MAGIC_V2_BYTES.length + KEY_ID_LEN),
			iv: bytes.slice(MAGIC_V2_BYTES.length + KEY_ID_LEN, MAGIC_V2_BYTES.length + KEY_ID_LEN + IV_LEN),
			cipher: bytes.slice(MAGIC_V2_BYTES.length + KEY_ID_LEN + IV_LEN)
		};
	}
	if (startsWith(bytes, MAGIC_V1_BYTES)) {
		return {
			version: 1,
			keyId: null,
			iv: bytes.slice(MAGIC_V1_BYTES.length, MAGIC_V1_BYTES.length + IV_LEN),
			cipher: bytes.slice(MAGIC_V1_BYTES.length + IV_LEN)
		};
	}
	return null;
}

async function toUint8Array(content) {
	if (content instanceof Uint8Array) {
		return content;
	}
	if (content instanceof ArrayBuffer) {
		return new Uint8Array(content);
	}
	// Response 不是合法的 BodyInit，不能 new Response(resp)，会变成 '[object Response]' 字符串
	if (content instanceof Response) {
		return new Uint8Array(await content.arrayBuffer());
	}
	// ReadableStream / Blob 等可作为 Response body 的类型
	return new Uint8Array(await new Response(content).arrayBuffer());
}

async function encryptBytes(cryptoKey, keyId, plain) {
	const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
	const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, plain);
	const out = new Uint8Array(MAGIC_V2_BYTES.length + KEY_ID_LEN + IV_LEN + cipher.byteLength);
	out.set(MAGIC_V2_BYTES, 0);
	out.set(keyId, MAGIC_V2_BYTES.length);
	out.set(iv, MAGIC_V2_BYTES.length + KEY_ID_LEN);
	out.set(new Uint8Array(cipher), MAGIC_V2_BYTES.length + KEY_ID_LEN + IV_LEN);
	return out;
}

async function decryptBytes(cryptoKey, header) {
	const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: header.iv }, cryptoKey, header.cipher);
	return new Uint8Array(plain);
}

const attCrypto = {

	isAttachmentKey,

	isEncrypted,

	getCurrentKeyB64,

	getHistory,

	setHistory,

	ensureKeyRecorded,

	importKeyFromB64,

	fingerprint,

	keyIdBytes,

	// 加密：非附件 key 或未配密钥时原样返回；加密一律用当前 secret 钥匙，写 CMA2 格式
	async encrypt(c, key, content) {
		if (!isAttachmentKey(key)) {
			return content;
		}
		const b64 = getCurrentKeyB64(c);
		if (!b64) {
			return content;
		}
		await ensureKeyRecorded(c, b64);
		const cryptoKey = await importKeyFromB64(b64);
		const keyId = await keyIdBytes(b64);
		const plain = await toUint8Array(content);
		return encryptBytes(cryptoKey, keyId, plain);
	},

	// 解密：非附件 key 或无魔术头的明文对象原样返回字节；CMA2 按标记直找对应钥匙，
	// 找不到标记时回退到逐个试；CMA1 无标记，直接按历史从新到旧逐个试
	async decrypt(c, key, content) {
		const bytes = await toUint8Array(content);
		if (!isAttachmentKey(key)) {
			return bytes;
		}
		const header = parseHeader(bytes);
		if (!header) {
			return bytes;
		}
		const b64 = getCurrentKeyB64(c);
		const history = await ensureKeyRecorded(c, b64);
		const candidates = [...new Set([b64, ...history].filter(Boolean))];
		if (candidates.length === 0) {
			throw new Error('Attachment is encrypted but ATTACH_ENCRYPTION_KEY is not configured');
		}
		// v2 先按标记直找对应钥匙
		if (header.version === 2 && header.keyId) {
			for (const cand of candidates) {
				if (bytesEqual(await keyIdBytes(cand), header.keyId)) {
					try {
						return await decryptBytes(await importKeyFromB64(cand), header);
					} catch (e) {
						// 标记对上但解不开（对象损坏），继续逐个试
						break;
					}
				}
			}
		}
		let lastErr = null;
		for (const cand of candidates) {
			try {
				return await decryptBytes(await importKeyFromB64(cand), header);
			} catch (e) {
				lastErr = e;
			}
		}
		throw new Error('Failed to decrypt attachment with any known key: ' + (lastErr?.message || lastErr));
	}

};

export default attCrypto;
