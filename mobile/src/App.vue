<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterView } from 'vue-router'
import AppBottomNav from './components/AppBottomNav.vue'
import { getDatabase } from './database/client'

const ready = ref(false)
const bootError = ref<string | null>(null)

onMounted(async () => {
  try {
    await getDatabase()
    ready.value = true
  } catch (error) {
    bootError.value = error instanceof Error ? error.message : 'Failed to start local database'
  }
})
</script>

<template>
  <div class="app-shell">
    <div v-if="bootError" class="p-4 text-error" role="alert">
      {{ bootError }}
    </div>

    <template v-else-if="ready">
      <div data-testid="app-ready" class="flex min-h-0 flex-1 flex-col">
        <main class="flex-1 px-4 pt-4">
          <RouterView />
        </main>
        <AppBottomNav />
      </div>
    </template>

    <div v-else class="p-4 text-on-surface-variant" data-testid="app-loading">
      Starting SubScout…
    </div>
  </div>
</template>
