<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { listCategories } from '../application/categories'
import { listSubscriptions } from '../application/subscriptions'
import { cycleProgress, dailyAmountMinor } from '../domain/billing'
import { todayDateOnly } from '../domain/clock'
import {
  DEFAULT_FILTERS,
  filterSubscriptions,
  hasActiveFilters,
  type SubscriptionFilters,
} from '../domain/filters'
import { relativeBillingLabel, type Subscription } from '../domain/subscription'
import { usePreferencesStore } from '../stores/preferences'

const router = useRouter()
const preferences = usePreferencesStore()
const allItems = ref<Subscription[]>([])
const categories = ref<string[]>([])
const filters = ref<SubscriptionFilters>({ ...DEFAULT_FILTERS })
const loaded = ref(false)

const visible = computed(() => filterSubscriptions(allItems.value, filters.value))
const filtering = computed(() => hasActiveFilters(filters.value))

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

function dailyLabel(item: Subscription) {
  const perDay = dailyAmountMinor(
    item.amountMinor,
    item.nextBillingDate,
    item.billingInterval,
    item.billingAnchorDay,
  )
  return preferences.t('common.perDay', {
    amount: preferences.formatAmount(Math.round(perDay), item.currency as never),
  })
}

async function reload() {
  allItems.value = await listSubscriptions({ includeCancelled: true })
  categories.value = await listCategories()
  loaded.value = true
}

onMounted(reload)

function clearFilters() {
  filters.value = { ...DEFAULT_FILTERS }
}

async function openCreate() {
  await router.push({ name: 'subscription-create' })
}

async function openDetail(id: string) {
  await router.push({ name: 'subscription-detail', params: { id } })
}
</script>

