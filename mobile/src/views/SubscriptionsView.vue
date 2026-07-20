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
      <h1 class="font-headline text-3xl font-extrabold text-primary">Subscriptions</h1>
      <p class="text-on-surface-variant">All tracked recurring services</p>
    </header>

    <div v-if="loaded && activeCount === 0" class="tactile-card space-y-2 p-6 text-center">
      <p class="font-headline text-xl font-bold text-on-surface">No subscriptions yet</p>
      <p class="text-on-surface-variant">Track your first subscription to see it here.</p>
    </div>
  </section>
</template>
