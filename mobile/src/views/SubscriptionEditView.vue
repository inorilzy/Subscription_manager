<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { addCategory, listCategories } from '../application/categories'
import { getSubscription, updateSubscription } from '../application/subscriptions'
import PageTopBar from '../components/PageTopBar.vue'
import { currencyLabel, majorInputFromMinor, SUPPORTED_CURRENCIES, type CurrencyCode } from '../domain/money'
import { ValidationError } from '../domain/subscription'
import { usePreferencesStore } from '../stores/preferences'

const route = useRoute()
const router = useRouter()
const preferences = usePreferencesStore()

const id = String(route.params.id ?? '')
const name = ref('')
const amount = ref('')
const currency = ref<CurrencyCode>(preferences.currency)
const nextBillingDate = ref('')
const category = ref('')
const planName = ref('')
const paymentMethodLabel = ref('')
const billingInterval = ref<'monthly' | 'yearly'>('monthly')
const errorMessage = ref<string | null>(null)
const submitting = ref(false)
const loaded = ref(false)
const subscriptionFound = ref(false)
const categories = ref<string[]>([])
const showNewCategory = ref(false)
const newCategoryName = ref('')

async function onAddCategory() {
  errorMessage.value = null
  try {
    const created = await addCategory(newCategoryName.value)
    categories.value = await listCategories()
    category.value = created
    newCategoryName.value = ''
    showNewCategory.value = false
  } catch (error) {
    errorMessage.value =
      error instanceof ValidationError
        ? localizeValidation(error.message)
        : preferences.t('error.saveFailed')
  }
}

function localizeValidation(message: string): string {
  const map: Record<string, string> = {
    'Name is required.': preferences.t('error.nameRequired'),
    'Next billing date is required.': preferences.t('error.dateRequired'),
    'Next billing date must be a valid date.': preferences.t('error.dateInvalid'),
    'Amount is required.': preferences.t('error.amountRequired'),
    'Enter a valid amount greater than zero with up to two decimal places.':
      preferences.t('error.amountInvalid'),
    'Enter a whole-number amount greater than zero.': preferences.t('error.amountInvalid'),
    'Amount is too large.': preferences.t('error.amountTooLarge'),
    'Amount must be greater than zero.': preferences.t('error.amountPositive'),
    'Use a short label like “Visa ending 4242”. Do not enter full card numbers or CVV.':
      preferences.t('error.paymentSensitive'),
    'Could not save the subscription. Please try again.': preferences.t('error.saveFailed'),
    'Subscription not found.': preferences.t('detail.notFound'),
  }
  return map[message] ?? message
}

onMounted(async () => {
  categories.value = await listCategories()
  const existing = await getSubscription(id)
  if (!existing) {
    errorMessage.value = preferences.t('detail.notFound')
    loaded.value = true
    return
  }
  subscriptionFound.value = true
  name.value = existing.name
  amount.value = majorInputFromMinor(existing.amountMinor, existing.currency)
  currency.value = (existing.currency as CurrencyCode) || preferences.currency
  nextBillingDate.value = existing.nextBillingDate
  category.value = existing.category === 'Other' ? '' : existing.category
  planName.value = existing.planName ?? ''
  paymentMethodLabel.value = existing.paymentMethodLabel ?? ''
  billingInterval.value = existing.billingInterval
  loaded.value = true
})

async function onSubmit() {
  if (submitting.value) return
  errorMessage.value = null
  submitting.value = true
  try {
    await updateSubscription({
      id,
      name: name.value,
      amountInput: amount.value,
      nextBillingDate: nextBillingDate.value,
      category: category.value || null,
      planName: planName.value || null,
      paymentMethodLabel: paymentMethodLabel.value || null,
      billingInterval: billingInterval.value,
      currency: currency.value,
    })
    await router.push({ name: 'subscription-detail', params: { id } })
  } catch (error) {
    if (error instanceof ValidationError) {
      errorMessage.value = localizeValidation(error.message)
    } else {
      errorMessage.value = preferences.t('error.saveFailed')
    }
  } finally {
    submitting.value = false
  }
}

