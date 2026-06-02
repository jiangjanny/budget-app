// ============================================
// 家庭費用管理系統 - Google Apps Script 後端
// 部署方式：執行身分「我」、存取權限「任何人」
// ============================================

const SHEETS = {
  SETTINGS: 'Settings',
  MEMBERS: 'Members',
  PAYMENTS: 'Payments',
  EXPENSES: 'Expenses'
};

function doGet(e) {
  const p = e.parameter;
  const cb = p.callback;
  if (!validateToken(p.token)) {
    return respond({ error: '未授權' }, cb);
  }
  try {
    switch (p.action) {
      case 'getSettings':      return respond(getSettings(), cb);
      case 'updateSettings':   return respond(updateSettings(p), cb);
      case 'verifyAdmin':      return respond(verifyAdmin(p), cb);
      case 'getMembers':       return respond(getMembers(), cb);
      case 'addMember':        return respond(addMember(p), cb);
      case 'updateMember':     return respond(updateMember(p), cb);
      case 'getPayments':      return respond(getPayments(p), cb);
      case 'addPayment':       return respond(addPayment(p), cb);
      case 'deletePayment':    return respond(deletePayment(p), cb);
      case 'getExpenses':      return respond(getExpenses(p), cb);
      case 'addExpense':       return respond(addExpense(p), cb);
      case 'deleteExpense':    return respond(deleteExpense(p), cb);
      case 'getDashboard':     return respond(getDashboard(p), cb);
      case 'getMemberStatus':  return respond(getMemberStatus(p), cb);
      case 'getAllDebt':        return respond(getAllDebt(), cb);
      case 'getAnnualSummary': return respond(getAnnualSummary(p), cb);
      case 'sendNotification': return respond(sendNotification(p), cb);
      default: return respond({ error: '未知動作: ' + p.action }, cb);
    }
  } catch (err) {
    return respond({ error: err.message }, cb);
  }
}

function respond(data, callback) {
  const json = JSON.stringify({ ok: true, data });
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

// ---- 驗證 ----

function validateToken(token) {
  return token === getSettingsObj().appToken;
}

function verifyAdmin(p) {
  return { valid: p.pin === getSettingsObj().adminPin };
}

// ---- 設定 ----

function getDefaultSettings() {
  return {
    appToken: 'family2024',
    adminPin: '1234',
    homeFee: 5000,
    baseCareFeeBefore: 1000,
    baseCareFeeAfter: 2000,
    careDeadlineYearMonth: '2026/12',
    systemStartYearMonth: '2014/01',
    paymentDueDay: 10,
    adminEmail: '',
    notifyEmails: ''
  };
}

function getSettingsObj() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.SETTINGS);
  if (!sheet) return getDefaultSettings();
  const data = sheet.getDataRange().getValues();
  const obj = {};
  data.forEach(row => { if (row[0]) obj[String(row[0])] = row[1]; });
  return Object.assign(getDefaultSettings(), obj);
}

function getSettings() {
  const s = getSettingsObj();
  return {
    homeFee: Number(s.homeFee),
    baseCareFeeBefore: Number(s.baseCareFeeBefore),
    baseCareFeeAfter: Number(s.baseCareFeeAfter),
    careDeadlineYearMonth: s.careDeadlineYearMonth,
    systemStartYearMonth: s.systemStartYearMonth,
    paymentDueDay: Number(s.paymentDueDay),
    adminEmail: s.adminEmail,
    notifyEmails: s.notifyEmails
  };
}

function updateSettings(p) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEETS.SETTINGS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.SETTINGS);
    sheet.appendRow(['key', 'value']);
  }
  const allowed = [
    'homeFee', 'baseCareFeeBefore', 'baseCareFeeAfter',
    'careDeadlineYearMonth', 'systemStartYearMonth', 'paymentDueDay',
    'adminEmail', 'notifyEmails', 'adminPin', 'appToken'
  ];
  const data = sheet.getDataRange().getValues();
  allowed.forEach(key => {
    if (p[key] === undefined) return;
    let found = false;
    for (let i = 0; i < data.length; i++) {
      if (data[i][0] === key) {
        sheet.getRange(i + 1, 2).setValue(p[key]);
        found = true; break;
      }
    }
    if (!found) sheet.appendRow([key, p[key]]);
  });
  return { success: true };
}

