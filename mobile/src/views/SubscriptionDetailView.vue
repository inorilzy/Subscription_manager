<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getSubscription } from '../application/subscriptions'
import { formatMinorAmount } from '../domain/money'
import {
  billingIntervalLabel,
  relativeBillingLabel,
  type Subscription,
} from '../domain/subscription'

const route = useRoute()
const router = useRouter()

const subscription = ref<Subscription | null>(null)
const loaded = ref(false)
const errorMessage = ref<string | null>(null)

const countdown = computed(() =>
  subscription.value ? relativeBillingLabel(subscription.value.nextBillingDate) : '',
)

onMounted(async () => {
  const id = String(route.params.id ?? '')
  try {
    subscription.value = await getSubscription(id)
    if (!subscription.value) {
      errorMessage.value = 'Subscription not found.'
    }
  } catch {
    errorMessage.value = 'Could not load this subscription.'
  } finally {
    loaded.value = true
  }
})

async function goBack() {
  await router.push({ name: 'subscriptions' })
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
        Back
      </button>
      <h1 class="font-headline text-3xl font-extrabold text-on-surface">Details</h1>
    </header>

    <p v-if="errorMessage" class="text-error" role="alert">{{ errorMessage }}</p>

    <div v-else-if="loaded && subscription" class="tactile-card space-y-4 p-5" data-testid="subscription-detail">
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
          <p class="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Amount</p>
          <p class="font-headline text-2xl font-extrabold text-error">
            {{ formatMinorAmount(subscription.amountMinor, subscription.currency) }}
          </p>
        </div>
        <div class="rounded-xl border-2 border-surface-container-highest bg-surface-container-low p-4">
          <p class="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Cycle</p>
          <p class="font-headline text-2xl font-extrabold text-on-surface">
            {{ billingIntervalLabel(subscription.billingInterval) }}
          </p>
        </div>
      </div>

      <div class="space-y-2">
        <p>
          <span class="font-bold text-on-surface">Next Billing Date:</span>
          {{ subscription.nextBillingDate }}
        </p>
        <p>
          <span class="font-bold text-on-surface">Countdown:</span>
          {{ countdown }}
        </p>
        <p v-if="subscription.planName">
          <span class="font-bold text-on-surface">Plan:</span>
          {{ subscription.planName }}
        </p>
        <p v-if="subscription.paymentMethodLabel">
          <span class="font-bold text-on-surface">Payment:</span>
          {{ subscription.paymentMethodLabel }}
        </p>
        <p>
          <span class="font-bold text-on-surface">Status:</span>
          {{ subscription.status === 'active' ? 'Active' : 'Cancelled' }}
        </p>
      </div>
    </div>
  </section>
</template>
