<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../stores/appStore'
import { api } from '../services/api'

const GOOGLE_CLIENT_ID = '150598598156-qcf5trf64r6in6mmapv8j2haa71o2a00.apps.googleusercontent.com'

const store = useAppStore()
const router = useRouter()

const mode = ref('google')  // 'google' | 'select' | 'admin' | 'member'
const adminPin = ref('')
const selectedMemberId = ref('')
const error = ref('')
const loading = ref(false)
const googleUser = ref(null)

const activeMembers = computed(() => store.members.filter(m => m.status === 'active'))

onMounted(() => {
  const init = () => {
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleCredential,
      auto_select: false
    })
    window.google.accounts.id.renderButton(
      document.getElementById('google-signin-btn'),
      { theme: 'outline', size: 'large', locale: 'zh-TW', width: 280 }
    )
  }
  if (window.google) init()
  else document.querySelector('script[src*="gsi"]').addEventListener('load', init)
})

function handleCredential(response) {
  const payload = JSON.parse(atob(response.credential.split('.')[1]))
  googleUser.value = { email: payload.email, name: payload.name, picture: payload.picture }

  if (store.settings.adminEmail && payload.email === store.settings.adminEmail) {
    store.setRole('admin')
    router.push('/')
    return
  }
  mode.value = 'select'
}

async function loginAdmin() {
  loading.value = true
  error.value = ''
  try {
    const result = await api.verifyAdmin(adminPin.value)
    if (result.valid) {
      store.setRole('admin')
      router.push('/')
    } else {
      error.value = 'PIN 碼錯誤'
    }
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function loginMember() {
  if (!selectedMemberId.value) { error.value = '請選擇成員'; return }
  store.setRole('member', selectedMemberId.value)
  router.push('/')
}

function backToGoogle() {
  mode.value = 'google'
  googleUser.value = null
  error.value = ''
  adminPin.value = ''
  selectedMemberId.value = ''
  onMounted(() => { })
}
</script>

<template>
  <div
    style="max-width:480px;margin:0 auto;padding:32px 20px;min-height:100vh;display:flex;flex-direction:column;justify-content:center">
    <div style="text-align:center;margin-bottom:32px">
      <div style="font-size:48px;margin-bottom:12px">🏡</div>
      <h1 style="font-size:22px;font-weight:800;color:#1e293b">家庭費用管理系統</h1>
    </div>

    <!-- Google 登入 -->
    <template v-if="mode === 'google'">
      <div class="card" style="text-align:center;padding:32px 24px">
        <p style="color:#64748b;margin-bottom:24px;font-size:15px">請使用 Google 帳號登入</p>
        <div id="google-signin-btn" style="display:flex;justify-content:center"></div>
      </div>
    </template>

    <!-- 選擇角色（Google 登入後，非管理員帳號） -->
    <template v-else-if="mode === 'select'">
      <div class="card">
        <div v-if="googleUser"
          style="display:flex;align-items:center;gap:12px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #f1f5f9">
          <img :src="googleUser.picture" style="width:40px;height:40px;border-radius:50%" />
          <div>
            <div style="font-weight:700;font-size:14px">{{ googleUser.name }}</div>
            <div style="font-size:12px;color:#94a3b8">{{ googleUser.email }}</div>
          </div>
        </div>
        <p style="color:#64748b;margin-bottom:16px;font-size:14px">請選擇登入身分</p>
        <button class="btn btn-primary btn-full" style="margin-bottom:10px;font-size:15px;padding:13px"
          @click="mode = 'admin'">
          🔑 管理者登入
        </button>
        <button class="btn btn-outline btn-full" style="font-size:15px;padding:13px" @click="mode = 'member'">
          👤 成員查詢
        </button>
      </div>
    </template>

    <!-- 管理者 PIN -->
    <template v-else-if="mode === 'admin'">
      <div class="card">
        <div v-if="googleUser"
          style="display:flex;align-items:center;gap:12px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #f1f5f9">
          <img :src="googleUser.picture" style="width:40px;height:40px;border-radius:50%" />
          <div>
            <div style="font-weight:700;font-size:14px">{{ googleUser.name }}</div>
            <div style="font-size:12px;color:#94a3b8">{{ googleUser.email }}</div>
          </div>
        </div>
        <p class="modal-title">🔑 管理者登入</p>
        <div class="form-group">
          <label class="form-label">PIN 碼</label>
          <input v-model="adminPin" type="password" class="form-input" placeholder="請輸入 PIN 碼"
            style="font-size:24px;letter-spacing:8px;text-align:center" @keyup.enter="loginAdmin" />
        </div>
        <div v-if="error" class="alert alert-error">{{ error }}</div>
        <div class="modal-actions">
          <button class="btn btn-ghost flex-1" @click="mode = 'select'; error = ''">返回</button>
          <button class="btn btn-primary flex-1" :disabled="loading" @click="loginAdmin">
            {{ loading ? '驗證中...' : '登入' }}
          </button>
        </div>
      </div>
    </template>

    <!-- 成員選擇 -->
    <template v-else-if="mode === 'member'">
      <div class="card">
        <div v-if="googleUser"
          style="display:flex;align-items:center;gap:12px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #f1f5f9">
          <img :src="googleUser.picture" style="width:40px;height:40px;border-radius:50%" />
          <div>
            <div style="font-weight:700;font-size:14px">{{ googleUser.name }}</div>
            <div style="font-size:12px;color:#94a3b8">{{ googleUser.email }}</div>
          </div>
        </div>
        <p class="modal-title">👤 選擇成員</p>
        <div class="form-group">
          <label class="form-label">我是</label>
          <select v-model="selectedMemberId" class="form-input">
            <option value="">請選擇...</option>
            <option v-for="m in activeMembers" :key="m.id" :value="m.id">
              {{ m.name }}{{ m.nickname ? ` (${m.nickname})` : '' }}
            </option>
          </select>
        </div>
        <div v-if="error" class="alert alert-error">{{ error }}</div>
        <div class="modal-actions">
          <button class="btn btn-ghost flex-1" @click="mode = 'select'; error = ''">返回</button>
          <button class="btn btn-primary flex-1" @click="loginMember">進入</button>
        </div>
      </div>
    </template>
  </div>
</template>