// ---- 成員 ----
// 欄位：id | name | nickname | status | notes | memberStartYearMonth | obligationEndYearMonth | createdAt

function getMembers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.MEMBERS);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  return data.slice(1)
    .map(row => ({
      id: String(row[0]),
      name: String(row[1]),
      nickname: String(row[2] || ''),
      status: String(row[3] || 'active'),
      notes: String(row[4] || ''),
      memberStartYearMonth: String(row[5] || ''),
      obligationEndYearMonth: String(row[6] || ''),
      createdAt: String(row[7] || '')
    }))
    .filter(m => m.id);
}

function getMemberById(id) {
  return getMembers().find(m => m.id === String(id));
}

function addMember(p) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEETS.MEMBERS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.MEMBERS);
    sheet.appendRow(['id', 'name', 'nickname', 'status', 'notes', 'memberStartYearMonth', 'obligationEndYearMonth', 'createdAt']);
    sheet.setFrozenRows(1);
  }
  const id = 'M' + Date.now();
  sheet.appendRow([
    id, p.name, p.nickname || '', p.status || 'active', p.notes || '',
    p.memberStartYearMonth || '', p.obligationEndYearMonth || '',
    new Date().toISOString()
  ]);
  return { id };
}

function updateMember(p) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.MEMBERS);
  if (!sheet) return { error: '找不到成員資料' };
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(p.id)) {
      if (p.name !== undefined)                  sheet.getRange(i+1, 2).setValue(p.name);
      if (p.nickname !== undefined)              sheet.getRange(i+1, 3).setValue(p.nickname);
      if (p.status !== undefined)                sheet.getRange(i+1, 4).setValue(p.status);
      if (p.notes !== undefined)                 sheet.getRange(i+1, 5).setValue(p.notes);
      if (p.memberStartYearMonth !== undefined)  sheet.getRange(i+1, 6).setValue(p.memberStartYearMonth);
      if (p.obligationEndYearMonth !== undefined) sheet.getRange(i+1, 7).setValue(p.obligationEndYearMonth);
      return { success: true };
    }
  }
  return { error: '找不到成員' };
}

// ---- 費用計算（每人個別）----

/**
 * 費用規則：
 * - 義務期間內 (memberStart ~ obligationEnd)：只收家用費 (homeFee)
 * - 義務期滿後：家用費 + 照顧費 (careDeadline 前 baseCareFeeBefore，之後 baseCareFeeAfter)
 * - 義務開始前：0 元
 */
function getMemberMonthlyFee(member, yearMonth, settings) {
  const memberStart = member.memberStartYearMonth;
  if (memberStart && yearMonth < memberStart) return 0;

  const obligationEnd = member.obligationEndYearMonth;
  if (!obligationEnd || yearMonth <= obligationEnd) {
    return Number(settings.homeFee || 5000);
  }

  // 義務期滿後：加照顧費
  const deadline = String(settings.careDeadlineYearMonth || '2026/12');
  const careFee = yearMonth <= deadline
    ? Number(settings.baseCareFeeBefore || 1000)
    : Number(settings.baseCareFeeAfter || 2000);
  return Number(settings.homeFee || 5000) + careFee;
}

// ---- 繳費 ----

function fmtDate(val) {
  if (val instanceof Date) return Utilities.formatDate(val, 'Asia/Taipei', 'yyyy/MM/dd');
  return String(val || '');
}

