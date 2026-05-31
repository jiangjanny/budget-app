<script setup>
import { ref, onMounted } from 'vue'
import { useAppStore } from '../stores/appStore'
import { api } from '../services/api'

const store = useAppStore()
const expenses = ref([])
const loading = ref(true)
const error = ref('')
const showForm = ref(false)
const form = ref({ date: today(), category: '醫療', amount: '', note: '' })
const saving = ref(false)
const formError = ref('')

const CATEGORIES = ['醫療', '運動', '日用品', '交通', '修繕', '其他']

function today() {
  return new Date().toISOString().split('T')[0].replace(/-/g, '/')
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    expenses.value = await api.getExpenses({})
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function submit() {
  if (!form.value.amount || isNaN(form.value.amount)) { formError.value = '請輸入正確金額'; return }
  saving.value = true
  formError.value = ''
  try {
    await api.addExpense(form.value)
    showForm.value = false
    form.value = { date: today(), category: '醫療', amount: '', note: '' }
    await load()
  } catch (e) {
    formError.value = e.message
  } finally {
    saving.value = false
  }
}

async function deleteRecord(id) {
  if (!confirm('確定刪除？')) return
  try {
    await api.deleteExpense(id)
    await load()
  } catch (e) {
    error.value = e.message
  }
}

onMounted(load)
</script>

<template>
  <div class="page">
    <div class="section-header">
      <h1 class="page-title" style="margin:0">💸 支出管理</h1>
      <button class="btn btn-primary btn-sm" @click="showForm=true">+ 新增</button>
    </div>

    <div v-if="loading" class="spinner" />
    <div v-else-if="error" class="alert alert-error">{{ error }}</div>
    <template v-else>
      <div v-if="expenses.length === 0" class="empty">尚無支出紀錄</div>
      <div v-else class="card">
        <div v-for="e in expenses" :key="e.id" class="list-item">
          <div>
            <div class="list-main">{{ e.date }}</div>
            <div class="list-sub">
              <span class="badge badge-gray" style="margin-right:4px">{{ e.category }}</span>
              {{ e.note }}
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <span class="list-amount" style="color:#dc2626">NT$ {{ e.amount.toLocaleString() }}</span>
            <button class="btn btn-ghost btn-sm" style="color:#dc2626;padding:4px"
              @click="deleteRecord(e.id)">✕</button>
          </div>
        </div>
      </div>
    </template>

    <!-- Modal -->
    <div v-if="showForm" class="modal-overlay" @click.self="showForm=false">
      <div class="modal-box">
        <div class="modal-title">💸 新增支出</div>
        <div class="form-group">
          <label class="form-label">日期</label>
          <input v-model="form.date" class="form-input" placeholder="2026/05/31" />
        </div>
        <div class="form-group">
          <label class="form-label">類別</label>
          <select v-model="form.category" class="form-input">
            <option v-for="c in CATEGORIES" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">金額（元）</label>
          <input v-model="form.amount" type="number" class="form-input" placeholder="1000" />
        </div>
        <div class="form-group">
          <label class="form-label">備註</label>
          <input v-model="form.note" class="form-input" placeholder="選填" />
        </div>
        <div v-if="formError" class="alert alert-error">{{ formError }}</div>
        <div class="modal-actions">
          <button class="btn btn-ghost flex-1" @click="showForm=false">取消</button>
          <button class="btn btn-primary flex-1" :disabled="saving" @click="submit">
            {{ saving ? '儲存中...' : '儲存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
