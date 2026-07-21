<script setup lang="ts">
import {
  CalendarDays,
  ChevronRight,
  CircleCheck,
  CircleX,
  CreditCard,
  Layers3,
  Pencil,
  RefreshCw,
  Tags,
  UserRound,
  Trash2,
} from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  cancelSubscription,
  deleteSubscription,
  getSubscription,
  reactivateSubscription,
} from '../application/subscriptions'
import BillingProgressBar from '../components/BillingProgressBar.vue'
import PageTopBar from '../components/PageTopBar.vue'
import SubscriptionIcon from '../components/SubscriptionIcon.vue'
import { cycleProgress, dailyAmountMinor } from '../domain/billing'
import { todayDateOnly } from '../domain/clock'
import { relativeBillingLabel, type Subscription } from '../domain/subscription'
import { usePreferencesStore } from '../stores/preferences'

const route = useRoute()
const router = useRouter()
const preferences = usePreferencesStore()

const subscription = ref<Subscription | null>(null)
const loaded = ref(false)
const errorMessage = ref<string | null>(null)
const showDeleteConfirm = ref(false)
const busy = ref(false)

const countdown = computed(() => {
  if (!subscription.value) return ''
  return relativeBillingLabel(subscription.value.nextBillingDate, {
    format: (days) => {
      if (days === 0) return preferences.t('common.today')
      if (days === 1) return preferences.t('common.inOneDay')
      if (days > 1) return preferences.t('common.inDays', { n: days })
      if (days === -1) return preferences.t('common.oneDayAgo')
      return preferences.t('common.daysAgo', { n: Math.abs(days) })
    },
  })
})

const cycleLabel = computed(() => {
  if (!subscription.value) return ''
  return subscription.value.billingInterval === 'yearly'
    ? preferences.t('common.yearly')
    : preferences.t('common.monthly')
})

const dailyLabel = computed(() => {
  if (!subscription.value) return ''
  const perDay = dailyAmountMinor(
    subscription.value.amountMinor,
    subscription.value.nextBillingDate,
    subscription.value.billingInterval,
    subscription.value.billingAnchorDay,
  )
  return preferences.t('common.perDay', {
    amount: preferences.formatAmount(Math.round(perDay), subscription.value.currency as never),
  })
})

const progress = computed(() => {
  if (!subscription.value) {
    return { fraction: 0, remainingFraction: 0, daysLeft: 0, cycleDays: 1 }
  }
  return cycleProgress(
    subscription.value.nextBillingDate,
    subscription.value.billingInterval,
    subscription.value.billingAnchorDay,
    todayDateOnly(),
  )
})

async function reload() {
  const id = String(route.params.id ?? '')
  subscription.value = await getSubscription(id)
  if (!subscription.value) {
    errorMessage.value = preferences.t('detail.notFound')
  }
}

onMounted(async () => {
  try {
    await reload()
  } catch {
    errorMessage.value = preferences.t('detail.loadError')
  } finally {
    loaded.value = true
  }
})

async function goBack() {
  if (router.options.history.state.back) {
    router.back()
    return
  }
  await router.push({ name: 'subscriptions' })
}

async function openEdit() {
  if (!subscription.value) return
  await router.push({ name: 'subscription-edit', params: { id: subscription.value.id } })
}

async function onCancel() {
  if (!subscription.value || busy.value) return
  busy.value = true
  try {
    subscription.value = await cancelSubscription(subscription.value.id)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : preferences.t('error.saveFailed')
  } finally {
    busy.value = false
  }
}

async function onReactivate() {
  if (!subscription.value || busy.value) return
  busy.value = true
  try {
    subscription.value = await reactivateSubscription(subscription.value.id)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : preferences.t('error.saveFailed')
  } finally {
    busy.value = false
  }
}

async function onDeleteConfirmed() {
  if (!subscription.value || busy.value) return
  busy.value = true
  try {
    await deleteSubscription(subscription.value.id)
    await router.push({ name: 'subscriptions' })
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : preferences.t('error.saveFailed')
  } finally {
    busy.value = false
    showDeleteConfirm.value = false
  }
}
</script>

