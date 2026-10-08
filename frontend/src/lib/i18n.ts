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
  parseMissingKeyHandler: (key) => key,
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
