import React, { useState, useRef, useEffect } from 'react';
import { Account, Category, Transaction, formatCategoryDisplayName } from '../types';
import { IconComponent } from './IconComponent';
import { Wallet, HelpCircle, CornerRightDown, Plus, X, Sparkles, Check, ChevronDown, ArrowRight, Search } from 'lucide-react';

interface SearchableDropdownProps<T> {
  items: T[];
  selectedItem: T;
  onSelect: (item: T) => void;
  getLabel: (item: T) => string;
  getIcon?: (item: T) => React.ReactNode;
  getSubtitle?: (item: T) => string;
  placeholder: string;
  accentClass: string;
  textColorClass: string;
}

function SearchableDropdown<T>({
  items,
  selectedItem,
  onSelect,
  getLabel,
  getIcon,
  getSubtitle,
  placeholder,
  accentClass,
  textColorClass,
}: SearchableDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 80);
    }
  }, [isOpen]);

  const filtered = items.filter(item =>
    getLabel(item).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer text-left transition-all ${accentClass} ${textColorClass}`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {getIcon && <div className="shrink-0">{getIcon(selectedItem)}</div>}
          <div className="min-w-0">
            <span className="block truncate leading-tight">{getLabel(selectedItem)}</span>
            {getSubtitle && (
              <span className="block text-[8px] opacity-80 font-mono mt-0.5 leading-none truncate">{getSubtitle(selectedItem)}</span>
            )}
          </div>
        </div>
        <ChevronDown size={12} className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-1 max-h-56 bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[11000] flex flex-col">
          <div className="relative p-2 border-b border-white/5 bg-slate-950/40">
            <Search size={11} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              placeholder={placeholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-7 pr-3 py-1 bg-slate-950/80 border border-white/10 rounded-md text-[11px] text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-teal-400/50"
            />
          </div>

          <div className="overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-white/10 max-h-36">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-center text-slate-400 text-[10px]">Ничего не найдено</div>
            ) : (
              filtered.map((item, idx) => {
                const isSelected = item === selectedItem;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      onSelect(item);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-[11px] transition-colors hover:bg-white/5 active:bg-white/10 ${
                      isSelected ? 'bg-white/10 font-bold text-teal-300' : 'text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {getIcon && <div className="shrink-0">{getIcon(item)}</div>}
                      <div className="min-w-0">
                        <span className="block truncate leading-tight">{getLabel(item)}</span>
                        {getSubtitle && (
                          <span className="block text-[8px] opacity-65 font-mono mt-0.5 leading-none truncate">{getSubtitle(item)}</span>
                        )}
                      </div>
                    </div>
                    {isSelected && <Check size={11} className="text-teal-400 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface QuickDragDropBuilderProps {
  accounts: Account[];
  categories: Category[];
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
  onAddTransfer: (transfer: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    description: string;
    date: string;
  }) => void;
  addToast: (message: string, type: 'warning' | 'critical' | 'success') => void;
}

export function QuickDragDropBuilder({
  accounts,
  categories,
  onAddTransaction,
  onAddTransfer,
  addToast,
}: QuickDragDropBuilderProps) {
  // Drag states
  const [activeDragAccount, setActiveDragAccount] = useState<Account | null>(null);
  const [dragOverCategoryId, setDragOverCategoryId] = useState<string | null>(null);
  const [dragOverAccountId, setDragOverAccountId] = useState<string | null>(null);

  // States for displaying full name of categories on tap/click
  const [infoCategoryId, setInfoCategoryId] = useState<string | null>(null);
  const categoryTooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (categoryTooltipTimeoutRef.current) {
        clearTimeout(categoryTooltipTimeoutRef.current);
      }
    };
  }, []);

  const handleCategoryClick = (cat: Category) => {
    setInfoCategoryId(cat.id);
    if (categoryTooltipTimeoutRef.current) {
      clearTimeout(categoryTooltipTimeoutRef.current);
    }
    categoryTooltipTimeoutRef.current = setTimeout(() => {
      setInfoCategoryId(null);
    }, 4000); // 4 seconds visibility
  };

  // Touch specific absolute coordinate tracking for dragging indicator
  const [touchCoords, setTouchCoords] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scrolling on drag mechanics
  const dragYRef = useRef<number | null>(null);

  useEffect(() => {
    if (!activeDragAccount) {
      dragYRef.current = null;
      return;
    }

    const handleWindowDragOver = (e: DragEvent) => {
      if (e.clientY > 0) {
        dragYRef.current = e.clientY;
      }
    };

    window.addEventListener('dragover', handleWindowDragOver, true);
    return () => {
      window.removeEventListener('dragover', handleWindowDragOver, true);
    };
  }, [activeDragAccount]);

  useEffect(() => {
    if (!activeDragAccount) return;

    let iframeScrollTimer: number;
    const scrollEdgeY = 110; // px from edge
    const maxScrollSpeed = 16; // px per frame

    const checkAndScroll = () => {
      if (dragYRef.current !== null && dragYRef.current > 0) {
        const y = dragYRef.current;
        const height = window.innerHeight;

        let scrollAmount = 0;
        if (y > height - scrollEdgeY) {
          // near bottom viewport -> scroll down
          const ratio = (y - (height - scrollEdgeY)) / scrollEdgeY;
          scrollAmount = Math.min(ratio, 1) * maxScrollSpeed;
        } else if (y < scrollEdgeY) {
          // near top viewport -> scroll up
          const ratio = (scrollEdgeY - y) / scrollEdgeY;
          scrollAmount = -Math.min(ratio, 1) * maxScrollSpeed;
        }

        if (scrollAmount !== 0) {
          window.scrollBy({ top: scrollAmount, behavior: 'auto' });
          if (document.scrollingElement) {
            document.scrollingElement.scrollTop += scrollAmount;
          }
        }
      }
      iframeScrollTimer = requestAnimationFrame(checkAndScroll);
    };

    iframeScrollTimer = requestAnimationFrame(checkAndScroll);
    return () => {
      cancelAnimationFrame(iframeScrollTimer);
    };
  }, [activeDragAccount]);

  // Transaction Modal State
  const [activeTxData, setActiveTxData] = useState<{
    account: Account;
    category: Category;
  } | null>(null);

  // Transfer Modal State
  const [activeTransferData, setActiveTransferData] = useState<{
    fromAccount: Account;
    toAccount: Account;
  } | null>(null);

  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [date, setDate] = useState<string>('2026-05-23'); // Lock default to 23 May 2026 as per other areas of application

  // Focus refs
  const inputRef = useRef<HTMLInputElement>(null);
  const transferInputRef = useRef<HTMLInputElement>(null);

  // Auto focus input when modal is triggered
  useEffect(() => {
    if (activeTxData && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [activeTxData]);

  useEffect(() => {
    if (activeTransferData && transferInputRef.current) {
      setTimeout(() => {
        transferInputRef.current?.focus();
      }, 100);
    }
  }, [activeTransferData]);

  // Keep categories of type 'expense' only for natural spending logs
  const expenseCategories = categories.filter(c => c.type === 'expense');
  const incomeCategories = categories.filter(c => c.type === 'income');

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
    setDragOverAccountId(null);
    dragYRef.current = null;
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
    setDragOverAccountId(null);
  };

  const handleDragOverAccount = (e: React.DragEvent, targetAccountId: string) => {
    e.preventDefault();
    if (activeDragAccount && activeDragAccount.id !== targetAccountId) {
      if (dragOverAccountId !== targetAccountId) {
        setDragOverAccountId(targetAccountId);
      }
    }
  };

  const handleDropOnAccount = (e: React.DragEvent, targetAccount: Account) => {
    e.preventDefault();
    const sourceAccountId = e.dataTransfer.getData('accountId');
    const sourceAccount = accounts.find(a => a.id === sourceAccountId) || activeDragAccount;

    if (sourceAccount && sourceAccount.id !== targetAccount.id) {
      triggerQuickTransferModal(sourceAccount, targetAccount);
    }

    setActiveDragAccount(null);
    setDragOverCategoryId(null);
    setDragOverAccountId(null);
  };

  // Mobile Touch Gestures Handlers (Custom Pointer Tracker)
  const handleTouchStart = (e: React.TouchEvent, account: Account) => {
    setActiveDragAccount(account);
    const touch = e.touches[0];
    setTouchCoords({ x: touch.clientX, y: touch.clientY });
    dragYRef.current = touch.clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!activeDragAccount) return;
    const touch = e.touches[0];
    setTouchCoords({ x: touch.clientX, y: touch.clientY });
    dragYRef.current = touch.clientY;

    // Identify target element under finger
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (element) {
      // 1. Identify category card
      const categoryCard = element.closest('[data-category-id]');
      if (categoryCard) {
        const categoryId = categoryCard.getAttribute('data-category-id');
        if (categoryId && dragOverCategoryId !== categoryId) {
          setDragOverCategoryId(categoryId);
          setDragOverAccountId(null);
        }
        return;
      }

      // 2. Identify account card
      const accountCard = element.closest('[data-account-id]');
      if (accountCard) {
        const accountId = accountCard.getAttribute('data-account-id');
        if (accountId && accountId !== activeDragAccount.id) {
          if (dragOverAccountId !== accountId) {
            setDragOverAccountId(accountId);
            setDragOverCategoryId(null);
          }
          return;
        }
      }
    }
    
    // Fallback/Default
    setDragOverCategoryId(null);
    setDragOverAccountId(null);
  };

  const handleTouchEnd = () => {
    if (activeDragAccount) {
      if (dragOverCategoryId) {
        const matchedCategory = categories.find(c => c.id === dragOverCategoryId);
        if (matchedCategory) {
          triggerQuickAmountModal(activeDragAccount, matchedCategory);
        }
      } else if (dragOverAccountId) {
        const matchedTargetAccount = accounts.find(a => a.id === dragOverAccountId);
        if (matchedTargetAccount && matchedTargetAccount.id !== activeDragAccount.id) {
          triggerQuickTransferModal(activeDragAccount, matchedTargetAccount);
        }
      }
    }
    setActiveDragAccount(null);
    setDragOverCategoryId(null);
    setDragOverAccountId(null);
    setTouchCoords(null);
    dragYRef.current = null;
  };

  const triggerQuickAmountModal = (account: Account, category: Category) => {
    setActiveTxData({ account, category });
    setAmount('');
    setDescription('');
  };

  const triggerQuickTransferModal = (fromAccount: Account, toAccount: Account) => {
    setActiveTransferData({ fromAccount, toAccount });
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

    const isIncome = activeTxData.category.type === 'income';

    onAddTransaction({
      accountId: activeTxData.account.id,
      categoryId: activeTxData.category.id,
      amount: numAmount,
      type: isIncome ? 'income' : 'expense',
      date: date,
      description: description.trim() || (isIncome ? `Доход: ${activeTxData.category.name}` : `Расход: ${activeTxData.category.name}`)
    });

    addToast(
      isIncome
        ? `Зачислено: +${numAmount.toFixed(2)} ₼ на счет «${activeTxData.account.name}» (Категория: «${activeTxData.category.name}»)! 🚀`
        : `Записано: ${numAmount.toFixed(2)} ₼ с баланса «${activeTxData.account.name}» на «${activeTxData.category.name}»! 🚀`,
      'success'
    );

    setActiveTxData(null);
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTransferData) return;

    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      alert('Пожалуйста, укажите корректную сумму.');
      return;
    }

    onAddTransfer({
      fromAccountId: activeTransferData.fromAccount.id,
      toAccountId: activeTransferData.toAccount.id,
      amount: numAmount,
      description: description.trim() || `Перевод: ${activeTransferData.fromAccount.name} ➔ ${activeTransferData.toAccount.name}`,
      date: date,
    });

    addToast(
      `Перевод проведен: ${numAmount.toFixed(2)} ₼ со счета «${activeTransferData.fromAccount.name}» на счет «${activeTransferData.toAccount.name}»! 🔁`,
      'success'
    );

    setActiveTransferData(null);
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
              Быстрая запись
            </h3>
            <p className="text-[10px] text-slate-400">
              Перенесите счет на категорию расходов или на другой счет для перевода
            </p>
          </div>
        </div>
      </div>

      {/* Main interactive area */}
      <div className="flex flex-col gap-4">
        {/* ROW 1: Source Accounts */}
        <div>
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 select-none text-left">
            Шаг 1: Возьмите счет (Списание или Источник)
          </span>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5">
            {accounts.map(acc => {
              const bgClass = acc.type === 'card' ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20 hover:border-indigo-400/50' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:border-emerald-400/50';
              const isActive = activeDragAccount?.id === acc.id;
              const isOverAcc = dragOverAccountId === acc.id;
              
              return (
                <div
                  key={acc.id}
                  data-account-id={acc.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, acc)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOverAccount(e, acc.id)}
                  onDragLeave={() => setDragOverAccountId(null)}
                  onDrop={(e) => handleDropOnAccount(e, acc)}
                  onTouchStart={(e) => handleTouchStart(e, acc)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  className={`p-1.5 rounded-xl border flex flex-col items-center justify-center text-center gap-1 transition-all select-none cursor-grab active:cursor-grabbing touch-none ${
                    isOverAcc 
                      ? 'border-indigo-450 bg-indigo-500/20 scale-[1.05] shadow-lg ring-2 ring-indigo-400'
                      : bgClass
                  } ${
                    isActive ? 'scale-[1.05] ring-2 ring-teal-400 border-teal-400 bg-teal-500/20' : ''
                  }`}
                  id={`drag-acc-${acc.id}`}
                  style={{ minHeight: '56px' }}
                >
                  <div className="w-5.5 h-5.5 bg-white/10 rounded flex items-center justify-center text-slate-200">
                    <Wallet size={11} className="shrink-0" />
                  </div>
                  <div className="text-center w-full min-w-0">
                    <span className="block font-bold text-[8.5px] leading-tight text-slate-200 truncate px-0.5">{acc.name}</span>
                    <span className="block text-[8px] font-mono leading-none opacity-80 mt-0.5 truncate">{Math.round(acc.balance)} ₼</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Arrow transition */}
        <div className="flex justify-center -my-1 text-slate-500 select-none pointer-events-none">
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-[9px] font-mono">
            <CornerRightDown size={9} className="text-teal-400 animate-bounce" />
            <span>ПЕРЕНЕСИТЕ СЮДА</span>
          </div>
        </div>

        {/* ROW 2: Destination Categories Grid */}
        <div className="space-y-4">
          {/* Expense Categories */}
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 select-none text-left flex flex-wrap items-center justify-between gap-2">
              <span>Шаг 2: Отпустите на категории расходов (Списание средств)</span>
              {infoCategoryId && expenseCategories.some(c => c.id === infoCategoryId) && (
                <span className="text-teal-300 font-extrabold normal-case font-mono text-[11px] bg-teal-950/40 px-2 py-0.5 rounded-md border border-teal-500/20 animate-pulse">
                  🔍 {categories.find(c => c.id === infoCategoryId)?.name}
                </span>
              )}
            </span>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-1.5">
              {expenseCategories.map(cat => {
                const isOver = dragOverCategoryId === cat.id;
                const hasFocus = infoCategoryId === cat.id;
                return (
                  <div
                    key={cat.id}
                    data-category-id={cat.id}
                    onDragOver={(e) => handleDragOverCategory(e, cat.id)}
                    onDragLeave={() => setDragOverCategoryId(null)}
                    onDrop={(e) => handleDropOnCategory(e, cat)}
                    onClick={() => handleCategoryClick(cat)}
                    onMouseEnter={() => setInfoCategoryId(cat.id)}
                    onMouseLeave={() => setInfoCategoryId(null)}
                    onTouchStart={(e) => {
                      // Prevent default scrolling on mobile if desired, or just trigger info selection
                      handleCategoryClick(cat);
                    }}
                    title={cat.name}
                    className={`relative p-1.5 rounded-xl border flex flex-col items-center justify-center text-center gap-1 transition-all select-none cursor-pointer hover:scale-[1.04] active:scale-95 ${
                      isOver 
                        ? 'border-emerald-400 bg-emerald-500/20 scale-[1.03] shadow-md shadow-emerald-500/5 ring-2 ring-emerald-400' 
                        : hasFocus
                          ? 'border-teal-400 bg-teal-500/15 shadow-lg shadow-teal-500/10 scale-[1.02]'
                          : 'border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10'
                    }`}
                    id={`drop-cat-${cat.id}`}
                    style={{ minHeight: '56px' }}
                  >
                    <div className="w-5.5 h-5.5 bg-white/10 rounded flex items-center justify-center text-slate-200 pointer-events-none">
                      <IconComponent name={cat.icon} size={12} />
                    </div>
                    <span className={`text-[8.5px] font-semibold font-sans tracking-tight leading-normal text-slate-300 max-w-full px-0.5 pointer-events-none text-center ${
                      hasFocus ? 'line-clamp-2 overflow-visible break-words h-auto' : 'truncate'
                    }`}>
                      {formatCategoryDisplayName(cat.name)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Income Categories */}
          {incomeCategories.length > 0 && (
            <div className="pt-2 border-t border-white/5">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 select-none text-left flex flex-wrap items-center justify-between gap-2">
                <span>Или отпустите на категории доходов (Пополнение баланса)</span>
                {infoCategoryId && incomeCategories.some(c => c.id === infoCategoryId) && (
                  <span className="text-emerald-300 font-extrabold normal-case font-mono text-[11px] bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-500/20 animate-pulse">
                    🔍 {categories.find(c => c.id === infoCategoryId)?.name}
                  </span>
                )}
              </span>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-1.5">
                {incomeCategories.map(cat => {
                  const isOver = dragOverCategoryId === cat.id;
                  const hasFocus = infoCategoryId === cat.id;
                  return (
                    <div
                      key={cat.id}
                      data-category-id={cat.id}
                      onDragOver={(e) => handleDragOverCategory(e, cat.id)}
                      onDragLeave={() => setDragOverCategoryId(null)}
                      onDrop={(e) => handleDropOnCategory(e, cat)}
                      onClick={() => handleCategoryClick(cat)}
                      onMouseEnter={() => setInfoCategoryId(cat.id)}
                      onMouseLeave={() => setInfoCategoryId(null)}
                      onTouchStart={(e) => {
                        handleCategoryClick(cat);
                      }}
                      title={cat.name}
                      className={`relative p-1.5 rounded-xl border flex flex-col items-center justify-center text-center gap-1 transition-all select-none cursor-pointer hover:scale-[1.04] active:scale-95 ${
                        isOver 
                          ? 'border-emerald-400 bg-emerald-500/20 scale-[1.03] shadow-md shadow-emerald-500/5 ring-2 ring-emerald-400' 
                          : hasFocus
                            ? 'border-emerald-400 bg-emerald-500/15 shadow-lg shadow-emerald-500/10 scale-[1.02]'
                            : 'border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10'
                      }`}
                      id={`drop-cat-${cat.id}`}
                      style={{ minHeight: '56px' }}
                    >
                      <div className="w-5.5 h-5.5 bg-white/10 rounded flex items-center justify-center text-emerald-400 pointer-events-none">
                        <IconComponent name={cat.icon} size={12} />
                      </div>
                      <span className={`text-[8.5px] font-semibold font-sans tracking-tight leading-normal text-emerald-300 max-w-full px-0.5 pointer-events-none text-center ${
                        hasFocus ? 'line-clamp-2 overflow-visible break-words h-auto' : 'truncate'
                      }`}>
                        {formatCategoryDisplayName(cat.name)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
              <span className={`inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border mb-2 ${
                activeTxData.category.type === 'income'
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                  : 'bg-teal-500/10 text-teal-300 border-teal-500/20'
              }`}>
                {activeTxData.category.type === 'income' ? '⚡ Мгновенная запись дохода' : '⚡ Мгновенная запись расхода'}
              </span>
              <h4 className="font-display font-black text-white text-lg leading-tight">
                {activeTxData.category.type === 'income' ? 'Введите сумму дохода' : 'Введите сумму расхода'}
              </h4>
              
              {/* Context Picker: Account -> Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 bg-slate-950/60 p-3 rounded-2xl border border-white/5 text-left">
                {/* Account Picker */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    {activeTxData.category.type === 'income' ? 'Счет зачисления' : 'Счет списания'}
                  </label>
                  <SearchableDropdown<Account>
                    items={accounts}
                    selectedItem={activeTxData.account}
                    onSelect={(acc) => setActiveTxData({ ...activeTxData, account: acc })}
                    getLabel={(acc) => acc.name}
                    getIcon={(acc) => <Wallet size={11} className={activeTxData.category.type === 'income' ? 'text-emerald-400' : 'text-indigo-400'} />}
                    getSubtitle={(acc) => `${Math.round(acc.balance)} ₼`}
                    placeholder="Поиск счета..."
                    accentClass={activeTxData.category.type === 'income' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-indigo-500/10 border-indigo-500/20'}
                    textColorClass={activeTxData.category.type === 'income' ? 'text-emerald-300' : 'text-indigo-300'}
                  />
                </div>

                {/* Category Picker */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    {activeTxData.category.type === 'income' ? 'Категория дохода' : 'Категория расхода'}
                  </label>
                  <SearchableDropdown<Category>
                    items={activeTxData.category.type === 'income' ? incomeCategories : expenseCategories}
                    selectedItem={activeTxData.category}
                    onSelect={(cat) => setActiveTxData({ ...activeTxData, category: cat })}
                    getLabel={(cat) => formatCategoryDisplayName(cat.name)}
                    getIcon={(cat) => <IconComponent name={cat.icon} size={11} />}
                    placeholder="Поиск категории..."
                    accentClass={activeTxData.category.type === 'income' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}
                    textColorClass={activeTxData.category.type === 'income' ? 'text-emerald-300' : 'text-rose-300'}
                  />
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Amount - large focused number field */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider text-left">
                  Сумма операции (AZN / ₼) <span className="text-rose-450">*</span>
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
                    placeholder={activeTxData.category.type === 'income' ? `Например: Поступление за ${activeTxData.category.name}` : `Например: Покупка в ${activeTxData.category.name}`}
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
                  className={`flex-1 px-4 py-3 text-slate-950 text-xs font-black rounded-2xl shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider ${
                    activeTxData.category.type === 'income'
                      ? 'bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300'
                      : 'bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300'
                  }`}
                >
                  <Check size={14} />
                  Записать ₼
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* THE QUICK TRANSFER RECORDING MODAL */}
      {activeTransferData && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[10000] flex items-center justify-center p-4"
          id="quick-transfer-modal"
          onClick={() => setActiveTransferData(null)}
        >
          <div 
            className="w-full max-w-md bg-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl relative animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal exit */}
            <button
              onClick={() => setActiveTransferData(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Modal header */}
            <div className="text-center mb-6 mt-1">
              <span className="inline-flex items-center gap-1 bg-indigo-500/10 text-indigo-300 font-mono text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border border-indigo-500/20 mb-2">
                🔁 Мгновенный перевод между счетами
              </span>
              <h4 className="font-display font-black text-white text-lg leading-tight">
                Введите сумму перевода
              </h4>
              
              {/* Context Picker: From Account -> To Account */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 bg-slate-950/60 p-3 rounded-2xl border border-white/5 text-left">
                {/* From Account Picker */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Откуда перевести</label>
                  <SearchableDropdown<Account>
                    items={accounts.filter(acc => acc.id !== activeTransferData.toAccount.id)}
                    selectedItem={activeTransferData.fromAccount}
                    onSelect={(acc) => setActiveTransferData({ ...activeTransferData, fromAccount: acc })}
                    getLabel={(acc) => acc.name}
                    getIcon={(acc) => <Wallet size={11} className="text-indigo-400" />}
                    getSubtitle={(acc) => `${Math.round(acc.balance)} ₼`}
                    placeholder="Поиск источника..."
                    accentClass="bg-indigo-500/10 border-indigo-500/20"
                    textColorClass="text-indigo-300"
                  />
                </div>

                {/* To Account Picker */}
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Куда зачислить</label>
                  <SearchableDropdown<Account>
                    items={accounts.filter(acc => acc.id !== activeTransferData.fromAccount.id)}
                    selectedItem={activeTransferData.toAccount}
                    onSelect={(acc) => setActiveTransferData({ ...activeTransferData, toAccount: acc })}
                    getLabel={(acc) => acc.name}
                    getIcon={(acc) => <Wallet size={11} className="text-emerald-400" />}
                    getSubtitle={(acc) => `${Math.round(acc.balance)} ₼`}
                    placeholder="Поиск получателя..."
                    accentClass="bg-emerald-500/10 border-emerald-500/20"
                    textColorClass="text-emerald-300"
                  />
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleTransferSubmit} className="space-y-4">
              {/* Amount - large focused number field */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider text-left">
                  Сумма перевода (AZN / ₼) <span className="text-indigo-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-display font-black text-slate-400 text-xl">
                    ₼
                  </span>
                  <input
                    ref={transferInputRef}
                    type="number"
                    step="any"
                    min="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-10 pr-4 py-3.5 bg-slate-950/80 border border-indigo-500/40 rounded-2xl text-2xl font-display font-black text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-400 focus:border-transparent text-center"
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
                    placeholder={`Например: Пополнение ${activeTransferData.toAccount.name}`}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-white/5 rounded-xl text-xs text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-indigo-400"
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
                    className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-white/5 rounded-xl text-xs text-slate-200 font-mono focus:outline-hidden focus:ring-1 focus:ring-indigo-400"
                    required
                  />
                </div>
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTransferData(null)}
                  className="flex-1 px-4 py-3 border border-white/10 bg-white/5 text-slate-300 hover:text-white rounded-2xl hover:bg-white/10 text-xs font-bold transition-all cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-400 to-indigo-600 hover:from-indigo-300 hover:to-indigo-500 text-slate-950 text-xs font-black rounded-2xl shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider"
                >
                  <Check size={14} />
                  Перевести ₼
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
