<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { listSubscriptions } from '../application/subscriptions'
import { formatMinorAmount } from '../domain/money'
import {
  billingIntervalLabel,
  relativeBillingLabel,
  type Subscription,
} from '../domain/subscription'

const router = useRouter()
const items = ref<Subscription[]>([])
const loaded = ref(false)

onMounted(async () => {
  items.value = await listSubscriptions()
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
        <h1 class="font-headline text-3xl font-extrabold text-primary">Subscriptions</h1>
        <p class="text-on-surface-variant">All tracked recurring services</p>
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

    <div v-if="loaded && items.length === 0" class="tactile-card space-y-3 p-6 text-center">
      <p class="font-headline text-xl font-bold text-on-surface">No subscriptions yet</p>
      <p class="text-on-surface-variant">Track your first subscription to see it here.</p>
      <button
        type="button"
        class="tactile-btn mx-auto px-5 py-3"
        data-testid="add-subscription-empty"
        @click="openCreate"
      >
        Add subscription
      </button>
    </div>

    <ul v-else-if="loaded" class="space-y-3" data-testid="subscription-list">
      <li v-for="item in items" :key="item.id">
        <button
          type="button"
          class="tactile-card w-full space-y-2 p-4 text-left"
          data-testid="subscription-item"
          :data-id="item.id"
          @click="openDetail(item.id)"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-xs font-bold uppercase tracking-wide text-primary">
                {{ item.category }}
              </p>
              <p class="font-headline text-xl font-bold text-on-surface">{{ item.name }}</p>
            </div>
            <p class="font-headline text-xl font-extrabold text-error">
              {{ formatMinorAmount(item.amountMinor, item.currency) }}
            </p>
          </div>
          <div class="flex flex-wrap gap-2 text-sm text-on-surface-variant">
            <span>{{ billingIntervalLabel(item.billingInterval) }}</span>
            <span>·</span>
            <span>{{ item.nextBillingDate }}</span>
            <span>·</span>
            <span>{{ relativeBillingLabel(item.nextBillingDate) }}</span>
          </div>
        </button>
      </li>
    </ul>
  </section>
</template>
