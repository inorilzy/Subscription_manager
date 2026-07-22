<script setup lang="ts">
import { ChartPie, Minus, Plus, TrendingDown, TrendingUp } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getOverviewSnapshot, listSubscriptions } from '../application/subscriptions'
import BillingProgressBar from '../components/BillingProgressBar.vue'
import PageTopBar from '../components/PageTopBar.vue'
import SubscriptionIcon from '../components/SubscriptionIcon.vue'
import { cycleProgress } from '../domain/billing'
import { todayDateOnly } from '../domain/clock'
import { computeMonthStats, type MonthStats } from '../domain/stats'
import { totalInCnyMinor } from '../domain/exchange'
import { relativeBillingLabel, type Subscription } from '../domain/subscription'
import { usePreferencesStore } from '../stores/preferences'

const router = useRouter()
const preferences = usePreferencesStore()
const activeCount = ref(0)
const upcoming = ref<Subscription[]>([])
const stats = ref<MonthStats | null>(null)
const loaded = ref(false)

function cycleLabel(interval: Subscription['billingInterval']) {
  return interval === 'yearly' ? preferences.t('common.yearly') : preferences.t('common.monthly')
}

function countdown(date: string) {
  return relativeBillingLabel(date, {
    format: (days) => {
      if (days === 0) return preferences.t('common.today')
      if (days === 1) return preferences.t('common.inOneDay')
      if (days > 1) return preferences.t('common.inDays', { n: days })
      if (days === -1) return preferences.t('common.oneDayAgo')
      return preferences.t('common.daysAgo', { n: Math.abs(days) })
    },
  })
}

function progressFor(item: Subscription) {
  return cycleProgress(
    item.nextBillingDate,
    item.billingInterval,
    item.billingAnchorDay,
    todayDateOnly(),
  )
}

function urgencyClass(item: Subscription): string {
  const days = progressFor(item).daysLeft
  if (days <= 3) return 'border-error/20 bg-error-container text-on-error-container'
  if (days <= 14)
    return 'border-tertiary-container/30 bg-tertiary-fixed text-on-tertiary-fixed-variant'
  return 'border-secondary-fixed-dim/30 bg-secondary-fixed text-on-secondary-fixed-variant'
}

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

function barClass(index: number): string {
  return ['bg-secondary-container', 'bg-primary-container', 'bg-tertiary-container'][index % 3]!
}

function maxCategory(currency: string): number {
  const group = stats.value?.categoriesByCurrency.find((row) => row.currency === currency)
  return group?.categories.reduce((max, item) => Math.max(max, item.amountMinor), 0) ?? 0
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

async function reload() {
  const [snapshot, all] = await Promise.all([
    getOverviewSnapshot(),
    listSubscriptions({ includeCancelled: true }),
  ])
  activeCount.value = snapshot.activeCount
  upcoming.value = snapshot.upcoming
  stats.value = computeMonthStats(all)
  loaded.value = true
}

onMounted(reload)

async function openCreate() {
  await router.push({ name: 'subscription-create' })
}

async function openDetail(id: string) {
  await router.push({ name: 'subscription-detail', params: { id } })
}

async function seeAll() {
  await router.push({ name: 'subscriptions' })
}
</script>

<template>
  <section class="page">
    <PageTopBar title="SubScout" brand>
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
                : `Missing rates: ${cnyTotal.missing.join(', ')} — excluded from the total.`
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
        class="tactile-card space-y-6 p-6"
      >
        <h2 class="flex items-center gap-2 font-headline text-2xl font-bold text-on-surface">
          <ChartPie :size="26" :stroke-width="2.4" class="text-secondary" aria-hidden="true" />
          {{ preferences.t('stats.categories') }}
        </h2>
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

      <section class="space-y-4">
        <div class="flex items-end justify-between gap-3">
          <h2 class="font-headline text-2xl font-bold text-on-surface">
            {{ preferences.t('overview.upcoming') }}
          </h2>
          <button
            type="button"
            class="label-small rounded-lg px-2 py-1 text-primary"
            data-testid="overview-see-all"
            @click="seeAll"
          >
            {{ preferences.language === 'zh-CN' ? '查看全部' : 'See all' }}
          </button>
        </div>

        <p
          v-if="upcoming.length === 0"
          class="tactile-card p-5 text-center text-on-surface-variant"
          data-testid="overview-upcoming-empty"
        >
          {{ preferences.language === 'zh-CN' ? '暂无即将扣费项目。' : 'No upcoming payments.' }}
        </p>

        <div class="space-y-4">
          <button
            v-for="item in upcoming"
            :key="item.id"
            type="button"
            class="tactile-card pressable w-full space-y-3 p-4 text-left"
            data-testid="overview-upcoming-item"
            @click="openDetail(item.id)"
          >
            <div class="flex items-center justify-between gap-3">
              <div class="flex min-w-0 items-center gap-3">
                <SubscriptionIcon
                  :category="item.category"
                  :name="item.name"
                  :icon-key="item.iconKey"
                />
                <div class="min-w-0">
                  <p class="truncate font-headline text-lg font-bold text-on-surface">
                    {{ item.name }}
                  </p>
                  <p class="label-small text-on-surface-variant">
                    {{ preferences.formatAmount(item.amountMinor, item.currency as never) }}
                    / {{ cycleLabel(item.billingInterval) }}
                  </p>
                  <p
                    v-if="item.accountLabel"
                    class="truncate text-xs font-bold text-on-surface-variant"
                    data-testid="subscription-account"
                  >
                    {{ item.accountLabel }}
                  </p>
                </div>
              </div>
              <span class="chip-pill shrink-0" :class="urgencyClass(item)">
                {{ countdown(item.nextBillingDate) }}
              </span>
            </div>

            <BillingProgressBar
              :progress="progressFor(item)"
              :label="`${item.name} billing cycle remaining`"
              :test-id="`overview-progress-${item.id}`"
            />
            <p class="text-sm text-on-surface-variant">{{ item.nextBillingDate }}</p>
          </button>
        </div>
      </section>

      <button
        type="button"
        data-testid="add-subscription-bottom"
        class="tactile-btn w-full py-4 text-lg"
        @click="openCreate"
      >
        <Plus :size="23" :stroke-width="2.8" aria-hidden="true" />
        {{ preferences.t('subscriptions.addLong') }}
      </button>
    </div>
  </section>
</template>
