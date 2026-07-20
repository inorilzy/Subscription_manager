import {
  createMemoryHistory,
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from 'vue-router'
import OverviewView from '../views/OverviewView.vue'

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
    component: () => import('../views/SubscriptionsView.vue'),
    meta: { title: 'Subscriptions' },
  },
  {
    path: '/stats',
    name: 'stats',
    component: () => import('../views/StatsView.vue'),
    meta: { title: 'Stats' },
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('../views/SettingsView.vue'),
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
