import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en'

const SAVED_KEY = 'tf_lang'

function getSavedLang(): 'zh' | 'en' {
  if (typeof localStorage === 'undefined') return 'zh'
  const v = localStorage.getItem(SAVED_KEY)
  return v === 'en' ? 'en' : 'zh'
}

// 采用「中文即 key」策略：中文（zh）直接回退为 key 本身，
// 仅需维护英文映射。缺失的英文 key 会自动显示中文原文。
i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
  },
  lng: getSavedLang(),
  fallbackLng: 'zh',
  returnNull: false,
  interpolation: { escapeValue: false },
  // 中文模式下缺失 key 直接回退为中文原文（key 本身）。
  // 注意：i18next 对「缺失 key 回退」不做插值替换，这里手动补上 {{var}} 替换，
  // 否则形如 "{{count}} 个足迹" 的词条会原样显示花括号。
  parseMissingKeyHandler: (key, _fallbackNs, options) => {
    if (!options) return key
    return key.replace(/\{\{(\w+)\}\}/g, (m, name) =>
      name in options ? String(options[name]) : m,
    )
  },
})

export type Lang = 'zh' | 'en'

export function setLanguage(lng: Lang) {
  i18n.changeLanguage(lng)
  try {
    localStorage.setItem(SAVED_KEY, lng)
  } catch {
    // 隐私模式等场景忽略写入失败
  }
}

export function getLanguage(): Lang {
  return (i18n.language as Lang) || 'zh'
}

export default i18n
