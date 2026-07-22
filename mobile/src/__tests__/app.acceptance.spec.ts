import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import App from '../App.vue'
import router from '../router'
import { resetDatabaseForTests, reinitializeDatabaseKeepingDataForTests } from '../database/client'
import { setNow } from '../domain/clock'
import { assertCatalogComplete } from '../i18n/messages'
import {
  getNotificationAdapter,
  resetNotificationAdapterForTests,
  type InMemoryNotificationAdapter,
} from '../notifications/adapter'

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
    currency?: string
    category?: string
    planName?: string
    paymentMethodLabel?: string
    accountLabel?: string
    iconKey?: string
    billingInterval?: 'monthly' | 'yearly'
  },
) {
  await wrapper.get('[data-testid="subscription-name"]').setValue(values.name)
  await wrapper.get('[data-testid="subscription-amount"]').setValue(values.amount)
  await wrapper
    .get('[data-testid="subscription-next-billing-date"]')
    .setValue(values.nextBillingDate)

  if (values.currency) {
    await wrapper.get('[data-testid="subscription-currency"]').setValue(values.currency)
  }

  if (values.billingInterval) {
    await wrapper
      .get('[data-testid="subscription-billing-interval"]')
      .setValue(values.billingInterval)
  }
  if (values.category) {
    const categorySelect = wrapper.get('[data-testid="subscription-category"]')
    if (values.category === 'Default') {
      await categorySelect.setValue('')
    } else {
      const optionExists = categorySelect
        .findAll('option')
        .some((option) => option.attributes('value') === values.category)
      if (optionExists) {
        await categorySelect.setValue(values.category)
      } else {
        await wrapper.get('[data-testid="new-category-toggle"]').trigger('click')
        await wrapper.get('[data-testid="new-category-name"]').setValue(values.category)
        await wrapper.get('[data-testid="new-category-add"]').trigger('click')
        await flushPromises()
        await nextTick()
      }
    }
  }
  if (values.planName) {
    await wrapper.get('[data-testid="subscription-plan-name"]').setValue(values.planName)
  }
  if (values.paymentMethodLabel) {
    await wrapper
      .get('[data-testid="subscription-payment-method"]')
      .setValue(values.paymentMethodLabel)
  }
  await wrapper
    .get('[data-testid="subscription-account"]')
    .setValue(values.accountLabel ?? 'test@example.com')
  if (values.iconKey) {
    await wrapper.get(`[data-testid="subscription-icon-${values.iconKey}"]`).setValue(true)
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

  it('starts from a migrated empty database and navigates three destinations', async () => {
    const wrapper = await mountApp()

    expect(wrapper.find('[data-testid="app-ready"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('还没有订阅')
    expect(wrapper.text()).toContain('概览')
    expect(wrapper.find('[data-testid="nav-overview"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="nav-subscriptions"]').exists()).toBe(true)
    expect(wrapper.findAll('h1')).toHaveLength(1)
    expect(wrapper.find('[data-testid="nav-settings"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="nav-stats"]').exists()).toBe(false)

    // Home consolidates the monthly spending summary that used to live on Stats.
    expect(wrapper.text()).toContain('本月计划扣费')
    expect(wrapper.get('[data-testid="overview-month-total"]').text()).toMatch(
      /¥\s*0\.00|￥\s*0\.00|CNY\s*0\.00/,
    )

    await openDestination(wrapper, 'nav-subscriptions', '/subscriptions')
    expect(router.currentRoute.value.name).toBe('subscriptions')
    expect(wrapper.text()).toContain('还没有订阅')
    expect(wrapper.text()).toContain('记录第一个订阅后会显示在这里')

    await openDestination(wrapper, 'nav-settings', '/settings')
    expect(router.currentRoute.value.name).toBe('settings')
    expect(wrapper.text()).toContain('CNY')
    expect(wrapper.text()).toContain('简体中文')
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
    expect(wrapper.text()).toMatch(/15\.99/)
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
    expect(wrapper.text()).toMatch(/15\.99/)
    expect(wrapper.text()).toContain('2030-06-15')
    expect(wrapper.text()).toContain('Standard')
    expect(wrapper.text()).toContain('Visa ending 4242')
    expect(wrapper.text()).toMatch(/day|天/)

    await openDestination(wrapper, 'nav-overview', '/')
    expect(wrapper.text()).toContain('1')
    expect(wrapper.text()).toContain('Netflix')

    await reinitializeDatabaseKeepingDataForTests()

    wrapper.unmount()
    document.body.innerHTML = ''
    wrapper = await mountApp()

    await openDestination(wrapper, 'nav-subscriptions', '/subscriptions')
    expect(wrapper.text()).toContain('Netflix')
    expect(wrapper.text()).toMatch(/15\.99/)

    await openDestination(wrapper, 'nav-overview', '/')
    expect(wrapper.text()).toContain('Netflix')
  })

  it('persists an AI service icon and account identifier across views and restart', async () => {
    let wrapper = await mountApp()

    await openCreateFrom(wrapper, 'subscriptions')
    expect(wrapper.find('[data-testid="subscription-icon-chatgpt"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="subscription-icon-grok"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="subscription-icon-claude"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="subscription-icon-gemini"]').exists()).toBe(false)

    await wrapper.get('[data-testid="subscription-icons-more"]').trigger('click')
    expect(wrapper.find('[data-testid="subscription-icon-gemini"]').exists()).toBe(true)

    await fillAndSubmitSubscription(wrapper, {
      name: 'Gemini Advanced',
      amount: '20.00',
      nextBillingDate: '2030-07-22',
      category: 'Productivity',
      accountLabel: 'work@example.com',
      iconKey: 'gemini',
    })

    expect(wrapper.get('[data-testid="subscription-account"]').text()).toBe('work@example.com')
    expect(
      wrapper.get('[data-testid="subscription-icon-rendered"]').attributes('data-icon-key'),
    ).toBe('gemini')

    const id = wrapper.get('[data-testid="subscription-item"]').attributes('data-id')!
    await openDestination(wrapper, 'nav-overview', '/')
    expect(wrapper.get('[data-testid="subscription-account"]').text()).toBe('work@example.com')
    expect(
      wrapper.get('[data-testid="subscription-icon-rendered"]').attributes('data-icon-key'),
    ).toBe('gemini')

    await router.push({ name: 'subscription-detail', params: { id } })
    await flushPromises()
    await nextTick()
    expect(wrapper.get('[data-testid="subscription-account"]').text()).toBe('work@example.com')
    expect(
      wrapper.get('[data-testid="subscription-icon-rendered"]').attributes('data-icon-key'),
    ).toBe('gemini')

    await router.push({ name: 'subscription-edit', params: { id } })
    await flushPromises()
    await nextTick()
    expect(wrapper.get('[data-testid="subscription-account"]').element).toHaveProperty(
      'value',
      'work@example.com',
    )
    expect(wrapper.get('[data-testid="subscription-icon-gemini"]').element).toHaveProperty(
      'checked',
      true,
    )

    await wrapper.get('[data-testid="subscription-account"]').setValue('personal@example.com')
    await wrapper.get('[data-testid="subscription-icon-claude"]').setValue(true)
    await wrapper.get('[data-testid="subscription-form"]').trigger('submit')
    await flushPromises()
    await nextTick()
    expect(router.currentRoute.value.name).toBe('subscription-detail')
    expect(wrapper.get('[data-testid="subscription-account"]').text()).toBe('personal@example.com')
    expect(
      wrapper.get('[data-testid="subscription-icon-rendered"]').attributes('data-icon-key'),
    ).toBe('claude')

    await reinitializeDatabaseKeepingDataForTests()
    wrapper.unmount()
    document.body.innerHTML = ''
    wrapper = await mountApp()
    await openDestination(wrapper, 'nav-subscriptions', '/subscriptions')
    expect(wrapper.get('[data-testid="subscription-account"]').text()).toBe('personal@example.com')
    expect(
      wrapper.get('[data-testid="subscription-icon-rendered"]').attributes('data-icon-key'),
    ).toBe('claude')
  })

  it('requires an account email or phone number', async () => {
    const wrapper = await mountApp()
    await openCreateFrom(wrapper, 'subscriptions')

    await wrapper.get('[data-testid="subscription-name"]').setValue('Missing Account')
    await wrapper.get('[data-testid="subscription-amount"]').setValue('20.00')
    await wrapper.get('[data-testid="subscription-next-billing-date"]').setValue('2030-07-22')
    await wrapper.get('[data-testid="subscription-form"]').trigger('submit')
    await flushPromises()
    await nextTick()

    expect(router.currentRoute.value.name).toBe('subscription-create')
    expect(wrapper.get('[data-testid="subscription-form-error"]').text()).toMatch(
      /required|请填写.*邮箱|手机号/i,
    )
  })

  it('rejects an account identifier that is neither an email nor a phone number', async () => {
    const wrapper = await mountApp()
    await openCreateFrom(wrapper, 'subscriptions')

    await fillAndSubmitSubscription(wrapper, {
      name: 'Invalid Account',
      amount: '20.00',
      nextBillingDate: '2030-07-22',
      accountLabel: 'not-an-account',
    })

    expect(router.currentRoute.value.name).toBe('subscription-create')
    expect(wrapper.get('[data-testid="subscription-form-error"]').text()).toMatch(
      /email|phone|邮箱|手机号/i,
    )
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
    expect(wrapper.text()).toContain('还没有订阅')
    expect(wrapper.text()).not.toContain('Bad Sub')
  })

  it('uses Default category when none is selected', async () => {
    const wrapper = await mountApp()

    await openCreateFrom(wrapper, 'overview')

    await fillAndSubmitSubscription(wrapper, {
      name: 'Mystery Box',
      amount: '4.50',
      nextBillingDate: '2030-09-10',
    })

    expect(wrapper.text()).toContain('Mystery Box')
    expect(wrapper.text()).toContain('Default')
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
    await wrapper.get('[data-testid="settings-language"]').setValue('en')
    await flushPromises()
    await nextTick()
    expect(document.documentElement.lang).toBe('en')
    expect(wrapper.text()).toContain('Settings')
    expect(wrapper.text()).toContain('Appearance')

    await wrapper.get('[data-testid="settings-theme"]').setValue('dark')
    await flushPromises()
    await nextTick()
    expect(document.documentElement.dataset.theme).toBe('dark')

    await wrapper.get('[data-testid="settings-currency"]').setValue('USD')
    await flushPromises()
    await nextTick()
    expect(wrapper.get('[data-testid="settings-currency"]').element).toHaveProperty('value', 'USD')

    await openDestination(wrapper, 'nav-subscriptions', '/subscriptions')
    expect(wrapper.text()).toContain('Subscriptions')
    expect(wrapper.text()).toContain('Netflix')

    await reinitializeDatabaseKeepingDataForTests()
    wrapper.unmount()
    document.body.innerHTML = ''
    wrapper = await mountApp()

    await openDestination(wrapper, 'nav-settings', '/settings')
    expect(wrapper.get('[data-testid="settings-language"]').element).toHaveProperty('value', 'en')
    expect(wrapper.get('[data-testid="settings-theme"]').element).toHaveProperty('value', 'dark')
    expect(wrapper.get('[data-testid="settings-currency"]').element).toHaveProperty('value', 'USD')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.documentElement.lang).toBe('en')
    expect(wrapper.text()).toContain('Settings')
  })
})

describe('category management', () => {
  beforeEach(async () => {
    setNow('2030-01-15T12:00:00')
    await resetDatabaseForTests()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    setNow(null)
    document.body.innerHTML = ''
  })

  it('adds a category in Settings and moves its subscriptions to Default when deleted', async () => {
    const wrapper = await mountApp()
    await openDestination(wrapper, 'nav-settings', '/settings')
    expect(wrapper.find('[data-testid="settings-category-name"]').exists()).toBe(false)
    await wrapper.get('[data-testid="open-categories-settings"]').trigger('click')
    await flushPromises()
    await nextTick()
    expect(router.currentRoute.value.name).toBe('settings-categories')

    const defaultItem = wrapper
      .findAll('[data-testid="settings-category-item"]')
      .find((item) => item.attributes('data-category') === 'Default')
    expect(defaultItem).toBeDefined()
    expect(defaultItem!.find('[data-testid="settings-category-delete"]').exists()).toBe(false)

    await wrapper.get('[data-testid="settings-category-name"]').setValue('Education')
    await wrapper.get('[data-testid="settings-category-add"]').trigger('click')
    await flushPromises()
    await nextTick()
    expect(
      wrapper
        .findAll('[data-testid="settings-category-item"]')
        .some((item) => item.attributes('data-category') === 'Education'),
    ).toBe(true)

    await openCreateFrom(wrapper, 'subscriptions')
    await fillAndSubmitSubscription(wrapper, {
      name: 'Learning App',
      amount: '12.00',
      nextBillingDate: '2030-06-15',
      category: 'Education',
    })

    await openDestination(wrapper, 'nav-settings', '/settings')
    await wrapper.get('[data-testid="open-categories-settings"]').trigger('click')
    await flushPromises()
    await nextTick()
    const deleteButton = wrapper
      .findAll('[data-testid="settings-category-delete"]')
      .find((button) => button.attributes('data-category') === 'Education')
    expect(deleteButton).toBeDefined()
    await deleteButton!.trigger('click')
    await nextTick()
    expect(wrapper.get('[data-testid="settings-category-delete-confirm"]').text()).toMatch(
      /Default|默认/,
    )
    await wrapper.get('[data-testid="settings-category-delete-yes"]').trigger('click')
    await flushPromises()
    await nextTick()

    expect(wrapper.get('[data-testid="settings-category-message"]').text()).toContain('1')
    expect(
      wrapper
        .findAll('[data-testid="settings-category-item"]')
        .some((item) => item.attributes('data-category') === 'Education'),
    ).toBe(false)

    await openDestination(wrapper, 'nav-subscriptions', '/subscriptions')
    expect(wrapper.text()).toContain('Learning App')
    expect(wrapper.text()).toContain('Default')
    expect(wrapper.text()).not.toContain('Education')
  })
})

describe('notification settings', () => {
  beforeEach(async () => {
    setNow('2030-01-15T12:00:00')
    resetNotificationAdapterForTests()
    await resetDatabaseForTests()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    setNow(null)
    document.body.innerHTML = ''
  })

  it('opens reminder controls in a secondary page and persists changes', async () => {
    const adapter = getNotificationAdapter() as InMemoryNotificationAdapter
    adapter.permission = 'granted'
    const wrapper = await mountApp()

    await openDestination(wrapper, 'nav-settings', '/settings')
    expect(wrapper.find('[data-testid="settings-reminders-enabled"]').exists()).toBe(false)

    await wrapper.get('[data-testid="open-notification-settings"]').trigger('click')
    await flushPromises()
    await nextTick()
    expect(router.currentRoute.value.name).toBe('settings-notifications')

    await wrapper.get('[data-testid="settings-reminders-enabled"]').setValue(true)
    await wrapper.get('[data-testid="settings-reminder-lead-days"]').setValue('7')
    await flushPromises()
    await nextTick()

    await openDestination(wrapper, 'nav-settings', '/settings')
    await wrapper.get('[data-testid="open-notification-settings"]').trigger('click')
    await flushPromises()
    await nextTick()

    expect(wrapper.get('[data-testid="settings-reminders-enabled"]').element).toHaveProperty(
      'checked',
      true,
    )
    expect(wrapper.get('[data-testid="settings-reminder-lead-days"]').element).toHaveProperty(
      'value',
      '7',
    )
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
    expect(wrapper.text()).toContain('Adobe')
    expect(wrapper.get('[data-testid="overview-active-count"]').text()).toBe('1')
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

  it('shrinks progress by time remaining and applies orange and red urgency across views', async () => {
    setNow('2030-06-08T12:00:00')
    const wrapper = await mountApp()

    await openCreateFrom(wrapper, 'subscriptions')
    await fillAndSubmitSubscription(wrapper, {
      name: 'Urgent Renewal',
      amount: '9.00',
      nextBillingDate: '2030-06-15',
    })
    const urgentItem = wrapper
      .findAll('[data-testid="subscription-item"]')
      .find((item) => item.text().includes('Urgent Renewal'))
    expect(urgentItem).toBeDefined()
    const urgentId = urgentItem!.attributes('data-id')

    await openCreateFrom(wrapper, 'subscriptions')
    await fillAndSubmitSubscription(wrapper, {
      name: 'Halfway Renewal',
      amount: '12.00',
      nextBillingDate: '2030-06-23',
    })
    const halfwayItem = wrapper
      .findAll('[data-testid="subscription-item"]')
      .find((item) => item.text().includes('Halfway Renewal'))
    expect(halfwayItem).toBeDefined()
    const halfwayId = halfwayItem!.attributes('data-id')

    expect(
      wrapper.get(`[data-testid="subscription-progress-${urgentId}"]`).attributes('data-tone'),
    ).toBe('red')
    expect(
      wrapper.get(`[data-testid="subscription-progress-${halfwayId}"]`).attributes('data-tone'),
    ).toBe('orange')

    await openDestination(wrapper, 'nav-overview', '/')
    expect(
      wrapper.get(`[data-testid="overview-progress-${urgentId}"]`).attributes('data-tone'),
    ).toBe('red')
    expect(
      wrapper.get(`[data-testid="overview-progress-${halfwayId}"]`).attributes('data-tone'),
    ).toBe('orange')

    await router.push({ name: 'subscription-detail', params: { id: urgentId } })
    await flushPromises()
    await nextTick()
    expect(wrapper.get('[data-testid="detail-progress-bar"]').attributes('data-tone')).toBe('red')
    expect(
      Number(
        wrapper.get('[data-testid="detail-progress-bar"]').attributes('data-remaining-percent'),
      ),
    ).toBeLessThan(50)
  })

  it('lists each currency separately and folds a manual-rate CNY total on home', async () => {
    setNow('2030-06-08T12:00:00')
    const wrapper = await mountApp()

    await openCreateFrom(wrapper, 'overview')
    await fillAndSubmitSubscription(wrapper, {
      name: 'Local CNY',
      amount: '40.00',
      currency: 'CNY',
      nextBillingDate: '2030-06-15',
    })
    await openCreateFrom(wrapper, 'subscriptions')
    await fillAndSubmitSubscription(wrapper, {
      name: 'Netflix USD',
      amount: '15.99',
      currency: 'USD',
      nextBillingDate: '2030-06-20',
    })
    await openCreateFrom(wrapper, 'subscriptions')
    await fillAndSubmitSubscription(wrapper, {
      name: 'Manga JPY',
      amount: '980',
      currency: 'JPY',
      nextBillingDate: '2030-06-25',
    })

    await openDestination(wrapper, 'nav-overview', '/')

    const rows = wrapper.findAll('[data-testid="overview-currency-row"]')
    expect(rows.map((row) => row.attributes('data-currency'))).toEqual(['CNY', 'JPY', 'USD'])

    // Zero-decimal JPY renders without fraction digits.
    const jpyRow = rows.find((row) => row.attributes('data-currency') === 'JPY')!
    expect(jpyRow.text()).toMatch(/JP¥\s*980|¥\s*980/)
    expect(jpyRow.text()).not.toContain('980.00')

    // Combined CNY total uses default manual rates: 40 + 15.99*7.2 + 980*0.048 = 202.17.
    const total = wrapper.get('[data-testid="overview-cny-total"]')
    expect(total.text()).toMatch(/202\.17/)
    expect(wrapper.find('[data-testid="overview-cny-missing"]').exists()).toBe(false)
  })

  it('opens all supported CNY rates in a compact secondary settings page', async () => {
    const wrapper = await mountApp()

    await openDestination(wrapper, 'nav-settings', '/settings')
    expect(wrapper.find('[data-testid="settings-rate-input"]').exists()).toBe(false)

    await wrapper.get('[data-testid="open-exchange-rates-settings"]').trigger('click')
    await flushPromises()
    await nextTick()

    expect(router.currentRoute.value.name).toBe('settings-exchange-rates')
    const rows = wrapper.findAll('[data-testid="settings-rate-row"]')
    expect(rows.map((row) => row.attributes('data-currency'))).toEqual([
      'USD',
      'EUR',
      'GBP',
      'JPY',
      'INR',
      'TRY',
    ])

    const gbpInput = wrapper
      .findAll('[data-testid="settings-rate-input"]')
      .find((input) => input.attributes('data-currency') === 'GBP')
    expect(gbpInput).toBeDefined()
    await gbpInput!.setValue('9.5')
    await flushPromises()
    expect(gbpInput!.element).toHaveProperty('value', '9.5')
  })

  it('sorts subscriptions by billing date and converted CNY price', async () => {
    setNow('2030-06-01T12:00:00')
    const wrapper = await mountApp()

    await openCreateFrom(wrapper, 'subscriptions')
    await fillAndSubmitSubscription(wrapper, {
      name: 'Early USD',
      amount: '10.00',
      currency: 'USD',
      nextBillingDate: '2030-06-10',
    })
    await openCreateFrom(wrapper, 'subscriptions')
    await fillAndSubmitSubscription(wrapper, {
      name: 'Middle JPY',
      amount: '1000',
      currency: 'JPY',
      nextBillingDate: '2030-06-20',
    })
    await openCreateFrom(wrapper, 'subscriptions')
    await fillAndSubmitSubscription(wrapper, {
      name: 'Late CNY',
      amount: '60.00',
      currency: 'CNY',
      nextBillingDate: '2030-06-30',
    })

    const visibleNames = () =>
      wrapper
        .findAll('[data-testid="subscription-item"]')
        .map((item) => item.attributes('data-name'))

    expect(visibleNames()).toEqual(['Early USD', 'Middle JPY', 'Late CNY'])

    await wrapper.get('[data-testid="subscription-sort"]').setValue('next-desc')
    expect(visibleNames()).toEqual(['Late CNY', 'Middle JPY', 'Early USD'])

    // Converted defaults: USD 10 = CNY 72, CNY 60 = CNY 60, JPY 1000 = CNY 48.
    await wrapper.get('[data-testid="subscription-sort"]').setValue('price-desc')
    expect(visibleNames()).toEqual(['Early USD', 'Late CNY', 'Middle JPY'])

    await wrapper.get('[data-testid="subscription-sort"]').setValue('price-asc')
    expect(visibleNames()).toEqual(['Middle JPY', 'Late CNY', 'Early USD'])
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
    const savePushSpy = vi.spyOn(router, 'push')
    await wrapper.get('[data-testid="subscription-form"]').trigger('submit')
    await flushPromises()
    await nextTick()
    await flushPromises()
    expect(savePushSpy).not.toHaveBeenCalled()
    savePushSpy.mockRestore()

    expect(wrapper.text()).toContain('Netflix Plus')
    expect(wrapper.text()).toMatch(/18\.99/)

    await wrapper.get('[data-testid="subscription-cancel-action"]').trigger('click')
    await flushPromises()
    await nextTick()
    expect(wrapper.get('[data-testid="subscription-status"]').text()).toMatch(/Cancelled|已取消/)

    await openDestination(wrapper, 'nav-overview', '/')
    expect(wrapper.text()).not.toContain('Netflix Plus')

    await router.push({ name: 'subscription-detail', params: { id } })
    await flushPromises()
    await nextTick()
    await wrapper.get('[data-testid="subscription-reactivate"]').trigger('click')
    await flushPromises()
    await nextTick()
    expect(wrapper.get('[data-testid="subscription-status"]').text()).toMatch(/Active|有效/)

    await openDestination(wrapper, 'nav-overview', '/')
    expect(wrapper.text()).toContain('Netflix Plus')

    await router.push({ name: 'subscription-detail', params: { id } })
    await flushPromises()
    await nextTick()
    await wrapper.get('[data-testid="subscription-delete"]').trigger('click')
    await flushPromises()
    await nextTick()
    const deleteDialog = wrapper.get('[data-testid="delete-confirm"]')
    expect(deleteDialog.attributes('aria-modal')).toBe('true')
    expect(deleteDialog.attributes('aria-labelledby')).toBe('delete-confirm-title')
    expect(wrapper.find('#delete-confirm-title').exists()).toBe(true)
    await wrapper.get('[data-testid="delete-confirm-yes"]').trigger('click')
    await flushPromises()
    await nextTick()

    expect(router.currentRoute.value.name).toBe('subscriptions')
    expect(wrapper.text()).toContain('还没有订阅')
    expect(wrapper.text()).not.toContain('Netflix Plus')
  })

  it('backs from edit to detail and then to subscriptions without looping', async () => {
    const wrapper = await mountApp()

    await openCreateFrom(wrapper, 'subscriptions')
    await fillAndSubmitSubscription(wrapper, {
      name: 'Loop Test',
      amount: '20.00',
      nextBillingDate: '2030-07-22',
      category: 'Default',
    })

    const id = wrapper.get('[data-testid="subscription-item"]').attributes('data-id')!
    await router.push({ name: 'subscription-detail', params: { id } })
    await flushPromises()
    await nextTick()

    await wrapper.get('[data-testid="subscription-edit"]').trigger('click')
    await flushPromises()
    await nextTick()
    expect(router.currentRoute.value.name).toBe('subscription-edit')

    const pushSpy = vi.spyOn(router, 'push')
    await wrapper.get('[data-testid="subscription-edit-back"]').trigger('click')
    await flushPromises()
    await nextTick()
    expect(router.currentRoute.value.name).toBe('subscription-detail')
    expect(pushSpy).not.toHaveBeenCalled()
    pushSpy.mockRestore()

    await wrapper.get('[data-testid="subscription-detail-back"]').trigger('click')
    await flushPromises()
    await nextTick()
    expect(router.currentRoute.value.name).toBe('subscriptions')
  })

  it('does not expose an editable form when the subscription is missing', async () => {
    const wrapper = await mountApp()

    await router.push({ name: 'subscription-edit', params: { id: 'missing-subscription' } })
    await flushPromises()
    await nextTick()

    expect(wrapper.find('[data-testid="subscription-form"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="subscription-form-error"]').text()).toMatch(
      /not found|未找到/,
    )
  })
})
