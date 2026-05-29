import React, { useState } from 'react';
import { Account, Category, TransactionType, BankCard } from '../types';
import { IconComponent, AVAILABLE_ICONS } from './IconComponent';
import { Plus, Trash2, Edit2, Wallet, PlusCircle, Check, Info, CreditCard, Sun, Moon, X, AlertTriangle } from 'lucide-react';

interface AccountsCategoriesPanelProps {
  accounts: Account[];
  categories: Category[];
  cards: BankCard[];
  onAddAccount: (acc: Omit<Account, 'id'>) => void;
  onUpdateAccount: (acc: Account) => void;
  onDeleteAccount: (id: string) => void;
  onAddCategory: (cat: Omit<Category, 'id'>) => void;
  onUpdateCategory: (cat: Category) => void;
  onDeleteCategory: (id: string) => void;
  onAddCard: (card: Omit<BankCard, 'id'>) => void;
  onUpdateCard: (card: BankCard) => void;
  onDeleteCard: (id: string) => void;
  theme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
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
  onThemeChange
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
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

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
        color: accColor
      });
      setEditingAccountId(null);
    } else {
      onAddAccount({
        name: accName,
        type: accType,
        balance: Number(accBalance),
        color: accColor
      });
      setIsAddAccountOpen(false);
    }

    // Reset Form
    setAccName('');
    setAccBalance('');
    setAccType('card');
    setAccColor('text-sky-600');
  };

  const handleEditAccount = (acc: Account) => {
    setEditingAccountId(acc.id);
    setAccName(acc.name);
    setAccType(acc.type);
    setAccBalance(acc.balance.toString());
    setAccColor(acc.color);
  };

  const handleCancelAccountEdit = () => {
    setEditingAccountId(null);
    setAccName('');
    setAccBalance('');
    setAccType('card');
    setAccColor('text-sky-600');
  };

  const handleCancelAddAccount = () => {
    setIsAddAccountOpen(false);
    setAccName('');
    setAccBalance('');
    setAccType('card');
    setAccColor('text-sky-600');
  };

  // Category Form Submission
  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    if (editingCategoryId) {
      onUpdateCategory({
        id: editingCategoryId,
        name: catName,
        icon: catIcon,
        color: catColor,
        type: activeCategoryTab
      });
      setEditingCategoryId(null);
    } else {
      onAddCategory({
        name: catName,
        icon: catIcon,
        color: catColor,
        type: activeCategoryTab
      });
      setIsAddCategoryOpen(false);
    }

    // Reset Form
    setCatName('');
    setCatIcon('HelpCircle');
    setCatColor('#3b82f6');
  };

  const handleCancelAddCategory = () => {
    setIsAddCategoryOpen(false);
    setCatName('');
    setCatIcon('HelpCircle');
    setCatColor('#3b82f6');
  };

  const handleEditCategory = (cat: Category) => {
    setEditingCategoryId(cat.id);
    setCatName(cat.name);
    setCatIcon(cat.icon);
    setCatColor(cat.color);
  };

  const handleCancelCategoryEdit = () => {
    setEditingCategoryId(null);
    setCatName('');
    setCatIcon('HelpCircle');
    setCatColor('#3b82f6');
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8" id="accounts-categories-root">
      
      {/* Theme Selection Toggle */}
      <div className={`xl:col-span-2 backdrop-blur-md rounded-3xl p-5 border shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 mb-2 transition-colors duration-200 ${
        theme === 'dark'
          ? 'bg-slate-900/40 border-white/10'
          : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border transition-colors ${
            theme === 'dark'
              ? 'bg-white/10 border-white/10 text-teal-300'
              : 'bg-slate-100 border-slate-200 text-teal-600'
          }`}>
             {theme === 'light' ? <Sun size={20} className="text-amber-500 shrink-0" /> : <Moon size={20} className="text-indigo-400 shrink-0" />}
          </div>
          <div>
            <h3 className={`font-display font-bold text-base leading-tight ${
              theme === 'dark' ? 'text-white' : 'text-slate-900'
            }`}>Тема оформления</h3>
            <p className={`text-xs mt-1 ${
              theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
            }`}>Светлая тема установлена по умолчанию. Вы можете переключить её на темную.</p>
          </div>
        </div>

        <div className={`flex p-1 rounded-xl border shrink-0 transition-colors self-start sm:self-auto ${
          theme === 'dark'
            ? 'bg-slate-950/60 border-white/10'
            : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            type="button"
            onClick={() => onThemeChange('light')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              theme === 'light'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Sun size={14} />
            Светлая
          </button>
          <button
            type="button"
            onClick={() => onThemeChange('dark')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              theme === 'dark'
                ? 'bg-white/15 dark:bg-slate-800 text-white border border-white/10 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Moon size={14} />
            Темная
          </button>
        </div>
      </div>
      
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
                }`}>Счета и Карты</h3>
                <p className={`text-xs ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                }`}>Настройка банковских балансов и платежных карт</p>
              </div>
            </div>

            {/* Sub-tab selection toggle */}
            <div className={`flex p-1 rounded-xl border self-start sm:self-auto shrink-0 transition-colors duration-200 ${
              theme === 'dark'
                ? 'bg-slate-950/60 border-white/10'
                : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                type="button"
                onClick={() => {
                  setLeftTab('accounts');
                  handleCancelCardEdit();
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  leftTab === 'accounts'
                    ? theme === 'dark'
                      ? 'bg-white/15 text-white border border-white/10 shadow-xs'
                      : 'bg-white text-slate-900 shadow-md border border-slate-200/50'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Балансы
              </button>
              <button
                type="button"
                onClick={() => {
                  setLeftTab('cards');
                  handleCancelAccountEdit();
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  leftTab === 'cards'
                    ? theme === 'dark'
                      ? 'bg-white/15 text-white border border-white/10 shadow-xs'
                      : 'bg-white text-slate-900 shadow-md border border-slate-200/50'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Карт-счет
              </button>
            </div>
          </div>

          {/* Add Accounts / Cards Button trigger */}
          {leftTab === 'cards' ? (
            <button
              type="button"
              onClick={() => setIsAddCardOpen(true)}
              className="w-full py-3 mb-6 bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-sm rounded-2xl uppercase tracking-wider font-display flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all transform hover:scale-[1.01] active:scale-[0.98]"
            >
              <PlusCircle size={18} />
              Добавить карту
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddAccountOpen(true)}
              className="w-full py-3 mb-6 bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-sm rounded-2xl uppercase tracking-wider font-display flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all transform hover:scale-[1.01] active:scale-[0.98]"
            >
              <PlusCircle size={18} />
              Добавить счет
            </button>
          )}

          {/* Conditional Lists rendering */}
          {leftTab === 'cards' ? (
            /* 2B. Bank Card List */
            <div className="max-h-[360px] overflow-y-auto pr-1 col-span-1 custom-scrollbar">
              {cards.length === 0 ? (
                <div className={`text-center py-12 border border-dashed rounded-2xl ${
                  theme === 'dark'
                    ? 'text-slate-450 border-white/10 bg-white/5'
                    : 'text-slate-500 border-slate-200 bg-slate-50'
                }`}>
                  <CreditCard className="mx-auto mb-2 opacity-30 text-teal-300" size={24} />
                  <p className="text-xs font-semibold text-slate-350 dark:text-slate-400">У вас пока нет привязанных пластиковых карт</p>
                  <p className="text-[10px] text-slate-500 mt-1">Заполните форму повыше для учета карт Kapital, ABB, Unibank и др.</p>
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/40 divide-y divide-slate-100 dark:divide-white/5 shadow-xs">
                  {cards.map(card => {
                    let bankColorClass = "bg-rose-500"; // Kapital
                    if (card.bank === 'ABB') bankColorClass = "bg-blue-500";
                    else if (card.bank === 'Pasha Bank') bankColorClass = "bg-emerald-500";
                    else if (card.bank === 'Unibank') bankColorClass = "bg-orange-500";
                    else if (card.bank === 'Yelo Bank') bankColorClass = "bg-yellow-400";
                    else if (card.bank === 'Leobank') bankColorClass = "bg-purple-500";
                    else bankColorClass = "bg-slate-500";

                    return (
                      <div
                        key={card.id}
                        className={`flex items-center justify-between p-3 bg-transparent transition-all relative pl-5 overflow-hidden border-b last:border-0 ${
                          theme === 'dark'
                            ? 'hover:bg-white/5 border-white/5'
                            : 'hover:bg-slate-50/50 border-slate-150'
                        }`}
                      >
                        {/* A tiny colorful side edge indicator for bank branding */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${bankColorClass}`} />

                        <div className="flex items-center gap-3 z-10 min-w-0">
                          <div className={`w-10 h-7 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            theme === 'dark'
                              ? 'bg-white/5 border-white/10'
                              : 'bg-slate-100 border-slate-200'
                          }`}>
                            <CreditCard size={14} className={theme === 'dark' ? 'text-slate-300' : 'text-slate-650'} />
                          </div>
                          <div className="min-w-0">
                            <h4 className={`font-semibold text-xs leading-none truncate ${
                              theme === 'dark' ? 'text-slate-100' : 'text-slate-800'
                            }`}>
                              {card.name}
                            </h4>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mt-1 block">
                              {card.bank} •••• {card.lastFour}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 z-10">
                          <button
                            type="button"
                            onClick={() => handleEditCard(card)}
                            className={`p-1 px-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                              theme === 'dark'
                                ? 'hover:bg-white/10 text-slate-400 hover:text-white'
                                : 'hover:bg-slate-150 text-slate-500 hover:text-slate-900'
                            }`}
                            title="Редактировать параметры"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirm({ id: card.id, type: 'card', name: `${card.bank} (•••• ${card.lastFour})` })}
                            className={`p-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
                              theme === 'dark'
                                ? 'hover:bg-rose-500/10 text-slate-400 hover:text-rose-450'
                                : 'hover:bg-rose-100 text-slate-500 hover:text-rose-650'
                            }`}
                            title="Удалить карту"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* 2A. Account list rendering */
            <div className="max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
              <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/40 divide-y divide-slate-100 dark:divide-white/5 shadow-xs">
                {accounts.map(acc => {
                  const totalUsed = acc.balance;
                  let typeLabel = 'Карта';
                  if (acc.type === 'cash') typeLabel = 'Наличные';
                  if (acc.type === 'savings') typeLabel = 'Копилка';

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
                          <h4 className={`font-semibold text-sm leading-tight truncate ${
                            theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
                          }`}>{acc.name}</h4>
                          <p className={`text-[10px] font-medium uppercase tracking-wider ${
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
          )}
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
          <div className="max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
            <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/40 divide-y divide-slate-100 dark:divide-white/5 shadow-xs">
              {categories
                .filter(cat => cat.type === activeCategoryTab)
                .map(cat => (
                  <div
                    key={cat.id}
                    className={`flex items-center justify-between p-3 bg-transparent transition-all border-b last:border-0 ${
                      theme === 'dark'
                        ? 'hover:bg-white/5 border-white/5'
                        : 'hover:bg-slate-50/50 border-slate-150'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs"
                        style={{ backgroundColor: cat.color }}
                      >
                        <IconComponent name={cat.icon} size={15} />
                      </div>
                      <span className={`font-semibold text-xs truncate ${
                        theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
                      }`}>{cat.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleEditCategory(cat)}
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
                            setDeleteConfirm({ id: cat.id, type: 'category', name: cat.name });
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
                ))}
            </div>
          </div>
        </div>


      </div>

      {/* CARD EDIT MODAL overlay */}
      {editingCardId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden text-left" id="edit-card-modal">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-white/5">
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
            
            <form onSubmit={handleCardSubmit} className="p-6 space-y-4">
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
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden text-left" id="edit-account-modal">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-white/5">
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
            
            <form onSubmit={handleAccountSubmit} className="p-6 space-y-4">
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
                    <option value="card" className="bg-slate-950 text-slate-300">Пластиковая карта ( Birbank / ABB )</option>
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
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden text-left" id="edit-category-modal">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-white/5">
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
            
            <form onSubmit={handleCategorySubmit} className="p-6 space-y-4">
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
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden text-left animate-scale-up" id="add-account-modal">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-white/5">
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
            
            <form onSubmit={handleAccountSubmit} className="p-6 space-y-4">
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
                    <option value="card" className="bg-slate-950 text-slate-300">Пластиковая карта ( Birbank / ABB )</option>
                    <option value="cash" className="bg-slate-950 text-slate-300">Наличные (Манаты)</option>
                    <option value="savings" className="bg-slate-950 text-slate-300">Копилка / Депозит</option>
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
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden text-left animate-scale-up" id="add-card-modal">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-white/5">
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
            
            <form onSubmit={handleCardSubmit} className="p-6 space-y-4">
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
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden text-left animate-scale-up" id="add-category-modal">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-white/5">
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
            
            <form onSubmit={handleCategorySubmit} className="p-6 space-y-4">
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
