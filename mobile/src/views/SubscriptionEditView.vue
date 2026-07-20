<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getSubscription, updateSubscription } from '../application/subscriptions'
import { SUBSCRIPTION_CATEGORIES, ValidationError } from '../domain/subscription'
import { usePreferencesStore } from '../stores/preferences'

const route = useRoute()
const router = useRouter()
const preferences = usePreferencesStore()

const id = String(route.params.id ?? '')
const name = ref('')
const amount = ref('')
const nextBillingDate = ref('')
const category = ref('')
const planName = ref('')
const paymentMethodLabel = ref('')
const billingInterval = ref<'monthly' | 'yearly'>('monthly')
const errorMessage = ref<string | null>(null)
const submitting = ref(false)
const loaded = ref(false)

function localizeValidation(message: string): string {
  const map: Record<string, string> = {
    'Name is required.': preferences.t('error.nameRequired'),
    'Next billing date is required.': preferences.t('error.dateRequired'),
    'Next billing date must be a valid date.': preferences.t('error.dateInvalid'),
    'Amount is required.': preferences.t('error.amountRequired'),
    'Enter a valid amount greater than zero with up to two decimal places.':
      preferences.t('error.amountInvalid'),
    'Amount is too large.': preferences.t('error.amountTooLarge'),
    'Amount must be greater than zero.': preferences.t('error.amountPositive'),
    'Use a short label like “Visa ending 4242”. Do not enter full card numbers or CVV.':
      preferences.t('error.paymentSensitive'),
    'Could not save the subscription. Please try again.': preferences.t('error.saveFailed'),
    'Subscription not found.': preferences.t('detail.notFound'),
  }
  return map[message] ?? message
}

onMounted(async () => {
  const existing = await getSubscription(id)
  if (!existing) {
    errorMessage.value = preferences.t('detail.notFound')
    loaded.value = true
    return
  }
  name.value = existing.name
  amount.value = (existing.amountMinor / 100).toFixed(2)
  nextBillingDate.value = existing.nextBillingDate
  category.value = existing.category === 'Other' ? '' : existing.category
  planName.value = existing.planName ?? ''
  paymentMethodLabel.value = existing.paymentMethodLabel ?? ''
  billingInterval.value = existing.billingInterval
  loaded.value = true
})

async function onSubmit() {
  if (submitting.value) return
  errorMessage.value = null
  submitting.value = true
  try {
    await updateSubscription({
      id,
      name: name.value,
      amountInput: amount.value,
      nextBillingDate: nextBillingDate.value,
      category: category.value || null,
      planName: planName.value || null,
      paymentMethodLabel: paymentMethodLabel.value || null,
      billingInterval: billingInterval.value,
      currency: preferences.currency,
    })
    await router.push({ name: 'subscription-detail', params: { id } })
  } catch (error) {
    if (error instanceof ValidationError) {
      errorMessage.value = localizeValidation(error.message)
    } else {
      errorMessage.value = preferences.t('error.saveFailed')
    }
  } finally {
    submitting.value = false
  }
}

async function onCancel() {
  await router.push({ name: 'subscription-detail', params: { id } })
}
</script>

