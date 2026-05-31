<script setup>
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAppStore } from './stores/appStore'

const store = useAppStore()
const router = useRouter()
const route = useRoute()

const navItems = [
  { path: '/',           icon: '🏠', label: '首頁' },
  { path: '/payments',   icon: '💰', label: '繳費' },
  { path: '/statistics', icon: '📊', label: '統計' },
  { path: '/history',    icon: '📋', label: '歷史' }
]

const adminNavItems = [
  { path: '/members',  icon: '👥', label: '成員' },
  { path: '/expenses', icon: '💸', label: '支出' },
  { path: '/settings', icon: '⚙️', label: '設定' }
]

const showNav = () => !['setup', 'login'].some(p => route.path.includes(p))

onMounted(() => store.init())
</script>

<template>
  <router-view />
  <nav class="bottom-nav" v-if="showNav()">
    <button
      v-for="item in navItems"
      :key="item.path"
      class="nav-item"
      :class="{ active: route.path === item.path }"
      @click="router.push(item.path)"
    >
      <span class="nav-icon">{{ item.icon }}</span>
      <span>{{ item.label }}</span>
    </button>
    <template v-if="store.isAdmin">
      <button
        v-for="item in adminNavItems"
        :key="item.path"
        class="nav-item"
        :class="{ active: route.path === item.path }"
        @click="router.push(item.path)"
      >
        <span class="nav-icon">{{ item.icon }}</span>
        <span>{{ item.label }}</span>
      </button>
    </template>
  </nav>
</template>
