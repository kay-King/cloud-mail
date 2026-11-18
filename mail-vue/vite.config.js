import {defineConfig, loadEnv} from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import {ElementPlusResolver} from 'unplugin-vue-components/resolvers'
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
    const env = loadEnv(mode, process.cwd(), 'VITE')
    return {
        server: {
            host: true,
            port: 3001,
            hmr: true,
        },
        base: env.VITE_STATIC_URL || '/',
        plugins: [vue(),
            VitePWA({
                injectRegister: 'script-defer',
                // 新版本自动接管（不用用户点确认），否则旧 SW 会一直占着不更新
                registerType: 'autoUpdate',
                manifest: {
                    name: env.VITE_PWA_NAME,
                    short_name: env.VITE_PWA_NAME,
                    background_color: '#FFFFFF',
                    theme_color: '#FFFFFF',
                    icons: [
                        {
                            src: 'mail-pwa.png',
                            sizes: '192x192',
                            type: 'image/png',
                        }
                    ],
                },
                workbox: {
                    disableDevLogs: true,
                    // 预缓存应用外壳（首屏必需的小文件）；懒加载 chunk 与大库走 runtime 缓存，
                    // 用时再下载、下完留存，避免首次访问一次下载 10MB
                    // 注意：index.html 绝不能预缓存——每次部署它引用的文件哈希都会变，
                    // 旧 index.html 一旦被离线缓存，打开就是旧页面要旧文件，服务器对不存在的
                    // 文件返回首页 HTML，浏览器因 MIME 类型拒绝执行，主文件永远加载失败、
                    // 卡在信封启动屏进不去（2026-11-18 实测）。index.html 只有 1KB 且带
                    // max-age=0，每次打开都走网络拿最新版。
                    globPatterns: ['preview.html', 'manifest.webmanifest', 'mail-pwa.png'],
                    runtimeCaching: [
                        {
                            // 带哈希的构建产物（JS/CSS）：文件名含哈希、内容不变，缓存优先
                            urlPattern: ({url}) => url.pathname.startsWith('/assets/'),
                            handler: 'CacheFirst',
                            options: {
                                cacheName: 'cloud-mail-assets',
                                expiration: {maxEntries: 200, maxAgeSeconds: 365 * 24 * 3600},
                                cacheableResponse: {statuses: [0, 200]}
                            }
                        },
                        {
                            // Office 预览库（文件名带版本号）与 tinymce、字体、图片：缓存优先
                            urlPattern: ({url}) => url.pathname.startsWith('/preview-libs/') || url.pathname.startsWith('/tinymce/') || url.pathname.startsWith('/fonts/') || url.pathname.startsWith('/image/'),
                            handler: 'CacheFirst',
                            options: {
                                cacheName: 'cloud-mail-vendor',
                                expiration: {maxEntries: 200, maxAgeSeconds: 365 * 24 * 3600},
                                cacheableResponse: {statuses: [0, 200]}
                            }
                        },
                        {
                            // 附件：URL 是内容哈希、内容不变；限制数量与有效期防占满
                            urlPattern: ({url}) => url.pathname.startsWith('/attachments/') || url.pathname.startsWith('/oss/'),
                            handler: 'CacheFirst',
                            options: {
                                cacheName: 'cloud-mail-attachments',
                                expiration: {maxEntries: 50, maxAgeSeconds: 7 * 24 * 3600},
                                cacheableResponse: {statuses: [0, 200]}
                            }
                        },
                        {
                            // API 与登录：永远走网络，不缓存
                            urlPattern: ({url}) => url.pathname.startsWith('/api/'),
                            handler: 'NetworkOnly'
                        }
                    ],
                    // 注意：不要配 navigateFallback——离线回退会让离线缓存给导航返回旧 index.html，
                    // 与上面预缓存旧 index.html 是同一个坑。服务器本身已做 SPA 回退
                    // （/inbox 直接访问返回 200 的 index.html，2026-11-18 实测），
                    // 导航一律走网络拿最新 index.html；离线时打不开是正常的（邮箱本就需要联网）。
                    cleanupOutdatedCaches: true,
                }
            }),
            AutoImport({
                resolvers: [ElementPlusResolver()],
            }),
            Components({
                resolvers: [ElementPlusResolver()],
            })
        ],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, 'src')
            }
        },
        build: {
            target: 'es2022',
            outDir: env.VITE_OUT_DIR || 'dist',
            emptyOutDir: true,
            assetsInclude: ['**/*.json']
        }
    }
})
