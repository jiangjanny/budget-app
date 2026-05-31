const DEFAULT_URL = 'https://script.google.com/macros/s/AKfycbyU8KjKOlWLndiqrGUd5-XdypHgyMSvL9ztijlE-17_FyUFum_8gUs5VYyg0fYMAgo/exec'
const DEFAULT_TOKEN = 'family2024'

const getConfig = () => ({
  url: localStorage.getItem('scriptUrl') || DEFAULT_URL,
  token: localStorage.getItem('scriptToken') || DEFAULT_TOKEN
})

async function call(action, params = {}) {
  const { url, token } = getConfig()
  if (!url) throw new Error('尚未設定 Apps Script URL')

  const query = new URLSearchParams({ action, token, ...params })
  const res = await fetch(`${url}?${query}`)
  if (!res.ok) throw new Error(`網路錯誤 ${res.status}`)
  const json = await res.json()
  if (!json.ok) throw new Error(json.error || '請求失敗')
  return json.data
}

export const api = {
  // 設定
  getSettings: () => call('getSettings'),
  updateSettings: (data) => call('updateSettings', data),
  verifyAdmin: (pin) => call('verifyAdmin', { pin }),

  // 成員
  getMembers: () => call('getMembers'),
  addMember: (data) => call('addMember', data),
  updateMember: (data) => call('updateMember', data),

  // 繳費
  getPayments: (params = {}) => call('getPayments', params),
  addPayment: (data) => call('addPayment', data),
  deletePayment: (id) => call('deletePayment', { id }),
  getMemberStatus: (memberId) => call('getMemberStatus', { memberId }),
  getAllDebt: () => call('getAllDebt'),

  // 支出
  getExpenses: (params = {}) => call('getExpenses', params),
  addExpense: (data) => call('addExpense', data),
  deleteExpense: (id) => call('deleteExpense', { id }),

  // Dashboard & 報表
  getDashboard: (yearMonth) => call('getDashboard', yearMonth ? { yearMonth } : {}),
  getAnnualSummary: (year) => call('getAnnualSummary', { year }),

  // 通知
  sendNotification: (data) => call('sendNotification', data)
}