<template>
  <section class="space-y-4">
    <header class="flex items-start justify-between gap-3">
      <div class="space-y-1">
        <h1 class="font-headline text-3xl font-extrabold text-primary">
          {{ preferences.t('subscriptions.title') }}
        </h1>
        <p class="text-on-surface-variant">{{ preferences.t('subscriptions.subtitle') }}</p>
      </div>
      <button
        type="button"
        data-testid="add-subscription"
        class="tactile-btn px-4 py-3"
        @click="openCreate"
      >
        {{ preferences.t('subscriptions.add') }}
      </button>
    </header>

    <div v-if="loaded && allItems.length > 0" class="tactile-card space-y-3 p-4">
      <input
        v-model="filters.query"
        data-testid="subscription-search"
        type="search"
        class="w-full rounded-xl border-2 border-surface-container-highest bg-surface-container-lowest px-3 py-3"
        :placeholder="preferences.language === 'zh-CN' ? '按名称搜索' : 'Search by name'"
        :aria-label="preferences.language === 'zh-CN' ? '按名称搜索订阅' : 'Search subscriptions by name'"
      />
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <select
          v-model="filters.status"
          data-testid="filter-status"
          class="rounded-xl border-2 border-surface-container-highest bg-surface-container-lowest px-3 py-2"
          :aria-label="preferences.language === 'zh-CN' ? '按状态筛选' : 'Filter by status'"
        >
          <option value="all">{{ preferences.language === 'zh-CN' ? '全部状态' : 'All statuses' }}</option>
          <option value="active">{{ preferences.t('detail.active') }}</option>
          <option value="cancelled">{{ preferences.t('detail.cancelled') }}</option>
        </select>
        <select
          v-model="filters.category"
          data-testid="filter-category"
          class="rounded-xl border-2 border-surface-container-highest bg-surface-container-lowest px-3 py-2"
          :aria-label="preferences.language === 'zh-CN' ? '按分类筛选' : 'Filter by category'"
        >
          <option value="all">{{ preferences.language === 'zh-CN' ? '全部分类' : 'All categories' }}</option>
          <option v-for="item in categories" :key="item" :value="item">{{ item }}</option>
        </select>
        <select
          v-model="filters.billingInterval"
          data-testid="filter-interval"
          class="rounded-xl border-2 border-surface-container-highest bg-surface-container-lowest px-3 py-2"
          :aria-label="preferences.language === 'zh-CN' ? '按扣费周期筛选' : 'Filter by billing cycle'"
        >
          <option value="all">{{ preferences.language === 'zh-CN' ? '全部周期' : 'All cycles' }}</option>
          <option value="monthly">{{ preferences.t('common.monthly') }}</option>
          <option value="yearly">{{ preferences.t('common.yearly') }}</option>
        </select>
      </div>
      <button
        v-if="filtering"
        type="button"
        class="text-sm font-bold text-primary"
        data-testid="clear-filters"
        @click="clearFilters"
      >
        {{ preferences.language === 'zh-CN' ? '清除筛选' : 'Clear filters' }}
      </button>
    </div>

    <div v-if="loaded && allItems.length === 0" class="tactile-card space-y-3 p-6 text-center">
      <p class="font-headline text-xl font-bold text-on-surface">
        {{ preferences.t('subscriptions.emptyTitle') }}
      </p>
      <p class="text-on-surface-variant">{{ preferences.t('subscriptions.emptyBody') }}</p>
      <button
        type="button"
        class="tactile-btn mx-auto px-5 py-3"
        data-testid="add-subscription-empty"
        @click="openCreate"
      >
        {{ preferences.t('subscriptions.addLong') }}
      </button>
    </div>

    <div
      v-else-if="loaded && visible.length === 0"
      class="tactile-card space-y-3 p-6 text-center"
      data-testid="no-results"
    >
      <p class="font-headline text-xl font-bold">
        {{ preferences.language === 'zh-CN' ? '没有匹配结果' : 'No matching subscriptions' }}
      </p>
      <button type="button" class="tactile-btn mx-auto px-5 py-3" data-testid="clear-filters-empty" @click="clearFilters">
        {{ preferences.language === 'zh-CN' ? '清除筛选' : 'Clear filters' }}
      </button>
    </div>

    <ul v-else-if="loaded" class="space-y-3" data-testid="subscription-list">
      <li v-for="item in visible" :key="item.id">
        <button
          type="button"
          class="tactile-card w-full space-y-2 p-4 text-left"
          data-testid="subscription-item"
          :data-id="item.id"
          :data-interval="item.billingInterval"
          :data-status="item.status"
          @click="openDetail(item.id)"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-xs font-bold uppercase tracking-wide text-primary">
                {{ item.category }}
              </p>
              <p class="font-headline text-xl font-bold text-on-surface">{{ item.name }}</p>
            </div>
            <div class="text-right">
              <p class="font-headline text-xl font-extrabold text-error">
                {{ preferences.formatAmount(item.amountMinor, item.currency as never) }}
              </p>
              <p class="text-xs font-bold text-on-surface-variant" data-testid="subscription-daily">
                {{ dailyLabel(item) }}
              </p>
            </div>
          </div>

          <div
            v-if="item.status === 'active'"
            class="space-y-1"
            data-testid="subscription-progress"
          >
            <div
              class="h-3 overflow-hidden rounded-full border-2 border-surface-container-highest bg-surface-container-low"
              role="progressbar"
              :aria-valuenow="Math.round(progressFor(item).fraction * 100)"
              aria-valuemin="0"
              aria-valuemax="100"
              :aria-label="`${item.name} billing cycle progress`"
            >
              <div
                class="h-full rounded-full bg-primary-container transition-all"
                :style="{ width: `${Math.round(progressFor(item).fraction * 100)}%` }"
              />
            </div>
            <p class="text-xs text-on-surface-variant">
              {{ preferences.t('common.daysLeft', { n: progressFor(item).daysLeft }) }}
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
            <span
              class="cycle-badge"
              :class="item.billingInterval === 'yearly' ? 'cycle-badge-yearly' : 'cycle-badge-monthly'"
              data-testid="billing-cycle-badge"
            >
              {{ cycleLabel(item.billingInterval) }}
            </span>
            <span>·</span>
            <span>{{ item.nextBillingDate }}</span>
            <span>·</span>
            <span>{{ countdown(item.nextBillingDate) }}</span>
            <span>·</span>
            <span>{{ item.status === 'active' ? preferences.t('detail.active') : preferences.t('detail.cancelled') }}</span>
          </div>
        </button>
      </li>
    </ul>
  </section>
</template>