function getPayments(p) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.PAYMENTS);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  let list = data.slice(1)
    .map(row => ({
      id: String(row[0]),
      memberId: String(row[1]),
      date: fmtDate(row[2]),
      amount: Number(row[3]),
      note: String(row[4] || ''),
      createdAt: String(row[5] || '')
    }))
    .filter(r => r.id);
  if (p.memberId) list = list.filter(r => r.memberId === p.memberId);
  if (p.year)      list = list.filter(r => r.date.startsWith(p.year));
  if (p.yearMonth) list = list.filter(r => r.date.startsWith(p.yearMonth));
  return list.sort((a, b) => b.date.localeCompare(a.date));
}

function addPayment(p) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEETS.PAYMENTS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.PAYMENTS);
    sheet.appendRow(['id', 'memberId', 'date', 'amount', 'note', 'createdAt']);
    sheet.setFrozenRows(1);
  }
  const id = 'P' + Date.now();
  const row = sheet.getLastRow() + 1;
  sheet.appendRow([id, p.memberId, p.date, Number(p.amount), p.note || '', new Date().toISOString()]);
  sheet.getRange(row, 3).setNumberFormat('@');
  return { id };
}

function deletePayment(p) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.PAYMENTS);
  if (!sheet) return { error: '找不到資料' };
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(p.id)) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { error: '找不到紀錄' };
}

// ---- 支出 ----

function getExpenses(p) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.EXPENSES);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  let list = data.slice(1)
    .map(row => ({
      id: String(row[0]),
      date: fmtDate(row[1]),
      category: String(row[2] || ''),
      amount: Number(row[3]),
      note: String(row[4] || ''),
      createdAt: String(row[5] || '')
    }))
    .filter(r => r.id);
  if (p.year)      list = list.filter(r => r.date.startsWith(p.year));
  if (p.yearMonth) list = list.filter(r => r.date.startsWith(p.yearMonth));
  return list.sort((a, b) => b.date.localeCompare(a.date));
}

function addExpense(p) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEETS.EXPENSES);
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.EXPENSES);
    sheet.appendRow(['id', 'date', 'category', 'amount', 'note', 'createdAt']);
    sheet.setFrozenRows(1);
  }
  const id = 'E' + Date.now();
  const row = sheet.getLastRow() + 1;
  sheet.appendRow([id, p.date, p.category, Number(p.amount), p.note || '', new Date().toISOString()]);
  sheet.getRange(row, 2).setNumberFormat('@');
  return { id };
}

function deleteExpense(p) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEETS.EXPENSES);
  if (!sheet) return { error: '找不到資料' };
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(p.id)) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { error: '找不到紀錄' };
}

// ---- 繳費狀況計算 ----

function addMonth(yearMonth, n) {
  n = n || 1;
  const parts = yearMonth.split('/');
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1 + n, 1);
  return d.getFullYear() + '/' + String(d.getMonth() + 1).padStart(2, '0');
}

function getCurrentYearMonth() {
  const now = new Date();
  return now.getFullYear() + '/' + String(now.getMonth() + 1).padStart(2, '0');
}

function getMemberStatus(p) {
  const settings = getSettingsObj();
  const member = getMemberById(p.memberId);
  if (!member) return { error: '找不到成員' };

  const payments = getPayments({ memberId: p.memberId });
  const totalPaid = payments.reduce((sum, pay) => sum + pay.amount, 0);

  const startYM = member.memberStartYearMonth || String(settings.systemStartYearMonth || '2026/01');
  const currentYM = getCurrentYearMonth();
  const maxYM = addMonth(currentYM, 24);

  const paidMonths = [];
  const prepaidMonths = [];
  const debtMonths = [];
  let remaining = totalPaid;
  let ym = startYM;

  while (ym <= maxYM) {
    const fee = getMemberMonthlyFee(member, ym, settings);
    if (fee > 0) {
      if (remaining >= fee) {
        remaining -= fee;
        if (ym <= currentYM) paidMonths.push(ym);
        else prepaidMonths.push(ym);
      } else {
        if (ym <= currentYM) {
          debtMonths.push({ yearMonth: ym, fee, owed: fee - remaining, partialPaid: remaining });
          remaining = 0;
        }
      }
    }
    ym = addMonth(ym, 1);
    if (ym > maxYM) break;
  }

  return {
    totalPaid,
    paidMonths,
    prepaidMonths,
    debtMonths,
    remainingBalance: remaining > 0 ? remaining : 0,
    prepaidCount: prepaidMonths.length,
    obligationEndYearMonth: member.obligationEndYearMonth,
    memberStartYearMonth: member.memberStartYearMonth
  };
}

