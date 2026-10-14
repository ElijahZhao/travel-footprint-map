#!/usr/bin/env bash
# 数据库「保活 + 自愈」校验脚本。
# - 每次部署后运行：探测 checkins 表对 REST 网关是否可达。
# - 若不可达（HTTP 404，即表丢失 / schema 缓存失效），自动重新应用迁移恢复。
# 真正的「防止实例被挂起」由 CloudBase 定时云函数 keepalive-db（每 5 分钟）负责，
# 本脚本负责「万一表真的没了」时的兜底自愈。
set -euo pipefail

cd "$(dirname "$0")/.."

ENV_ID="$(grep '^CLOUDBASE_ENV_ID=' .env.tcb | cut -d= -f2-)"
API_KEY="$(grep '^CLOUDBASE_API_KEY=' .env.tcb | cut -d= -f2-)"
PUB_KEY="$(grep '^CLOUDBASE_PUBLISH_KEY=' .env.tcb | cut -d= -f2-)"
URL="https://${ENV_ID}.api.tcloudbasegateway.com/v1/rdb/rest/checkins?select=id&limit=1"

code=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer ${PUB_KEY}" "$URL")

if [ "$code" = "200" ]; then
  echo "✓ 数据库 checkins 表可达 (HTTP 200)"
  exit 0
fi

echo "✗ checkins 表不可达 (HTTP ${code})，尝试重新应用迁移以恢复..."
tcb login --cloudbase-api-key "$API_KEY" -e "$ENV_ID" >/dev/null 2>&1 || true
tcb db pg migration up -e "$ENV_ID"

# 重新探测确认恢复
code=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer ${PUB_KEY}" "$URL")
if [ "$code" = "200" ]; then
  echo "✓ 已恢复，checkins 表可达 (HTTP 200)"
else
  echo "✗ 自愈失败 (HTTP ${code})，请到 CloudBase 控制台手动执行「刷新 API schema」" >&2
  exit 1
fi
