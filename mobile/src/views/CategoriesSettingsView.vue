<script setup lang="ts">
import { Plus, Tag, Tags, Trash2, TriangleAlert } from '@lucide/vue'
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { addCategory, deleteCategory, listCategories } from '../application/categories'
import PageTopBar from '../components/PageTopBar.vue'
import { usePreferencesStore } from '../stores/preferences'

const router = useRouter()
const preferences = usePreferencesStore()
const categories = ref<string[]>([])
const categoriesLoading = ref(true)
const categoryBusy = ref(false)
const newCategoryName = ref('')
const categoryMessage = ref<string | null>(null)
const categoryMessageTone = ref<'status' | 'error'>('status')
const pendingCategoryDelete = ref<string | null>(null)
const categoryNameInput = ref<HTMLInputElement | null>(null)
let categoryDeleteCancelButton: HTMLButtonElement | null = null
let categoryDeleteTrigger: HTMLElement | null = null

const customCategories = computed(() =>
  categories.value.filter((category) => category.toLocaleLowerCase() !== 'default'),
)

function categoryCopy(english: string, chinese: string): string {
  return preferences.language === 'zh-CN' ? chinese : english
}

function setCategoryMessage(message: string, tone: 'status' | 'error' = 'status') {
  categoryMessage.value = message
  categoryMessageTone.value = tone
}

function setCategoryDeleteCancelButton(element: unknown) {
  categoryDeleteCancelButton = element instanceof HTMLButtonElement ? element : null
}

async function reloadCategories() {
  categoriesLoading.value = true
  try {
    categories.value = await listCategories()
  } catch {
    setCategoryMessage(
      categoryCopy('Could not load categories. Please try again.', '无法加载分类，请重试。'),
      'error',
    )
  } finally {
    categoriesLoading.value = false
  }
}

onMounted(reloadCategories)

async function onAddCategory() {
  const name = newCategoryName.value.trim()
  categoryMessage.value = null

  if (name.length < 1 || name.length > 24) {
    setCategoryMessage(
      categoryCopy('Category name must be 1–24 characters.', '分类名称需为 1–24 个字符。'),
      'error',
    )
    return
  }

  const duplicate =
    name.toLocaleLowerCase() === 'default' ||
    categories.value.some((category) => category.toLocaleLowerCase() === name.toLocaleLowerCase())
  if (duplicate) {
    setCategoryMessage(categoryCopy('That category already exists.', '该分类已存在。'), 'error')
    return
  }

  categoryBusy.value = true
  try {
    const created = await addCategory(name)
    await reloadCategories()
    newCategoryName.value = ''
    setCategoryMessage(categoryCopy(`Added “${created}”.`, `已添加“${created}”。`))
  } catch {
    setCategoryMessage(
      categoryCopy('Could not add the category. Please try again.', '无法添加分类，请重试。'),
      'error',
    )
  } finally {
    categoryBusy.value = false
  }
}

async function requestCategoryDelete(category: string, event: MouseEvent) {
  pendingCategoryDelete.value = category
  categoryMessage.value = null
  categoryDeleteTrigger = event.currentTarget as HTMLElement
  await nextTick()
  categoryDeleteCancelButton?.focus()
}

function cancelCategoryDelete() {
  const trigger = categoryDeleteTrigger
  pendingCategoryDelete.value = null
  categoryDeleteTrigger = null
  void nextTick(() => trigger?.focus())
}

async function confirmCategoryDelete() {
  const category = pendingCategoryDelete.value
  if (!category) return

  categoryBusy.value = true
  try {
    const { reassignedCount } = await deleteCategory(category)
    await reloadCategories()
    pendingCategoryDelete.value = null
    categoryDeleteTrigger = null
    setCategoryMessage(
      categoryCopy(
        `Deleted “${category}”. ${reassignedCount} ${reassignedCount === 1 ? 'subscription was' : 'subscriptions were'} moved to Default.`,
        `已删除“${category}”。${reassignedCount} 个订阅已移至默认分类。`,
      ),
    )
    categoryBusy.value = false
    await nextTick()
    categoryNameInput.value?.focus()
  } catch {
    setCategoryMessage(
      categoryCopy('Could not delete the category. Please try again.', '无法删除分类，请重试。'),
      'error',
    )
  } finally {
    categoryBusy.value = false
  }
}

async function goBack() {
  if (router.options.history.state.back) {
    router.back()
    return
  }
  await router.push({ name: 'settings' })
}
</script>

