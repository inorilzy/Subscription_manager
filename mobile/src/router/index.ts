import {
  createMemoryHistory,
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from 'vue-router'
import OverviewView from '../views/OverviewView.vue'
import SubscriptionsView from '../views/SubscriptionsView.vue'
import SubscriptionCreateView from '../views/SubscriptionCreateView.vue'
import SubscriptionDetailView from '../views/SubscriptionDetailView.vue'
import SubscriptionEditView from '../views/SubscriptionEditView.vue'
import StatsView from '../views/StatsView.vue'
import SettingsView from '../views/SettingsView.vue'
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'overview',
    component: OverviewView,
    meta: { title: 'Overview' },
  },
  {
    path: '/subscriptions',
    name: 'subscriptions',
    component: SubscriptionsView,
    meta: { title: 'Subscriptions' },
  },
  {
    path: '/subscriptions/new',
    name: 'subscription-create',
    component: SubscriptionCreateView,
    meta: { title: 'Add Subscription' },
  },
  {
    path: '/subscriptions/:id/edit',
    name: 'subscription-edit',
    component: SubscriptionEditView,
    meta: { title: 'Edit Subscription' },
  },
  {
    path: '/subscriptions/:id',
    name: 'subscription-detail',
    component: SubscriptionDetailView,
    meta: { title: 'Subscription Details' },
  },
  {
    path: '/stats',
    name: 'stats',
    component: StatsView,
    meta: { title: 'Stats' },
  },
  {
    path: '/settings',
    name: 'settings',
    component: SettingsView,
    meta: { title: 'Settings' },
  },
]

export function createAppRouter(mode: 'web' | 'memory' = 'web') {
  return createRouter({
    history: mode === 'memory' ? createMemoryHistory() : createWebHistory(import.meta.env.BASE_URL),
    routes,
  })
}

const router = createAppRouter(import.meta.env.MODE === 'test' ? 'memory' : 'web')

export default router