function getAllDebt() {
  const members = getMembers().filter(m => m.status === 'active');
  return members.map(member => {
    const status = getMemberStatus({ memberId: member.id });
    return { member, ...status };
  });
}

// ---- Dashboard ----

function getDashboard(p) {
  const yearMonth = p.yearMonth || getCurrentYearMonth();
  const settings = getSettingsObj();
  const members = getMembers().filter(m => m.status === 'active');

  const monthPayments = getPayments({ yearMonth });
  const monthIncome = monthPayments.reduce((s, r) => s + r.amount, 0);

  const monthExpenses = getExpenses({ yearMonth });
  const monthExpenseTotal = monthExpenses.reduce((s, r) => s + r.amount, 0);

  const expectedIncome = members.reduce((s, m) => s + getMemberMonthlyFee(m, yearMonth, settings), 0);

  const allDebts = getAllDebt();
  const debtors = allDebts.filter(d => d.debtMonths && d.debtMonths.length > 0);
  const totalDebt = debtors.reduce((s, d) =>
    s + d.debtMonths.reduce((ss, dm) => ss + dm.owed, 0), 0);

  const allPayments = getPayments({});
  const allExpenses = getExpenses({});
  const totalAllIncome = allPayments.reduce((s, r) => s + r.amount, 0);
  const totalAllExpenses = allExpenses.reduce((s, r) => s + r.amount, 0);

  return {
    yearMonth,
    memberCount: members.length,
    monthIncome,
    expectedIncome,
    monthUncollected: Math.max(0, expectedIncome - monthIncome),
    monthExpenseTotal,
    monthBalance: monthIncome - monthExpenseTotal,
    familyFund: totalAllIncome - totalAllExpenses,
    debtorCount: debtors.length,
    totalDebt
  };
}

// ---- 年度分析 ----

function getAnnualSummary(p) {
  const year = p.year || String(new Date().getFullYear());
  const months = [];
  for (let m = 1; m <= 12; m++) {
    const ym = year + '/' + String(m).padStart(2, '0');
    const income = getPayments({ yearMonth: ym }).reduce((s, r) => s + r.amount, 0);
    const expense = getExpenses({ yearMonth: ym }).reduce((s, r) => s + r.amount, 0);
    months.push({ yearMonth: ym, income, expense, balance: income - expense });
  }
  const yearExpenses = getExpenses({ year });
  const catBreakdown = {};
  yearExpenses.forEach(e => { catBreakdown[e.category] = (catBreakdown[e.category] || 0) + e.amount; });
  return {
    year,
    months,
    yearIncome: months.reduce((s, m) => s + m.income, 0),
    yearExpense: months.reduce((s, m) => s + m.expense, 0),
    yearBalance: months.reduce((s, m) => s + m.balance, 0),
    categoryBreakdown: catBreakdown
  };
}

// ---- 通知 ----

function sendNotification(p) {
  const settings = getSettingsObj();
  const emails = p.to || settings.notifyEmails || settings.adminEmail;
  if (!emails) return { error: '未設定通知信箱' };
  MailApp.sendEmail({ to: emails, subject: p.subject || '家庭費用系統通知', htmlBody: p.htmlBody || p.body || '' });
  return { success: true };
}

// ---- 每月排程 ----

