const fs = require('fs')
const path = require('path')

function patch(file, mutator) {
  const p = path.join('src', file)
  let c = fs.readFileSync(p, 'utf8')
  c = mutator(c)
  fs.writeFileSync(p, c)
  console.log('patched', file)
}

// Create view
patch('views/SubscriptionCreateView.vue', (c) => {
  if (!c.includes("import { SUPPORTED_CURRENCIES")) {
    c = c.replace(
      "import { ValidationError } from '../domain/subscription'\nimport { usePreferencesStore } from '../stores/preferences'",
      "import { currencyLabel, SUPPORTED_CURRENCIES, type CurrencyCode } from '../domain/money'\nimport { ValidationError } from '../domain/subscription'\nimport { usePreferencesStore } from '../stores/preferences'",
    )
  }
  c = c.replace(
    "const amount = ref('')\nconst nextBillingDate = ref('')",
    "const amount = ref('')\nconst currency = ref<CurrencyCode>(preferences.currency)\nconst nextBillingDate = ref('')",
  )
  c = c.replace(
    "currency: preferences.currency,",
    "currency: currency.value,",
  )
  if (!c.includes('data-testid="subscription-currency"')) {
    c = c.replace(
      `      <div class="space-y-1">
        <label class="text-sm font-bold text-on-surface" for="subscription-billing-interval">
          {{ preferences.t('create.billingCycle') }}
        </label>`,
      `      <div class="space-y-1">
        <label class="text-sm font-bold text-on-surface" for="subscription-currency">
          {{ preferences.t('create.currency') }}
        </label>
        <select
          id="subscription-currency"
          v-model="currency"
          data-testid="subscription-currency"
          class="w-full rounded-xl border-2 border-surface-container-highest bg-surface-container-lowest px-3 py-3"
        >
          <option v-for="code in SUPPORTED_CURRENCIES" :key="code" :value="code">
            {{ currencyLabel(code, preferences.language) }}
          </option>
        </select>
      </div>

      <div class="space-y-1">
        <label class="text-sm font-bold text-on-surface" for="subscription-billing-interval">
          {{ preferences.t('create.billingCycle') }}
        </label>`,
    )
  }
  // whole-number amount error message localization fallback
  if (!c.includes('Enter a whole-number amount greater than zero.')) {
    c = c.replace(
      "'Enter a valid amount greater than zero with up to two decimal places.':\n      preferences.t('error.amountInvalid'),",
      "'Enter a valid amount greater than zero with up to two decimal places.':\n      preferences.t('error.amountInvalid'),\n    'Enter a whole-number amount greater than zero.': preferences.t('error.amountInvalid'),",
    )
  }
  return c
})

// Edit view
patch('views/SubscriptionEditView.vue', (c) => {
  if (!c.includes("import { currencyLabel")) {
    c = c.replace(
      "import { ValidationError } from '../domain/subscription'\nimport { usePreferencesStore } from '../stores/preferences'",
      "import { currencyLabel, majorInputFromMinor, SUPPORTED_CURRENCIES, type CurrencyCode } from '../domain/money'\nimport { ValidationError } from '../domain/subscription'\nimport { usePreferencesStore } from '../stores/preferences'",
    )
  }
  if (!c.includes('const currency = ref')) {
    c = c.replace(
      "const amount = ref('')\nconst nextBillingDate = ref('')",
      "const amount = ref('')\nconst currency = ref<CurrencyCode>(preferences.currency)\nconst nextBillingDate = ref('')",
    )
  }
  c = c.replace(
    "amount.value = (existing.amountMinor / 100).toFixed(2)",
    "amount.value = majorInputFromMinor(existing.amountMinor, existing.currency)\n  currency.value = (existing.currency as CurrencyCode) || preferences.currency",
  )
  if (!c.includes('currency: currency.value')) {
    c = c.replace(
      "billingInterval: billingInterval.value,\n      currency: preferences.currency,",
      "billingInterval: billingInterval.value,\n      currency: currency.value,",
    )
  }
  if (!c.includes('data-testid="subscription-currency"')) {
    c = c.replace(
      `      <div class="space-y-1">
        <label class="text-sm font-bold text-on-surface" for="subscription-billing-interval">
          {{ preferences.t('create.billingCycle') }}
        </label>`,
      `      <div class="space-y-1">
        <label class="text-sm font-bold text-on-surface" for="subscription-currency">
          {{ preferences.t('create.currency') }}
        </label>
        <select
          id="subscription-currency"
          v-model="currency"
          data-testid="subscription-currency"
          class="w-full rounded-xl border-2 border-surface-container-highest bg-surface-container-lowest px-3 py-3"
        >
          <option v-for="code in SUPPORTED_CURRENCIES" :key="code" :value="code">
            {{ currencyLabel(code, preferences.language) }}
          </option>
        </select>
      </div>

      <div class="space-y-1">
        <label class="text-sm font-bold text-on-surface" for="subscription-billing-interval">
          {{ preferences.t('create.billingCycle') }}
        </label>`,
    )
  }
  return c
})

