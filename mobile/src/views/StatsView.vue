<script setup lang="ts">
</script>

<template>
  <section class="space-y-4">
    <header class="flex items-center gap-3">
      <div class="rounded-2xl border-2 border-primary/30 bg-primary-container p-3 text-on-primary-container">
        <span class="font-headline text-xl font-extrabold">Σ</span>
      </div>
      <h1 class="font-headline text-3xl font-extrabold text-on-surface">Your Stats</h1>
    </header>

    <div class="tactile-card space-y-3 p-6 text-center">
      <p class="text-sm font-bold uppercase tracking-widest text-on-surface-variant">
        Scheduled this month
      </p>
      <p class="font-headline text-5xl font-extrabold text-error">$0.00</p>
      <p class="text-on-surface-variant">No charges planned for this calendar month yet.</p>
    </div>

    <div class="tactile-card space-y-3 p-6">
      <h2 class="font-headline text-xl font-bold text-on-surface">Category Breakdown</h2>
      <p class="text-on-surface-variant">Categories will appear after you track subscriptions.</p>
    </div>
  </section>
</template>
