import { Transaction } from './types';

export interface SyncResult {
  mergedTransactions: Transaction[];
  addedToSheet: number;
  addedToLocal: number;
  updatedOnSheet: number;
  updatedOnLocal: number;
  deletedFromSheet: number;
  deletedFromLocal: number;
  spreadsheetId: string;
  spreadsheetUrl: string;
}

/**
 * Searches for or creates a specialized MilliFinance spreadsheet inside Google Drive.
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
  if (searchResult.files && searchResult.files.length > 0) {
    const file = searchResult.files[0];
    return {
      id: file.id,
      url: file.webViewLink || `https://docs.google.com/spreadsheets/d/${file.id}`
    };
  }
  
  // 2. Create new spreadsheet if not found
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
        {
          properties: {
            title: 'Transactions'
          }
        }
      ]
    })
  });
  
  if (!createResponse.ok) {
    const err = await createResponse.json();
    throw new Error(err.error?.message || 'Не удалось создать Google Таблицу на Google Диске.');
  }
  
  const spreadsheetData = await createResponse.json();
  const id = spreadsheetData.spreadsheetId;
  const url = spreadsheetData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${id}`;
  
  // Write headers to the newly created sheet
  const headers = [
    ["id", "date", "amount", "type", "categoryId", "accountId", "description", "cardId", "transferAccountId", "transferType", "updatedAt"]
  ];
  
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values/Transactions!A1:K1?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ values: headers })
  });
  
  return { id, url };
}

// Map transaction to array row
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

// Map array row to transaction
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

/**
 * Executes a two-way Delta/Incremental Sync between the local app database and the Google Sheets spreadsheet.
 */
export async function syncWithGoogleSheets(
  accessToken: string,
  localTransactions: Transaction[],
  localDeletedIds: string[]
): Promise<SyncResult> {
  // 1. Get or create spreadsheet
  const { id: spreadsheetId, url: spreadsheetUrl } = await findOrCreateSyncSpreadsheet(accessToken);
  
  // 2. Read values from spreadsheet
  const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Transactions!A:K`;
  const readResponse = await fetch(readUrl, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  
  if (!readResponse.ok) {
    const err = await readResponse.json();
    throw new Error(err.error?.message || 'Не удалось прочитать данные из Google Таблицы.');
  }
  
  const readData = await readResponse.json();
  const rows = readData.values || [];
  
  // If the sheet was completely empty (no headers) append header row
  if (rows.length === 0) {
    rows.push(["id", "date", "amount", "type", "categoryId", "accountId", "description", "cardId", "transferAccountId", "transferType", "updatedAt"]);
  }
  
  const headerRow = rows[0];
  const sheetTxRows = rows.slice(1);
  const sheetTxs: Transaction[] = sheetTxRows.map((r: any[]) => rowToTransaction(r)).filter((t: Transaction) => t.id);
  
  // Tracking categories
  let addedToSheet = 0;
  let addedToLocal = 0;
  let updatedOnSheet = 0;
  let updatedOnLocal = 0;
  let deletedFromSheet = 0;
  let deletedFromLocal = 0;
  
  // 3. Perform Sync Algorithm (Two-way Delta Integration)
  const mergedMap = new Map<string, Transaction>();
  
  // Helper sets
  const sheetTxsMap = new Map<string, Transaction>(sheetTxs.map(t => [t.id, t]));
  const localTxsMap = new Map<string, Transaction>(localTransactions.map(t => [t.id, t]));
  const deletedSet = new Set<string>(localDeletedIds);
  
  // Process all local transactions
  for (const localTx of localTransactions) {
    const remoteTx = sheetTxsMap.get(localTx.id);
    
    if (remoteTx) {
      // Exists in both places. Compare updatedAt fields
      const localTime = localTx.updatedAt || 0;
      const remoteTime = remoteTx.updatedAt || 0;
      
      if (localTime > remoteTime) {
        // Local state was modified more recently
        mergedMap.set(localTx.id, { ...localTx, updatedAt: localTime || Date.now() });
        updatedOnSheet++;
      } else if (remoteTime > localTime) {
        // External sheet contains a newer update
        mergedMap.set(localTx.id, { ...remoteTx, updatedAt: remoteTime });
        updatedOnLocal++;
      } else {
        // Timestamps are equal or absent. Fallback to check values
        const isContentEqual = 
          localTx.amount === remoteTx.amount &&
          localTx.date === remoteTx.date &&
          localTx.description === remoteTx.description &&
          localTx.accountId === remoteTx.accountId &&
          localTx.categoryId === remoteTx.categoryId &&
          localTx.cardId === remoteTx.cardId &&
          localTx.transferAccountId === remoteTx.transferAccountId &&
          localTx.transferType === remoteTx.transferType;
          
        if (!isContentEqual) {
          // If content differs but timestamps match/missing, prioritize local modification
          mergedMap.set(localTx.id, { ...localTx, updatedAt: Date.now() });
          updatedOnSheet++;
        } else {
          // Exactly matching content
          mergedMap.set(localTx.id, localTx);
        }
      }
    } else {
      // Exists locally but not in sheets. Is it marked as deleted?
      if (deletedSet.has(localTx.id)) {
        // It was deleted locally. Do not sync or write!
        continue;
      }
      
      // Treat as brand new local transaction that needs exporting to Sheets
      mergedMap.set(localTx.id, { ...localTx, updatedAt: localTx.updatedAt || Date.now() });
      addedToSheet++;
    }
  }
  
  // Process sheet transactions for additions and deletions
  for (const remoteTx of sheetTxs) {
    if (deletedSet.has(remoteTx.id)) {
      // Transaction was deleted locally, so we strip it from the Sheets!
      deletedFromSheet++;
      continue; // Skip, do not add to merge mapping
    }
    
    if (!localTxsMap.has(remoteTx.id)) {
      // Exists in Sheets but not locally. This is a new transaction imported from Sheets!
      mergedMap.set(remoteTx.id, remoteTx);
      addedToLocal++;
    }
  }
  
  // Final merged list
  const mergedTransactions = Array.from(mergedMap.values());
  
  // Sort by date descending (and secondly by ID/updatedAt descending)
  mergedTransactions.sort((a, b) => {
    const dateComp = b.date.localeCompare(a.date);
    if (dateComp !== 0) return dateComp;
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  });
  
  // 4. Write back merged transactions list to Google Sheets
  // 4.1 Clear the spreadsheet first
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Transactions!A2:K100000:clear`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });
  
  // 4.2 Write back records
  const writeValues = [
    ["id", "date", "amount", "type", "categoryId", "accountId", "description", "cardId", "transferAccountId", "transferType", "updatedAt"],
    ...mergedTransactions.map(tx => transactionToRow(tx))
  ];
  
  const writeResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Transactions!A1:K${writeValues.length}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: writeValues
    })
  });
  
  if (!writeResponse.ok) {
    const err = await writeResponse.json();
    throw new Error(err.error?.message || 'Не удалось записать объединенные данные обратно в Google Таблицу.');
  }
  
  return {
    mergedTransactions,
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
