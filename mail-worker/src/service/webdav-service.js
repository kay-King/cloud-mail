// WebDAV 对象存储：标准 PUT/GET/DELETE + Basic 认证，适配坚果云、Nextcloud、群晖等。
// config = { url, username, password }；key 形如 attachments/<hash>、backups/<name>。
// 上传前先 MKCOL 建父目录（已存在会报 405，忽略）；getObj 返回 fetch Response，404 返回 null。
const webdavService = {

	baseUrl(url) {
		return (url || '').replace(/\/+$/, '');
	},

	// btoa 遇到非 Latin1 字符会抛错，先用 TextEncoder 转字节再编码
	basicAuth(username, password) {
		const bytes = new TextEncoder().encode(`${username}:${password}`);
		let binary = '';
		for (const b of bytes) binary += String.fromCharCode(b);
		return `Basic ${btoa(binary)}`;
	},

	headers(config) {
		return { 'Authorization': this.basicAuth(config.username || '', config.password || '') };
	},

	isConfigured(config) {
		return !!(config && config.url && config.username && config.password);
	},

	async ensureCollection(config, key) {
		const slash = key.lastIndexOf('/');
		if (slash <= 0) return;
		const colUrl = `${this.baseUrl(config.url)}/${key.slice(0, slash)}`;
		try {
			// 201 新建成功、405 已存在都算好；其他状态忽略，交给 PUT 自己报错
			await fetch(colUrl, { method: 'MKCOL', headers: this.headers(config) });
		} catch (e) {
			// MKCOL 失败不中断，PUT 时再看
		}
	},

	async putObj(config, key, content, contentType) {
		await this.ensureCollection(config, key);
		const res = await fetch(`${this.baseUrl(config.url)}/${key}`, {
			method: 'PUT',
			headers: { ...this.headers(config), 'Content-Type': contentType || 'application/octet-stream' },
			body: content
		});
		if (!res.ok) {
			throw new Error(`WebDAV PUT ${key} failed: ${res.status}`);
		}
	},

	async getObj(config, key) {
		const res = await fetch(`${this.baseUrl(config.url)}/${key}`, {
			method: 'GET',
			headers: this.headers(config)
		});
		if (res.status === 404) return null;
		if (!res.ok) {
			throw new Error(`WebDAV GET ${key} failed: ${res.status}`);
		}
		return res;
	},

	async deleteObj(config, key) {
		const res = await fetch(`${this.baseUrl(config.url)}/${key}`, {
			method: 'DELETE',
			headers: this.headers(config)
		});
		if (res.status === 404) return;
		if (!res.ok) {
			throw new Error(`WebDAV DELETE ${key} failed: ${res.status}`);
		}
	}
};

export default webdavService;
