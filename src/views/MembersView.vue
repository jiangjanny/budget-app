<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAppStore } from '../stores/appStore'
import { api } from '../services/api'

const store = useAppStore()

const showForm = ref(false)
const editTarget = ref(null)
const form = ref({ name: '', nickname: '', email: '', status: 'active', notes: '', memberStartYearMonth: '', obligationEndYearMonth: '' })
const saving = ref(false)
const formError = ref('')

function openAdd() {
  editTarget.value = null
  form.value = { name: '', nickname: '', email: '', status: 'active', notes: '', memberStartYearMonth: '', obligationEndYearMonth: '' }
  formError.value = ''
  showForm.value = true
}

function openEdit(member) {
  editTarget.value = member
  form.value = {
    name: member.name,
    nickname: member.nickname,
    email: member.email || '',
    status: member.status,
    notes: member.notes,
    memberStartYearMonth: member.memberStartYearMonth || '',
    obligationEndYearMonth: member.obligationEndYearMonth || ''
  }
  formError.value = ''
  showForm.value = true
}

async function submit() {
  if (!form.value.name.trim()) { formError.value = '請輸入姓名'; return }
  saving.value = true
  formError.value = ''
  try {
    if (editTarget.value) {
      await api.updateMember({ id: editTarget.value.id, ...form.value })
    } else {
      await api.addMember(form.value)
    }
    showForm.value = false
    await store.loadMembers()
  } catch (e) {
    formError.value = e.message
  } finally {
    saving.value = false
  }
}

// 計算剩餘義務月數
function remainingMonths(endYM) {
  if (!endYM) return null
  const now = new Date()
  const nowYM = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,'0')}`
  if (nowYM > endYM) return 0
  const [sy, sm] = nowYM.split('/').map(Number)
  const [ey, em] = endYM.split('/').map(Number)
  return (ey - sy) * 12 + (em - sm + 1)
}

function fmtAmount(n) {
  return `NT$ ${Number(n || 0).toLocaleString()}`
}
const fmtD = (d) => d ? String(d).slice(2) : ''

onMounted(() => store.loadMembers())
</script>

<template>
  <div class="page">
    <div class="section-header">
      <h1 class="page-title" style="margin:0">👥 成員管理</h1>
      <button class="btn btn-primary btn-sm" @click="openAdd">+ 新增</button>
    </div>

    <div v-for="m in store.members" :key="m.id" class="card" style="padding:14px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
        <div>
          <div style="font-size:17px;font-weight:700">{{ m.name }}
            <span v-if="m.nickname" style="font-weight:400;color:#64748b;font-size:14px"> ({{ m.nickname }})</span>
          </div>
          <span class="badge" :class="m.status === 'active' ? 'badge-green' : 'badge-gray'" style="margin-top:4px">
            {{ m.status === 'active' ? '啟用中' : '停用' }}
          </span>
        </div>
        <button class="btn btn-outline btn-sm" @click="openEdit(m)">編輯</button>
      </div>

      <!-- 義務期資訊 -->
      <div v-if="m.memberStartYearMonth || m.obligationEndYearMonth"
        style="background:#f8fafc;border-radius:8px;padding:10px;font-size:13px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
          <div v-if="m.memberStartYearMonth">
            <div style="color:#64748b">開始年月</div>
            <div style="font-weight:600">{{ fmtD(m.memberStartYearMonth) }}</div>
          </div>
          <div v-if="m.obligationEndYearMonth">
            <div style="color:#64748b">義務結束</div>
            <div style="font-weight:600">{{ fmtD(m.obligationEndYearMonth) }}</div>
          </div>
          <div v-if="m.obligationEndYearMonth">
            <div style="color:#64748b">剩餘月數</div>
            <div v-if="remainingMonths(m.obligationEndYearMonth) > 0" style="font-weight:700;color:#d97706">
              {{ remainingMonths(m.obligationEndYearMonth) }} 個月
            </div>
            <div v-else style="font-weight:700;color:#16a34a">✓ 義務已完成</div>
          </div>
          <div v-if="m.obligationEndYearMonth && remainingMonths(m.obligationEndYearMonth) > 0">
            <div style="color:#64748b">剩餘金額</div>
            <div style="font-weight:700;color:#dc2626">
              {{ fmtAmount(remainingMonths(m.obligationEndYearMonth) * 5000) }}
            </div>
          </div>
        </div>
      </div>

      <div v-if="m.notes" style="font-size:13px;color:#64748b;margin-top:8px">{{ m.notes }}</div>
    </div>

    <div v-if="!store.members.length" class="empty">尚無成員，請新增</div>

    <!-- Modal -->
    <div v-if="showForm" class="modal-overlay" @click.self="showForm=false">
      <div class="modal-box">
        <div class="modal-title">{{ editTarget ? '編輯成員' : '新增成員' }}</div>
        <div class="form-group">
          <label class="form-label">姓名 *</label>
          <input v-model="form.name" class="form-input" placeholder="王小明" />
        </div>
        <div class="form-group">
          <label class="form-label">暱稱</label>
          <input v-model="form.nickname" class="form-input" placeholder="選填" />
        </div>
        <div class="form-group">
          <label class="form-label">Google 信箱（登入用）</label>
          <input v-model="form.email" class="form-input" placeholder="example@gmail.com" type="email" />
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div class="form-group">
            <label class="form-label">義務開始年月</label>
            <input v-model="form.memberStartYearMonth" class="form-input" placeholder="2014/01" />
          </div>
          <div class="form-group">
            <label class="form-label">義務結束年月</label>
            <input v-model="form.obligationEndYearMonth" class="form-input" placeholder="2026/12" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">狀態</label>
          <select v-model="form.status" class="form-input">
            <option value="active">啟用</option>
            <option value="inactive">停用</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">備註</label>
          <input v-model="form.notes" class="form-input" placeholder="選填" />
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
