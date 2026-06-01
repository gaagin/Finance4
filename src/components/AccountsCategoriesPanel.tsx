import React, { useState } from 'react';
import { Account, Category, Transaction, TransactionType, BankCard, formatCategoryDisplayName, BudgetLimit } from '../types';
import { IconComponent, AVAILABLE_ICONS } from './IconComponent';
import { Plus, Trash2, Edit2, Wallet, PlusCircle, Check, Info, CreditCard, Sun, Moon, X, AlertTriangle, TrendingUp } from 'lucide-react';

interface AccountsCategoriesPanelProps {
  accounts: Account[];
  categories: Category[];
  cards: BankCard[];
  onAddAccount: (acc: Omit<Account, 'id'>) => void;
  onUpdateAccount: (acc: Account) => void;
  onDeleteAccount: (id: string) => void;
  onAddCategory: (cat: Omit<Category, 'id'>) => string | void;
  onUpdateCategory: (cat: Category) => void;
  onDeleteCategory: (id: string) => void;
  onAddCard: (card: Omit<BankCard, 'id'>) => void;
  onUpdateCard: (card: BankCard) => void;
  onDeleteCard: (id: string) => void;
  theme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
  budgets?: BudgetLimit[];
  onSaveBudget?: (categoryId: string, limitAmount: number, month?: string) => void;
  onDeleteBudget?: (categoryId: string, month?: string) => void;
  transactions?: Transaction[];
}

const COLOR_OPTIONS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', 
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', 
  '#3b82f6', '#4f46e5', '#6366f1', '#8b5cf6', '#a855f7', 
  '#d946ef', '#ec4899', '#f43f5e', '#64748b'
];

const ACCOUNT_COLORS = [
  'text-amber-600', 'text-red-600', 'text-sky-600', 
  'text-teal-600', 'text-indigo-600', 'text-slate-600',
  'text-emerald-600', 'text-rose-600'
];

