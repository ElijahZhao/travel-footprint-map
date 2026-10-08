#!/usr/bin/env bash
# 一键部署到 CloudBase 静态网站托管（无需扫码）。
# 前提：.env.tcb 中存在 CLOUDBASE_API_KEY（服务端 API Key，已 gitignore 不提交）。
set -euo pipefail

cd "$(dirname "$0")/.."

ENV_ID=travel-footprint-d8em6aa6331d820
API_KEY="$(grep '^CLOUDBASE_API_KEY=' .env.tcb | cut -d= -f2-)"

if [ -z "$API_KEY" ]; then
  echo "错误：未在 .env.tcb 找到 CLOUDBASE_API_KEY，请先把服务端 API Key 填进去。" >&2
  exit 1
fi

export TCB_TRACKING=false

# 用服务端密钥非交互登录（已登录则自动跳过）
tcb login --cloudbase-api-key "$API_KEY" -e "$ENV_ID" >/dev/null 2>&1 || true

echo "==> 构建前端..."
( cd frontend && pnpm build )

echo "==> 上传到 CloudBase 静态托管..."
tcb hosting deploy ./frontend/dist -e "$ENV_ID"

echo "==> 完成。访问：https://${ENV_ID}-1495478913.tcloudbaseapp.com/"
