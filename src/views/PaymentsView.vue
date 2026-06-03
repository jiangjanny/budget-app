<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAppStore } from '../stores/appStore'
import { api } from '../services/api'

const store = useAppStore()

const payments = ref([])
const memberStatuses = ref([])
const loading = ref(true)
const error = ref('')
const showForm = ref(false)
const tab = ref('records')  // 'records' | 'status'
const filterMemberId = ref('')

// Form
const form = ref({ memberId: '', date: today(), amount: '', note: '' })
const saving = ref(false)
const formError = ref('')

function today() {
  return new Date().toISOString().split('T')[0].replace(/-/g, '/')
}

const activeMembers = computed(() => store.members.filter(m => m.status === 'active'))

const filteredPayments = computed(() =>
  filterMemberId.value
    ? payments.value.filter(p => p.memberId === filterMemberId.value)
    : payments.value
)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [pays, statuses] = await Promise.all([
      api.getPayments({}),
      store.isAdmin
        ? api.getAllDebt()
        : api.getMemberStatus(store.memberId).then(s => [{ member: store.currentMember, ...s }])
    ])
    payments.value = pays
    memberStatuses.value = statuses
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function submit() {
  if (!form.value.memberId) { formError.value = '請選擇成員'; return }
  if (!form.value.amount || isNaN(form.value.amount)) { formError.value = '請輸入正確金額'; return }
  saving.value = true
  formError.value = ''
  try {
    await api.addPayment({
      memberId: form.value.memberId,
      date: form.value.date,
      amount: form.value.amount,
      note: form.value.note
    })
    showForm.value = false
    form.value = { memberId: '', date: today(), amount: '', note: '' }
    await load()
  } catch (e) {
    formError.value = e.message
  } finally {
    saving.value = false
  }
}

async function deleteRecord(id) {
  if (!confirm('確定刪除此筆紀錄？')) return
  try {
    await api.deletePayment(id)
    await load()
  } catch (e) {
    error.value = e.message
  }
}

function memberName(id) {
  return store.members.find(m => m.id === id)?.name || id
}

onMounted(load)
</script>

<template>
  <div class="page">
    <div class="section-header">
      <h1 class="page-title" style="margin:0">💰 繳費管理</h1>
      <button v-if="store.isAdmin" class="btn btn-primary btn-sm" @click="showForm=true">+ 新增</button>
    </div>

    <div class="tabs">
      <button class="tab" :class="{ active: tab==='status' }" @click="tab='status'">繳費狀況</button>
      <button class="tab" :class="{ active: tab==='records' }" @click="tab='records'">繳費紀錄</button>
    </div>

    <div v-if="loading" class="spinner" />
    <div v-else-if="error" class="alert alert-error">{{ error }}</div>

    <!-- 繳費狀況 Tab -->
    <template v-else-if="tab === 'status'">
      <div v-for="s in memberStatuses" :key="s.member?.id" class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div>
            <div style="font-weight:700;font-size:16px">{{ s.member?.name }}</div>
            <div style="font-size:13px;color:#64748b">總繳：NT$ {{ (s.totalPaid || 0).toLocaleString() }}</div>
          </div>
          <div style="text-align:right">
            <span v-if="s.prepaidCount > 0" class="badge badge-blue">預繳 {{ s.prepaidCount }} 個月</span>
            <span v-if="s.debtMonths?.length > 0" class="badge badge-red">欠費 {{ s.debtMonths.length }} 個月</span>
            <span v-if="!s.prepaidCount && !s.debtMonths?.length" class="badge badge-green">正常</span>
          </div>
        </div>

        <!-- 欠費詳情 -->
        <template v-if="s.debtMonths?.length">
          <div style="margin-bottom:8px;font-size:13px;font-weight:700;color:#dc2626">⚠️ 欠費明細</div>
          <div v-for="dm in s.debtMonths" :key="dm.yearMonth"
            style="display:flex;justify-content:space-between;font-size:13px;padding:4px 0;border-bottom:1px solid #fee2e2">
            <span>{{ dm.yearMonth }}</span>
            <span style="color:#dc2626;font-weight:600">欠 NT$ {{ dm.owed.toLocaleString() }}</span>
          </div>
        </template>

        <!-- 預繳月份 -->
        <template v-if="s.prepaidMonths?.length">
          <div style="margin-top:8px;font-size:13px;font-weight:700;color:#2563eb">✓ 預繳月份</div>
          <div style="font-size:13px;color:#2563eb;margin-top:4px">
            {{ s.prepaidMonths.join('、') }}
          </div>
        </template>

        <!-- 剩餘餘額 -->
        <div v-if="s.remainingBalance > 0" style="margin-top:8px;font-size:13px;color:#16a34a;font-weight:600">
          餘額：NT$ {{ s.remainingBalance.toLocaleString() }}
        </div>
      </div>
    </template>

    <!-- 繳費紀錄 Tab -->
    <template v-else>
      <!-- 篩選 -->
      <div class="form-group" style="margin-bottom:8px">
        <select v-model="filterMemberId" class="form-input">
          <option value="">全部成員</option>
          <option v-for="m in activeMembers" :key="m.id" :value="m.id">{{ m.name }}</option>
        </select>
      </div>

      <div v-if="filteredPayments.length === 0" class="empty">尚無繳費紀錄</div>
      <div v-else class="card">
        <div v-for="p in filteredPayments" :key="p.id" class="list-item">
          <div>
            <div class="list-main" style="font-weight:700">{{ memberName(p.memberId) }}</div>
            <div class="list-sub">{{ p.date }}{{ p.note ? '　' + p.note : '' }}</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <span class="list-amount" style="color:#16a34a">NT$ {{ p.amount.toLocaleString() }}</span>
            <button v-if="store.isAdmin" class="btn btn-ghost btn-sm" style="color:#dc2626;padding:4px"
              @click="deleteRecord(p.id)">✕</button>
          </div>
        </div>
      </div>
    </template>

    <!-- 新增繳費 Modal -->
    <div v-if="showForm" class="modal-overlay" @click.self="showForm=false">
      <div class="modal-box">
        <div class="modal-title">💰 新增繳費紀錄</div>
        <div class="form-group">
          <label class="form-label">成員</label>
          <select v-model="form.memberId" class="form-input">
            <option value="">請選擇成員</option>
            <option v-for="m in activeMembers" :key="m.id" :value="m.id">{{ m.name }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">繳費日期</label>
          <input v-model="form.date" type="text" class="form-input" placeholder="2026/05/31" />
        </div>
        <div class="form-group">
          <label class="form-label">金額（元）</label>
          <input v-model="form.amount" type="number" class="form-input" placeholder="6000" />
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