<template>
  <section class="space-y-4">
    <header class="space-y-1">
      <h1 class="font-headline text-3xl font-extrabold text-on-surface">
        {{ preferences.t('edit.title') }}
      </h1>
      <p class="text-on-surface-variant">{{ preferences.t('edit.subtitle') }}</p>
    </header>

    <form
      v-if="loaded"
      class="tactile-card space-y-4 p-5"
      data-testid="subscription-form"
      @submit.prevent="onSubmit"
    >
      <div class="space-y-1">
        <label class="text-sm font-bold text-on-surface" for="subscription-name">
          {{ preferences.t('create.name') }}
        </label>
        <input
          id="subscription-name"
          v-model="name"
          data-testid="subscription-name"
          type="text"
          required
          class="w-full rounded-xl border-2 border-surface-container-highest bg-surface-container-lowest px-3 py-3"
        />
      </div>

      <div class="space-y-1">
        <label class="text-sm font-bold text-on-surface" for="subscription-amount">
          {{ preferences.t('create.amount') }}
        </label>
        <input
          id="subscription-amount"
          v-model="amount"
          data-testid="subscription-amount"
          type="text"
          inputmode="decimal"
          required
          class="w-full rounded-xl border-2 border-surface-container-highest bg-surface-container-lowest px-3 py-3"
        />
      </div>

      <div class="space-y-1">
        <label class="text-sm font-bold text-on-surface" for="subscription-billing-interval">
          {{ preferences.t('create.billingCycle') }}
        </label>
        <select
          id="subscription-billing-interval"
          v-model="billingInterval"
          data-testid="subscription-billing-interval"
          class="w-full rounded-xl border-2 border-surface-container-highest bg-surface-container-lowest px-3 py-3"
        >
          <option value="monthly">{{ preferences.t('create.monthly') }}</option>
          <option value="yearly">{{ preferences.t('create.yearly') }}</option>
        </select>
      </div>

      <div class="space-y-1">
        <label class="text-sm font-bold text-on-surface" for="subscription-next-billing-date">
          {{ preferences.t('create.nextBillingDate') }}
        </label>
        <input
          id="subscription-next-billing-date"
          v-model="nextBillingDate"
          data-testid="subscription-next-billing-date"
          type="date"
          required
          class="w-full rounded-xl border-2 border-surface-container-highest bg-surface-container-lowest px-3 py-3"
        />
      </div>

      <div class="space-y-1">
        <label class="text-sm font-bold text-on-surface" for="subscription-category">
          {{ preferences.t('create.category') }}
        </label>
        <select
          id="subscription-category"
          v-model="category"
          data-testid="subscription-category"
          class="w-full rounded-xl border-2 border-surface-container-highest bg-surface-container-lowest px-3 py-3"
        >
          <option value="">{{ preferences.t('create.categoryDefault') }}</option>
          <option
            v-for="item in SUBSCRIPTION_CATEGORIES.filter((c) => c !== 'Other')"
            :key="item"
            :value="item"
          >
            {{ item }}
          </option>
        </select>
      </div>

      <div class="space-y-1">
        <label class="text-sm font-bold text-on-surface" for="subscription-plan-name">
          {{ preferences.t('create.planName') }}
        </label>
        <input
          id="subscription-plan-name"
          v-model="planName"
          data-testid="subscription-plan-name"
          type="text"
          class="w-full rounded-xl border-2 border-surface-container-highest bg-surface-container-lowest px-3 py-3"
        />
      </div>

      <div class="space-y-1">
        <label class="text-sm font-bold text-on-surface" for="subscription-payment-method">
          {{ preferences.t('create.paymentMethod') }}
        </label>
        <input
          id="subscription-payment-method"
          v-model="paymentMethodLabel"
          data-testid="subscription-payment-method"
          type="text"
          class="w-full rounded-xl border-2 border-surface-container-highest bg-surface-container-lowest px-3 py-3"
        />
      </div>

      <p
        v-if="errorMessage"
        class="rounded-xl border-2 border-error/30 bg-error/10 px-3 py-2 text-sm text-error"
        role="alert"
      >
        {{ errorMessage }}
      </p>

      <div class="flex gap-3 pt-2">
        <button
          type="button"
          data-testid="subscription-cancel"
          class="flex-1 rounded-xl border-2 border-surface-container-highest px-4 py-3 font-bold"
          @click="onCancel"
        >
          {{ preferences.t('create.cancel') }}
        </button>
        <button type="submit" data-testid="subscription-save" class="tactile-btn flex-1 px-4 py-3">
          {{ submitting ? preferences.t('create.saving') : preferences.t('create.save') }}
        </button>
      </div>
    </form>
  </section>
</template>
