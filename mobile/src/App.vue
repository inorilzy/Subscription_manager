<script setup lang="ts">
import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { onMounted, onUnmounted, ref } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import AppBottomNav from './components/AppBottomNav.vue'
import { reconcileNotifications } from './application/reminders'
import { listSubscriptions } from './application/subscriptions'
import { getDatabase } from './database/client'
import { usePreferencesStore } from './stores/preferences'

const ready = ref(false)
const bootError = ref<string | null>(null)
const preferences = usePreferencesStore()
const router = useRouter()

let removeBackListener: (() => void) | null = null

onMounted(async () => {
  try {
    await getDatabase()
    await preferences.load()

    // Startup reconciliation: advancing overdue dates happens inside
    // listSubscriptions; feeding the result to the notification adapter
    // rebuilds OS schedules against current records.
    const subscriptions = await listSubscriptions({ includeCancelled: true })
    await reconcileNotifications(subscriptions)

    ready.value = true
  } catch (error) {
    bootError.value = error instanceof Error ? error.message : preferences.t('app.bootError')
  }

  if (Capacitor.isNativePlatform()) {
    const handle = await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      if (router.currentRoute.value.path !== '/') {
        router.back()
      } else if (!canGoBack) {
        void CapacitorApp.exitApp()
      }
    })
    removeBackListener = () => {
      void handle.remove()
    }
  }
})

onUnmounted(() => {
  removeBackListener?.()
})
</script>

<template>
  <div class="app-shell" :data-theme="preferences.theme">
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
      {{ preferences.loaded ? preferences.t('app.starting') : 'Starting SubScout…' }}
    </div>
  </div>
</template>