<template>
  <section class="page">
    <PageTopBar
      :title="preferences.t('detail.title')"
      back
      :back-label="preferences.t('detail.back')"
      back-test-id="subscription-detail-back"
      @back="goBack"
    />

    <div class="page-content page-content-narrow !gap-6">
      <p
        v-if="errorMessage"
        class="tactile-card border-error/40 p-4 font-bold text-error"
        role="alert"
      >
        {{ errorMessage }}
      </p>

      <div
        v-else-if="loaded && subscription"
        class="min-w-0 space-y-6"
        data-testid="subscription-detail"
      >
        <div class="flex min-w-0 flex-col items-center px-2 pt-2 text-center">
          <div class="relative mb-5 inline-flex">
            <SubscriptionIcon
              :category="subscription.category"
              :name="subscription.name"
              :icon-key="subscription.iconKey"
              large
              class="!size-24 !rounded-full [&>svg]:!size-10"
            />
            <span
              class="chip-pill absolute -right-8 -bottom-2 -rotate-6 whitespace-nowrap shadow-sm"
              :class="
                subscription.status === 'active' ? 'status-badge-active' : 'status-badge-cancelled'
              "
            >
              {{
                subscription.status === 'active'
                  ? preferences.t('detail.active')
                  : preferences.t('detail.cancelled')
              }}
            </span>
          </div>

          <h1
            class="max-w-full break-words font-headline text-3xl leading-9 font-extrabold tracking-tight text-on-surface"
          >
            {{ subscription.name }}
          </h1>

          <div class="mt-5 flex max-w-full flex-wrap items-end justify-center gap-x-3 gap-y-2">
            <p
              class="min-w-0 max-w-full break-all font-headline text-[clamp(2.5rem,13vw,4rem)] leading-none font-extrabold tracking-[-0.04em] text-primary"
            >
              {{
                preferences.formatAmount(subscription.amountMinor, subscription.currency as never)
              }}
            </p>
            <span
              class="cycle-badge mb-1"
              :class="
                subscription.billingInterval === 'yearly'
                  ? 'cycle-badge-yearly'
                  : 'cycle-badge-monthly'
              "
            >
              {{ cycleLabel }}
            </span>
          </div>
          <p class="mt-2 text-sm font-bold text-on-surface-variant" data-testid="detail-daily">
            {{ dailyLabel }}
          </p>
        </div>

        <div
          class="tactile-card min-w-0 border-surface-variant bg-surface-container-lowest p-5 text-on-surface"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <p class="text-xs font-extrabold tracking-[0.14em] uppercase opacity-70">
                {{ preferences.t('detail.countdown') }}
              </p>
              <p class="mt-1 break-words font-headline text-3xl leading-9 font-extrabold">
                {{ countdown }}
              </p>
              <p class="mt-1 text-sm font-bold opacity-75">
                {{ preferences.t('detail.nextBillingDate') }} ·
                {{ subscription.nextBillingDate }}
              </p>
            </div>
            <CalendarDays
              :size="32"
              :stroke-width="2.5"
              class="shrink-0 text-primary"
              aria-hidden="true"
            />
          </div>

          <div
            v-if="subscription.status === 'active'"
            class="mt-5 space-y-2"
            data-testid="detail-progress"
          >
            <BillingProgressBar
              :progress="progress"
              :label="`${subscription.name} billing cycle remaining`"
              test-id="detail-progress-bar"
            />
            <p class="text-sm font-extrabold text-primary">
              {{ preferences.t('common.daysLeft', { n: progress.daysLeft }) }}
            </p>
          </div>
        </div>

        <div class="min-w-0 space-y-3">
          <h2 class="section-label">
            {{ preferences.language === 'zh-CN' ? '订阅信息' : 'Subscription details' }}
          </h2>

          <div class="settings-group min-w-0">
            <div
              v-if="subscription.accountLabel"
              class="settings-row min-w-0"
              data-testid="detail-subscription-account"
            >
              <span class="icon-house icon-house-primary" aria-hidden="true">
                <UserRound :size="25" :stroke-width="2.4" />
              </span>
              <div class="min-w-0 flex-1">
                <p class="text-xs font-bold tracking-[0.12em] text-on-surface-variant uppercase">
                  {{ preferences.t('detail.account') }}
                </p>
                <p
                  class="mt-1 break-all font-headline font-bold text-on-surface"
                  data-testid="subscription-account"
                >
                  {{ subscription.accountLabel }}
                </p>
              </div>
            </div>

            <div v-if="subscription.paymentMethodLabel" class="settings-row min-w-0">
              <span class="icon-house icon-house-secondary" aria-hidden="true">
                <CreditCard :size="25" :stroke-width="2.4" />
              </span>
              <div class="min-w-0 flex-1">
                <p class="text-xs font-bold tracking-[0.12em] text-on-surface-variant uppercase">
                  {{ preferences.t('detail.payment') }}
                </p>
                <p class="mt-1 break-words font-headline font-bold text-on-surface">
                  {{ subscription.paymentMethodLabel }}
                </p>
              </div>
            </div>

            <div class="settings-row min-w-0">
              <span class="icon-house icon-house-primary" aria-hidden="true">
                <Tags :size="25" :stroke-width="2.4" />
              </span>
              <div class="min-w-0 flex-1">
                <p class="text-xs font-bold tracking-[0.12em] text-on-surface-variant uppercase">
                  {{ preferences.language === 'zh-CN' ? '分类' : 'Category' }}
                </p>
                <p class="mt-1 break-words font-headline font-bold text-on-surface">
                  {{ subscription.category }}
                </p>
              </div>
            </div>

            <div v-if="subscription.planName" class="settings-row min-w-0">
              <span class="icon-house icon-house-tertiary" aria-hidden="true">
                <Layers3 :size="25" :stroke-width="2.4" />
              </span>
              <div class="min-w-0 flex-1">
                <p class="text-xs font-bold tracking-[0.12em] text-on-surface-variant uppercase">
                  {{ preferences.t('detail.plan') }}
                </p>
                <p class="mt-1 break-words font-headline font-bold text-on-surface">
                  {{ subscription.planName }}
                </p>
              </div>
            </div>

            <div class="settings-row min-w-0">
              <span class="icon-house icon-house-neutral" aria-hidden="true">
                <CalendarDays :size="25" :stroke-width="2.4" />
              </span>
              <div class="min-w-0 flex-1">
                <p class="text-xs font-bold tracking-[0.12em] text-on-surface-variant uppercase">
                  {{ preferences.t('detail.nextBillingDate') }}
                </p>
                <p class="mt-1 break-words font-headline font-bold text-on-surface">
                  {{ subscription.nextBillingDate }}
                </p>
              </div>
            </div>

            <div class="settings-row min-w-0">
              <span
                class="icon-house"
                :class="
                  subscription.status === 'active' ? 'icon-house-primary' : 'icon-house-neutral'
                "
                aria-hidden="true"
              >
                <component
                  :is="subscription.status === 'active' ? CircleCheck : CircleX"
                  :size="25"
                  :stroke-width="2.4"
                />
              </span>
              <div class="min-w-0 flex-1">
                <p class="text-xs font-bold tracking-[0.12em] text-on-surface-variant uppercase">
                  {{ preferences.t('detail.status') }}
                </p>
                <span
                  class="chip-pill mt-1"
                  :class="
                    subscription.status === 'active'
                      ? 'status-badge-active'
                      : 'status-badge-cancelled'
                  "
                  data-testid="subscription-status"
                >
                  {{
                    subscription.status === 'active'
                      ? preferences.t('detail.active')
                      : preferences.t('detail.cancelled')
                  }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-3 pt-1">
          <button
            type="button"
            class="tactile-btn flex w-full justify-between px-5 py-4"
            data-testid="subscription-edit"
            @click="openEdit"
          >
            <span class="inline-flex items-center gap-2">
              <Pencil :size="21" :stroke-width="2.5" aria-hidden="true" />
              {{ preferences.t('detail.edit') }}
            </span>
            <ChevronRight :size="22" :stroke-width="2.5" aria-hidden="true" />
          </button>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              v-if="subscription.status === 'active'"
              type="button"
              class="tactile-btn-secondary w-full px-4 py-3"
              data-testid="subscription-cancel-action"
              :disabled="busy"
              @click="onCancel"
            >
              <CircleX :size="20" :stroke-width="2.5" aria-hidden="true" />
              {{ preferences.t('detail.cancelSub') }}
            </button>
            <button
              v-else
              type="button"
              class="tactile-btn-secondary w-full px-4 py-3"
              data-testid="subscription-reactivate"
              :disabled="busy"
              @click="onReactivate"
            >
              <RefreshCw :size="20" :stroke-width="2.5" aria-hidden="true" />
              {{ preferences.t('detail.reactivate') }}
            </button>
            <button
              type="button"
              class="tactile-btn-danger w-full px-4 py-3"
              data-testid="subscription-delete"
              :disabled="busy"
              @click="showDeleteConfirm = true"
            >
              <Trash2 :size="20" :stroke-width="2.5" aria-hidden="true" />
              {{ preferences.t('detail.delete') }}
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="showDeleteConfirm"
        class="tactile-card space-y-4 border-error/40 p-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-confirm-title"
        data-testid="delete-confirm"
      >
        <div class="flex items-start gap-3">
          <span
            class="icon-house border-error bg-error-container text-on-error-container"
            aria-hidden="true"
          >
            <Trash2 :size="24" :stroke-width="2.5" />
          </span>
          <div class="min-w-0">
            <h2 id="delete-confirm-title" class="font-headline text-xl font-bold text-on-surface">
              {{ preferences.t('detail.deleteConfirmTitle') }}
            </h2>
            <p class="mt-1 text-sm text-on-surface-variant">
              {{ preferences.t('detail.deleteConfirmBody') }}
            </p>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <button
            type="button"
            class="tactile-btn-secondary min-w-0 px-2 py-3"
            data-testid="delete-confirm-cancel"
            @click="showDeleteConfirm = false"
          >
            {{ preferences.t('detail.deleteCancel') }}
          </button>
          <button
            type="button"
            class="tactile-btn-danger min-w-0 bg-error px-2 py-3 text-on-error"
            data-testid="delete-confirm-yes"
            @click="onDeleteConfirmed"
          >
            {{ preferences.t('detail.deleteConfirm') }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
