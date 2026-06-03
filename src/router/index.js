import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/setup',      component: () => import('../views/SetupView.vue'), meta: { public: true } },
  { path: '/login',      component: () => import('../views/LoginView.vue'), meta: { public: true } },
  { path: '/',           component: () => import('../views/DashboardView.vue') },
  { path: '/members',    component: () => import('../views/MembersView.vue'), meta: { adminOnly: true } },
  { path: '/payments',   component: () => import('../views/PaymentsView.vue') },
  { path: '/expenses',   component: () => import('../views/ExpensesView.vue'), meta: { adminOnly: true } },
  { path: '/statistics', component: () => import('../views/StatisticsView.vue') },
  { path: '/history',    component: () => import('../views/HistoryView.vue') },
  { path: '/settings',   component: () => import('../views/SettingsView.vue'), meta: { adminOnly: true } }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to) => {
  const role = localStorage.getItem('role')

  if (to.path === '/setup') return '/login'
  if (role && to.meta.public) return '/'
  if (!role && !to.meta.public) return '/login'
  if (to.meta.adminOnly && role !== 'admin') return '/'
})

export default router