function monthlyReport() {
  const settings = getSettingsObj();
  const dash = getDashboard({});
  const allDebts = getAllDebt();
  const debtors = allDebts.filter(d => d.debtMonths && d.debtMonths.length > 0);
  const ym = getCurrentYearMonth();

  let html = `<h2 style="color:#1e3a5f">家庭費用月報 ${ym}</h2>`;
  html += `<table border="1" cellpadding="6" style="border-collapse:collapse">`;
  html += `<tr><td>家庭基金餘額</td><td><b>NT$ ${dash.familyFund.toLocaleString()}</b></td></tr>`;
  html += `<tr><td>本月收入</td><td style="color:green">NT$ ${dash.monthIncome.toLocaleString()}</td></tr>`;
  html += `<tr><td>本月支出</td><td style="color:red">NT$ ${dash.monthExpenseTotal.toLocaleString()}</td></tr>`;
  html += `<tr><td>本月結餘</td><td>NT$ ${dash.monthBalance.toLocaleString()}</td></tr>`;
  html += `</table>`;
  if (debtors.length > 0) {
    html += `<h3 style="color:#c0392b">欠費人員</h3><ul>`;
    debtors.forEach(d => {
      const total = d.debtMonths.reduce((s, m) => s + m.owed, 0);
      html += `<li>${d.member.name}：${d.debtMonths.length} 個月，NT$ ${total.toLocaleString()}</li>`;
    });
    html += `</ul>`;
  } else {
    html += `<p style="color:green">✓ 本月無欠費</p>`;
  }
  const emails = settings.notifyEmails || settings.adminEmail;
  if (emails) {
    MailApp.sendEmail({ to: emails, subject: `家庭費用月報 ${ym}`, htmlBody: html });
  }
}

function setupMonthlyTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('monthlyReport').timeBased().onMonthDay(1).atHour(8).create();
  Logger.log('每月 1 日 08:00 排程已建立');
}

// ---- 初始化 ----

function initSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  function ensureSheet(name, headers) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) { sheet = ss.insertSheet(name); sheet.appendRow(headers); sheet.setFrozenRows(1); }
    return sheet;
  }
  ensureSheet(SHEETS.SETTINGS, ['key', 'value']);
  ensureSheet(SHEETS.MEMBERS, ['id', 'name', 'nickname', 'status', 'notes', 'memberStartYearMonth', 'obligationEndYearMonth', 'createdAt']);
  ensureSheet(SHEETS.PAYMENTS, ['id', 'memberId', 'date', 'amount', 'note', 'createdAt']);
  ensureSheet(SHEETS.EXPENSES, ['id', 'date', 'category', 'amount', 'note', 'createdAt']);
  const settingsSheet = ss.getSheetByName(SHEETS.SETTINGS);
  const existing = settingsSheet.getDataRange().getValues().map(r => r[0]);
  Object.entries(getDefaultSettings()).forEach(([k, v]) => {
    if (!existing.includes(k)) settingsSheet.appendRow([k, v]);
  });
  Logger.log('試算表初始化完成');
}

