import { Transaction, Account, Category, BudgetLimit, BankCard, FinanceData } from './types';

export interface FullSyncResult {
  mergedData: FinanceData;
  addedToSheet: Record<string, number>;
  addedToLocal: Record<string, number>;
  updatedOnSheet: Record<string, number>;
  updatedOnLocal: Record<string, number>;
  deletedFromSheet: Record<string, number>;
  deletedFromLocal: Record<string, number>;
  spreadsheetId: string;
  spreadsheetUrl: string;
}

export interface DeletedIds {
  transactions: string[];
  accounts: string[];
  categories: string[];
  cards: string[];
  budgets: string[]; // categoryId of deleted budget limits
}

/**
 * Searches for or creates a specialized MilliFinance spreadsheet inside Google Drive,
 * ensuring all required tables are setup.
 */
export async function findOrCreateSyncSpreadsheet(accessToken: string): Promise<{ id: string; url: string }> {
  // 1. Search for existing spreadsheet on Google Drive
  const query = encodeURIComponent("name = 'MilliFinance Sync DB' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false");
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)`;
  
  const searchResponse = await fetch(searchUrl, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  
  if (!searchResponse.ok) {
    const err = await searchResponse.json();
    throw new Error(err.error?.message || 'Ошибка поиска файла на Google Диске.');
  }
  
  const searchResult = await searchResponse.json();
  let spreadsheetId = '';
  let url = '';
  
  if (searchResult.files && searchResult.files.length > 0) {
    const file = searchResult.files[0];
    spreadsheetId = file.id;
    url = file.webViewLink || `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
  } else {
    // Create new spreadsheet if not found with all required sheets
    const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          title: 'MilliFinance Sync DB'
        },
        sheets: [
          { properties: { title: 'Transactions' } },
          { properties: { title: 'Accounts' } },
          { properties: { title: 'Categories' } },
          { properties: { title: 'Cards' } },
          { properties: { title: 'Budgets' } }
        ]
      })
    });
    
    if (!createResponse.ok) {
      const err = await createResponse.json();
      throw new Error(err.error?.message || 'Не удалось создать Google Таблицу на Google Диске.');
    }
    
    const spreadsheetData = await createResponse.json();
    spreadsheetId = spreadsheetData.spreadsheetId;
    url = spreadsheetData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
  }

  // 3. Ensure all sheets exist inside the spreadsheet (if some were manually modified / deleted, or if migrating old spreadsheet)
  const metaResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  
  if (metaResponse.ok) {
    const metaData = await metaResponse.json();
    const existingTitles = new Set(metaData.sheets?.map((s: any) => s.properties?.title) || []);
    
    const requiredSheets = ['Transactions', 'Accounts', 'Categories', 'Cards', 'Budgets'];
    const missingSheets = requiredSheets.filter(title => !existingTitles.has(title));
    
    if (missingSheets.length > 0) {
      const requests = missingSheets.map(title => ({
        addSheet: {
          properties: { title }
        }
      }));
      
      const updateResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requests })
      });
      if (!updateResponse.ok) {
        console.error('Failed to add missing sheets:', await updateResponse.json());
      }
    }
  }
  
  return { id: spreadsheetId, url };
}

// Map transaction to array row and vice-versa
export function transactionToRow(tx: Transaction): any[] {
  return [
    tx.id || '',
    tx.date || '',
    tx.amount || 0,
    tx.type || 'expense',
    tx.categoryId || '',
    tx.accountId || '',
    tx.description || '',
    tx.cardId || '',
    tx.transferAccountId || '',
    tx.transferType || '',
    tx.updatedAt || Date.now()
  ];
}

export function rowToTransaction(row: any[]): Transaction {
  return {
    id: String(row[0] || ''),
    date: String(row[1] || ''),
    amount: Number(row[2] || 0),
    type: String(row[3] || 'expense') as any,
    categoryId: String(row[4] || ''),
    accountId: String(row[5] || ''),
    description: String(row[6] || ''),
    cardId: row[7] ? String(row[7]) : undefined,
    transferAccountId: row[8] ? String(row[8]) : undefined,
    transferType: row[9] ? String(row[9]) as any : undefined,
    updatedAt: row[10] ? Number(row[10]) : undefined
  };
}

// Map Account
export function accountToRow(acc: Account): any[] {
  return [
    acc.id || '',
    acc.name || '',
    acc.type || '',
    acc.balance || 0,
    acc.color || '',
    acc.quickEntry !== false ? 'TRUE' : 'FALSE',
    acc.updatedAt || Date.now()
  ];
}

