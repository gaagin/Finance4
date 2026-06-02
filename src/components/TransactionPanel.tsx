import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, Category, Account, TransactionType, BankCard, formatCategoryDisplayName, getDynamicTimeframeOptions, formatTimeframeLabel, filterTransactionByTimeframe, getCurrentMonthYyyymm } from '../types';
import { IconComponent } from './IconComponent';
import { PlusCircle, Edit2, Trash2, Search, Filter, Calendar, CreditCard, Tag, ArrowUpRight, ArrowDownLeft, X, ArrowUpDown, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { SearchableSelect } from './SearchableSelect';

interface TransactionPanelProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  cards: BankCard[];
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
  onUpdateTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  preselectedDate?: string | null;
  onClearPreselectedDate?: () => void;
  editingTransaction?: Transaction | null;
  onCancelEditing?: () => void;
  onAddTransfer?: (transfer: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    description: string;
    date: string;
  }) => void;
  theme?: 'light' | 'dark';
}

export function TransactionPanel({
  transactions,
  categories,
  accounts,
  cards = [],
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  preselectedDate = null,
  onClearPreselectedDate,
  editingTransaction = null,
  onCancelEditing,
  onAddTransfer,
  theme = 'dark'
}: TransactionPanelProps) {
  
  // New Quick Add Transaction state
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [activeFormType, setActiveFormType] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }); // Default to current local date
  const [description, setDescription] = useState('');
  const [cardId, setCardId] = useState<string | undefined>(undefined);

  // Dedicated state variables for the Transaction Edit Modal
  const [editAmount, setEditAmount] = useState('');
  const [editType, setEditType] = useState<TransactionType>('expense');
  const [editAccountId, setEditAccountId] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCardId, setEditCardId] = useState<string | undefined>(undefined);
  const [editTransferAccountId, setEditTransferAccountId] = useState('');
  const [editTransferType, setEditTransferType] = useState<'out' | 'in'>('out');

  // Synchronize Edit Modal state when editingTransaction triggers
  useEffect(() => {
    if (editingTransaction) {
      setEditAmount(editingTransaction.amount.toString());
      setEditType(editingTransaction.type);
      setEditDate(editingTransaction.date);
      setEditDescription(editingTransaction.description || '');
      setEditCardId(editingTransaction.cardId);

      if (editingTransaction.type === 'transfer') {
        if (editingTransaction.transferType === 'in') {
          setEditAccountId(editingTransaction.transferAccountId || '');
          setEditTransferAccountId(editingTransaction.accountId);
        } else {
          setEditAccountId(editingTransaction.accountId);
          setEditTransferAccountId(editingTransaction.transferAccountId || '');
        }
        setEditTransferType(editingTransaction.transferType || 'out');
        setEditCategoryId(editingTransaction.categoryId || 'cat-other-exp');
      } else {
        setEditAccountId(editingTransaction.accountId);
        setEditCategoryId(editingTransaction.categoryId);
        setEditTransferAccountId('');
        setEditTransferType('out');
      }
    }
  }, [editingTransaction]);

  // Handle changing Transaction Type within the Edit Modal
  const handleEditTypeChange = (newType: TransactionType) => {
    setEditType(newType);
    if (newType !== 'transfer') {
      const filteredCats = categories.filter(c => c.type === newType);
      if (filteredCats.length > 0) {
        setEditCategoryId(filteredCats[0].id);
      } else {
        setEditCategoryId('');
      }
    } else {
      // It's a transfer!
      // Set a default transferAccountId if it's empty or equals editAccountId
      if (!editTransferAccountId || editTransferAccountId === editAccountId) {
        const fallbackAcc = accounts.find(a => a.id !== editAccountId);
        if (fallbackAcc) {
          setEditTransferAccountId(fallbackAcc.id);
        }
      }
      setEditCategoryId('cat-other-exp'); // Outgoing transfer category placeholder
    }
  };

  // Submit handler for Transaction Edit Modal
  const handleEditFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAmount || isNaN(Number(editAmount)) || Number(editAmount) <= 0 || !editAccountId || !editDate) {
      alert('Пожалуйста, заполните необходимые поля корректными значениями.');
      return;
    }

    if (editType === 'transfer') {
      if (!editTransferAccountId) {
        alert('Пожалуйста, выберите счет зачисления.');
        return;
      }
      if (editAccountId === editTransferAccountId) {
        alert('Счет списания и счет зачисления не могут совпадать.');
        return;
      }
    } else {
      if (!editCategoryId) {
        alert('Пожалуйста, выберите категорию.');
        return;
      }
    }

    if (editingTransaction) {
      onUpdateTransaction({
        id: editingTransaction.id,
        accountId: editAccountId,
        categoryId: editType === 'transfer' ? (editTransferType === 'in' ? 'cat-other-inc' : 'cat-other-exp') : editCategoryId,
        amount: Number(editAmount),
        type: editType,
        date: editDate,
        description: editDescription.trim(),
        cardId: editType === 'transfer' ? undefined : (editCardId || undefined),
        transferAccountId: editType === 'transfer' ? editTransferAccountId : undefined,
        transferType: editType === 'transfer' ? (editingTransaction.transferType || 'out') : undefined
      });
    }
  };

  // Delete Transaction safety confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; description: string; amount: number; isIncome: boolean } | null>(null);

  // Local effect-like sync when preselected date begins
  useMemo(() => {
    if (preselectedDate) {
      setDate(preselectedDate);
      // Pick first account and category as default
      if (accounts.length > 0) {
        setAccountId(accounts[0].id);
        if (accounts.length > 1) setToAccountId(accounts[1].id);
      }
      const options = categories.filter(c => c.type === type);
      if (options.length > 0) setCategoryId(options[0].id);
      setCardId(undefined);
    } else {
      // Setup default form
      if (accounts.length > 0 && !accountId) {
        setAccountId(accounts[0].id);
        if (accounts.length > 1 && !toAccountId) setToAccountId(accounts[1].id);
      }
      const options = categories.filter(c => c.type === type);
      if (options.length > 0 && !categoryId) setCategoryId(options[0].id);
      setCardId(undefined);
    }
  }, [preselectedDate]);

  // Handle changing Active Form Type within the creation form (switches suitable categories or updates form layout)
  const handleFormActiveTypeChange = (newType: 'expense' | 'income' | 'transfer') => {
    setActiveFormType(newType);
    if (newType !== 'transfer') {
      setType(newType);
      const filteredCats = categories.filter(c => c.type === newType);
      if (filteredCats.length > 0) {
        setCategoryId(filteredCats[0].id);
      } else {
        setCategoryId('');
      }
    }
  };

  // Submission handler
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (activeFormType === 'transfer') {
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0 || !accountId || !toAccountId || !date) {
        alert('Пожалуйста, заполните необходимые поля корректными значениями.');
        return;
      }
      if (accountId === toAccountId) {
        alert('Счет списания и счет зачисления не могут совпадать.');
        return;
      }
      if (onAddTransfer) {
        onAddTransfer({
          fromAccountId: accountId,
          toAccountId,
          amount: Number(amount),
          description: description.trim() || 'Перевод между счетами',
          date
        });
      } else {
        alert('Функция перевода временно недоступна.');
        return;
      }
    } else {
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0 || !accountId || !categoryId || !date) {
        alert('Пожалуйста, заполните необходимые поля корректными значениями.');
        return;
      }

      onAddTransaction({
        accountId,
        categoryId,
        amount: Number(amount),
        type,
        date,
        description: description.trim(),
        cardId: cardId || undefined
      });
    }

    // Reset Form
    setAmount('');
    setDescription('');
    setCardId(undefined);
    if (onClearPreselectedDate) onClearPreselectedDate();
  };

  // Advanced Filters State
  const getSavedTimeframe = (key: string, defaultValue: string): string => {
    const saved = localStorage.getItem(key);
    if (!saved) return defaultValue;
    if (saved === 'may') return '2026-05';
    if (saved === 'april') return '2026-04';
    return saved;
  };

  const [filterSearch, setFilterSearch] = useState(() => localStorage.getItem('milli_filter_search') || '');
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income' | 'transfer'>(() => (localStorage.getItem('milli_filter_type') as any) || 'all');
  const [filterAccount, setFilterAccount] = useState(() => localStorage.getItem('milli_filter_account') || 'all');
  const [filterCategory, setFilterCategory] = useState(() => localStorage.getItem('milli_filter_category') || 'all');
  const [filterDateRange, setFilterDateRange] = useState<string>(() => getSavedTimeframe('milli_filter_date_range', getCurrentMonthYyyymm()));
  const [customStartDate, setCustomStartDate] = useState(() => localStorage.getItem('milli_filter_custom_start_date') || `${getCurrentMonthYyyymm()}-01`);
  const [customEndDate, setCustomEndDate] = useState(() => {
    const saved = localStorage.getItem('milli_filter_custom_end_date');
    if (saved) return saved;
    const currentM = getCurrentMonthYyyymm();
    const daysInMonth = currentM.endsWith('-02') ? '28' : (['-04', '-06', '-09', '-11'].some(x => currentM.endsWith(x)) ? '30' : '31');
    return `${currentM}-${daysInMonth}`;
  });
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(() => localStorage.getItem('milli_filters_expanded') === 'true');

  useEffect(() => {
    localStorage.setItem('milli_filter_search', filterSearch);
  }, [filterSearch]);

  useEffect(() => {
    localStorage.setItem('milli_filter_type', filterType);
  }, [filterType]);

  useEffect(() => {
    localStorage.setItem('milli_filter_account', filterAccount);
  }, [filterAccount]);

  useEffect(() => {
    localStorage.setItem('milli_filter_category', filterCategory);
  }, [filterCategory]);

  useEffect(() => {
    localStorage.setItem('milli_filter_date_range', filterDateRange);
  }, [filterDateRange]);

  useEffect(() => {
    localStorage.setItem('milli_filter_custom_start_date', customStartDate);
  }, [customStartDate]);

  useEffect(() => {
    localStorage.setItem('milli_filter_custom_end_date', customEndDate);
  }, [customEndDate]);

  useEffect(() => {
    localStorage.setItem('milli_filters_expanded', String(isFiltersExpanded));
  }, [isFiltersExpanded]);

  const timeframeOptions = useMemo(() => {
    return getDynamicTimeframeOptions(transactions);
  }, [transactions]);

  // Count active filters (ignoring search text)
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterType !== 'all') count++;
    if (filterAccount !== 'all') count++;
    if (filterCategory !== 'all') count++;
    if (filterDateRange !== 'may' && filterDateRange !== '2026-05' && filterDateRange !== getCurrentMonthYyyymm()) count++;
    return count;
  }, [filterType, filterAccount, filterCategory, filterDateRange]);

  // Sorting
  const [sortField, setSortField] = useState<'date' | 'amount'>(() => (localStorage.getItem('milli_filter_sort_field') as any) || 'date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => (localStorage.getItem('milli_filter_sort_order') as any) || 'desc');

  useEffect(() => {
    localStorage.setItem('milli_filter_sort_field', sortField);
  }, [sortField]);

  useEffect(() => {
    localStorage.setItem('milli_filter_sort_order', sortOrder);
  }, [sortOrder]);

  const toggleSort = (field: 'date' | 'amount') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Filter & Sort Logic
  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    // 1. Search text filter
    if (filterSearch.trim() !== '') {
      const q = filterSearch.toLowerCase();
      result = result.filter(tx => {
        const cat = categories.find(c => c.id === tx.categoryId);
        const acc = accounts.find(a => a.id === tx.accountId);
        return (
          tx.description.toLowerCase().includes(q) ||
          cat?.name.toLowerCase().includes(q) ||
          acc?.name.toLowerCase().includes(q)
        );
      });
    }

    // 2. Type filter
    if (filterType !== 'all') {
      result = result.filter(tx => tx.type === filterType);
    }

    // 3. Account filter
    if (filterAccount !== 'all') {
      result = result.filter(tx => tx.accountId === filterAccount);
    }

    // 4. Category filter
    if (filterCategory !== 'all') {
      result = result.filter(tx => tx.categoryId === filterCategory);
    }

    // 5. Date filter
    if (filterDateRange === 'custom') {
      result = result.filter(tx => tx.date >= customStartDate && tx.date <= customEndDate);
    } else {
      result = result.filter(tx => filterTransactionByTimeframe(tx, filterDateRange));
    }

    // 6. Sort
    result.sort((a, b) => {
      if (sortField === 'date') {
        const d1 = new Date(a.date).getTime();
        const d2 = new Date(b.date).getTime();
        return sortOrder === 'asc' ? d1 - d2 : d2 - d1;
      } else {
        return sortOrder === 'asc' ? a.amount - b.amount : b.amount - a.amount;
      }
    });

    return result;
  }, [transactions, filterSearch, filterType, filterAccount, filterCategory, filterDateRange, customStartDate, customEndDate, sortField, sortOrder, categories, accounts]);

  return (
    <div className="w-full" id="transactions-panel-layout">
      
      {/* 1. Transaction form wrapper (Hidden / Removed) */}
      <div className="hidden" id="transaction-form-panel">
        <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 text-teal-300 border border-white/10 rounded-xl">
              <PlusCircle size={20} />
            </div>
            <h3 className="font-display font-semibold text-white">
              Быстрая запись
            </h3>
          </div>

          {preselectedDate && (
            <button
              onClick={() => {
                if (onClearPreselectedDate) onClearPreselectedDate();
                setAmount('');
                setDescription('');
              }}
              className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title="Сбросить выбранную дату"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {preselectedDate && (
          <div className="mb-4 p-2.5 bg-teal-500/10 text-teal-300 border border-teal-500/30 rounded-xl text-xs flex items-center justify-between">
            <span>Выбранная дата календаря: <b>{preselectedDate}</b></span>
            <button
              onClick={onClearPreselectedDate}
              className="text-white font-bold hover:underline"
            >
              Сбросить
            </button>
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-4">
          
          {/* Inc / Exp / Transfer selector segment */}
          <div className="flex bg-slate-900/60 p-1 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => handleFormActiveTypeChange('expense')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activeFormType === 'expense'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ArrowDownLeft size={13} />
              Расход
            </button>
            <button
              type="button"
              onClick={() => handleFormActiveTypeChange('income')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activeFormType === 'income'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ArrowUpRight size={13} />
              Доход
            </button>
            <button
              type="button"
              onClick={() => handleFormActiveTypeChange('transfer')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activeFormType === 'transfer'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ArrowUpDown size={13} />
              Перевод
            </button>
          </div>

          {/* Amount input */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">
              Сумма в Манатах (₼)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-display font-extrabold text-slate-400">
                ₼
              </span>
              <input
                type="number"
                step="any"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-4 py-3 bg-slate-950/60 border border-white/10 rounded-xl text-lg font-display font-extrabold text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-400"
                required
              />
            </div>
          </div>

          {/* Account select (Source Dev/Inc/Out) */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider flex items-center gap-1.5 select-none text-left">
              <CreditCard size={12} className={activeFormType === 'transfer' ? 'text-amber-450' : ''} />
              {activeFormType === 'transfer' ? 'Счет списания (Откуда)' : 'Счет списания/внесения'}
            </label>
            <SearchableSelect
              items={accounts}
              value={accountId}
              onChange={(id) => setAccountId(id)}
              placeholder="Выберите счет..."
              searchPlaceholder="Поиск счета..."
              idKey="id"
              displayValue={(acc) => `${acc.name} (${Math.round(acc.balance)} ₼)`}
              filterValue={(acc) => acc.name}
              renderItem={(acc) => (
                <div className="flex justify-between items-center w-full">
                  <span className="font-semibold">{acc.name}</span>
                  <span className="font-mono text-[10px] text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded-md font-extrabold shrink-0 ml-2">
                    {Math.round(acc.balance)} ₼
                  </span>
                </div>
              )}
            />
          </div>

          {/* Destination account select (FOR TRANSFER ONLY) */}
          {activeFormType === 'transfer' && (
            <div className="animate-fade-in text-left">
              <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider flex items-center gap-1.5 select-none">
                <CreditCard size={12} className="text-emerald-400" />
                Счет зачисления (Куда)
              </label>
              <SearchableSelect
                items={accounts.filter(acc => acc.id !== accountId)}
                value={toAccountId}
                onChange={(id) => setToAccountId(id)}
                placeholder="Выберите счет зачисления..."
                searchPlaceholder="Поиск счета зачисления..."
                idKey="id"
                displayValue={(acc) => `${acc.name} (${Math.round(acc.balance)} ₼)`}
                filterValue={(acc) => acc.name}
                renderItem={(acc) => (
                  <div className="flex justify-between items-center w-full">
                    <span className="font-semibold">{acc.name}</span>
                    <span className="font-mono text-[10px] text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded-md font-extrabold shrink-0 ml-2">
                      {Math.round(acc.balance)} ₼
                    </span>
                  </div>
                )}
              />
            </div>
          )}

          {/* Category select (HIDDEN FOR TRANSFERS) */}
          {activeFormType !== 'transfer' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider flex items-center gap-1.5 select-none text-left">
                <Tag size={12} />
                Категория
              </label>
              <SearchableSelect
                items={categories.filter(c => c.type === type)}
                value={categoryId}
                onChange={(id) => setCategoryId(id)}
                placeholder="Выберите категорию..."
                searchPlaceholder="Поиск категории..."
                idKey="id"
                displayValue={(cat) => (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-sm flex items-center justify-center shrink-0"
                      style={{ backgroundColor: cat.color }}
                    >
                      <span className="text-[10px] text-white">
                        <IconComponent name={cat.icon || 'HelpCircle'} size={10} />
                      </span>
                    </div>
                    <span className="truncate">{formatCategoryDisplayName(cat.name)}</span>
                  </div>
                )}
                filterValue={(cat) => cat.name}
                renderItem={(cat) => (
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-5 h-5 rounded-md flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: cat.color }}
                    >
                      <IconComponent name={cat.icon || 'HelpCircle'} size={11} />
                    </div>
                    <span className="font-semibold">{formatCategoryDisplayName(cat.name)}</span>
                  </div>
                )}
              />
            </div>
          )}

          {/* Date input */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider flex items-center gap-1 text-left">
              <Calendar size={12} />
              Дата
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-2.5 bg-slate-950/60 border border-white/10 rounded-xl text-sm text-slate-200"
              required
            />
          </div>

          {/* Description input */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider text-left">
              Описание / Примечание
            </label>
            <input
              type="text"
              placeholder={activeFormType === 'transfer' ? 'Например: Перевод с карты на m10' : 'Например: Покупка продуктов в Bravo'}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 bg-slate-950/60 border border-white/10 rounded-xl text-sm text-slate-200 placeholder-slate-500"
            />
          </div>



          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className={`flex-1 py-3 rounded-xl text-slate-950 font-extrabold text-xs transition-colors shadow-xs uppercase tracking-wider font-display flex items-center justify-center gap-1 cursor-pointer ${
                activeFormType === 'transfer'
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  : type === 'expense'
                  ? 'bg-rose-450 hover:bg-rose-400 text-slate-950'
                  : 'bg-teal-500 hover:bg-teal-400 text-slate-950'
              }`}
            >
              {activeFormType === 'transfer' ? 'Выполнить перевод' : 'Внести операцию'}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Comprehensive transactions list with filtering */}
      <div className="w-full bg-white/5 backdrop-blur-md rounded-2xl p-4 md:p-5 border border-white/10 shadow-lg flex flex-col justify-between" id="transactions-list-panel">
        <div>
          
          {/* Header of list */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3.5">
            <div>
              <h2 className="text-base sm:text-lg font-display font-bold text-white leading-tight">История движения средств</h2>
              <p className="text-[11px] text-slate-400">Найдено {filteredTransactions.length} операций из {transactions.length}</p>
            </div>
 
            {/* Quick Keyword search bar */}
            <div className="relative w-full sm:w-64">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                <Search size={13} />
              </span>
              <input
                type="text"
                placeholder="Поиск по описанию ..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className="w-full pl-8 pr-4 py-1 bg-slate-950/60 border border-white/10 rounded-lg text-[11px] text-white focus:ring-1 focus:ring-teal-400"
              />
              {filterSearch && (
                <button
                  onClick={() => setFilterSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-[10px] cursor-pointer"
                >
                  Сброс
                </button>
              )}
            </div>
          </div>
 
          {/* Filtering Controls Row 1 */}
          <div className="bg-white/5 border border-white/10 p-2.5 rounded-xl mb-2.5 transition-all duration-300">
            <button
              type="button"
              onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
              className="flex items-center justify-between w-full text-[10.5px] text-slate-300 font-bold uppercase tracking-wider select-none cursor-pointer focus:outline-none"
            >
              <div className="flex items-center gap-1.5">
                <Filter size={10} className="text-teal-400" />
                <span>Фильтры и сортировка</span>
                {activeFiltersCount > 0 && (
                  <span className="ml-1.5 bg-teal-500/20 text-teal-400 border border-teal-500/30 font-display font-extrabold text-[8px] px-1 py-0.2 rounded-full normal-case animate-pulse">
                    Активно: {activeFiltersCount}
                  </span>
                )}
              </div>
              <div className="text-slate-400 hover:text-white transition-colors">
                {isFiltersExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </div>
            </button>

            {isFiltersExpanded && (
              <div className="mt-4 pt-4 border-t border-white/5 space-y-4 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {/* Filter by Type */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">ТИП ОПЕРАЦИИ</label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value as any)}
                      className="w-full p-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-slate-200 cursor-pointer"
                    >
                      <option value="all" className="bg-slate-950 text-slate-300">Все записи</option>
                      <option value="expense" className="bg-slate-950 text-slate-300">Только расходы</option>
                      <option value="income" className="bg-slate-950 text-slate-300">Только доходы</option>
                      <option value="transfer" className="bg-slate-950 text-slate-300">Только переводы</option>
                    </select>
                  </div>

                  {/* Filter by Account */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">СЧЕТ</label>
                    <SearchableSelect
                      items={[{ id: 'all', name: 'Все счета', balance: 0 }, ...accounts]}
                      value={filterAccount}
                      onChange={(id) => setFilterAccount(id)}
                      placeholder="Все счета"
                      searchPlaceholder="Поиск счета..."
                      idKey="id"
                      displayValue={(acc) => acc.name}
                      filterValue={(acc) => acc.name}
                      renderItem={(acc) => (
                        <div className="flex justify-between items-center w-full text-xs">
                          <span className="font-semibold">{acc.name}</span>
                          {acc.id !== 'all' && (
                            <span className="font-mono text-[9px] text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded-md font-extrabold shrink-0 ml-2">
                              {Math.round(acc.balance)} ₼
                            </span>
                          )}
                        </div>
                      )}
                    />
                  </div>

                  {/* Filter by Category */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">КАТЕГОРИЯ</label>
                    <SearchableSelect
                      items={[{ id: 'all', name: 'Все категории', type: '', color: '', icon: '' } as any, ...categories]}
                      value={filterCategory}
                      onChange={(id) => setFilterCategory(id)}
                      placeholder="Все категории"
                      searchPlaceholder="Поиск категории..."
                      idKey="id"
                      displayValue={(cat) => cat.id === 'all' ? 'Все категории' : formatCategoryDisplayName(cat.name)}
                      filterValue={(cat) => cat.name}
                      renderItem={(cat) => (
                        <div className="flex items-center gap-2 text-xs">
                          {cat.id !== 'all' ? (
                            <>
                              <div
                                className="w-4 h-4 rounded-md flex items-center justify-center text-white shrink-0"
                                style={{ backgroundColor: cat.color }}
                              >
                                <IconComponent name={cat.icon || 'HelpCircle'} size={10} />
                              </div>
                              <span className="font-semibold">
                                {formatCategoryDisplayName(cat.name)} 
                                <span className="text-[10px] text-slate-500 font-normal ml-1">
                                  ({cat.type === 'income' ? 'доход' : 'расход'})
                                </span>
                              </span>
                            </>
                          ) : (
                            <span className="font-semibold">{cat.name}</span>
                          )}
                        </div>
                      )}
                    />
                  </div>

                  {/* Filter by Date Preset */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">ПЕРИОД ВРЕМЕНИ</label>
                    <select
                      value={filterDateRange}
                      onChange={(e) => setFilterDateRange(e.target.value)}
                      className="w-full p-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-slate-200 cursor-pointer"
                    >
                      {timeframeOptions.map(opt => (
                        <option key={opt.value} value={opt.value} className="bg-slate-950 text-slate-300">
                          {opt.type === 'all' ? 'За всё время' : opt.label}
                        </option>
                      ))}
                      <option value="custom" className="bg-slate-950 text-slate-300">Указать вручную</option>
                    </select>
                  </div>
                </div>

                {/* Custom Manual Dates (only visible if filterDateRange is custom) */}
                {filterDateRange === 'custom' && (
                  <div className="flex flex-wrap items-center gap-3 bg-slate-950/60 p-3 rounded-xl border border-white/10 max-w-lg text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 uppercase font-semibold">С</span>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="p-1 px-2 border border-white/10 rounded text-xs bg-slate-950 text-slate-200"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 uppercase font-semibold">ПО</span>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="p-1 px-2 border border-white/10 rounded text-xs bg-slate-950 text-slate-200"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomStartDate('2026-05-01');
                        setCustomEndDate('2026-05-31');
                      }}
                      className="text-[10px] text-slate-300 hover:text-white border border-white/15 px-2 py-1 rounded bg-white/5 active:bg-white/10 cursor-pointer"
                    >
                      Сбросить даты
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* List display */}
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-16 flex flex-col items-center justify-center border border-white/5 rounded-2xl bg-white/5">
              <div className="w-16 h-16 bg-white/5 text-slate-400 rounded-full flex items-center justify-center mb-3">
                <Search size={24} />
              </div>
              <p className="text-slate-300 font-semibold text-sm">Операции не найдены</p>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Попробуйте изменить параметры фильтров или введите новое слово в поисковую строку.
              </p>
            </div>
          ) : (
            <div className="space-y-1 max-h-[580px] lg:max-h-[780px] overflow-y-auto pr-1 custom-scrollbar">
              
              {/* Column headings for desktop */}
              <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-1 text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                <div className="col-span-3">Категория / Описание</div>
                <div className="col-span-3">Счет</div>
                <div className="col-span-2 cursor-pointer select-none hover:text-white flex items-center gap-1" onClick={() => toggleSort('date')}>
                  Дата <ArrowUpDown size={8} />
                </div>
                <div className="col-span-2 cursor-pointer select-none hover:text-white text-right flex items-center justify-end gap-1" onClick={() => toggleSort('amount')}>
                  Сумма <ArrowUpDown size={8} />
                </div>
                <div className="col-span-2 text-right">Действия</div>
              </div>

              {filteredTransactions.map(tx => {
                const cat = categories.find(c => c.id === tx.categoryId);
                const acc = accounts.find(a => a.id === tx.accountId);
                const card = tx.cardId ? cards.find(c => c.id === tx.cardId) : null;
                const isIncome = tx.type === 'income';
                const isTransfer = tx.type === 'transfer';

                const isSelected = editingTransaction?.id === tx.id;
                let bgBorderClass = '';

                if (isSelected) {
                  bgBorderClass = theme === 'dark'
                    ? 'bg-amber-500/15 border-amber-500/40 shadow-inner'
                    : 'bg-amber-50 border-amber-300 shadow-sm';
                } else if (isTransfer) {
                  bgBorderClass = theme === 'dark'
                    ? 'bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/15 shadow-xs'
                    : 'bg-amber-50 border-amber-200 shadow-xs hover:bg-amber-100/50';
                } else if (isIncome) {
                  bgBorderClass = theme === 'dark'
                    ? 'bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/15 shadow-xs'
                    : 'bg-emerald-50 border-emerald-200 shadow-xs hover:bg-emerald-100/50';
                } else {
                  // Expense
                  bgBorderClass = theme === 'dark'
                    ? 'bg-rose-500/5 hover:bg-rose-500/10 border-rose-500/15 shadow-xs'
                    : 'bg-rose-50 border-rose-200 shadow-xs hover:bg-rose-100/50';
                }

                return (
                  <div
                    key={tx.id}
                    className={`grid grid-cols-12 gap-y-1 gap-x-2 items-center py-1.5 md:py-1 px-2.5 sm:px-3 rounded-xl border transition-all group ${bgBorderClass}`}
                  >
                    {/* Category & Custom Description desc */}
                    <div className="col-span-8 md:col-span-3 flex items-center gap-1.5 min-w-0">
                      <div
                        className="w-5 h-5 rounded-md flex items-center justify-center text-white shrink-0 opacity-90"
                        style={{ backgroundColor: isTransfer ? '#f59e0b' : (cat?.color || '#3b82f6') }}
                      >
                        {isTransfer ? <ArrowUpDown size={9} /> : <IconComponent name={cat?.icon || 'HelpCircle'} size={9} />}
                      </div>
                      <div className="min-w-0">
                        <h4 className={`font-semibold text-[10.5px] truncate leading-tight ${
                          theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
                        }`}>
                          {tx.description || (isTransfer ? 'Перевод' : (cat?.name || 'Без описания'))}
                        </h4>
                        <span className={`text-[8px] uppercase tracking-wide font-medium block leading-none mt-0.5 ${
                          theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                        }`}>
                          {isTransfer ? 'Перевод' : (cat?.name || 'Другое')}
                        </span>
                      </div>
                    </div>

                    {/* Associated Account & Card Link badge */}
                    <div className="col-span-4 md:col-span-3 flex flex-wrap items-center gap-1 md:opacity-100 min-w-0">
                      <span className={`text-[8.5px] font-semibold px-1 py-0.2 rounded truncate max-w-[110px] ${
                        theme === 'dark' 
                          ? 'text-slate-350 bg-white/10' 
                          : 'text-slate-700 bg-slate-200/60 border border-slate-300/20'
                      }`} title={acc?.name}>
                        {acc?.name || 'Неизвестно'}
                      </span>
                      {card && (
                        <span className={`text-[7.5px] font-bold px-1 py-0.2 rounded flex items-center gap-0.5 border ${
                          theme === 'dark'
                            ? 'text-teal-355 bg-teal-500/10 border-teal-500/20'
                            : 'text-teal-800 bg-teal-500/10 border-teal-500/30'
                        }`} title={`${card.bank} (${card.name})`}>
                          <CreditCard size={7} />
                          {card.bank.split(' ')[0]} *{card.lastFour}
                        </span>
                      )}
                    </div>

                    {/* Date */}
                    <div className={`col-span-3 md:col-span-2 text-[9px] md:text-[10px] font-mono ${
                      theme === 'dark' ? 'text-slate-400' : 'text-slate-550'
                    }`}>
                      {tx.date}
                    </div>

                    {/* Transaction sum */}
                    <div className="col-span-4 md:col-span-2 font-display font-extrabold text-[11px] sm:text-[12.5px] text-right md:text-right leading-none">
                      <span className={
                        isTransfer 
                          ? (tx.transferType === 'in' ? (theme === 'dark' ? 'text-teal-400' : 'text-teal-600') : (theme === 'dark' ? 'text-amber-400' : 'text-amber-600'))
                          : (isIncome 
                              ? (theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600') 
                              : (theme === 'dark' ? 'text-rose-400' : 'text-rose-600'))
                      }>
                        {isTransfer ? (tx.transferType === 'in' ? '+' : '-') : (isIncome ? '+' : '-')}{tx.amount.toFixed(2)} ₼
                      </span>
                    </div>

                     {/* Action buttons */}
                     <div className="col-span-5 md:col-span-2 flex items-center justify-end gap-1">
                       <button
                         onClick={() => {
                           onUpdateTransaction({ ...tx, displayInEditFormOnly: true } as any);
                         }}
                         className="p-0.5 px-1.5 text-[9px] font-semibold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-white/10 rounded hover:bg-teal-500 hover:text-slate-950 dark:hover:bg-teal-450 dark:hover:text-slate-950 transition-all cursor-pointer flex items-center gap-0.5 shrink-0"
                         title="Редактировать запись"
                       >
                         <Edit2 size={9} />
                         <span className="md:hidden font-semibold">Изм</span>
                       </button>
  
                       <button
                         onClick={() => {
                           const associatedCat = categories.find(c => c.id === tx.categoryId);
                           setDeleteConfirm({
                             id: tx.id,
                             description: tx.description || (isTransfer ? 'Перевод' : (associatedCat?.name || 'Без описания')),
                             amount: tx.amount,
                             isIncome: isTransfer ? (tx.transferType === 'in') : (tx.type === 'income')
                           });
                         }}
                         className="p-0.5 px-1.5 text-[9px] font-semibold bg-white/5 hover:bg-rose-500/15 hover:text-rose-400 text-slate-400 border border-white/5 hover:border-rose-500/35 rounded transition-all cursor-pointer flex items-center gap-0.5 shrink-0"
                         title="Удалить запись"
                       >
                         <Trash2 size={9} />
                         <span className="md:hidden font-semibold">Удал</span>
                       </button>
                     </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-4 p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-2 text-xs text-slate-300">
          <Info size={14} className="shrink-0 text-teal-300" />
          <span><b>Всего отфильтровано:</b> Трат: {filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0).toFixed(1)} AZN, Доходов: {filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0).toFixed(1)} AZN, Переводов: {filteredTransactions.filter(t => t.type === 'transfer' && t.transferType === 'out').reduce((s, t) => s + t.amount, 0).toFixed(1)} AZN.</span>
        </div>
      </div>

      {/* TRANSACTION EDIT MODAL */}
      {editingTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden text-left flex flex-col max-h-[95vh]" id="edit-transaction-modal">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-white/5 shrink-0">
              <div>
                <h3 className="text-sm sm:text-base font-display font-bold text-white flex items-center gap-2">
                  <Edit2 className="text-teal-400" size={16} />
                  Редактировать операцию
                </h3>
                <p className="text-[11px] text-slate-450 mt-0.5">Изменение деталей платежа</p>
              </div>
              <button
                type="button"
                onClick={onCancelEditing}
                className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleEditFormSubmit} className="p-4 sm:p-5 space-y-3.5 overflow-y-auto custom-scrollbar flex-1">
              {/* Type Toggle switcher */}
              <div className="flex bg-slate-950 p-1 rounded-xl border border-white/5">
                <button
                  type="button"
                  onClick={() => handleEditTypeChange('expense')}
                  className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    editType === 'expense'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ArrowDownLeft size={12} />
                  Расход
                </button>
                <button
                  type="button"
                  onClick={() => handleEditTypeChange('income')}
                  className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    editType === 'income'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ArrowUpRight size={12} />
                  Доход
                </button>
                <button
                  type="button"
                  onClick={() => handleEditTypeChange('transfer')}
                  className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    editType === 'transfer'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ArrowUpDown size={12} />
                  Перевод
                </button>
              </div>

              {/* Row 1: Amount & Date */}
              <div className="grid grid-cols-2 gap-3">
                {/* Amount input */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider select-none">
                    Сумма в ₼
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-display font-black text-slate-400 text-xs">
                      ₼
                    </span>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      placeholder="0.00"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      className="w-full pl-6 pr-3 py-1.5 bg-slate-950/60 border border-white/10 rounded-xl text-xs font-display font-extrabold text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-teal-400"
                      required
                    />
                  </div>
                </div>

                {/* Date selection */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider flex items-center gap-1 select-none">
                    <Calendar size={11} />
                    Дата
                  </label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full p-1.5 bg-slate-950/60 border border-white/10 rounded-xl text-xs text-slate-200"
                    required
                  />
                </div>
              </div>

              {/* Row 2: Accounts / Categories */}
              {editType !== 'transfer' ? (
                <div className="grid grid-cols-2 gap-3">
                  {/* Account selection */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider flex items-center gap-1 select-none text-left">
                      <CreditCard size={11} />
                      Счет
                    </label>
                    <SearchableSelect
                      compact={true}
                      items={accounts}
                      value={editAccountId}
                      onChange={(id) => setEditAccountId(id)}
                      placeholder="Счет..."
                      searchPlaceholder="Поиск..."
                      idKey="id"
                      displayValue={(acc) => `${acc.name}`}
                      filterValue={(acc) => acc.name}
                      renderItem={(acc) => (
                        <div className="flex justify-between items-center w-full text-xs">
                          <span className="font-semibold">{acc.name}</span>
                          <span className="font-mono text-[9px] text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded-md font-extrabold shrink-0 ml-2">
                            {Math.round(acc.balance)} ₼
                          </span>
                        </div>
                      )}
                    />
                  </div>

                  {/* Category selection */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider flex items-center gap-1 select-none">
                      <Tag size={11} />
                      Категория
                    </label>
                    <SearchableSelect
                      compact={true}
                      items={categories.filter(c => c.type === editType)}
                      value={editCategoryId}
                      onChange={(id) => setEditCategoryId(id)}
                      placeholder="Категория..."
                      searchPlaceholder="Поиск..."
                      idKey="id"
                      displayValue={(cat) => (
                        <div className="flex items-center gap-1 text-xs">
                          <div
                            className="w-3.5 h-3.5 rounded-sm flex items-center justify-center shrink-0"
                            style={{ backgroundColor: cat.color }}
                          >
                            <span className="text-[9px] text-white">
                              <IconComponent name={cat.icon || 'HelpCircle'} size={9} />
                            </span>
                          </div>
                          <span className="truncate">{formatCategoryDisplayName(cat.name)}</span>
                        </div>
                      )}
                      filterValue={(cat) => cat.name}
                      renderItem={(cat) => (
                        <div className="flex items-center gap-1.5 text-xs">
                          <div
                            className="w-3.5 h-3.5 rounded-md flex items-center justify-center text-white shrink-0"
                            style={{ backgroundColor: cat.color }}
                          >
                            <IconComponent name={cat.icon || 'HelpCircle'} size={9} />
                          </div>
                          <span className="font-semibold">{formatCategoryDisplayName(cat.name)}</span>
                        </div>
                      )}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {/* Account scisaniya select */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider flex items-center gap-1 select-none text-left">
                      <CreditCard size={11} className="text-amber-400" />
                      Откуда
                    </label>
                    <SearchableSelect
                      compact={true}
                      items={accounts}
                      value={editAccountId}
                      onChange={(id) => setEditAccountId(id)}
                      placeholder="Счет..."
                      searchPlaceholder="Поиск..."
                      idKey="id"
                      displayValue={(acc) => `${acc.name}`}
                      filterValue={(acc) => acc.name}
                      renderItem={(acc) => (
                        <div className="flex justify-between items-center w-full text-xs">
                          <span className="font-semibold">{acc.name}</span>
                          <span className="font-mono text-[9px] text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded-md font-extrabold shrink-0 ml-2">
                            {Math.round(acc.balance)} ₼
                          </span>
                        </div>
                      )}
                    />
                  </div>

                  {/* Destination Account selection */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider flex items-center gap-1 select-none text-left">
                      <CreditCard size={11} className="text-emerald-400" />
                      Куда
                    </label>
                    <SearchableSelect
                      compact={true}
                      items={accounts.filter(acc => acc.id !== editAccountId)}
                      value={editTransferAccountId}
                      onChange={(id) => setEditTransferAccountId(id)}
                      placeholder="Счет..."
                      searchPlaceholder="Поиск..."
                      idKey="id"
                      displayValue={(acc) => `${acc.name}`}
                      filterValue={(acc) => acc.name}
                      renderItem={(acc) => (
                        <div className="flex justify-between items-center w-full text-xs">
                          <span className="font-semibold">{acc.name}</span>
                          <span className="font-mono text-[9px] text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded-md font-extrabold shrink-0 ml-2">
                            {Math.round(acc.balance)} ₼
                          </span>
                        </div>
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Row 3: Description & Plastik card */}
              <div className={`grid ${editType !== 'transfer' ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                {/* Description selection */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">
                    Примечание
                  </label>
                  <input
                    type="text"
                    placeholder="Примечание..."
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full p-1.5 bg-slate-950/60 border border-white/10 rounded-xl text-xs text-slate-200 placeholder-slate-600"
                  />
                </div>


              </div>

              {/* Form Action button block */}
              <div className="flex gap-3 pt-4 border-t border-white/5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const cat = categories.find(c => c.id === editingTransaction.categoryId);
                    setDeleteConfirm({
                      id: editingTransaction.id,
                      description: editingTransaction.description || cat?.name || (editingTransaction.type === 'transfer' ? 'Перевод' : 'Без описания'),
                      amount: editingTransaction.amount,
                      isIncome: editingTransaction.type === 'income'
                    });
                  }}
                  className="px-3.5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-350 text-xs font-bold rounded-xl border border-red-500/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                  title="Удалить операцию"
                >
                  <Trash2 size={13} className="stroke-[2.5px]" />
                  <span>Удалить</span>
                </button>
                <button
                  type="button"
                  onClick={onCancelEditing}
                  className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-slate-350 text-xs font-semibold rounded-xl border border-white/5 transition-colors cursor-pointer text-center"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer text-center"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-3xl shadow-2xl p-6 text-center space-y-4 animate-scale-up" id="delete-transaction-confirm-modal">
            <div className="w-12 h-12 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto">
              <Trash2 size={22} className="stroke-[2.5px]" />
            </div>
            
            <div className="space-y-1.5 animate-none">
              <h3 className="text-base font-display font-bold text-white">Удалить операцию?</h3>
              <p className="text-xs text-slate-400 leading-relaxed text-balance text-left sm:text-center">
                Вы действительно хотите удалить платежную операцию <span className="text-white font-semibold">"{deleteConfirm.description}"</span> на сумму <span className={deleteConfirm.isIncome ? "text-emerald-400 font-bold" : "text-rose-450 font-bold"}>{deleteConfirm.isIncome ? '+' : '-'}{deleteConfirm.amount.toFixed(2)} ₼</span>? 
                Баланс связанного счета автоматически пересчитается в обратную сторону.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-slate-350 text-xs font-semibold rounded-xl border border-white/5 transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteTransaction(deleteConfirm.id);
                  setDeleteConfirm(null);
                  if (onCancelEditing) onCancelEditing();
                }}
                className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-rose-500/10 hover:shadow-rose-500/20 cursor-pointer"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
