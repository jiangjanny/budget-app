<script setup>
import { ref, onMounted } from 'vue'
import { useAppStore } from '../stores/appStore'
import { api } from '../services/api'

const store = useAppStore()

const filterYear = ref(new Date().getFullYear().toString())
const filterMonth = ref('')
const filterMemberId = ref(store.isAdmin ? '' : store.memberId)
const tab = ref('payments')

const payments = ref([])
const expenses = ref([])
const loading = ref(false)
const error = ref('')

const years = Array.from({ length: 3 }, (_, i) => String(new Date().getFullYear() - i))
const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))

function getYearMonth() {
  if (filterMonth.value) return `${filterYear.value}/${filterMonth.value}`
  return ''
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const params = { year: filterYear.value }
    if (filterMonth.value) params.yearMonth = getYearMonth()
    if (filterMemberId.value) params.memberId = filterMemberId.value

    const [pays, exps] = await Promise.all([
      api.getPayments(params),
      api.getExpenses({ year: filterYear.value, ...(filterMonth.value ? { yearMonth: getYearMonth() } : {}) })
    ])
    payments.value = pays.filter(p => !filterMemberId.value || p.memberId === filterMemberId.value)
    expenses.value = exps
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function memberName(id) {
  return store.members.find(m => m.id === id)?.name || id
}
const fmtD = (d) => d ? String(d).slice(2) : ''

function exportCSV() {
  const data = tab.value === 'payments'
    ? [['日期', '成員', '金額', '備註'], ...payments.value.map(p => [p.date, memberName(p.memberId), p.amount, p.note])]
    : [['日期', '類別', '金額', '備註'], ...expenses.value.map(e => [e.date, e.category, e.amount, e.note])]
  const csv = data.map(row => row.map(v => `"${v}"`).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `家庭費用_${filterYear.value}${filterMonth.value ? '_' + filterMonth.value : ''}_${tab.value}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(load)
</script>

<template>
  <div class="page">
    <div class="section-header">
      <h1 class="page-title" style="margin:0">📋 歷史查詢</h1>
      <button class="btn btn-outline btn-sm" @click="exportCSV">↓ 匯出</button>
    </div>

    <!-- 篩選 -->
    <div class="card" style="padding:12px">
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <select v-model="filterYear" class="form-input" style="flex:1;min-width:80px">
          <option v-for="y in years" :key="y" :value="y">{{ y }} 年</option>
        </select>
        <select v-model="filterMonth" class="form-input" style="flex:1;min-width:80px">
          <option value="">全年</option>
          <option v-for="m in months" :key="m" :value="m">{{ m }} 月</option>
        </select>
        <select v-if="store.isAdmin" v-model="filterMemberId" class="form-input" style="flex:1;min-width:80px">
          <option value="">全部成員</option>
          <option v-for="m in store.members" :key="m.id" :value="m.id">{{ m.name }}</option>
        </select>
        <button class="btn btn-primary btn-sm" @click="load" style="white-space:nowrap">查詢</button>
      </div>
    </div>

    <div class="tabs">
      <button class="tab" :class="{ active: tab==='payments' }" @click="tab='payments'">
        繳費紀錄（{{ payments.length }}）
      </button>
      <button class="tab" :class="{ active: tab==='expenses' }" @click="tab='expenses'">
        支出紀錄（{{ expenses.length }}）
      </button>
    </div>

    <div v-if="loading" class="spinner" />
    <div v-else-if="error" class="alert alert-error">{{ error }}</div>

    <!-- 繳費 -->
    <template v-else-if="tab === 'payments'">
      <div v-if="!payments.length" class="empty">查無繳費紀錄</div>
      <div v-else class="card">
        <div style="font-size:13px;color:#64748b;margin-bottom:8px">
          共 {{ payments.length }} 筆 · NT$ {{ payments.reduce((s,p)=>s+p.amount,0).toLocaleString() }}
        </div>
        <div v-for="p in payments" :key="p.id" class="list-item">
          <div>
            <div class="list-main">{{ store.isAdmin ? memberName(p.memberId) : fmtD(p.date) }}</div>
            <div class="list-sub">{{ store.isAdmin ? fmtD(p.date) : '' }} {{ p.note }}</div>
          </div>
          <span class="list-amount" style="color:#16a34a">NT$ {{ p.amount.toLocaleString() }}</span>
        </div>
      </div>
    </template>

    <!-- 支出 -->
    <template v-else>
      <div v-if="!expenses.length" class="empty">查無支出紀錄</div>
      <div v-else class="card">
        <div style="font-size:13px;color:#64748b;margin-bottom:8px">
          共 {{ expenses.length }} 筆 · NT$ {{ expenses.reduce((s,e)=>s+e.amount,0).toLocaleString() }}
        </div>
        <div v-for="e in expenses" :key="e.id" class="list-item">
          <div>
            <div class="list-main">{{ fmtD(e.date) }}</div>
            <div class="list-sub"><span class="badge badge-gray">{{ e.category }}</span> {{ e.note }}</div>
          </div>
          <span class="list-amount" style="color:#dc2626">NT$ {{ e.amount.toLocaleString() }}</span>
        </div>
      </div>
    </template>
  </div>
</template>
