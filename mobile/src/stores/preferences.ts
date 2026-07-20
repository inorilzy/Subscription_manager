import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { countActiveSubscriptions, getPreference, setPreference } from '../database/client'
import {
  type CurrencyCode,
  type LanguageCode,
  type MessageKey,
  type ThemeMode,
  isCurrencyCode,
  isLanguageCode,
  isThemeMode,
  localeForLanguage,
  translate,
} from '../i18n/messages'
import { formatMinorAmount as formatMoney } from '../domain/money'

export const usePreferencesStore = defineStore('preferences', () => {
  const language = ref<LanguageCode>('en')
  const theme = ref<ThemeMode>('light')
  const currency = ref<CurrencyCode>('USD')
  const loaded = ref(false)

  const locale = computed(() => localeForLanguage(language.value))

  function t(key: MessageKey, vars?: Record<string, string | number>): string {
    return translate(language.value, key, vars)
  }

  function formatAmount(minor: number, currencyCode = currency.value): string {
    return formatMoney(minor, currencyCode, locale.value)
  }

  function applyTheme(mode: ThemeMode) {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = mode
      document.documentElement.style.colorScheme = mode
    }
  }

  async function load(): Promise<void> {
    const [langRaw, themeRaw, currencyRaw] = await Promise.all([
      getPreference('language', 'en'),
      getPreference('theme', 'light'),
      getPreference('currency', 'USD'),
    ])
    language.value = isLanguageCode(langRaw) ? langRaw : 'en'
    theme.value = isThemeMode(themeRaw) ? themeRaw : 'light'
    currency.value = isCurrencyCode(currencyRaw) ? currencyRaw : 'USD'
    applyTheme(theme.value)
    loaded.value = true
  }

  async function setLanguage(next: LanguageCode): Promise<void> {
    language.value = next
    await setPreference('language', next)
  }

  async function setTheme(next: ThemeMode): Promise<void> {
    theme.value = next
    applyTheme(next)
    await setPreference('theme', next)
  }

  async function setCurrency(next: CurrencyCode): Promise<void> {
    currency.value = next
    await setPreference('currency', next)
  }

  async function requiresCurrencyWarning(next: CurrencyCode): Promise<boolean> {
    if (next === currency.value) return false
    const count = await countActiveSubscriptions()
    return count > 0
  }

  return {
    language,
    theme,
    currency,
    loaded,
    locale,
    t,
    formatAmount,
    load,
    setLanguage,
    setTheme,
    setCurrency,
    requiresCurrencyWarning,
    applyTheme,
  }
})
