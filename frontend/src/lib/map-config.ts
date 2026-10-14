/**
 * 腾讯地图 Key 配置
 *
 * 默认使用内置 Key（已配置好域名白名单）。部署到新域名或 Key 失效时，
 * 可通过构建期环境变量 VITE_TENCENT_MAP_KEY 覆盖，无需改动代码。
 */

/** 内置默认 Key（已配置好域名白名单，开箱即用）。 */
const DEFAULT_KEY = 'SLFBZ-TELYZ-FCEXY-ZSJNE-Z5FMF-ADBLT'

const envKey = (import.meta.env as Record<string, string | undefined>).VITE_TENCENT_MAP_KEY

/** 当前生效的地图 Key（环境变量优先，缺省回退内置）。 */
export const TENCENT_MAP_KEY = (envKey ?? DEFAULT_KEY).trim()

/** 占位符清单：命中任一视为「未配置」，用于提前给出明确引导而非白屏。 */
const PLACEHOLDER_RE = /^(your_?key|replace_?me|<.*>|undefined|null)$/i

/** Key 是否已有效配置（空值或占位符视为未配置）。 */
export function isMapKeyConfigured(): boolean {
  const k = TENCENT_MAP_KEY
  return k.length >= 8 && !PLACEHOLDER_RE.test(k)
}
