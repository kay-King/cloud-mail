# Cloud Mail 部署说明（本 fork）

基于上游 [maillab/cloud-mail](https://github.com/maillab/cloud-mail)，本 fork 增加了按账号转发、转发自动添加、系统通知邮箱、回收站、管理员删除通知、附件管理、邮件导出/导入、数据备份等功能。部署方式与上游一致，新增功能全部在网页设置里配置，不用改代码。

## 部署前准备

- 一个 Cloudflare 账号（免费版即可，不用绑卡）：[dash.cloudflare.com](https://dash.cloudflare.com)
- 一个已经接入 Cloudflare 的域名（域名的 NS 是 Cloudflare 的，即 DNS 由 Cloudflare 托管）
- 费用：Cloudflare 免费额度足够个人使用，发信服务商用免费档，全程不用花钱

## 先看懂这几个词（小白必读）

| 词 | 大白话解释 |
|---|---|
| Worker | 跑在 Cloudflare 上的一段程序，咱们的邮箱就跑在上面，不用买服务器 |
| D1 | Cloudflare 的数据库，存邮件、账号、设置 |
| KV | Cloudflare 的键值存储，存缓存、附件（默认）、备份 |
| 域名 | 比如 example.com；要先把域名的 DNS 交给 Cloudflare 管（在域名注册商那里把 NS 改成 Cloudflare 给的两个地址） |
| MX 记录 | 告诉全世界"这个域名的邮件交给谁收"，收信必须配 |
| SPF / DKIM / DMARC | 发信用的防伪记录，配了对方才不容易把你的邮件当垃圾邮件 |
| API Token | 给程序用的"钥匙"，让 GitHub Actions 能代你操作 Cloudflare |
| JWT_SECRET | 登录密钥，系统用它验证你是不是本人；也是初始化数据库的口令 |
| wrangler.toml | 部署配置文件，告诉 Cloudflare 用哪个数据库、管理员是谁 |
| Fork | 把别人的仓库复制一份到你自己名下，之后改的是你自己的那份 |

## 三种部署方式怎么选

| | 方式一 GitHub Actions | 方式二 命令行 | 方式三 纯手动 |
|---|---|---|---|
| 要装软件 | 不用 | 要装 Node.js + pnpm + Git | 不用 |
| 要敲命令 | 不用 | 要 | 不用 |
| 要建 API Token | 要（1 个） | 登录用（或 Token） | 不用 |
| 自动创建 D1 / KV | 是 | 手动创建（或用命令创建） | 手动在仪表板创建 |
| 自动初始化数据库 | 是 | 手动打开一个链接 | 手动打开一个链接 |
| 适合 | 不想碰命令行的人 | 想完全掌控每一步的人 | 只想点鼠标的人 |

三种方式部署出来的东西完全一样，选一个就行。**小白推荐方式一或方式三**，都不用碰命令行。

---

## 方式一：GitHub Actions 一键部署（推荐）

### 第 1 步：Fork 仓库

1. 打开本仓库页面
2. 点右上角 **Fork** → **Create fork**（名字不用改）
3. 等 Fork 完成，进入你自己的 Fork 仓库

### 第 2 步：创建 Cloudflare API Token

1. 打开 [dash.cloudflare.com](https://dash.cloudflare.com)，登录
2. 点右上角头像 → **My Profile**
3. 左侧点 **API Tokens** → 点 **Create Token**
4. 点最下面的 **Create Custom Token**
5. Token name 填 `cloud-mail-deploy`
6. Permissions 点 **Add more**，按下面逐条加：
   - Account | D1 | Edit
   - Account | Workers KV Storage | Edit
   - Account | Workers Scripts | Edit
   - Account | Account Settings | Read
   - Zone | Workers Routes | Edit
   - Zone | Zone | Read
7. Account Resources 选 Include → 你的账号；Zone Resources 选 Include → All zones（也可以只选你的邮件域名）
8. 其余不填，点 **Continue to summary** → **Create Token**
9. 复制显示出来的 Token（只显示一次），先存到记事本

### 第 3 步：填 GitHub Secrets

1. 进你 Fork 的仓库 → 点顶部菜单 **Settings**
2. 左侧点 **Secrets and variables** → **Actions**
3. 点 **New repository secret**，逐个加（名字必须完全一致，区分大小写）：

必填：

| Secret 名 | 填什么 |
|---|---|
| `CLOUDFLARE_API_TOKEN` | 第 2 步复制的 Token |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账号 ID：dash.cloudflare.com 首页右侧 **Account ID**，点一下就能复制 |
| `JWT_SECRET` | 自己编一个随机字符串（字母+数字，至少 16 位；**不能含 `? % # / \` 这几个字符**）。这个既是登录密钥也是初始化密钥，记好 |
| `DOMAIN` | 你的邮件域名，JSON 数组格式，例如 `["example.com"]`；多个域名就写 `["example.com","mail.net"]`，注意是英文双引号 |
| `ADMIN` | 管理员邮箱，例如 `admin@example.com`（部署后用这个邮箱注册管理员账号） |

选填（不填也能部署）：

| Secret 名 | 填什么 |
|---|---|
| `CUSTOM_DOMAIN` | 后台访问域名，例如 `mail.example.com`；填了之后用这个地址打开邮箱，不填就用 workers.dev 地址 |
| `D1_DATABASE_ID` / `KV_NAMESPACE_ID` | 已有数据库的 ID；不填则工作流自动创建 |
| `R2_BUCKET_NAME` | R2 存储桶名；不填则不用 R2（附件默认存 KV） |

### 第 4 步：运行部署

1. 进 Fork 仓库 → 点顶部菜单 **Actions**
2. 左侧找到 **Deploy cloud-mail to Cloudflare Workers**，点它
3. 点右侧 **Run workflow** → 再点绿色的 **Run workflow** 按钮
4. 等它跑完（约 3–5 分钟）：它会自动创建 D1 / KV、部署 Worker、初始化数据库
5. 跑完后点进这次运行记录，确认没有红色报错

### 第 5 步：打开你的邮箱

- 填了 `CUSTOM_DOMAIN`：打开 `https://mail.example.com`（换成你填的）
- 没填：去 dash.cloudflare.com → Workers & Pages → cloud-mail，里面有 workers.dev 地址，点开就是
- 打开后点「创建账号」，用 `ADMIN` 那个邮箱注册、设密码——这个账号就是管理员

之后继续看下面的「部署后必做」。

---

## 方式二：命令行部署

### 第 1 步：装软件

- Node.js 20 或更高（推荐 22+）：去 [nodejs.org](https://nodejs.org) 下 LTS 版安装
- pnpm：在终端跑 `npm install -g pnpm`
- Git：去 [git-scm.com](https://git-scm.com) 安装
- 装完分别跑 `node -v`、`pnpm -v`、`git --version`，都能显示版本号就是装好了

### 第 2 步：克隆仓库、装依赖

```bash
git clone https://github.com/kay-King/cloud-mail.git
cd cloud-mail/mail-worker
pnpm install
```

### 第 3 步：登录 Cloudflare

```bash
npx wrangler login
```

浏览器会打开 Cloudflare 授权页，点 Allow 即可。也可以用 Token 登录：把方式一第 2 步的 Token 设为环境变量 `CLOUDFLARE_API_TOKEN`。

### 第 4 步：创建 D1 数据库和 KV 命名空间

命令行方式（推荐）：

```bash
npx wrangler d1 create cloud-mail
# 输出里有一行 database_id，把它复制下来
npx wrangler kv namespace create cloud-mail
# 输出里有一行 id，把它复制下来
```

仪表板方式：

1. dash.cloudflare.com → 左侧 Workers & Pages → D1 SQL Database → Create database → 名字填 `cloud-mail` → Create
2. 点进刚建的库，页面上能看到 Database ID，复制下来
3. 左侧 Workers & Pages → KV → Create a namespace → 名字填 `cloud-mail` → Add
4. 点进刚建的命名空间，页面上能看到 ID，复制下来

### 第 5 步：改配置文件

1. 把 `mail-worker/wrangler.toml.example` 复制一份，改名叫 `wrangler.toml`（替换掉原来的——原来的里面是作者自己的配置）
2. 用记事本或编辑器打开 `wrangler.toml`，改下面几处（其余不用动）：
   - `database_id = "..."` → 填第 4 步的 D1 ID
   - `[[kv_namespaces]]` 里的 `id = "..."` → 填第 4 步的 KV ID
   - `admin = "admin@example.com"` → 填你的管理员邮箱
   - `domain = "[\"example.com\"]"` → 填你的域名（多个用逗号隔开，都在双引号里）
   - `[[routes]]` 里的 `pattern = "mail.example.com"` → 填你的后台域名；暂时没有域名就把整个 `[[routes]]` 这三行删掉（部署后用 workers.dev 地址）
   - `cf_account_id` → 填你的 Cloudflare 账号 ID（只影响转发自动添加，不填就删掉这行）

### 第 6 步：设置 JWT_SECRET

```bash
npx wrangler secret put jwt_secret
```

回车后粘贴你编的随机字符串（字母+数字，至少 16 位，不能含 `? % # / \`），再回车。记好这个值，后面初始化要用。

### 第 7 步：部署

```bash
npx wrangler deploy
```

部署会自动先构建前端（约 1–2 分钟），最后显示 `deployed to https://cloud-mail.xxx.workers.dev` 就是成功了。

### 第 8 步：初始化数据库

浏览器打开：

```
https://你的域名/api/init/你的JWT_SECRET
```

域名用 workers.dev 地址或你绑的自定义域名都行；`你的JWT_SECRET` 换成第 6 步设的那个。页面显示 `success` 就是初始化完成。重复打开也没关系，不会重复建表。

之后继续看下面的「部署后必做」。

---

## 方式三：纯手动部署（仪表板 + GitHub 网页，全程点鼠标）

不用装任何软件，不用敲任何命令，不用建 API Token，全程在浏览器里点。适合只想点鼠标的小白。

### 第 1 步：Fork 仓库

和方式一第 1 步一样：打开本仓库页面 → 点右上角 **Fork** → **Create fork**。

### 第 2 步：在仪表板手动建 D1 和 KV

1. 打开 [dash.cloudflare.com](https://dash.cloudflare.com)，登录
2. 左侧 Workers & Pages → **D1 SQL Database** → **Create database** → 名字填 `cloud-mail` → Create
3. 点进刚建的库，页面上能看到 Database ID，复制下来存到记事本
4. 左侧 Workers & Pages → **KV** → **Create a namespace** → 名字填 `cloud-mail` → Add
5. 点进刚建的命名空间，页面上能看到 ID，复制下来存到记事本

### 第 3 步：在 GitHub 网页上改配置文件

不用把代码下载到本地，直接在网页上改：

1. 进你 Fork 的仓库 → 点进 **mail-worker** 文件夹 → 点 **wrangler.toml**
2. 点右上角铅笔图标（Edit this file）
3. 改下面几处（其余不用动）：
   - `database_id = "..."` → 填第 2 步的 D1 ID
   - `[[kv_namespaces]]` 里的 `id = "..."` → 填第 2 步的 KV ID
   - `admin = "admin@example.com"` → 填你的管理员邮箱
   - `domain = "[\"example.com\"]"` → 填你的域名（多个用逗号隔开，都在双引号里）
   - `[[routes]]` 里的 `pattern = "mail.example.com"` → 填你的后台域名；暂时没有域名就把整个 `[[routes]]` 这三行删掉（部署后用 workers.dev 地址）
   - `cf_account_id` → 填你的 Cloudflare 账号 ID（dash.cloudflare.com 首页右侧 Account ID；只影响转发自动添加，不填就删掉这行）
4. 点 **Commit changes**（直接提交到 main 分支）
   - 注意：改的是你 Fork 里自己的文件，不影响原仓库

### 第 4 步：Cloudflare 仪表板连 Git 自动部署

1. dash.cloudflare.com → Workers & Pages → 点 **Create** → 选 **Workers** → 点 **Import a repository**（有的版本叫 Connect to Git）
2. 第一次用要授权 GitHub：点 **Install & Authorize**，选 **Only select repositories** → 勾上你 Fork 的仓库 → Install
3. 选你的 Fork 仓库，点 Begin setup（或 Continue）
4. 填构建设置（照下面填，一项都不能错）：
   - **Worker name**：`cloud-mail`（必须和 wrangler.toml 里的 name 一致）
   - **Production branch**：`main`
   - **Root directory**：`mail-worker`（点开 Advanced 才能看到这个选项；不填这个构建会失败）
   - **Build command**：留空（构建命令在 wrangler.toml 里，部署时自动跑）
   - **Deploy command**：`npx wrangler deploy`（默认就是这个，不用改）
   - **Build watch paths**：点开 Advanced，在 Include 里加上 `../*`（这样以后改前端代码也会触发重新部署；不加的话只改前端不会自动部署）
   - **Build API token**：保持默认 Create new token（Cloudflare 自动配，不用你建 Token）
5. 点 **Deploy**（或 Save and Deploy），等构建跑完（约 3–5 分钟）
6. 构建成功后页面会显示 workers.dev 地址

以后每次在 GitHub 上改代码（或点 Sync fork 同步上游更新），Cloudflare 都会自动重新部署，不用再操作。

### 第 5 步：在仪表板设 JWT_SECRET

1. Workers & Pages → 点进 **cloud-mail** → **Settings** → **Variables and Secrets**
2. 点 **Add** → 选 **Secret** → 名字填 `jwt_secret` → 值粘贴你编的随机字符串（字母+数字，至少 16 位，不能含 `? % # / \`）→ Save
3. 记好这个值，后面初始化要用

### 第 6 步：初始化数据库

浏览器打开：

```
https://你的域名/api/init/你的JWT_SECRET
```

域名用 workers.dev 地址或你绑的自定义域名都行；`你的JWT_SECRET` 换成第 5 步设的那个。页面显示 `success` 就是初始化完成。

之后继续看下面的「部署后必做」。

---

## 部署后必做

### 1. 注册管理员账号并关闭开放注册

1. 打开邮箱地址，点「创建账号」
2. 邮箱填 `ADMIN` 那个地址，设密码，注册——这个账号自动是管理员
3. 登录后点左侧管理菜单 → 系统设置 → 找到注册设置，把「开放注册」关掉（或改成邀请码注册）
   - 刚部署完默认是开放注册，任何人都能注册并消耗你的发信额度，务必关掉；已有账号不受影响

### 2. 收信配置（让别人能给你发邮件）

1. dash.cloudflare.com → 点你的域名 → 左侧 **Email** → **Email Routing**
2. 点 **Enable Email Routing**（如果还没开过）
3. 点 **Routing rules** → **Catch-all address** → 点 Edit（铅笔图标）
4. Action 选 **Send to a Worker** → 选 **cloud-mail** → Save
5. 左侧 **DNS** → **Records**，检查/添加下面 4 条记录（没有就点 Add record 加上）：
   - MX | @ | route1.mx.cloudflare.net | 优先级 8
   - MX | @ | route2.mx.cloudflare.net | 优先级 19
   - MX | @ | route3.mx.cloudflare.net | 优先级 29
   - TXT | @ | `v=spf1 include:_spf.mx.cloudflare.net ~all`
   - 注意：MX 记录的代理状态必须是 DNS only（灰色云朵，不能是橙色）
6. 等几分钟 DNS 生效，找个邮箱给自己发一封测试邮件，看收件箱能不能收到

### 3. 绑定自定义域名（部署时没绑的补上）

1. dash.cloudflare.com → Workers & Pages → cloud-mail → Settings → Domains
2. 点 **Add custom domain** → 填 `mail.example.com` → Add domain
3. Cloudflare 会自动加 DNS 记录，等一分钟就能用这个地址打开邮箱

---

## 发信配置（让你的邮箱能往外发信）

Cloudflare 自己不提供对外发信，需要接一个发信服务商，三个免费选一个就行，推荐 Sendkit。

### Sendkit（推荐：免费 3000 封/月，每天 100 封，1 个发信域名）

1. 打开 [sendkit.dev](https://sendkit.dev) 注册账号（可用 GitHub 或邮箱注册）
2. 登录后点 **Domains**（域名）→ **Add domain** → 填你的域名 → Add
3. 页面会显示几条 DNS 记录（SPF、DKIM 等），逐条去 Cloudflare DNS 里加上（Add record，类型和值照抄）
4. 回到 Sendkit 点 Verify，等状态变成 Verified（DNS 生效要几分钟）
5. 点 **API Keys** → **Create API Key** → 名字随便填 → Create，复制 Key
6. 打开你的 Cloud Mail → 系统设置 → 找到「发信服务商」→ 下拉选 Sendkit → 点 + 号 → 域名填你的域名、API Key 粘贴 → 保存
7. 写封测试邮件发到自己的其他邮箱，确认能收到

### Brevo（备选：免费 300 封/天）

1. [brevo.com](https://www.brevo.com) 注册 → Settings → Senders & IP → Domains → Add a domain → 按提示加 DNS 记录并验证
2. Settings → SMTP & API → API Keys → Generate a new API key → 复制
3. Cloud Mail 系统设置 → 发信服务商 → Brevo → 点 + 号填域名和 Key → 保存

### Resend（备选：免费 100 封/天）

[resend.com](https://resend.com) → Domains → Add Domain → 加 DNS 验证 → API Keys → Create API Key → 填进 Cloud Mail 的 Resend。注意：Resend 会拒绝一些免费公共域名后缀（如 .qzz.io 这类），被拒就换 Sendkit 或 Brevo。

### 发信小提醒

- 刚开始邮件可能进对方垃圾箱，这是新域名常见情况：SPF、DKIM、DMARC 配齐后会慢慢改善
- 一个域名在一个服务商里验证一次就行；多个域名想发信，每个域名都要在服务商里验证
- 发信服务商可以同时配多个，系统按发件域名自动选

---

## 附件存储与备份（默认零配置）

- 附件默认存在 Cloudflare KV 里，部署完就能用，不用配
- 想换大空间：系统设置 → 附件存储 → 下拉选 S3 兼容存储（如 Backblaze B2 免费 10GB、IDrive e2 免费 10GB）/ Cloudflare R2 / WebDAV，按提示填信息；切换后旧附件照常可读（系统会自动去旧存储找）
- 附件是加密存储的（AES-256-GCM），钥匙由系统自动生成存在 KV 里
- 备份默认开启：每天自动备份一次（数据库 + 设置），存 KV，保留最近 7 份；系统设置 → 数据备份里可以立即备份导出、恢复备份
- 重要：定期把备份文件下载到本地保存一份；恢复备份会覆盖当前数据库，操作前会弹确认框

---

## 可选：转发自动添加

按账号转发本身不用配这个；配了之后，用户在设置页保存转发目标时，系统会自动把目标邮箱加进 Cloudflare 验证名单并触发验证邮件，用户点一下链接就能转发，省去手动加名单的步骤。

1. dash.cloudflare.com → 右上角头像 → My Profile → API Tokens → Create Token → Create Custom Token
2. 权限只加一条：Account | Email Routing Addresses | Edit；Account Resources 选你的账号
3. 创建后复制 Token
4. 命令行部署的：在 `mail-worker` 目录跑 `printf '%s' '你的Token' | npx wrangler secret put cf_routing_token`，再确认 wrangler.toml 里有 `cf_account_id`（你的账号 ID），没有就补上并重新部署
5. GitHub Actions 部署的：dash.cloudflare.com → Workers & Pages → cloud-mail → Settings → Variables and Secrets → Add secret，名字填 `cf_routing_token`，值粘贴 Token → 再 Add variable，名字填 `cf_account_id`，值填账号 ID → 保存
6. 不配也不影响转发：目标邮箱没验证时，系统会在失败提醒里告诉用户去哪里手动添加

---

## 本 fork 新增功能一览

| 功能 | 在哪里用 |
|---|---|
| 按账号转发 | 个人设置 → 邮件转发（每个邮箱独立开关和目标地址） |
| 转发失败提醒 | 自动：转发失败后站内提醒该邮箱的拥有者 |
| 转发自动添加 | 保存转发时自动加验证名单（需配上面的 Token） |
| 系统通知邮箱 | 系统设置 → 邮件推送 → 系统通知邮箱（通知统一从这个邮箱发，留空用管理员邮箱） |
| 回收站 | 左侧菜单 → 回收站（删除先进回收站，可恢复） |
| 管理员删除通知 | 管理员删别人的邮件/附件时可通知对方（系统设置里可关） |
| 我的附件 / 全部附件 | 左侧菜单 → 我的附件；管理菜单 → 全部附件（可单独删附件） |
| 邮件导出/导入 | 列表工具栏导出 .eml；个人设置 → 导入邮件 |
| 数据备份与恢复 | 系统设置 → 数据备份 |
| 附件加密 | 系统设置 → 附件加密（开关与重新生成钥匙） |

---

## 常见问题

**打开 workers.dev 地址报 1101？**

Workers.dev 子域名在某些账号下不可用，绑定一个自定义域名就能解决（见上面「绑定自定义域名」）。

**登录后接口报 401？**

刚登录的 token 有 KV 同步延迟，等 20 秒再操作，或退出重新登录一次。

**改了设置不生效？**

KV 边缘缓存最长约 60 秒，等一分钟再看。

**初始化页面显示 JWT secret mismatch？**

init 链接里的密钥和部署时设的 jwt_secret 不一致，核对一下（GitHub Actions 部署的看 Secrets 里的 JWT_SECRET）。

**部署失败，提示 No access / 权限不足？**

API Token 权限没给够，对照方式一第 2 步的权限清单重新建一个 Token。

**邮件发出去对方收不到？**

先看 Cloud Mail 里这封邮件的状态；再检查发信服务商里域名是否 Verified、API Key 是否填对、域名 DNS 记录是否生效。

**附件钥匙丢了怎么办？**

钥匙丢了，加密的附件就读不出来了。所以定期备份很重要——备份文件里包含钥匙，恢复备份后附件照常可读。

**方式三构建失败，日志里报 pnpm 或 lockfile 的错？**

在 Workers & Pages → cloud-mail → Settings → Builds → Build variables 里加一个变量：名字 `PNPM_VERSION`，值 `10`，保存后点 Retry deployment 重新构建。

**方式三改了前端代码（mail-vue）却没有自动重新部署？**

构建监控路径默认只看 Root directory 里面。去 Settings → Builds → Build watch paths，在 Include 里加上 `../*`，保存后下次推送就会触发构建。

---

## 升级

- GitHub Actions 部署：Fork 仓库点 Sync fork 同步上游更新（或直接推送代码到 main），工作流会自动重新部署
- 纯手动部署（方式三）：同上，点 Sync fork 或推送代码后 Cloudflare 自动重新部署
- 命令行部署：`git pull` 拉最新代码，再跑一次 `npx wrangler deploy`
- 升级前建议先在系统设置 → 数据备份 → 立即备份导出，留一份备份
