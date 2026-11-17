// 附件客户端加密：上传到对象存储前在 Worker 里用 AES-256-GCM 加密，
// 下载时解密，服务商只能看到密文。密钥来自 Worker secret
// ATTACH_ENCRYPTION_KEY（base64 编码的 32 字节），不要写进代码或仓库。
//
// 密文格式：'CMA1'(4 字节魔术头) + IV(12 字节随机) + ciphertext + GCM tag(16 字节，
// WebCrypto 追加在密文末尾)。魔术头用于区分明文与密文对象：迁移前已存在的
// 明文对象没有魔术头，读取时直接透传；没有配置密钥时也不加密，直接透传。
//
// 只加密 attachments/ 前缀的对象（邮件附件与正文内嵌图）；static/ 等其他
// 前缀（如登录页背景图）不加密，避免影响公开访问与缓存语义。
import constant from '../const/constant';

const MAGIC = 'CMA1';
const MAGIC_BYTES = new TextEncoder().encode(MAGIC);
const IV_LEN = 12;
const KEY_LEN = 32;

// 按 base64 字面值缓存 CryptoKey，换密钥后新值自动走新缓存项
const keyCache = new Map();

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

async function getKey(c) {
	const b64 = c?.env?.ATTACH_ENCRYPTION_KEY;
	if (!b64) {
		return null;
	}
	if (!keyCache.has(b64)) {
		const raw = base64ToBytes(b64);
		if (raw.length !== KEY_LEN) {
			throw new Error('ATTACH_ENCRYPTION_KEY must be 32 bytes (base64)');
		}
		keyCache.set(b64, await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']));
	}
	return keyCache.get(b64);
}

function isAttachmentKey(key) {
	return typeof key === 'string' && key.startsWith(constant.ATTACHMENT_PREFIX);
}

function isEncrypted(bytes) {
	if (bytes.length < MAGIC_BYTES.length) {
		return false;
	}
	for (let i = 0; i < MAGIC_BYTES.length; i++) {
		if (bytes[i] !== MAGIC_BYTES[i]) {
			return false;
		}
	}
	return true;
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

const attCrypto = {

	isAttachmentKey,

	isEncrypted,

	// 加密：非附件 key 或未配密钥时原样返回
	async encrypt(c, key, content) {
		if (!isAttachmentKey(key)) {
			return content;
		}
		const cryptoKey = await getKey(c);
		if (!cryptoKey) {
			return content;
		}
		const plain = await toUint8Array(content);
		const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
		const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, plain);
		const out = new Uint8Array(MAGIC_BYTES.length + IV_LEN + cipher.byteLength);
		out.set(MAGIC_BYTES, 0);
		out.set(iv, MAGIC_BYTES.length);
		out.set(new Uint8Array(cipher), MAGIC_BYTES.length + IV_LEN);
		return out;
	},

	// 解密：非附件 key 或无魔术头的明文对象原样返回字节；有魔术头但未配密钥时抛错
	async decrypt(c, key, content) {
		const bytes = await toUint8Array(content);
		if (!isAttachmentKey(key) || !isEncrypted(bytes)) {
			return bytes;
		}
		const cryptoKey = await getKey(c);
		if (!cryptoKey) {
			throw new Error('Attachment is encrypted but ATTACH_ENCRYPTION_KEY is not configured');
		}
		const iv = bytes.slice(MAGIC_BYTES.length, MAGIC_BYTES.length + IV_LEN);
		const cipher = bytes.slice(MAGIC_BYTES.length + IV_LEN);
		const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, cipher);
		return new Uint8Array(plain);
	}

};

export default attCrypto;
