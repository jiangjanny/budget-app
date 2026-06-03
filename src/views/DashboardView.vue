<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../stores/appStore'
import { api } from '../services/api'

const store = useAppStore()
const router = useRouter()

const dashboard = ref(null)
const debts = ref([])
const loading = ref(true)
const error = ref('')

const today = new Date()
const currentYM = `${today.getFullYear()}/${String(today.getMonth()+1).padStart(2,'0')}`

const fmt = (n) => `NT$ ${Number(n || 0).toLocaleString()}`

function nextYM(ym) {
  let [y, m] = ym.split('/').map(Number)
  m++; if (m > 12) { m = 1; y++ }
  return `${y}/${String(m).padStart(2, '0')}`
}

const careSchedule = computed(() => {
  const s = store.settings
  const careDeadline = s.careDeadlineYearMonth || '2026/12'
  const feeBefore = Number(s.baseCareFeeAfter || s.baseCareFeeBefore || 1000)
  const feeAfter  = Number(s.baseCareFeeAfter || 2000)
  return store.members
    .filter(m => m.status === 'active' && m.obligationEndYearMonth)
    .map(m => {
      const careStart = nextYM(m.obligationEndYearMonth)
      const startFee  = careStart > careDeadline ? feeAfter : feeBefore
      const upgradeAt = startFee < feeAfter ? nextYM(careDeadline) : null
      return { name: m.name, obligationEnd: m.obligationEndYearMonth, careStart, startFee, upgradeAt, feeAfter }
    })
    .sort((a, b) => a.careStart.localeCompare(b.careStart))
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [dash, debt] = await Promise.all([
      api.getDashboard(currentYM),
      store.isAdmin ? api.getAllDebt() : []
    ])
    dashboard.value = dash
    debts.value = debt.filter(d => d.debtMonths?.length > 0)
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="page">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h1 class="page-title" style="margin:0">🏠 首頁</h1>
      <div style="display:flex;gap:8px;align-items:center">
        <span class="badge" :class="store.isAdmin ? 'badge-blue' : 'badge-gray'">
          {{ store.isAdmin ? '管理者' : store.currentMember?.name || '成員' }}
        </span>
        <button class="btn btn-ghost btn-sm" @click="store.logout(); router.push('/login')">登出</button>
      </div>
    </div>

    <div v-if="loading" class="spinner" />
    <div v-else-if="error" class="alert alert-error">{{ error }}</div>
    <template v-else-if="dashboard">

      <!-- 家庭基金 -->
      <div class="fund-card">
        <div class="fund-label">家庭基金餘額</div>
        <div class="fund-value">{{ fmt(dashboard.familyFund) }}</div>
        <div style="font-size:13px;opacity:.7;margin-top:8px">{{ currentYM }} 月份報表</div>
      </div>

      <!-- 本月統計 -->
      <div class="card-grid">
        <div class="stat income">
          <div class="stat-label">本月已收</div>
          <div class="stat-value" style="font-size:17px">{{ fmt(dashboard.monthIncome) }}</div>
        </div>
        <div class="stat expense">
          <div class="stat-label">本月未收</div>
          <div class="stat-value" style="font-size:17px">{{ fmt(dashboard.monthUncollected) }}</div>
        </div>
        <div class="stat">
          <div class="stat-label">本月支出</div>
          <div class="stat-value" style="font-size:17px;color:#1e293b">{{ fmt(dashboard.monthExpenseTotal) }}</div>
        </div>
        <div class="stat" :class="dashboard.monthBalance >= 0 ? 'income' : 'expense'">
          <div class="stat-label">本月結餘</div>
          <div class="stat-value" style="font-size:17px">{{ fmt(dashboard.monthBalance) }}</div>
        </div>
      </div>

      <!-- 應收 / 欠費 -->
      <div class="card-grid">
        <div class="stat">
          <div class="stat-label">本月應收</div>
          <div class="stat-value" style="font-size:17px;color:#1e293b">{{ fmt(dashboard.expectedIncome) }}</div>
        </div>
        <div class="stat" :class="dashboard.debtorCount > 0 ? 'warning' : ''">
          <div class="stat-label">欠費人數</div>
          <div class="stat-value" style="font-size:17px">{{ dashboard.debtorCount }} 人</div>
        </div>
      </div>

      <!-- 欠費明細（管理者） -->
      <template v-if="store.isAdmin && debts.length > 0">
        <div class="section-header">
          <span class="section-title">⚠️ 欠費人員</span>
        </div>
        <div v-for="d in debts" :key="d.member.id" class="debt-row">
          <div class="debt-name">{{ d.member.name }}</div>
          <div v-for="dm in d.debtMonths" :key="dm.yearMonth" class="debt-detail">
            {{ dm.yearMonth }}：欠 NT$ {{ dm.owed.toLocaleString() }}
          </div>
        </div>
      </template>

      <!-- 個人繳費狀況（成員） -->
      <template v-if="!store.isAdmin">
        <div class="card">
          <div class="card-title">我的繳費狀況</div>
          <button class="btn btn-outline btn-full" style="margin-top:8px" @click="router.push('/payments')">
            查看詳細 →
          </button>
        </div>
      </template>

    </template>

    <!-- 照顧費時程 -->
    <div v-if="careSchedule.length" class="card" style="margin-top:8px">
      <div class="section-title" style="margin-bottom:12px">🏥 照顧費時程</div>
      <div v-for="c in careSchedule" :key="c.name"
        style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px">
        <div style="font-weight:700;margin-bottom:4px">{{ c.name }}</div>
        <div style="color:#64748b;font-size:13px">義務到期：{{ c.obligationEnd }}</div>
        <div style="margin-top:4px">
          <span class="badge badge-blue">{{ c.careStart }} 起繳照顧費 NT$ {{ c.startFee.toLocaleString() }}/月</span>
        </div>
        <div v-if="c.upgradeAt" style="margin-top:4px;color:#d97706;font-size:13px">
          ↗ {{ c.upgradeAt }} 起升為 NT$ {{ c.feeAfter.toLocaleString() }}/月
        </div>
      </div>
    </div>

    <!-- 快速功能（管理者） -->
    <template v-if="store.isAdmin">
      <div class="section-header" style="margin-top:4px">
        <span class="section-title">快速操作</span>
      </div>
      <div class="card-grid">
        <button class="btn btn-outline btn-full" @click="router.push('/payments')">💰 新增繳費</button>
        <button class="btn btn-outline btn-full" @click="router.push('/expenses')">💸 新增支出</button>
      </div>
    </template>

  </div>
</template>