// ============================================
// ★ 一鍵匯入初始資料（執行一次即可）
// ============================================
function importInitialData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. 重建 Members sheet
  let membersSheet = ss.getSheetByName(SHEETS.MEMBERS);
  if (membersSheet) ss.deleteSheet(membersSheet);
  membersSheet = ss.insertSheet(SHEETS.MEMBERS);
  membersSheet.appendRow(['id', 'name', 'nickname', 'status', 'notes', 'memberStartYearMonth', 'obligationEndYearMonth', 'createdAt']);
  membersSheet.setFrozenRows(1);

  const members = [
    // id, name, nickname, status, notes, startYM, endYM
    ['M001', '宜庭', '', 'active', '', '2014/01', '2026/12'],
    ['M002', '宜靜', '', 'active', '', '2014/01', '2026/12'],
    ['M003', '宜潔', '', 'active', '', '2016/06', '2029/05'],
    ['M004', '亞軒', '', 'active', '管理者', '2025/06', '2038/05']
  ];
  members.forEach(m => membersSheet.appendRow([...m, new Date().toISOString()]));

  // 2. 重建 Payments sheet 並匯入歷史繳費
  let paymentsSheet = ss.getSheetByName(SHEETS.PAYMENTS);
  if (paymentsSheet) ss.deleteSheet(paymentsSheet);
  paymentsSheet = ss.insertSheet(SHEETS.PAYMENTS);
  paymentsSheet.appendRow(['id', 'memberId', 'date', 'amount', 'note', 'createdAt']);
  paymentsSheet.setFrozenRows(1);

  // 計算說明：
  // 宜庭 / 宜靜：2014/01 ~ 2026/05 = 149個月 × 5,000 = 745,000
  // 宜潔：       2016/06 ~ 2026/05 = 120個月 × 5,000 = 600,000
  // 亞軒：       2025/06 ~ 2026/05 =  12個月 × 5,000 =  60,000
  const payments = [
    ['HP001', 'M001', '2026/05/31', 745000, '歷史繳費匯入 (2014/01~2026/05 共149個月)'],
    ['HP002', 'M002', '2026/05/31', 745000, '歷史繳費匯入 (2014/01~2026/05 共149個月)'],
    ['HP003', 'M003', '2026/05/31', 600000, '歷史繳費匯入 (2016/06~2026/05 共120個月)'],
    ['HP004', 'M004', '2026/05/31',  60000, '歷史繳費匯入 (2025/06~2026/05 共12個月)']
  ];
  payments.forEach(p => paymentsSheet.appendRow([...p, new Date().toISOString()]));
  // 將日期欄設為文字格式避免自動轉換
  payments.forEach((_, i) => paymentsSheet.getRange(i + 2, 3).setNumberFormat('@'));

  // 3. 更新設定
  const settingsList = [
    ['homeFee', 5000],
    ['baseCareFeeBefore', 1000],
    ['baseCareFeeAfter', 2000],
    ['careDeadlineYearMonth', '2026/12'],
    ['systemStartYearMonth', '2014/01'],
    ['paymentDueDay', 10]
  ];
  let settingsSheet = ss.getSheetByName(SHEETS.SETTINGS);
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet(SHEETS.SETTINGS);
    settingsSheet.appendRow(['key', 'value']);
    settingsSheet.setFrozenRows(1);
  }
  const existingKeys = settingsSheet.getDataRange().getValues();
  settingsList.forEach(([key, val]) => {
    let found = false;
    for (let i = 0; i < existingKeys.length; i++) {
      if (existingKeys[i][0] === key) { settingsSheet.getRange(i + 1, 2).setValue(val); found = true; break; }
    }
    if (!found) settingsSheet.appendRow([key, val]);
  });

  // 4. 確保其他工作表存在
  if (!ss.getSheetByName(SHEETS.EXPENSES)) {
    const es = ss.insertSheet(SHEETS.EXPENSES);
    es.appendRow(['id', 'date', 'category', 'amount', 'note', 'createdAt']);
    es.setFrozenRows(1);
  }

  // 執行結果摘要
  Logger.log('========== 資料匯入完成 ==========');
  Logger.log('成員    開始年月  義務結束  已繳金額  未繳金額');
  Logger.log('宜庭    2014/01  2026/12  745,000   35,000 (7個月)');
  Logger.log('宜靜    2014/01  2026/12  745,000   35,000 (7個月)');
  Logger.log('宜潔    2016/06  2029/05  600,000  180,000 (36個月)');
  Logger.log('亞軒    2025/06  2038/05   60,000  720,000 (144個月)');
  Logger.log('==================================');
  Logger.log('每月費用（義務期）：5,000 元');
  Logger.log('義務期滿後加照顧費：1,000（2026/12前）/ 2,000（2026/12後）');
}
