<script setup lang="ts">
import { computed } from 'vue'
import type { CategoryDonutModel } from '../domain/stats'

const props = defineProps<{
  model: CategoryDonutModel
  formatAmount: (minor: number, currency: string) => string
  centerLabel: string
  emptyLabel: string
}>()

const size = 188
const stroke = 28
const radius = (size - stroke) / 2
const circumference = 2 * Math.PI * radius

const arcs = computed(() => {
  let offset = 0
  return props.model.slices.map((slice) => {
    const length = (slice.percent / 100) * circumference
    const arc = {
      ...slice,
      dasharray: `${Math.max(length - 1.5, 0)} ${circumference}`,
      dashoffset: -offset,
    }
    offset += length
    return arc
  })
})

const ariaLabel = computed(() => {
  if (props.model.slices.length === 0) return props.emptyLabel
  const parts = props.model.slices.map(
    (slice) =>
      `${slice.category} ${props.formatAmount(slice.amountMinor, props.model.displayCurrency)} ${slice.percent.toFixed(1)}%`,
  )
  return `${props.centerLabel} ${props.formatAmount(props.model.totalMinor, props.model.displayCurrency)}. ${parts.join('; ')}`
})

function colorVar(token: string): string {
  return `var(--color-${token})`
}
</script>

<template>
  <div class="flex flex-col items-center gap-4 md:flex-row md:items-start md:gap-6">
    <div class="relative shrink-0" data-testid="category-donut">
      <svg
        :width="size"
        :height="size"
        viewBox="0 0 188 188"
        role="img"
        :aria-label="ariaLabel"
        class="-rotate-90"
      >
        <circle
          cx="94"
          cy="94"
          :r="radius"
          fill="none"
          stroke="var(--color-surface-container-highest)"
          :stroke-width="stroke"
        />
        <circle
          v-for="arc in arcs"
          :key="`${arc.category}-${arc.colorToken}`"
          cx="94"
          cy="94"
          :r="radius"
          fill="none"
          :stroke="colorVar(arc.colorToken)"
          :stroke-width="stroke"
          stroke-linecap="butt"
          :stroke-dasharray="arc.dasharray"
          :stroke-dashoffset="arc.dashoffset"
        />
      </svg>
      <div
        class="pointer-events-none absolute inset-0 flex rotate-0 flex-col items-center justify-center px-8 text-center"
      >
        <p class="text-[11px] leading-3 font-bold tracking-wide text-on-surface-variant uppercase">
          {{ centerLabel }}
        </p>
        <p
          class="mt-1 font-headline text-lg leading-5 font-extrabold text-on-surface"
          data-testid="category-donut-total"
        >
          {{
            model.slices.length > 0
              ? formatAmount(model.totalMinor, model.displayCurrency)
              : emptyLabel
          }}
        </p>
      </div>
    </div>

    <ul
      v-if="model.slices.length > 0"
      class="w-full min-w-0 space-y-2"
      data-testid="category-legend"
    >
      <li
        v-for="slice in model.slices"
        :key="slice.category"
        class="flex items-center gap-3"
        data-testid="category-legend-item"
        :data-category="slice.category"
      >
        <span
          class="size-3 shrink-0 rounded-full"
          :style="{ backgroundColor: colorVar(slice.colorToken) }"
          aria-hidden="true"
        />
        <span class="min-w-0 flex-1 truncate text-sm font-bold text-on-surface">
          {{ slice.category }}
        </span>
        <span class="shrink-0 text-sm font-bold text-on-surface-variant">
          {{ formatAmount(slice.amountMinor, model.displayCurrency) }}
        </span>
        <span class="w-12 shrink-0 text-right text-sm font-bold text-on-surface-variant">
          {{ slice.percent.toFixed(1) }}%
        </span>
      </li>
    </ul>
  </div>
</template>
