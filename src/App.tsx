import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { FinanceData, Transaction, Account, Category, BankCard } from './types';
import { initialFinanceData } from './initialData';
import { DashboardOverview } from './components/DashboardOverview';
import { TransactionPanel } from './components/TransactionPanel';
import { AccountsCategoriesPanel } from './components/AccountsCategoriesPanel';
import { BudgetingPanel } from './components/BudgetingPanel';
import { CalendarPanel } from './components/CalendarPanel';
import { LayoutDashboard, ReceiptText, Calendar, SlidersHorizontal, Settings, Flame, Bell, AlertTriangle, XCircle, CheckCircle, Info, LogIn, LogOut, ShieldAlert, X, RefreshCw } from 'lucide-react';
import { initAuth, logout, googleSignIn, db } from './googleAuth';
import { User } from 'firebase/auth';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { getUserFinanceData, saveUserFinanceData, testConnection, subscribeToUserFinanceData, reinitUserFinanceData } from './firebaseService';
import { parseAndStandardizeJsonToFinanceData } from './honeyJsonConverter';
import firebaseConfig from '../firebase-applet-config.json';

export default function App() {
  
  // 1. Initial State starts with parsed local storage or fallback to HoneyMoney JSON data (6572 transactions)
  const [data, setData] = useState<FinanceData>(() => {
    const saved = localStorage.getItem('milli_finance_data_v8_realonly_clean');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.transactions) && parsed.transactions.length > 0) {
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

  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    testConnection();
  }, []);

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

  // Intercollegiate states passing to support instant add-on-day or edits
  const [preselectedDate, setPreselectedDate] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Google Sheets Authentication Integration state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [gAccessToken, setGAccessToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authErrorCode, setAuthErrorCode] = useState<string | null>(null);
  const [showAuthInstructions, setShowAuthInstructions] = useState(false);
  const [firebaseSyncError, setFirebaseSyncError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Subscribe to Firebase Firestore user document for real-time synchronization between multiple devices
  useEffect(() => {
    if (!currentUser) {
      isLoadedFromFirebase.current = false;
      setFirebaseSyncError(null);
      lastFetchedDataRef.current = null;
      return;
    }

    setIsFirebaseLoading(true);
    setFirebaseSyncError(null);

    const unsubscribe = subscribeToUserFinanceData(
      currentUser.uid,
      async (cloudData) => {
        const stringifiedCloud = JSON.stringify(cloudData);
        
        // If active Firestore collection of transactions is empty, seed it with the parse-time initialFinanceData (derived from JSON)
        const isDbEmptyOfTransactions = cloudData.transactions.length === 0;

        if (isDbEmptyOfTransactions) {
          lastFetchedDataRef.current = JSON.stringify(initialFinanceData);
          setData(initialFinanceData);
          try {
            await reinitUserFinanceData(currentUser.uid, currentUser.email || "", initialFinanceData);
            addToast("Все данные и транзакции из honey_export.json импортированы в Firebase! ☁️🎉", "success");
          } catch (err: any) {
            console.error("Ошибка инициализации данных в Firebase:", err);
            addToast(`Ошибка автоимпорта JSON: ${err.message || err}`, "warning" as any);
          }
        } else if (stringifiedCloud !== lastFetchedDataRef.current) {
          // Only update local state if it differs from what was last loaded/saved to prevent cycles
          setData(cloudData);
          lastFetchedDataRef.current = stringifiedCloud;
          addToast("Синхронизация с облаком успешна! ☁️🔄", "success");
        }
        setIsFirebaseLoading(false);
        isLoadedFromFirebase.current = true;
      },
      (err: any) => {
        console.error('Ошибка синхронизации данных из Firebase:', err);
        let msg = err?.message || String(err);
        try {
          const parsed = JSON.parse(msg);
          msg = parsed.error || msg;
        } catch {}
        setFirebaseSyncError(msg);
        addToast(`Ошибка подключения к Firebase: ${msg}`, "warning" as any);
        setIsFirebaseLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  // Sync state to LocalStorage for offline capability and local testing
  useEffect(() => {
    localStorage.setItem('milli_finance_data_v8_realonly_clean', JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setGAccessToken(token);
        setNeedsAuth(false);
        setIsAuthLoading(false);
      },
      () => {
        setCurrentUser(null);
        setGAccessToken(null);
        setNeedsAuth(true);
        setIsAuthLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setAuthError(null);
      setAuthErrorCode(null);
      const result = await googleSignIn();
      if (result) {
        setCurrentUser(result.user);
        setGAccessToken(result.accessToken);
        setNeedsAuth(false);
        addToast("Вход выполнен успешно! Данные сохранены в Firebase.", "success" as any);
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
    if (currentUser) {
      try {
        setIsFirebaseLoading(true);
        const previousDataStr = lastFetchedDataRef.current;
        const previousData = previousDataStr ? JSON.parse(previousDataStr) : null;
        await saveUserFinanceData(currentUser.uid, currentUser.email || "", nextData, previousData);
        lastFetchedDataRef.current = JSON.stringify(nextData);
        setFirebaseSyncError(null);
      } catch (err: any) {
        console.error("Ошибка сохранения в Firebase:", err);
        let msg = err?.message || String(err);
        try {
          const parsed = JSON.parse(msg);
          msg = parsed.error || msg;
        } catch {}
        setFirebaseSyncError(msg);
        addToast(`Ошибка сохранения в Firebase: ${msg}`, 'warning' as any);
      } finally {
        setIsFirebaseLoading(false);
      }
    }
  };

  const handleForceImportCSVToFirebase = async () => {
    if (!currentUser) return;
    if (confirm(`Вы уверены, что хотите принудительно залить все данные HoneyMoney из файла honey_export.json напрямую в базу данных Firebase? Это полностью удалит все старые транзакции и перезапишет счета на свежие данные (${initialFinanceData.transactions.length} операций).`)) {
      setIsFirebaseLoading(true);
      setFirebaseSyncError(null);
      try {
        addToast(`Старт импорта JSON... Запись всех ${initialFinanceData.transactions.length} транзакций в Firebase Firestore с полной очисткой старых записей... ⏳`, "success");
        await reinitUserFinanceData(currentUser.uid, currentUser.email || "", initialFinanceData);
        lastFetchedDataRef.current = JSON.stringify(initialFinanceData);
        setData(initialFinanceData);
        addToast("Все данные из honey_export.json успешно залиты в Firebase! Старые данные удалены. ☁️🎉", "success");
      } catch (err: any) {
        console.error("Ошибка принудительного импорта JSON в Firebase:", err);
        let msg = err?.message || String(err);
        try {
          const parsed = JSON.parse(msg);
          msg = parsed.error || msg;
        } catch {}
        setFirebaseSyncError(msg);
        addToast(`Не удалось залить JSON: ${msg}`, "critical" as any);
      } finally {
        setIsFirebaseLoading(false);
      }
    }
  };

  const handleUploadCustomJson = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isCloud = !!currentUser;
    const confirmMessage = isCloud 
      ? `Вы уверены, что хотите загрузить файл "${file.name}" с вашего ПК в облако Firebase? Это ПОЛНОСТЬЮ УДАЛИТ И ПЕРЕЗАПИШЕТ все текущие транзакции и счета в облаке текущими данными из выбранного файла.`
      : `Вы уверены, что хотите импортировать файл "${file.name}" с вашего ПК в локальное хранилище браузера? Это заменит текущие данные в браузере. Вы сможете синхронизировать их с облаком при последующем входе.`;

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

          if (isCloud && currentUser) {
            addToast(`Успешно распознано ${numTxs} транзакций! Запись в БД Firebase... ⏳`, "success");
            await reinitUserFinanceData(currentUser.uid, currentUser.email || "", parsedData);
            lastFetchedDataRef.current = JSON.stringify(parsedData);
            setData(parsedData);
            addToast(`Успешно загружено: ${numTxs} транзакций из "${file.name}" в облако! 🎉☁️`, "success");
          } else {
            addToast(`Успешно распознано ${numTxs} транзакций! Сохранение локально... 💾`, "success");
            localStorage.setItem('milli_finance_data_v8_realonly_clean', JSON.stringify(parsedData));
            setData(parsedData);
            addToast(`Успешно загружено: ${numTxs} транзакций из "${file.name}" в локальный кэш! 💻🎉 Войдите в Firebase для сохранения в облаке.`, "success");
          }
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
  };

  // Triggered when clicking a day on the calendar to "add transaction on that day"
  const handleAddTransactionOnDate = (date: string) => {
    setPreselectedDate(date);
    setEditingTransaction(null);
    setActiveTab('transactions');
  };

  // Triggered when editing transaction from calendar cell or overview list
  const handleEditTransactionStart = (tx: Transaction) => {
    setEditingTransaction(tx);
    setPreselectedDate(null);
    setActiveTab('transactions');
  };

  // --- BUSINESS LOGIC: ACCOUNTS ---
  const handleAddAccount = (newAcc: Omit<Account, 'id'>) => {
    const newId = `acc-${Date.now()}`;
    const nextData = {
      ...data,
      accounts: [...data.accounts, { ...newAcc, id: newId }]
    };
    setData(nextData);
    saveToFirebaseDirectly(nextData);
  };

  const handleUpdateAccount = (updatedAcc: Account) => {
    const nextData = {
      ...data,
      accounts: data.accounts.map(a => a.id === updatedAcc.id ? updatedAcc : a)
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
    setData(nextData);
    saveToFirebaseDirectly(nextData);
  };

  // --- BUSINESS LOGIC: BANK CARDS ---
  const handleAddCard = (newCard: Omit<BankCard, 'id'>) => {
    const id = `card-${Date.now()}`;
    const nextData = {
      ...data,
      cards: [...(data.cards || []), { ...newCard, id }]
    };
    setData(nextData);
    saveToFirebaseDirectly(nextData);
  };

  const handleUpdateCard = (updatedCard: BankCard) => {
    const nextData = {
      ...data,
      cards: (data.cards || []).map(c => c.id === updatedCard.id ? updatedCard : c)
    };
    setData(nextData);
    saveToFirebaseDirectly(nextData);
  };

  const handleDeleteCard = (id: string) => {
    const nextData = {
      ...data,
      cards: (data.cards || []).filter(c => c.id !== id),
      transactions: data.transactions.map(t => t.cardId === id ? { ...t, cardId: undefined } : t)
    };
    setData(nextData);
    saveToFirebaseDirectly(nextData);
  };

  // --- BUSINESS LOGIC: CATEGORIES ---
  const handleAddCategory = (newCat: Omit<Category, 'id'>) => {
    const newId = `cat-${Date.now()}`;
    const nextData = {
      ...data,
      categories: [...data.categories, { ...newCat, id: newId }]
    };
    setData(nextData);
    saveToFirebaseDirectly(nextData);
  };

  const handleUpdateCategory = (updatedCat: Category) => {
    const nextData = {
      ...data,
      categories: data.categories.map(c => c.id === updatedCat.id ? updatedCat : c)
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
    setData(nextData);
    saveToFirebaseDirectly(nextData);
  };

  // --- BUSINESS LOGIC: TRANSACTIONS & BALANCES (Delta Adjustment Engine) ---
  const handleAddTransaction = (newTx: Omit<Transaction, 'id'>) => {
    const tx: Transaction = {
      ...newTx,
      id: `tx-${Date.now()}`
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

    const nextData = {
      ...data,
      accounts: finalAccounts,
      transactions: finalTransactions
    };

    setData(nextData);
    saveToFirebaseDirectly(nextData);
    setEditingTransaction(null);
  };

  // --- BUSINESS LOGIC: BUDGETS ---
  const handleSaveBudget = (categoryId: string, limitAmount: number) => {
    const exists = data.budgets.some(b => b.categoryId === categoryId);
    let newBudgets;
    if (exists) {
      newBudgets = data.budgets.map(b => b.categoryId === categoryId ? { categoryId, limitAmount } : b);
    } else {
      newBudgets = [...data.budgets, { categoryId, limitAmount }];
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
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-teal-500 selection:text-slate-950 relative overflow-x-hidden ${theme === 'dark' ? 'dark' : ''}`} id="main-root-container">
      
      {/* Decorative Blur Blobs for Frosted Glass Backdrop effect */}
      <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-100px] right-[-100px] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* 1. Header Navigation Bar */}
      <header className="sticky top-0 bg-slate-950/40 backdrop-blur-2xl border-b border-white/10 z-50 px-4 sm:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Logo and Azerbaijan context branding */}
        <div className="flex items-center gap-3 z-10">
          <div className="w-11 h-11 bg-teal-400 rounded-xl flex items-center justify-center text-slate-950 font-display font-extrabold text-2xl shadow-lg shadow-teal-400/20">
            ₼
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-display font-black tracking-tight text-white leading-none">MilliFinance</h1>
              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-white/10 rounded text-[9px] font-bold text-teal-300 border border-white/10">
                🇦🇿 AZN
              </span>
              {isFirebaseLoading ? (
                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/15 rounded text-[9px] font-bold text-amber-300 border border-amber-500/10 animate-pulse">
                  Синхронизация...
                </span>
              ) : currentUser ? (
                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/15 rounded text-[9px] font-bold text-emerald-300 border border-emerald-500/10" title={`Синхронизировано с ${currentUser.email}`}>
                  ☁️ Firebase
                </span>
              ) : null}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Умный домашний бюджет Азербайджана</p>
          </div>
        </div>

        {/* Global stats block (Overall Capital indicator) and settings reset button */}
        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end z-10">
          <div className="text-right">
            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Всего ресурсов</span>
            <span className="text-base font-display font-black text-teal-300 tracking-tight leading-none">
              {overallCapital.toFixed(2)} ₼
            </span>
          </div>

          <div className="h-8 w-px bg-white/10 hidden sm:block" />

          <button
            onClick={handleResetData}
            className="flex items-center gap-1 px-3 py-1.5 border border-white/10 hover:border-rose-500/50 bg-white/5 hover:bg-rose-500/10 text-slate-300 hover:text-rose-400 text-xs font-semibold rounded-xl transition-all cursor-pointer"
            title="Сбросить все до реального экспорта HoneyMoney"
          >
            <Flame size={13} className="text-rose-500" />
            <span className="hidden sm:inline">Сбросить к HoneyMoney</span>
          </button>
        </div>

      </header>

      {/* 2. Primary Layout Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 z-10">

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
                  Ваш браузер или облако Firebase загрузили старые демонстрационные данные (Капитал Банк, Чайхана). Мы успешно импортировали и сконвертировали ваши реальные данные экспорта <b>HoneyMoney ({initialFinanceData.transactions.length} финансовых операций, реальные счета Самиры и Ильгара, ABB и ASB карты за 2022–2026 годы)</b>! Нажмите кнопку справа, чтобы мгновенно применить реальные данные.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                if (confirm('Внимание: Вы уверены, что хотите применить реальные данные экспорта HoneyMoney? Ваши старые локальные данные будут перезаписаны.')) {
                  setData(initialFinanceData);
                  saveToFirebaseDirectly(initialFinanceData);
                  addToast("Ваши реальные данные HoneyMoney успешно применены! 🎉", "success");
                }
              }}
              className="w-full md:w-auto px-6 py-3.5 bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 text-slate-950 font-extrabold rounded-2xl transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider text-xs font-display shrink-0"
            >
              Применить данные HoneyMoney ₼
            </button>
          </div>
        )}
        
        {/* Navigation tabs row: single card view controller switcher */}
        <div className="flex bg-white/5 backdrop-blur-md p-2 rounded-2xl border border-white/10 justify-between sm:justify-start gap-1 overflow-x-auto custom-scrollbar shadow-lg">
          <button
            onClick={() => handleQuickNavigate('overview')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all shrink-0 cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-white/15 text-white border border-white/15 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <LayoutDashboard size={15} />
            <span>Панель аналитики</span>
          </button>

          <button
            onClick={() => handleQuickNavigate('transactions')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all relative shrink-0 cursor-pointer ${
              activeTab === 'transactions'
                ? 'bg-white/15 text-white border border-white/15 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ReceiptText size={15} />
            <span>Журнал операций</span>
            {preselectedDate && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
            )}
          </button>

          <button
            onClick={() => handleQuickNavigate('calendar')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all shrink-0 cursor-pointer ${
              activeTab === 'calendar'
                ? 'bg-white/15 text-white border border-white/15 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Calendar size={15} />
            <span>Календарь дней</span>
          </button>

          <button
            onClick={() => handleQuickNavigate('budgeting')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all shrink-0 cursor-pointer ${
              activeTab === 'budgeting'
                ? 'bg-white/15 text-white border border-white/15 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <SlidersHorizontal size={15} />
            <span>Бюджетирование</span>
          </button>

          <button
            onClick={() => handleQuickNavigate('accounts-categories')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all shrink-0 cursor-pointer ${
              activeTab === 'accounts-categories'
                ? 'bg-white/15 text-white border border-white/15 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Settings size={15} />
            <span>Счета и категории</span>
          </button>
        </div>

        {/* Cloud Sync Status Banner */}
        {!currentUser ? (
          <div className="flex flex-col gap-3" id="firebase-sync-disabled-container">
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-amber-500/20 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4" id="firebase-sync-disabled-banner">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20 rounded-xl mt-1 md:mt-0">
                  <AlertTriangle size={20} className="shrink-0 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-slate-900 dark:text-white text-sm">Облачная синхронизация Firebase выключена</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                    Ваши данные хранятся локально в браузере. Войдите через Google, чтобы включить автоматическое резервное копирование в <b>Firebase Firestore</b>!
                  </p>
                  {typeof window !== 'undefined' && window.self !== window.top && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-2 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                      ⚠️ <b>Внимание:</b> Приложение открыто во фрейме предпросмотра (iframe) AI Studio. Браузеры блокируют авторизационные всплывающие окна внутри iframe. 
                      Пожалуйста, используйте кнопку <b>«ОТКРЫТЬ В НОВОЙ ВКЛАДКЕ»</b>, чтобы войти в один клик.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row md:flex-col gap-2 w-full md:w-auto shrink-0">
                {typeof window !== 'undefined' && window.self !== window.top ? (
                  <a
                    href={window.location.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full text-center px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider text-xs font-display shrink-0"
                  >
                    <LogIn size={14} className="animate-bounce" />
                    Открыть в новой вкладке
                  </a>
                ) : (
                  <button
                    onClick={handleGoogleLogin}
                    className="w-full px-5 py-3 bg-gradient-to-r from-teal-500 to-indigo-500 hover:from-teal-400 hover:to-indigo-400 text-slate-950 text-xs font-extrabold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider font-display shrink-0"
                  >
                    <LogIn size={14} />
                    Включить Firebase Sync
                  </button>
                )}
                
                <button
                  onClick={() => setShowAuthInstructions(!showAuthInstructions)}
                  className="w-full px-4 py-2 bg-slate-800 dark:bg-white/5 hover:bg-slate-700 dark:hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer border border-transparent hover:border-slate-600/30 flex items-center justify-center gap-1.5"
                >
                  <Info size={13} />
                  {showAuthInstructions ? 'Скрыть инструкцию' : 'Инструкция по настройке'}
                </button>

                <div className="w-full border-t border-white/5 my-1" />

                <label className="w-full px-4 py-2.5 bg-gradient-to-r from-teal-500/15 to-emerald-500/15 hover:from-teal-500/25 hover:to-emerald-500/25 border border-teal-500/30 hover:border-teal-500/50 text-teal-600 dark:text-teal-400 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm text-center">
                  <span>📂 Выбрать JSON с ПК</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleUploadCustomJson}
                    disabled={isFirebaseLoading}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Error Diagnostics Card */}
            {authErrorCode && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 rounded-2xl p-4 flex flex-col gap-2 shadow-md">
                <div className="flex items-center gap-2">
                  <XCircle size={18} className="shrink-0 text-red-600 dark:text-red-400" />
                  <span className="font-display font-black text-xs uppercase tracking-wider text-red-700 dark:text-red-300">
                    Ошибка авторизации Firebase (Код: {authErrorCode})
                  </span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-mono select-all bg-black/5 dark:bg-black/40 p-2.5 rounded-xl border border-black/5 dark:border-white/5 leading-relaxed">
                  {authError}
                </p>
                {authErrorCode === 'auth/operation-not-allowed' && (
                  <div className="mt-1.5 p-3 bg-teal-500/10 dark:bg-teal-950/40 rounded-xl border border-teal-500/20 text-xs text-teal-800 dark:text-teal-300 leading-relaxed font-sans">
                    💡 <b>Причина:</b> В панели Firebase вашего проекта не включен метод входа через Google.
                    <ol className="list-decimal ml-4 mt-1.5 space-y-1">
                      <li>Перейдите по ссылке: <a href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers`} target="_blank" rel="noopener noreferrer" className="font-bold underline text-indigo-600 dark:text-teal-400 hover:text-indigo-500 dark:hover:text-teal-300">Firebase Auth Sign-in Providers ↗</a></li>
                      <li>Нажмите кнопку <b>«Добавить новый провайдер»</b> (Add new provider).</li>
                      <li>Выберите <b>«Google»</b>, включите переключатель (Enable) в правый бок, укажите почту поддержки проекта и нажмите <b>«Сохранить»</b> (Save).</li>
                      <li>После этого попробуйте войти снова. Всё заработает instantly!</li>
                    </ol>
                  </div>
                )}
                {authErrorCode === 'auth/unauthorized-domain' && (
                  <div className="mt-1.5 p-3 bg-amber-500/10 dark:bg-amber-950/40 rounded-xl border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 leading-relaxed font-sans">
                    💡 <b>Причина:</b> Текущий домен отсутствует в списке разрешенных доменов для авторизации (Authorized Domains).
                    <p className="mt-1">Убедитесь, что вы скопировали и добавили адрес без <code>https://</code> и двоеточий в Аутентификационную консоль Firebase.</p>
                  </div>
                )}
                {(authErrorCode === 'auth/popup-blocked' || authErrorCode === 'auth/cancelled-popup-request') && (
                  <div className="mt-1.5 p-3 bg-amber-500/10 dark:bg-amber-950/40 rounded-xl border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 leading-relaxed font-sans">
                    💡 <b>Причина:</b> Всплывающее окно заблокировано вашим браузером или расширением (AdBlock/uBlock).
                    <p className="mt-1">Пожалуйста, разрешите всплывающие окна для открытого домена или нажмите кнопку <b>«Открыть в новой вкладке»</b> выше для корректной авторизации.</p>
                  </div>
                )}
              </div>
            )}

            {/* Collapsible Auth troubleshooting details */}
            {showAuthInstructions && (
              <div className="bg-slate-900 border border-teal-500/25 rounded-2xl p-5 shadow-lg flex flex-col gap-4 animate-fadeIn" id="firebase-auth-instructions">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-teal-400">
                    <Info size={16} />
                    <h4 className="text-xs font-bold uppercase tracking-wider font-display">Почему окно сразу закрылось?</h4>
                  </div>
                  <span className="text-[10px] bg-teal-500/10 text-teal-300 font-mono font-bold px-2 py-0.5 rounded border border-teal-500/15">Решение</span>
                </div>
                
                <p className="text-xs text-slate-300 leading-relaxed">
                  По соображениям безопасности <b>Firebase Authentication</b> разрешает авторизацию только с безопасных и предварительно зарегистрированных адресов (доменов). Всплывающее окно автоматически закрывается («схлопывается»), так как домен предпросмотра текущей вкладки отсутствует в списке разрешенных в настройках вашего проекта Firebase.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-1">
                  <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-teal-400 font-mono">ШАГ 1</span>
                      <p className="font-semibold text-slate-200 mt-1 mb-1.5 text-xs">Открыть Консоль</p>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Перейдите на страницу настроек вашего проекта Firebase:
                      </p>
                    </div>
                    <a 
                      href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`}
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300 hover:underline font-semibold mt-3"
                    >
                      Настройки Auth ↗
                    </a>
                  </div>

                  <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 md:col-span-2">
                    <span className="text-[10px] font-bold text-teal-400 font-mono">ШАГ 2</span>
                    <p className="font-semibold text-slate-200 mt-1 mb-1.5 text-xs">Добавить текущий домен в «Authorized Domains»</p>
                    <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                      В самом верху выберите вкладку <b>«Authorized domains»</b> (Авторизованные домены), нажмите кнопку <b>«Add domain»</b> и укажите адрес текущей вкладки:
                    </p>
                    <div className="flex items-center justify-between gap-2 font-mono text-[11px] bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 select-all font-bold text-teal-300">
                      <span>{typeof window !== 'undefined' ? window.location.hostname : 'Загрузка адреса...'}</span>
                      <span className="text-[9px] text-slate-500 font-sans uppercase font-normal select-none">Нажмите 2 раза для копирования</span>
                    </div>
                    <p className="mt-2 text-[10px] text-amber-500 font-medium">
                      💡 Также добавьте <b>localhost</b> (если тестируете локально).
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950/30 p-3.5 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
                  <span className="text-teal-400 shrink-0 font-bold select-none font-mono">✓</span>
                  <p>
                    <b>Шаг 3:</b> После того, как вы добавите домен в консоль (обычно это занимает 3-5 секунд), обновите эту страницу в новой вкладке и нажмите кнопку входа снова. Вся синхронизация заработает автоматически!
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3 w-full" id="firebase-sync-active-container">
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-emerald-500/20 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4" id="firebase-sync-active-banner">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl">
                  <CheckCircle size={20} className="shrink-0" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display font-bold text-slate-900 dark:text-white text-sm">Облако Firebase активно</h3>
                    {isFirebaseLoading && (
                      <span className="text-[9px] bg-amber-500/20 text-amber-600 dark:text-amber-300 font-mono font-bold px-1.5 py-0.5 rounded animate-pulse">Синхронизация...</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Все изменения автоматически сохраняются в вашей учетной записи: <span className="font-semibold text-teal-600 dark:text-teal-300">{currentUser.email}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                <label className="w-full sm:w-auto px-3.5 py-2 bg-gradient-to-r from-teal-500/15 to-emerald-500/15 hover:from-teal-500/25 hover:to-emerald-500/25 border border-teal-500/30 hover:border-teal-500/50 text-teal-600 dark:text-teal-400 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm">
                  <span>📂 Выбрать JSON с ПК</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleUploadCustomJson}
                    disabled={isFirebaseLoading}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={handleForceImportCSVToFirebase}
                  disabled={isFirebaseLoading}
                  className="w-full sm:w-auto px-3.5 py-2 bg-gradient-to-r from-amber-500/15 to-orange-500/15 hover:from-amber-500/25 hover:to-orange-500/25 border border-orange-500/30 hover:border-orange-500/50 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  title="Принудительно загрузить все транзакции и аккаунты из JSON файла в Firestore"
                >
                  <span>📥 Импорт JSON в облако</span>
                </button>
                <button
                  onClick={async () => {
                    setIsFirebaseLoading(true);
                    setFirebaseSyncError(null);
                    try {
                      const cloudData = await getUserFinanceData(currentUser.uid);
                      if (cloudData) {
                        setData(cloudData);
                        lastFetchedDataRef.current = JSON.stringify(cloudData);
                        addToast("Данные успешно синхронизированы из облака Firebase! ☁️", "success");
                      } else {
                        const latestLocalData = dataRef.current;
                        await saveUserFinanceData(currentUser.uid, currentUser.email || "", latestLocalData);
                        lastFetchedDataRef.current = JSON.stringify(latestLocalData);
                        addToast("Локальные данные сохранены в облако Firebase! ☁️", "success");
                      }
                    } catch (err: any) {
                      let msg = err?.message || String(err);
                      try {
                        const parsed = JSON.parse(msg);
                        msg = parsed.error || msg;
                      } catch {}
                      setFirebaseSyncError(msg);
                      addToast(`Ошибка ручной синхронизации: ${msg}`, "warning" as any);
                    } finally {
                      setIsFirebaseLoading(false);
                    }
                  }}
                  disabled={isFirebaseLoading}
                  className="w-full sm:w-auto px-3.5 py-2 bg-slate-800 dark:bg-white/10 hover:bg-slate-700 dark:hover:bg-white/15 text-white dark:text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RefreshCw size={13} className={isFirebaseLoading ? 'animate-spin' : ''} />
                  Синхронизировать сейчас
                </button>
                <button
                  onClick={handleGoogleLogout}
                  className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 hover:text-rose-500 dark:hover:text-rose-300 rounded-xl transition-colors cursor-pointer shrink-0"
                  title="Выйти из аккаунта синхронизации"
                >
                  <LogOut size={14} />
                </button>
              </div>
            </div>

            {/* Sync Error Diagnostics Card */}
            {firebaseSyncError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 rounded-2xl p-4 flex flex-col gap-2 shadow-md animate-fadeIn" id="firebase-sync-error">
                <div className="flex items-center gap-2">
                  <XCircle size={18} className="shrink-0 text-red-600 dark:text-red-400" />
                  <span className="font-display font-black text-xs uppercase tracking-wider text-red-700 dark:text-red-300">
                    Ошибка синхронизации базы данных (Firestore)
                  </span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-mono select-all bg-black/5 dark:bg-black/40 p-2.5 rounded-xl border border-black/5 dark:border-white/5 leading-relaxed">
                  {firebaseSyncError}
                </p>
                <div className="mt-1 p-3 bg-teal-500/10 dark:bg-teal-950/40 rounded-xl border border-teal-500/20 text-xs text-teal-800 dark:text-teal-300 leading-relaxed font-sans">
                  💡 <b>Как решить эту ошибку?</b>
                  {firebaseSyncError.toLowerCase().includes("permission") ? (
                    <p className="mt-1">
                      Это происходит, когда правила доступа отклоняют операцию (например, если сессия устарела или домен не прошел правила). Нажмите на кнопку выхода справа от кнопки синхронизации, затем войдите снова для обновления сессии.
                    </p>
                  ) : firebaseSyncError.toLowerCase().includes("quota") ? (
                    <p className="mt-1 font-semibold text-amber-600 dark:text-amber-400">
                      Превышен бесплатный лимит дневных операций чтения/записи базы данных. Лимит сбросится в начале следующих суток.
                    </p>
                  ) : (
                    <p className="mt-1">
                      Убедитесь, что в Firebase Console вашего проекта создана база данных <b>Cloud Firestore</b> в режиме <b>Native Mode</b>. Если база данных не создана в панели управления, никакие запросы к хранилищу не смогут выполниться.
                    </p>
                  )}
                </div>
              </div>
            )}
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
              onCancelEditing={() => setEditingTransaction(null)}
              onAddTransfer={handleAddTransfer}
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
            />
          )}

          {activeTab === 'budgeting' && (
            <BudgetingPanel
              transactions={data.transactions}
              categories={data.categories}
              budgets={data.budgets}
              onSaveBudget={handleSaveBudget}
              onDeleteBudget={handleDeleteBudget}
            />
          )}

          {activeTab === 'accounts-categories' && (
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
        </div>

      </main>

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
      <footer className="bg-slate-950/40 backdrop-blur-md border-t border-white/5 py-6 px-4 mt-12 z-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
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
