<script setup lang="ts">
import { ChartPie, Minus, Plus, TrendingDown, TrendingUp } from '@lucide/vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getOverviewSnapshot, listSubscriptions } from '../application/subscriptions'
import CategoryDonutChart from '../components/CategoryDonutChart.vue'
import PageTopBar from '../components/PageTopBar.vue'
import {
  buildCategoryDonut,
  computeMonthStats,
  listCategoryDonutScopes,
  resolveDefaultCategoryDonutScope,
  type CategoryDonutScope,
  type MonthStats,
} from '../domain/stats'
import { totalInCnyMinor } from '../domain/exchange'
import { usePreferencesStore } from '../stores/preferences'

const router = useRouter()
const preferences = usePreferencesStore()
const activeCount = ref(0)
const stats = ref<MonthStats | null>(null)
const loaded = ref(false)
const categoryScope = ref<CategoryDonutScope>('cny')

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
    return preferences.language === 'zh-CN'
      ? `比上月多 ${formatted}`
      : `Up ${formatted} vs last month`
  }
  return preferences.language === 'zh-CN'
    ? `比上月少 ${formatted}`
    : `Down ${formatted} vs last month`
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

const cnyTotal = computed(() =>
  totalInCnyMinor(stats.value?.totalsByCurrency ?? [], preferences.resolvedRates),
)

/** Show the folded CNY total only when it adds information beyond a single CNY row. */
const showCnyTotal = computed(() => {
  const totals = stats.value?.totalsByCurrency ?? []
  const hasNonCny = totals.some((row) => row.currency !== 'CNY')
  return totals.length > 1 && hasNonCny
})

const categoryGroups = computed(() => stats.value?.categoriesByCurrency ?? [])

const categoryScopes = computed(() => listCategoryDonutScopes(categoryGroups.value))

const canUseCombinedCny = computed(
  () =>
    categoryScopes.value.length > 1 &&
    resolveDefaultCategoryDonutScope(categoryGroups.value, preferences.resolvedRates) === 'cny',
)

const showCategoryScopeSelect = computed(() => categoryScopes.value.length > 1)

const otherLabel = computed(() => (preferences.language === 'zh-CN' ? '其他' : 'Other'))

const categoryDonut = computed(() =>
  buildCategoryDonut(categoryGroups.value, {
    scope: categoryScope.value,
    rates: preferences.resolvedRates,
    otherLabel: otherLabel.value,
  }),
)

const categoryCenterLabel = computed(() => {
  if (categoryScope.value === 'cny') {
    return preferences.language === 'zh-CN' ? '折合合计' : 'Combined'
  }
  return preferences.language === 'zh-CN' ? '本月合计' : 'This month'
})

function syncCategoryScope() {
  categoryScope.value = resolveDefaultCategoryDonutScope(
    categoryGroups.value,
    preferences.resolvedRates,
  )
}

watch(
  () => [stats.value, preferences.resolvedRates] as const,
  () => {
    if (!stats.value) return
    const scopes = listCategoryDonutScopes(stats.value.categoriesByCurrency)
    const nextDefault = resolveDefaultCategoryDonutScope(
      stats.value.categoriesByCurrency,
      preferences.resolvedRates,
    )
    if (categoryScope.value === 'cny' && nextDefault !== 'cny') {
      categoryScope.value = nextDefault
      return
    }
    if (categoryScope.value !== 'cny' && !scopes.includes(String(categoryScope.value))) {
      categoryScope.value = nextDefault
    }
  },
)

async function reload() {
  const [snapshot, all] = await Promise.all([
    getOverviewSnapshot(),
    listSubscriptions({ includeCancelled: true }),
  ])
  activeCount.value = snapshot.activeCount
  stats.value = computeMonthStats(all)
  syncCategoryScope()
  loaded.value = true
}

onMounted(reload)

async function openCreate() {
  await router.push({ name: 'subscription-create' })
}