export function rowToAccount(row: any[]): Account {
  return {
    id: String(row[0] || ''),
    name: String(row[1] || ''),
    type: String(row[2] || ''),
    balance: Number(row[3] || 0),
    color: String(row[4] || ''),
    quickEntry: String(row[5]).toUpperCase() === 'TRUE',
    updatedAt: row[6] ? Number(row[6]) : undefined
  };
}

// Map Category
export function categoryToRow(cat: Category): any[] {
  return [
    cat.id || '',
    cat.name || '',
    cat.icon || '',
    cat.color || '',
    cat.type || 'expense',
    cat.quickEntry !== false ? 'TRUE' : 'FALSE',
    cat.updatedAt || Date.now()
  ];
}

export function rowToCategory(row: any[]): Category {
  return {
    id: String(row[0] || ''),
    name: String(row[1] || ''),
    icon: String(row[2] || ''),
    color: String(row[3] || ''),
    type: String(row[4] || 'expense') as any,
    quickEntry: String(row[5]).toUpperCase() === 'TRUE',
    updatedAt: row[6] ? Number(row[6]) : undefined
  };
}

// Map Card
export function cardToRow(card: BankCard): any[] {
  return [
    card.id || '',
    card.name || '',
    card.bank || '',
    card.lastFour || '',
    card.updatedAt || Date.now()
  ];
}

export function rowToCard(row: any[]): BankCard {
  return {
    id: String(row[0] || ''),
    name: String(row[1] || ''),
    bank: String(row[2] || ''),
    lastFour: String(row[3] || ''),
    updatedAt: row[4] ? Number(row[4]) : undefined
  };
}

// Map Budget
export function budgetToRow(b: BudgetLimit): any[] {
  return [
    b.categoryId || '',
    b.limitAmount || 0,
    b.updatedAt || Date.now()
  ];
}

export function rowToBudget(row: any[]): BudgetLimit {
  return {
    categoryId: String(row[0] || ''),
    limitAmount: Number(row[1] || 0),
    updatedAt: row[2] ? Number(row[2]) : undefined
  };
}

/**
 * Symmetrically merges lists based on target fields and timestamps
 */
function mergeEntityList<T extends { updatedAt?: number }>(
  localList: T[],
  remoteList: T[],
  localDeletedIdsSet: Set<string>,
  keyGetter: (item: T) => string,
  isContentEqual: (local: T, remote: T) => boolean
): {
  merged: T[];
  addedToSheet: number;
  addedToLocal: number;
  updatedOnSheet: number;
  updatedOnLocal: number;
  deletedFromSheet: number;
  deletedFromLocal: number;
} {
  const mergedMap = new Map<string, T>();
  const remoteMap = new Map<string, T>(remoteList.map(item => [keyGetter(item), item]));
  const localMap = new Map<string, T>(localList.map(item => [keyGetter(item), item]));

  let addedToSheet = 0;
  let addedToLocal = 0;
  let updatedOnSheet = 0;
  let updatedOnLocal = 0;
  let deletedFromSheet = 0;
  let deletedFromLocal = 0;

  // Process local items
  for (const localItem of localList) {
    const key = keyGetter(localItem);
    const remoteItem = remoteMap.get(key);

    if (remoteItem) {
      const localTime = localItem.updatedAt || 0;
      const remoteTime = remoteItem.updatedAt || 0;

      if (localTime > remoteTime) {
        mergedMap.set(key, { ...localItem, updatedAt: localTime || Date.now() });
        updatedOnSheet++;
      } else if (remoteTime > localTime) {
        mergedMap.set(key, { ...remoteItem, updatedAt: remoteTime });
        updatedOnLocal++;
      } else {
        if (!isContentEqual(localItem, remoteItem)) {
          mergedMap.set(key, { ...localItem, updatedAt: Date.now() });
          updatedOnSheet++;
        } else {
          mergedMap.set(key, localItem);
        }
      }
    } else {
      // Exists locally but not in remote. Check if deleted locally
      if (localDeletedIdsSet.has(key)) {
        continue;
      }
      mergedMap.set(key, { ...localItem, updatedAt: localItem.updatedAt || Date.now() });
      addedToSheet++;
    }
  }

  // Process remote items
  for (const remoteItem of remoteList) {
    const key = keyGetter(remoteItem);
    if (localDeletedIdsSet.has(key)) {
      deletedFromSheet++;
      continue;
    }
    if (!localMap.has(key)) {
      mergedMap.set(key, remoteItem);
      addedToLocal++;
    }
  }

  const merged = Array.from(mergedMap.values());
  return {
    merged,
    addedToSheet,
    addedToLocal,
    updatedOnSheet,
    updatedOnLocal,
    deletedFromSheet,
    deletedFromLocal
  };
}

