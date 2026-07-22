<script setup lang="ts">
import { CircleDollarSign, RefreshCw } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { fetchRemoteRates } from '../application/exchange-remote'
import PageTopBar from '../components/PageTopBar.vue'
import { DEFAULT_EXCHANGE_RATES, isValidRate } from '../domain/exchange'
import { SUPPORTED_CURRENCIES, type CurrencyCode } from '../i18n/messages'
import { usePreferencesStore } from '../stores/preferences'

const router = useRouter()
const preferences = usePreferencesStore()
const editableCurrencies = SUPPORTED_CURRENCIES.filter((code) => code !== 'CNY')
const rateDrafts = ref<Record<string, string>>({})
const rateMessage = ref<string | null>(null)
const ratesRefreshing = ref(false)

function syncRateDrafts() {
  const drafts: Record<string, string> = {}
  for (const code of editableCurrencies) {
    const stored = preferences.exchangeRates[code]
    const value = isValidRate(stored) ? stored : DEFAULT_EXCHANGE_RATES[code]
    drafts[code] = String(value)
  }
  rateDrafts.value = drafts
}

const ratesUpdatedLabel = computed(() => {
  const iso = preferences.exchangeRatesUpdatedAt
  if (!iso) {
    return preferences.language === 'zh-CN' ? '尚未从网络更新' : 'Not yet updated from network'
  }
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return preferences.language === 'zh-CN' ? '尚未从网络更新' : 'Not yet updated from network'
  }
  const formatted = new Intl.DateTimeFormat(preferences.locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
  return preferences.language === 'zh-CN' ? `上次更新：${formatted}` : `Last updated: ${formatted}`
})

onMounted(syncRateDrafts)

async function onRateChange(code: CurrencyCode, event: Event) {
  const raw = (event.target as HTMLInputElement).value.trim()
  const parsed = Number(raw)
  rateMessage.value = null
  if (!isValidRate(parsed)) {
    rateDrafts.value = { ...rateDrafts.value, [code]: String(preferences.resolvedRates[code]) }
    rateMessage.value =
      preferences.language === 'zh-CN'
        ? '汇率需为大于零的数字。'
        : 'Rate must be a number greater than zero.'
    return
  }
  rateDrafts.value = { ...rateDrafts.value, [code]: String(parsed) }
  await preferences.setExchangeRate(code, parsed)
  rateMessage.value = preferences.language === 'zh-CN' ? '汇率已更新。' : 'Exchange rate updated.'
}

async function onRefreshRates() {
  if (ratesRefreshing.value) return
  ratesRefreshing.value = true
  rateMessage.value = null
  try {
    const { rates, fetchedAt } = await fetchRemoteRates()
    await preferences.applyRemoteRates(rates, fetchedAt)
    syncRateDrafts()
    rateMessage.value =
      preferences.language === 'zh-CN' ? '已从网络更新汇率。' : 'Rates updated from network.'
  } catch {
    rateMessage.value =
      preferences.language === 'zh-CN'
        ? '更新失败，继续使用当前汇率。'
        : 'Update failed; keeping current rates.'
  } finally {
    ratesRefreshing.value = false
  }
}

async function goBack() {
  if (router.options.history.state.back) {
    router.back()
    return
  }
  await router.push({ name: 'settings' })
}
</script>

<template>
  <section class="focused-page">
    <PageTopBar
      :title="preferences.language === 'zh-CN' ? '汇率设置' : 'Exchange rates'"
      back
      :back-label="preferences.t('detail.back')"
      back-test-id="exchange-rates-back"
      @back="goBack"
    />

    <div class="page-content page-content-form">
      <h1 class="sr-only">
        {{ preferences.language === 'zh-CN' ? '汇率设置' : 'Exchange rates' }}
      </h1>

      <div class="tactile-card tactile-card-focus space-y-5 p-5 sm:p-6">
        <div class="flex min-w-0 items-start gap-3">
          <span class="icon-house icon-house-tertiary" aria-hidden="true">
            <CircleDollarSign :size="25" :stroke-width="2.4" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="font-headline font-bold text-on-surface">
              {{ preferences.language === 'zh-CN' ? '折合人民币' : 'Convert to CNY' }}
            </p>
            <p class="mt-1 text-sm leading-5 text-on-surface-variant">
              {{
                preferences.language === 'zh-CN'
                  ? '设置 1 单位外币折合多少人民币，用于估算首页合计。可手动修改或从网络更新。'
                  : 'Set the CNY value of one unit of each currency for the estimated Home total. Edit manually or update from the network.'
              }}
            </p>
          </div>
        </div>

        <div class="space-y-3" data-testid="settings-exchange-rates">
          <label
            v-for="code in editableCurrencies"
            :key="code"
            class="flex min-w-0 items-center gap-3 rounded-xl border-2 border-surface-container-highest bg-surface-container-low p-3"
            data-testid="settings-rate-row"
            :data-currency="code"
          >
            <span class="min-w-0 flex-1 text-sm font-bold text-on-surface">1 {{ code }} =</span>
            <input
              :value="rateDrafts[code]"
              data-testid="settings-rate-input"
              :data-currency="code"
              type="number"
              inputmode="decimal"
              min="0"
              step="0.0001"
              class="h-10 w-28 shrink-0 rounded-xl border-2 border-outline-variant bg-surface-container-lowest px-2 text-right text-sm font-bold text-on-surface"
              :aria-label="
                preferences.language === 'zh-CN'
                  ? `1 ${code} 折合多少人民币`
                  : `CNY value of 1 ${code}`
              "
              @change="onRateChange(code, $event)"
            />
            <span class="shrink-0 text-sm font-bold text-on-surface-variant">CNY</span>
          </label>
        </div>

        <button
          type="button"
          class="tactile-btn-secondary w-full px-4 py-2"
          data-testid="settings-rate-refresh"
          :disabled="ratesRefreshing"
          @click="onRefreshRates"
        >
          <RefreshCw
            :size="18"
            :stroke-width="2.6"
            aria-hidden="true"
            :class="ratesRefreshing ? 'animate-spin' : undefined"
          />
          {{
            ratesRefreshing
              ? preferences.language === 'zh-CN'
                ? '更新中…'
                : 'Updating…'
              : preferences.language === 'zh-CN'
                ? '从网络更新汇率'
                : 'Update rates from network'
          }}
        </button>

        <p class="text-xs text-on-surface-variant" data-testid="settings-rate-updated">
          {{ ratesUpdatedLabel }}
        </p>

        <p
          v-if="rateMessage"
          class="rounded-xl bg-surface-container-low p-3 text-sm font-bold text-on-surface"
          data-testid="settings-rate-message"
          role="status"
        >
          {{ rateMessage }}
        </p>
      </div>
    </div>
  </section>
</template>