<template>
  <section class="focused-page">
    <PageTopBar
      :title="preferences.language === 'zh-CN' ? '分类管理' : 'Categories'"
      back
      :back-label="preferences.t('detail.back')"
      back-test-id="categories-back"
      @back="goBack"
    />

    <div class="page-content page-content-form">
      <h1 class="sr-only">
        {{ preferences.language === 'zh-CN' ? '分类管理' : 'Categories' }}
      </h1>

      <div class="settings-group min-w-0" data-testid="settings-categories">
        <div class="settings-row min-w-0 items-start gap-3">
          <span class="icon-house icon-house-primary" aria-hidden="true">
            <Tags :size="25" :stroke-width="2.4" />
          </span>
          <div class="min-w-0 flex-1">
            <label class="font-headline font-bold text-on-surface" for="settings-category-name">
              {{ preferences.language === 'zh-CN' ? '新建分类' : 'New category' }}
            </label>
            <p class="mt-1 text-sm leading-5 text-on-surface-variant">
              {{
                preferences.language === 'zh-CN'
                  ? '添加用于整理订阅的自定义分类。'
                  : 'Add a custom category to organize subscriptions.'
              }}
            </p>

            <form
              class="mt-4 flex min-w-0 flex-col gap-2 min-[400px]:flex-row"
              @submit.prevent="onAddCategory"
            >
              <input
                id="settings-category-name"
                ref="categoryNameInput"
                v-model="newCategoryName"
                data-testid="settings-category-name"
                class="field-recessed min-w-0 flex-1"
                type="text"
                maxlength="24"
                autocomplete="off"
                :placeholder="preferences.language === 'zh-CN' ? '例如：教育' : 'e.g. Education'"
                :aria-invalid="categoryMessageTone === 'error'"
                :aria-describedby="categoryMessage ? 'settings-category-message' : undefined"
                :disabled="categoryBusy"
              />
              <button
                type="submit"
                class="tactile-btn min-h-[52px] w-full shrink-0 px-4 py-2 min-[400px]:w-auto"
                data-testid="settings-category-add"
                :disabled="categoryBusy"
              >
                <Plus :size="20" :stroke-width="2.7" aria-hidden="true" />
                {{ preferences.language === 'zh-CN' ? '添加' : 'Add' }}
              </button>
            </form>

            <p
              v-if="categoryMessage"
              id="settings-category-message"
              class="mt-3 rounded-xl p-3 text-sm font-bold"
              :class="
                categoryMessageTone === 'error'
                  ? 'bg-error-container text-on-error-container'
                  : 'bg-primary-container/20 text-on-surface'
              "
              data-testid="settings-category-message"
              :role="categoryMessageTone === 'error' ? 'alert' : 'status'"
            >
              {{ categoryMessage }}
            </p>
          </div>
        </div>

        <div
          class="settings-row min-w-0 gap-3"
          data-testid="settings-category-item"
          data-category="Default"
        >
          <span class="icon-house icon-house-neutral" aria-hidden="true">
            <Tag :size="23" :stroke-width="2.4" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate font-headline font-bold text-on-surface">
              {{ preferences.language === 'zh-CN' ? '默认' : 'Default' }}
            </p>
            <p class="mt-1 text-sm leading-5 text-on-surface-variant">
              {{
                preferences.language === 'zh-CN'
                  ? '未分类订阅的受保护分类'
                  : 'Protected category for uncategorized subscriptions'
              }}
            </p>
          </div>
          <span
            class="chip-pill shrink-0 border-outline-variant bg-surface-container text-on-surface-variant"
          >
            {{ preferences.language === 'zh-CN' ? '受保护' : 'Protected' }}
          </span>
        </div>

        <template v-for="category in customCategories" :key="category">
          <div
            class="settings-row min-w-0 gap-3"
            data-testid="settings-category-item"
            :data-category="category"
          >
            <span class="icon-house icon-house-tertiary" aria-hidden="true">
              <Tag :size="23" :stroke-width="2.4" />
            </span>
            <p class="min-w-0 flex-1 break-words font-headline font-bold text-on-surface">
              {{ category }}
            </p>
            <button
              type="button"
              class="icon-button text-error"
              data-testid="settings-category-delete"
              :data-category="category"
              :disabled="categoryBusy"
              :aria-label="
                preferences.language === 'zh-CN'
                  ? `删除分类“${category}”`
                  : `Delete ${category} category`
              "
              @click="requestCategoryDelete(category, $event)"
            >
              <Trash2 :size="21" :stroke-width="2.5" aria-hidden="true" />
            </button>
          </div>

          <div
            v-if="pendingCategoryDelete === category"
            class="border-b-2 border-surface-container-highest bg-error-container/30 p-4"
            role="alertdialog"
            aria-labelledby="settings-category-delete-title"
            aria-describedby="settings-category-delete-description"
            data-testid="settings-category-delete-confirm"
            :data-category="category"
            @keydown.esc.stop.prevent="cancelCategoryDelete"
          >
            <div class="flex items-start gap-3">
              <TriangleAlert
                :size="24"
                :stroke-width="2.5"
                class="mt-0.5 shrink-0 text-error"
                aria-hidden="true"
              />
              <div class="min-w-0">
                <h2
                  id="settings-category-delete-title"
                  class="font-headline font-bold text-on-surface"
                >
                  {{
                    preferences.language === 'zh-CN'
                      ? `删除“${category}”？`
                      : `Delete “${category}”?`
                  }}
                </h2>
                <p
                  id="settings-category-delete-description"
                  class="mt-1 text-sm leading-5 text-on-surface-variant"
                >
                  {{
                    preferences.language === 'zh-CN'
                      ? '使用此分类的订阅将移至默认分类。此操作无法撤销。'
                      : 'Subscriptions using this category will move to Default. This cannot be undone.'
                  }}
                </p>
              </div>
            </div>
            <div class="mt-4 grid grid-cols-2 gap-3">
              <button
                :ref="setCategoryDeleteCancelButton"
                type="button"
                class="tactile-btn-secondary min-w-0 px-2 py-2"
                data-testid="settings-category-delete-cancel"
                :disabled="categoryBusy"
                @click="cancelCategoryDelete"
              >
                {{ preferences.language === 'zh-CN' ? '取消' : 'Cancel' }}
              </button>
              <button
                type="button"
                class="tactile-btn-danger min-w-0 px-2 py-2"
                data-testid="settings-category-delete-yes"
                :disabled="categoryBusy"
                @click="confirmCategoryDelete"
              >
                {{ preferences.language === 'zh-CN' ? '确认删除' : 'Delete' }}
              </button>
            </div>
          </div>
        </template>

        <p v-if="categoriesLoading" class="px-4 py-3 text-sm text-on-surface-variant" role="status">
          {{ preferences.language === 'zh-CN' ? '正在加载分类…' : 'Loading categories…' }}
        </p>
      </div>
    </div>
  </section>
</template>