// Overview view
patch('views/OverviewView.vue', (c) => {
  c = c.replace(
    'const monthlyMinor = ref(0)',
    "const monthlyByCurrency = ref<Array<{ currency: string; amountMinor: number }>>([])",
  )
  c = c.replace(
    `  activeCount.value = snapshot.activeCount
  monthlyMinor.value = snapshot.monthlyRecurringMinor
  upcoming.value = snapshot.upcoming`,
    `  activeCount.value = snapshot.activeCount
  monthlyByCurrency.value = snapshot.monthlyByCurrency
  upcoming.value = snapshot.upcoming`,
  )
  c = c.replace(
    /<p class="font-headline text-3xl font-extrabold text-error" data-testid="overview-monthly">\s*\{\{ preferences\.formatAmount\(monthlyMinor\) \}\}\s*<\/p>/,
    `<div class="space-y-1" data-testid="overview-monthly">
            <p
              v-for="row in monthlyByCurrency"
              :key="row.currency"
              class="font-headline text-2xl font-extrabold text-error"
            >
              {{ preferences.formatAmount(row.amountMinor, row.currency as never) }}
            </p>
            <p v-if="monthlyByCurrency.length === 0" class="font-headline text-3xl font-extrabold text-error">
              {{ preferences.formatAmount(0) }}
            </p>
          </div>`,
  )
  return c
})

