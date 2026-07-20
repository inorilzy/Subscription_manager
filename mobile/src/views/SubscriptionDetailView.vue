<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  cancelSubscription,
  deleteSubscription,
  getSubscription,
  reactivateSubscription,
} from '../application/subscriptions'
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
  <section class="space-y-4">
    <header class="flex items-center gap-3">
      <button
        type="button"
        class="rounded-xl border-2 border-surface-container-highest px-3 py-2 font-bold"
        data-testid="subscription-detail-back"
        @click="goBack"
      >
        {{ preferences.t('detail.back') }}
      </button>
      <h1 class="font-headline text-3xl font-extrabold text-on-surface">
        {{ preferences.t('detail.title') }}
      </h1>
    </header>

    <p v-if="errorMessage" class="text-error" role="alert">{{ errorMessage }}</p>

    <div
      v-else-if="loaded && subscription"
      class="tactile-card space-y-4 p-5"
      data-testid="subscription-detail"
    >
      <div>
        <p class="text-sm font-bold uppercase tracking-wide text-primary">
          {{ subscription.category }}
        </p>
        <h2 class="font-headline text-3xl font-extrabold text-on-surface">
          {{ subscription.name }}
        </h2>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="rounded-xl border-2 border-surface-container-highest bg-surface-container-low p-4">
          <p class="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
            {{ preferences.t('detail.amount') }}
          </p>
          <p class="font-headline text-2xl font-extrabold text-error">
            {{ preferences.formatAmount(subscription.amountMinor, subscription.currency as never) }}
          </p>
        </div>
        <div class="rounded-xl border-2 border-surface-container-highest bg-surface-container-low p-4">
          <p class="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
            {{ preferences.t('detail.cycle') }}
          </p>
          <p class="font-headline text-2xl font-extrabold text-on-surface">
            <span
              class="cycle-badge"
              :class="
                subscription.billingInterval === 'yearly'
                  ? 'cycle-badge-yearly'
                  : 'cycle-badge-monthly'
              "
            >
              {{ cycleLabel }}
            </span>
          </p>
        </div>
      </div>

      <div class="space-y-2">
        <p>
          <span class="font-bold text-on-surface">{{ preferences.t('detail.nextBillingDate') }}:</span>
          {{ subscription.nextBillingDate }}
        </p>
        <p>
          <span class="font-bold text-on-surface">{{ preferences.t('detail.countdown') }}:</span>
          {{ countdown }}
        </p>
        <p v-if="subscription.planName">
          <span class="font-bold text-on-surface">{{ preferences.t('detail.plan') }}:</span>
          {{ subscription.planName }}
        </p>
        <p v-if="subscription.paymentMethodLabel">
          <span class="font-bold text-on-surface">{{ preferences.t('detail.payment') }}:</span>
          {{ subscription.paymentMethodLabel }}
        </p>
        <p>
          <span class="font-bold text-on-surface">{{ preferences.t('detail.status') }}:</span>
          <span data-testid="subscription-status">
            {{
              subscription.status === 'active'
                ? preferences.t('detail.active')
                : preferences.t('detail.cancelled')
            }}
          </span>
        </p>
      </div>

      <div class="flex flex-col gap-2 pt-2">
        <button type="button" class="tactile-btn px-4 py-3" data-testid="subscription-edit" @click="openEdit">
          {{ preferences.t('detail.edit') }}
        </button>
        <button
          v-if="subscription.status === 'active'"
          type="button"
          class="rounded-xl border-2 border-surface-container-highest px-4 py-3 font-bold"
          data-testid="subscription-cancel-action"
          :disabled="busy"
          @click="onCancel"
        >
          {{ preferences.t('detail.cancelSub') }}
        </button>
        <button
          v-else
          type="button"
          class="tactile-btn px-4 py-3"
          data-testid="subscription-reactivate"
          :disabled="busy"
          @click="onReactivate"
        >
          {{ preferences.t('detail.reactivate') }}
        </button>
        <button
          type="button"
          class="rounded-xl border-2 border-error px-4 py-3 font-bold text-error"
          data-testid="subscription-delete"
          :disabled="busy"
          @click="showDeleteConfirm = true"
        >
          {{ preferences.t('detail.delete') }}
        </button>
      </div>
    </div>

    <div
      v-if="showDeleteConfirm"
      class="tactile-card space-y-3 border-error/40 p-5"
      role="dialog"
      data-testid="delete-confirm"
    >
      <h2 class="font-headline text-xl font-bold">{{ preferences.t('detail.deleteConfirmTitle') }}</h2>
      <p class="text-on-surface-variant">{{ preferences.t('detail.deleteConfirmBody') }}</p>
      <div class="flex gap-3">
        <button
          type="button"
          class="flex-1 rounded-xl border-2 border-surface-container-highest px-4 py-3 font-bold"
          data-testid="delete-confirm-cancel"
          @click="showDeleteConfirm = false"
        >
          {{ preferences.t('detail.deleteCancel') }}
        </button>
        <button
          type="button"
          class="tactile-btn flex-1 bg-error px-4 py-3 text-on-primary"
          data-testid="delete-confirm-yes"
          @click="onDeleteConfirmed"
        >
          {{ preferences.t('detail.deleteConfirm') }}
        </button>
      </div>
    </div>
  </section>
</template>