async function openExchangeRates() {
  await router.push({ name: 'settings-exchange-rates' })
}

function onCategoryScopeChange(event: Event) {
  categoryScope.value = (event.target as HTMLSelectElement).value
}

function formatDonutAmount(minor: number, currency: string): string {
  return preferences.formatAmount(minor, currency as never)
}
</script>

<template>
  <section class="page">
    <PageTopBar title="Subscription Manager" brand>
      <template #action>
        <button
          type="button"
          data-testid="add-subscription"
          class="icon-button border-primary bg-primary-container text-on-primary-container"
          :aria-label="preferences.t('subscriptions.addLong')"
          @click="openCreate"
        >
          <Plus :size="24" :stroke-width="2.8" aria-hidden="true" />
        </button>
      </template>
    </PageTopBar>

    <div v-if="loaded" class="page-content">
      <section
        class="tactile-card tactile-card-strong stats-hero relative space-y-5 overflow-hidden p-6"
      >
        <div class="relative z-10 space-y-1">
          <h1 class="page-heading-mobile text-on-surface">
            {{ preferences.t('overview.squad') }}
          </h1>
          <p class="text-on-surface-variant">
            {{ preferences.t('overview.greeting') }}
          </p>
        </div>

        <div
          class="relative z-10 rounded-xl border-2 border-surface-variant bg-surface-container-lowest p-4 text-center"
          style="border-bottom-width: 4px"
        >
          <p class="label-small tracking-[0.12em] text-on-surface-variant uppercase">
            {{ preferences.t('overview.active') }}
          </p>
          <p class="display-number text-primary" data-testid="overview-active-count">
            {{ activeCount }}
          </p>
        </div>

        <div
          class="relative z-10 rounded-xl border-2 border-surface-variant bg-surface-container-lowest p-4"
          style="border-bottom-width: 4px"
        >
          <p class="label-small tracking-[0.12em] text-on-surface-variant uppercase">
            {{ preferences.t('stats.scheduled') }}
          </p>

          <ul
            v-if="stats && stats.totalsByCurrency.length > 0"
            data-testid="overview-month-total"
            class="mt-3 space-y-2"
          >
            <li
              v-for="row in stats.totalsByCurrency"
              :key="row.currency"
              class="flex items-center justify-between gap-3 border-b border-surface-container-highest pb-2 last:border-0 last:pb-0"
              data-testid="overview-currency-row"
              :data-currency="row.currency"
            >
              <span class="label-small shrink-0 text-on-surface-variant">{{ row.currency }}</span>
              <span
                class="min-w-0 flex-1 truncate text-right font-headline text-xl font-extrabold text-error"
              >
                {{ preferences.formatAmount(row.amountMinor, row.currency as never) }}
              </span>
              <span
                class="chip-pill shrink-0 border-0 text-xs"
                :class="deltaChipClass(row.currency)"
                data-testid="overview-delta"
              >
                <component :is="deltaIcon(row.currency)" :size="15" aria-hidden="true" />
                {{ deltaFor(row.currency) }}
              </span>
            </li>
          </ul>

          <p
            v-else
            data-testid="overview-month-total"
            class="mt-3 font-headline text-2xl leading-tight font-extrabold text-error"
          >
            {{ preferences.formatAmount(0) }}
          </p>

          <div
            v-if="showCnyTotal"
            class="mt-3 flex items-center justify-between gap-3 rounded-lg bg-surface-container p-3"
            data-testid="overview-cny-total"
          >
            <span class="label-small text-on-surface-variant">
              {{ preferences.language === 'zh-CN' ? '≈ 折合合计' : '≈ Combined' }}
            </span>
            <span
              class="min-w-0 flex-1 truncate text-right font-headline text-lg font-extrabold text-on-surface"
            >
              {{ preferences.formatAmount(cnyTotal.cnyMinor, 'CNY') }}
            </span>
          </div>
          <p
            v-if="showCnyTotal && cnyTotal.missing.length > 0"
            class="mt-2 text-xs text-on-surface-variant"
            data-testid="overview-cny-missing"
          >
            {{
              preferences.language === 'zh-CN'
                ? `缺少汇率：${cnyTotal.missing.join('、')}，未计入合计。`
                : `Missing rates: ${cnyTotal.missing.join(', ')} - excluded from the total.`
            }}
          </p>
        </div>

        <p class="relative z-10 text-center text-xs text-on-surface-variant">
          {{
            showCnyTotal
              ? preferences.language === 'zh-CN'
                ? '各币种分别统计，折合合计按设置中的手动汇率估算。'
                : 'Currencies are tracked separately; the combined total is estimated with your manual rates.'
              : preferences.language === 'zh-CN'
                ? '不同币种分别统计，不做汇率换算。'
                : 'Amounts are grouped by currency with no FX conversion.'
          }}
        </p>
        <p
          v-if="activeCount === 0"
          class="relative z-10 text-center text-on-surface-variant"
          data-testid="overview-empty"
        >
          {{ preferences.t('overview.empty') }}
        </p>
      </section>

      <section
        v-if="stats && stats.categoriesByCurrency.length > 0"
        class="tactile-card space-y-4 p-5"
        data-testid="category-breakdown"
      >
        <div class="flex items-start justify-between gap-3">
          <h2
            class="flex min-w-0 items-center gap-2 font-headline text-xl font-bold text-on-surface"
          >
            <ChartPie :size="24" :stroke-width="2.4" class="text-secondary" aria-hidden="true" />
            {{ preferences.t('stats.categories') }}
          </h2>

          <label v-if="showCategoryScopeSelect" class="flex shrink-0 items-center gap-2">
            <span class="sr-only">
              {{ preferences.language === 'zh-CN' ? '分类统计口径' : 'Category amount basis' }}
            </span>
            <select
              data-testid="category-scope"
              class="h-10 max-w-[9.5rem] rounded-xl border-2 border-outline-variant bg-surface-container-low px-2 text-sm font-bold text-on-surface"
              :value="categoryScope"
              @change="onCategoryScopeChange"
            >
              <option v-if="canUseCombinedCny || categoryScope === 'cny'" value="cny">
                {{ preferences.language === 'zh-CN' ? '折合 CNY' : 'CNY combined' }}
              </option>
              <option v-for="code in categoryScopes" :key="code" :value="code">
                {{ code }}
              </option>
            </select>
          </label>
        </div>

        <p v-if="categoryScope === 'cny'" class="text-xs leading-4 text-on-surface-variant">
          {{
            preferences.language === 'zh-CN'
              ? '按设置中的手动汇率估算。'
              : 'Estimated with your manual exchange rates.'
          }}
          <button
            type="button"
            class="font-bold text-primary underline-offset-2 hover:underline"
            @click="openExchangeRates"
          >
            {{ preferences.language === 'zh-CN' ? '汇率设置' : 'Exchange rates' }}
          </button>
        </p>

        <p
          v-if="categoryDonut.missingRates.length > 0"
          class="rounded-xl bg-error-container p-3 text-sm font-bold text-on-error-container"
          role="alert"
          data-testid="category-donut-missing-rates"
        >
          {{
            preferences.language === 'zh-CN'
              ? `缺少汇率：${categoryDonut.missingRates.join('、')}，无法折合 CNY。`
              : `Missing rates: ${categoryDonut.missingRates.join(', ')}. Combined CNY is unavailable.`
          }}
        </p>

        <CategoryDonutChart
          :model="categoryDonut"
          :format-amount="formatDonutAmount"
          :center-label="categoryCenterLabel"
          :empty-label="preferences.language === 'zh-CN' ? '暂无分类' : 'No categories'"
        />
      </section>
    </div>
  </section>
</template>
