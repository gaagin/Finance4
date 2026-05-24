import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, Category, Account, TransactionType, BankCard } from '../types';
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
  onCancelEditing
}: TransactionPanelProps) {
  
  // New Quick Add Transaction state
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState('2026-05-23'); // Default lock to 23 May 2026
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

  // Synchronize Edit Modal state when editingTransaction triggers
  useEffect(() => {
    if (editingTransaction) {
      setEditAmount(editingTransaction.amount.toString());
      setEditType(editingTransaction.type);
      setEditAccountId(editingTransaction.accountId);
      setEditCategoryId(editingTransaction.categoryId);
      setEditDate(editingTransaction.date);
      setEditDescription(editingTransaction.description || '');
      setEditCardId(editingTransaction.cardId);
    }
  }, [editingTransaction]);

  // Handle changing Transaction Type within the Edit Modal
  const handleEditTypeChange = (newType: TransactionType) => {
    setEditType(newType);
    const filteredCats = categories.filter(c => c.type === newType);
    if (filteredCats.length > 0) {
      setEditCategoryId(filteredCats[0].id);
    } else {
      setEditCategoryId('');
    }
  };

  // Submit handler for Transaction Edit Modal
  const handleEditFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAmount || isNaN(Number(editAmount)) || Number(editAmount) <= 0 || !editAccountId || !editCategoryId || !editDate) {
      alert('Пожалуйста, заполните необходимые поля корректными значениями.');
      return;
    }

    if (editingTransaction) {
      onUpdateTransaction({
        id: editingTransaction.id,
        accountId: editAccountId,
        categoryId: editCategoryId,
        amount: Number(editAmount),
        type: editType,
        date: editDate,
        description: editDescription.trim(),
        cardId: editCardId || undefined
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
      if (accounts.length > 0) setAccountId(accounts[0].id);
      const options = categories.filter(c => c.type === type);
      if (options.length > 0) setCategoryId(options[0].id);
      setCardId(undefined);
    } else {
      // Setup default form
      if (accounts.length > 0 && !accountId) setAccountId(accounts[0].id);
      const options = categories.filter(c => c.type === type);
      if (options.length > 0 && !categoryId) setCategoryId(options[0].id);
      setCardId(undefined);
    }
  }, [preselectedDate]);

  // Handle changing Transaction Type within the creation form (switches suitable categories)
  const handleFormTypeChange = (newType: TransactionType) => {
    setType(newType);
    const filteredCats = categories.filter(c => c.type === newType);
    if (filteredCats.length > 0) {
      setCategoryId(filteredCats[0].id);
    } else {
      setCategoryId('');
    }
  };

  // Submission handler
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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

    // Reset Form
    setAmount('');
    setDescription('');
    setCardId(undefined);
    if (onClearPreselectedDate) onClearPreselectedDate();
  };

  // Advanced Filters State
  const [filterSearch, setFilterSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');
  const [filterAccount, setFilterAccount] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterDateRange, setFilterDateRange] = useState<'all' | 'may' | 'april' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('2026-05-01');
  const [customEndDate, setCustomEndDate] = useState('2026-05-31');
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

  // Count active filters (ignoring search text)
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterType !== 'all') count++;
    if (filterAccount !== 'all') count++;
    if (filterCategory !== 'all') count++;
    if (filterDateRange !== 'all') count++;
    return count;
  }, [filterType, filterAccount, filterCategory, filterDateRange]);

  // Sorting
  const [sortField, setSortField] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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
    if (filterDateRange === 'may') {
      result = result.filter(tx => tx.date.startsWith('2026-05'));
    } else if (filterDateRange === 'april') {
      result = result.filter(tx => tx.date.startsWith('2026-04'));
    } else if (filterDateRange === 'custom') {
      result = result.filter(tx => tx.date >= customStartDate && tx.date <= customEndDate);
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
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8" id="transactions-panel-layout">
      
      {/* 1. Transaction form wrapper (Left Column) */}
      <div className="bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10 shadow-lg h-fit" id="transaction-form-panel">
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
          
          {/* Inc / Exp selector segment */}
          <div className="flex bg-slate-900/60 p-1 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => handleFormTypeChange('expense')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                type === 'expense'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ArrowDownLeft size={13} />
              Расход
            </button>
            <button
              type="button"
              onClick={() => handleFormTypeChange('income')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                type === 'income'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ArrowUpRight size={13} />
              Доход
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

          {/* Account select */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider flex items-center gap-1.5 select-none">
              <CreditCard size={12} />
              Счет списания/внесения
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

          {/* Category select */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider flex items-center gap-1.5 select-none">
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
                  <span className="truncate">{cat.name}</span>
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
                  <span className="font-semibold">{cat.name}</span>
                </div>
              )}
            />
          </div>

          {/* Date input */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider flex items-center gap-1">
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
            <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">
              Описание / Примечание
            </label>
            <input
              type="text"
              placeholder="Например: Покупка продуктов в Bravo"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 bg-slate-950/60 border border-white/10 rounded-xl text-sm text-slate-200 placeholder-slate-500"
            />
          </div>

          {/* Optional Bank Card linkage */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider flex items-center gap-1">
              <CreditCard size={12} className="text-teal-300" />
              Привязать банковскую карту (Опционально)
            </label>
            <select
              value={cardId || ''}
              onChange={(e) => setCardId(e.target.value || undefined)}
              className="w-full p-2.5 bg-slate-950/60 border border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-teal-400 text-slate-200 cursor-pointer text-ellipsis"
            >
              <option value="" className="bg-slate-950 text-slate-400">Без пластиковой карты (m10/Наличные)</option>
              {cards.map(card => (
                <option key={card.id} value={card.id} className="bg-slate-950 text-slate-200">
                  {card.bank} •••• {card.lastFour} ({card.name})
                </option>
              ))}
            </select>
            {cards.length === 0 && (
              <span className="text-[10px] text-slate-500 mt-1 block">
                У вас нет привязанных карт. Их можно добавить на вкладке «Категории и Счета».
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className={`flex-1 py-3 rounded-xl text-slate-950 font-extrabold text-xs transition-colors shadow-xs uppercase tracking-wider font-display flex items-center justify-center gap-1 cursor-pointer ${
                type === 'expense' 
                  ? 'bg-rose-450 hover:bg-rose-400 text-slate-950' 
                  : 'bg-teal-500 hover:bg-teal-400 text-slate-950'
              }`}
            >
              Внести операцию
            </button>
          </div>
        </form>
      </div>

      {/* 2. Comprehensive transactions list with filtering (Right 2-Columns) */}
      <div className="xl:col-span-2 bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10 shadow-lg flex flex-col justify-between" id="transactions-list-panel">
        <div>
          
          {/* Header of list */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-display font-bold text-white">История движения средств</h2>
              <p className="text-xs text-slate-400">Найдено {filteredTransactions.length} операций из {transactions.length}</p>
            </div>

            {/* Quick Keyword search bar */}
            <div className="relative w-full md:w-72">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Search size={15} />
              </span>
              <input
                type="text"
                placeholder="Поиск по описанию ..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-xs text-white focus:ring-1 focus:ring-teal-400"
              />
              {filterSearch && (
                <button
                  onClick={() => setFilterSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  Сброс
                </button>
              )}
            </div>
          </div>

          {/* Filtering Controls Row 1 */}
          <div className="bg-white/5 border border-white/10 p-4 rounded-2xl mb-4 transition-all duration-300">
            <button
              type="button"
              onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
              className="flex items-center justify-between w-full text-xs text-slate-300 font-bold uppercase tracking-wider select-none cursor-pointer focus:outline-none"
            >
              <div className="flex items-center gap-1.5">
                <Filter size={12} className="text-teal-400" />
                <span>Фильтры и сортировка</span>
                {activeFiltersCount > 0 && (
                  <span className="ml-2 bg-teal-500/20 text-teal-400 border border-teal-500/30 font-display font-extrabold text-[9px] px-1.5 py-0.5 rounded-full normal-case animate-pulse">
                    Активно: {activeFiltersCount}
                  </span>
                )}
              </div>
              <div className="text-slate-400 hover:text-white transition-colors">
                {isFiltersExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
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
                    </select>
                  </div>

                  {/* Filter by Account */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">СЧЕТ</label>
                    <select
                      value={filterAccount}
                      onChange={(e) => setFilterAccount(e.target.value)}
                      className="w-full p-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-slate-200 cursor-pointer"
                    >
                      <option value="all" className="bg-slate-950 text-slate-300">Все счета</option>
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id} className="bg-slate-950 text-slate-300">{acc.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Filter by Category */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">КАТЕГОРИЯ</label>
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="w-full p-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-slate-200 cursor-pointer"
                    >
                      <option value="all" className="bg-slate-950 text-slate-300">Все категории</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id} className="bg-slate-950 text-slate-300">{cat.name} ({cat.type === 'income' ? 'д' : 'р'})</option>
                      ))}
                    </select>
                  </div>

                  {/* Filter by Date Preset */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">ПЕРИОД ВРЕМЕНИ</label>
                    <select
                      value={filterDateRange}
                      onChange={(e) => setFilterDateRange(e.target.value as any)}
                      className="w-full p-2 bg-slate-950 border border-white/10 rounded-lg text-xs text-slate-200 cursor-pointer"
                    >
                      <option value="all" className="bg-slate-950 text-slate-300">За всё время</option>
                      <option value="may" className="bg-slate-950 text-slate-300">Май 2026</option>
                      <option value="april" className="bg-slate-950 text-slate-300">Апрель 2026</option>
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
            <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1 custom-scrollbar">
              
              {/* Column headings for desktop */}
              <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                <div className="col-span-3">Категория / Описание</div>
                <div className="col-span-3">Счет</div>
                <div className="col-span-2 cursor-pointer select-none hover:text-white flex items-center gap-1" onClick={() => toggleSort('date')}>
                  Дата <ArrowUpDown size={10} />
                </div>
                <div className="col-span-2 cursor-pointer select-none hover:text-white text-right flex items-center justify-end gap-1" onClick={() => toggleSort('amount')}>
                  Сумма <ArrowUpDown size={10} />
                </div>
                <div className="col-span-2 text-right">Действия</div>
              </div>

              {filteredTransactions.map(tx => {
                const cat = categories.find(c => c.id === tx.categoryId);
                const acc = accounts.find(a => a.id === tx.accountId);
                const card = tx.cardId ? cards.find(c => c.id === tx.cardId) : null;
                const isIncome = tx.type === 'income';

                return (
                  <div
                    key={tx.id}
                    className={`grid grid-cols-1 md:grid-cols-12 gap-3 items-center p-3 px-4 rounded-2xl border transition-all hover:shadow-sm group ${
                      editingTransaction?.id === tx.id
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : isIncome
                        ? 'bg-emerald-500/5 hover:bg-emerald-500/10 border-white/5'
                        : 'bg-white/5 hover:bg-white/10 border-white/5'
                    }`}
                  >
                    {/* Category & Custom Description desc */}
                    <div className="col-span-3 flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0"
                        style={{ backgroundColor: cat?.color || '#3b82f6' }}
                      >
                        <IconComponent name={cat?.icon || 'HelpCircle'} size={14} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-xs text-slate-200 truncate leading-tight">
                          {tx.description || cat?.name || 'Без описания'}
                        </h4>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">
                          {cat?.name || 'Другое'}
                        </span>
                      </div>
                    </div>

                    {/* Associated Account & Card Link badge */}
                    <div className="col-span-3 flex flex-wrap items-center gap-1.5 md:opacity-100">
                      <span className="text-[11px] font-semibold text-slate-300 bg-white/10 px-2 py-0.5 rounded-md truncate max-w-[130px]" title={acc?.name}>
                        {acc?.name || 'Неизвестно'}
                      </span>
                      {card && (
                        <span className="text-[9px] font-bold text-teal-300 bg-teal-500/10 border border-teal-500/20 px-1.5 py-0.5 rounded-md flex items-center gap-0.5" title={`${card.bank} (${card.name})`}>
                          <CreditCard size={9} />
                          {card.bank.split(' ')[0]} *{card.lastFour}
                        </span>
                      )}
                    </div>

                    {/* Date */}
                    <div className="col-span-2 text-xs text-slate-400 font-mono">
                      {tx.date}
                    </div>

                    {/* Transaction sum */}
                    <div className="col-span-2 font-display font-extrabold text-sm md:text-right leading-none">
                      <span className={isIncome ? 'text-emerald-400' : 'text-white'}>
                        {isIncome ? '+' : '-'}{tx.amount.toFixed(2)} ₼
                      </span>
                    </div>

                     {/* Action buttons */}
                     <div className="col-span-2 flex items-center justify-end gap-1.5">
                       <button
                         onClick={() => {
                           onUpdateTransaction({ ...tx, displayInEditFormOnly: true } as any);
                         }}
                         className="p-1.5 px-2.5 text-[11px] font-semibold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-white/10 rounded-xl hover:bg-teal-500 hover:text-slate-950 dark:hover:bg-teal-450 dark:hover:text-slate-950 transition-all cursor-pointer flex items-center gap-1 shrink-0"
                         title="Редактировать запись"
                       >
                         <Edit2 size={11} />
                         <span className="md:hidden font-semibold">Изм</span>
                       </button>
 
                       <button
                         onClick={() => {
                           const associatedCat = categories.find(c => c.id === tx.categoryId);
                           setDeleteConfirm({
                             id: tx.id,
                             description: tx.description || associatedCat?.name || 'Без описания',
                             amount: tx.amount,
                             isIncome: tx.type === 'income'
                           });
                         }}
                         className="p-1.5 px-2.5 text-[11px] font-semibold bg-white/5 hover:bg-rose-500/15 hover:text-rose-400 text-slate-400 border border-white/5 hover:border-rose-500/35 rounded-xl transition-all cursor-pointer flex items-center gap-1 shrink-0"
                         title="Удалить запись"
                       >
                         <Trash2 size={11} />
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
          <span><b>Всего отфильтровано:</b> Трат: {filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0).toFixed(1)} AZN, Доходов: {filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0).toFixed(1)} AZN.</span>
        </div>
      </div>

      {/* TRANSACTION EDIT MODAL */}
      {editingTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden text-left" id="edit-transaction-modal">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-white/5">
              <div>
                <h3 className="text-base font-display font-bold text-white flex items-center gap-2">
                  <Edit2 className="text-teal-400" size={18} />
                  Редактировать операцию
                </h3>
                <p className="text-xs text-slate-400 mt-1">Изменение деталей платежа</p>
              </div>
              <button
                type="button"
                onClick={onCancelEditing}
                className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEditFormSubmit} className="p-6 space-y-4">
              {/* Type Toggle switcher */}
              <div className="flex bg-slate-950 p-1 rounded-xl border border-white/5">
                <button
                  type="button"
                  onClick={() => handleEditTypeChange('expense')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    editType === 'expense'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ArrowDownLeft size={13} />
                  Расход
                </button>
                <button
                  type="button"
                  onClick={() => handleEditTypeChange('income')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    editType === 'income'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ArrowUpRight size={13} />
                  Доход
                </button>
              </div>

              {/* Amount input */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                  Сумма в Манатах (₼)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-display font-extrabold text-slate-400 text-sm">
                    ₼
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    placeholder="0.00"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-sm font-display font-bold text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-400"
                    required
                  />
                </div>
              </div>

              {/* Account selection */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider flex items-center gap-1.5 select-none">
                  <CreditCard size={12} />
                  Счет
                </label>
                <SearchableSelect
                  items={accounts}
                  value={editAccountId}
                  onChange={(id) => setEditAccountId(id)}
                  placeholder="Выберите счет..."
                  searchPlaceholder="Поиск счета..."
                  idKey="id"
                  displayValue={(acc) => `${acc.name} (${Math.round(acc.balance)} ₼)`}
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
                <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider flex items-center gap-1.5 select-none">
                  <Tag size={12} />
                  Категория
                </label>
                <SearchableSelect
                  items={categories.filter(c => c.type === editType)}
                  value={editCategoryId}
                  onChange={(id) => setEditCategoryId(id)}
                  placeholder="Выберите категорию..."
                  searchPlaceholder="Поиск категории..."
                  idKey="id"
                  displayValue={(cat) => (
                    <div className="flex items-center gap-2 text-xs">
                      <div
                        className="w-4 h-4 rounded-sm flex items-center justify-center shrink-0"
                        style={{ backgroundColor: cat.color }}
                      >
                        <span className="text-[10px] text-white">
                          <IconComponent name={cat.icon || 'HelpCircle'} size={10} />
                        </span>
                      </div>
                      <span className="truncate">{cat.name}</span>
                    </div>
                  )}
                  filterValue={(cat) => cat.name}
                  renderItem={(cat) => (
                    <div className="flex items-center gap-2 text-xs">
                      <div
                        className="w-4 h-4 rounded-md flex items-center justify-center text-white shrink-0"
                        style={{ backgroundColor: cat.color }}
                      >
                        <IconComponent name={cat.icon || 'HelpCircle'} size={10} />
                      </div>
                      <span className="font-semibold">{cat.name}</span>
                    </div>
                  )}
                />
              </div>

              {/* Date selection */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider flex items-center gap-1">
                  <Calendar size={12} />
                  Дата
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full p-2 bg-slate-950/60 border border-white/10 rounded-xl text-xs text-slate-200"
                  required
                />
              </div>

              {/* Description selection */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                  Описание / Примечание
                </label>
                <input
                  type="text"
                  placeholder="Примечание..."
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full p-2 bg-slate-950/60 border border-white/10 rounded-xl text-xs text-slate-200 placeholder-slate-600"
                />
              </div>

              {/* Card selection */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider flex items-center gap-1">
                  <CreditCard size={12} className="text-teal-300" />
                  Привязать пластиковую карту (Опционально)
                </label>
                <select
                  value={editCardId || ''}
                  onChange={(e) => setEditCardId(e.target.value || undefined)}
                  className="w-full p-2 bg-slate-950/60 border border-white/10 rounded-xl text-xs text-slate-200 cursor-pointer text-ellipsis"
                >
                  <option value="" className="bg-slate-950 text-slate-400">Без пластиковой карты (m10/Наличные)</option>
                  {cards.map(card => (
                    <option key={card.id} value={card.id} className="bg-slate-950 text-slate-200">
                      {card.bank} •••• {card.lastFour} ({card.name})
                    </option>
                  ))}
                </select>
              </div>

              {/* Form Action button block */}
              <div className="flex gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={onCancelEditing}
                  className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-slate-350 text-xs font-semibold rounded-xl border border-white/5 transition-colors cursor-pointer text-center"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer text-center"
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
