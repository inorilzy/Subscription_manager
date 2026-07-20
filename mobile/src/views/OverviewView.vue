<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { countActiveSubscriptions } from '../database/client'

const activeCount = ref(0)
const loaded = ref(false)

onMounted(async () => {
  activeCount.value = await countActiveSubscriptions()
  loaded.value = true
})
</script>

<template>
  <section class="space-y-4">
    <header class="space-y-1">
      <p class="text-sm font-bold uppercase tracking-wide text-primary">Hi, Saver!</p>
      <h1 class="font-headline text-3xl font-extrabold text-on-surface">Overview</h1>
    </header>

    <div v-if="loaded" class="tactile-card space-y-3 p-5">
      <h2 class="font-headline text-xl font-bold text-on-surface">Your Sub Squad</h2>
      <div class="grid grid-cols-2 gap-3">
        <div class="rounded-xl border-2 border-surface-container-highest bg-surface-container-low p-4 text-center">
          <p class="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Active</p>
          <p class="font-headline text-3xl font-extrabold text-primary">{{ activeCount }}</p>
        </div>
        <div class="rounded-xl border-2 border-surface-container-highest bg-surface-container-low p-4 text-center">
          <p class="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Monthly</p>
          <p class="font-headline text-3xl font-extrabold text-error">$0</p>
        </div>
      </div>
      <p v-if="activeCount === 0" class="text-center text-on-surface-variant">
        No subscriptions yet. Track your first recurring expense to start your Sub Squad.
      </p>
    </div>
  </section>
</template>
