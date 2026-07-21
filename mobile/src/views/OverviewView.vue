<script setup lang="ts">
import { Plus } from '@lucide/vue'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getOverviewSnapshot } from '../application/subscriptions'
import PageTopBar from '../components/PageTopBar.vue'
import SubscriptionIcon from '../components/SubscriptionIcon.vue'
import { cycleProgress } from '../domain/billing'
import { todayDateOnly } from '../domain/clock'
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
  if (days <= 14) return 'border-tertiary-container/30 bg-tertiary-fixed text-on-tertiary-fixed-variant'
  return 'border-secondary-fixed-dim/30 bg-secondary-fixed text-on-secondary-fixed-variant'
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

    <div class="page-content">
      <section v-if="loaded" class="tactile-card tactile-card-strong hero-accent space-y-4 p-6">
        <div class="relative z-10 space-y-1">
          <h1 class="page-heading-mobile text-on-tertiary-fixed">
            {{ preferences.t('overview.squad') }}
          </h1>
          <p class="text-on-tertiary-fixed-variant">
            {{ preferences.t('overview.greeting') }}
          </p>
        </div>

        <div class="relative z-10 rounded-xl border-2 border-surface-variant bg-surface-container-lowest p-4 text-center" style="border-bottom-width: 4px">
          <p class="label-small tracking-[0.12em] text-on-surface-variant uppercase">
            {{ preferences.t('overview.active') }}
          </p>
          <p class="display-number text-primary" data-testid="overview-active-count">
            {{ activeCount }}
          </p>
        </div>

        <p class="relative z-10 text-center text-sm text-on-tertiary-fixed-variant">
          {{
            preferences.language === 'zh-CN'
              ? '金额分析请到「统计」查看。'
              : 'See Stats for spending analysis.'
          }}
        </p>
        <p v-if="activeCount === 0" class="relative z-10 text-center text-on-tertiary-fixed-variant">
          {{ preferences.t('overview.empty') }}
        </p>
      </section>

      <section v-if="loaded" class="space-y-4">
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
                <SubscriptionIcon :category="item.category" />
                <div class="min-w-0">
                  <p class="truncate font-headline text-lg font-bold text-on-surface">
                    {{ item.name }}
                  </p>
                  <p class="label-small text-on-surface-variant">
                    {{ preferences.formatAmount(item.amountMinor, item.currency as never) }}
                    / {{ cycleLabel(item.billingInterval) }}
                  </p>
                </div>
              </div>
              <span class="chip-pill shrink-0" :class="urgencyClass(item)">
                {{ countdown(item.nextBillingDate) }}
              </span>
            </div>

            <div
              class="tactile-progress"
              role="progressbar"
              :aria-label="`${item.name} billing cycle progress`"
              :aria-valuenow="Math.round(progressFor(item).fraction * 100)"
              aria-valuemin="0"
              aria-valuemax="100"
            >
              <div
                class="tactile-progress-fill"
                :style="{ width: `${Math.round(progressFor(item).fraction * 100)}%` }"
              />
            </div>
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
