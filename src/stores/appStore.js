import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '../services/api'

export const useAppStore = defineStore('app', () => {
  const role = ref(localStorage.getItem('role') || null)       // 'admin' | 'member'
  const memberId = ref(localStorage.getItem('memberId') || null)
  const isSetup = ref(true)

  const members = ref([])
  const settings = ref({})
  const loading = ref(false)
  const error = ref(null)

  const isAdmin = computed(() => role.value === 'admin')
  const currentMember = computed(() => members.value.find(m => m.id === memberId.value))

  function setRole(r, id = null) {
    role.value = r
    memberId.value = id
    localStorage.setItem('role', r)
    if (id) localStorage.setItem('memberId', id)
    else localStorage.removeItem('memberId')
  }

  function logout() {
    role.value = null
    memberId.value = null
    localStorage.removeItem('role')
    localStorage.removeItem('memberId')
    localStorage.removeItem('scriptUrl')
    localStorage.removeItem('scriptToken')
  }

  function setupScript(url, token) {
    localStorage.setItem('scriptUrl', url)
    localStorage.setItem('scriptToken', token)
    isSetup.value = true
  }

  async function loadMembers() {
    members.value = await api.getMembers()
  }

  async function loadSettings() {
    settings.value = await api.getSettings()
  }

  async function init() {
    if (!isSetup.value) return
    loading.value = true
    error.value = null
    try {
      await Promise.all([loadMembers(), loadSettings()])
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  return {
    role, memberId, isSetup, isAdmin, currentMember,
    members, settings, loading, error,
    setRole, logout, setupScript, init, loadMembers, loadSettings
  }
})