export function AccountsCategoriesPanel({
  accounts,
  categories,
  cards = [],
  onAddAccount,
  onUpdateAccount,
  onDeleteAccount,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onAddCard,
  onUpdateCard,
  onDeleteCard,
  theme,
  onThemeChange,
  budgets = [],
  onSaveBudget,
  onDeleteBudget,
  transactions = []
}: AccountsCategoriesPanelProps) {
  
  // Delete confirmation overlay state
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: 'card' | 'account' | 'category'; name: string } | null>(null);
  
  // Left side sub-tab: accounts vs bank cards
  const [leftTab, setLeftTab] = useState<'accounts' | 'cards'>('accounts');

  // Modals for adding
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);

  // Tab selector for Categories
  const [activeCategoryTab, setActiveCategoryTab] = useState<TransactionType>('expense');

  // Account form states
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState('card');
  const [accBalance, setAccBalance] = useState('');
  const [accColor, setAccColor] = useState('text-sky-600');
  const [accQuickEntry, setAccQuickEntry] = useState(true);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);

  // Bank Card form states
  const [cardName, setCardName] = useState('');
  const [cardBank, setCardBank] = useState('Kapital Bank');
  const [cardLastFour, setCardLastFour] = useState('');
  const [editingCardId, setEditingCardId] = useState<string | null>(null);

  // Category form states
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('HelpCircle');
  const [catColor, setCatColor] = useState('#3b82f6');
  const [catQuickEntry, setCatQuickEntry] = useState(true);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [catIsSub, setCatIsSub] = useState(false);
  const [catParentId, setCatParentId] = useState('none');
  const [catBudgetLimit, setCatBudgetLimit] = useState('');

  const formatMonthKey = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const monthNames: { [key: string]: string } = {
      '01': 'Янв', '02': 'Фев', '03': 'Мар', '04': 'Апр', '05': 'Май', '06': 'Июн',
      '07': 'Июл', '08': 'Авг', '09': 'Сен', '10': 'Окт', '11': 'Ноя', '12': 'Дек'
    };
    return `${monthNames[month] || month} ${year}`;
  };

  const calculateAverage12Months = (catId?: string | null) => {
    if (!catId) return { average: 0, totalSum: 0, monthlyDetails: [] };
    
    const today = new Date();
    const months: string[] = [];
    
    for (let i = 0; i < 12; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      months.push(`${yr}-${mo}`);
    }
    
    const catExpenses = (transactions || []).filter(t => 
      t.categoryId === catId && t.type === 'expense'
    );

    const monthlySums: { [key: string]: number } = {};
    months.forEach(m => {
      monthlySums[m] = 0;
    });

    catExpenses.forEach(t => {
      if (t.date && t.date.length >= 7) {
        const transMonth = t.date.substring(0, 7);
        if (months.includes(transMonth)) {
          monthlySums[transMonth] += Math.abs(t.amount);
        }
      }
    });

    const totalSum = months.reduce((sum, m) => sum + monthlySums[m], 0);
    const average = totalSum / 12;

    const monthlyDetails = months.map(m => ({
      month: m,
      amount: monthlySums[m]
    })).reverse(); // chronological

    return {
      average,
      totalSum,
      monthlyDetails
    };
  };

  // Group categories into parent -> subcategories for layout and select drops
  const getGroupedCategories = () => {
    const activeCats = categories.filter(cat => cat.type === activeCategoryTab);
    const separators = ['/', '—', '–', '-', '−'];
    
    const topLevel: Category[] = [];
    const subCatsMap: { [parentId: string]: Category[] } = {};
    const orphanedSubs: Category[] = [];

    const nameMap = new Map<string, Category>();
    activeCats.forEach(cat => {
      nameMap.set(cat.name.trim().toLowerCase(), cat);
    });

    activeCats.forEach(cat => {
      let isSub = false;
      for (const sep of separators) {
        if (cat.name.includes(sep)) {
          const parts = cat.name.split(sep);
          const parentPart = parts[0].trim().toLowerCase();
          const parentCat = nameMap.get(parentPart);
          
          if (parentCat && parentCat.id !== cat.id) {
            isSub = true;
            if (!subCatsMap[parentCat.id]) {
              subCatsMap[parentCat.id] = [];
            }
            subCatsMap[parentCat.id].push(cat);
            break;
          }
        }
      }
      if (!isSub) {
        let hasSelfParentInName = false;
        for (const sep of separators) {
          if (cat.name.includes(sep)) {
            const parts = cat.name.split(sep);
            const parentPart = parts[0].trim().toLowerCase();
            if (nameMap.has(parentPart) && nameMap.get(parentPart)?.id !== cat.id) {
              hasSelfParentInName = true;
            }
          }
        }
        if (!hasSelfParentInName) {
          topLevel.push(cat);
        } else {
          orphanedSubs.push(cat);
        }
      }
    });

    // Handle orphaned subs if any
    orphanedSubs.forEach(cat => {
      topLevel.push(cat);
    });

    return { topLevel, subCatsMap };
  };

  // List of possible parent categories
  const parentCandidates = categories.filter(c => 
    c.type === activeCategoryTab && 
    c.id !== editingCategoryId && 
    !c.name.includes('/') && 
    !c.name.includes('-') && 
    !c.name.includes('—') && 
    !c.name.includes('–') && 
    !c.name.includes('−')
  );

  // Card Form Submission
  const handleCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDigits = cardLastFour.trim().replace(/\s/g, '');
    if (!cardName.trim() || !cardBank.trim() || cleanDigits.length !== 4) return;

    if (editingCardId) {
      onUpdateCard({
        id: editingCardId,
        name: cardName,
        bank: cardBank,
        lastFour: cleanDigits
      });
      setEditingCardId(null);
    } else {
      onAddCard({
        name: cardName,
        bank: cardBank,
        lastFour: cleanDigits
      });
      setIsAddCardOpen(false);
    }

    // Reset Form
    setCardName('');
    setCardBank('Kapital Bank');
    setCardLastFour('');
  };

  const handleEditCard = (card: BankCard) => {
    setEditingCardId(card.id);
    setCardName(card.name);
    setCardBank(card.bank);
    setCardLastFour(card.lastFour);
  };

  const handleCancelCardEdit = () => {
    setEditingCardId(null);
    setCardName('');
    setCardBank('Kapital Bank');
    setCardLastFour('');
  };

  const handleCancelAddCard = () => {
    setIsAddCardOpen(false);
    setCardName('');
    setCardBank('Kapital Bank');
    setCardLastFour('');
  };

  // Account Form Submission
  const handleAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName.trim() || !accBalance || isNaN(Number(accBalance))) return;

    if (editingAccountId) {
      onUpdateAccount({
        id: editingAccountId,
        name: accName,
        type: accType,
        balance: Number(accBalance),
        color: accColor,
        quickEntry: accQuickEntry
      });
      setEditingAccountId(null);
    } else {
      onAddAccount({
        name: accName,
        type: accType,
        balance: Number(accBalance),
        color: accColor,
        quickEntry: accQuickEntry
      });
      setIsAddAccountOpen(false);
    }

    // Reset Form
    setAccName('');
    setAccBalance('');
    setAccType('card');
    setAccColor('text-sky-600');
    setAccQuickEntry(true);
  };

  const handleEditAccount = (acc: Account) => {
    setEditingAccountId(acc.id);
    setAccName(acc.name);
    setAccType(acc.type);
    setAccBalance(acc.balance.toString());
    setAccColor(acc.color);
    setAccQuickEntry(acc.quickEntry !== false);
  };

  const handleCancelAccountEdit = () => {
    setEditingAccountId(null);
    setAccName('');
    setAccBalance('');
    setAccType('card');
    setAccColor('text-sky-600');
    setAccQuickEntry(true);
  };

  const handleCancelAddAccount = () => {
    setIsAddAccountOpen(false);
    setAccName('');
    setAccBalance('');
    setAccType('card');
    setAccColor('text-sky-600');
    setAccQuickEntry(true);
  };

  // Category Form Submission
  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    let finalName = catName.trim();
    let finalIcon = catIcon;
    let finalColor = catColor;

    if (catIsSub && catParentId !== 'none') {
      const parentCat = categories.find(c => c.id === catParentId);
      if (parentCat) {
        // Use dash since they requested: "После тире писалось."
        finalName = `${parentCat.name} - ${catName.trim()}`;
        // Automatically inherit icon and color from parent if not altered
        finalIcon = parentCat.icon;
        finalColor = parentCat.color;
      }
    }

    let targetCatId = editingCategoryId;

    if (editingCategoryId) {
      onUpdateCategory({
        id: editingCategoryId,
        name: finalName,
        icon: finalIcon,
        color: finalColor,
        type: activeCategoryTab,
        quickEntry: catQuickEntry
      });
      setEditingCategoryId(null);
    } else {
      const result = onAddCategory({
        name: finalName,
        icon: finalIcon,
        color: finalColor,
        type: activeCategoryTab,
        quickEntry: catQuickEntry
      });
      if (typeof result === 'string') {
        targetCatId = result;
      }
      setIsAddCategoryOpen(false);
    }

    // Save or delete budget limit if type is expense
    if (activeCategoryTab === 'expense' && targetCatId && onSaveBudget && onDeleteBudget) {
      const cleanLimit = catBudgetLimit.trim();
      if (cleanLimit && !isNaN(Number(cleanLimit)) && Number(cleanLimit) > 0) {
        onSaveBudget(targetCatId, Number(cleanLimit), '2026-05');
      } else {
        onDeleteBudget(targetCatId, '2026-05');
      }
    }

    // Reset Form
    setCatName('');
    setCatIcon('HelpCircle');
    setCatColor('#3b82f6');
    setCatQuickEntry(true);
    setCatIsSub(false);
    setCatParentId('none');
    setCatBudgetLimit('');
  };

  const handleCancelAddCategory = () => {
    setIsAddCategoryOpen(false);
    setCatName('');
    setCatIcon('HelpCircle');
    setCatColor('#3b82f6');
    setCatQuickEntry(true);
    setCatIsSub(false);
    setCatParentId('none');
    setCatBudgetLimit('');
  };

  const handleEditCategory = (cat: Category) => {
    setEditingCategoryId(cat.id);
    
    // Parse name to see if it has a subcategory structure
    const separators = ['/', '—', '–', '-', '−'];
    let parsedParentId = 'none';
    let parsedSubName = cat.name;
    let isSub = false;

    for (const sep of separators) {
      if (cat.name.includes(sep)) {
        const parts = cat.name.split(sep);
        const parentPart = parts[0].trim();
        const subPart = parts.slice(1).join(sep).trim();
        
        const parentCat = categories.find(
          c => c.name.trim().toLowerCase() === parentPart.toLowerCase() && 
          c.type === cat.type && 
          c.id !== cat.id
        );
        if (parentCat) {
          parsedParentId = parentCat.id;
          parsedSubName = subPart;
          isSub = true;
          break;
        }
      }
    }

    setCatIsSub(isSub);
    setCatParentId(parsedParentId);
    setCatName(parsedSubName);
    setCatIcon(cat.icon);
    setCatColor(cat.color);
    setCatQuickEntry(cat.quickEntry !== false);

    // Fetch budget limit for category
    const existingBudget = budgets?.find(b => b.categoryId === cat.id && (!b.month || b.month === '2026-05'));
    setCatBudgetLimit(existingBudget ? existingBudget.limitAmount.toString() : '');
  };

  const handleCancelCategoryEdit = () => {
    setEditingCategoryId(null);
    setCatName('');
    setCatIcon('HelpCircle');
    setCatColor('#3b82f6');
    setCatQuickEntry(true);
    setCatIsSub(false);
    setCatParentId('none');
    setCatBudgetLimit('');
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8" id="accounts-categories-root">
      
      {/* COLUMN 1: Accounts Management */}
      <div className={`backdrop-blur-md rounded-3xl p-6 border shadow-lg flex flex-col justify-between transition-colors duration-200 ${
        theme === 'dark'
          ? 'bg-slate-900/40 border-white/10'
          : 'bg-white border-slate-200'
      }`} id="accounts-management">
        <div>
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-2 border-b transition-colors duration-200 ${
            theme === 'dark' ? 'border-b border-white/5' : 'border-b border-slate-100'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl border transition-colors ${
                theme === 'dark'
                  ? 'bg-white/10 border-white/10 text-teal-300'
                  : 'bg-slate-100 border-slate-200 text-teal-600'
              }`}>
                <Wallet size={20} />
              </div>
              <div>
                <h3 className={`font-display font-bold text-lg ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}>Счета</h3>
                <p className={`text-xs ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                }`}>Настройка банковских балансов и кошельков</p>
              </div>
            </div>
          </div>

          {/* Add Accounts Button trigger */}
          <button
            type="button"
            onClick={() => setIsAddAccountOpen(true)}
            className="w-full py-3 mb-6 bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-sm rounded-2xl uppercase tracking-wider font-display flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all transform hover:scale-[1.01] active:scale-[0.98]"
          >
            <PlusCircle size={18} />
            Добавить счет
          </button>

          {/* Account list rendering */}
          <div className="max-h-[360px] lg:max-h-[620px] overflow-y-auto pr-1 custom-scrollbar">
            <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/40 divide-y divide-slate-100 dark:divide-white/5 shadow-xs">
              {accounts.map(acc => {
                const totalUsed = acc.balance;
                let typeLabel = 'Счет';
                if (acc.type === 'cash') typeLabel = 'Наличные';
                if (acc.type === 'savings') typeLabel = 'Копилка';
                if (acc.type === 'debt') typeLabel = 'Долг / Кредит';
                if (acc.type === 'hidden') typeLabel = 'Скрытый';

                return (
                  <div
                    key={acc.id}
                    className={`flex items-center justify-between p-3 bg-transparent transition-all border-b last:border-0 ${
                      theme === 'dark'
                        ? 'hover:bg-white/5 border-white/5'
                        : 'hover:bg-slate-50/50 border-slate-150'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-colors ${
                        theme === 'dark'
                          ? 'bg-slate-950 border-white/10'
                          : 'bg-slate-100 border-slate-200'
                      }`}>
                        <span className={`font-display font-extrabold text-lg ${acc.color}`}>
                          {acc.name[0]?.toUpperCase() || 'S'}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className={`font-semibold text-sm leading-tight truncate ${
                            theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
                          }`}>{acc.name}</h4>
                          {acc.quickEntry !== false ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                              <Check size={8} className="stroke-[3px]" />
                              <span>Быстрая</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-slate-500/10 text-slate-400 border border-slate-500/20 shrink-0">
                              <span>Скрыт</span>
                            </span>
                          )}
                        </div>
                        <p className={`text-[10px] font-medium uppercase tracking-wider mt-0.5 ${
                          theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                        }`}>{typeLabel}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className={`font-display font-extrabold text-sm ${
                          theme === 'dark' ? 'text-slate-200' : 'text-slate-850'
                        }`}>{totalUsed.toFixed(2)} ₼</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleEditAccount(acc)}
                          className={`p-1 px-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                            theme === 'dark'
                              ? 'hover:bg-white/10 text-slate-400 hover:text-white'
                              : 'hover:bg-slate-150 text-slate-500 hover:text-slate-900'
                          }`}
                          title="Изменить счет"
                        >
                          <Edit2 size={13} />
                        </button>
                        
                        <button
                          onClick={() => {
                            if (accounts.length > 1) {
                              setDeleteConfirm({ id: acc.id, type: 'account', name: acc.name });
                            }
                          }}
                          disabled={accounts.length <= 1} // Prevent deleting the last remaining account
                          className={`p-1 disabled:opacity-30 rounded-lg transition-colors cursor-pointer shrink-0 ${
                            theme === 'dark'
                              ? 'hover:bg-rose-500/10 text-slate-400 hover:text-rose-450'
                              : 'hover:bg-rose-100 text-slate-500 hover:text-rose-650'
                          }`}
                          title={accounts.length === 1 ? 'Нельзя удалить единственный счет' : 'Удалить счет'}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>


      </div>

      {/* COLUMN 2: Categories Management with Internal Tabs (Expense vs Income) */}
      <div className={`backdrop-blur-md rounded-3xl p-6 border shadow-lg flex flex-col justify-between transition-colors duration-200 ${
        theme === 'dark'
          ? 'bg-slate-900/40 border-white/10'
          : 'bg-white border-slate-200'
      }`} id="categories-management">
        <div>
          <div className={`flex items-center justify-between gap-4 mb-6 pb-2 border-b transition-colors duration-200 ${
            theme === 'dark' ? 'border-b border-white/5' : 'border-b border-slate-100'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl border transition-colors ${
                theme === 'dark'
                  ? 'bg-white/10 border-white/10 text-amber-400'
                  : 'bg-slate-100 border-slate-200 text-amber-600'
              }`}>
                <PlusCircle size={20} />
              </div>
              <div>
                <h3 className={`font-display font-bold text-lg ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}>Категории</h3>
                <p className={`text-xs ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                }`}>Организуйте статьи трат и доходов</p>
              </div>
            </div>

            {/* Exp vs Inc Tabs */}
            <div className={`flex p-1 rounded-xl border transition-colors duration-200 ${
              theme === 'dark'
                ? 'bg-slate-950/60 border-white/10'
                : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                type="button"
                onClick={() => {
                  setActiveCategoryTab('expense');
                  setEditingCategoryId(null);
                  setCatName('');
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeCategoryTab === 'expense'
                    ? theme === 'dark'
                      ? 'bg-white/15 text-white border border-white/10 shadow-xs'
                      : 'bg-white text-slate-900 shadow-md border border-slate-200/50'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Расходы
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveCategoryTab('income');
                  setEditingCategoryId(null);
                  setCatName('');
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeCategoryTab === 'income'
                    ? theme === 'dark'
                      ? 'bg-white/15 text-white border border-white/10 shadow-xs'
                      : 'bg-white text-slate-900 shadow-md border border-slate-200/50'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Доходы
              </button>
            </div>
          </div>

          {/* Add Category Button trigger */}
          <button
            type="button"
            onClick={() => setIsAddCategoryOpen(true)}
            className="w-full py-3 mb-6 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm rounded-2xl uppercase tracking-wider font-display flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all transform hover:scale-[1.01] active:scale-[0.98]"
          >
            <PlusCircle size={18} />
            Создать категорию {activeCategoryTab === 'expense' ? 'расходов' : 'доходов'}
          </button>

          {/* List categorized by Active selection */}
          <div className="max-h-[320px] lg:max-h-[580px] overflow-y-auto pr-1 custom-scrollbar">
            <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/40 divide-y divide-slate-100 dark:divide-white/5 shadow-xs">
              {(() => {
                const { topLevel, subCatsMap } = getGroupedCategories();
                if (topLevel.length === 0) {
                  return (
                    <div className="p-8 text-center text-xs text-slate-500">
                      Категории не найдены. Создайте первую категорию!
                    </div>
                  );
                }
                
                const elements: React.ReactNode[] = [];
                
                topLevel.forEach(parent => {
                  elements.push(
                    <div
                      key={parent.id}
                      className={`flex items-center justify-between p-3 bg-transparent transition-all border-b last:border-0 ${
                        theme === 'dark'
                          ? 'hover:bg-white/5 border-white/5'
                          : 'hover:bg-slate-50/50 border-slate-150'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs"
                          style={{ backgroundColor: parent.color }}
                        >
                          <IconComponent name={parent.icon} size={15} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`font-bold text-xs truncate ${
                              theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
                            }`}>{parent.name}</span>
                            {parent.quickEntry !== false ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                                <Check size={8} className="stroke-[3px]" />
                                <span>Быстрая</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-slate-500/10 text-slate-400 border border-slate-500/20 shrink-0">
                                <span>Скрыта</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleEditCategory(parent)}
                          className={`p-1 px-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                            theme === 'dark'
                              ? 'hover:bg-white/10 text-slate-400 hover:text-white'
                              : 'hover:bg-slate-150 text-slate-500 hover:text-slate-900'
                          }`}
                          title="Изменить"
                        >
                          <Edit2 size={12} />
                        </button>
                        
                        <button
                          onClick={() => {
                            const count = categories.filter(c => c.type === activeCategoryTab).length;
                            if (count > 2) {
                              setDeleteConfirm({ id: parent.id, type: 'category', name: parent.name });
                            }
                          }}
                          disabled={categories.filter(c => c.type === activeCategoryTab).length <= 2}
                          className={`p-1 disabled:opacity-30 rounded-lg transition-colors cursor-pointer shrink-0 ${
                            theme === 'dark'
                              ? 'hover:bg-rose-500/10 text-slate-400 hover:text-rose-450'
                              : 'hover:bg-rose-100 text-slate-500 hover:text-rose-650'
                          }`}
                          title="Удалить категорию"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  );
                  
                  const kids = subCatsMap[parent.id] || [];
                  kids.forEach(sub => {
                    elements.push(
                      <div
                        key={sub.id}
                        className={`flex items-center justify-between p-2.5 pl-9 transition-all border-b last:border-0 ${
                          theme === 'dark'
                            ? 'hover:bg-white/7 border-white/5 bg-white/[0.01]'
                            : 'hover:bg-slate-50/70 border-slate-150 bg-slate-50/30'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-3 h-3 border-l-2 border-b-2 rounded-bl-md shrink-0 -mt-1.5 ${
                            theme === 'dark' ? 'border-white/15' : 'border-slate-300'
                          }`} />
                          
                          <div
                            className="w-5.5 h-5.5 rounded-md flex items-center justify-center text-white shrink-0 shadow-xs"
                            style={{ backgroundColor: sub.color }}
                          >
                            <span className="text-[9px] text-white">
                              <IconComponent name={sub.icon} size={11} />
                            </span>
                          </div>
                          
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`font-semibold text-xs truncate ${
                                theme === 'dark' ? 'text-slate-300' : 'text-slate-705'
                              }`}>{formatCategoryDisplayName(sub.name)}</span>
                              {sub.quickEntry !== false ? (
                                <span className="inline-flex items-center gap-0.5 px-1 py-0.5 text-[8px] font-bold rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                                  <Check size={6} className="stroke-[3px]" />
                                  <span>Быстрая</span>
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleEditCategory(sub)}
                            className={`p-1 px-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                              theme === 'dark'
                                ? 'hover:bg-white/10 text-slate-400 hover:text-white'
                                : 'hover:bg-slate-150 text-slate-500 hover:text-slate-900'
                            }`}
                            title="Изменить подкатегорию"
                          >
                            <Edit2 size={11} />
                          </button>
                          
                          <button
                            onClick={() => {
                              const count = categories.filter(c => c.type === activeCategoryTab).length;
                              if (count > 2) {
                                setDeleteConfirm({ id: sub.id, type: 'category', name: sub.name });
                              }
                            }}
                            disabled={categories.filter(c => c.type === activeCategoryTab).length <= 2}
                            className={`p-1 disabled:opacity-30 rounded-lg transition-colors cursor-pointer shrink-0 ${
                              theme === 'dark'
                                ? 'hover:bg-rose-500/10 text-slate-400 hover:text-rose-450'
                                : 'hover:bg-rose-100 text-slate-500 hover:text-rose-650'
                            }`}
                            title="Удалить подкатегорию"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    );
                  });
                });
                
                return <div className="divide-y divide-slate-100 dark:divide-white/5">{elements}</div>;
              })()}
            </div>
          </div>
        </div>


      </div>

      {/* CARD EDIT MODAL overlay */}
      {editingCardId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md max-h-[85vh] sm:max-h-[90vh] bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden text-left flex flex-col" id="edit-card-modal">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-white/5 shrink-0">
              <div>
                <h3 className="text-lg font-display font-extrabold text-white flex items-center gap-2">
                  <CreditCard className="text-teal-400" size={20} />
                  Редактировать карту
                </h3>
                <p className="text-xs text-slate-400 mt-1">Изменение реквизитов карты</p>
              </div>
              <button
                type="button"
                onClick={handleCancelCardEdit}
                className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCardSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Название карты</label>
                  <input
                    type="text"
                    placeholder="Например: Зарплатная Birbank"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-teal-400 text-slate-200 animate-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Банк-эмитент</label>
                  <select
                    value={cardBank}
                    onChange={(e) => setCardBank(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-sm text-slate-200 cursor-pointer"
                  >
                    <option value="Kapital Bank" className="bg-slate-950 text-slate-300">Kapital Bank (Birbank)</option>
                    <option value="ABB" className="bg-slate-950 text-slate-300">ABB (Азербайджанский Международный Банк)</option>
                    <option value="Pasha Bank" className="bg-slate-950 text-slate-300">Pasha Bank</option>
                    <option value="Unibank" className="bg-slate-950 text-slate-300">Unibank</option>
                    <option value="Yelo Bank" className="bg-slate-950 text-slate-300">Yelo Bank</option>
                    <option value="Leobank" className="bg-slate-950 text-slate-300">Leobank / Unibank</option>
                    <option value="Другой банк" className="bg-slate-950 text-slate-300">Другой региональный банк</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Последние 4 цифры</label>
                  <input
                    type="text"
                    maxLength={4}
                    minLength={4}
                    placeholder="Например: 5843"
                    value={cardLastFour}
                    onChange={(e) => setCardLastFour(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-sm font-mono tracking-widest focus:ring-2 focus:ring-teal-400 text-slate-200"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={handleCancelCardEdit}
                  className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-slate-350 text-xs font-semibold rounded-xl border border-white/5 transition-colors cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold uppercase tracking-wider rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ACCOUNT EDIT MODAL overlay */}
      {editingAccountId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md max-h-[85vh] sm:max-h-[90vh] bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden text-left flex flex-col" id="edit-account-modal">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-white/5 shrink-0">
              <div>
                <h3 className="text-lg font-display font-extrabold text-white flex items-center gap-2">
                  <Wallet className="text-teal-300" size={20} />
                  Редактировать счет
                </h3>
                <p className="text-xs text-slate-400 mt-1">Изменение реквизитов счета и баланса</p>
              </div>
              <button
                type="button"
                onClick={handleCancelAccountEdit}
                className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleAccountSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Название счета</label>
                  <input
                    type="text"
                    placeholder="Например: Карта m10"
                    value={accName}
                    onChange={(e) => setAccName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-teal-400 text-slate-200"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Тип счета</label>
                  <select
                    value={accType}
                    onChange={(e) => setAccType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-sm text-slate-200 cursor-pointer"
                  >
                    <option value="card" className="bg-slate-950 text-slate-300">Банковский счет (Безналичный)</option>
                    <option value="cash" className="bg-slate-950 text-slate-300">Наличные (Манаты)</option>
                    <option value="savings" className="bg-slate-950 text-slate-300">Копилка / Депозит</option>
                    <option value="other" className="bg-slate-950 text-slate-300">Другое</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Текущий Баланс (₼)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Баланс, например: 450"
                    value={accBalance}
                    onChange={(e) => setAccBalance(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-sm font-display font-medium focus:ring-2 focus:ring-teal-400 text-slate-200"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Цветовой маркер</label>
                  <div className="flex flex-wrap gap-1.5 items-center mt-1">
                    {ACCOUNT_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setAccColor(c)}
                        className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
                          accColor === c ? 'ring-2 ring-teal-400 border-teal-400 scale-110' : 'border-white/10'
                        }`}
                      >
                        <span className={`w-3 h-3 rounded-full bg-current ${c}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex items-center gap-3 p-3 bg-slate-950/40 border border-white/10 rounded-xl transition-all hover:bg-slate-950/60">
                    <input
                      type="checkbox"
                      id="edit-acc-quick-entry"
                      checked={accQuickEntry}
                      onChange={(e) => setAccQuickEntry(e.target.checked)}
                      className="w-4 h-4 rounded border-white/10 bg-slate-950 text-teal-400 focus:ring-teal-400 cursor-pointer"
                    />
                    <label htmlFor="edit-acc-quick-entry" className="text-xs font-semibold text-slate-300 cursor-pointer select-none">
                      Быстрая запись (показывать на панели Главная)
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={handleCancelAccountEdit}
                  className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-slate-350 text-xs font-semibold rounded-xl border border-white/5 transition-colors cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold uppercase tracking-wider rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CATEGORY EDIT MODAL overlay */}
      {editingCategoryId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md max-h-[85vh] sm:max-h-[90vh] bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden text-left flex flex-col" id="edit-category-modal">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-white/5 shrink-0">
              <div>
                <h3 className="text-lg font-display font-extrabold text-white flex items-center gap-2">
                  <PlusCircle className="text-amber-400" size={20} />
                  Редактировать категорию
                </h3>
                <p className="text-xs text-slate-400 mt-1">Изменение наименования, цвета и иконки</p>
              </div>
              <button
                type="button"
                onClick={handleCancelCategoryEdit}
                className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCategorySubmit} className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Название категории</label>
                  <input
                    type="text"
                    placeholder="Например: Спортзал / Книги"
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-teal-400 text-slate-200"
                    required
                  />
                </div>

                <div className="pt-1">
                  <div className="flex flex-col gap-2 p-3 bg-slate-950/40 border border-white/10 rounded-xl">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="edit-cat-is-sub"
                        checked={catIsSub}
                        onChange={(e) => {
                          setCatIsSub(e.target.checked);
                          if (e.target.checked && parentCandidates.length > 0 && catParentId === 'none') {
                            setCatParentId(parentCandidates[0].id);
                            setCatIcon(parentCandidates[0].icon);
                            setCatColor(parentCandidates[0].color);
                          } else if (!e.target.checked) {
                            setCatParentId('none');
                          }
                        }}
                        className="w-4 h-4 rounded border-white/10 bg-slate-950 text-amber-400 focus:ring-amber-500 cursor-pointer"
                      />
                      <label htmlFor="edit-cat-is-sub" className="text-xs font-semibold text-slate-300 cursor-pointer select-none">
                        Это подкатегория
                      </label>
                    </div>
                    
                    {catIsSub && (
                      <div className="mt-2 pl-7 space-y-2">
                        <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">Родительская категория</label>
                        {parentCandidates.length > 0 ? (
                          <select
                            value={catParentId}
                            onChange={(e) => {
                              const pId = e.target.value;
                              setCatParentId(pId);
                              const parent = parentCandidates.find(c => c.id === pId);
                              if (parent) {
                                setCatIcon(parent.icon);
                                setCatColor(parent.color);
                              }
                            }}
                            className="w-full px-2.5 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-xs text-slate-200 cursor-pointer focus:ring-1 focus:ring-amber-500"
                          >
                            <option value="none" disabled>Выберите родителя...</option>
                            {parentCandidates.map(p => (
                              <option key={p.id} value={p.id} className="bg-slate-950 text-slate-250">
                                {p.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <p className="text-[10px] text-amber-400/80">Пока нет доступных родительских категорий. Сначала создайте основную категорию.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Цвет категории</label>
                  <div className="flex flex-wrap gap-1 items-center mt-1">
                    {COLOR_OPTIONS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCatColor(c)}
                        className={`w-5.5 h-5.5 rounded-md border flex items-center justify-center transition-all ${
                          catColor === c ? 'ring-2 ring-white border-transparent scale-110' : 'border-white/10'
                        }`}
                        style={{ backgroundColor: c }}
                      >
                        {catColor === c && <Check size={10} className="text-slate-950 font-extrabold" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Значок / Иконка</label>
                  <div className="grid grid-cols-5 gap-2 max-h-[105px] overflow-y-auto p-1.5 bg-slate-950/60 border border-white/10 rounded-xl custom-scrollbar">
                    {AVAILABLE_ICONS.map(ic => (
                      <button
                        key={ic.name}
                        type="button"
                        onClick={() => setCatIcon(ic.name)}
                        className={`p-2 rounded-lg border flex flex-col items-center justify-center transition-all gap-1 cursor-pointer ${
                          catIcon === ic.name 
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 scale-105 shadow-xs' 
                            : 'border-white/5 hover:bg-white/5 text-slate-400 hover:text-white'
                        }`}
                        title={ic.label}
                      >
                        <IconComponent name={ic.name} size={16} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex items-center gap-3 p-3 bg-slate-950/40 border border-white/10 rounded-xl transition-all hover:bg-slate-950/60">
                    <input
                      type="checkbox"
                      id="edit-cat-quick-entry"
                      checked={catQuickEntry}
                      onChange={(e) => setCatQuickEntry(e.target.checked)}
                      className="w-4 h-4 rounded border-white/10 bg-slate-950 text-amber-400 focus:ring-amber-500 cursor-pointer"
                    />
                    <label htmlFor="edit-cat-quick-entry" className="text-xs font-semibold text-slate-300 cursor-pointer select-none">
                      Быстрая запись (показывать на панели Главная)
                    </label>
                  </div>
                </div>

                {activeCategoryTab === 'expense' && (() => {
                  const avgData = calculateAverage12Months(editingCategoryId);
                  return (
                    <div className="pt-2 space-y-3">
                      <div className="p-3 bg-slate-950/40 border border-white/10 rounded-xl space-y-2">
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          Месячный лимит (Бюджет)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium">
                            ₼
                          </span>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="Без лимита (0)"
                            value={catBudgetLimit}
                            onChange={(e) => setCatBudgetLimit(e.target.value)}
                            className="w-full pl-7 pr-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-sm text-slate-200 focus:ring-1 focus:ring-amber-500 font-sans"
                          />
                        </div>
                        <p className="text-[10px] text-slate-450 leading-relaxed">
                          Введите сумму лимита. Оставьте пустым или введите 0, чтобы сбросить бюджет.
                        </p>
                      </div>

                      <div className="p-3 bg-slate-950/45 border border-amber-500/10 rounded-xl space-y-2.5">
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <TrendingUp size={12} className="text-amber-400 shrink-0" />
                            Средний расход за 12 месяцев
                          </span>
                          <span className="text-xs font-black text-amber-400">
                            {avgData.average.toFixed(1)} ₼ <span className="text-[10px] text-slate-500 font-normal">/ мес</span>
                          </span>
                        </div>

                        <div className="text-[10px] text-slate-350 space-y-2">
                          <div className="flex justify-between items-center text-slate-400 border-b border-white/5 pb-1.5">
                            <span>Всего за последние 12 мес:</span>
                            <span className="font-bold text-slate-200">{avgData.totalSum.toFixed(1)} ₼</span>
                          </div>
                          
                          {/* Mini breakdown of months with spending */}
                          <div className="space-y-1 max-h-[105px] overflow-y-auto custom-scrollbar pr-1">
                            <span className="text-[9px] text-slate-500 block font-semibold uppercase tracking-wider">Индивидуальный тренд по месяцам:</span>
                            {avgData.monthlyDetails.slice(-6).map((det, idx) => (
                              <div key={idx} className="flex justify-between items-center py-0.5">
                                <span className="text-slate-400 text-[10px]">{formatMonthKey(det.month)}</span>
                                <span className={det.amount > 0 ? "font-bold text-slate-300 text-[10px]" : "text-slate-600 text-[10px]"}>
                                  {det.amount > 0 ? `${det.amount.toFixed(0)} ₼` : '0 ₼'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={handleCancelCategoryEdit}
                  className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-slate-350 text-xs font-semibold rounded-xl border border-white/5 transition-colors cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold uppercase tracking-wider rounded-xl shadow-xs transition-colors cursor-pointer"
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
          <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-3xl shadow-2xl p-6 text-center space-y-4 animate-scale-up" id="delete-confirmation-modal">
            <div className="w-12 h-12 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto">
              <Trash2 size={22} className="stroke-[2.5px]" />
            </div>
            
            <div className="space-y-1.5 animate-none">
              <h3 className="text-base font-display font-bold text-white">Удалить безвозвратно?</h3>
              <p className="text-xs text-slate-400 leading-relaxed text-balance">
                Вы действительно хотите удалить {deleteConfirm.type === 'card' ? 'карту' : deleteConfirm.type === 'account' ? 'счет' : 'категорию'}{' '}
                <span className="text-white font-semibold">"{deleteConfirm.name}"</span>? Это действие сотрет элемент и может повлиять на связанные транзакции.
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
                  if (deleteConfirm.type === 'card') {
                    onDeleteCard(deleteConfirm.id);
                  } else if (deleteConfirm.type === 'account') {
                    onDeleteAccount(deleteConfirm.id);
                  } else if (deleteConfirm.type === 'category') {
                    onDeleteCategory(deleteConfirm.id);
                  }
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

      {/* ACCOUNT ADD MODAL overlay */}
      {isAddAccountOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md max-h-[85vh] sm:max-h-[90vh] bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden text-left flex flex-col animate-scale-up" id="add-account-modal">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-white/5 shrink-0">
              <div>
                <h3 className="text-lg font-display font-extrabold text-white flex items-center gap-2">
                  <Wallet className="text-teal-300" size={20} />
                  Создать новый счет
                </h3>
                <p className="text-xs text-slate-400 mt-1">Добавление нового финансового счета или кошелька</p>
              </div>
              <button
                type="button"
                onClick={handleCancelAddAccount}
                className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleAccountSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Название счета</label>
                  <input
                    type="text"
                    placeholder="Например: Карта m10"
                    value={accName}
                    onChange={(e) => setAccName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-teal-400 text-slate-200"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Тип счета</label>
                  <select
                    value={accType}
                    onChange={(e) => setAccType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-sm text-slate-200 cursor-pointer"
                  >
                    <option value="card" className="bg-slate-950 text-slate-300">Банковский счет (Безналичный)</option>
                    <option value="cash" className="bg-slate-950 text-slate-300">Наличные (Манаты)</option>
                    <option value="savings" className="bg-slate-950 text-slate-300">Копилка / Депозит</option>
                    <option value="debt" className="bg-slate-950 text-slate-300">Долг / Кредит</option>
                    <option value="hidden" className="bg-slate-950 text-slate-300">Скрытый счет</option>
                    <option value="other" className="bg-slate-950 text-slate-300">Другое</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Начальный Баланс (₼)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Баланс, например: 450"
                    value={accBalance}
                    onChange={(e) => setAccBalance(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-sm font-display font-medium focus:ring-2 focus:ring-teal-400 text-slate-200"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Цветовой маркер</label>
                  <div className="flex flex-wrap gap-1.5 items-center mt-1">
                    {ACCOUNT_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setAccColor(c)}
                        className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
                          accColor === c ? 'ring-2 ring-teal-400 border-teal-400 scale-110' : 'border-white/10'
                        }`}
                      >
                        <span className={`w-3 h-3 rounded-full bg-current ${c}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex items-center gap-3 p-3 bg-slate-950/40 border border-white/10 rounded-xl transition-all hover:bg-slate-950/60">
                    <input
                      type="checkbox"
                      id="add-acc-quick-entry"
                      checked={accQuickEntry}
                      onChange={(e) => setAccQuickEntry(e.target.checked)}
                      className="w-4 h-4 rounded border-white/10 bg-slate-950 text-teal-400 focus:ring-teal-400 cursor-pointer"
                    />
                    <label htmlFor="add-acc-quick-entry" className="text-xs font-semibold text-slate-300 cursor-pointer select-none">
                      Быстрая запись (показывать на панели Главная)
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={handleCancelAddAccount}
                  className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-slate-350 text-xs font-semibold rounded-xl border border-white/5 transition-colors cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold uppercase tracking-wider rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Добавить счет
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CARD ADD MODAL overlay */}
      {isAddCardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md max-h-[85vh] sm:max-h-[90vh] bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden text-left flex flex-col animate-scale-up" id="add-card-modal">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-white/5 shrink-0">
              <div>
                <h3 className="text-lg font-display font-extrabold text-white flex items-center gap-2">
                  <CreditCard className="text-teal-300" size={20} />
                  Добавить новую карту
                </h3>
                <p className="text-xs text-slate-400 mt-1">Добавление пластиковой карты для карт-счета</p>
              </div>
              <button
                type="button"
                onClick={handleCancelAddCard}
                className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCardSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Название карты</label>
                  <input
                    type="text"
                    placeholder="Например: Зарплатная Birbank"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-teal-400 text-slate-200"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Банк-эмитент</label>
                  <select
                    value={cardBank}
                    onChange={(e) => setCardBank(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-sm text-slate-200 cursor-pointer"
                  >
                    <option value="Kapital Bank" className="bg-slate-950 text-slate-300">Kapital Bank (Birbank)</option>
                    <option value="ABB" className="bg-slate-950 text-slate-300">ABB (Азербайджанский Международный Банк)</option>
                    <option value="Pasha Bank" className="bg-slate-950 text-slate-300">Pasha Bank</option>
                    <option value="Unibank" className="bg-slate-950 text-slate-300">Unibank</option>
                    <option value="Yelo Bank" className="bg-slate-950 text-slate-300">Yelo Bank</option>
                    <option value="Leobank" className="bg-slate-950 text-slate-300">Leobank / Unibank</option>
                    <option value="Другой банк" className="bg-slate-950 text-slate-300">Другой региональный банк</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Последние 4 цифры (на обороте или спереди)</label>
                  <input
                    type="text"
                    maxLength={4}
                    minLength={4}
                    placeholder="Например: 5843"
                    value={cardLastFour}
                    onChange={(e) => setCardLastFour(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-sm font-mono tracking-widest focus:ring-2 focus:ring-teal-400 text-slate-200"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={handleCancelAddCard}
                  className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-slate-350 text-xs font-semibold rounded-xl border border-white/5 transition-colors cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold uppercase tracking-wider rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Добавить карту
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CATEGORY ADD MODAL overlay */}
      {isAddCategoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md max-h-[85vh] sm:max-h-[90vh] bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden text-left flex flex-col animate-scale-up" id="add-category-modal">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-white/5 shrink-0">
              <div>
                <h3 className="text-lg font-display font-extrabold text-white flex items-center gap-2">
                  <PlusCircle className="text-amber-400" size={20} />
                  Создать категорию {activeCategoryTab === 'expense' ? 'расходов' : 'доходов'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">Добавление новой учетной категории для операций</p>
              </div>
              <button
                type="button"
                onClick={handleCancelAddCategory}
                className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCategorySubmit} className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Название категории</label>
                  <input
                    type="text"
                    placeholder="Например: Спортзал / Книги"
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-teal-400 text-slate-200"
                    required
                  />
                </div>

                <div className="pt-1">
                  <div className="flex flex-col gap-2 p-3 bg-slate-950/40 border border-white/10 rounded-xl">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="add-cat-is-sub"
                        checked={catIsSub}
                        onChange={(e) => {
                          setCatIsSub(e.target.checked);
                          if (e.target.checked && parentCandidates.length > 0 && catParentId === 'none') {
                            setCatParentId(parentCandidates[0].id);
                            // Autofill parent settings
                            setCatIcon(parentCandidates[0].icon);
                            setCatColor(parentCandidates[0].color);
                          } else if (!e.target.checked) {
                            setCatParentId('none');
                          }
                        }}
                        className="w-4 h-4 rounded border-white/10 bg-slate-950 text-amber-400 focus:ring-amber-500 cursor-pointer"
                      />
                      <label htmlFor="add-cat-is-sub" className="text-xs font-semibold text-slate-300 cursor-pointer select-none">
                        Это подкатегория
                      </label>
                    </div>
                    
                    {catIsSub && (
                      <div className="mt-2 pl-7 space-y-2">
                        <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">Родительская категория</label>
                        {parentCandidates.length > 0 ? (
                          <select
                            value={catParentId}
                            onChange={(e) => {
                              const pId = e.target.value;
                              setCatParentId(pId);
                              const parent = parentCandidates.find(c => c.id === pId);
                              if (parent) {
                                setCatIcon(parent.icon);
                                setCatColor(parent.color);
                              }
                            }}
                            className="w-full px-2.5 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-xs text-slate-200 cursor-pointer focus:ring-1 focus:ring-amber-500"
                          >
                            <option value="none" disabled>Выберите родителя...</option>
                            {parentCandidates.map(p => (
                              <option key={p.id} value={p.id} className="bg-slate-950 text-slate-250">
                                {p.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <p className="text-[10px] text-amber-400/80">Пока нет доступных родительских категорий. Сначала создайте основную категорию.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1 font-sans">Цвет категории</label>
                  <div className="flex flex-wrap gap-1 items-center mt-1">
                    {COLOR_OPTIONS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCatColor(c)}
                        className={`w-5.5 h-5.5 rounded-md border flex items-center justify-center transition-all ${
                          catColor === c ? 'ring-2 ring-white border-transparent scale-110' : 'border-white/10'
                        }`}
                        style={{ backgroundColor: c }}
                      >
                        {catColor === c && <Check size={10} className="text-slate-950 font-extrabold" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Icon picker (horizontal scrollable grid) */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Значок / Иконка</label>
                  <div className="grid grid-cols-5 gap-2 max-h-[160px] overflow-y-auto p-1.5 bg-slate-950/60 border border-white/10 rounded-xl custom-scrollbar">
                    {AVAILABLE_ICONS.map(ic => (
                      <button
                        key={ic.name}
                        type="button"
                        onClick={() => setCatIcon(ic.name)}
                        className={`p-2 rounded-lg border flex flex-col items-center justify-center transition-all gap-1 cursor-pointer ${
                          catIcon === ic.name 
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 scale-105 shadow-xs' 
                            : 'border-white/5 hover:bg-white/5 text-slate-400 hover:text-white'
                        }`}
                        title={ic.label}
                      >
                        <IconComponent name={ic.name} size={16} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex items-center gap-3 p-3 bg-slate-950/40 border border-white/10 rounded-xl transition-all hover:bg-slate-950/60">
                    <input
                      type="checkbox"
                      id="add-cat-quick-entry"
                      checked={catQuickEntry}
                      onChange={(e) => setCatQuickEntry(e.target.checked)}
                      className="w-4 h-4 rounded border-white/10 bg-slate-950 text-amber-400 focus:ring-amber-500 cursor-pointer"
                    />
                    <label htmlFor="add-cat-quick-entry" className="text-xs font-semibold text-slate-300 cursor-pointer select-none">
                      Быстрая запись (показывать на панели Главная)
                    </label>
                  </div>
                </div>

                {activeCategoryTab === 'expense' && (
                  <div className="pt-2">
                    <div className="p-3 bg-slate-950/40 border border-white/10 rounded-xl space-y-2">
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Месячный лимит (Бюджет)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium">
                          ₼
                        </span>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="Без лимита (0)"
                          value={catBudgetLimit}
                          onChange={(e) => setCatBudgetLimit(e.target.value)}
                          className="w-full pl-7 pr-3 py-2 bg-slate-950 border border-white/10 rounded-lg text-sm text-slate-200 focus:ring-1 focus:ring-amber-500 font-sans"
                        />
                      </div>
                      <p className="text-[10px] text-slate-450 leading-relaxed">
                        Введите сумму лимита. Оставьте поле пустым или введите 0, если лимит не требуется.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={handleCancelAddCategory}
                  className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-slate-350 text-xs font-semibold rounded-xl border border-white/5 transition-colors cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold uppercase tracking-wider rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Создать категорию
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