// Stats view
patch('views/StatsView.vue', (c) => {
  // replace deltaLabel and maxCategory and template body for multi-currency
  c = c.replace(
    /const deltaLabel = computed\(\(\) => \{[\s\S]*?\}\)\n\nconst maxCategory = computed\(\(\) =>\n  stats\.value\?\.categories\.reduce\(\(max, item\) => Math\.max\(max, item\.amountMinor\), 0\) \?\? 0,\n\)/,
    `function deltaFor(currency: string): string {
  if (!stats.value) return ''
  const current = stats.value.totalsByCurrency.find((row) => row.currency === currency)?.amountMinor ?? 0
  const previous = stats.value.previousTotalsByCurrency.find((row) => row.currency === currency)?.amountMinor ?? 0
  const delta = current - previous
  if (delta === 0) {
    return preferences.language === 'zh-CN' ? '与上月持平' : 'Flat vs last month'
  }
  const formatted = preferences.formatAmount(Math.abs(delta), currency as never)
  if (delta > 0) {
    return preferences.language === 'zh-CN' ? \`比上月多 \${formatted}\` : \`Up \${formatted} vs last month\`
  }
  return preferences.language === 'zh-CN' ? \`比上月少 \${formatted}\` : \`Down \${formatted} vs last month\`
}

function maxCategory(currency: string): number {
  const group = stats.value?.categoriesByCurrency.find((row) => row.currency === currency)
  return group?.categories.reduce((max, item) => Math.max(max, item.amountMinor), 0) ?? 0
}`,
  )

  c = c.replace(
    /<div v-if="loaded && stats" class="tactile-card space-y-3 p-6 text-center">[\s\S]*?<\/div>\n\n    <div v-if="loaded && stats" class="tactile-card space-y-3 p-6">[\s\S]*?<\/div>\n  <\/section>/,
    `<div v-if="loaded && stats" class="tactile-card space-y-3 p-6 text-center">
      <p class="text-sm font-bold uppercase tracking-widest text-on-surface-variant">
        {{ preferences.t('stats.scheduled') }}
      </p>
      <div data-testid="stats-total" class="space-y-2">
        <div v-for="row in stats.totalsByCurrency" :key="row.currency">
          <p class="font-headline text-4xl font-extrabold text-error">
            {{ preferences.formatAmount(row.amountMinor, row.currency as never) }}
          </p>
          <p class="text-on-surface-variant" data-testid="stats-delta">{{ deltaFor(row.currency) }}</p>
        </div>
        <p v-if="stats.totalsByCurrency.length === 0" class="font-headline text-5xl font-extrabold text-error">
          {{ preferences.formatAmount(0) }}
        </p>
      </div>
      <p class="text-xs text-on-surface-variant">
        {{
          preferences.language === 'zh-CN'
            ? '不同币种分别统计，不做汇率换算。'
            : 'Amounts are grouped by currency with no FX conversion.'
        }}
      </p>
      <p v-if="stats.totalsByCurrency.length === 0" class="text-on-surface-variant">
        {{ preferences.t('stats.zeroBody') }}
      </p>
    </div>

    <div v-if="loaded && stats" class="tactile-card space-y-4 p-6">
      <h2 class="font-headline text-xl font-bold text-on-surface">
        {{ preferences.t('stats.categories') }}
      </h2>
      <p v-if="stats.categoriesByCurrency.length === 0" class="text-on-surface-variant">
        {{ preferences.t('stats.categoriesEmpty') }}
      </p>
      <div v-for="group in stats.categoriesByCurrency" :key="group.currency" class="space-y-3">
        <p class="text-sm font-bold uppercase tracking-wide text-primary">{{ group.currency }}</p>
        <div
          v-for="item in group.categories"
          :key="group.currency + item.category"
          class="space-y-1"
          data-testid="stats-category-row"
        >
          <div class="flex items-center justify-between text-sm font-bold">
            <span>{{ item.category }}</span>
            <span>{{ preferences.formatAmount(item.amountMinor, group.currency as never) }}</span>
          </div>
          <div class="h-3 overflow-hidden rounded-full border-2 border-surface-container-highest bg-surface-container-low">
            <div
              class="h-full bg-primary-container"
              :style="{ width: \`\${maxCategory(group.currency) ? (item.amountMinor / maxCategory(group.currency)) * 100 : 0}%\` }"
            />
          </div>
        </div>
      </div>
    </div>
  </section>`,
  )
  return c
})

// Settings: remove reinterpret warning for global default currency
patch('views/SettingsView.vue', (c) => {
  c = c.replace(
    /async function onCurrencyChange\(event: Event\) \{[\s\S]*?\n\}\n\nasync function confirmCurrencyChange\(\) \{[\s\S]*?\n\}\n\nfunction cancelCurrencyChange\(\) \{[\s\S]*?\n\}\n\nfunction currencyLabel\(code: CurrencyCode\): string \{[\s\S]*?\n\}/,
    `async function onCurrencyChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value as CurrencyCode
  if (value === preferences.currency) return
  await preferences.setCurrency(value)
}

function currencyLabel(code: CurrencyCode): string {
  if (code === 'USD') return 'USD ($)'
  if (code === 'CNY') return 'CNY (¥)'
  if (code === 'EUR') return 'EUR (€)'
  if (code === 'GBP') return 'GBP (£)'
  if (code === 'JPY') return 'JPY (¥)'
  if (code === 'INR') return 'INR (₹)'
  if (code === 'TRY') return 'TRY (₺)'
  return code
}`,
  )
  // drop unused currency warning state/template if still present is ok; keep simple
  return c
})

console.log('all patches applied')
