import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { FinanceData, Transaction, Account, Category, BankCard } from './types';
import { initialFinanceData } from './initialData';
import { DashboardOverview } from './components/DashboardOverview';
import { TransactionPanel } from './components/TransactionPanel';
import { AccountsCategoriesPanel } from './components/AccountsCategoriesPanel';
import { BudgetingPanel } from './components/BudgetingPanel';
import { CalendarPanel } from './components/CalendarPanel';
import { GoogleSheetsSyncPanel } from './components/GoogleSheetsSyncPanel';
import { LayoutDashboard, ReceiptText, Calendar, SlidersHorizontal, Settings, Flame, Bell, AlertTriangle, XCircle, CheckCircle, Info, LogIn, LogOut, ShieldAlert, X, RefreshCw, FolderOpen, TrendingUp, Sun, Moon } from 'lucide-react';
import { initAuth, logout, googleSignIn } from './googleAuth';
import { User } from 'firebase/auth';
import { parseAndStandardizeJsonToFinanceData } from './honeyJsonConverter';

function parseAnyDateToISO(val: any): string {
  if (val === undefined || val === null || val === '') return '';
  let str = String(val).trim().toLowerCase();
  if (!str) return '';

  str = str.replace(/\s*г\.?$/, ''); // clean russian year suffix

  // Excel serial number
  if (/^\d{5}$/.test(str)) {
    const serial = parseInt(str, 10);
    const date = new Date(1899, 11, 30);
    date.setDate(date.getDate() + serial);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // ISO Format (YYYY-MM-DD)
  const isoMatch = str.match(/^(\d{4})[-/. ](\d{1,2})[-/. ](\d{1,2})$/);
  if (isoMatch) {
    const [_, y, m, d] = isoMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // European/Russian format (DD.MM.YYYY)
  const eurMatch = str.match(/^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{4})$/);
  if (eurMatch) {
    const [_, d, m, y] = eurMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // European short year format (DD.MM.YY)
  const eurShortMatch = str.match(/^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{2})$/);
  if (eurShortMatch) {
    const [_, d, m, yStr] = eurShortMatch;
    const yr = parseInt(yStr, 10);
    const fullYear = yr < 50 ? 2000 + yr : 1900 + yr;
    return `${fullYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Russian/English Textual layout
  const cleanTokens = str
    .replace(/[,\.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ');

  if (cleanTokens.length >= 3) {
    let day = 0;
    let month = 0;
    let year = 0;

    const monthsMap: Record<string, number> = {
      'янв': 1, 'январь': 1, 'января': 1,
      'фев': 2, 'февраль': 2, 'февраля': 2,
      'мар': 3, 'март': 3, 'марта': 3,
      'апр': 4, 'апрель': 4, 'апреля': 4,
      'май': 5, 'мая': 5,
      'июн': 6, 'июнь': 6, 'июня': 6,
      'июл': 7, 'июль': 7, 'июля': 7,
      'авг': 8, 'август': 8, 'августа': 8,
      'сен': 9, 'сентябрь': 9, 'сентября': 9,
      'окт': 10, 'октябрь': 10, 'октября': 10,
      'ноя': 11, 'ноябрь': 11, 'ноября': 11,
      'дек': 12, 'декабрь': 12, 'декабря': 12,
      'jan': 1, 'january': 1, 'feb': 2, 'february': 2,
      'mar': 3, 'march': 3, 'apr': 4, 'april': 4,
      'may': 5, 'jun': 6, 'june': 6, 'jul': 7, 'july': 7,
      'aug': 8, 'august': 8, 'sep': 9, 'september': 9,
      'oct': 10, 'october': 10, 'nov': 11, 'november': 11,
      'dec': 12, 'december': 12
    };

    for (const t of cleanTokens) {
      if (/^[a-zа-яё]+$/.test(t)) {
        const prefix = t.slice(0, 3);
        if (monthsMap[t]) {
          month = monthsMap[t];
        } else if (monthsMap[prefix]) {
          month = monthsMap[prefix];
        }
      } else if (/^\d{4}$/.test(t)) {
        year = parseInt(t, 10);
      } else if (/^\d{1,2}$/.test(t)) {
        const valNum = parseInt(t, 10);
        if (valNum > 0 && valNum <= 31) {
          if (day === 0) {
            day = valNum;
          } else if (month === 0) {
            month = valNum;
          } else if (year === 0) {
            year = valNum < 50 ? 2000 + valNum : 1900 + valNum;
          }
        }
      }
    }

    if (day && month && year) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Native JS parse fallback
  const parsedTimestamp = Date.parse(str);
  if (!isNaN(parsedTimestamp)) {
    const dObj = new Date(parsedTimestamp);
    const y = dObj.getFullYear();
    const m = String(dObj.getMonth() + 1).padStart(2, '0');
    const d = String(dObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return str;
}

function parseLocalTimestamp(val: any): number {
  if (val === undefined || val === null || val === '') return Date.now();
  if (typeof val === 'number') {
    return isNaN(val) ? Date.now() : val;
  }
  let str = String(val).trim();
  if (!str) return Date.now();

  const hasExponent = /[eE]/.test(str);
  if (hasExponent) {
    str = str.replace(/,/g, '.').replace(/\s+/g, '');
  } else {
    str = str.replace(/[^0-9\-]/g, '');
  }
  const parsed = parseFloat(str);
  return isNaN(parsed) ? Date.now() : Math.round(parsed);
}

export default function App() {
  
  // 1. Initial State starts with parsed local storage or fallback to HoneyMoney JSON data (6572 transactions)
  const [data, setData] = useState<FinanceData>(() => {
    const saved = localStorage.getItem('milli_finance_data_v8_realonly_clean');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.transactions) && parsed.transactions.length > 0) {
          // Safeguard: make sure no NaN/null values exist and automatically heal serial or badly-formatted dates
          parsed.transactions = parsed.transactions.map((t: any) => {
            return {
              ...t,
              date: parseAnyDateToISO(t.date),
              amount: typeof t.amount === 'number' && !isNaN(t.amount) ? t.amount : (parseFloat(String(t.amount)) || 0),
              updatedAt: parseLocalTimestamp(t.updatedAt)
            };
          }).filter((t: any) => t.date !== ''); // skip any rows that lack a valid date completely
          
          if (Array.isArray(parsed.accounts)) {
            parsed.accounts = parsed.accounts.map((a: any) => ({
              ...a,
              balance: typeof a.balance === 'number' && !isNaN(a.balance) ? a.balance : (parseFloat(String(a.balance)) || 0),
              updatedAt: parseLocalTimestamp(a.updatedAt)
            }));
          }
          if (Array.isArray(parsed.budgets)) {
            parsed.budgets = parsed.budgets.map((b: any) => ({
              ...b,
              limitAmount: typeof b.limitAmount === 'number' && !isNaN(b.limitAmount) ? b.limitAmount : (parseFloat(String(b.limitAmount)) || 0),
              updatedAt: parseLocalTimestamp(b.updatedAt)
            }));
          }
          if (Array.isArray(parsed.categories)) {
            parsed.categories = parsed.categories.map((c: any) => ({
              ...c,
              updatedAt: parseLocalTimestamp(c.updatedAt)
            }));
          }
          if (Array.isArray(parsed.cards)) {
            parsed.cards = parsed.cards.map((card: any) => ({
              ...card,
              updatedAt: parseLocalTimestamp(card.updatedAt)
            }));
          }
          return parsed;
        }
      } catch (e) {
        console.error('Ошибка чтения локального хранилища:', e);
      }
    }
    return initialFinanceData;
  });

  const [isFirebaseLoading, setIsFirebaseLoading] = useState(false);
  const isLoadedFromFirebase = useRef(false);
  const lastFetchedDataRef = useRef<string | null>(null);
  const isWritingToFirebaseRef = useRef(false);

  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Connection tests are disabled since we are 100% local.

  // Theme support: default is 'light' as requested.
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('milli_finance_theme');
    return (saved as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    localStorage.setItem('milli_finance_theme', theme);
  }, [theme]);

  // 3. Navigation between Views (Tabs)
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [accountsSubTab, setAccountsSubTab] = useState<'accounts' | 'budget' | 'sync'>('accounts');

  // Calendar persistent states to align monthly scope & focuses upon returning from modals or edits
  const [calendarCurrentDate, setCalendarCurrentDate] = useState<Date>(new Date()); // Default dynamically to today's date (May 2026)
  const [calendarClickedDate, setCalendarClickedDate] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  // Intercollegiate states passing to support instant add-on-day or edits
  const [preselectedDate, setPreselectedDate] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const lastTabBeforeEditRef = useRef<string | null>(null);

  // Google Sheets Authentication Integration state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [gAccessToken, setGAccessToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authErrorCode, setAuthErrorCode] = useState<string | null>(null);
  const [showAuthInstructions, setShowAuthInstructions] = useState(false);
  const [firebaseSyncError, setFirebaseSyncError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Connection and syncing progress indicators
  const [isGoogleSyncing, setIsGoogleSyncing] = useState(false);
  const [isInitialSyncing, setIsInitialSyncing] = useState(false);
  const doneInitialSyncRef = useRef(false);

  // Subscribe to Firebase Firestore user document for real-time synchronization between multiple devices (Temporarily disabled as requested)
  useEffect(() => {
    if (currentUser) {
      isLoadedFromFirebase.current = true;
      setIsFirebaseLoading(false);
      setFirebaseSyncError(null);
    }
  }, [currentUser]);

  const isSyncingRef = useRef<boolean>(false);
  const isApplyingSyncDataRef = useRef<boolean>(false);
  const hasUnsavedSyncChangesRef = useRef<boolean>(false);

  // Sync state to LocalStorage for offline capability and local testing
  useEffect(() => {
    localStorage.setItem('milli_finance_data_v8_realonly_clean', JSON.stringify(data));
    
    // Detect if this change came from active sync merge or direct user action
    if (isApplyingSyncDataRef.current) {
      isApplyingSyncDataRef.current = false;
    } else {
      hasUnsavedSyncChangesRef.current = true;
    }
  }, [data]);

  const isGoogleTokenExpired = (): boolean => {
    const expiryStr = localStorage.getItem('milli_g_access_token_expiry');
    if (!expiryStr) return false;
    const expiryTime = parseInt(expiryStr, 10);
    return Date.now() > expiryTime;
  };

  // 2. Initial bidirectional sync on app startup or when Google connection gets established
  useEffect(() => {
    if (!gAccessToken) {
      doneInitialSyncRef.current = false;
      return;
    }
    if (isGoogleTokenExpired()) return;
    if (doneInitialSyncRef.current) return;

    doneInitialSyncRef.current = true;
    setIsInitialSyncing(true);

    const runInitialPull = async () => {
      console.log('Running startup/auth-change Google Sheets synchronization...');
      
      const deletedIds = {
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
      } catch {}

      try {
        const { syncWithGoogleSheets } = await import('./googleSheetsSyncService');
        const result = await syncWithGoogleSheets(gAccessToken, dataRef.current, deletedIds);
        
        // Push merged remote data to local react state
        isApplyingSyncDataRef.current = true;
        setData(result.mergedData);
        hasUnsavedSyncChangesRef.current = false;
        
        localStorage.removeItem('milli_deleted_tx_ids');
        localStorage.removeItem('milli_deleted_account_ids');
        localStorage.removeItem('milli_deleted_category_ids');
        localStorage.removeItem('milli_deleted_card_ids');
        localStorage.removeItem('milli_deleted_budget_ids');

        const nowStr = new Date().toLocaleString('ru-RU');
        localStorage.setItem('milli_last_sync_time', nowStr);
        localStorage.setItem('milli_last_sync_result', JSON.stringify(result));
        
        addToast('Данные успешно синхронизированы с Google Таблицей! ☁️🔄', 'success');
      } catch (err: any) {
        console.error('Initial auto-sync failed:', err);
        const errMsg = err?.message || '';
        const isAuthErr = err.isAuthError || 
          errMsg.includes('401') || 
          errMsg.includes('invalid authentication credentials') || 
          errMsg.toLowerCase().includes('credential') || 
          errMsg.toLowerCase().includes('auth') || 
          errMsg.toLowerCase().includes('token');
        if (isAuthErr) {
          handleGoogleSessionExpired(true);
        }
      } finally {
        setIsInitialSyncing(false);
      }
    };

    runInitialPull();
  }, [gAccessToken]);

  // Restore persistent Google Sheets OAuth session & onAuthStateChanged listener on mount
  useEffect(() => {
    const unsub = initAuth(
      (user, token) => {
        setCurrentUser(user);
        const cachedToken = token || localStorage.getItem('milli_g_access_token');
        if (cachedToken) {
          const expiryStr = localStorage.getItem('milli_g_access_token_expiry');
          const expiryTime = expiryStr ? parseInt(expiryStr, 10) : 0;
          const isExpired = Date.now() > expiryTime;
          
          if (!isExpired) {
            setGAccessToken(cachedToken);
            setNeedsAuth(false);
          } else {
            // Keep Firebase session intact, only mark Google token as needing refresh
            setGAccessToken(null);
            setNeedsAuth(true);
            console.log("Cached Google Access Token is expired, background auto-sync was paused.");
          }
        }
        setIsAuthLoading(false);
      },
      () => {
        setCurrentUser(null);
        setGAccessToken(null);
        setNeedsAuth(true);
        setIsAuthLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Background Auto-sync on active updates (debounced with 5s of inactivity to prevent query thrashing)
  useEffect(() => {
    if (!gAccessToken) return;

    // Fast check: if the token is already expired and there are actually modifications, safely pause auto-sync without kicking user out
    if (isGoogleTokenExpired() && hasUnsavedSyncChangesRef.current) {
      console.warn('Google Access token has expired with changes pending. Suspending background auto-sync.');
      handleGoogleSessionExpired(true);
      return;
    }

    const timer = setTimeout(async () => {
      // If there are no local unsaved changes, we do not need to trigger background sync
      if (!hasUnsavedSyncChangesRef.current) return;

      console.log('Debounced background auto-sync to Google Sheets is running...');
      isSyncingRef.current = true;
      setIsGoogleSyncing(true);

      const syncedData = data; // Freeze local snapshot at point of sync start

      const deletedIds = {
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
      } catch {}

      import('./googleSheetsSyncService').then(async ({ syncWithGoogleSheets }) => {
        try {
          const result = await syncWithGoogleSheets(gAccessToken, syncedData, deletedIds);
          
          // Clear unsaved changes tracker ONLY if no concurrent edits were made by the user
          if (dataRef.current === syncedData) {
            hasUnsavedSyncChangesRef.current = false;
          }

          // If there were modifications in Google Sheets that we merged back:
          const hasLocalChanges = 
            Object.values(result.addedToLocal).reduce((a: number, b: any) => a + (Number(b) || 0), 0) +
            Object.values(result.updatedOnLocal).reduce((a: number, b: any) => a + (Number(b) || 0), 0) +
            Object.values(result.deletedFromLocal).reduce((a: number, b: any) => a + (Number(b) || 0), 0);

          if (hasLocalChanges > 0) {
            isApplyingSyncDataRef.current = true;
            setData(result.mergedData);
          }
          
          localStorage.removeItem('milli_deleted_tx_ids');
          localStorage.removeItem('milli_deleted_account_ids');
          localStorage.removeItem('milli_deleted_category_ids');
          localStorage.removeItem('milli_deleted_card_ids');
          localStorage.removeItem('milli_deleted_budget_ids');

          const nowStr = new Date().toLocaleString('ru-RU');
          localStorage.setItem('milli_last_sync_time', nowStr);
          localStorage.setItem('milli_last_sync_result', JSON.stringify(result));
          
          addToast('Данные автоматически сохранены в Google Таблицу ☁️✨', 'success');
        } catch (err: any) {
          console.error('Background auto-sync failed:', err);
          const errMsg = err?.message || '';
          const isAuthErr = err.isAuthError || 
            errMsg.includes('401') || 
            errMsg.includes('invalid authentication credentials') || 
            errMsg.toLowerCase().includes('credential') || 
            errMsg.toLowerCase().includes('auth') || 
            errMsg.toLowerCase().includes('token');
          if (isAuthErr) {
            console.warn('Google Access token has expired during auto-sync. Resetting Google connection.');
            handleGoogleSessionExpired(true);
          } else {
            // Show toast for unexpected syncing failures so the user can easily observe the cause
            addToast(`Ошибка автоматического сохранения: ${errMsg || 'Сеть занята'}`, 'warning');
          }
        } finally {
          isSyncingRef.current = false;
          setIsGoogleSyncing(false);
        }
      });
    }, 2500);

    return () => clearTimeout(timer);
  }, [data, gAccessToken]);

  // Reliable Auto-sync on exiting page, losing focus, or switching tabs
  useEffect(() => {
    const handleExitSync = () => {
      if (!gAccessToken || isGoogleTokenExpired() || !hasUnsavedSyncChangesRef.current) return;

      console.log('Page is being hidden/unloaded. Saving pending changes to Google Sheets instantly...');
      
      const deletedIds = {
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
      } catch {}

      import('./googleSheetsSyncService').then(async ({ syncWithGoogleSheets }) => {
        try {
          isSyncingRef.current = true;
          const result = await syncWithGoogleSheets(gAccessToken, dataRef.current, deletedIds);
          hasUnsavedSyncChangesRef.current = false;
          
          localStorage.removeItem('milli_deleted_tx_ids');
          localStorage.removeItem('milli_deleted_account_ids');
          localStorage.removeItem('milli_deleted_category_ids');
          localStorage.removeItem('milli_deleted_card_ids');
          localStorage.removeItem('milli_deleted_budget_ids');

          const nowStr = new Date().toLocaleString('ru-RU');
          localStorage.setItem('milli_last_sync_time', nowStr);
          localStorage.setItem('milli_last_sync_result', JSON.stringify(result));
        } catch (err) {
          console.error('Quiet exit auto-sync failed:', err);
        } finally {
          isSyncingRef.current = false;
        }
      });
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleExitSync();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', handleExitSync);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', handleExitSync);
    };
  }, [gAccessToken]);

  const handleGoogleLogin = async () => {
    try {
      setAuthError(null);
      setAuthErrorCode(null);
      const result = await googleSignIn();
      if (result) {
        setCurrentUser(result.user);
        setGAccessToken(result.accessToken);
        setNeedsAuth(false);
        localStorage.setItem('milli_g_access_token', result.accessToken);
        
        // Save token expiry timestamp (extends local sessions to 24 hours for smooth viewing/idle retention)
        const expiryTime = Date.now() + 24 * 3600 * 1000;
        localStorage.setItem('milli_g_access_token_expiry', expiryTime.toString());
        
        addToast("Вход выполнен успешно!", "success" as any);
      }
    } catch (err: any) {
      console.error('Ошибка входа через Google:', err);
      const code = err?.code || '';
      const message = err?.message || '';
      
      setAuthErrorCode(code);
      setAuthError(message);
      
      // Auto-toggle instructions if domain authorization error or typical window closed instantly is received
      setShowAuthInstructions(true);

      if (code === 'auth/unauthorized-domain' || message.includes('unauthorized-domain') || message.includes('not-authorized')) {
        addToast("Ошибка: Домен приложения не авторизован в вашей консоли Firebase! 🛑", "critical" as any);
      } else {
        addToast(
          "Всплывающее окно закрылось. Это происходит, когда авторизация блокируется фреймом или домен не добавлен в консоли Firebase. Ознакомьтесь с инструкцией ниже.",
          "warning" as any
        );
      }
    }
  };

  const handleGoogleLogout = async () => {
    await logout();
    setCurrentUser(null);
    setGAccessToken(null);
    setNeedsAuth(true);
    localStorage.removeItem('milli_g_access_token');
    localStorage.removeItem('milli_g_access_token_expiry');
    addToast("Вы вышли из аккаунта Google", "success");
  };

  const handleGoogleSessionExpired = async (isBackground = false) => {
    setGAccessToken(null);
    setNeedsAuth(true);
    localStorage.removeItem('milli_g_access_token');
    localStorage.removeItem('milli_g_access_token_expiry');
    
    if (isBackground) {
      console.log("Background Google session expired. Auto-sync has been safely and silently paused.");
    } else {
      addToast("Сессия Google истекла. Пожалуйста, авторизуйтесь заново для синхронизации.", "warning");
    }
  };

  // 4. Toast Alerts state & Budgeting Boundary Trigger
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: 'warning' | 'critical' | 'success' }>>([]);

  const addToast = (message: string, type: 'warning' | 'critical' | 'success') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 6000); // floating toast alert persists for 6 seconds
  };

  const handleDismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const saveToFirebaseDirectly = async (nextData: FinanceData) => {
    // Only LocalStorage and Google Sheets are used for syncing now.
    return;
  };

  const handleUploadCustomJson = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmMessage = `Вы уверены, что хотите импортировать файл "${file.name}" с вашего ПК? Это заменит текущие данные в браузере и автоматически синхронизирует их с Google Sheets.`;

    if (!confirm(confirmMessage)) {
      e.target.value = '';
      return;
    }

    setIsFirebaseLoading(true);
    setFirebaseSyncError(null);
    try {
      const fileReader = new FileReader();
      
      fileReader.onload = async (event) => {
        try {
          const text = event.target?.result as string;
          if (!text) {
            throw new Error("Файл пуст или не удалось прочитать содержимое.");
          }

          addToast("Парсинг и преобразование данных... ⚙️", "success");
          const parsedData = parseAndStandardizeJsonToFinanceData(text);
          const numTxs = parsedData.transactions.length;

          addToast(`Успешно распознано ${numTxs} транзакций! Сохранение локально... 💾`, "success");
          localStorage.setItem('milli_finance_data_v8_realonly_clean', JSON.stringify(parsedData));
          setData(parsedData);
          hasUnsavedSyncChangesRef.current = true; // Mark as unsaved so background Google Sheets sync is triggered
          addToast(`Успешно загружено: ${numTxs} транзакций из "${file.name}"! Данные будут синхронизированы в Google Drive. 🎉`, "success");
        } catch (innerErr: any) {
          console.error("Ошибка импорта загруженного файла:", innerErr);
          const msg = innerErr?.message || String(innerErr);
          setFirebaseSyncError(msg);
          addToast(`Ошибка обработки файла: ${msg}`, "critical" as any);
        } finally {
          setIsFirebaseLoading(false);
          e.target.value = '';
        }
      };

      fileReader.onerror = () => {
        addToast("Не удалось прочитать загруженный файл", "critical" as any);
        setIsFirebaseLoading(false);
        e.target.value = '';
      };

      fileReader.readAsText(file, "utf-8");

    } catch (err: any) {
      console.error("Ошибка при чтении файла:", err);
      const msg = err?.message || String(err);
      setFirebaseSyncError(msg);
      addToast(`Не удалось обработать файл: ${msg}`, "critical" as any);
      setIsFirebaseLoading(false);
      e.target.value = '';
    }
  };

  // Quick navigation with clearing helper
  const handleQuickNavigate = (tab: string) => {
    setActiveTab(tab);
    setPreselectedDate(null);
    setEditingTransaction(null);
    if (tab === 'calendar') {
      const today = new Date();
      setCalendarCurrentDate(today);
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      setCalendarClickedDate(`${year}-${month}-${day}`);
    }
    if (tab === 'accounts-categories') {
      setAccountsSubTab('accounts');
    }
  };

  // Triggered when clicking a day on the calendar to "add transaction on that day"
  const handleAddTransactionOnDate = (date: string) => {
    setPreselectedDate(date);
    setEditingTransaction(null);
    setCalendarClickedDate(date);
    const txYear = parseInt(date.substring(0, 4));
    const txMonth = parseInt(date.substring(5, 7)) - 1; // 0-based
    if (!isNaN(txYear) && !isNaN(txMonth)) {
      setCalendarCurrentDate(new Date(txYear, txMonth, 1));
    }
    setActiveTab('transactions');
  };

  // Triggered when editing transaction from calendar cell or overview list
  const handleEditTransactionStart = (tx: Transaction) => {
    lastTabBeforeEditRef.current = activeTab;
    setEditingTransaction(tx);
    setPreselectedDate(null);

    if (tx.date) {
      setCalendarClickedDate(tx.date);
      const txYear = parseInt(tx.date.substring(0, 4));
      const txMonth = parseInt(tx.date.substring(5, 7)) - 1; // 0-based
      if (!isNaN(txYear) && !isNaN(txMonth)) {
        setCalendarCurrentDate(new Date(txYear, txMonth, 1));
      }
    }

    setActiveTab('transactions');
  };

  // --- BUSINESS LOGIC: ACCOUNTS ---
  const trackDeletedIds = (key: string, ...ids: string[]) => {
    try {
      const saved = localStorage.getItem(key);
      const list: string[] = saved ? JSON.parse(saved) : [];
      let updated = false;
      for (const id of ids) {
        if (!list.includes(id)) {
          list.push(id);
          updated = true;
        }
      }
      if (updated) {
        localStorage.setItem(key, JSON.stringify(list));
      }
    } catch (e) {
      console.error(`Error tracking deleted IDs for ${key}:`, e);
    }
  };

  const handleAddAccount = (newAcc: Omit<Account, 'id'>) => {
    const newId = `acc-${Date.now()}`;
    const nextData = {
      ...data,
      accounts: [...data.accounts, { ...newAcc, id: newId, updatedAt: Date.now() }]
    };
    setData(nextData);
    saveToFirebaseDirectly(nextData);
  };

  const handleUpdateAccount = (updatedAcc: Account) => {
    const nextData = {
      ...data,
      accounts: data.accounts.map(a => a.id === updatedAcc.id ? { ...updatedAcc, updatedAt: Date.now() } : a)
    };
    setData(nextData);
    saveToFirebaseDirectly(nextData);
  };

  const handleDeleteAccount = (id: string) => {
    const count = data.transactions.filter(t => t.accountId === id).length;
    if (count > 0) {
      alert(`Невозможно удалить этот счет. Он используется в ${count} платежных операциях. Сначала перенесите или удалите эти операции.`);
      return;
    }
    const nextData = {
      ...data,
      accounts: data.accounts.filter(a => a.id !== id)
    };
    trackDeletedIds('milli_deleted_account_ids', id);
    setData(nextData);
    saveToFirebaseDirectly(nextData);
  };

  const handleReorderAccounts = (newAccounts: Account[]) => {
    const nextData = {
      ...data,
      accounts: newAccounts.map(a => ({ ...a, updatedAt: Date.now() }))
    };
    setData(nextData);
    saveToFirebaseDirectly(nextData);
  };

  // --- BUSINESS LOGIC: BANK CARDS ---
  const handleAddCard = (newCard: Omit<BankCard, 'id'>) => {
    const id = `card-${Date.now()}`;
    const nextData = {
      ...data,
      cards: [...(data.cards || []), { ...newCard, id, updatedAt: Date.now() }]
    };
    setData(nextData);
    saveToFirebaseDirectly(nextData);
  };

  const handleUpdateCard = (updatedCard: BankCard) => {
    const nextData = {
      ...data,
      cards: (data.cards || []).map(c => c.id === updatedCard.id ? { ...updatedCard, updatedAt: Date.now() } : c)
    };
    setData(nextData);
    saveToFirebaseDirectly(nextData);
  };

  const handleDeleteCard = (id: string) => {
    const nextData = {
      ...data,
      cards: (data.cards || []).filter(c => c.id !== id),
      transactions: data.transactions.map(t => t.cardId === id ? { ...t, cardId: undefined, updatedAt: Date.now() } : t)
    };
    trackDeletedIds('milli_deleted_card_ids', id);
    setData(nextData);
    saveToFirebaseDirectly(nextData);
  };

  // --- BUSINESS LOGIC: CATEGORIES ---
  const handleAddCategory = (newCat: Omit<Category, 'id'>) => {
    const newId = `cat-${Date.now()}`;
    const nextData = {
      ...data,
      categories: [...data.categories, { ...newCat, id: newId, updatedAt: Date.now() }]
    };
    setData(nextData);
    saveToFirebaseDirectly(nextData);
  };

  const handleUpdateCategory = (updatedCat: Category) => {
    const nextData = {
      ...data,
      categories: data.categories.map(c => c.id === updatedCat.id ? { ...updatedCat, updatedAt: Date.now() } : c)
    };
    setData(nextData);
    saveToFirebaseDirectly(nextData);
  };

  const handleDeleteCategory = (id: string) => {
    const count = data.transactions.filter(t => t.categoryId === id).length;
    if (count > 0) {
      alert(`Невозможно удалить эту категорию. К ней привязано ${count} операций расходов или доходов.`);
      return;
    }
    const nextData = {
      ...data,
      categories: data.categories.filter(c => c.id !== id)
    };
    trackDeletedIds('milli_deleted_category_ids', id);
    setData(nextData);
    saveToFirebaseDirectly(nextData);
  };

  // --- BUSINESS LOGIC: TRANSACTIONS & BALANCES (Delta Adjustment Engine) ---
  const trackDeletedTransactionIds = (...ids: string[]) => {
    trackDeletedIds('milli_deleted_tx_ids', ...ids);
  };

  const handleAddTransaction = (newTx: Omit<Transaction, 'id'>) => {
    const tx: Transaction = {
      ...newTx,
      id: `tx-${Date.now()}`,
      updatedAt: Date.now()
    };

    // Modify associated bank account balance
    const updatedAccounts = data.accounts.map(acc => {
      if (acc.id === tx.accountId) {
        const delta = tx.type === 'income' ? tx.amount : -tx.amount;
        return { ...acc, balance: acc.balance + delta };
      }
      return acc;
    });

    const nextData = {
      ...data,
      accounts: updatedAccounts,
      transactions: [tx, ...data.transactions]
    };

    setData(nextData);
    saveToFirebaseDirectly(nextData);
  };

  const handleAddTransfer = (transfer: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    description: string;
    date: string;
  }) => {
    const fromAcc = data.accounts.find(a => a.id === transfer.fromAccountId);
    const toAcc = data.accounts.find(a => a.id === transfer.toAccountId);
    if (!fromAcc || !toAcc) return;

    const txIdFrom = `tx-transfer-out-${Date.now()}`;
    const txIdTo = `tx-transfer-in-${Date.now() + 1}`;

    const txFrom: Transaction = {
      id: txIdFrom,
      accountId: transfer.fromAccountId,
      categoryId: 'cat-other-exp',
      amount: transfer.amount,
      type: 'transfer',
      transferType: 'out',
      transferAccountId: transfer.toAccountId,
      date: transfer.date,
      description: transfer.description.trim() || `Перевод в счет ${toAcc.name}`,
      updatedAt: Date.now()
    };

    const txTo: Transaction = {
      id: txIdTo,
      accountId: transfer.toAccountId,
      categoryId: 'cat-other-inc',
      amount: transfer.amount,
      type: 'transfer',
      transferType: 'in',
      transferAccountId: transfer.fromAccountId,
      date: transfer.date,
      description: transfer.description.trim() || `Перевод со счета ${fromAcc.name}`,
      updatedAt: Date.now()
    };

    const updatedAccounts = data.accounts.map(acc => {
      if (acc.id === transfer.fromAccountId) {
        return { ...acc, balance: acc.balance - transfer.amount };
      }
      if (acc.id === transfer.toAccountId) {
        return { ...acc, balance: acc.balance + transfer.amount };
      }
      return acc;
    });

    const nextData = {
      ...data,
      accounts: updatedAccounts,
      transactions: [txFrom, txTo, ...data.transactions]
    };

    setData(nextData);
    saveToFirebaseDirectly(nextData);
    addToast(`Перевод на сумму ${transfer.amount} ₼ успешно выполнен! 💸`, 'success');
  };

  const handleDeleteTransaction = (id: string) => {
    const txToDelete = data.transactions.find(t => t.id === id);
    if (!txToDelete) return;

    // Check if this is a paired transfer to delete both sides
    const otherTx = txToDelete.type === 'transfer' && txToDelete.transferAccountId
      ? data.transactions.find(t => t.type === 'transfer' && t.accountId === txToDelete.transferAccountId && t.transferAccountId === txToDelete.accountId && t.date === txToDelete.date && t.amount === txToDelete.amount)
      : null;

    // Modify bank account balance in reverse
    const updatedAccounts = data.accounts.map(acc => {
      let balanceAdjust = 0;
      if (acc.id === txToDelete.accountId) {
        const reverseDelta = txToDelete.type === 'income' 
          ? -txToDelete.amount 
          : txToDelete.type === 'expense' 
          ? txToDelete.amount 
          : txToDelete.transferType === 'in' 
          ? -txToDelete.amount 
          : txToDelete.amount;
        balanceAdjust += reverseDelta;
      }
      if (otherTx && acc.id === otherTx.accountId) {
        const reverseDeltaOther = otherTx.type === 'income'
          ? -otherTx.amount
          : otherTx.type === 'expense'
          ? otherTx.amount
          : otherTx.transferType === 'in'
          ? -otherTx.amount
          : otherTx.amount;
        balanceAdjust += reverseDeltaOther;
      }
      return balanceAdjust !== 0 ? { ...acc, balance: acc.balance + balanceAdjust } : acc;
    });

    // Log deleted IDs for Google Sheets delta sync
    if (otherTx) {
      trackDeletedTransactionIds(id, otherTx.id);
    } else {
      trackDeletedTransactionIds(id);
    }

    const nextData = {
      ...data,
      accounts: updatedAccounts,
      transactions: data.transactions.filter(t => t.id !== id && (!otherTx || t.id !== otherTx.id))
    };

    setData(nextData);
    saveToFirebaseDirectly(nextData);
  };

  const handleUpdateTransaction = (updatedTx: Transaction) => {
    // Intercept to enable opening editing from within list directly
    if ((updatedTx as any).displayInEditFormOnly) {
      setEditingTransaction(updatedTx);
      return;
    }

    const originalTx = data.transactions.find(t => t.id === updatedTx.id);
    if (!originalTx) return;

    let finalAccounts = [...data.accounts];
    let finalTransactions = [...data.transactions];

    // Case A: BOTH original and updated are transfers
    if (originalTx.type === 'transfer' && updatedTx.type === 'transfer') {
      // Find counterpart of original transfer
      const counterpartTx = finalTransactions.find(t =>
        t.type === 'transfer' &&
        t.id !== originalTx.id &&
        t.accountId === originalTx.transferAccountId &&
        t.transferAccountId === originalTx.accountId
      );

      // Revert originalTx balance
      finalAccounts = finalAccounts.map(acc => {
        if (acc.id === originalTx.accountId) {
          const reverseDelta = originalTx.transferType === 'in' ? -originalTx.amount : originalTx.amount;
          return { ...acc, balance: acc.balance + reverseDelta };
        }
        return acc;
      });

      // Revert counterpartTx balance (if found)
      if (counterpartTx) {
        finalAccounts = finalAccounts.map(acc => {
          if (acc.id === counterpartTx.accountId) {
            const reverseDelta = counterpartTx.transferType === 'in' ? -counterpartTx.amount : counterpartTx.amount;
            return { ...acc, balance: acc.balance + reverseDelta };
          }
          return acc;
        });
      }

      // Apply updatedTx balance
      finalAccounts = finalAccounts.map(acc => {
        if (acc.id === updatedTx.accountId) {
          const delta = updatedTx.transferType === 'in' ? updatedTx.amount : -updatedTx.amount;
          return { ...acc, balance: acc.balance + delta };
        }
        return acc;
      });

      // Apply counterpart balance (derived from updatedTx)
      if (updatedTx.transferAccountId) {
        finalAccounts = finalAccounts.map(acc => {
          if (acc.id === updatedTx.transferAccountId) {
            // counterpart has inverted transferType
            const counterpartTransferType = updatedTx.transferType === 'out' ? 'in' : 'out';
            const delta = counterpartTransferType === 'in' ? updatedTx.amount : -updatedTx.amount;
            return { ...acc, balance: acc.balance + delta };
          }
          return acc;
        });
      }

      // Update transactions
      finalTransactions = finalTransactions.map(t => {
        if (t.id === updatedTx.id) {
          return updatedTx;
        }
        if (counterpartTx && t.id === counterpartTx.id) {
          return {
            ...counterpartTx,
            accountId: updatedTx.transferAccountId || '',
            transferAccountId: updatedTx.accountId,
            type: 'transfer',
            transferType: updatedTx.transferType === 'out' ? 'in' : 'out',
            categoryId: updatedTx.transferType === 'out' ? 'cat-other-inc' : 'cat-other-exp',
            amount: updatedTx.amount,
            date: updatedTx.date,
            description: updatedTx.description,
          };
        }
        return t;
      });
    }
    // Case B: Convert regular transaction to a transfer (was not, now is)
    else if (originalTx.type !== 'transfer' && updatedTx.type === 'transfer') {
      // Revert originalTx balance
      finalAccounts = finalAccounts.map(acc => {
        if (acc.id === originalTx.accountId) {
          const reverseDelta = originalTx.type === 'income' ? -originalTx.amount : originalTx.amount;
          return { ...acc, balance: acc.balance + reverseDelta };
        }
        return acc;
      });

      // Apply updatedTx (the OUT/IN side of transfer we are updating)
      finalAccounts = finalAccounts.map(acc => {
        if (acc.id === updatedTx.accountId) {
          const delta = updatedTx.transferType === 'in' ? updatedTx.amount : -updatedTx.amount;
          return { ...acc, balance: acc.balance + delta };
        }
        return acc;
      });

      // Create and apply target counterpart (the opposite side)
      const counterpartId = `tx-transfer-${updatedTx.transferType === 'out' ? 'in' : 'out'}-${Date.now()}`;
      const counterpartTx: Transaction = {
        id: counterpartId,
        accountId: updatedTx.transferAccountId || '',
        transferAccountId: updatedTx.accountId,
        type: 'transfer',
        transferType: updatedTx.transferType === 'out' ? 'in' : 'out',
        categoryId: updatedTx.transferType === 'out' ? 'cat-other-inc' : 'cat-other-exp',
        amount: updatedTx.amount,
        date: updatedTx.date,
        description: updatedTx.description,
      };

      finalAccounts = finalAccounts.map(acc => {
        if (acc.id === counterpartTx.accountId) {
          const delta = counterpartTx.transferType === 'in' ? counterpartTx.amount : -counterpartTx.amount;
          return { ...acc, balance: acc.balance + delta };
        }
        return acc;
      });

      // Replace original with updated, and append counterpart
      finalTransactions = finalTransactions.map(t => t.id === updatedTx.id ? updatedTx : t);
      finalTransactions.push(counterpartTx);
    }
    // Case C: Convert transfer to a regular transaction (was, now is not)
    else if (originalTx.type === 'transfer' && updatedTx.type !== 'transfer') {
      // Find the old counterpart of the original transfer to delete
      const counterpartTx = finalTransactions.find(t =>
        t.type === 'transfer' &&
        t.id !== originalTx.id &&
        t.accountId === originalTx.transferAccountId &&
        t.transferAccountId === originalTx.accountId
      );

      // Revert originalTx balance
      finalAccounts = finalAccounts.map(acc => {
        if (acc.id === originalTx.accountId) {
          const reverseDelta = originalTx.transferType === 'in' ? -originalTx.amount : originalTx.amount;
          return { ...acc, balance: acc.balance + reverseDelta };
        }
        return acc;
      });

      // Revert counterpartTx balance (if found) and remove it
      if (counterpartTx) {
        finalAccounts = finalAccounts.map(acc => {
          if (acc.id === counterpartTx.accountId) {
            const reverseDelta = counterpartTx.transferType === 'in' ? -counterpartTx.amount : counterpartTx.amount;
            return { ...acc, balance: acc.balance + reverseDelta };
          }
          return acc;
        });
        // Filter out the counterpart from transactions
        finalTransactions = finalTransactions.filter(t => t.id !== counterpartTx.id);
        trackDeletedTransactionIds(counterpartTx.id);
      }

      // Apply updatedTx (regular income/expense)
      finalAccounts = finalAccounts.map(acc => {
        if (acc.id === updatedTx.accountId) {
          const delta = updatedTx.type === 'income' ? updatedTx.amount : -updatedTx.amount;
          return { ...acc, balance: acc.balance + delta };
        }
        return acc;
      });

      // Replace original with updated
      finalTransactions = finalTransactions.map(t => t.id === updatedTx.id ? updatedTx : t);
    }
    // Case D: Neither is/was a transfer (normal single tx updates)
    else {
      // Revert originalTx balance
      finalAccounts = finalAccounts.map(acc => {
        if (acc.id === originalTx.accountId) {
          const reverseDelta = originalTx.type === 'income' ? -originalTx.amount : originalTx.amount;
          return { ...acc, balance: acc.balance + reverseDelta };
        }
        return acc;
      });

      // Apply updatedTx balance
      finalAccounts = finalAccounts.map(acc => {
        if (acc.id === updatedTx.accountId) {
          const delta = updatedTx.type === 'income' ? updatedTx.amount : -updatedTx.amount;
          return { ...acc, balance: acc.balance + delta };
        }
        return acc;
      });

      // Replace in transactions list
      finalTransactions = finalTransactions.map(t => t.id === updatedTx.id ? updatedTx : t);
    }

    const now = Date.now();
    const finalTransactionsWithTimestamps = finalTransactions.map(newTx => {
      const oldTx = data.transactions.find(t => t.id === newTx.id);
      if (!oldTx) {
        return { ...newTx, updatedAt: now };
      }
      const changed = 
        oldTx.amount !== newTx.amount ||
        oldTx.date !== newTx.date ||
        oldTx.description !== newTx.description ||
        oldTx.accountId !== newTx.accountId ||
        oldTx.categoryId !== newTx.categoryId ||
        oldTx.cardId !== newTx.cardId ||
        oldTx.transferAccountId !== newTx.transferAccountId ||
        oldTx.transferType !== newTx.transferType;
      
      if (changed) {
        return { ...newTx, updatedAt: now };
      }
      return newTx;
    });

    const nextData = {
      ...data,
      accounts: finalAccounts,
      transactions: finalTransactionsWithTimestamps
    };

    setData(nextData);
    saveToFirebaseDirectly(nextData);
    setEditingTransaction(null);
    if (lastTabBeforeEditRef.current) {
      setActiveTab(lastTabBeforeEditRef.current);
      lastTabBeforeEditRef.current = null;
    }
  };

  // --- BUSINESS LOGIC: BUDGETS ---
  const handleSaveBudget = (categoryId: string, limitAmount: number) => {
    const exists = data.budgets.some(b => b.categoryId === categoryId);
    let newBudgets;
    if (exists) {
      newBudgets = data.budgets.map(b => b.categoryId === categoryId ? { categoryId, limitAmount, updatedAt: Date.now() } : b);
    } else {
      newBudgets = [...data.budgets, { categoryId, limitAmount, updatedAt: Date.now() }];
    }

    const nextData = {
      ...data,
      budgets: newBudgets
    };

    setData(nextData);
    saveToFirebaseDirectly(nextData);
  };

  const handleDeleteBudget = (categoryId: string) => {
    const nextData = {
      ...data,
      budgets: data.budgets.filter(b => b.categoryId !== categoryId)
    };
    trackDeletedIds('milli_deleted_budget_ids', categoryId);
    setData(nextData);
    saveToFirebaseDirectly(nextData);
  };

  // Reset Helper to let user easily restore original HoneyMoney imported state
  const handleResetData = () => {
    if (confirm('Вы уверены, что хотите сбросить все данные к вашим импортированным записям HoneyMoney? Все текущие временные изменения будут заменены исходным слепком экспорта.')) {
      setData(initialFinanceData);
      saveToFirebaseDirectly(initialFinanceData);
      setActiveTab('overview');
      setPreselectedDate(null);
      setEditingTransaction(null);
      addToast("Данные успешно сброшены к состоянию HoneyMoney! ₼", "success");
    }
  };

  // Header quick assets metrics
  const overallCapital = data.accounts.reduce((sum, a) => sum + a.balance, 0);

  // Check if loaded data is an old demo version (e.g. contains "Капитал Банк") so we can ask the user to migrate
  const hasOldData = data.accounts.some(acc => acc.name.includes('Капитал') || acc.name.includes('BakuKart') || acc.name.includes('Чайхана'));

  return (
    <div className={`min-h-screen flex flex-col font-sans antialiased selection:bg-teal-500 selection:text-slate-950 relative overflow-x-hidden transition-colors duration-200 ${
      theme === 'dark'
        ? 'bg-slate-950 text-slate-100 dark'
        : 'bg-slate-50 text-slate-900'
    }`} id="main-root-container">
      
      {/* Decorative Blur Blobs for Frosted Glass Backdrop effect */}
      <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-100px] right-[-100px] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* 1. Header Navigation Bar */}
      <header className={`sticky top-0 backdrop-blur-2xl border-b z-50 px-2 sm:px-4 lg:px-5 py-1.5 sm:py-2 flex items-center justify-between gap-2.5 transition-colors duration-200 ${
        theme === 'dark'
          ? 'bg-slate-950/40 border-white/10'
          : 'bg-white/70 border-slate-200'
      }`}>
        
        {/* Logo and Azerbaijan context branding */}
        <div className="flex items-center gap-2 z-10 min-w-0 flex-1">
          <div className="w-8 h-8 bg-teal-400 rounded-lg flex items-center justify-center text-slate-950 font-display font-extrabold text-base shadow-md shadow-teal-400/20 shrink-0">
            ₼
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1 leading-none flex-wrap">
              <h1 className={`text-xs sm:text-sm font-display font-black tracking-tight truncate ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>MilliFinance</h1>
              <div className="flex items-center gap-0.5 shrink-0">
                <span className={`flex items-center gap-0.5 px-0.9 py-0.2 rounded text-[7px] font-bold border ${
                  theme === 'dark'
                    ? 'bg-white/10 border-white/5 text-teal-300'
                    : 'bg-slate-100 border-slate-200 text-teal-800'
                }`}>
                  AZN
                </span>
                <span className={`flex items-center gap-0.5 px-0.9 py-0.2 rounded text-[7px] font-bold border ${
                  theme === 'dark'
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/5'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`} title="Все ваши данные хранятся конфиденциально и безопасно на вашем устройстве">
                  🔒 Локально
                </span>
                {gAccessToken && !isGoogleTokenExpired() ? (
                  isGoogleSyncing || isInitialSyncing ? (
                    <span 
                      className={`flex items-center gap-1 px-1 py-0.2 rounded text-[7px] font-bold border animate-pulse ${
                        theme === 'dark'
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/10'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                      title="Выполняется фоновое сохранение или загрузка данных из Google Sheets"
                    >
                      <RefreshCw size={7} className="animate-spin" />
                      Синхронизация...
                    </span>
                  ) : (
                    <span 
                      className={`flex items-center gap-1 px-1 py-0.2 rounded text-[7px] font-bold border ${
                        theme === 'dark'
                          ? 'bg-teal-500/15 text-teal-300 border-teal-500/5'
                          : 'bg-teal-50 text-teal-700 border-teal-200'
                      }`}
                      title="Ваша сессия Google Sheets активна, изменения сохраняются автоматически"
                    >
                      ☁️ Синхронизировано
                    </span>
                  )
                ) : currentUser ? (
                  <button 
                    onClick={handleGoogleLogin}
                    className={`flex items-center gap-1.5 px-1.5 py-0.2 rounded text-[7px] font-bold border cursor-pointer transition-all ${
                      theme === 'dark'
                        ? 'bg-amber-500/10 text-amber-300 border-amber-500/20 hover:bg-amber-500/20'
                        : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                    }`}
                    title="Google-сессия приостановлена, новые транзакции временно пишутся локально. Нажмите, чтобы быстро обновить доступ в один клик!"
                    id="header-google-renew-btn"
                  >
                    ☁️ Локально (нажмите для синхронизации)
                  </button>
                ) : (
                  <span 
                    className={`flex items-center gap-1 px-1 py-0.2 rounded text-[7px] font-bold border ${
                      theme === 'dark'
                        ? 'bg-slate-500/15 text-slate-400 border-white/5'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                    title="Вы не авторизованы в Google Sheets. Изменения сохраняются на этом телефоне"
                  >
                    ☁️ Без облака
                  </span>
                )}
              </div>
            </div>
            <p className={`text-[9px] sm:text-[10px] mt-0.5 truncate leading-none ${
              theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
            }`}>Умный домашний бюджет Азербайджана</p>
          </div>
        </div>

        {/* Global stats block (Overall Capital indicator) and settings reset button */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 z-10">
          <div className="text-right">
            <span className={`block text-[7.5px] sm:text-[8.5px] font-bold uppercase tracking-wider leading-none ${
              theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
            }`}>Всего</span>
            <span className={`text-xs sm:text-sm font-display font-black tracking-tight leading-none block mt-0.5 ${
              theme === 'dark' ? 'text-teal-300' : 'text-teal-650 font-extrabold'
            }`}>
              {overallCapital.toFixed(0)} ₼
            </span>
          </div>

          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={`flex items-center justify-center p-1.5 border rounded-lg transition-all cursor-pointer shrink-0 ${
              theme === 'dark'
                ? 'border-white/10 hover:border-teal-500/50 bg-white/5 hover:bg-white/10 text-amber-400'
                : 'border-slate-200 hover:border-teal-500/50 bg-white hover:bg-slate-100 text-indigo-600 shadow-xs'
            }`}
            title={theme === 'dark' ? 'Переключить на светлую тему' : 'Переключить на темную тему'}
          >
            {theme === 'dark' ? <Sun size={12} className="text-amber-400" /> : <Moon size={12} className="text-indigo-600" />}
          </button>

          <button
            onClick={handleResetData}
            className={`flex items-center justify-center gap-0.5 p-1 sm:px-2 py-1 border text-[9px] sm:text-[10.5px] font-semibold rounded-lg transition-all cursor-pointer ${
              theme === 'dark'
                ? 'border-white/10 hover:border-rose-500/50 bg-white/5 hover:bg-rose-500/10 text-slate-350 hover:text-rose-400'
                : 'border-slate-200 hover:border-rose-500/50 bg-white hover:bg-rose-550/10 text-slate-600 hover:text-rose-600 shadow-xs'
            }`}
            title="Сбросить все до реального экспорта HoneyMoney"
          >
            <Flame size={11} className="text-rose-500" />
            <span className="hidden sm:inline">Сбросить</span>
          </button>
        </div>

      </header>

      {/* 2. Primary Layout Grid */}
      <main className="flex-1 max-w-none w-full mx-auto p-2 sm:p-4 lg:p-5 space-y-5 z-10 pb-24">

        {/* HoneyMoney Data Alert Banner */}
        {hasOldData && (
          <div className="bg-gradient-to-r from-teal-500/20 via-indigo-500/20 to-slate-900/50 backdrop-blur-md rounded-2xl p-6 border border-teal-500/40 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5 animate-pulse" id="honeymoney-migration-banner">
            <div className="flex items-start gap-3.5">
              <div className="p-3 bg-teal-400 text-slate-950 rounded-2xl shadow-lg shadow-teal-500/10 shrink-0">
                <RefreshCw size={24} className="animate-spin" style={{ animationDuration: '6s' }} />
              </div>
              <div>
                <h3 className="font-display font-black text-white text-lg leading-tight">Обнаружен старый демонстрационный шаблон!</h3>
                <p className="text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
                  Ваш браузер загрузил старые демонстрационные данные (Капитал Банк, Чайхана). Мы успешно импортировали и сконвертировали ваши реальные данные экспорта <b>HoneyMoney ({initialFinanceData.transactions.length} финансовых операций, реальные счета Самиры и Ильгара, ABB и ASB карты за 2022–2026 годы)</b>! Нажмите кнопку справа, чтобы мгновенно применить реальные данные.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                if (confirm('Внимание: Вы уверены, что хотите применить реальные данные экспорта HoneyMoney? Ваши старые локальные данные будут перезаписаны.')) {
                  setData(initialFinanceData);
                  addToast("Ваши реальные данные HoneyMoney успешно применены! 🎉", "success");
                }
              }}
              className="w-full md:w-auto px-6 py-3.5 bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 text-slate-950 font-extrabold rounded-2xl transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider text-xs font-display shrink-0"
            >
              Применить данные HoneyMoney ₼
            </button>
          </div>
        )}

        {/* 3. Panel Deck Wrapper (conditionally renders active component based on navigation tab) */}
        <div className="transition-all duration-300" id="deck-wrapper">
          {activeTab === 'overview' && (
            <DashboardOverview
              transactions={data.transactions}
              categories={data.categories}
              accounts={data.accounts}
              budgets={data.budgets}
              onQuickNavigate={handleQuickNavigate}
              currentUser={currentUser}
              gAccessToken={gAccessToken}
              onGoogleLogin={handleGoogleLogin}
              onGoogleLogout={handleGoogleLogout}
              onAddTransaction={handleAddTransaction}
              onAddTransfer={handleAddTransfer}
              addToast={addToast}
              showMode="quick-records"
              theme={theme}
              onReorderAccounts={handleReorderAccounts}
            />
          )}

          {activeTab === 'analytics' && (
            <DashboardOverview
              transactions={data.transactions}
              categories={data.categories}
              accounts={data.accounts}
              budgets={data.budgets}
              onQuickNavigate={handleQuickNavigate}
              currentUser={currentUser}
              gAccessToken={gAccessToken}
              onGoogleLogin={handleGoogleLogin}
              onGoogleLogout={handleGoogleLogout}
              onAddTransaction={handleAddTransaction}
              onAddTransfer={handleAddTransfer}
              addToast={addToast}
              showMode="analytics"
              theme={theme}
              onReorderAccounts={handleReorderAccounts}
            />
          )}

          {activeTab === 'transactions' && (
            <TransactionPanel
              transactions={data.transactions}
              categories={data.categories}
              accounts={data.accounts}
              cards={data.cards || []}
              onAddTransaction={handleAddTransaction}
              onUpdateTransaction={handleUpdateTransaction}
              onDeleteTransaction={handleDeleteTransaction}
              preselectedDate={preselectedDate}
              onClearPreselectedDate={() => setPreselectedDate(null)}
              editingTransaction={editingTransaction}
              onCancelEditing={() => {
                setEditingTransaction(null);
                if (lastTabBeforeEditRef.current) {
                  setActiveTab(lastTabBeforeEditRef.current);
                  lastTabBeforeEditRef.current = null;
                }
              }}
              onAddTransfer={handleAddTransfer}
              theme={theme}
            />
          )}

          {activeTab === 'calendar' && (
            <CalendarPanel
              transactions={data.transactions}
              categories={data.categories}
              accounts={data.accounts}
              onAddTransactionOnDate={handleAddTransactionOnDate}
              onEditTransaction={handleEditTransactionStart}
              onAddTransaction={handleAddTransaction}
              onAddTransfer={handleAddTransfer}
              onUpdateTransaction={handleUpdateTransaction}
              onDeleteTransaction={handleDeleteTransaction}
              currentDate={calendarCurrentDate}
              setCurrentDate={setCalendarCurrentDate}
              clickedDate={calendarClickedDate}
              setClickedDate={setCalendarClickedDate}
              theme={theme}
            />
          )}

          {activeTab === 'accounts-categories' && (
            <div className="space-y-6">
              {/* Internal sub-tab selector for accounts and budgeting limits */}
              <div className={`flex p-1 rounded-2xl border max-w-sm sm:max-w-md transition-colors duration-200 ${
                theme === 'dark'
                  ? 'bg-white/5 border-white/10'
                  : 'bg-slate-100 border-slate-200 shadow-xs'
              }`}>
                <button
                  onClick={() => setAccountsSubTab('accounts')}
                  className={`flex-1 py-1.5 px-3 text-[11.5px] sm:text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    accountsSubTab === 'accounts'
                      ? 'bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 font-black shadow-md'
                      : theme === 'dark'
                        ? 'text-slate-400 hover:text-white'
                        : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Счета и Категории
                </button>
                <button
                  onClick={() => setAccountsSubTab('budget')}
                  className={`flex-1 py-1.5 px-3 text-[11.5px] sm:text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    accountsSubTab === 'budget'
                      ? 'bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 font-black shadow-md'
                      : theme === 'dark'
                        ? 'text-slate-400 hover:text-white'
                        : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Лимиты Бюджета
                </button>
                <button
                  onClick={() => setAccountsSubTab('sync')}
                  className={`flex-1 py-1.5 px-3 text-[11.5px] sm:text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    accountsSubTab === 'sync'
                      ? 'bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 font-black shadow-md'
                      : theme === 'dark'
                        ? 'text-slate-400 hover:text-white'
                        : 'text-slate-500 hover:text-slate-900'
                  }`}
                  id="tab-btn-sync"
                >
                  Синхронизация Google
                </button>
              </div>

              {accountsSubTab === 'accounts' && (
                <AccountsCategoriesPanel
                  accounts={data.accounts}
                  categories={data.categories}
                  cards={data.cards || []}
                  onAddAccount={handleAddAccount}
                  onUpdateAccount={handleUpdateAccount}
                  onDeleteAccount={handleDeleteAccount}
                  onAddCategory={handleAddCategory}
                  onUpdateCategory={handleUpdateCategory}
                  onDeleteCategory={handleDeleteCategory}
                  onAddCard={handleAddCard}
                  onUpdateCard={handleUpdateCard}
                  onDeleteCard={handleDeleteCard}
                  theme={theme}
                  onThemeChange={setTheme}
                />
              )}
              {accountsSubTab === 'budget' && (
                <BudgetingPanel
                  transactions={data.transactions}
                  categories={data.categories}
                  budgets={data.budgets}
                  onSaveBudget={handleSaveBudget}
                  onDeleteBudget={handleDeleteBudget}
                  theme={theme}
                />
              )}
              {accountsSubTab === 'sync' && (
                <GoogleSheetsSyncPanel
                  financeData={data}
                  currentUser={currentUser}
                  gAccessToken={gAccessToken}
                  onGoogleLogin={handleGoogleLogin}
                  onGoogleLogout={handleGoogleLogout}
                  onGoogleSessionExpired={handleGoogleSessionExpired}
                  onSyncSuccess={(mergedData) => {
                    setData(mergedData);
                    saveToFirebaseDirectly(mergedData);
                  }}
                  theme={theme}
                  addToast={addToast}
                />
              )}
            </div>
          )}
        </div>

      </main>

      {/* Navigation tabs row: fixed bottom nav bar (always visible, not scrollable, optimized for smartphones) */}
      <div 
        className={`fixed bottom-0 left-0 right-0 w-full border-t px-1.5 pt-1 flex justify-around items-center gap-0.5 z-[999] transition-colors duration-200 ${
          theme === 'dark'
            ? 'bg-[#0f172a]/95 backdrop-blur-md border-white/10 text-slate-100 shadow-[0_-8px_30px_rgba(0,0,0,0.6)]'
            : 'bg-white/95 backdrop-blur-md border-slate-200/80 text-slate-800 shadow-[0_-8px_30px_rgba(0,0,0,0.08)]'
        }`}
        id="fixed-bottom-nav"
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 5px)'
        }}
      >
        <button
          onClick={() => handleQuickNavigate('overview')}
          className={`flex flex-col items-center justify-center py-0.5 px-0.5 rounded-lg transition-all flex-1 min-w-0 select-none cursor-pointer group ${
            activeTab === 'overview'
              ? theme === 'dark'
                ? 'bg-teal-500/15 text-teal-300 border border-teal-500/20 shadow-inner font-bold'
                : 'bg-teal-500/10 text-teal-600 border border-teal-500/20 shadow-sm font-bold'
              : theme === 'dark'
                ? 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
          }`}
        >
          <LayoutDashboard size={16} className="transition-transform group-active:scale-90" />
          <span className="text-[9px] sm:text-[10.5px] font-bold tracking-normal mt-0.5 truncate">Главная</span>
        </button>

        <button
          onClick={() => handleQuickNavigate('transactions')}
          className={`flex flex-col items-center justify-center py-0.5 px-0.5 rounded-lg transition-all flex-1 min-w-0 select-none relative cursor-pointer group ${
            activeTab === 'transactions'
              ? theme === 'dark'
                ? 'bg-teal-500/15 text-teal-300 border border-teal-500/20 shadow-inner font-bold'
                : 'bg-teal-500/10 text-teal-600 border border-teal-500/20 shadow-sm font-bold'
              : theme === 'dark'
                ? 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
          }`}
        >
          <ReceiptText size={16} className="transition-transform group-active:scale-90" />
          <span className="text-[9px] sm:text-[10.5px] font-bold tracking-normal mt-0.5 truncate">Журнал</span>
          {preselectedDate && (
            <span className="absolute top-1 right-1/2 translate-x-3 w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
          )}
        </button>

        <button
          onClick={() => handleQuickNavigate('calendar')}
          className={`flex flex-col items-center justify-center py-0.5 px-0.5 rounded-lg transition-all flex-1 min-w-0 select-none cursor-pointer group ${
            activeTab === 'calendar'
              ? theme === 'dark'
                ? 'bg-teal-500/15 text-teal-300 border border-teal-500/20 shadow-inner font-bold'
                : 'bg-teal-500/10 text-teal-600 border border-teal-500/20 shadow-sm font-bold'
              : theme === 'dark'
                ? 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
          }`}
        >
          <Calendar size={16} className="transition-transform group-active:scale-90" />
          <span className="text-[9px] sm:text-[10.5px] font-bold tracking-normal mt-0.5 truncate">Календарь</span>
        </button>

        <button
          onClick={() => handleQuickNavigate('analytics')}
          className={`flex flex-col items-center justify-center py-0.5 px-0.5 rounded-lg transition-all flex-1 min-w-0 select-none cursor-pointer group ${
            activeTab === 'analytics'
              ? theme === 'dark'
                ? 'bg-teal-500/15 text-teal-300 border border-teal-500/20 shadow-inner font-bold'
                : 'bg-teal-500/10 text-teal-600 border border-teal-500/20 shadow-sm font-bold'
              : theme === 'dark'
                ? 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
          }`}
        >
          <TrendingUp size={16} className="transition-transform group-active:scale-90" />
          <span className="text-[9px] sm:text-[10.5px] font-bold tracking-normal mt-0.5 truncate">Аналитика</span>
        </button>

        <button
          onClick={() => handleQuickNavigate('accounts-categories')}
          className={`flex flex-col items-center justify-center py-0.5 px-0.5 rounded-lg transition-all flex-1 min-w-0 select-none cursor-pointer group ${
            activeTab === 'accounts-categories'
              ? theme === 'dark'
                ? 'bg-teal-500/15 text-teal-300 border border-teal-500/20 shadow-inner font-bold'
                : 'bg-teal-500/10 text-teal-650 border border-teal-500/20 shadow-sm font-bold'
              : theme === 'dark'
                ? 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
          }`}
        >
          <Settings size={16} className="transition-transform group-active:scale-90" />
          <span className="text-[9px] sm:text-[10.5px] font-bold tracking-normal mt-0.5 truncate">Счета и Бюджет</span>
        </button>
      </div>

      {/* Floating Budget & Authorization Toast Notifications stack */}
      <div className="fixed top-24 right-4 sm:right-8 space-y-3 z-[9999] max-w-sm w-full pointer-events-none" id="toasts-portal">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md shadow-2xl transition-all duration-300 animate-slide-in ${
              toast.type === 'critical'
                ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
                : toast.type === 'warning'
                ? 'bg-amber-950/90 border-amber-500/50 text-amber-200'
                : 'bg-teal-950/90 border-teal-500/50 text-teal-200'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'critical' ? (
                <XCircle size={18} className="text-rose-400" />
              ) : toast.type === 'warning' ? (
                <AlertTriangle size={18} className="text-amber-400" />
              ) : (
                <CheckCircle size={18} className="text-teal-400" />
              )}
            </div>
            <div className="flex-1 text-xs font-semibold leading-relaxed">
              {toast.message}
            </div>
            <button
              onClick={() => handleDismissToast(toast.id)}
              className="shrink-0 text-slate-400 hover:text-white p-0.5 rounded-lg active:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* 4. Elegant footer */}
      <footer className="bg-slate-950/40 backdrop-blur-md border-t border-white/5 py-6 mt-12 z-10">
        <div className="max-w-none w-full px-4 sm:px-6 lg:px-8 mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>MilliFinance 🇦🇿 © 2026. Разработано на русском языке для жителей Азербайджана.</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-slate-300">
            <span>Валюта по умолчанию: Азербайджанский манат (₼, AZN)</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
