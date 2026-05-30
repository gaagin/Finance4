import React, { useState, useEffect } from 'react';
import { FinanceData } from '../types';
import { syncWithGoogleSheets, FullSyncResult } from '../googleSheetsSyncService';
import { Cloud, RefreshCw, FileSpreadsheet, ExternalLink, CheckCircle, AlertCircle, Trash2, LogIn, LogOut, Database, ListChecks } from 'lucide-react';

interface GoogleSheetsSyncPanelProps {
  financeData: FinanceData;
  currentUser: any;
  gAccessToken: string | null;
  onGoogleLogin: () => void;
  onGoogleLogout: () => void;
  onGoogleSessionExpired?: () => void;
  onSyncSuccess: (mergedData: FinanceData) => void;
  theme: 'light' | 'dark';
  addToast: (msg: string, type: 'success' | 'warning' | 'critical') => void;
}

export function GoogleSheetsSyncPanel({
  financeData,
  currentUser,
  gAccessToken,
  onGoogleLogin,
  onGoogleLogout,
  onGoogleSessionExpired,
  onSyncSuccess,
  theme,
  addToast
}: GoogleSheetsSyncPanelProps) {
  const [syncing, setSyncing] = useState<boolean>(false);
  const [errMessage, setErrMessage] = useState<string>('');
  const [lastResult, setLastResult] = useState<FullSyncResult | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Read persisted last sync status from localStorage
  useEffect(() => {
    const savedTime = localStorage.getItem('milli_last_sync_time');
    const savedResult = localStorage.getItem('milli_last_sync_result');
    if (savedTime) setLastSyncTime(savedTime);
    if (savedResult) {
      try {
        setLastResult(JSON.parse(savedResult));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Compute local alterations for deleted items
  const getDeletedCount = (key: string): number => {
    try {
      const saved = localStorage.getItem(key);
      if (!saved) return 0;
      const list = JSON.parse(saved);
      return Array.isArray(list) ? list.length : 0;
    } catch {
      return 0;
    }
  };

  const getTotalDeletedCount = (): number => {
    return (
      getDeletedCount('milli_deleted_tx_ids') +
      getDeletedCount('milli_deleted_account_ids') +
      getDeletedCount('milli_deleted_category_ids') +
      getDeletedCount('milli_deleted_card_ids') +
      getDeletedCount('milli_deleted_budget_ids')
    );
  };

  const clearAllDeletionLogs = () => {
    localStorage.removeItem('milli_deleted_tx_ids');
    localStorage.removeItem('milli_deleted_account_ids');
    localStorage.removeItem('milli_deleted_category_ids');
    localStorage.removeItem('milli_deleted_card_ids');
    localStorage.removeItem('milli_deleted_budget_ids');
    addToast('Локальные логи удалений успешно сброшены', 'success');
  };

  const handleSyncNow = async () => {
    if (!gAccessToken) {
      onGoogleLogin();
      return;
    }

    setSyncing(true);
    setErrMessage('');
    try {
      // 1. Retrieve the local list of deleted IDs across all entities
      let deletedIds = {
        transactions: [] as string[],
        accounts: [] as string[],
        categories: [] as string[],
        cards: [] as string[],
        budgets: [] as string[]
      };

      try {
        const txSaved = localStorage.getItem('milli_deleted_tx_ids');
        if (txSaved) deletedIds.transactions = JSON.parse(txSaved);

        const accSaved = localStorage.getItem('milli_deleted_account_ids');
        if (accSaved) deletedIds.accounts = JSON.parse(accSaved);

        const catSaved = localStorage.getItem('milli_deleted_category_ids');
        if (catSaved) deletedIds.categories = JSON.parse(catSaved);

        const cardSaved = localStorage.getItem('milli_deleted_card_ids');
        if (cardSaved) deletedIds.cards = JSON.parse(cardSaved);

        const bSaved = localStorage.getItem('milli_deleted_budget_ids');
        if (bSaved) deletedIds.budgets = JSON.parse(bSaved);
      } catch (e) {
        console.error('Error parsing deleted IDs', e);
      }

      // 2. Perform synchronization
      const result = await syncWithGoogleSheets(gAccessToken, financeData, deletedIds);

      // 3. Update local state in Parent
      onSyncSuccess(result.mergedData);

      // 4. Clear all local deletion records since they are synchronized
      localStorage.removeItem('milli_deleted_tx_ids');
      localStorage.removeItem('milli_deleted_account_ids');
      localStorage.removeItem('milli_deleted_category_ids');
      localStorage.removeItem('milli_deleted_card_ids');
      localStorage.removeItem('milli_deleted_budget_ids');

      // 5. Update UI stats and persist details
      const nowStr = new Date().toLocaleString('ru-RU');
      setLastSyncTime(nowStr);
      setLastResult(result);
      localStorage.setItem('milli_last_sync_time', nowStr);
      localStorage.setItem('milli_last_sync_result', JSON.stringify(result));

      addToast('Двусторонняя дельта-синхронизация успешно завершена! 🚀', 'success');
    } catch (err: any) {
      console.error(err);
      const errMsg = err.message || '';
      const isAuthErr = err.isAuthError || 
        errMsg.includes('401') || 
        errMsg.includes('invalid authentication credentials') || 
        errMsg.toLowerCase().includes('credential') || 
        errMsg.toLowerCase().includes('auth') || 
        errMsg.toLowerCase().includes('token');

      if (isAuthErr) {
        setErrMessage('Истек срок действия сессии Google (401). Пожалуйста, выполните повторный вход для возобновления синхронизации.');
        addToast('Сессия Google истекла. Пожалуйста, войдите снова.', 'critical');
        if (onGoogleSessionExpired) {
          onGoogleSessionExpired();
        } else {
          onGoogleLogout();
        }
      } else {
        setErrMessage(errMsg || 'Произошла непредвиденная ошибка при синхронизации.');
        addToast('Ошибка синхронизации Google Sheets', 'critical');
      }
    } finally {
      setSyncing(false);
    }
  };

  const isDark = theme === 'dark';

  const sumRecord = (rec: any): number => {
    if (typeof rec === 'number') return rec;
    if (!rec) return 0;
    return (Object.values(rec) as any[]).reduce<number>((acc, val) => acc + (Number(val) || 0), 0);
  };

  const getEntityCount = (rec: any, entityKey: string): number => {
    if (!rec) return 0;
    if (typeof rec === 'number') return entityKey === 'transactions' ? rec : 0;
    return Number(rec[entityKey]) || 0;
  };

  return (
    <div className={`p-6 rounded-3xl border transition-all duration-350 ${
      isDark 
        ? 'bg-slate-900/60 border-white/10 text-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.3)]' 
        : 'bg-white border-slate-200/80 text-slate-800 shadow-[0_15px_30px_rgba(0,0,0,0.04)]'
    }`} id="google-sheets-sync-panel">
      {/* Title */}
      <div className="flex items-center gap-3 mb-5">
        <div className={`p-2 rounded-xl ${isDark ? 'bg-teal-500/10 text-teal-300' : 'bg-teal-50/80 text-teal-650'}`}>
          <Cloud size={24} className="animate-pulse" />
        </div>
        <div>
          <h2 className="text-base font-bold tracking-tight">Резервное копирование и дельта-синхронизация</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">Взаимный обмен изменениями напрямую с вашей личной Google Таблицей</p>
        </div>
      </div>

      {/* Google Auth Box */}
      <div className={`p-4 rounded-2xl border mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 ${
        isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'
      }`}>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className={`p-2.5 rounded-xl flex items-center justify-center font-bold text-lg ${
            isDark ? 'bg-teal-500/10 text-teal-300' : 'bg-teal-500/10 text-teal-650'
          }`}>
            <Database size={18} />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 uppercase tracking-wider font-extrabold font-mono">Статус подключения</div>
            {gAccessToken ? (
              <div className="text-[13px] font-bold text-teal-400 flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
                <span>Авторизован в Google</span>
              </div>
            ) : (
              <div className="text-[13px] font-bold text-amber-500 mt-0.5">Требуется авторизация</div>
            )}
          </div>
        </div>

        <div className="w-full sm:w-auto shrink-0 flex gap-2">
          {gAccessToken ? (
            <button
              onClick={onGoogleLogout}
              className={`w-full sm:w-auto py-1.5 px-4 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 border ${
                isDark 
                  ? 'border-white/10 hover:bg-white/5 text-slate-300' 
                   : 'border-slate-200 hover:bg-slate-100 text-slate-600'
              }`}
              id="google-disconnect-btn"
            >
              <LogOut size={14} />
              <span>Выйти</span>
            </button>
          ) : (
            <button
              onClick={onGoogleLogin}
              className="w-full sm:w-auto py-2 px-5 text-xs font-black rounded-xl cursor-pointer bg-gradient-to-r from-teal-400 to-emerald-450 text-slate-950 font-sans shadow-md hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
              id="google-connect-btn"
            >
              <LogIn size={14} />
              <span>Войти через Google</span>
            </button>
          )}
        </div>
      </div>

      {/* Sync Strategy Explanation Card */}
      <div className={`p-4 rounded-2xl border mb-6 text-xs space-y-3 leading-relaxed ${
        isDark ? 'border-white/5 bg-slate-950/40 text-slate-300' : 'border-slate-200/60 bg-slate-50/60 text-slate-600'
      }`}>
        <p className="font-bold flex items-center gap-1.5">
          <Database size={13} className="text-teal-400" />
          <span>Как работает дельта-синхронизация?</span>
        </p>
        <ul className="list-disc list-inside space-y-1.5 text-slate-400 ml-1 pl-1">
          <li>Импортируются и экспортируются <b>все данные</b>: транзакции, счета, лимиты, категории и карты на основе временных меток изменений.</li>
          <li><b>Двусторонний обмен:</b> любые добавления или корректировки (включая галочку «Быстрый ввод» в свойствах счетов на смартфоне или ПК) будут синхронизированы в обе стороны.</li>
          <li><b>Безопасное удаление:</b> счета, карты или транзакции, удаленные вами на одном устройстве, автоматически списываются из облака при сеансе связи.</li>
        </ul>
      </div>

      {/* Sync Status Details */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className={`p-3.5 rounded-2xl border text-center ${
          isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'
        }`}>
          <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Всего операций в приложении</div>
          <div className="text-lg font-black mt-1 font-mono">{financeData.transactions?.length || 0}</div>
        </div>
        <div className={`p-3.5 rounded-2xl border text-center ${
          isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'
        }`}>
          <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Изменений в очереди</div>
          <div className="text-lg font-black mt-1 font-mono flex items-center justify-center gap-1.5">
            <span className={getTotalDeletedCount() > 0 ? 'text-rose-400' : ''}>{getTotalDeletedCount()}</span>
            {getTotalDeletedCount() > 0 && (
              <button 
                onClick={clearAllDeletionLogs}
                className="p-1 rounded-md hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                title="Сбросить лог удалений"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error Output */}
      {errMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5 mb-6">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <span>{errMessage}</span>
        </div>
      )}

      {/* Execute Sync Button */}
      <div className="flex flex-col items-center justify-center gap-4">
        <button
          onClick={handleSyncNow}
          disabled={syncing}
          className={`w-full py-3.5 px-6 font-black rounded-2xl flex items-center justify-center gap-3 shadow-lg active:scale-98 cursor-pointer hover:shadow-teal-500/5 hover:scale-[1.01] transition-all text-xs font-mono select-none ${
            syncing 
              ? 'bg-teal-500/20 text-teal-350 border border-teal-500/30 font-black cursor-not-allowed'
              : 'bg-teal-400 hover:bg-teal-350 text-slate-950 font-black'
          }`}
          id="trigger-delta-sync-btn"
        >
          <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
          <span>{syncing ? 'СИНХРОНИЗАЦИЯ С ОБЛАКОМ...' : 'СИНХРОНИЗИРОВАТЬ С GOOGLE SHEETS'}</span>
        </button>

        {lastSyncTime && (
          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
            <CheckCircle size={12} className="text-teal-400" />
            <span>Последняя синхронизация: {lastSyncTime}</span>
          </div>
        )}
      </div>

      {/* Sync results log */}
      {lastResult && (
        <div className={`mt-6 p-4 rounded-2xl border space-y-3 ${
          isDark ? 'bg-slate-950/20 border-white/5' : 'bg-slate-50/50 border-slate-100'
        }`}>
          <div className="text-xs font-bold font-mono tracking-wide flex items-center gap-1.5 uppercase text-slate-400">
            <ListChecks size={13} className="text-teal-400" />
            <span>Отчет по синхронизации изменений:</span>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs font-mono ml-1.5">
            <div className="flex justify-between border-b border-dashed border-slate-800 pb-1">
              <span className="text-slate-400 text-[11px]">Выгружено в таблицу:</span>
              <span className="text-teal-400 font-black">{sumRecord(lastResult.addedToSheet) + sumRecord(lastResult.updatedOnSheet)}</span>
            </div>
            <div className="flex justify-between border-b border-dashed border-slate-800 pb-1">
              <span className="text-slate-400 text-[11px]">Закачано локально:</span>
              <span className="text-teal-400 font-black">{sumRecord(lastResult.addedToLocal) + sumRecord(lastResult.updatedOnLocal)}</span>
            </div>
            <div className="flex justify-between border-b border-dashed border-slate-800 pb-1">
              <span className="text-slate-400 text-[11px]">Стерто из таблицы:</span>
              <span className="text-rose-400 font-black">{sumRecord(lastResult.deletedFromSheet)}</span>
            </div>
            <div className="flex justify-between border-b border-dashed border-slate-800 pb-1">
              <span className="text-slate-400 text-[11px]">Стерто локально:</span>
              <span className="text-rose-400 font-black">{sumRecord(lastResult.deletedFromLocal)}</span>
            </div>
          </div>

          {/* Breakdown stats */}
          <div className="pt-2 text-[10px] space-y-1 text-slate-400 font-mono border-t border-slate-800/30">
            <div className="text-[9px] uppercase tracking-wider font-extrabold text-slate-500 mb-1">Детализация изменений:</div>
            <div className="flex justify-between">
              <span>Транзакции (доб / обн):</span>
              <span>
                {getEntityCount(lastResult.addedToSheet, 'transactions') + getEntityCount(lastResult.addedToLocal, 'transactions')}+ / {getEntityCount(lastResult.updatedOnSheet, 'transactions') + getEntityCount(lastResult.updatedOnLocal, 'transactions')}~
              </span>
            </div>
            <div className="flex justify-between">
              <span>Счета (доб / обн):</span>
              <span>
                {getEntityCount(lastResult.addedToSheet, 'accounts') + getEntityCount(lastResult.addedToLocal, 'accounts')}+ / {getEntityCount(lastResult.updatedOnSheet, 'accounts') + getEntityCount(lastResult.updatedOnLocal, 'accounts')}~
              </span>
            </div>
            <div className="flex justify-between">
              <span>Категории (доб / обн):</span>
              <span>
                {getEntityCount(lastResult.addedToSheet, 'categories') + getEntityCount(lastResult.addedToLocal, 'categories')}+ / {getEntityCount(lastResult.updatedOnSheet, 'categories') + getEntityCount(lastResult.updatedOnLocal, 'categories')}~
              </span>
            </div>
            <div className="flex justify-between">
              <span>Карты (доб / обн):</span>
              <span>
                {getEntityCount(lastResult.addedToSheet, 'cards') + getEntityCount(lastResult.addedToLocal, 'cards')}+ / {getEntityCount(lastResult.updatedOnSheet, 'cards') + getEntityCount(lastResult.updatedOnLocal, 'cards')}~
              </span>
            </div>
          </div>

          {lastResult.spreadsheetUrl && (
            <div className="pt-2 flex justify-start border-t border-slate-800/30">
              <a
                href={(() => {
                  let href = lastResult.spreadsheetUrl;
                  if (currentUser?.email) {
                    try {
                      const urlObj = new URL(href);
                      urlObj.searchParams.set('authuser', currentUser.email);
                      href = urlObj.toString();
                    } catch (e) {
                      if (href.includes('?')) {
                        href += `&authuser=${encodeURIComponent(currentUser.email)}`;
                      } else {
                        href += `?authuser=${encodeURIComponent(currentUser.email)}`;
                      }
                    }
                  }
                  return href;
                })()}
                target="_blank"
                rel="no-referrer noreferrer"
                className="text-[11px] font-black text-teal-400 hover:text-teal-300 hover:underline flex items-center gap-1.5 transition-colors font-sans hover:scale-[1.01]"
                id="open-spreadsheet-link"
              >
                <FileSpreadsheet size={13} />
                <span>Открыть личную таблицу MilliFinance Sync DB</span>
                <ExternalLink size={10} />
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
