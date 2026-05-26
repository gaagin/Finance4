import React, { useState, useRef, useEffect } from 'react';
import { Account, Category, Transaction } from '../types';
import { IconComponent } from './IconComponent';
import { Wallet, HelpCircle, CornerRightDown, Plus, X, Sparkles, Check } from 'lucide-react';

interface QuickDragDropBuilderProps {
  accounts: Account[];
  categories: Category[];
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
  addToast: (message: string, type: 'warning' | 'critical' | 'success') => void;
}

export function QuickDragDropBuilder({
  accounts,
  categories,
  onAddTransaction,
  addToast,
}: QuickDragDropBuilderProps) {
  // Drag states
  const [activeDragAccount, setActiveDragAccount] = useState<Account | null>(null);
  const [dragOverCategoryId, setDragOverCategoryId] = useState<string | null>(null);

  // Touch specific absolute coordinate tracking for dragging indicator
  const [touchCoords, setTouchCoords] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Transaction Modal State
  const [activeTxData, setActiveTxData] = useState<{
    account: Account;
    category: Category;
  } | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [date, setDate] = useState<string>('2026-05-23'); // Lock default to 23 May 2026 as per other areas of application

  // Focus ref for amount input
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto focus input when modal is triggered
  useEffect(() => {
    if (activeTxData && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [activeTxData]);

  // Keep categories of type 'expense' only for natural spending logs
  const expenseCategories = categories.filter(c => c.type === 'expense');

  // HTML5 Drag and Drop Handlers (for Desktop mouse)
  const handleDragStart = (e: React.DragEvent, account: Account) => {
    e.dataTransfer.setData('accountId', account.id);
    setActiveDragAccount(account);
    // Style ghost image
    try {
      const ghost = document.createElement('div');
      ghost.style.width = '30px';
      ghost.style.height = '30px';
      ghost.style.borderRadius = '50%';
      ghost.style.background = 'rgba(20, 184, 166, 0.4)';
      document.body.appendChild(ghost);
      e.dataTransfer.setDragImage(ghost, 15, 15);
      setTimeout(() => document.body.removeChild(ghost), 0);
    } catch (err) {}
  };

  const handleDragEnd = () => {
    setActiveDragAccount(null);
    setDragOverCategoryId(null);
  };

  const handleDragOverCategory = (e: React.DragEvent, categoryId: string) => {
    e.preventDefault();
    if (dragOverCategoryId !== categoryId) {
      setDragOverCategoryId(categoryId);
    }
  };

  const handleDropOnCategory = (e: React.DragEvent, category: Category) => {
    e.preventDefault();
    const accountId = e.dataTransfer.getData('accountId');
    const matchedAccount = accounts.find(a => a.id === accountId) || activeDragAccount;

    if (matchedAccount) {
      triggerQuickAmountModal(matchedAccount, category);
    }

    setActiveDragAccount(null);
    setDragOverCategoryId(null);
  };

  // Mobile Touch Gestures Handlers (Custom Pointer Tracker)
  const handleTouchStart = (e: React.TouchEvent, account: Account) => {
    setActiveDragAccount(account);
    const touch = e.touches[0];
    setTouchCoords({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!activeDragAccount) return;
    const touch = e.touches[0];
    setTouchCoords({ x: touch.clientX, y: touch.clientY });

    // Identify category card under finger
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (element) {
      const card = element.closest('[data-category-id]');
      if (card) {
        const categoryId = card.getAttribute('data-category-id');
        if (categoryId && dragOverCategoryId !== categoryId) {
          setDragOverCategoryId(categoryId);
        }
      } else {
        setDragOverCategoryId(null);
      }
    }
  };

  const handleTouchEnd = () => {
    if (activeDragAccount && dragOverCategoryId) {
      const matchedCategory = categories.find(c => c.id === dragOverCategoryId);
      if (matchedCategory) {
        triggerQuickAmountModal(activeDragAccount, matchedCategory);
      }
    }
    setActiveDragAccount(null);
    setDragOverCategoryId(null);
    setTouchCoords(null);
  };

  const triggerQuickAmountModal = (account: Account, category: Category) => {
    setActiveTxData({ account, category });
    setAmount('');
    setDescription('');
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTxData) return;

    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      alert('Пожалуйста, укажите корректную сумму.');
      return;
    }

    onAddTransaction({
      accountId: activeTxData.account.id,
      categoryId: activeTxData.category.id,
      amount: numAmount,
      type: 'expense',
      date: date,
      description: description.trim() || `Расход: ${activeTxData.category.name}`
    });

    addToast(
      `Записано: ${numAmount.toFixed(2)} ₼ с баланса «${activeTxData.account.name}» на «${activeTxData.category.name}»! 🚀`,
      'success'
    );

    setActiveTxData(null);
  };

  return (
    <div 
      ref={containerRef}
      className="bg-white/5 backdrop-blur-md rounded-3xl p-5 border border-white/10 shadow-lg relative overflow-hidden" 
      id="quick-drag-action-panel"
    >
      {/* Decorative gradient corner */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header section */}
      <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-teal-500/10 text-teal-300 border border-teal-500/20 rounded-lg">
            <Sparkles size={16} className="animate-pulse" />
          </div>
          <div>
            <h3 className="font-display font-bold text-slate-100 text-sm">
              Интерактивная запись перетаскиванием
            </h3>
            <p className="text-[10px] text-slate-400">
              Зажмите счет и перетащите на категорию расхода (мышкой или пальцем)
            </p>
          </div>
        </div>
      </div>

      {/* Main interactive area */}
      <div className="flex flex-col gap-4">
        {/* ROW 1: Source Accounts (Pills close to categories for easiest thumb drag) */}
        <div>
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 select-none">
            Шаг 1: Возьмите счет (Списание)
          </span>
          <div className="flex flex-wrap gap-2 justify-start items-center">
            {accounts.map(acc => {
              const bgClass = acc.type === 'card' ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20 hover:border-indigo-400/50' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:border-emerald-400/50';
              const isActive = activeDragAccount?.id === acc.id;
              
              return (
                <div
                  key={acc.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, acc)}
                  onDragEnd={handleDragEnd}
                  onTouchStart={(e) => handleTouchStart(e, acc)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  className={`px-3 py-2 border rounded-2xl cursor-grab active:cursor-grabbing transition-all select-none flex items-center gap-2 touch-none ${bgClass} ${
                    isActive ? 'scale-110 ring-2 ring-teal-400 border-teal-400 bg-teal-500/20' : ''
                  }`}
                  id={`drag-acc-${acc.id}`}
                >
                  <Wallet size={13} />
                  <div className="text-left">
                    <span className="block font-semibold text-xs leading-none">{acc.name}</span>
                    <span className="block text-[9px] font-mono mt-0.5 opacity-85">{Math.round(acc.balance)} ₼</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Arrow transition */}
        <div className="flex justify-center -my-1 text-slate-500 select-none pointer-events-none">
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-[9px] font-mono">
            <CornerRightDown size={10} className="text-teal-400 animate-bounce" />
            <span>ПЕРЕНЕСИТЕ СЮДА</span>
          </div>
        </div>

        {/* ROW 2: Destination Categories Grid (Compact touch-target boxes) */}
        <div>
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 select-none">
            Шаг 2: Отпустите на категории расходов
          </span>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {expenseCategories.map(cat => {
              const isOver = dragOverCategoryId === cat.id;
              return (
                <div
                  key={cat.id}
                  data-category-id={cat.id}
                  onDragOver={(e) => handleDragOverCategory(e, cat.id)}
                  onDragLeave={() => setDragOverCategoryId(null)}
                  onDrop={(e) => handleDropOnCategory(e, cat)}
                  className={`p-2 rounded-xl border flex flex-col items-center justify-center text-center gap-1.5 transition-all select-none ${
                    isOver 
                      ? 'border-emerald-400 bg-emerald-500/20 scale-105 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-400' 
                      : 'border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10'
                  }`}
                  id={`drop-cat-${cat.id}`}
                  style={{ minHeight: '68px' }}
                >
                  <div className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center text-slate-200">
                    <IconComponent name={cat.icon} size={15} />
                  </div>
                  <span className="text-[9px] font-bold font-sans tracking-tight leading-tight text-slate-300 max-w-full truncate px-0.5">
                    {cat.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating touch element when dragging on mobile */}
      {activeDragAccount && touchCoords && (
        <div
          className="fixed pointer-events-none z-[99999] px-3 py-2 border rounded-full bg-teal-500 border-teal-300 text-slate-950 font-black text-xs shadow-2xl flex items-center gap-1.5 whitespace-nowrap"
          style={{
            left: `${touchCoords.x + 15}px`,
            top: `${touchCoords.y - 15}px`,
            transform: 'translate(-50%, -100%) scale(1.1)',
            opacity: 0.95
          }}
        >
          <Wallet size={12} className="animate-spin text-slate-950" style={{ animationDuration: '3s' }} />
          <span>{activeDragAccount.name}</span>
        </div>
      )}

      {/* THE QUICK TRANSACTION RECORDING MODAL */}
      {activeTxData && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[10000] flex items-center justify-center p-4"
          id="quick-transaction-modal"
          onClick={() => setActiveTxData(null)}
        >
          <div 
            className="w-full max-w-md bg-slate-900 border border-teal-500/30 rounded-3xl p-6 shadow-2xl relative animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal exit */}
            <button
              onClick={() => setActiveTxData(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Modal header */}
            <div className="text-center mb-6 mt-1">
              <span className="inline-flex items-center gap-1 bg-teal-500/10 text-teal-300 font-mono text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border border-teal-500/20 mb-2">
                ⚡ Мгновенная запись расхода
              </span>
              <h4 className="font-display font-black text-white text-lg leading-tight">
                Введите сумму расхода
              </h4>
              
              {/* Context Visualizer: Account -> Category */}
              <div className="flex items-center justify-center gap-3 mt-4 bg-slate-950/60 p-3 rounded-2xl border border-white/5">
                {/* Account card */}
                <div className="flex items-center gap-1.5 text-indigo-300 font-semibold text-xs py-1 px-2 bg-indigo-500/10 border border-indigo-500/10 rounded-lg">
                  <Wallet size={11} />
                  <span>{activeTxData.account.name}</span>
                </div>
                <div className="text-slate-500 font-bold flex items-center">➔</div>
                {/* Category card */}
                <div className="flex items-center gap-1.5 text-rose-300 font-semibold text-xs py-1 px-2 bg-rose-500/10 border border-rose-500/10 rounded-lg">
                  <IconComponent name={activeTxData.category.icon} size={11} />
                  <span>{activeTxData.category.name}</span>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Amount - large focused number field */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider text-left">
                  Сумма операции (AZN / ₼) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-display font-black text-slate-400 text-xl">
                    ₼
                  </span>
                  <input
                    ref={inputRef}
                    type="number"
                    step="any"
                    min="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-10 pr-4 py-3.5 bg-slate-950/80 border border-teal-500/40 rounded-2xl text-2xl font-display font-black text-white focus:outline-hidden focus:ring-2 focus:ring-teal-400 focus:border-transparent text-center"
                    required
                  />
                </div>
              </div>

              {/* Description & Date fields (advanced / helper) */}
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider text-left">
                    Комментарий / Описание (необязательно)
                  </label>
                  <input
                    type="text"
                    placeholder={`Например: Покупка в ${activeTxData.category.name}`}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-white/5 rounded-xl text-xs text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-teal-400"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider text-left">
                    Дата операции
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-white/5 rounded-xl text-xs text-slate-200 font-mono focus:outline-hidden focus:ring-1 focus:ring-teal-400"
                    required
                  />
                </div>
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTxData(null)}
                  className="flex-1 px-4 py-3 border border-white/10 bg-white/5 text-slate-300 hover:text-white rounded-2xl hover:bg-white/10 text-xs font-bold transition-all cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 text-slate-950 text-xs font-black rounded-2xl shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider"
                >
                  <Check size={14} />
                  Записать ₼
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
