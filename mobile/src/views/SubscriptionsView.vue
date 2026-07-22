<script setup lang="ts">
import { ArrowUpDown, ChevronRight, Plus, Search, SlidersHorizontal } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { listCategories } from '../application/categories'
import { listSubscriptions } from '../application/subscriptions'
import BillingProgressBar from '../components/BillingProgressBar.vue'
import PageTopBar from '../components/PageTopBar.vue'
import SubscriptionIcon from '../components/SubscriptionIcon.vue'
import { cycleProgress, dailyAmountMinor } from '../domain/billing'
import { todayDateOnly } from '../domain/clock'
import {
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  filterSubscriptions,
  hasActiveFilters,
  sortSubscriptions,
  type SubscriptionFilters,
  type SubscriptionSort,
} from '../domain/filters'
import { relativeBillingLabel, type Subscription } from '../domain/subscription'
import { usePreferencesStore } from '../stores/preferences'

const router = useRouter()
const preferences = usePreferencesStore()
const allItems = ref<Subscription[]>([])
const categories = ref<string[]>([])
const filters = ref<SubscriptionFilters>({ ...DEFAULT_FILTERS })
const sort = ref<SubscriptionSort>(DEFAULT_SORT)
const loaded = ref(false)
const showFilters = ref(false)

