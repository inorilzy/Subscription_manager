<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const items = [
  { name: 'overview', label: 'Overview', to: '/', testId: 'nav-overview' },
  {
    name: 'subscriptions',
    label: 'Subscriptions',
    to: '/subscriptions',
    testId: 'nav-subscriptions',
  },
  { name: 'stats', label: 'Stats', to: '/stats', testId: 'nav-stats' },
  { name: 'settings', label: 'Settings', to: '/settings', testId: 'nav-settings' },
] as const

const activeName = computed(() => String(route.name ?? 'overview'))

async function navigate(to: string) {
  await router.push(to)
}
</script>

<template>
  <nav class="nav-shell" aria-label="Primary">
    <div class="mx-auto flex max-w-[1040px] items-center justify-around px-4 py-3">
      <button
        v-for="item in items"
        :key="item.name"
        type="button"
        :data-testid="item.testId"
        class="nav-item"
        :class="{ 'nav-item-active': activeName === item.name }"
        @click="navigate(item.to)"
      >
        <span>{{ item.label }}</span>
      </button>
    </div>
  </nav>
</template>