async function onCancel() {
  await router.push({ name: 'subscription-detail', params: { id } })
}
</script>

<template>
  <section class="focused-page">
    <PageTopBar
      :title="preferences.t('edit.title')"
      back
      :back-label="preferences.t('detail.back')"
      back-test-id="subscription-edit-back"
      @back="onCancel"
    />

    <div class="page-content page-content-form">
      <header class="space-y-1 px-1">
        <h1 class="sr-only">{{ preferences.t('edit.title') }}</h1>
        <p class="body-large text-on-surface-variant">{{ preferences.t('edit.subtitle') }}</p>
      </header>

      <p
        v-if="loaded && !subscriptionFound"
        class="tactile-card border-error/40 p-4 font-bold text-error"
        role="alert"
        data-testid="subscription-form-error"
      >
        {{ errorMessage }}
      </p>

      <form
        v-else-if="loaded"
        class="tactile-card tactile-card-focus space-y-5 p-5 sm:p-6"
        data-testid="subscription-form"
        @submit.prevent="onSubmit"
      >
        <div class="space-y-2">
          <label class="field-label" for="subscription-name">
            {{ preferences.t('create.name') }}
          </label>
          <input
            id="subscription-name"
            v-model="name"
            data-testid="subscription-name"
            type="text"
            required
            autocomplete="off"
            class="field-recessed"
          />
        </div>

        <div class="grid gap-5 sm:grid-cols-2">
          <div class="space-y-2">
            <label class="field-label" for="subscription-amount">
              {{ preferences.t('create.amount') }}
            </label>
            <input
              id="subscription-amount"
              v-model="amount"
              data-testid="subscription-amount"
              type="text"
              inputmode="decimal"
              required
              autocomplete="off"
              class="field-recessed"
            />
          </div>

          <div class="space-y-2">
            <label class="field-label" for="subscription-currency">
              {{ preferences.t('create.currency') }}
            </label>
            <select
              id="subscription-currency"
              v-model="currency"
              data-testid="subscription-currency"
              class="field-recessed"
            >
              <option v-for="code in SUPPORTED_CURRENCIES" :key="code" :value="code">
                {{ currencyLabel(code, preferences.language) }}
              </option>
            </select>
          </div>
        </div>

        <fieldset class="space-y-2">
          <legend class="field-label">{{ preferences.t('create.billingCycle') }}</legend>
          <select
            id="subscription-billing-interval"
            v-model="billingInterval"
            data-testid="subscription-billing-interval"
            class="field-recessed sr-only min-h-0"
            aria-hidden="true"
            tabindex="-1"
          >
            <option value="monthly">{{ preferences.t('create.monthly') }}</option>
            <option value="yearly">{{ preferences.t('create.yearly') }}</option>
          </select>
          <div class="grid grid-cols-2 gap-2 rounded-2xl border-2 border-outline-variant bg-surface-container-low p-2">
            <label class="field-label m-0 block">
              <input
                v-model="billingInterval"
                class="field-recessed peer sr-only min-h-0"
                type="radio"
                name="subscription-billing-interval-option"
                value="monthly"
              />
              <span
                class="tactile-btn-secondary flex w-full px-3 py-3 peer-checked:border-primary peer-checked:bg-primary-container peer-checked:text-on-primary-container peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2"
              >
                {{ preferences.t('create.monthly') }}
              </span>
            </label>
            <label class="field-label m-0 block">
              <input
                v-model="billingInterval"
                class="field-recessed peer sr-only min-h-0"
                type="radio"
                name="subscription-billing-interval-option"
                value="yearly"
              />
              <span
                class="tactile-btn-secondary flex w-full px-3 py-3 peer-checked:border-primary peer-checked:bg-primary-container peer-checked:text-on-primary-container peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2"
              >
                {{ preferences.t('create.yearly') }}
              </span>
            </label>
          </div>
        </fieldset>

        <div class="space-y-2">
          <label class="field-label" for="subscription-next-billing-date">
            {{ preferences.t('create.nextBillingDate') }}
          </label>
          <input
            id="subscription-next-billing-date"
            v-model="nextBillingDate"
            data-testid="subscription-next-billing-date"
            type="date"
            required
            class="field-recessed"
          />
        </div>

        <div class="space-y-2">
          <label class="field-label" for="subscription-category">
            {{ preferences.t('create.category') }}
            <span class="font-normal text-on-surface-variant">{{ preferences.t('create.optional') }}</span>
          </label>
          <select
            id="subscription-category"
            v-model="category"
            data-testid="subscription-category"
            class="field-recessed"
          >
            <option value="">{{ preferences.t('create.categoryDefault') }}</option>
            <option
              v-for="item in categories.filter((c) => c !== 'Other')"
              :key="item"
              :value="item"
            >
              {{ item }}
            </option>
          </select>

          <button
            v-if="!showNewCategory"
            type="button"
            class="inline-flex min-h-11 items-center rounded-xl px-2 text-sm font-bold text-primary"
            data-testid="new-category-toggle"
            @click="showNewCategory = true"
          >
            + {{ preferences.t('create.newCategory') }}
          </button>
          <div v-else class="flex gap-2" data-testid="new-category-row">
            <input
              v-model="newCategoryName"
              data-testid="new-category-name"
              type="text"
              maxlength="24"
              class="field-recessed min-w-0 flex-1"
              :aria-label="preferences.t('create.newCategory')"
              :placeholder="preferences.t('create.newCategoryPlaceholder')"
              @keydown.enter.prevent="onAddCategory"
            />
            <button
              type="button"
              class="tactile-btn-secondary shrink-0 px-3 py-2"
              data-testid="new-category-add"
              @click="onAddCategory"
            >
              {{ preferences.t('create.newCategoryAdd') }}
            </button>
          </div>
        </div>

        <div class="space-y-2">
          <label class="field-label" for="subscription-plan-name">
            {{ preferences.t('create.planName') }}
            <span class="font-normal text-on-surface-variant">{{ preferences.t('create.optional') }}</span>
          </label>
          <input
            id="subscription-plan-name"
            v-model="planName"
            data-testid="subscription-plan-name"
            type="text"
            autocomplete="off"
            class="field-recessed"
          />
        </div>

        <div class="space-y-2">
          <label class="field-label" for="subscription-payment-method">
            {{ preferences.t('create.paymentMethod') }}
            <span class="font-normal text-on-surface-variant">{{ preferences.t('create.optional') }}</span>
          </label>
          <input
            id="subscription-payment-method"
            v-model="paymentMethodLabel"
            data-testid="subscription-payment-method"
            type="text"
            autocomplete="off"
            class="field-recessed"
          />
          <p class="field-help">{{ preferences.t('create.paymentHint') }}</p>
        </div>

        <p
          v-if="errorMessage"
          class="rounded-xl border-2 border-error/30 bg-error/10 px-4 py-3 text-sm text-error"
          role="alert"
          data-testid="subscription-form-error"
        >
          {{ errorMessage }}
        </p>

        <div class="grid grid-cols-3 gap-3 pt-2">
          <button
            type="button"
            data-testid="subscription-cancel"
            class="tactile-btn-secondary min-w-0 px-3 py-3"
            @click="onCancel"
          >
            {{ preferences.t('create.cancel') }}
          </button>
          <button
            type="submit"
            data-testid="subscription-save"
            class="tactile-btn col-span-2 min-w-0 px-4 py-3"
            :disabled="submitting"
          >
            {{ submitting ? preferences.t('create.saving') : preferences.t('create.save') }}
          </button>
        </div>
      </form>
    </div>
  </section>
</template>
