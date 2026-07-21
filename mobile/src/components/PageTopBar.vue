<script setup lang="ts">
import { ArrowLeft, Sprout } from '@lucide/vue'

withDefaults(
  defineProps<{
    title: string
    back?: boolean
    backLabel?: string
    backTestId?: string
    brand?: boolean
  }>(),
  {
    back: false,
    backLabel: 'Back',
    backTestId: undefined,
    brand: false,
  },
)

const emit = defineEmits<{
  back: []
}>()
</script>

<template>
  <header class="top-app-bar">
    <div class="top-app-bar-inner">
      <div v-if="back" class="flex min-h-11 min-w-0 items-center gap-1">
        <button
          type="button"
          class="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-primary active:translate-y-0.5"
          :aria-label="backLabel"
          :data-testid="backTestId"
          @click="emit('back')"
        >
          <ArrowLeft :size="24" :stroke-width="2.5" aria-hidden="true" />
        </button>
        <span class="top-app-bar-title truncate">{{ title }}</span>
      </div>

      <div v-else class="flex min-h-11 items-center gap-2">
        <span
          v-if="brand"
          class="inline-flex size-9 items-center justify-center rounded-xl border-2 border-primary bg-primary-container text-on-primary-container"
          aria-hidden="true"
        >
          <Sprout :size="21" :stroke-width="2.6" />
        </span>
        <h1 v-if="!brand" class="top-app-bar-title">{{ title }}</h1>
        <span v-else class="top-app-bar-title">{{ title }}</span>
      </div>

      <div class="flex items-center gap-2">
        <slot name="action" />
      </div>
    </div>
  </header>
</template>
