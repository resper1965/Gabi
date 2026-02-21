/**
 * Gabi Hub — Lightweight i18n
 * Simple t(key) function with pt-BR as default locale.
 * 
 * Usage:
 * ```ts
 * import { t } from "@/lib/i18n"
 * t("chat.placeholder") // → "Digite sua mensagem..."
 * ```
 * 
 * To change locale at runtime:
 * ```ts
 * import { setLocale } from "@/lib/i18n"
 * setLocale("en")
 * ```
 */

import ptBR from "@/locales/pt-BR.json"
import en from "@/locales/en.json"

type LocaleKey = keyof typeof ptBR

const locales: Record<string, Record<string, string>> = {
  "pt-BR": ptBR,
  en,
}

let currentLocale = "pt-BR"

/**
 * Set the active locale.
 */
export function setLocale(locale: string): void {
  if (locales[locale]) {
    currentLocale = locale
  }
}

/**
 * Get the current locale code.
 */
export function getLocale(): string {
  return currentLocale
}

/**
 * Translate a key. Falls back to pt-BR, then to the key itself.
 */
export function t(key: LocaleKey | string): string {
  const strings = locales[currentLocale] || locales["pt-BR"]
  return strings[key] || locales["pt-BR"][key] || key
}
