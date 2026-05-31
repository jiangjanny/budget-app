<script setup>
import { ref, onMounted } from 'vue'
import { useAppStore } from '../stores/appStore'
import { api } from '../services/api'

const store = useAppStore()

const form = ref({
  homeFee: 5000,
  baseCareFeeBefore: 1000,
  baseCareFeeAfter: 2000,
  careDeadlineYearMonth: '2026/12',
  systemStartYearMonth: '2026/01',
  paymentDueDay: 10,
  adminEmail: '',
  notifyEmails: '',
  adminPin: ''
})

const saving = ref(false)
const saved = ref(false)
const error = ref('')

const notifyForm = ref({ subject: '', htmlBody: '' })
const notifySending = ref(false)
const notifySent = ref(false)

onMounted(async () => {
  const s = await api.getSettings()
  Object.assign(form.value, s)
})

async function save() {
  saving.value = true
  error.value = ''
  saved.value = false
  try {
    await api.updateSettings(form.value)
    await store.loadSettings()
    saved.value = true
    setTimeout(() => saved.value = false, 3000)
  } catch (e) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}

async function sendTestNotify() {
  notifySending.value = true
  notifySent.value = false
  try {
    await api.sendNotification({
      subject: notifyForm.value.subject || '家庭費用系統測試通知',
      htmlBody: notifyForm.value.htmlBody || '<p>這是一封測試通知信件。</p>'
    })
    notifySent.value = true
    setTimeout(() => notifySent.value = false, 3000)
  } catch (e) {
    error.value = e.message
  } finally {
    notifySending.value = false
  }
}
</script>

<template>
  <div class="page">
    <h1 class="page-title">⚙️ 系統設定</h1>

    <div class="card">
      <div class="section-title" style="margin-bottom:12px">費用規則</div>
      <div class="form-group">
        <label class="form-label">家用費（元/月）</label>
        <input v-model.number="form.homeFee" type="number" class="form-input" />
      </div>
      <div class="form-group">
        <label class="form-label">照顧費（截止日前，元/月）</label>
        <input v-model.number="form.baseCareFeeBefore" type="number" class="form-input" />
      </div>
      <div class="form-group">
        <label class="form-label">照顧費（截止日後，元/月）</label>
        <input v-model.number="form.baseCareFeeAfter" type="number" class="form-input" />
      </div>
      <div class="form-group">
        <label class="form-label">照顧費截止年月（例：2026/12）</label>
        <input v-model="form.careDeadlineYearMonth" class="form-input" placeholder="2026/12" />
        <p style="font-size:12px;color:#64748b;margin-top:4px">
          此年月及之前：{{ form.baseCareFeeBefore }} 元；之後：{{ form.baseCareFeeAfter }} 元
        </p>
      </div>
      <div class="form-group">
        <label class="form-label">系統起始年月</label>
        <input v-model="form.systemStartYearMonth" class="form-input" placeholder="2026/01" />
      </div>
      <div class="form-group">
        <label class="form-label">繳費截止日（每月第幾天）</label>
        <input v-model.number="form.paymentDueDay" type="number" class="form-input" placeholder="10" />
      </div>
    </div>

    <div class="card">
      <div class="section-title" style="margin-bottom:12px">通知設定</div>
      <div class="form-group">
        <label class="form-label">管理者信箱</label>
        <input v-model="form.adminEmail" class="form-input" placeholder="admin@gmail.com" type="email" />
      </div>
      <div class="form-group">
        <label class="form-label">通知信箱（多個用逗號分隔）</label>
        <input v-model="form.notifyEmails" class="form-input" placeholder="a@gmail.com,b@gmail.com" />
      </div>
    </div>

    <div class="card">
      <div class="section-title" style="margin-bottom:12px">安全設定</div>
      <div class="form-group">
        <label class="form-label">管理者 PIN 碼（留空不更改）</label>
        <input v-model="form.adminPin" type="password" class="form-input" placeholder="••••" />
      </div>
    </div>

    <div v-if="error" class="alert alert-error">{{ error }}</div>
    <div v-if="saved" class="alert alert-info">✓ 設定已儲存</div>
    <button class="btn btn-primary btn-full" :disabled="saving" @click="save">
      {{ saving ? '儲存中...' : '儲存設定' }}
    </button>

    <!-- 測試通知 -->
    <div class="card" style="margin-top:16px">
      <div class="section-title" style="margin-bottom:12px">📧 發送測試通知</div>
      <div class="form-group">
        <label class="form-label">主旨</label>
        <input v-model="notifyForm.subject" class="form-input" placeholder="家庭費用系統測試通知" />
      </div>
      <div class="form-group">
        <label class="form-label">內容（HTML）</label>
        <textarea v-model="notifyForm.htmlBody" class="form-input" rows="3" placeholder="<p>測試內容</p>" style="resize:vertical"></textarea>
      </div>
      <div v-if="notifySent" class="alert alert-info">✓ 通知已發送</div>
      <button class="btn btn-outline btn-full" :disabled="notifySending" @click="sendTestNotify">
        {{ notifySending ? '發送中...' : '發送測試信件' }}
      </button>
      <p style="font-size:12px;color:#64748b;margin-top:8px">
        每月 1 日自動發送月報，需在 Apps Script 執行 <b>setupMonthlyTrigger()</b> 一次以設定排程。
      </p>
    </div>
  </div>
</template>
