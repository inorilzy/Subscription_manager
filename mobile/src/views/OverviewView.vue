<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getOverviewSnapshot } from '../application/subscriptions'
import { relativeBillingLabel, type Subscription } from '../domain/subscription'
import { usePreferencesStore } from '../stores/preferences'

const router = useRouter()
const preferences = usePreferencesStore()
const activeCount = ref(0)
const upcoming = ref<Subscription[]>([])
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

async function reload() {
  const snapshot = await getOverviewSnapshot()
  activeCount.value = snapshot.activeCount
  upcoming.value = snapshot.upcoming
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
  <section class="space-y-4">
    <header class="flex items-start justify-between gap-3">
      <div class="space-y-1">
        <h1 class="font-headline text-3xl font-extrabold text-on-surface">
          {{ preferences.t('overview.title') }}
        </h1>
        <p class="text-sm text-on-surface-variant">
          {{ preferences.t('overview.greeting') }}
        </p>
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

    <div v-if="loaded" class="tactile-card space-y-3 p-5">
      <h2 class="font-headline text-xl font-bold text-on-surface">
        {{ preferences.t('overview.squad') }}
      </h2>
      <div class="rounded-xl border-2 border-surface-container-highest bg-surface-container-low p-4 text-center">
          <p class="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
            {{ preferences.t('overview.active') }}
          </p>
          <p class="font-headline text-3xl font-extrabold text-primary" data-testid="overview-active-count">
            {{ activeCount }}
          </p>
        </div>
        <p class="text-center text-sm text-on-surface-variant">
          {{ preferences.language === 'zh-CN' ? '金额分析请到「统计」查看。' : 'See Stats for spending analysis.' }}
        </p>
      <p v-if="activeCount === 0" class="text-center text-on-surface-variant">
        {{ preferences.t('overview.empty') }}
      </p>
    </div>

    <div v-if="loaded" class="space-y-3">
      <div class="flex items-center justify-between gap-3">
        <h2 class="font-headline text-xl font-bold text-on-surface">
          {{ preferences.t('overview.upcoming') }}
        </h2>
        <button
          type="button"
          class="text-sm font-bold text-primary"
          data-testid="overview-see-all"
          @click="seeAll"
        >
          {{ preferences.language === 'zh-CN' ? '查看全部' : 'See all' }}
        </button>
      </div>

      <p
        v-if="upcoming.length === 0"
        class="tactile-card p-4 text-on-surface-variant"
        data-testid="overview-upcoming-empty"
      >
        {{ preferences.language === 'zh-CN' ? '暂无即将扣费项目。' : 'No upcoming payments.' }}
      </p>

      <button
        v-for="item in upcoming"
        :key="item.id"
        type="button"
        class="tactile-card flex w-full items-center justify-between gap-3 p-4 text-left"
        data-testid="overview-upcoming-item"
        @click="openDetail(item.id)"
      >
        <div>
          <p class="font-headline text-lg font-bold text-on-surface">{{ item.name }}</p>
          <p class="text-sm text-on-surface-variant">
            <span
              class="cycle-badge"
              :class="item.billingInterval === 'yearly' ? 'cycle-badge-yearly' : 'cycle-badge-monthly'"
            >
              {{ cycleLabel(item.billingInterval) }}
            </span>
            · {{ item.nextBillingDate }} · {{ countdown(item.nextBillingDate) }}
          </p>
        </div>
        <p class="font-headline text-lg font-extrabold text-error">
          {{ preferences.formatAmount(item.amountMinor, item.currency as never) }}
        </p>
      </button>
    </div>
  </section>
</template>
