/**
 * AI 文案生成（OpenAI 兼容协议）。
 * 通过环境变量配置，未配置时优雅降级：
 *   VITE_AI_BASE_URL  —— 兼容 /v1/chat/completions 的网关（默认 OpenAI）
 *   VITE_AI_API_KEY   —— 调用密钥
 *   VITE_AI_MODEL     —— 模型名（默认 gpt-4o-mini）
 */
const BASE_URL = (import.meta.env.VITE_AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '')
const API_KEY = import.meta.env.VITE_AI_API_KEY || ''
const MODEL = import.meta.env.VITE_AI_MODEL || 'gpt-4o-mini'

export function aiConfigured(): boolean {
  return !!API_KEY
}

interface GeneratePromptArgs {
  placeName: string
  address?: string | null
  category: string
  visitDate?: string | null
  tags?: string[]
}

function buildMessages(args: GeneratePromptArgs) {
  const catLabel: Record<string, string> = {
    scenery: '自然风景',
    food: '美食',
    culture: '人文古迹',
    city: '城市地标',
    family: '亲子时光',
    outdoor: '户外探险',
  }
  const cat = catLabel[args.category] || '旅行'
  const when = args.visitDate ? `，日期大概是 ${args.visitDate}` : ''
  const where = args.address ? `，位于${args.address}` : ''
  const tagText = args.tags && args.tags.length ? `，同行标签：${args.tags.join('、')}` : ''

  return [
    {
      role: 'system',
      content:
        '你是一个温柔有画面感的旅行日记助手。请用第一人称写一段 40-80 字的中文旅行心情文案，' +
        '自然、克制、有细节，不要使用 emoji，不要使用标题或引号。',
    },
    {
      role: 'user',
      content: `我在「${args.placeName}」${where} 打卡，类型是${cat}${when}${tagText}。帮我写一段旅行心情。`,
    },
  ]
}

export async function generateCheckinText(args: GeneratePromptArgs): Promise<string> {
  if (!API_KEY) throw new Error('尚未配置 AI：请在 .env 中设置 VITE_AI_API_KEY')

  const resp = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: buildMessages(args),
      temperature: 0.8,
      // 豆包 seed 系列带思考过程（reasoning_content），上限放宽避免正文被截断
      max_tokens: 600,
    }),
  })

  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(`AI 调用失败 (${resp.status}): ${text.slice(0, 200)}`)
  }

  const data = await resp.json()
  const text: string = data?.choices?.[0]?.message?.content?.trim() || ''
  return text.replace(/^["'「]|["'」]$/g, '')
}

interface GenerateTagsArgs {
  placeName: string
  address?: string | null
  category: string
  moodText?: string | null
  existingTags?: string[]
}

/**
 * 根据地点与已有信息，让 AI 建议 2-4 个标签（逗号/顿号分隔或 JSON 数组皆可）。
 * 未配置密钥时抛错，由调用方优雅降级提示。
 */
export async function generateTags(args: GenerateTagsArgs): Promise<string[]> {
  if (!API_KEY) throw new Error('尚未配置 AI：请在 .env 中设置 VITE_AI_API_KEY')

  const catLabel: Record<string, string> = {
    scenery: '自然风景',
    food: '美食',
    culture: '人文古迹',
    city: '城市地标',
    family: '亲子时光',
    outdoor: '户外探险',
  }
  const cat = catLabel[args.category] || '旅行'
  const where = args.address ? `，位于${args.address}` : ''
  const mood = args.moodText ? `，他写下的心情是：${args.moodText}` : ''
  const existing = args.existingTags && args.existingTags.length ? `。已有标签：${args.existingTags.join('、')}` : ''

  const resp = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content:
            '你是一个旅行标签助手。给用户的一条打卡生成 2-4 个简短中文标签，' +
            '每个标签 2-6 个字，用逗号分隔，不要使用 emoji，不要输出解释或引号。',
        },
        {
          role: 'user',
          content: `我在「${args.placeName}」${where} 打卡，类型是${cat}${mood}${existing}。请给我几个合适的标签。`,
        },
      ],
      temperature: 0.7,
      max_tokens: 200,
    }),
  })

  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(`AI 调用失败 (${resp.status}): ${text.slice(0, 200)}`)
  }

  const data = await resp.json()
  const raw: string = data?.choices?.[0]?.message?.content?.trim() || ''

  // 优先按 JSON 数组解析，失败则退化为按分隔符拆分
  try {
    const arr = JSON.parse(raw)
    if (Array.isArray(arr)) return arr.map(String).filter(Boolean).slice(0, 6)
  } catch {
    /* ignore */
  }
  return raw
    .split(/[,，、]/)
    .map((s) => s.replace(/^["'\[『「]|["'\]』」]$/g, '').trim())
    .filter(Boolean)
    .slice(0, 6)
}
