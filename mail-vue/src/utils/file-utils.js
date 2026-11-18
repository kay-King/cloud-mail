import Compressor from "compressorjs";

export function getExtName(fileName) {
    const index = fileName.lastIndexOf('.')
    return index !== -1 ? fileName.slice(index + 1).toLowerCase() : ''
}

export function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const size = (bytes / Math.pow(k, i)).toFixed(2);
    return `${size} ${units[i]}`;
}

export function fileToBase64(file, type = false) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            if (type) {
                const base64 = reader.result;
                resolve(base64);
            } else {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            }
        };
        reader.onerror = reject;
    });
}

export function base64Size(base64String) {
    const padding = (base64String.match(/=*$/) || [''])[0].length;
    const base64Length = base64String.length;
    return (base64Length * 3) / 4 - padding;
}

// 动图检测：GIF 一律视为动图；WebP 搜 ANMF 块、PNG 搜 acTL 块（文件头 1MB 内）
async function isAnimatedImage(file) {
    if (file.type === 'image/gif') return true
    if (file.type !== 'image/webp' && file.type !== 'image/png') return false
    try {
        const buf = new Uint8Array(await file.slice(0, 1024 * 1024).arrayBuffer())
        const marker = file.type === 'image/webp' ? 'ANMF' : 'acTL'
        for (let i = 0; i + 4 <= buf.length; i++) {
            if (buf[i] === marker.charCodeAt(0) && buf[i + 1] === marker.charCodeAt(1)
                && buf[i + 2] === marker.charCodeAt(2) && buf[i + 3] === marker.charCodeAt(3)) return true
        }
    } catch (e) {
        // 读失败就按静态图处理
    }
    return false
}

export async function compressImage(file, config = {}) {

    // 动图不压缩：转 JPEG 会丢掉动画，只剩第一帧
    if (await isAnimatedImage(file)) return file

    if (file.size < (config.convertSize || 1024 * 1024)) {
        return file
    }

    return new Promise((resolve, reject) => {
        new Compressor(file, {
            quality: config.quality || 0.8,
            maxWidth: config.maxWidth,
            maxHeight: config.maxHeight,
            mimeType: 'image/jpeg',
            success(result) {
                resolve(result);
            },
            error(err) {
                reject(err);
            },
        });
    });
}