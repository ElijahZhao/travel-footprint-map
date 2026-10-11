# 旅行打卡地图足迹

> 一个移动端风格的「地图 + 时间线 + 统计 + 心愿 + 精选分享」个人旅行足迹应用，支持中英双语、游客免登录体验、邮箱/Google 登录与云端同步。桌面浏览器下居中显示带手机边框的「真机」视图。

## 在线访问

**https://travel-footprint-d8em6aa6331d820-1495478913.tcloudbaseapp.com/**

> 打开链接即可当游客体验，无需注册；手机浏览器打开效果最佳。

[![在线访问](https://img.shields.io/badge/%E5%9C%A8%E7%BA%BF%E4%BD%93%E9%AA%8C-travel--footprint-38A05F?logo=leaflet&logoColor=white)](https://travel-footprint-d8em6aa6331d820-1495478913.tcloudbaseapp.com/)
[![React](https://img.shields.io/badge/React-19.2-61dafb?logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-7.3-646cff?logo=vite&logoColor=white)](https://vite.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![CloudBase](https://img.shields.io/badge/Data-CloudBase-07c160)](https://cloudbase.net)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## 这是什么

一个帮你「把去过的地方在地图上画出来」的小应用：

- 在地图上点击或搜索某个地点，记录一次打卡（分类、心情、照片、评分）；
- 想去但还没去的地方，先放进「心愿」，将来去了就一键「点亮」成已打卡；
- 时间线按月回看，统计页看自己的足迹分布与年度曲线；
- 把公开打卡生成一张分享卡片/年度书，发给朋友。

整个应用**没有独立后端**：前端通过腾讯云 CloudBase 的 JS SDK 直连云端（PostgreSQL + 行级安全 RLS + 对象存储）。基础的增删查改由前端经 CloudBase SDK 直接完成；统计页的聚合类计算（省份点亮、年度最远点等）走 `rpc()` 调用云端 PostgreSQL 函数，逻辑在云端执行。未登录时数据落在本机 `localStorage`，登录后写入云端并按用户隔离。

## 效果预览

全部为实机截图（手机视口实录）。

### 游客模式（中文）

打开链接即可体验，无需注册。地图支持路线连线、箭头与路线动画：

| 地图主页 | 路线动画 | 时间线 |
|---|---|---|
| ![地图主页](docs/screenshots/guest-zh/01-map.png) | ![路线动画](docs/screenshots/guest-zh/02-map-animation.png) | ![时间线](docs/screenshots/guest-zh/03-timeline.png) |

| 心愿 & 点亮 | 旅行年鉴 | 我的 |
|---|---|---|
| ![心愿](docs/screenshots/guest-zh/04-wishlist.png) | ![统计](docs/screenshots/guest-zh/05-stats.png) | ![我的](docs/screenshots/guest-zh/06-me.png) |

| 打卡详情 |
|---|
| ![打卡详情](docs/screenshots/guest-zh/07-checkin-detail.png) |

### 邮箱验证码登录（真实账号）

登录后数据写入云端，跨设备同步；新账号从零开始记录：

| 登录页 | 邮箱验证码 | 登录成功 |
|---|---|---|
| ![登录页](docs/screenshots/real-user/01-login.png) | ![邮箱验证码](docs/screenshots/real-user/02-email-code.png) | ![登录成功](docs/screenshots/real-user/03-login-success.png) |

| 地图（空） | 时间线（空） | 心愿（空） |
|---|---|---|
| ![空地图](docs/screenshots/real-user/04-map-empty.png) | ![空时间线](docs/screenshots/real-user/05-timeline-empty.png) | ![空心愿](docs/screenshots/real-user/06-wishlist-empty.png) |

| 统计（空） | 我的 |
|---|---|
| ![空统计](docs/screenshots/real-user/07-stats-empty.png) | ![我的](docs/screenshots/real-user/08-me.png) |

### 游客模式（English）

「我的」页一键切换中/英，即时生效：

| Map | Timeline | Wishes |
|---|---|---|
| ![Map](docs/screenshots/guest-en/01-map.png) | ![Timeline](docs/screenshots/guest-en/02-timeline.png) | ![Wishes](docs/screenshots/guest-en/03-wishlist.png) |

| Stats | Me |
|---|---|
| ![Stats](docs/screenshots/guest-en/04-stats.png) | ![Me](docs/screenshots/guest-en/05-me.png) |

> 界面以公网部署为准。

## 整体架构

```
┌─────────────────────────────── 浏览器（前端，唯一应用层） ───────────────────────────────┐
│  React 19 + Vite + TS                                                            │
│   ├─ 路由 / 页面（地图 / 时间线 / 统计 / 心愿 / 我的 / 打卡 / 登录 / 分享）            │
│   ├─ 状态：AuthContext（账号+游客）· TanStack Query（云端数据缓存）                  │
│   └─ 地图：腾讯位置服务 GL JS API（动态地图）                                       │
└───────────────┬───────────────────────────────────────────┬──────────────────────┘
                │ CloudBase JS SDK                          │ 腾讯位置服务 WebService API
                ▼                                            ▼
        ┌──────────────────────┐                    ┌──────────────────────┐
        │  CloudBase（腾讯云）   │                    │  腾讯地图（逆地理/搜索） │
        │  · Auth v2（登录/会话） │                    └──────────────────────┘
        │  · PostgreSQL（RLS 行级安全）│
        │  · 对象存储（照片）      │
        └──────────────────────┘
```

要点：

- **前端直连云端，无自建后端**：数据层 `frontend/src/lib/checkins.ts` 直接调用 `app.rdb()`（PostgREST + RLS），自定义聚合走 `rpc()` 调用云端 PostgreSQL 函数（`frontend/src/lib/cloudbase.ts:60`）。
- **游客与登录双态**：未登录时 `guest.ts` 把数据写进本机 `localStorage`（key `tf_guest_checkins`），并预置一份示例足迹；登录后切到云端表，且把游客期间新增的足迹合并进账号（`mergeLocalCheckinsToCloud`）。
- **安全靠 RLS**：每张表通过行级安全策略，只让「本人」读改写自己的数据；公开精选走另一条 `select_public` 策略，免登录可读。

## 功能模块详解

### 登录与账号系统

入口在 `frontend/src/lib/AuthContext.tsx`，登录页 `pages/Login.tsx`。提供三种方式：

1. **邮箱验证码（OTP）登录/注册**：点「发送验证码」→ 调 `auth.signInWithOtp({ email })` 把码发到邮箱 → 输入验证码调 `verifyOtp` 完成登录。这是默认且最轻量的方式。
2. **邮箱 + 密码**：走 `auth.signInWithPassword`，也支持「忘记密码」走 `resetPasswordForEmail`。
3. **Google 登录**：通过 OAuth 中继跳转（`VITE_OAUTH_RELAY_URL/authorize?provider=google`），回跳到 `/auth/callback` 由云端函数 `oauth-callback` 换发本应用的 access/refresh token（`pages/auth-callback.tsx`）。

账号态用 `fetchUserProfile()` 取 `auth.getUser()`，包成 `UserProfile`（uid / email / 昵称 / 头像）。**登录成功后**会自动把本机游客期间新增的足迹合并进云端账号，再清掉游客数据，避免两边串起来。

> 游客模式不需要任何账号：打开应用若既不是登录态也不是游客态，首页会自动进入游客模式并填充示例数据，纯本地体验。

### 地图是怎么实现的

地图是核心页面，由 `components/TravelMap.tsx` 封装，底层是**腾讯位置服务 JavaScript GL API**（矢量/WebGL 动态地图）：

- **加载**：`lib/tencent-lbs.ts` 的 `loadTMapGL()` 动态注入腾讯地图脚本（带超时与一次重试），就绪后 `createMap()` 建实例。腾讯 Key 硬编码在 `tencent-lbs.ts`，需在控制台把当前域名加进白名单，否则定位/打点会失败。
- **大头针按分类着色**：6 类（风景/美食/人文/城市/亲子/户外）各有主题色，`pinSvg()` 现场生成 SVG 大头针（`categories.ts` 定义配色）；心愿用橙色、已去用苔绿。
- **聚合**：缩放较小时，`clusterCheckins()` 按网格把相近点聚成「数字气泡」，点数字气泡展开或弹清单，避免互相挡。
- **路线连线 + 动画**：已去点按打卡时间排序，相邻点之间用二次贝塞尔生成「轻轻拱起的航线」（`curvedSegment`），像航空路线图；每段中点放一枚朝向航向的小纸飞机箭头。左上「路线面板」可隐藏/显示路线、开关箭头、播放**路线生长动画**——纸飞机沿航线从第一站飞到最后一站，途经每个打卡点绽放一圈金色涟漪。
- **我的位置**：右下角定位按钮（可拖动）调用浏览器 `geolocation`，落一个蓝色脉冲圆点；点击回到当前位置。
- **健壮性**：先用 `hasWebGL()` 探测浏览器是否支持 WebGL，不支持或加载超时会显示可读的中文错误并给「重新加载地图」按钮，且不影响下方列表与新增打卡。

### 打卡与心愿

- 新增/编辑打卡走**底部抽屉**表单（`CheckinSheet` / `CheckinForm`），字段含地点、分类、日期、心情文案、标签、照片、评分、是否公开。
- 打卡可标记 `status = visited`（已去）或 `wish`（想去）。
- **心愿一键点亮**：在「心愿点亮」页，某条想去的点可以「完成此心愿」，原地转为已打卡，不打扰其它页面。
- 详情页 `CheckinDetail` 展示全部信息与照片，可编辑/删除。
- 删除走 `deleteCheckin`，云端按 `id` 删本人行，游客删本地数组。

### 时间线

`pages/Timeline.tsx`：按**年 → 月**分组回看已去打卡，每条带动态小图标（按分类）和心情文案；每年、每月可写一句回望标题，像翻一本旅行手账。

### 旅行统计

`pages/Stats.tsx` + `lib/checkins.ts` 的 `computeStats` / `fetchStats`：

- 游客模式在本地算：总数、已去、想去、去过城市数、各分类数量。
- 登录态调云端 PostgreSQL 函数 `get_travel_stats`（经 `rpc()`）汇总，结果一致。
- 展示：环形分类图、分类分布条、年度柱状图、省份点亮进度，以及一句可编辑的年度总结语，回顾这一年。

### 相册与年度旅行报告

- `pages/Album.tsx`：把带照片的打卡汇总成「足迹相册」。
- `pages/Report.tsx` + `components/Postcard.tsx`：生成**明信片 / 年度书**两种版式的旅行纪念图；用 `html-to-image` 把卡片导出为 PNG 下载（`SharePage.tsx:26` 的 `handleDownload`）。

### 精选分享

打卡时可勾选「公开」。公开打卡会出现在 `/share/:publicId` 免登录分享页（`pages/SharePage.tsx`），通过 `fetchPublicCheckins` 走 `select_public` RLS 策略，只取「该用户 + 公开」的行。分享页同样可导出明信片/年度书 PNG 发朋友。

### 中英双语

`lib/i18n.ts`：采用「**中文即 key**」策略——以中文文案本身作为 i18n key，英文映射放 `locales/en.ts`；缺英文时自动回退显示中文原文。界面所有文案都经 `t()` 抽取，无硬编码中文。「我的」页底部「语言」一项即时切换并写入 `localStorage`，刷新仍生效。

### AI 文案（可选）

`lib/ai.ts`：新增打卡时，可点「AI 帮我写心情」调用 OpenAI 兼容接口（`VITE_AI_BASE_URL` / `VITE_AI_API_KEY` / `VITE_AI_MODEL`）生成一段 40–80 字第一人称旅行心情。**未配置密钥时优雅降级**：按钮直接提示「尚未配置 AI」，不报错、不影响手动输入。

## 数据模型（云端 `checkins` 表）

| 字段 | 说明 |
|---|---|
| `id` | 自增主键 |
| `user_id` | 归属用户；插入时不传，由 RLS 的 `auth.uid()` 默认值自动填充 |
| `place_name` | 地点名 |
| `address` | 地址（可空） |
| `lng` / `lat` | 经纬度 |
| `category` | 分类：scenery / food / culture / city / family / outdoor |
| `status` | `visited`（已去）或 `wish`（想去） |
| `visit_date` | 打卡日期（心愿可为空） |
| `mood_text` | 心情文案 |
| `tags` | 标签数组 |
| `photos` | 照片数组 |
| `rating` | 评分 0–5 |
| `is_public` | 是否公开（用于分享页） |
| `nation` | 国家（国际化统计用） |

## 技术栈

- **前端**：React 19 + Vite 7 + TypeScript 5.9 + Tailwind v4 + shadcn/ui(Radix) + TanStack Query v5 + framer-motion v12 + canvas-confetti + html-to-image
- **数据/账号**：腾讯云 CloudBase —— Auth v2 + PostgreSQL（RLS 行级安全）+ 对象存储
- **地图**：腾讯位置服务 GL JS API（动态地图）+ WebService API（逆地理/搜索）
- **质量**：Vitest 单元测试；GitHub Actions 持续集成（类型检查 / 代码检查 / 单测 / 构建）

## 目录结构

```
frontend/
  src/
    pages/      各页面（Index 地图主页、Timeline、Stats、Wishlist、Me、Album、Report、
                Checkin* 打卡/详情/表单、Login、SharePage、NotFound）
    components/ 外壳（AppShell/MobileFrame/BottomNav/BottomSheet）+ 地图（TravelMap）+
                ErrorBoundary + UI 组件（shadcn/ui）
    lib/        cloudbase(云端SDK+rpc) / AuthContext(登录+游客) / checkins(数据层) /
                guest(游客模式) / tencent-lbs(地图封装) / categories(分类配色) /
                ai(文案) / celebrate(撒花) / i18n + locales(zh,en) / hooks / types
docs/
  产品方案.md        方案推演文档（以 frontend/src 代码为准）
  product/features.md 产品功能说明
  screenshots/     实机截图（guest-zh / real-user / guest-en）
```

## 快速开始

```bash
# 1. 安装依赖（前端为唯一应用层）
cd frontend && pnpm install

# 2. 配置环境变量
cp .env.example .env   # 填入 CloudBase 环境标识等（见下）

# 3. 启动开发模式（:5173）
pnpm dev

# 生产构建 + 本地预览（:4173）
pnpm build
pnpm preview --host 0.0.0.0 --port 4173

# 运行单元测试
pnpm test
```

### 环境变量（前端 `frontend/.env`）

| 变量 | 说明 |
|---|---|
| `VITE_CLOUDBASE_ENV_ID` | CloudBase 环境 ID |
| `VITE_CLOUDBASE_REGION` | CloudBase 区域 |
| `VITE_CLOUDBASE_PUBLISH_KEY` | 发布密钥 |
| `VITE_OAUTH_RELAY_URL` | 登录中继地址 |
| `VITE_AI_BASE_URL` / `VITE_AI_MODEL` | AI 文案生成的网关与模型（可选） |
| `VITE_AI_API_KEY` | AI 密钥。**注意：VITE_ 前缀会被打进浏览器包，任何用户可提取，请勿使用高权限/计费无上限的密钥** |

## 部署

项目用 `scripts/deploy.sh` 重新构建前端并上传到 CloudBase 静态托管（公网链接即产物）。改动前端后跑一次即可同步线上。

## 常见问题

- **地图不显示？** 腾讯地图 Key 需把当前访问域名加入白名单，否则定位/打卡点加载失败；浏览器也要开启 WebGL。
- **游客模式和登录有什么区别？** 游客数据只在本机 `localStorage`；登录后数据写入云端并按用户隔离（RLS），且登录时会把游客期间新增的足迹合并进账号。
- **AI 文案生成失败？** 未配置 `VITE_AI_API_KEY` 时会提示未配置；配置后仍报错多为网关/模型参数问题。
- **如何切换语言？** 进入「我的」页，底部「语言」一项可在中文 / English 之间切换，即时生效。
- **分享页为什么能看到别人的公开打卡？** 公开打卡走 `select_public` RLS 策略，专门开放给免登录读取。

## 更新日志

- **v1.1** — 中英双语(i18n)、全局错误兜底(ErrorBoundary)、单元测试(Vitest)接入、环境变量模板、持续集成(GitHub Actions)、视觉迭代（糖果配色 / 季节粒子背景 / 动态时间线图标）、路线连线与生长动画、相册与年度旅行报告。
- **v1.0** — 首版：地图主页、打卡/心愿、时间线、统计、游客模式、登录、精选分享。

### 本页事实性陈述与代码依据（供复核）

| 陈述 | 依据 |
|---|---|
| 路由含 `/` `/timeline` `/stats` `/wishlist` `/me` `/album` `/report` `/checkin/*` `/login` `/share/:publicId` `/auth/callback` | `frontend/src/App.tsx` |
| 游客模式用 `localStorage`，key `tf_guest_checkins`，首次进入填示例数据 | `frontend/src/lib/guest.ts` |
| 登录支持邮箱 OTP、邮箱密码、Google OAuth 中继 | `frontend/src/lib/AuthContext.tsx`、`pages/Login.tsx`、`pages/auth-callback.tsx` |
| 登录后合并游客新增足迹到云端账号 | `frontend/src/lib/checkins.ts:130` `mergeLocalCheckinsToCloud` |
| 地图用腾讯位置服务 GL JS API，动态注入脚本 | `frontend/src/lib/tencent-lbs.ts`、`components/TravelMap.tsx` |
| 大头针按 6 分类着色，心愿/已去区分 | `frontend/src/lib/categories.ts`、`components/TravelMap.tsx:484` |
| 已去点按时间连弧形航线 + 纸飞机生长动画 | `frontend/src/components/TravelMap.tsx:584`、`:674` |
| 数据层前端直连 CloudBase（`db.from`/`rpc`），无独立后端 | `frontend/src/lib/checkins.ts`、`cloudbase.ts` |
| 中英双语经 i18n「中文即 key」抽取，设置页可切换 | `frontend/src/lib/i18n.ts`、`locales/{zh,en}.ts`、`Me.tsx` |
| 分享页走 `select_public` RLS 免登录读公开打卡 | `frontend/src/lib/checkins.ts:29` `fetchPublicCheckins` |
| AI 文案未配置密钥时优雅降级 | `frontend/src/lib/ai.ts:12` `aiConfigured` |
| 全局错误兜底 ErrorBoundary 包裹应用入口 | `frontend/src/components/ErrorBoundary.tsx`、`main.tsx` |
| 单元测试 Vitest，覆盖数据层纯函数 | `frontend/vitest.config.ts`、`src/lib/__tests__/*.test.ts` |
| 持续集成 GitHub Actions 跑 typecheck/lint/test/build | `.github/workflows/ci.yml` |
