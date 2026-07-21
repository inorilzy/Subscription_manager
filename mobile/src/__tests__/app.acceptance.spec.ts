import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import App from '../App.vue'
import router from '../router'
import { resetDatabaseForTests, reinitializeDatabaseKeepingDataForTests } from '../database/client'
import { setNow } from '../domain/clock'
import { assertCatalogComplete } from '../i18n/messages'

async function mountApp(): Promise<VueWrapper> {
  setActivePinia(createPinia())
  await router.push('/')
  await router.isReady()

  const wrapper = mount(App, {
    global: {
      plugins: [createPinia(), router],
    },
    attachTo: document.body,
  })

  await flushPromises()
  await nextTick()
  return wrapper
}

async function openDestination(_wrapper: VueWrapper, testId: string, path: string) {
  expect(_wrapper.find(`[data-testid="${testId}"]`).exists()).toBe(true)
  await router.push(path)
  await flushPromises()
  await nextTick()
}

async function openCreateFrom(wrapper: VueWrapper, source: 'overview' | 'subscriptions') {
  if (source === 'subscriptions') {
    await openDestination(wrapper, 'nav-subscriptions', '/subscriptions')
  } else {
    await openDestination(wrapper, 'nav-overview', '/')
  }

  expect(wrapper.find('[data-testid="add-subscription"]').exists()).toBe(true)
  await router.push({ name: 'subscription-create' })
  await flushPromises()
  await nextTick()
  expect(router.currentRoute.value.name).toBe('subscription-create')
  expect(wrapper.find('[data-testid="subscription-form"]').exists()).toBe(true)
}

async function fillAndSubmitSubscription(
  wrapper: VueWrapper,
  values: {
    name: string
    amount: string
    nextBillingDate: string
    category?: string
    planName?: string
    paymentMethodLabel?: string
    billingInterval?: 'monthly' | 'yearly'
  },
) {
  await wrapper.get('[data-testid="subscription-name"]').setValue(values.name)
  await wrapper.get('[data-testid="subscription-amount"]').setValue(values.amount)
  await wrapper
    .get('[data-testid="subscription-next-billing-date"]')
    .setValue(values.nextBillingDate)

  if (values.billingInterval) {
    await wrapper
      .get('[data-testid="subscription-billing-interval"]')
      .setValue(values.billingInterval)
  }
  if (values.category) {
    await wrapper.get('[data-testid="subscription-category"]').setValue(values.category)
  }
  if (values.planName) {
    await wrapper.get('[data-testid="subscription-plan-name"]').setValue(values.planName)
  }
  if (values.paymentMethodLabel) {
    await wrapper
      .get('[data-testid="subscription-payment-method"]')
      .setValue(values.paymentMethodLabel)
  }

  await wrapper.get('[data-testid="subscription-form"]').trigger('submit')
  await flushPromises()
  await nextTick()
  await flushPromises()
}

