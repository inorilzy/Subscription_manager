<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { listSubscriptions } from '../application/subscriptions'
import { computeMonthStats, type MonthStats } from '../domain/stats'
import { usePreferencesStore } from '../stores/preferences'

const preferences = usePreferencesStore()
const stats = ref<MonthStats | null>(null)
const loaded = ref(false)

const deltaLabel = computed(() => {
  if (!stats.value) return ''
  const delta = stats.value.deltaMinor
  if (delta === 0) {
    return preferences.language === 'zh-CN' ? '与上月持平' : 'Flat vs last month'
  }
  const formatted = preferences.formatAmount(Math.abs(delta))
  if (delta > 0) {
    return preferences.language === 'zh-CN' ? `比上月多 ${formatted}` : `Up ${formatted} vs last month`
  }
  return preferences.language === 'zh-CN' ? `比上月少 ${formatted}` : `Down ${formatted} vs last month`
})

const maxCategory = computed(() =>
  stats.value?.categories.reduce((max, item) => Math.max(max, item.amountMinor), 0) ?? 0,
)

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
      <p class="font-headline text-5xl font-extrabold text-error" data-testid="stats-total">
        {{ preferences.formatAmount(stats.totalMinor) }}
      </p>
      <p class="text-on-surface-variant" data-testid="stats-delta">{{ deltaLabel }}</p>
      <p class="text-xs text-on-surface-variant">
        {{
          preferences.language === 'zh-CN'
            ? '本指标统计本月实际扣费发生额，不同于概览中的标准化月均成本。'
            : 'This is actual scheduled cash flow this month, not the normalized monthly recurring cost on Overview.'
        }}
      </p>
      <p v-if="stats.totalMinor === 0" class="text-on-surface-variant">
        {{ preferences.t('stats.zeroBody') }}
      </p>
    </div>

    <div v-if="loaded && stats" class="tactile-card space-y-3 p-6">
      <h2 class="font-headline text-xl font-bold text-on-surface">
        {{ preferences.t('stats.categories') }}
      </h2>
      <p v-if="stats.categories.length === 0" class="text-on-surface-variant">
        {{ preferences.t('stats.categoriesEmpty') }}
      </p>
      <div
        v-for="item in stats.categories"
        :key="item.category"
        class="space-y-1"
        data-testid="stats-category-row"
      >
        <div class="flex items-center justify-between text-sm font-bold">
          <span>{{ item.category }}</span>
          <span>{{ preferences.formatAmount(item.amountMinor) }}</span>
        </div>
        <div class="h-3 overflow-hidden rounded-full border-2 border-surface-container-highest bg-surface-container-low">
          <div
            class="h-full bg-primary-container"
            :style="{ width: `${maxCategory ? (item.amountMinor / maxCategory) * 100 : 0}%` }"
          />
        </div>
      </div>
    </div>
  </section>
</template>
