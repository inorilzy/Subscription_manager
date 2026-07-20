<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { createSubscription } from '../application/subscriptions'
import { SUBSCRIPTION_CATEGORIES, ValidationError } from '../domain/subscription'

const router = useRouter()

const name = ref('')
const amount = ref('')
const nextBillingDate = ref('')
const category = ref('')
const planName = ref('')
const paymentMethodLabel = ref('')
const errorMessage = ref<string | null>(null)
const submitting = ref(false)

async function onSubmit() {
  if (submitting.value) return
  errorMessage.value = null
  submitting.value = true

  try {
    await createSubscription({
      name: name.value,
      amountInput: amount.value,
      nextBillingDate: nextBillingDate.value,
      category: category.value || null,
      planName: planName.value || null,
      paymentMethodLabel: paymentMethodLabel.value || null,
      billingInterval: 'monthly',
    })
    await router.push({ name: 'subscriptions' })
  } catch (error) {
    if (error instanceof ValidationError) {
      errorMessage.value = error.message
    } else {
      errorMessage.value = 'Could not save the subscription. Please try again.'
    }
  } finally {
    submitting.value = false
  }
}

async function onCancel() {
  await router.back()
}
</script>

<template>
  <section class="space-y-4">
    <header class="space-y-1">
      <h1 class="font-headline text-3xl font-extrabold text-on-surface">Add Subscription</h1>
      <p class="text-on-surface-variant">Track a monthly recurring service.</p>
    </header>

    <form class="tactile-card space-y-4 p-5" data-testid="subscription-form" @submit.prevent="onSubmit">
      <div class="space-y-1">
        <label class="text-sm font-bold text-on-surface" for="subscription-name">Name</label>
        <input
          id="subscription-name"
          v-model="name"
          data-testid="subscription-name"
          type="text"
          required
          autocomplete="off"
          class="w-full rounded-xl border-2 border-surface-container-highest bg-surface-container-lowest px-3 py-3"
          placeholder="Netflix"
        />
      </div>

      <div class="space-y-1">
        <label class="text-sm font-bold text-on-surface" for="subscription-amount">Amount</label>
        <input
          id="subscription-amount"
          v-model="amount"
          data-testid="subscription-amount"
          type="text"
          inputmode="decimal"
          required
          autocomplete="off"
          class="w-full rounded-xl border-2 border-surface-container-highest bg-surface-container-lowest px-3 py-3"
          placeholder="15.99"
        />
      </div>

      <div class="space-y-1">
        <label class="text-sm font-bold text-on-surface" for="subscription-next-billing-date">
          Next Billing Date
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
        <label class="text-sm font-bold text-on-surface" for="subscription-category">Category</label>
        <select
          id="subscription-category"
          v-model="category"
          data-testid="subscription-category"
          class="w-full rounded-xl border-2 border-surface-container-highest bg-surface-container-lowest px-3 py-3"
        >
          <option value="">Other (default)</option>
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
          Plan Name <span class="font-normal text-on-surface-variant">(optional)</span>
        </label>
        <input
          id="subscription-plan-name"
          v-model="planName"
          data-testid="subscription-plan-name"
          type="text"
          autocomplete="off"
          class="w-full rounded-xl border-2 border-surface-container-highest bg-surface-container-lowest px-3 py-3"
          placeholder="Standard"
        />
      </div>

      <div class="space-y-1">
        <label class="text-sm font-bold text-on-surface" for="subscription-payment-method">
          Payment Method Label
          <span class="font-normal text-on-surface-variant">(optional)</span>
        </label>
        <input
          id="subscription-payment-method"
          v-model="paymentMethodLabel"
          data-testid="subscription-payment-method"
          type="text"
          autocomplete="off"
          class="w-full rounded-xl border-2 border-surface-container-highest bg-surface-container-lowest px-3 py-3"
          placeholder="Visa ending 4242"
        />
        <p class="text-xs text-on-surface-variant">
          Display label only. Do not enter full card numbers, CVV, or bank logins.
        </p>
      </div>

      <p
        v-if="errorMessage"
        class="rounded-xl border-2 border-error/30 bg-error/10 px-3 py-2 text-sm text-error"
        role="alert"
        data-testid="subscription-form-error"
      >
        {{ errorMessage }}
      </p>

      <div class="flex gap-3 pt-2">
        <button
          type="button"
          data-testid="subscription-cancel"
          class="flex-1 rounded-xl border-2 border-surface-container-highest px-4 py-3 font-bold text-on-surface"
          @click="onCancel"
        >
          Cancel
        </button>
        <button
          type="submit"
          data-testid="subscription-save"
          class="tactile-btn flex-1 px-4 py-3"
          :disabled="submitting"
        >
          {{ submitting ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </form>
  </section>
</template>
