import React, { useState, useEffect } from 'react';
import { Transaction } from '../types';
import { syncWithGoogleSheets, SyncResult } from '../googleSheetsSyncService';
import { Cloud, RefreshCw, FileSpreadsheet, ExternalLink, CheckCircle, AlertCircle, Trash2, LogIn, LogOut, Database, ListChecks } from 'lucide-react';

interface GoogleSheetsSyncPanelProps {
  transactions: Transaction[];
  currentUser: any;
  gAccessToken: string | null;
  onGoogleLogin: () => void;
  onGoogleLogout: () => void;
  onSyncSuccess: (mergedTransactions: Transaction[]) => void;
  theme: 'light' | 'dark';
  addToast: (msg: string, type: 'success' | 'warning' | 'critical') => void;
}

export function GoogleSheetsSyncPanel({
  transactions,
  currentUser,
  gAccessToken,
  onGoogleLogin,
  onGoogleLogout,
  onSyncSuccess,
  theme,
  addToast
}: GoogleSheetsSyncPanelProps) {
  const [syncing, setSyncing] = useState<boolean>(false);
  const [errMessage, setErrMessage] = useState<string>('');
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
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

  // Compute local alterations
  const getDeletedCount = (): number => {
    try {
      const saved = localStorage.getItem('milli_deleted_tx_ids');
      if (!saved) return 0;
      const list = JSON.parse(saved);
      return Array.isArray(list) ? list.length : 0;
    } catch {
      return 0;
    }
  };

  const getUnsyncedLocalCount = (): number => {
    // Transactions with an updatedAt field that have never been synced / created after may also be tracked
    return transactions.filter(t => t.updatedAt).length;
  };

  const clearDeletionLog = () => {
    localStorage.removeItem('milli_deleted_tx_ids');
    addToast('Локальный лог удалений успешно сброшен', 'success');
  };

  const handleSyncNow = async () => {
    if (!gAccessToken) {
      onGoogleLogin();
      return;
    }

    setSyncing(true);
    setErrMessage('');
    try {
      // 1. Retrieve the local list of deleted transaction IDs
      let deletedIds: string[] = [];
      try {
        const saved = localStorage.getItem('milli_deleted_tx_ids');
        if (saved) deletedIds = JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing deleted IDs', e);
      }

      // 2. Perform synchronization
      const result = await syncWithGoogleSheets(gAccessToken, transactions, deletedIds);

      // 3. Update local state in Parent
      onSyncSuccess(result.mergedTransactions);

      // 4. Clear the local list of deleted transaction IDs since they are synced
      localStorage.removeItem('milli_deleted_tx_ids');

      // 5. Update UI stats and persist details
      const nowStr = new Date().toLocaleString('ru-RU');
      setLastSyncTime(nowStr);
      setLastResult(result);
      localStorage.setItem('milli_last_sync_time', nowStr);
      localStorage.setItem('milli_last_sync_result', JSON.stringify(result));

      addToast('Двусторонняя дельта-синхронизация успешно завершена! 🚀', 'success');
    } catch (err: any) {
      console.error(err);
      setErrMessage(err.message || 'Произошла непредвиденная ошибка при синхронизации.');
      addToast('Ошибка синхронизации Google Sheets', 'critical');
    } finally {
      setSyncing(false);
    }
  };

  const isDark = theme === 'dark';

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
          <li>Импортируются и экспортируются <b>исключительно новые и измененные записи</b> на основе временных меток изменений.</li>
          <li><b>Двусторонний обмен:</b> любые добавления или корректировки в Google Таблице будут скачаны в MillFinance, а ваши локальные изменения отправятся в облако.</li>
          <li><b>Безопасное удаление:</b> операции, удаленные вами в приложении, автоматически стираются из строки таблицы Google.</li>
        </ul>
      </div>

      {/* Sync Status Details */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className={`p-3.5 rounded-2xl border text-center ${
          isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'
        }`}>
          <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Всего операций в приложении</div>
          <div className="text-lg font-black mt-1 font-mono">{transactions.length}</div>
        </div>
        <div className={`p-3.5 rounded-2xl border text-center ${
          isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'
        }`}>
          <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Очередь на удаление</div>
          <div className="text-lg font-black mt-1 font-mono flex items-center justify-center gap-1.5">
            <span className={getDeletedCount() > 0 ? 'text-rose-400' : ''}>{getDeletedCount()}</span>
            {getDeletedCount() > 0 && (
              <button 
                onClick={clearDeletionLog}
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
              <span className="text-slate-450 text-[11px]">Выгружено в таблицу:</span>
              <span className="text-teal-400 font-black">{lastResult.addedToSheet + lastResult.updatedOnSheet}</span>
            </div>
            <div className="flex justify-between border-b border-dashed border-slate-800 pb-1">
              <span className="text-slate-450 text-[11px]">Закачано локально:</span>
              <span className="text-teal-400 font-black">{lastResult.addedToLocal + lastResult.updatedOnLocal}</span>
            </div>
            <div className="flex justify-between border-b border-dashed border-slate-800 pb-1sm">
              <span className="text-slate-450 text-[11px]">Стерто из таблицы:</span>
              <span className="text-rose-400 font-black">{lastResult.deletedFromSheet}</span>
            </div>
            <div className="flex justify-between border-b border-dashed border-slate-800 pb-1sm">
              <span className="text-slate-450 text-[11px]">Стерто локально:</span>
              <span className="text-rose-400 font-black">{lastResult.deletedFromLocal}</span>
            </div>
          </div>

          {lastResult.spreadsheetUrl && (
            <div className="pt-2 flex justify-start">
              <a
                href={lastResult.spreadsheetUrl}
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
