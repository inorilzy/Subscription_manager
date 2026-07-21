<script setup lang="ts">
import { computed } from 'vue'
import { cycleProgressTone, type CycleProgress, type CycleProgressTone } from '../domain/billing'

const props = withDefaults(
  defineProps<{
    progress: CycleProgress
    label: string
    compact?: boolean
    testId?: string
  }>(),
  {
    compact: false,
    testId: undefined,
  },
)

const remainingPercent = computed(() => Math.round(props.progress.remainingFraction * 100))
const tone = computed<CycleProgressTone>(() => cycleProgressTone(props.progress))
const fillColor = computed(() => {
  if (tone.value === 'red') return 'var(--color-error)'
  if (tone.value === 'orange') return 'var(--color-tertiary-container)'
  return 'var(--color-primary-container)'
})
</script>

<template>
  <div
    :class="compact ? 'mini-progress' : 'tactile-progress'"
    role="progressbar"
    :aria-label="label"
    :aria-valuenow="remainingPercent"
    aria-valuemin="0"
    aria-valuemax="100"
    :data-testid="testId"
    :data-tone="tone"
    :data-remaining-percent="remainingPercent"
  >
    <div
      :class="compact ? 'mini-progress-fill' : 'tactile-progress-fill'"
      class="transition-[width,background-color] duration-300"
      :style="{
        width: `${remainingPercent}%`,
        backgroundColor: fillColor,
      }"
      aria-hidden="true"
    />
  </div>
</template>
