# 旅行打卡地图足迹

> 移动端风格的「地图 + 时间线 + 统计 + 心愿 + 精选分享」个人足迹应用。桌面浏览器下居中显示带手机边框的「真机」视图。

## 在线访问

**https://travel-footprint-d8em6aa6331d820-1495478913.tcloudbaseapp.com/**

> 免登录可体验游客模式；手机浏览器打开效果最佳。

[![在线访问](https://img.shields.io/badge/%E5%9C%A8%E7%BA%BF%E4%BD%93%E9%AA%8C-travel--footprint-38A05F?logo=leaflet&logoColor=white)](https://travel-footprint-d8em6aa6331d820-1495478913.tcloudbaseapp.com/)

[![React](https://img.shields.io/badge/React-19.2-61dafb?logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-7.3-646cff?logo=vite&logoColor=white)](https://vite.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![CloudBase](https://img.shields.io/badge/Data-CloudBase-07c160)](https://cloudbase.net)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## 核心亮点

- **地图足迹**：交互式地图按分类（风景/美食/人文/城市/亲子/户外）与状态（已打卡/心愿）筛选，大头针着色，点击进详情。
- **打卡与心愿**：新增/编辑/删除打卡；心愿清单可一键「完成此心愿」原地转为已打卡，不打扰其它页面。
- **时间线 + 统计**：按月回顾足迹；环形分类图、分类分布条、年度柱状图、省份点亮进度。
- **游客模式**：未登录也能用，数据存本地 `localStorage`，登录后切换到云端账号。
- **精选分享**：把公开打卡生成分享页 `/share/:publicId`，免登录可读。

## 效果预览

界面概念图见 [`docs/产品方案.md` 第 26 节](docs/产品方案.md) 与 [`generated-images/`](generated-images/)（10 张移动端页面预览）。

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
```

> 本项目**没有独立后端服务**：前端通过 CloudBase JS SDK 直连云端（PostgreSQL + RLS + 对象存储），业务逻辑全部在前端完成。

### 环境变量（前端 `frontend/.env`）

| 变量 | 说明 |
|---|---|
| `VITE_CLOUDBASE_ENV_ID` | CloudBase 环境 ID |
| `VITE_CLOUDBASE_REGION` | CloudBase 区域 |
| `VITE_CLOUDBASE_PUBLISH_KEY` | 发布密钥 |
| `VITE_OAUTH_RELAY_URL` | 登录中继地址 |
| `VITE_AI_BASE_URL` / `VITE_AI_MODEL` | AI 文案生成的网关与模型（可选） |
| `VITE_AI_API_KEY` | AI 密钥。**注意：VITE_ 前缀会被打进浏览器包，任何用户可提取，请勿使用高权限/计费无上限的密钥** |

## 目录结构

```
frontend/
  src/
    pages/      各页面（Index 地图主页、Timeline、Stats、Wishlist、Me、Checkin*、Login、SharePage）
    components/ 外壳（AppShell/MobileFrame/BottomNav/BottomSheet）+ UI 组件（shadcn/ui，脚手架生成，当前实际使用 16 个，其余为预留组件，不影响运行）
    lib/        cloudbase(云端SDK) / checkins(数据层) / guest(游客模式) / ai / tencent-lbs(地图) / auth
docs/
  产品方案.md        历史方案文档（开发前推演，部分已过时，以 frontend/src 代码为准）
  product/features.md 产品功能说明
generated-images/   UI 概念图（10 张）
```

## 技术栈

- **前端**：React 19 + Vite 7 + TypeScript 5.9 + Tailwind v4 + shadcn/ui(Radix) + TanStack Query v5 + framer-motion v12
- **数据**：腾讯云 CloudBase —— Auth v2 + PostgreSQL（RLS 行级安全）+ 对象存储
- **地图**：腾讯位置服务 GL API

## 常见问题

- **地图不显示？** 腾讯地图 Key 需把当前访问域名加入白名单，否则定位/打卡点加载失败。
- **游客模式和登录有什么区别？** 游客数据只在本机 `localStorage`；登录后数据写入云端并按用户隔离（RLS）。
- **AI 文案生成失败？** 未配置 `VITE_AI_API_KEY` 时会提示未配置；配置后仍报错多为网关/模型参数问题。

## 更新日志

- **v1.0** — 首版：地图主页、打卡/心愿、时间线、统计、游客模式、登录、精选分享。---

### 本页事实性陈述与代码依据（供复核）

| 陈述 | 依据 |
|---|---|
| 路由含 `/` `/timeline` `/stats` `/wishlist` `/me` `/checkin/new` `/checkin/:id` `/checkin/:id/edit` `/wish/new` `/login` `/share/:publicId` `/auth/callback` | `frontend/src/App.tsx` |
| 游客模式用 `localStorage`，key `tf_guest_checkins` | `frontend/src/lib/guest.ts` |
| 数据层前端直连 CloudBase（`db.from`/`rpc`），无独立后端 | `frontend/src/lib/checkins.ts`、`cloudbase.ts` |
| 设计令牌以 `frontend/src/index.css` 为准 | `frontend/src/index.css` |
| 预览命令 `vite preview` 绑定 4173 | `frontend/package.json` `scripts.preview` + `.cloudstudio` |
| 地图用腾讯位置服务 GL | `frontend/src/lib/tencent-lbs.ts` |