describe('installable local-first app', () => {
  beforeEach(async () => {
    setNow('2030-01-15T12:00:00')
    await resetDatabaseForTests()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    setNow(null)
    document.body.innerHTML = ''
  })

  it('starts from a migrated empty database and navigates four destinations', async () => {
    const wrapper = await mountApp()

    expect(wrapper.find('[data-testid="app-ready"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('No subscriptions yet')
    expect(wrapper.text()).toContain('Overview')
    expect(wrapper.find('[data-testid="nav-overview"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="nav-subscriptions"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="nav-stats"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="nav-settings"]').exists()).toBe(true)

    await openDestination(wrapper, 'nav-subscriptions', '/subscriptions')
    expect(router.currentRoute.value.name).toBe('subscriptions')
    expect(wrapper.text()).toContain('No subscriptions yet')
    expect(wrapper.text()).toContain('Track your first subscription')

    await openDestination(wrapper, 'nav-stats', '/stats')
    expect(router.currentRoute.value.name).toBe('stats')
    expect(wrapper.text()).toContain('Scheduled this month')
    expect(wrapper.text()).toContain('$0.00')

    await openDestination(wrapper, 'nav-settings', '/settings')
    expect(router.currentRoute.value.name).toBe('settings')
    expect(wrapper.text()).toContain('USD')
    expect(wrapper.text()).toContain('English')
    expect(wrapper.text()).toContain('WebDAV')
    expect(wrapper.text()).not.toContain('SubScout Pro')
    expect(wrapper.text()).not.toContain('Log Out')
  })
})

describe('first monthly subscription', () => {
  beforeEach(async () => {
    setNow('2030-01-15T12:00:00')
    await resetDatabaseForTests()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    setNow(null)
    document.body.innerHTML = ''
  })

  it('creates a monthly subscription visible in list, details, overview and after reinit', async () => {
    let wrapper = await mountApp()

    await openCreateFrom(wrapper, 'overview')

    await fillAndSubmitSubscription(wrapper, {
      name: 'Netflix',
      amount: '15.99',
      nextBillingDate: '2030-06-15',
      category: 'Entertainment',
      planName: 'Standard',
      paymentMethodLabel: 'Visa ending 4242',
    })

    expect(router.currentRoute.value.name).toBe('subscriptions')
    expect(wrapper.text()).toContain('Netflix')
    expect(wrapper.text()).toContain('$15.99')
    expect(wrapper.text()).toMatch(/Monthly|月付/)
    expect(wrapper.text()).toContain('Entertainment')
    expect(wrapper.text()).toContain('2030-06-15')

    const id = wrapper.get('[data-testid="subscription-item"]').attributes('data-id')
    expect(id).toBeTruthy()
    await router.push({ name: 'subscription-detail', params: { id: String(id) } })
    await flushPromises()
    await nextTick()

    expect(router.currentRoute.value.name).toBe('subscription-detail')
    expect(wrapper.text()).toContain('Netflix')
    expect(wrapper.text()).toContain('$15.99')
    expect(wrapper.text()).toContain('2030-06-15')
    expect(wrapper.text()).toContain('Standard')
    expect(wrapper.text()).toContain('Visa ending 4242')
    expect(wrapper.text()).toMatch(/day|天/)

    await openDestination(wrapper, 'nav-overview', '/')
    expect(wrapper.text()).toContain('1')
    expect(wrapper.text()).toContain('$15.99')
    expect(wrapper.text()).toContain('Netflix')

    await reinitializeDatabaseKeepingDataForTests()

    wrapper.unmount()
    document.body.innerHTML = ''
    wrapper = await mountApp()

    await openDestination(wrapper, 'nav-subscriptions', '/subscriptions')
    expect(wrapper.text()).toContain('Netflix')
    expect(wrapper.text()).toContain('$15.99')

    await openDestination(wrapper, 'nav-overview', '/')
    expect(wrapper.text()).toContain('Netflix')
    expect(wrapper.text()).toContain('$15.99')
  })

  it('rejects invalid amounts without creating a subscription', async () => {
    const wrapper = await mountApp()

    await openCreateFrom(wrapper, 'subscriptions')

    await fillAndSubmitSubscription(wrapper, {
      name: 'Bad Sub',
      amount: '0',
      nextBillingDate: '2030-08-01',
    })

    expect(router.currentRoute.value.name).toBe('subscription-create')
    expect(wrapper.text()).toMatch(/amount|金额/i)

    await router.push({ name: 'subscriptions' })
    await flushPromises()
    await nextTick()

    expect(router.currentRoute.value.name).toBe('subscriptions')
    expect(wrapper.text()).toContain('No subscriptions yet')
    expect(wrapper.text()).not.toContain('Bad Sub')
  })

  it('uses Other category when none is selected', async () => {
    const wrapper = await mountApp()

    await openCreateFrom(wrapper, 'overview')

    await fillAndSubmitSubscription(wrapper, {
      name: 'Mystery Box',
      amount: '4.50',
      nextBillingDate: '2030-09-10',
    })

    expect(wrapper.text()).toContain('Mystery Box')
    expect(wrapper.text()).toContain('Other')
  })
})

describe('theme language currency', () => {
  beforeEach(async () => {
    setNow('2030-01-15T12:00:00')
    await resetDatabaseForTests()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    setNow(null)
    document.body.innerHTML = ''
  })

  it('has complete en and zh-CN catalogs', () => {
    expect(() => assertCatalogComplete()).not.toThrow()
  })

  it('switches language and theme, warns on currency change with existing data, and persists', async () => {
    let wrapper = await mountApp()

    await openCreateFrom(wrapper, 'overview')
    await fillAndSubmitSubscription(wrapper, {
      name: 'Netflix',
      amount: '15.99',
      nextBillingDate: '2030-06-15',
      category: 'Entertainment',
    })

    await openDestination(wrapper, 'nav-settings', '/settings')
    await wrapper.get('[data-testid="settings-language"]').setValue('zh-CN')
    await flushPromises()
    await nextTick()
    expect(wrapper.text()).toContain('设置')
    expect(wrapper.text()).toContain('外观')

    await wrapper.get('[data-testid="settings-theme"]').setValue('dark')
    await flushPromises()
    await nextTick()
    expect(document.documentElement.dataset.theme).toBe('dark')

    await wrapper.get('[data-testid="settings-currency"]').setValue('CNY')
    await flushPromises()
    await nextTick()
    expect(wrapper.find('[data-testid="currency-warning"]').exists()).toBe(true)
    await wrapper.get('[data-testid="currency-warning-cancel"]').trigger('click')
    await flushPromises()
    await nextTick()
    expect(wrapper.find('[data-testid="currency-warning"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="settings-currency"]').element).toHaveProperty('value', 'USD')

    await wrapper.get('[data-testid="settings-currency"]').setValue('CNY')
    await flushPromises()
    await nextTick()
    await wrapper.get('[data-testid="currency-warning-confirm"]').trigger('click')
    await flushPromises()
    await nextTick()
    expect(wrapper.get('[data-testid="settings-currency"]').element).toHaveProperty('value', 'CNY')

    await openDestination(wrapper, 'nav-subscriptions', '/subscriptions')
    expect(wrapper.text()).toContain('订阅')
    expect(wrapper.text()).toContain('Netflix')

    await reinitializeDatabaseKeepingDataForTests()
    wrapper.unmount()
    document.body.innerHTML = ''
    wrapper = await mountApp()

    await openDestination(wrapper, 'nav-settings', '/settings')
    expect(wrapper.get('[data-testid="settings-language"]').element).toHaveProperty('value', 'zh-CN')
    expect(wrapper.get('[data-testid="settings-theme"]').element).toHaveProperty('value', 'dark')
    expect(wrapper.get('[data-testid="settings-currency"]').element).toHaveProperty('value', 'CNY')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(wrapper.text()).toContain('设置')
  })
})

describe('monthly and yearly renewals', () => {
  beforeEach(async () => {
    setNow('2030-01-15T12:00:00')
    await resetDatabaseForTests()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    setNow(null)
    document.body.innerHTML = ''
  })

  it('creates yearly subscriptions and normalizes monthly cost on overview', async () => {
    const wrapper = await mountApp()

    await openCreateFrom(wrapper, 'overview')
    await fillAndSubmitSubscription(wrapper, {
      name: 'Adobe',
      amount: '120.00',
      nextBillingDate: '2030-12-01',
      billingInterval: 'yearly',
      category: 'Productivity',
    })

    expect(wrapper.text()).toContain('Adobe')
    expect(wrapper.text()).toMatch(/Yearly|年付/)
    expect(wrapper.get('[data-testid="subscription-item"]').attributes('data-interval')).toBe(
      'yearly',
    )

    await openDestination(wrapper, 'nav-overview', '/')
    // 120.00 yearly => 10.00 normalized monthly
    expect(wrapper.get('[data-testid="overview-monthly"]').text()).toContain('$10.00')
    expect(wrapper.text()).toContain('Adobe')
  })

  it('advances overdue next billing dates on load while preserving anchor', async () => {
    setNow('2030-03-15T12:00:00')
    const wrapper = await mountApp()

    await openCreateFrom(wrapper, 'overview')
    await fillAndSubmitSubscription(wrapper, {
      name: 'Old Monthly',
      amount: '9.00',
      nextBillingDate: '2030-01-31',
      billingInterval: 'monthly',
    })

    // From 2030-01-31 with today 2030-03-15 and anchor 31:
    // Feb 2030 -> 2030-02-28, Mar 2030 -> 2030-03-31
    expect(wrapper.text()).toContain('2030-03-31')
    expect(wrapper.text()).not.toContain('2030-01-31')
  })
})

describe('subscription lifecycle', () => {
  beforeEach(async () => {
    setNow('2030-01-15T12:00:00')
    await resetDatabaseForTests()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    setNow(null)
    document.body.innerHTML = ''
  })

  it('edits, cancels, excludes from overview, reactivates, and deletes', async () => {
    const wrapper = await mountApp()

    await openCreateFrom(wrapper, 'overview')
    await fillAndSubmitSubscription(wrapper, {
      name: 'Netflix',
      amount: '15.99',
      nextBillingDate: '2030-06-15',
      category: 'Entertainment',
    })

    const id = wrapper.get('[data-testid="subscription-item"]').attributes('data-id')!
    await router.push({ name: 'subscription-edit', params: { id } })
    await flushPromises()
    await nextTick()
    await flushPromises()
    expect(wrapper.get('[data-testid="subscription-name"]').element).toHaveProperty(
      'value',
      'Netflix',
    )
    await wrapper.get('[data-testid="subscription-name"]').setValue('Netflix Plus')
    await wrapper.get('[data-testid="subscription-amount"]').setValue('18.99')
    await wrapper.get('[data-testid="subscription-form"]').trigger('submit')
    await flushPromises()
    await nextTick()
    await flushPromises()

    expect(wrapper.text()).toContain('Netflix Plus')
    expect(wrapper.text()).toContain('$18.99')

    await wrapper.get('[data-testid="subscription-cancel-action"]').trigger('click')
    await flushPromises()
    await nextTick()
    expect(wrapper.get('[data-testid="subscription-status"]').text()).toMatch(/Cancelled|已取消/)

    await openDestination(wrapper, 'nav-overview', '/')
    expect(wrapper.text()).not.toContain('Netflix Plus')
    expect(wrapper.get('[data-testid="overview-monthly"]').text()).toContain('$0.00')

    await router.push({ name: 'subscription-detail', params: { id } })
    await flushPromises()
    await nextTick()
    await wrapper.get('[data-testid="subscription-reactivate"]').trigger('click')
    await flushPromises()
    await nextTick()
    expect(wrapper.get('[data-testid="subscription-status"]').text()).toMatch(/Active|有效/)

    await openDestination(wrapper, 'nav-overview', '/')
    expect(wrapper.text()).toContain('Netflix Plus')
    expect(wrapper.get('[data-testid="overview-monthly"]').text()).toContain('$18.99')

    await router.push({ name: 'subscription-detail', params: { id } })
    await flushPromises()
    await nextTick()
    await wrapper.get('[data-testid="subscription-delete"]').trigger('click')
    await flushPromises()
    await nextTick()
    await wrapper.get('[data-testid="delete-confirm-yes"]').trigger('click')
    await flushPromises()
    await nextTick()

    expect(router.currentRoute.value.name).toBe('subscriptions')
    expect(wrapper.text()).toContain('No subscriptions yet')
    expect(wrapper.text()).not.toContain('Netflix Plus')
  })
})

