<script setup lang="ts">
import { ChartNoAxesColumn, ChartPie, Minus, TrendingDown, TrendingUp } from '@lucide/vue'
import { onMounted, ref } from 'vue'
import { listSubscriptions } from '../application/subscriptions'
import PageTopBar from '../components/PageTopBar.vue'
import { computeMonthStats, type MonthStats } from '../domain/stats'
import { usePreferencesStore } from '../stores/preferences'

const preferences = usePreferencesStore()
const stats = ref<MonthStats | null>(null)
const loaded = ref(false)

function deltaAmount(currency: string): number {
  if (!stats.value) return 0
  const current =
    stats.value.totalsByCurrency.find((row) => row.currency === currency)?.amountMinor ?? 0
  const previous =
    stats.value.previousTotalsByCurrency.find((row) => row.currency === currency)?.amountMinor ?? 0
  return current - previous
}

function deltaFor(currency: string): string {
  const delta = deltaAmount(currency)
  if (delta === 0) {
    return preferences.language === 'zh-CN' ? '与上月持平' : 'Flat vs last month'
  }
  const formatted = preferences.formatAmount(Math.abs(delta), currency as never)
  if (delta > 0) {
    return preferences.language === 'zh-CN' ? `比上月多 ${formatted}` : `Up ${formatted} vs last month`
  }
  return preferences.language === 'zh-CN' ? `比上月少 ${formatted}` : `Down ${formatted} vs last month`
}

function deltaIcon(currency: string) {
  const delta = deltaAmount(currency)
  if (delta > 0) return TrendingUp
  if (delta < 0) return TrendingDown
  return Minus
}

function deltaChipClass(currency: string): string {
  const delta = deltaAmount(currency)
  if (delta > 0) return 'bg-error-container text-on-error-container'
  if (delta < 0) return 'bg-primary-container/20 text-primary'
  return 'bg-surface-container text-on-surface-variant'
}

function barClass(index: number): string {
  return ['bg-secondary-container', 'bg-primary-container', 'bg-tertiary-container'][index % 3]!
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
  <section class="page">
    <PageTopBar title="SubScout" brand />

    <div class="page-content">
      <header class="flex items-center gap-3">
        <div class="icon-house icon-house-primary icon-house-lg">
          <ChartNoAxesColumn :size="31" :stroke-width="2.5" aria-hidden="true" />
        </div>
        <h1 class="page-heading">{{ preferences.t('stats.title') }}</h1>
      </header>

      <section
        v-if="loaded && stats"
        class="tactile-card tactile-card-strong stats-hero relative space-y-4 overflow-hidden p-6 text-center"
      >
        <p class="label-large relative z-10 tracking-[0.14em] text-on-surface-variant uppercase">
          {{ preferences.t('stats.scheduled') }}
        </p>
        <div data-testid="stats-total" class="relative z-10 space-y-5">
          <div v-for="row in stats.totalsByCurrency" :key="row.currency" class="space-y-3">
            <p class="min-w-0 max-w-full break-all font-headline text-[clamp(2.25rem,12vw,3rem)] leading-none font-extrabold tracking-[-0.02em] text-error">
              {{ preferences.formatAmount(row.amountMinor, row.currency as never) }}
            </p>
            <p
              class="chip-pill mx-auto w-max border-0"
              :class="deltaChipClass(row.currency)"
              data-testid="stats-delta"
            >
              <component :is="deltaIcon(row.currency)" :size="18" aria-hidden="true" />
              {{ deltaFor(row.currency) }}
            </p>
          </div>
          <p
            v-if="stats.totalsByCurrency.length === 0"
            class="min-w-0 max-w-full break-all font-headline text-[clamp(2.25rem,12vw,3rem)] leading-none font-extrabold tracking-[-0.02em] text-error"
          >
            {{ preferences.formatAmount(0) }}
          </p>
        </div>
        <p class="relative z-10 text-xs text-on-surface-variant">
          {{
            preferences.language === 'zh-CN'
              ? '不同币种分别统计，不做汇率换算。'
              : 'Amounts are grouped by currency with no FX conversion.'
          }}
        </p>
        <p
          v-if="stats.totalsByCurrency.length === 0"
          class="relative z-10 text-on-surface-variant"
        >
          {{ preferences.t('stats.zeroBody') }}
        </p>
      </section>

      <section v-if="loaded && stats" class="tactile-card tactile-card-strong space-y-6 p-6">
        <h2 class="flex items-center gap-2 font-headline text-2xl font-bold text-on-surface">
          <ChartPie :size="26" :stroke-width="2.4" class="text-secondary" aria-hidden="true" />
          {{ preferences.t('stats.categories') }}
        </h2>
        <p v-if="stats.categoriesByCurrency.length === 0" class="text-on-surface-variant">
          {{ preferences.t('stats.categoriesEmpty') }}
        </p>
        <div v-for="group in stats.categoriesByCurrency" :key="group.currency" class="space-y-4">
          <p class="label-small tracking-[0.12em] text-primary uppercase">{{ group.currency }}</p>
          <div
            v-for="(item, index) in group.categories"
            :key="group.currency + item.category"
            class="space-y-2"
            data-testid="stats-category-row"
          >
            <div class="flex items-center justify-between gap-4 font-bold">
              <span class="truncate text-on-surface">{{ item.category }}</span>
              <span class="shrink-0 text-on-surface-variant">
                {{ preferences.formatAmount(item.amountMinor, group.currency as never) }}
              </span>
            </div>
            <div class="h-6 overflow-hidden rounded-full bg-surface-container-highest">
              <div
                class="h-full rounded-full"
                :class="barClass(index)"
                :style="{
                  width: `${
                    maxCategory(group.currency)
                      ? (item.amountMinor / maxCategory(group.currency)) * 100
                      : 0
                  }%`,
                }"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  </section>
</template>
