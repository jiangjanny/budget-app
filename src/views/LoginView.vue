<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../stores/appStore'
import { api } from '../services/api'

const GOOGLE_CLIENT_ID = '150598598156-tirvcdctbh2itjjn47efnhrkkblplq4l.apps.googleusercontent.com'

// 管理者信箱（寫死，不存在 Sheets）
const ADMIN_EMAIL = 'kitty46978@gmail.com'

const store = useAppStore()
const router = useRouter()

const mode = ref('google')  // 'google' | 'member' | 'adminPin'
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

async function handleCredential(response) {
  const payload = JSON.parse(atob(response.credential.split('.')[1]))
  googleUser.value = { email: payload.email, name: payload.name, picture: payload.picture }

  window.google.accounts.id.cancel()

  if (payload.email === ADMIN_EMAIL) {
    store.setRole('admin')
    await router.push('/')
    return
  }

  // 從 Sheets 成員資料查 email
  if (!store.members.length) await store.loadMembers()
  const member = store.members.find(m => m.email === payload.email)
  if (member) {
    store.setRole('member', member.id)
    await router.push('/')
    return
  }

  // 找不到對應成員 → 顯示成員選單
  mode.value = 'member'
}

function loginMember() {
  if (!selectedMemberId.value) { error.value = '請選擇成員'; return }
  store.setRole('member', selectedMemberId.value)
  router.push('/')
}

// 隱藏的管理者 PIN 入口（點標題 5 次觸發）
const titleClickCount = ref(0)
function handleTitleClick() {
  titleClickCount.value++
  if (titleClickCount.value >= 5) {
    titleClickCount.value = 0
    mode.value = 'adminPin'
  }
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
</script>

<template>
  <div style="max-width:480px;margin:0 auto;padding:32px 20px;min-height:100vh;display:flex;flex-direction:column;justify-content:center">
    <div style="text-align:center;margin-bottom:32px">
      <div style="font-size:48px;margin-bottom:12px">🏡</div>
      <h1 style="font-size:22px;font-weight:800;color:#1e293b;cursor:default" @click="handleTitleClick">家庭費用管理系統</h1>
    </div>

    <!-- Google 登入 -->
    <template v-if="mode === 'google'">
      <div class="card" style="text-align:center;padding:32px 24px">
        <p style="color:#64748b;margin-bottom:24px;font-size:15px">請使用 Google 帳號登入</p>
        <div id="google-signin-btn" style="display:flex;justify-content:center"></div>
      </div>
    </template>

    <!-- 成員選擇 -->
    <template v-else-if="mode === 'member'">
      <div class="card">
        <div v-if="googleUser" style="display:flex;align-items:center;gap:12px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #f1f5f9">
          <img :src="googleUser.picture" style="width:40px;height:40px;border-radius:50%" />
          <div>
            <div style="font-weight:700;font-size:14px">{{ googleUser.name }}</div>
            <div style="font-size:12px;color:#94a3b8">{{ googleUser.email }}</div>
          </div>
        </div>
        <p class="modal-title">👤 我是</p>
        <div class="form-group">
          <select v-model="selectedMemberId" class="form-input">
            <option value="">請選擇...</option>
            <option v-for="m in activeMembers" :key="m.id" :value="m.id">
              {{ m.name }}{{ m.nickname ? ` (${m.nickname})` : '' }}
            </option>
          </select>
        </div>
        <div v-if="error" class="alert alert-error">{{ error }}</div>
        <button class="btn btn-primary btn-full" style="margin-top:8px" @click="loginMember">進入</button>
      </div>
    </template>

    <!-- 管理者 PIN（隱藏入口，點標題 5 次） -->
    <template v-else-if="mode === 'adminPin'">
      <div class="card">
        <p class="modal-title">🔑 管理者登入</p>
        <div class="form-group">
          <input v-model="adminPin" type="password" class="form-input" placeholder="PIN 碼"
            style="font-size:24px;letter-spacing:8px;text-align:center" @keyup.enter="loginAdmin" />
        </div>
        <div v-if="error" class="alert alert-error">{{ error }}</div>
        <div class="modal-actions">
          <button class="btn btn-ghost flex-1" @click="mode='google'; error=''">返回</button>
          <button class="btn btn-primary flex-1" :disabled="loading" @click="loginAdmin">
            {{ loading ? '驗證中...' : '登入' }}
          </button>
        </div>
      </div>
    </template>
  </div>
</template>