/**
 * Executes a state-synchronized Two-way Delta Sync for all FinanceData sheets
 */
export async function syncWithGoogleSheets(
  accessToken: string,
  localData: FinanceData,
  deletedIds: DeletedIds
): Promise<FullSyncResult> {
  // 1. Get or create spreadsheet
  const { id: spreadsheetId, url: spreadsheetUrl } = await findOrCreateSyncSpreadsheet(accessToken);
  
  // 2. Read values from spreadsheet via batchGet to make it fast
  const ranges = [
    'Transactions!A:K',
    'Accounts!A:G',
    'Categories!A:G',
    'Cards!A:E',
    'Budgets!A:C'
  ];
  const rangesParams = ranges.map(r => `ranges=${encodeURIComponent(r)}`).join('&');
  const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${rangesParams}`;
  
  const readResponse = await fetch(readUrl, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  
  if (!readResponse.ok) {
    const err = await readResponse.json();
    throw new Error(err.error?.message || 'Не удалось прочитать данные из Google Таблицы.');
  }
  
  const readData = await readResponse.json();
  const valueRanges = readData.valueRanges || [];
  
  // Extract and parse sheets
  const txRows = valueRanges[0]?.values || [];
  const accRows = valueRanges[1]?.values || [];
  const catRows = valueRanges[2]?.values || [];
  const cardRows = valueRanges[3]?.values || [];
  const budgetRows = valueRanges[4]?.values || [];

  const remoteTransactions: Transaction[] = txRows.slice(1).map((r: any[]) => rowToTransaction(r)).filter((t: Transaction) => t.id);
  const remoteAccounts: Account[] = accRows.slice(1).map((r: any[]) => rowToAccount(r)).filter((a: Account) => a.id);
  const remoteCategories: Category[] = catRows.slice(1).map((r: any[]) => rowToCategory(r)).filter((c: Category) => c.id);
  const remoteCards: BankCard[] = cardRows.slice(1).map((r: any[]) => rowToCard(r)).filter((c: BankCard) => c.id);
  const remoteBudgets: BudgetLimit[] = budgetRows.slice(1).map((r: any[]) => rowToBudget(r)).filter((b: BudgetLimit) => b.categoryId);

  // Initialize stats tracking
  const addedToSheet: Record<string, number> = {};
  const addedToLocal: Record<string, number> = {};
  const updatedOnSheet: Record<string, number> = {};
  const updatedOnLocal: Record<string, number> = {};
  const deletedFromSheet: Record<string, number> = {};
  const deletedFromLocal: Record<string, number> = {};

  // Sync Transactions
  const txSync = mergeEntityList(
    localData.transactions || [],
    remoteTransactions,
    new Set(deletedIds.transactions),
    t => t.id,
    (l, r) => 
      l.amount === r.amount &&
      l.date === r.date &&
      l.description === r.description &&
      l.accountId === r.accountId &&
      l.categoryId === r.categoryId &&
      l.cardId === r.cardId &&
      l.transferAccountId === r.transferAccountId &&
      l.transferType === r.transferType
  );
  txSync.merged.sort((a, b) => {
    const dateComp = b.date.localeCompare(a.date);
    if (dateComp !== 0) return dateComp;
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  });
  addedToSheet.transactions = txSync.addedToSheet;
  addedToLocal.transactions = txSync.addedToLocal;
  updatedOnSheet.transactions = txSync.updatedOnSheet;
  updatedOnLocal.transactions = txSync.updatedOnLocal;
  deletedFromSheet.transactions = txSync.deletedFromSheet;
  deletedFromLocal.transactions = txSync.deletedFromLocal;

  // Sync Accounts
  const accSync = mergeEntityList(
    localData.accounts || [],
    remoteAccounts,
    new Set(deletedIds.accounts),
    a => a.id,
    (l, r) => 
      l.name === r.name &&
      l.type === r.type &&
      l.balance === r.balance &&
      l.color === r.color &&
      (l.quickEntry !== false) === (r.quickEntry !== false)
  );
  addedToSheet.accounts = accSync.addedToSheet;
  addedToLocal.accounts = accSync.addedToLocal;
  updatedOnSheet.accounts = accSync.updatedOnSheet;
  updatedOnLocal.accounts = accSync.updatedOnLocal;
  deletedFromSheet.accounts = accSync.deletedFromSheet;
  deletedFromLocal.accounts = accSync.deletedFromLocal;

  // Sync Categories
  const catSync = mergeEntityList(
    localData.categories || [],
    remoteCategories,
    new Set(deletedIds.categories),
    c => c.id,
    (l, r) => 
      l.name === r.name &&
      l.icon === r.icon &&
      l.color === r.color &&
      l.type === r.type &&
      (l.quickEntry !== false) === (r.quickEntry !== false)
  );
  addedToSheet.categories = catSync.addedToSheet;
  addedToLocal.categories = catSync.addedToLocal;
  updatedOnSheet.categories = catSync.updatedOnSheet;
  updatedOnLocal.categories = catSync.updatedOnLocal;
  deletedFromSheet.categories = catSync.deletedFromSheet;
  deletedFromLocal.categories = catSync.deletedFromLocal;

  // Sync Bank Cards
  const cardSync = mergeEntityList(
    localData.cards || [],
    remoteCards,
    new Set(deletedIds.cards),
    c => c.id,
    (l, r) => 
      l.name === r.name &&
      l.bank === r.bank &&
      l.lastFour === r.lastFour
  );
  addedToSheet.cards = cardSync.addedToSheet;
  addedToLocal.cards = cardSync.addedToLocal;
  updatedOnSheet.cards = cardSync.updatedOnSheet;
  updatedOnLocal.cards = cardSync.updatedOnLocal;
  deletedFromSheet.cards = cardSync.deletedFromSheet;
  deletedFromLocal.cards = cardSync.deletedFromLocal;

  // Sync Budgets Symmetrically
  const budgetSync = mergeEntityList(
    localData.budgets || [],
    remoteBudgets,
    new Set(deletedIds.budgets),
    b => b.categoryId,
    (l, r) => l.limitAmount === r.limitAmount
  );
  addedToSheet.budgets = budgetSync.addedToSheet;
  addedToLocal.budgets = budgetSync.addedToLocal;
  updatedOnSheet.budgets = budgetSync.updatedOnSheet;
  updatedOnLocal.budgets = budgetSync.updatedOnLocal;
  deletedFromSheet.budgets = budgetSync.deletedFromSheet;
  deletedFromLocal.budgets = budgetSync.deletedFromLocal;

  // 4. Clear sheets via batchClear
  const clearResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ranges: [
        'Transactions!A2:K100000',
        'Accounts!A2:G10000',
        'Categories!A2:G10000',
        'Cards!A2:E10000',
        'Budgets!A2:C10000'
      ]
    })
  });
  if (!clearResponse.ok) {
    console.error('Batch clear failed:', await clearResponse.json());
  }

  // 5. Write merged records back using batchUpdate values
  const payloadData = [
    {
      range: `Transactions!A1:K${txSync.merged.length + 1}`,
      values: [
        ["id", "date", "amount", "type", "categoryId", "accountId", "description", "cardId", "transferAccountId", "transferType", "updatedAt"],
        ...txSync.merged.map(t => transactionToRow(t))
      ]
    },
    {
      range: `Accounts!A1:G${accSync.merged.length + 1}`,
      values: [
        ["id", "name", "type", "balance", "color", "quickEntry", "updatedAt"],
        ...accSync.merged.map(a => accountToRow(a))
      ]
    },
    {
      range: `Categories!A1:G${catSync.merged.length + 1}`,
      values: [
        ["id", "name", "icon", "color", "type", "quickEntry", "updatedAt"],
        ...catSync.merged.map(c => categoryToRow(c))
      ]
    },
    {
      range: `Cards!A1:E${cardSync.merged.length + 1}`,
      values: [
        ["id", "name", "bank", "lastFour", "updatedAt"],
        ...cardSync.merged.map(c => cardToRow(c))
      ]
    },
    {
      range: `Budgets!A1:C${budgetSync.merged.length + 1}`,
      values: [
        ["categoryId", "limitAmount", "updatedAt"],
        ...budgetSync.merged.map(b => budgetToRow(b))
      ]
    }
  ];

  const writeResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: payloadData
    })
  });

  if (!writeResponse.ok) {
    const err = await writeResponse.json();
    throw new Error(err.error?.message || 'Не удалось записать объединенные данные обратно в Google Таблицу.');
  }

  return {
    mergedData: {
      transactions: txSync.merged,
      accounts: accSync.merged,
      categories: catSync.merged,
      cards: cardSync.merged,
      budgets: budgetSync.merged
    },
    addedToSheet,
    addedToLocal,
    updatedOnSheet,
    updatedOnLocal,
    deletedFromSheet,
    deletedFromLocal,
    spreadsheetId,
    spreadsheetUrl
  };
}
