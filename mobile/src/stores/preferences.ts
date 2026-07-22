import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getPreference, setPreference } from '../database/client'
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
import { parseStoredRates, resolveRates, type ExchangeRates } from '../domain/exchange'

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export const usePreferencesStore = defineStore('preferences', () => {
  const language = ref<LanguageCode>('zh-CN')
  const theme = ref<ThemeMode>('system')
  const currency = ref<CurrencyCode>('CNY')
  const exchangeRates = ref<ExchangeRates>({})
  const exchangeRatesUpdatedAt = ref<string | null>(null)
  const loaded = ref(false)
  const resolvedTheme = ref<'light' | 'dark'>('light')

  const resolvedRates = computed(() => resolveRates(exchangeRates.value))

  let media: MediaQueryList | null = null
  let mediaHandler: ((event: MediaQueryListEvent) => void) | null = null

  const locale = computed(() => localeForLanguage(language.value))

  function t(key: MessageKey, vars?: Record<string, string | number>): string {
    return translate(language.value, key, vars)
  }

  function formatAmount(minor: number, currencyCode = currency.value): string {
    return formatMoney(minor, currencyCode, locale.value)
  }

  function paintLanguage(next: LanguageCode) {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = next
    }
  }

  function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
    if (mode === 'system') return systemPrefersDark() ? 'dark' : 'light'
    return mode
  }

  function paintTheme(mode: 'light' | 'dark') {
    resolvedTheme.value = mode
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = mode
      document.documentElement.style.colorScheme = mode
    }
  }

  function applyTheme(mode: ThemeMode = theme.value) {
    paintTheme(resolveTheme(mode))
  }

  function bindSystemThemeListener() {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    if (!media) {
      media = window.matchMedia('(prefers-color-scheme: dark)')
    }
    if (mediaHandler) {
      media.removeEventListener('change', mediaHandler)
      mediaHandler = null
    }
    if (theme.value !== 'system') return
    mediaHandler = () => {
      if (theme.value === 'system') applyTheme('system')
    }
    media.addEventListener('change', mediaHandler)
  }

  async function load(): Promise<void> {
    const [langRaw, themeRaw, currencyRaw, ratesRaw, ratesAtRaw] = await Promise.all([
      getPreference('language', 'zh-CN'),
      getPreference('theme', 'system'),
      getPreference('currency', 'CNY'),
      getPreference('exchange_rates', '{}'),
      getPreference('exchange_rates_updated_at', ''),
    ])
    language.value = isLanguageCode(langRaw) ? langRaw : 'zh-CN'
    paintLanguage(language.value)
    theme.value = isThemeMode(themeRaw) ? themeRaw : 'system'
    currency.value = isCurrencyCode(currencyRaw) ? currencyRaw : 'CNY'
    exchangeRates.value = parseStoredRates(ratesRaw)
    exchangeRatesUpdatedAt.value = ratesAtRaw || null
    applyTheme(theme.value)
    bindSystemThemeListener()
    loaded.value = true
  }

  async function setLanguage(next: LanguageCode): Promise<void> {
    language.value = next
    paintLanguage(next)
    await setPreference('language', next)
  }

  async function setTheme(next: ThemeMode): Promise<void> {
    theme.value = next
    applyTheme(next)
    bindSystemThemeListener()
    await setPreference('theme', next)
  }

  async function setCurrency(next: CurrencyCode): Promise<void> {
    currency.value = next
    await setPreference('currency', next)
  }

  async function setExchangeRate(code: CurrencyCode, rate: number): Promise<void> {
    exchangeRates.value = { ...exchangeRates.value, [code]: rate }
    await setPreference('exchange_rates', JSON.stringify(exchangeRates.value))
  }

  /** Merge fetched rates over the manual table and record when they arrived. */
  async function applyRemoteRates(rates: ExchangeRates, fetchedAt: string): Promise<void> {
    exchangeRates.value = { ...exchangeRates.value, ...rates }
    exchangeRatesUpdatedAt.value = fetchedAt
    await setPreference('exchange_rates', JSON.stringify(exchangeRates.value))
    await setPreference('exchange_rates_updated_at', fetchedAt)
  }

  return {
    language,
    theme,
    resolvedTheme,
    currency,
    exchangeRates,
    exchangeRatesUpdatedAt,
    resolvedRates,
    loaded,
    locale,
    t,
    formatAmount,
    load,
    setLanguage,
    setTheme,
    setCurrency,
    setExchangeRate,
    applyRemoteRates,
    applyTheme,
  }
})
