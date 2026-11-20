// 设置打包三处清单一致性检查（零依赖，node 直接跑）：
//   node mail-worker/scripts/check-setting-groups.mjs
//
// 背景：设置打包后，同一批设置字段散在三处手写清单里——
//   ① helper 读值（setting-service.js 里各 XxxConfig() 的 pick('字段')，
//      以及 notifyFlags 组的单键 helper notifyFlag(setting, '字段')）；
//   ② set() 的 delete 清单（打包进 JSON 后要从 params 里删掉的平铺字段）；
//   ③ refresh() 的 JSON_COLUMNS（要解析的打包列）。
// 三处不同步时会出现：新字段读不到、旧字段删不掉（update 时报未知列）、
// 打包列没解析（helper 拿到字符串）。运行时表驱动重构风险过高，改用静态检查兜底。
// 新增设置字段时三处都要同步（见 AGENTS.md 的检查项）。
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svcPath = join(root, 'src/service/setting-service.js');
const src = readFileSync(svcPath, 'utf8');

// ---- ① helper 字段：pick('字段') + notifyFlag(setting, '字段') ----
// pick 只出现在 helper 区（settingService 开始到 async get 之前）；
// notifyFlag 的调用方散在各 service 里，全 src 扫描。
const helperRegion = src.split('async get(c)')[0];
const helperFields = new Set(
  [...helperRegion.matchAll(/pick\('([A-Za-z0-9_]+)'/g)].map(m => m[1])
);
function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.js')) {
      const text = readFileSync(p, 'utf8');
      for (const m of text.matchAll(/notifyFlag\([^,]+,\s*'([A-Za-z0-9_]+)'\)/g)) {
        helperFields.add(m[1]);
      }
    }
  }
}
walk(join(root, 'src'));

// ---- ② set() 的 delete 清单 ----
const deleteFields = new Set(
  [...src.matchAll(/delete params\.([A-Za-z0-9_]+)/g)].map(m => m[1])
);

// ---- ③ refresh() 的 JSON_COLUMNS ----
const jsonColumns = new Set(
  [...(src.match(/const JSON_COLUMNS = \[([\s\S]*?)\];/)?.[1] || '').matchAll(/'([A-Za-z0-9_]+)'/g)].map(m => m[1])
);
const packedObjects = new Set(
  [...helperRegion.matchAll(/setting\?\.([A-Za-z0-9_]+)/g)].map(m => m[1])
);

// 已知例外（helper 有、delete 没有是正确的）：从出生起就只在 JSON 里、
// 从未有过平铺列的字段，前端只在打包对象里发，set() 没有平铺字段可删。
const HELPER_ONLY_OK = new Set([
  'apiKey', // mailjetConfig 里的账号密钥
  'secretKey', // 同上
  'ruleMatch', // globalForward 里的名单匹配方式
]);

let failed = false;
function fail(msg) { failed = true; console.error(`FAIL: ${msg}`); }

const helperOnly = [...helperFields].filter(f => !deleteFields.has(f) && !HELPER_ONLY_OK.has(f));
const deleteOnly = [...deleteFields].filter(f => !helperFields.has(f));
const unpacked = [...packedObjects].filter(o => !jsonColumns.has(o));

if (helperOnly.length) fail(`helper 读了但 set() 没删的字段（会残留平铺值）：${helperOnly.join(', ')}`);
if (deleteOnly.length) fail(`set() 删了但 helper 没读的字段（可能删错或 helper 漏了）：${deleteOnly.join(', ')}`);
if (unpacked.length) fail(`helper 用的打包对象没进 JSON_COLUMNS（refresh 不解析）：${unpacked.join(', ')}`);

console.log(`helper 字段 ${helperFields.size} 个（含例外 ${[...HELPER_ONLY_OK].join(', ')}），delete 清单 ${deleteFields.size} 个，打包列 ${jsonColumns.size} 个`);
if (failed) {
  console.error('检查未通过：新增设置字段时 helper、delete 清单、JSON_COLUMNS 三处要同步');
  process.exit(1);
}
console.log('检查通过：三处清单一致');
