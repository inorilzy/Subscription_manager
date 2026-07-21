const fs = require('fs')

// Settings cleanup
{
  const p = 'src/views/SettingsView.vue'
  let c = fs.readFileSync(p, 'utf8')
  c = c.replace(/const pendingCurrency = ref<CurrencyCode \| null>\(null\)\n/, '')
  c = c.replace(/const showCurrencyWarning = ref\(false\)\n/, '')
  c = c.replace(/\n\s*<div\n\s*v-if="showCurrencyWarning"[\s\S]*?<\/div>\n(?=\n\s*<div\n\s*v-if="showImportConfirm")/, '\n')
  fs.writeFileSync(p, c)
  console.log('settings cleaned')
}

// preferences store: drop requiresCurrencyWarning
{
  const p = 'src/stores/preferences.ts'
  let c = fs.readFileSync(p, 'utf8')
  c = c.replace(/\n\s*async function requiresCurrencyWarning[\s\S]*?\n\s*\}\n/, '\n')
  c = c.replace(/\n\s*requiresCurrencyWarning,/, '')
  c = c.replace("import { countActiveSubscriptions, getPreference, setPreference } from '../database/client'", "import { getPreference, setPreference } from '../database/client'")
  fs.writeFileSync(p, c)
  console.log('preferences cleaned')
}

// wave3 stats test
{
  const p = 'src/__tests__/wave3.spec.ts'
  let c = fs.readFileSync(p, 'utf8')
  c = c.replace(
    `    const stats = computeMonthStats(items, '2030-06-10')
    expect(stats.totalMinor).toBe(1000 + 12000)
    expect(stats.categories.map((c) => c.category).sort()).toEqual([
      'Entertainment',
      'Productivity',
    ])
    expect(stats.categories.reduce((sum, c) => sum + c.amountMinor, 0)).toBe(stats.totalMinor)`,
    `    const stats = computeMonthStats(items, '2030-06-10')
    expect(stats.totalsByCurrency).toEqual([{ currency: 'USD', amountMinor: 1000 + 12000 }])
    const cats = stats.categoriesByCurrency[0]?.categories ?? []
    expect(cats.map((c) => c.category).sort()).toEqual(['Entertainment', 'Productivity'])
    expect(cats.reduce((sum, c) => sum + c.amountMinor, 0)).toBe(1000 + 12000)`,
  )
  // multi-currency case
  if (!c.includes('groups stats by subscription currency')) {
    c = c.replace(
      `    setNow(null)
  })
})

describe('reminders and backup'`,
      `    setNow(null)
  })

  it('groups stats by subscription currency without FX conversion', () => {
    setNow('2030-06-10T12:00:00')
    const items = [
      sample({
        id: 'usd',
        name: 'Netflix',
        amountMinor: 1599,
        currency: 'USD',
        nextBillingDate: '2030-06-15',
      }),
      sample({
        id: 'cny',
        name: 'iQIYI',
        amountMinor: 2500,
        currency: 'CNY',
        nextBillingDate: '2030-06-20',
        category: 'Entertainment',
      }),
    ]
    const stats = computeMonthStats(items, '2030-06-10')
    expect(stats.totalsByCurrency).toEqual([
      { currency: 'CNY', amountMinor: 2500 },
      { currency: 'USD', amountMinor: 1599 },
    ])
    setNow(null)
  })
})

describe('reminders and backup'`,
    )
  }
  fs.writeFileSync(p, c)
  console.log('wave3 updated')
}

// acceptance: remove currency warning flow; just switch defaults
{
  const p = 'src/__tests__/app.acceptance.spec.ts'
  let c = fs.readFileSync(p, 'utf8')
  c = c.replace(
    `    await wrapper.get('[data-testid="settings-currency"]').setValue('USD')
    await flushPromises()
    await nextTick()
    expect(wrapper.find('[data-testid="currency-warning"]').exists()).toBe(true)
    await wrapper.get('[data-testid="currency-warning-cancel"]').trigger('click')
    await flushPromises()
    await nextTick()
    expect(wrapper.find('[data-testid="currency-warning"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="settings-currency"]').element).toHaveProperty('value', 'CNY')

    await wrapper.get('[data-testid="settings-currency"]').setValue('USD')
    await flushPromises()
    await nextTick()
    await wrapper.get('[data-testid="currency-warning-confirm"]').trigger('click')
    await flushPromises()
    await nextTick()
    expect(wrapper.get('[data-testid="settings-currency"]').element).toHaveProperty('value', 'USD')`,
    `    await wrapper.get('[data-testid="settings-currency"]').setValue('USD')
    await flushPromises()
    await nextTick()
    expect(wrapper.get('[data-testid="settings-currency"]').element).toHaveProperty('value', 'USD')`,
  )
  // overview monthly assertion may still use single amount; keep flexible
  c = c.replace(
    "expect(wrapper.get('[data-testid=\"overview-monthly\"]').text()).toMatch(/10\\.00/)",
    "expect(wrapper.get('[data-testid=\"overview-monthly\"]').text()).toMatch(/10\\.00/)",
  )
  c = c.replace(
    "expect(wrapper.get('[data-testid=\"overview-monthly\"]').text()).toMatch(/0\\.00/)",
    "expect(wrapper.get('[data-testid=\"overview-monthly\"]').text()).toMatch(/0\\.00/)",
  )
  c = c.replace(
    "expect(wrapper.get('[data-testid=\"overview-monthly\"]').text()).toMatch(/18\\.99/)",
    "expect(wrapper.get('[data-testid=\"overview-monthly\"]').text()).toMatch(/18\\.99/)",
  )
  fs.writeFileSync(p, c)
  console.log('acceptance updated')
}

console.log('done')
