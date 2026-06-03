<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Line, Pie } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  ArcElement, Tooltip, Legend, Title, Filler
} from 'chart.js'
import { api } from '../services/api'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement,
  ArcElement, Tooltip, Legend, Title, Filler)

const year = ref(new Date().getFullYear().toString())
const summary = ref(null)
const allDebts = ref([])
const loading = ref(true)
const error = ref('')

const years = Array.from({ length: 3 }, (_, i) => String(new Date().getFullYear() - i))

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [s, d] = await Promise.all([
      api.getAnnualSummary(year.value),
      api.getAllDebt()
    ])
    summary.value = s
    allDebts.value = d
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

watch(year, load)
onMounted(load)

const lineData = computed(() => {
  if (!summary.value) return null
  const months = summary.value.months || []
  return {
    labels: months.map(m => m.yearMonth.split('/')[1] + '月'),
    datasets: [
      {
        label: '收入',
        data: months.map(m => m.income),
        borderColor: '#16a34a',
        backgroundColor: 'rgba(22,163,74,.1)',
        fill: true,
        tension: .4
      },
      {
        label: '支出',
        data: months.map(m => m.expense),
        borderColor: '#dc2626',
        backgroundColor: 'rgba(220,38,38,.1)',
        fill: true,
        tension: .4
      }
    ]
  }
})

const pieData = computed(() => {
  if (!summary.value?.categoryBreakdown) return null
  const entries = Object.entries(summary.value.categoryBreakdown)
  if (!entries.length) return null
  return {
    labels: entries.map(([k]) => k),
    datasets: [{
      data: entries.map(([, v]) => v),
      backgroundColor: ['#2563eb','#16a34a','#dc2626','#d97706','#7c3aed','#0891b2','#be185d']
    }]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: { legend: { position: 'top' } },
  scales: { y: { beginAtZero: true } }
}

const pieOptions = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: { legend: { position: 'right' } }
}

const fmt = (n) => `NT$ ${Number(n || 0).toLocaleString()}`
</script>

<template>
  <div class="page">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h1 class="page-title" style="margin:0">📊 統計分析</h1>
      <select v-model="year" class="form-input" style="width:100px;padding:6px 10px">
        <option v-for="y in years" :key="y" :value="y">{{ y }} 年</option>
      </select>
    </div>

    <div v-if="loading" class="spinner" />
    <div v-else-if="error" class="alert alert-error">{{ error }}</div>
    <template v-else-if="summary">

      <!-- 每人繳費進度 -->
      <div class="card">
        <div class="section-title" style="margin-bottom:12px">👤 每人 5,000/月 繳費進度</div>
        <div v-for="d in allDebts" :key="d.member?.id" style="margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px">
            <span style="font-weight:700;font-size:15px">{{ d.member?.name }}</span>
            <span style="font-size:13px;color:#64748b">
              已繳 {{ d.paidMonths?.length || 0 }} 月 ／
              欠 {{ d.debtMonths?.length || 0 }} 月
              <span v-if="d.prepaidCount > 0" style="color:#2563eb">　預繳 {{ d.prepaidCount }} 月</span>
            </span>
          </div>
          <div style="background:#f1f5f9;border-radius:99px;height:10px;overflow:hidden">
            <div :style="{
              width: (d.paidMonths?.length || 0) + (d.debtMonths?.length || 0) > 0
                ? (((d.paidMonths?.length || 0) / ((d.paidMonths?.length || 0) + (d.debtMonths?.length || 0))) * 100).toFixed(1) + '%'
                : '0%',
              background: d.debtMonths?.length ? '#f59e0b' : '#16a34a',
              height: '100%',
              borderRadius: '99px',
              transition: 'width .3s'
            }" />
          </div>
          <div v-if="d.debtMonths?.length" style="margin-top:4px;font-size:12px;color:#dc2626">
            ⚠️ 欠費月份：{{ d.debtMonths.map(m => m.yearMonth).join('、') }}
          </div>
        </div>
      </div>

      <!-- 年度總計 -->
      <div class="card-grid-3">
        <div class="stat income">
          <div class="stat-label">年收入</div>
          <div class="stat-value" style="font-size:15px">{{ fmt(summary.yearIncome) }}</div>
        </div>
        <div class="stat expense">
          <div class="stat-label">年支出</div>
          <div class="stat-value" style="font-size:15px">{{ fmt(summary.yearExpense) }}</div>
        </div>
        <div class="stat" :class="summary.yearBalance >= 0 ? 'income' : 'expense'">
          <div class="stat-label">年結餘</div>
          <div class="stat-value" style="font-size:15px">{{ fmt(summary.yearBalance) }}</div>
        </div>
      </div>

      <!-- 收支趨勢折線圖 -->
      <div class="card">
        <div class="section-title" style="margin-bottom:12px">📈 月度收支趨勢</div>
        <Line v-if="lineData" :data="lineData" :options="chartOptions" />
        <div v-else class="empty">尚無資料</div>
      </div>

      <!-- 月度詳細 -->
      <div class="card">
        <div class="section-title" style="margin-bottom:12px">月度明細</div>
        <div v-for="m in summary.months" :key="m.yearMonth" class="list-item">
          <span style="font-weight:600">{{ m.yearMonth }}</span>
          <div style="display:flex;gap:12px;font-size:13px">
            <span style="color:#16a34a">+{{ m.income.toLocaleString() }}</span>
            <span style="color:#dc2626">-{{ m.expense.toLocaleString() }}</span>
            <span :style="{ fontWeight: 700, color: m.balance >= 0 ? '#16a34a' : '#dc2626' }">
              {{ m.balance >= 0 ? '+' : '' }}{{ m.balance.toLocaleString() }}
            </span>
          </div>
        </div>
      </div>

      <!-- 支出分類圓餅圖 -->
      <div class="card" v-if="pieData">
        <div class="section-title" style="margin-bottom:12px">🥧 支出類別分析</div>
        <Pie :data="pieData" :options="pieOptions" />
      </div>

      <!-- 分類金額 -->
      <div v-if="summary.categoryBreakdown && Object.keys(summary.categoryBreakdown).length" class="card">
        <div class="section-title" style="margin-bottom:12px">支出分類金額</div>
        <div v-for="[cat, amt] in Object.entries(summary.categoryBreakdown)" :key="cat" class="list-item">
          <span>{{ cat }}</span>
          <span style="font-weight:700;color:#dc2626">NT$ {{ amt.toLocaleString() }}</span>
        </div>
      </div>

    </template>
  </div>
</template>
