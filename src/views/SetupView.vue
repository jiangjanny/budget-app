<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../stores/appStore'

const store = useAppStore()
const router = useRouter()

const url = ref('')
const token = ref('family2024')
const error = ref('')
const testing = ref(false)

async function save() {
  if (!url.value.trim()) { error.value = '請輸入 Apps Script URL'; return }
  testing.value = true
  error.value = ''
  try {
    store.setupScript(url.value.trim(), token.value.trim())
    await store.init()
    router.push('/login')
  } catch (e) {
    error.value = '連線失敗：' + e.message
  } finally {
    testing.value = false
  }
}
</script>

<template>
  <div style="max-width:480px;margin:0 auto;padding:32px 20px;min-height:100vh;display:flex;flex-direction:column;justify-content:center">
    <div style="text-align:center;margin-bottom:32px">
      <div style="font-size:48px;margin-bottom:12px">🏡</div>
      <h1 style="font-size:22px;font-weight:800;color:#1e293b">家庭費用管理系統</h1>
      <p style="color:#64748b;margin-top:6px;font-size:14px">初次使用，請設定連線資訊</p>
    </div>

    <div class="card">
      <div class="form-group">
        <label class="form-label">Apps Script 網址</label>
        <input v-model="url" class="form-input" placeholder="https://script.google.com/macros/s/..." />
        <p style="font-size:12px;color:#64748b;margin-top:4px">在 Google Sheets → 擴充功能 → Apps Script → 部署取得</p>
      </div>
      <div class="form-group">
        <label class="form-label">存取金鑰（Token）</label>
        <input v-model="token" class="form-input" placeholder="family2024" />
        <p style="font-size:12px;color:#64748b;margin-top:4px">需與 Apps Script 設定的 appToken 相同</p>
      </div>
      <div v-if="error" class="alert alert-error">{{ error }}</div>
      <button class="btn btn-primary btn-full" :disabled="testing" @click="save">
        {{ testing ? '連線測試中...' : '儲存並連線' }}
      </button>
    </div>

    <div class="card" style="margin-top:12px">
      <p style="font-size:13px;font-weight:700;margin-bottom:8px">📋 設定步驟</p>
      <ol style="font-size:13px;color:#64748b;padding-left:16px;line-height:2">
        <li>開啟 Google 試算表，建立新的工作表</li>
        <li>點選「擴充功能」→「Apps Script」</li>
        <li>將 <b>Code.gs</b> 的內容貼上並儲存</li>
        <li>執行 <b>initSpreadsheet()</b> 初始化資料</li>
        <li>點選「部署」→「新增部署作業」</li>
        <li>類型選「網頁應用程式」，執行身分「我」，存取「任何人」</li>
        <li>複製部署網址貼到上方</li>
      </ol>
    </div>
  </div>
</template>
