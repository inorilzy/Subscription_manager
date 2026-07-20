<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getOverviewSnapshot } from '../application/subscriptions'
import { formatMinorAmount } from '../domain/money'
import {
  billingIntervalLabel,
  relativeBillingLabel,
  type Subscription,
} from '../domain/subscription'

const router = useRouter()
const activeCount = ref(0)
const monthlyMinor = ref(0)
const upcoming = ref<Subscription[]>([])
const loaded = ref(false)

onMounted(async () => {
  const snapshot = await getOverviewSnapshot()
  activeCount.value = snapshot.activeCount
  monthlyMinor.value = snapshot.monthlyRecurringMinor
  upcoming.value = snapshot.upcoming
  loaded.value = true
})

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
        <p class="text-sm font-bold uppercase tracking-wide text-primary">Hi, Saver!</p>
        <h1 class="font-headline text-3xl font-extrabold text-on-surface">Overview</h1>
      </div>
      <button
        type="button"
        data-testid="add-subscription"
        class="tactile-btn px-4 py-3"
        @click="openCreate"
      >
        Add
      </button>
    </header>

    <div v-if="loaded" class="tactile-card space-y-3 p-5">
      <h2 class="font-headline text-xl font-bold text-on-surface">Your Sub Squad</h2>
      <div class="grid grid-cols-2 gap-3">
        <div
          class="rounded-xl border-2 border-surface-container-highest bg-surface-container-low p-4 text-center"
        >
          <p class="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Active</p>
          <p class="font-headline text-3xl font-extrabold text-primary">{{ activeCount }}</p>
        </div>
        <div
          class="rounded-xl border-2 border-surface-container-highest bg-surface-container-low p-4 text-center"
        >
          <p class="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Monthly</p>
          <p class="font-headline text-3xl font-extrabold text-error">
            {{ formatMinorAmount(monthlyMinor) }}
          </p>
        </div>
      </div>
      <p v-if="activeCount === 0" class="text-center text-on-surface-variant">
        No subscriptions yet. Track your first recurring expense to start your Sub Squad.
      </p>
    </div>

    <div v-if="loaded && upcoming.length > 0" class="space-y-3">
      <h2 class="font-headline text-xl font-bold text-on-surface">Upcoming payments</h2>
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
            {{ billingIntervalLabel(item.billingInterval) }} ·
            {{ relativeBillingLabel(item.nextBillingDate) }}
          </p>
        </div>
        <p class="font-headline text-lg font-extrabold text-error">
          {{ formatMinorAmount(item.amountMinor, item.currency) }}
        </p>
      </button>
    </div>
  </section>
</template>
