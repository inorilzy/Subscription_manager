<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { listSubscriptions } from '../application/subscriptions'
import { computeMonthStats, type MonthStats } from '../domain/stats'
import { usePreferencesStore } from '../stores/preferences'

const preferences = usePreferencesStore()
const stats = ref<MonthStats | null>(null)
const loaded = ref(false)

function deltaFor(currency: string): string {
  if (!stats.value) return ''
  const current = stats.value.totalsByCurrency.find((row) => row.currency === currency)?.amountMinor ?? 0
  const previous = stats.value.previousTotalsByCurrency.find((row) => row.currency === currency)?.amountMinor ?? 0
  const delta = current - previous
  if (delta === 0) {
    return preferences.language === 'zh-CN' ? '与上月持平' : 'Flat vs last month'
  }
  const formatted = preferences.formatAmount(Math.abs(delta), currency as never)
  if (delta > 0) {
    return preferences.language === 'zh-CN' ? `比上月多 ${formatted}` : `Up ${formatted} vs last month`
  }
  return preferences.language === 'zh-CN' ? `比上月少 ${formatted}` : `Down ${formatted} vs last month`
}

function maxCategory(currency: string): number {
  const group = stats.value?.categoriesByCurrency.find((row) => row.currency === currency)
  return group?.categories.reduce((max, item) => Math.max(max, item.amountMinor), 0) ?? 0
}

onMounted(async () => {
  const items = await listSubscriptions({ includeCancelled: true })
  stats.value = computeMonthStats(items)
  loaded.value = true
})
</script>

<template>
  <section class="space-y-4">
    <header class="flex items-center gap-3">
      <div class="rounded-2xl border-2 border-primary/30 bg-primary-container p-3 text-on-primary-container">
        <span class="font-headline text-xl font-extrabold">Σ</span>
      </div>
      <h1 class="font-headline text-3xl font-extrabold text-on-surface">
        {{ preferences.t('stats.title') }}
      </h1>
    </header>

    <div v-if="loaded && stats" class="tactile-card space-y-3 p-6 text-center">
      <p class="text-sm font-bold uppercase tracking-widest text-on-surface-variant">
        {{ preferences.t('stats.scheduled') }}
      </p>
      <div data-testid="stats-total" class="space-y-2">
        <div v-for="row in stats.totalsByCurrency" :key="row.currency">
          <p class="font-headline text-4xl font-extrabold text-error">
            {{ preferences.formatAmount(row.amountMinor, row.currency as never) }}
          </p>
          <p class="text-on-surface-variant" data-testid="stats-delta">{{ deltaFor(row.currency) }}</p>
        </div>
        <p v-if="stats.totalsByCurrency.length === 0" class="font-headline text-5xl font-extrabold text-error">
          {{ preferences.formatAmount(0) }}
        </p>
      </div>
      <p class="text-xs text-on-surface-variant">
        {{
          preferences.language === 'zh-CN'
            ? '不同币种分别统计，不做汇率换算。'
            : 'Amounts are grouped by currency with no FX conversion.'
        }}
      </p>
      <p v-if="stats.totalsByCurrency.length === 0" class="text-on-surface-variant">
        {{ preferences.t('stats.zeroBody') }}
      </p>
    </div>

    <div v-if="loaded && stats" class="tactile-card space-y-4 p-6">
      <h2 class="font-headline text-xl font-bold text-on-surface">
        {{ preferences.t('stats.categories') }}
      </h2>
      <p v-if="stats.categoriesByCurrency.length === 0" class="text-on-surface-variant">
        {{ preferences.t('stats.categoriesEmpty') }}
      </p>
      <div v-for="group in stats.categoriesByCurrency" :key="group.currency" class="space-y-3">
        <p class="text-sm font-bold uppercase tracking-wide text-primary">{{ group.currency }}</p>
        <div
          v-for="item in group.categories"
          :key="group.currency + item.category"
          class="space-y-1"
          data-testid="stats-category-row"
        >
          <div class="flex items-center justify-between text-sm font-bold">
            <span>{{ item.category }}</span>
            <span>{{ preferences.formatAmount(item.amountMinor, group.currency as never) }}</span>
          </div>
          <div class="h-3 overflow-hidden rounded-full border-2 border-surface-container-highest bg-surface-container-low">
            <div
              class="h-full bg-primary-container"
              :style="{ width: `${maxCategory(group.currency) ? (item.amountMinor / maxCategory(group.currency)) * 100 : 0}%` }"
            />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
