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
    }

    // Reset Form
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
      <div className="xl:col-span-2 bg-white/5 backdrop-blur-md rounded-3xl p-5 border border-white/10 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/10 text-teal-300 border border-white/10 rounded-xl">
             {theme === 'light' ? <Sun size={20} className="text-amber-500 shrink-0" /> : <Moon size={20} className="text-indigo-400 shrink-0" />}
          </div>
          <div>
            <h3 className="font-display font-bold text-white text-base leading-tight">Тема оформления</h3>
            <p className="text-xs text-slate-400 mt-1">Светлая тема установлена по умолчанию. Вы можете переключить её на темную.</p>
          </div>
        </div>

        <div className="flex bg-slate-900/60 p-1 rounded-xl border border-white/10 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => onThemeChange('light')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              theme === 'light'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-400 hover:text-white'
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
                ? 'bg-white/15 text-white border border-white/10 shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Moon size={14} />
            Темная
          </button>
        </div>
      </div>
      
      {/* COLUMN 1: Accounts Management */}
      <div className="bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10 shadow-lg flex flex-col justify-between" id="accounts-management">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-2 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 text-teal-300 border border-white/10 rounded-xl">
                <Wallet size={20} />
              </div>
              <div>
                <h3 className="font-display font-bold text-white text-lg">Счета и Карты</h3>
                <p className="text-xs text-slate-400">Настройка банковских балансов и платежных карт</p>
              </div>
            </div>

            {/* Sub-tab selection toggle */}
            <div className="flex bg-slate-900/60 p-1 rounded-xl border border-white/10 self-start sm:self-auto shrink-0">
              <button
                type="button"
                onClick={() => {
                  setLeftTab('accounts');
                  handleCancelCardEdit();
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  leftTab === 'accounts'
                    ? 'bg-white/15 text-white border border-white/10 shadow-xs'
                    : 'text-slate-400 hover:text-white'
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
                    ? 'bg-white/15 text-white border border-white/10 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Карт-счет
              </button>
            </div>
          </div>

          {/* Conditional Forms rendering */}
          {leftTab === 'cards' ? (
            /* 1B. Bank Card Form */
            !editingCardId ? (
              <form onSubmit={handleCardSubmit} className="bg-white/5 border border-white/10 p-4 rounded-2xl mb-6 space-y-4">
                <h4 className="font-semibold text-xs text-slate-400 uppercase tracking-wider">
                  Добавить пластиковую карту
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                  <div className="sm:col-span-2">
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

                <div className="flex gap-2 justify-end pt-1">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold uppercase tracking-wider rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    Добавить карту
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-4 py-6 border border-dashed border-teal-500/20 bg-teal-500/5 rounded-2xl mb-6 text-center text-xs text-teal-300">
                Параметры карты редактируются в модальном окне
              </div>
            )
          ) : (
            /* 1A. Account form rendering */
            !editingAccountId ? (
              <form onSubmit={handleAccountSubmit} className="bg-white/5 border border-white/10 p-4 rounded-2xl mb-6 space-y-4">
                <h4 className="font-semibold text-xs text-slate-400 uppercase tracking-wider">
                  Создать новый счет
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                <div className="flex gap-2 justify-end pt-1">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold uppercase tracking-wider rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    Добавить счет
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-4 py-6 border border-dashed border-teal-500/20 bg-teal-500/5 rounded-2xl mb-6 text-center text-xs text-teal-300">
                Параметры счета редактируются в модальном окне
              </div>
            )
          )}

          {/* Conditional Lists rendering */}
          {leftTab === 'cards' ? (
            /* 2B. Bank Card List */
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 col-span-1 custom-scrollbar">
              {cards.length === 0 ? (
                <div className="text-center py-12 text-slate-450 border border-dashed border-white/10 rounded-2xl bg-white/5">
                  <CreditCard className="mx-auto mb-2 opacity-30 text-teal-300" size={24} />
                  <p className="text-xs font-semibold text-slate-350">У вас пока нет привязанных пластиковых карт</p>
                  <p className="text-[10px] text-slate-500 mt-1">Заполните форму повыше для учета карт Kapital, ABB, Unibank и др.</p>
                </div>
              ) : (
                cards.map(card => {
                  let gradient = "from-rose-600 to-rose-800 border-rose-500/20"; // Kapital
                  if (card.bank === 'ABB') gradient = "from-blue-600/90 to-blue-800 border-blue-500/20";
                  else if (card.bank === 'Pasha Bank') gradient = "from-emerald-700 to-teal-900 border-emerald-600/20";
                  else if (card.bank === 'Unibank') gradient = "from-orange-500/90 to-orange-700 border-orange-500/20";
                  else if (card.bank === 'Yelo Bank') gradient = "from-yellow-400 to-amber-500 text-slate-950 border-yellow-350/20";
                  else if (card.bank === 'Leobank') gradient = "from-purple-800 to-stone-900 border-purple-500/20";
                  else gradient = "from-slate-700 to-slate-800 border-slate-600/20";

                  const isYelo = card.bank === 'Yelo Bank';

                  return (
                    <div
                      key={card.id}
                      className={`flex items-center justify-between p-4 rounded-2xl border transition-all text-white bg-gradient-to-r ${gradient} shadow-md overflow-hidden relative`}
                    >
                      {/* Stylized background card circles */}
                      <div className="absolute right-[-20px] bottom-[-20px] w-24 h-24 bg-white/5 rounded-full pointer-events-none" />

                      <div className="flex items-center gap-3.5 z-10">
                        <div className="w-10 h-7 rounded-sm bg-black/10 flex items-center justify-center shrink-0 border border-white/10">
                          <CreditCard size={15} className={isYelo ? 'text-slate-900' : 'text-white'} />
                        </div>
                        <div>
                          <h4 className={`font-semibold text-xs leading-none ${isYelo ? 'text-slate-950' : 'text-slate-100'}`}>
                            {card.name}
                          </h4>
                          <span className={`text-[9px] font-bold uppercase tracking-wider ${isYelo ? 'text-slate-800' : 'text-slate-300'}`}>
                            {card.bank} •••• {card.lastFour}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 z-10">
                        <button
                          type="button"
                          onClick={() => handleEditCard(card)}
                          className={`p-1.5 mt-0.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                            isYelo 
                              ? 'bg-slate-950/15 hover:bg-slate-950 border-slate-950/30 text-slate-950 hover:text-white' 
                              : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-white/10 hover:bg-teal-500 hover:text-slate-950 dark:hover:bg-teal-450 dark:hover:text-slate-950'
                          }`}
                          title="Редактировать параметры"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm({ id: card.id, type: 'card', name: `${card.bank} (•••• ${card.lastFour})` })}
                          className={`p-1 mt-0.5 rounded-lg border transition-colors cursor-pointer ${
                            isYelo
                              ? 'bg-rose-950/10 hover:bg-rose-950/20 border-rose-900/30 text-rose-900'
                              : 'bg-white/5 hover:bg-rose-500/20 border-white/5 hover:border-rose-500/30 text-rose-300'
                          }`}
                          title="Удалить карту"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* 2A. Account list rendering */
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
              {accounts.map(acc => {
                const totalUsed = acc.balance;
                let typeLabel = 'Карта';
                if (acc.type === 'cash') typeLabel = 'Наличные';
                if (acc.type === 'savings') typeLabel = 'Копилка';

                return (
                  <div
                    key={acc.id}
                    className="flex items-center justify-between p-3.5 bg-white/5 border border-white/5 rounded-2xl transition-all hover:bg-white/10"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-950 border border-white/10 flex items-center justify-center">
                        <span className={`font-display font-extrabold text-lg ${acc.color}`}>
                          {acc.name[0]?.toUpperCase() || 'S'}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-semibold text-slate-200 text-sm leading-tight">{acc.name}</h4>
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{typeLabel}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="font-display font-extrabold text-slate-200 text-sm">{totalUsed.toFixed(2)} ₼</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleEditAccount(acc)}
                          className="p-2 bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-white/10 rounded-xl hover:bg-teal-500 hover:text-slate-950 dark:hover:bg-teal-450 dark:hover:text-slate-950 transition-all cursor-pointer flex items-center justify-center shrink-0"
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
                          className="p-1.5 bg-white/5 hover:bg-rose-500/15 text-slate-400 hover:text-rose-400 disabled:opacity-50 border border-white/10 hover:border-rose-500/25 rounded-lg transition-colors cursor-pointer"
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
          )}
        </div>

        <div className="mt-4 p-3 bg-white/5 rounded-2xl text-[11px] text-slate-300 flex items-start gap-2 border border-white/10">
          <Info size={12} className="mt-0.5 shrink-0 text-teal-300" />
          <span><b>Счета</b> представляют разные хранилища денег. Вы можете видеть раздельный баланс наличных в кармане, зарплатных карт и цифровых кошельков вроде m10.</span>
        </div>
      </div>

      {/* COLUMN 2: Categories Management with Internal Tabs (Expense vs Income) */}
      <div className="bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10 shadow-lg flex flex-col justify-between" id="categories-management">
        <div>
          <div className="flex items-center justify-between gap-4 mb-6 pb-2 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 text-amber-400 border border-white/10 rounded-xl">
                <PlusCircle size={20} />
              </div>
              <div>
                <h3 className="font-display font-bold text-white text-lg">Категории</h3>
                <p className="text-xs text-slate-400">Организуйте статьи трат и доходов</p>
              </div>
            </div>

            {/* Exp vs Inc Tabs */}
            <div className="flex bg-slate-900/60 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => {
                  setActiveCategoryTab('expense');
                  setEditingCategoryId(null);
                  setCatName('');
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeCategoryTab === 'expense'
                    ? 'bg-white/15 text-white border border-white/10 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Расходы
              </button>
              <button
                onClick={() => {
                  setActiveCategoryTab('income');
                  setEditingCategoryId(null);
                  setCatName('');
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeCategoryTab === 'income'
                    ? 'bg-white/15 text-white border border-white/10 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Доходы
              </button>
            </div>
          </div>

          {/* Form */}
          {!editingCategoryId ? (
            <form onSubmit={handleCategorySubmit} className="bg-white/5 border border-white/10 p-4 rounded-2xl mb-6 space-y-4">
              <h4 className="font-semibold text-xs text-slate-400 uppercase tracking-wider">
                Создать категорию {activeCategoryTab === 'expense' ? 'расходов' : 'доходов'}
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              </div>

              {/* Icon picker (horizontal scrollable grid) */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Значок / Иконка</label>
                <div className="grid grid-cols-5 sm:grid-cols-9 gap-2 max-h-[105px] overflow-y-auto p-1.5 bg-slate-950/60 border border-white/10 rounded-xl custom-scrollbar">
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

              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold uppercase tracking-wider rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Создать категорию
                </button>
              </div>
            </form>
          ) : (
            <div className="p-4 py-6 border border-dashed border-amber-500/20 bg-amber-500/15 rounded-2xl mb-6 text-center text-xs text-amber-300">
              Категория редактируется в модальном окне
            </div>
          )}

          {/* List categorized by Active selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[295px] overflow-y-auto pr-1 custom-scrollbar">
            {categories
              .filter(cat => cat.type === activeCategoryTab)
              .map(cat => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: cat.color }}
                    >
                      <IconComponent name={cat.icon} size={16} />
                    </div>
                    <span className="font-semibold text-slate-200 text-xs truncate">{cat.name}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleEditCategory(cat)}
                      className="p-2 bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-white/10 rounded-xl hover:bg-teal-500 hover:text-slate-950 dark:hover:bg-teal-450 dark:hover:text-slate-950 transition-all cursor-pointer flex items-center justify-center shrink-0"
                      title="Изменить"
                    >
                      <Edit2 size={13} />
                    </button>
                    
                    <button
                      onClick={() => {
                        const count = categories.filter(c => c.type === activeCategoryTab).length;
                        if (count > 2) {
                          setDeleteConfirm({ id: cat.id, type: 'category', name: cat.name });
                        }
                      }}
                      disabled={categories.filter(c => c.type === activeCategoryTab).length <= 2}
                      className="p-1.5 bg-white/5 hover:bg-rose-500/15 text-slate-400 hover:text-rose-400 disabled:opacity-30 border border-white/10 hover:border-rose-500/25 rounded-lg transition-colors cursor-pointer"
                      title="Удалить категорию"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="mt-4 p-3 bg-white/5 rounded-2xl text-[11px] text-slate-300 flex items-start gap-2 border border-white/10">
          <Info size={12} className="mt-0.5 shrink-0 text-amber-400" />
          <span>Категории помогают вам упорядочить ваши финансы. Изменение значка или цвета поможет мгновенно распознать операции на диаграмме или в календаре.</span>
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

    </div>
  );
}
