import { Transaction, Category, Account } from './types';

/**
 * Exports financial report to a newly provisioned Google Sheets document on the user's Drive.
 */
export async function exportToGoogleSheets(
  accessToken: string,
  timeframeLabel: string,
  transactions: Transaction[],
  categories: Category[],
  accounts: Account[]
): Promise<string> {
  
  // 1. Create Spreadsheet with Title
  const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title: `MilliFinance - Финансовый отчёт (${timeframeLabel})`
      }
    })
  });

  if (!createResponse.ok) {
    const err = await createResponse.json();
    throw new Error(err.error?.message || 'Не удалось создать Google Таблицу.');
  }

  const spreadsheetData = await createResponse.json();
  const spreadsheetId = spreadsheetData.spreadsheetId;
  const spreadsheetUrl = spreadsheetData.spreadsheetUrl;
  const firstSheetTitle = spreadsheetData.sheets?.[0]?.properties?.title || 'Sheet1';

  // 2. Prepare spreadsheet items
  const summaryRows: any[][] = [
    ["MilliFinance 🇦🇿 — Домашняя бухгалтерия", "", "", "", "", "", ""],
    ["Период выгрузки отчета:", timeframeLabel, "", "", "", "", ""],
    ["Дата создания выгрузки:", new Date().toLocaleString(), "", "", "", "", ""],
    [],
    ["СВОДНЫЕ ПОКАЗАТЕЛИ БАЛАНСА", "", "", "", "", "", ""],
    []
  ];

  // Calculations
  const totalIncomes = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const savings = totalIncomes - totalExpenses;
  const savingsPct = totalIncomes > 0 ? (savings / totalIncomes) * 100 : 0;

  summaryRows.push(["Всего поступлений (Доходы)", totalIncomes, "AZN", "", "", "", ""]);
  summaryRows.push(["Всего списаний (Расходы)", totalExpenses, "AZN", "", "", "", ""]);
  summaryRows.push(["Сбережения за период", savings, "AZN", `Доля сбережения: ${savingsPct.toFixed(1)}%`, "", "", ""]);
  
  summaryRows.push([], [], ["СТРУКТУРА РАСХОДОВ И ДОХОДОВ ПО КАТЕГОРИЯМ", "", "", "", "", "", ""]);
  summaryRows.push(["Название категории", "Тип статьи", "Потраченная сумма", "Долевой процент", "", "", ""]);

  // Category statistics helper
  categories.forEach(cat => {
    const sum = transactions.filter(t => t.categoryId === cat.id).reduce((s, t) => s + t.amount, 0);
    if (sum > 0) {
      const baseTotal = cat.type === 'expense' ? totalExpenses : totalIncomes;
      const pct = baseTotal > 0 ? (sum / baseTotal) * 100 : 0;
      summaryRows.push([
        cat.name,
        cat.type === 'income' ? 'Доход' : 'Расход',
        sum,
        `${pct.toFixed(1)}%`,
        "", "", ""
      ]);
    }
  });

  summaryRows.push([], [], ["ПОДРОБНЫЙ ЖУРНАЛ КАССОВЫХ ТРАНЗАКЦИЙ", "", "", "", "", "", ""]);
  summaryRows.push(["ID операции", "Дата (ГГГГ-ММ-ДД)", "Категория", "Счет списания", "Тип", "Описание транзакции", "Сумма (AZN)"]);

  transactions.forEach(tx => {
    const catName = categories.find(c => c.id === tx.categoryId)?.name || 'Другое';
    const accName = accounts.find(a => a.id === tx.accountId)?.name || 'Неизвестно';
    summaryRows.push([
      tx.id,
      tx.date,
      catName,
      accName,
      tx.type === 'income' ? 'Доход' : 'Расход',
      tx.description || 'Без описания',
      tx.amount
    ]);
  });

  // Column width styling & Grid format updates
  const encodedSheetTitle = encodeURIComponent(firstSheetTitle);
  const writeResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedSheetTitle}!A1:G${summaryRows.length + 5}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: summaryRows
    })
  });

  if (!writeResponse.ok) {
    const err = await writeResponse.json();
    throw new Error(err.error?.message || 'Не удалось заполнить Google Таблицу значениями.');
  }

  return spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
}