const visible = computed(() =>
  sortSubscriptions(
    filterSubscriptions(allItems.value, filters.value),
    sort.value,
    preferences.resolvedRates,
  ),
)
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
  <section class="page">
    <PageTopBar :title="preferences.t('subscriptions.title')">
      <template #action>
        <button
          type="button"
          class="icon-button border-primary bg-primary-container text-on-primary-container"
          data-testid="add-subscription"
          :aria-label="preferences.t('subscriptions.addLong')"
          @click="openCreate"
        >
          <Plus :size="24" :stroke-width="2.8" aria-hidden="true" />
        </button>
      </template>
    </PageTopBar>

    <div class="page-content page-content-narrow">
      <section v-if="loaded && allItems.length > 0" class="space-y-3">
        <div class="flex flex-wrap gap-3">
          <label class="relative min-w-[200px] basis-full sm:flex-1">
            <Search
              :size="22"
              :stroke-width="2.3"
              class="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-on-surface-variant"
              aria-hidden="true"
            />
            <input
              v-model="filters.query"
              data-testid="subscription-search"
              type="search"
              class="field-recessed rounded-full pr-4 pl-12"
              :placeholder="
                preferences.language === 'zh-CN' ? '搜索名称或账号…' : 'Search name or account…'
              "
              :aria-label="
                preferences.language === 'zh-CN'
                  ? '按名称或账号搜索订阅'
                  : 'Search subscriptions by name or account'
              "
            />
          </label>

          <label class="relative min-w-[10.5rem] flex-1">
            <ArrowUpDown
              :size="20"
              :stroke-width="2.4"
              class="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-on-surface-variant"
              aria-hidden="true"
            />
            <select
              v-model="sort"
              data-testid="subscription-sort"
              class="field-recessed rounded-full pr-9 pl-11 text-sm font-bold"
              :aria-label="preferences.language === 'zh-CN' ? '订阅排序方式' : 'Sort subscriptions'"
            >
              <option value="next-asc">
                {{ preferences.language === 'zh-CN' ? '下次扣费：最近' : 'Next billing: soonest' }}
              </option>
              <option value="next-desc">
                {{ preferences.language === 'zh-CN' ? '下次扣费：最晚' : 'Next billing: latest' }}
              </option>
              <option value="price-desc">
                {{ preferences.language === 'zh-CN' ? '价格：从高到低' : 'Price: high to low' }}
              </option>
              <option value="price-asc">
                {{ preferences.language === 'zh-CN' ? '价格：从低到高' : 'Price: low to high' }}
              </option>
              <option value="name-asc">
                {{ preferences.language === 'zh-CN' ? '名称：A–Z' : 'Name: A–Z' }}
              </option>
              <option value="name-desc">
                {{ preferences.language === 'zh-CN' ? '名称：Z–A' : 'Name: Z–A' }}
              </option>
            </select>
          </label>

          <button
            type="button"
            class="tactile-btn-secondary pill-button"
            :aria-expanded="showFilters || filtering"
            @click="showFilters = !showFilters"
          >
            <SlidersHorizontal :size="21" aria-hidden="true" />
            {{ preferences.language === 'zh-CN' ? '筛选' : 'Filter' }}
          </button>
        </div>

        <div v-show="showFilters || filtering" class="tactile-card space-y-3 p-4">
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <select
              v-model="filters.status"
              data-testid="filter-status"
              class="field-recessed"
              :aria-label="preferences.language === 'zh-CN' ? '按状态筛选' : 'Filter by status'"
            >
              <option value="all">
                {{ preferences.language === 'zh-CN' ? '全部状态' : 'All statuses' }}
              </option>
              <option value="active">{{ preferences.t('detail.active') }}</option>
              <option value="cancelled">{{ preferences.t('detail.cancelled') }}</option>
            </select>
            <select
              v-model="filters.category"
              data-testid="filter-category"
              class="field-recessed"
              :aria-label="preferences.language === 'zh-CN' ? '按分类筛选' : 'Filter by category'"
            >
              <option value="all">
                {{ preferences.language === 'zh-CN' ? '全部分类' : 'All categories' }}
              </option>
              <option v-for="categoryItem in categories" :key="categoryItem" :value="categoryItem">
                {{ categoryItem }}
              </option>
            </select>
            <select
              v-model="filters.billingInterval"
              data-testid="filter-interval"
              class="field-recessed"
              :aria-label="
                preferences.language === 'zh-CN' ? '按扣费周期筛选' : 'Filter by billing cycle'
              "
            >
              <option value="all">
                {{ preferences.language === 'zh-CN' ? '全部周期' : 'All cycles' }}
              </option>
              <option value="monthly">{{ preferences.t('common.monthly') }}</option>
              <option value="yearly">{{ preferences.t('common.yearly') }}</option>
            </select>
          </div>
          <button
            v-if="filtering"
            type="button"
            class="label-small rounded-lg px-2 py-1 text-primary"
            data-testid="clear-filters"
            @click="clearFilters"
          >
            {{ preferences.language === 'zh-CN' ? '清除筛选' : 'Clear filters' }}
          </button>
        </div>
      </section>

      <div v-if="loaded && allItems.length === 0" class="tactile-card space-y-4 p-6 text-center">
        <div class="icon-house icon-house-secondary mx-auto">
          <Plus :size="27" :stroke-width="2.6" aria-hidden="true" />
        </div>
        <div class="space-y-2">
          <p class="font-headline text-xl font-bold text-on-surface">
            {{ preferences.t('subscriptions.emptyTitle') }}
          </p>
          <p class="text-on-surface-variant">{{ preferences.t('subscriptions.emptyBody') }}</p>
        </div>
        <button
          type="button"
          class="tactile-btn mx-auto"
          data-testid="add-subscription-empty"
          @click="openCreate"
        >
          <Plus :size="22" aria-hidden="true" />
          {{ preferences.t('subscriptions.addLong') }}
        </button>
      </div>

      <div
        v-else-if="loaded && visible.length === 0"
        class="tactile-card space-y-4 p-6 text-center"
        data-testid="no-results"
      >
        <p class="font-headline text-xl font-bold">
          {{ preferences.language === 'zh-CN' ? '没有匹配结果' : 'No matching subscriptions' }}
        </p>
        <button
          type="button"
          class="tactile-btn mx-auto"
          data-testid="clear-filters-empty"
          @click="clearFilters"
        >
          {{ preferences.language === 'zh-CN' ? '清除筛选' : 'Clear filters' }}
        </button>
      </div>

      <ul
        v-else-if="loaded"
        class="grid grid-cols-1 gap-3 md:grid-cols-2"
        data-testid="subscription-list"
      >
        <li v-for="item in visible" :key="item.id">
          <button
            type="button"
            class="tactile-card pressable relative w-full overflow-hidden px-3.5 py-3 text-left"
            :class="{ 'opacity-70': item.status === 'cancelled' }"
            data-testid="subscription-item"
            :data-id="item.id"
            :data-name="item.name"
            :data-interval="item.billingInterval"
            :data-status="item.status"
            @click="openDetail(item.id)"
          >
            <span
              v-if="item.billingInterval === 'yearly'"
              class="absolute top-0 right-0 rounded-bl-xl bg-primary px-3 py-1 text-xs font-bold tracking-wide text-on-primary uppercase"
            >
              {{ preferences.t('common.yearly') }}
            </span>

            <div class="space-y-2.5" :class="{ 'pt-2': item.billingInterval === 'yearly' }">
              <div class="flex items-start justify-between gap-2.5">
                <div class="flex min-w-0 items-center gap-3">
                  <SubscriptionIcon
                    :category="item.category"
                    :name="item.name"
                    :icon-key="item.iconKey"
                  />
                  <div class="min-w-0">
                    <p class="truncate font-headline text-lg font-bold leading-5 text-on-surface">
                      {{ item.name }}
                    </p>
                    <p class="mt-0.5 truncate text-xs font-bold leading-4 text-on-surface-variant">
                      <span>{{ item.category }}</span>
                      <span v-if="item.accountLabel" class="text-outline"> · </span>
                      <span v-if="item.accountLabel" data-testid="subscription-account">{{
                        item.accountLabel
                      }}</span>
                    </p>
                  </div>
                </div>
                <div class="shrink-0 text-right">
                  <p class="font-headline text-lg font-extrabold leading-5 text-on-surface">
                    {{ preferences.formatAmount(item.amountMinor, item.currency as never) }}
                  </p>
                  <p
                    class="mt-0.5 text-xs font-bold leading-4 text-on-surface-variant"
                    data-testid="subscription-daily"
                  >
                    {{ dailyLabel(item) }}
                  </p>
                </div>
              </div>

              <div
                class="flex items-center gap-2 rounded-xl border border-surface-container-highest bg-surface-container-low px-2.5 py-2"
                :data-testid="item.status === 'active' ? 'subscription-progress' : undefined"
              >
                <div class="min-w-0 flex-1 space-y-1">
                  <div class="flex items-center justify-between gap-2 text-xs font-bold leading-4">
                    <span class="text-on-surface-variant">
                      {{ preferences.t('detail.nextBillingDate') }}
                    </span>
                    <span
                      :class="item.status === 'active' ? 'text-primary' : 'text-on-surface-variant'"
                    >
                      {{
                        item.status === 'active'
                          ? countdown(item.nextBillingDate)
                          : preferences.t('detail.cancelled')
                      }}
                    </span>
                  </div>
                  <BillingProgressBar
                    v-if="item.status === 'active'"
                    compact
                    :progress="progressFor(item)"
                    :label="`${item.name} billing cycle remaining`"
                    :test-id="`subscription-progress-${item.id}`"
                  />
                  <p class="text-[11px] leading-3 text-on-surface-variant">
                    {{ item.nextBillingDate }}
                  </p>
                </div>
                <span class="icon-button size-8 border-b-2" aria-hidden="true">
                  <ChevronRight :size="18" />
                </span>
              </div>

              <div class="flex flex-wrap items-center gap-1.5">
                <span
                  class="cycle-badge !px-2 !py-0.5 !text-[11px]"
                  :class="
                    item.billingInterval === 'yearly' ? 'cycle-badge-yearly' : 'cycle-badge-monthly'
                  "
                  data-testid="billing-cycle-badge"
                >
                  {{ cycleLabel(item.billingInterval) }}
                </span>
                <span
                  class="chip-pill !px-2 !py-0.5 !text-[11px]"
                  :class="
                    item.status === 'active' ? 'status-badge-active' : 'status-badge-cancelled'
                  "
                >
                  {{
                    item.status === 'active'
                      ? preferences.t('detail.active')
                      : preferences.t('detail.cancelled')
                  }}
                </span>
              </div>
            </div>
          </button>
        </li>
      </ul>
    </div>
  </section>
</template>
