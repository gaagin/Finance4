import React, { useState, useRef, useEffect } from 'react';
import { Account, Category, Transaction, formatCategoryDisplayName } from '../types';
import { IconComponent } from './IconComponent';
import { Wallet, HelpCircle, CornerRightDown, Plus, X, Sparkles, Check, ChevronDown, ArrowRight, Search, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';

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
  // Sorting / Reordering features
  const [isSortingMode, setIsSortingMode] = useState<boolean>(false);

  const [accountsOrder, setAccountsOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('honey_sort_accounts_v1');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [categoriesOrder, setCategoriesOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('honey_sort_categories_v1');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Calculate sorted items
  const sortedAccountsDisplay = React.useMemo(() => {
    return [...accounts].sort((a, b) => {
      const idxA = accountsOrder.indexOf(a.id);
      const idxB = accountsOrder.indexOf(b.id);
      if (idxA === -1 && idxB === -1) return 0;
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });
  }, [accounts, accountsOrder]);

  const sortedCategoriesDisplay = React.useMemo(() => {
    return [...categories].sort((a, b) => {
      const idxA = categoriesOrder.indexOf(a.id);
      const idxB = categoriesOrder.indexOf(b.id);
      if (idxA === -1 && idxB === -1) return 0;
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });
  }, [categories, categoriesOrder]);

  const moveAccount = (id: string, direction: 'left' | 'right') => {
    const list = sortedAccountsDisplay.map(a => a.id);
    const index = list.indexOf(id);
    if (index === -1) return;

    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const newList = [...list];
    const temp = newList[index];
    newList[index] = newList[targetIndex];
    newList[targetIndex] = temp;

    setAccountsOrder(newList);
    localStorage.setItem('honey_sort_accounts_v1', JSON.stringify(newList));
    addToast('Порядок счетов обновлен', 'success');
  };

  const moveCategory = (id: string, group: 'income' | 'expense', direction: 'left' | 'right') => {
    const currentGroup = group === 'income' 
      ? sortedCategoriesDisplay.filter(c => c.type === 'income') 
      : sortedCategoriesDisplay.filter(c => c.type === 'expense');
    const list = currentGroup.map(c => c.id);
    const index = list.indexOf(id);
    if (index === -1) return;

    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const fullOrderList = [...categoriesOrder];
    categories.forEach(c => {
      if (!fullOrderList.includes(c.id)) {
        fullOrderList.push(c.id);
      }
    });

    const indexInFull = fullOrderList.indexOf(id);
    const targetIdInGroup = list[targetIndex];
    const targetIndexInFull = fullOrderList.indexOf(targetIdInGroup);

    if (indexInFull !== -1 && targetIndexInFull !== -1) {
      const temp = fullOrderList[indexInFull];
      fullOrderList[indexInFull] = fullOrderList[targetIndexInFull];
      fullOrderList[targetIndexInFull] = temp;

      setCategoriesOrder(fullOrderList);
      localStorage.setItem('honey_sort_categories_v1', JSON.stringify(fullOrderList));
      addToast('Порядок категорий обновлен', 'success');
    }
  };

  // Drag states
  const [activeDragAccount, setActiveDragAccount] = useState<Account | null>(null);
  const [dragOverCategoryId, setDragOverCategoryId] = useState<string | null>(null);
  const [dragOverAccountId, setDragOverAccountId] = useState<string | null>(null);

  // States for displaying full name of categories on tap/click
  const [infoCategoryId, setInfoCategoryId] = useState<string | null>(null);
  const categoryTooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // States for displaying full name of accounts on tap/click
  const [infoAccountId, setInfoAccountId] = useState<string | null>(null);
  const accountTooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (categoryTooltipTimeoutRef.current) {
        clearTimeout(categoryTooltipTimeoutRef.current);
      }
      if (accountTooltipTimeoutRef.current) {
        clearTimeout(accountTooltipTimeoutRef.current);
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

  const handleAccountClick = (acc: Account) => {
    setInfoAccountId(acc.id);
    if (accountTooltipTimeoutRef.current) {
      clearTimeout(accountTooltipTimeoutRef.current);
    }
    accountTooltipTimeoutRef.current = setTimeout(() => {
      setInfoAccountId(null);
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
  const [date, setDate] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }); // Default to current local date

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
  const expenseCategories = sortedCategoriesDisplay.filter(c => c.type === 'expense');
  const incomeCategories = sortedCategoriesDisplay.filter(c => c.type === 'income');

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
      className="bg-white/5 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/10 shadow-lg relative overflow-hidden" 
      id="quick-drag-action-panel"
    >
      {/* Decorative gradient corner */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header section */}
      <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-teal-500/10 text-teal-300 border border-teal-500/20 rounded-lg">
            <Sparkles size={16} className="animate-pulse" />
          </div>
          <div>
            <h3 className="font-display font-bold text-slate-100 text-sm">
              Быстрая запись
            </h3>
            <p className="text-[10px] text-slate-400">
              {isSortingMode
                ? "Нажимайте на стрелочки на карточках, чтобы расположить счета и категории в удобном порядке 🚀"
                : "Перенесите счет на категорию расходов или на другой счет для перевода"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsSortingMode(!isSortingMode)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold cursor-pointer transition-all ${
            isSortingMode
              ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 shadow-xl ring-2 ring-emerald-500/35 scale-[1.02]'
              : 'border-white/10 bg-white/5 text-slate-350 hover:bg-white/10 hover:border-white/25 active:scale-95'
          }`}
        >
          <SlidersHorizontal size={13} />
          {isSortingMode ? 'Готово' : 'Порядок'}
        </button>
      </div>

      {/* Main interactive area */}
      <div className="flex flex-col gap-3">
        {/* ROW 1: Source Accounts */}
        <div>
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 select-none text-left flex flex-wrap items-center justify-between gap-2">
            <span>Шаг 1: Возьмите счет (Списание или Источник)</span>
            {!isSortingMode && infoAccountId && (
              <span className="text-teal-350 font-extrabold normal-case font-mono text-[11px] bg-teal-950/40 px-2 py-0.5 rounded-md border border-teal-500/20 animate-pulse">
                🔍 {accounts.find(a => a.id === infoAccountId)?.name}
              </span>
            )}
          </span>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5">
            {sortedAccountsDisplay.map(acc => {
              const bgClass = acc.type === 'card' ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20 hover:border-indigo-400/50' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:border-emerald-400/50';
              const isActive = activeDragAccount?.id === acc.id;
              const isOverAcc = dragOverAccountId === acc.id;
              const hasFocus = infoAccountId === acc.id;
              
              return (
                <div
                  key={acc.id}
                  data-account-id={acc.id}
                  draggable={!isSortingMode}
                  onDragStart={(e) => handleDragStart(e, acc)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOverAccount(e, acc.id)}
                  onDragLeave={() => setDragOverAccountId(null)}
                  onDrop={(e) => handleDropOnAccount(e, acc)}
                  onClick={() => !isSortingMode && handleAccountClick(acc)}
                  onMouseEnter={() => !isSortingMode && setInfoAccountId(acc.id)}
                  onMouseLeave={() => !isSortingMode && setInfoAccountId(null)}
                  onTouchStart={(e) => {
                    if (isSortingMode) return;
                    handleAccountClick(acc);
                    handleTouchStart(e, acc);
                  }}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  className={`relative p-1 rounded-xl border flex flex-col items-center justify-center text-center gap-0.5 transition-all select-none ${
                    isOverAcc 
                      ? 'border-indigo-450 bg-indigo-500/20 scale-[1.05] shadow-lg ring-2 ring-indigo-400'
                      : hasFocus && !isSortingMode
                        ? 'border-teal-400 bg-teal-500/15 scale-[1.02] shadow-md ring-1 ring-teal-400/40'
                        : bgClass
                  } ${
                    isActive ? 'scale-[1.05] ring-2 ring-teal-400 border-teal-400 bg-teal-500/20' : ''
                  } ${
                    isSortingMode ? 'cursor-default' : 'cursor-grab active:cursor-grabbing touch-none'
                  }`}
                  id={`drag-acc-${acc.id}`}
                  style={{ minHeight: '48px' }}
                >
                  <div className="w-4.5 h-4.5 bg-white/10 rounded-md flex items-center justify-center text-slate-200 pointer-events-none">
                    <Wallet size={10} className="shrink-0" />
                  </div>
                  <div className="text-center w-full min-w-0 pointer-events-none">
                    <span className={`block font-bold text-[8.5px] leading-tight text-slate-200 px-0.5 ${
                      hasFocus && !isSortingMode ? 'line-clamp-2 overflow-visible break-words h-auto' : 'truncate'
                    }`}>{acc.name}</span>
                    <span className="block text-[8px] font-mono leading-none opacity-80 mt-0.5 truncate">{Math.round(acc.balance)} ₼</span>
                  </div>

                  {isSortingMode && (
                    <div className="absolute inset-x-0 bottom-0 top-0 bg-slate-950/95 backdrop-blur-xs rounded-xl flex items-center justify-between px-1.5 z-[100]">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          moveAccount(acc.id, 'left');
                        }}
                        className="p-1 hover:bg-white/10 text-teal-450 rounded-md active:scale-75 transition-all cursor-pointer flex items-center justify-center shrink-0"
                        title="Влево"
                      >
                        <ChevronLeft size={16} className="stroke-[3px]" />
                      </button>
                      <span className="text-[8px] text-teal-400 font-bold select-none truncate">Порядок</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          moveAccount(acc.id, 'right');
                        }}
                        className="p-1 hover:bg-white/10 text-teal-450 rounded-md active:scale-75 transition-all cursor-pointer flex items-center justify-center shrink-0"
                        title="Вправо"
                      >
                        <ChevronRight size={16} className="stroke-[3px]" />
                      </button>
                    </div>
                  )}
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
        <div className="space-y-2.5">
          {/* Expense Categories */}
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 select-none text-left flex flex-wrap items-center justify-between gap-2">
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
                    onClick={() => !isSortingMode && handleCategoryClick(cat)}
                    onMouseEnter={() => !isSortingMode && setInfoCategoryId(cat.id)}
                    onMouseLeave={() => !isSortingMode && setInfoCategoryId(null)}
                    onTouchStart={(e) => {
                      if (isSortingMode) return;
                      handleCategoryClick(cat);
                    }}
                    title={cat.name}
                    className={`relative p-1 rounded-lg border flex flex-col items-center justify-center text-center gap-0.5 transition-all select-none ${
                      isOver 
                        ? 'border-emerald-400 bg-emerald-500/20 scale-[1.03] shadow-md shadow-emerald-500/5 ring-2 ring-emerald-400' 
                        : hasFocus && !isSortingMode
                          ? 'border-teal-400 bg-teal-500/15 shadow-lg shadow-teal-500/10 scale-[1.02]'
                          : 'border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10'
                    } ${
                      isSortingMode ? 'cursor-default' : 'cursor-pointer hover:scale-[1.04] active:scale-95'
                    }`}
                    id={`drop-cat-${cat.id}`}
                    style={{ minHeight: '48px' }}
                  >
                    <div className="w-4.5 h-4.5 bg-white/10 rounded-md flex items-center justify-center text-slate-200 pointer-events-none">
                      <IconComponent name={cat.icon} size={10} />
                    </div>
                    <span className={`text-[8.5px] font-semibold font-sans tracking-tight leading-normal text-slate-300 max-w-full px-0.5 pointer-events-none text-center ${
                      hasFocus && !isSortingMode ? 'line-clamp-2 overflow-visible break-words h-auto' : 'truncate'
                    }`}>
                      {formatCategoryDisplayName(cat.name)}
                    </span>

                    {isSortingMode && (
                      <div className="absolute inset-x-0 bottom-0 top-0 bg-slate-950/95 backdrop-blur-xs rounded-xl flex items-center justify-between px-1.5 z-[100]">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            moveCategory(cat.id, 'expense', 'left');
                          }}
                          className="p-1 hover:bg-white/10 text-teal-450 rounded-md active:scale-75 transition-all cursor-pointer flex items-center justify-center shrink-0"
                          title="Влево"
                        >
                          <ChevronLeft size={16} className="stroke-[3px]" />
                        </button>
                        <span className="text-[8px] text-teal-400 font-bold select-none truncate">Порядок</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            moveCategory(cat.id, 'expense', 'right');
                          }}
                          className="p-1 hover:bg-white/10 text-teal-450 rounded-md active:scale-75 transition-all cursor-pointer flex items-center justify-center shrink-0"
                          title="Вправо"
                        >
                          <ChevronRight size={16} className="stroke-[3px]" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Income Categories */}
          {incomeCategories.length > 0 && (
            <div className="pt-1.5 border-t border-white/5">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 select-none text-left flex flex-wrap items-center justify-between gap-2">
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
                      onClick={() => !isSortingMode && handleCategoryClick(cat)}
                      onMouseEnter={() => !isSortingMode && setInfoCategoryId(cat.id)}
                      onMouseLeave={() => !isSortingMode && setInfoCategoryId(null)}
                      onTouchStart={(e) => {
                        if (isSortingMode) return;
                        handleCategoryClick(cat);
                      }}
                      title={cat.name}
                      className={`relative p-1 rounded-lg border flex flex-col items-center justify-center text-center gap-0.5 transition-all select-none ${
                        isOver 
                          ? 'border-emerald-400 bg-emerald-500/20 scale-[1.03] shadow-md shadow-emerald-500/5 ring-2 ring-emerald-400' 
                          : hasFocus && !isSortingMode
                            ? 'border-emerald-400 bg-emerald-500/15 shadow-lg shadow-emerald-500/10 scale-[1.02]'
                            : 'border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10'
                      } ${
                        isSortingMode ? 'cursor-default' : 'cursor-pointer hover:scale-[1.04] active:scale-95'
                      }`}
                      id={`drop-cat-${cat.id}`}
                      style={{ minHeight: '48px' }}
                    >
                      <div className="w-4.5 h-4.5 bg-white/10 rounded-md flex items-center justify-center text-emerald-400 pointer-events-none">
                        <IconComponent name={cat.icon} size={10} />
                      </div>
                      <span className={`text-[8.5px] font-semibold font-sans tracking-tight leading-normal text-emerald-300 max-w-full px-0.5 pointer-events-none text-center ${
                        hasFocus && !isSortingMode ? 'line-clamp-2 overflow-visible break-words h-auto' : 'truncate'
                      }`}>
                        {formatCategoryDisplayName(cat.name)}
                      </span>

                      {isSortingMode && (
                        <div className="absolute inset-x-0 bottom-0 top-0 bg-slate-950/95 backdrop-blur-xs rounded-xl flex items-center justify-between px-1.5 z-[100]">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              moveCategory(cat.id, 'income', 'left');
                            }}
                            className="p-1 hover:bg-white/10 text-teal-450 rounded-md active:scale-75 transition-all cursor-pointer flex items-center justify-center shrink-0"
                            title="Влево"
                          >
                            <ChevronLeft size={16} className="stroke-[3px]" />
                          </button>
                          <span className="text-[8px] text-teal-400 font-bold select-none truncate">Порядок</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              moveCategory(cat.id, 'income', 'right');
                            }}
                            className="p-1 hover:bg-white/10 text-teal-450 rounded-md active:scale-75 transition-all cursor-pointer flex items-center justify-center shrink-0"
                            title="Вправо"
                          >
                            <ChevronRight size={16} className="stroke-[3px]" />
                          </button>
                        </div>
                      )}
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
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs z-[10000] flex items-center justify-center p-2 overflow-y-auto"
          id="quick-transaction-modal"
          onClick={() => setActiveTxData(null)}
        >
          <div 
            className="w-full max-w-sm bg-slate-900 border border-teal-500/30 rounded-2xl p-4 sm:p-5 shadow-2xl relative animate-scale-up my-auto max-h-[95vh] flex flex-col overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal exit */}
            <button
              onClick={() => setActiveTxData(null)}
              className="absolute top-3.5 right-3.5 text-slate-400 hover:text-white hover:bg-white/10 p-1 rounded-full transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>

            {/* Modal header */}
            <div className="text-center mb-3 mt-0">
              <span className={`inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border mb-1.5 ${
                activeTxData.category.type === 'income'
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                  : 'bg-teal-500/10 text-teal-300 border-teal-500/20'
              }`}>
                {activeTxData.category.type === 'income' ? '⚡ Доход' : '⚡ Расход'}
              </span>
              <h4 className="font-display font-black text-white text-sm leading-tight">
                {activeTxData.category.type === 'income' ? 'Мгновенный доход' : 'Мгновенный расход'}
              </h4>
              
              {/* Context Picker: Account -> Category */}
              <div className="grid grid-cols-2 gap-2 mt-2 bg-slate-950/60 p-2 rounded-xl border border-white/5 text-left">
                {/* Account Picker */}
                <div className="flex flex-col gap-0.5 min-w-0">
                  <label className="text-[8.5px] font-bold uppercase tracking-wider text-slate-400 truncate">
                    {activeTxData.category.type === 'income' ? 'Зачисление' : 'Списание'}
                  </label>
                  <SearchableDropdown<Account>
                    items={accounts}
                    selectedItem={activeTxData.account}
                    onSelect={(acc) => setActiveTxData({ ...activeTxData, account: acc })}
                    getLabel={(acc) => acc.name}
                    getIcon={(acc) => <Wallet size={10} className={activeTxData.category.type === 'income' ? 'text-emerald-400' : 'text-indigo-400'} />}
                    getSubtitle={(acc) => `${Math.round(acc.balance)} ₼`}
                    placeholder="Поиск..."
                    accentClass={activeTxData.category.type === 'income' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-indigo-500/10 border-indigo-500/20'}
                    textColorClass={activeTxData.category.type === 'income' ? 'text-emerald-300' : 'text-indigo-300'}
                  />
                </div>

                {/* Category Picker */}
                <div className="flex flex-col gap-0.5 min-w-0">
                  <label className="text-[8.5px] font-bold uppercase tracking-wider text-slate-400 truncate">
                    Категория
                  </label>
                  <SearchableDropdown<Category>
                    items={activeTxData.category.type === 'income' ? incomeCategories : expenseCategories}
                    selectedItem={activeTxData.category}
                    onSelect={(cat) => setActiveTxData({ ...activeTxData, category: cat })}
                    getLabel={(cat) => formatCategoryDisplayName(cat.name)}
                    getIcon={(cat) => <IconComponent name={cat.icon} size={10} />}
                    placeholder="Поиск..."
                    accentClass={activeTxData.category.type === 'income' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}
                    textColorClass={activeTxData.category.type === 'income' ? 'text-emerald-300' : 'text-rose-300'}
                  />
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleFormSubmit} className="space-y-3">
              {/* Amount - large focused number field */}
              <div>
                <label className="block text-[8.5px] font-bold text-slate-400 mb-1 uppercase tracking-wider text-left">
                  Сумма операции (₼) <span className="text-rose-450">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-display font-black text-slate-400 text-base">
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
                    className="w-full pl-7 pr-3 py-1.5 bg-slate-950/80 border border-teal-500/40 rounded-xl text-base font-display font-black text-white focus:outline-hidden focus:ring-2 focus:ring-teal-400 focus:border-transparent text-center"
                    required
                  />
                </div>
              </div>

              {/* Description & Date fields (advanced / helper) Grid style */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[8.5px] font-bold text-slate-400 mb-0.5 uppercase tracking-wider text-left">
                    Комментарий (опц.)
                  </label>
                  <input
                    type="text"
                    placeholder="Описание..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-950/60 border border-white/5 rounded-lg text-[11px] text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-teal-400"
                  />
                </div>

                <div>
                  <label className="block text-[8.5px] font-bold text-slate-400 mb-0.5 uppercase tracking-wider text-left">
                    Дата операции
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-950/60 border border-white/5 rounded-lg text-[11px] text-slate-200 font-mono focus:outline-hidden focus:ring-1 focus:ring-teal-400"
                    required
                  />
                </div>
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex gap-2 pt-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTxData(null)}
                  className="flex-1 px-3 py-2 border border-white/10 bg-white/5 text-slate-350 hover:text-white rounded-xl hover:bg-white/10 text-xs font-bold transition-all cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className={`flex-1 px-3 py-2 text-slate-950 text-xs font-black rounded-xl shadow-md transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-1 cursor-pointer uppercase tracking-wider ${
                    activeTxData.category.type === 'income'
                      ? 'bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300'
                      : 'bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300'
                  }`}
                >
                  <Check size={13} />
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
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs z-[10000] flex items-center justify-center p-2 overflow-y-auto"
          id="quick-transfer-modal"
          onClick={() => setActiveTransferData(null)}
        >
          <div 
            className="w-full max-w-sm bg-slate-900 border border-indigo-500/30 rounded-2xl p-4 sm:p-5 shadow-2xl relative animate-scale-up my-auto max-h-[95vh] flex flex-col overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal exit */}
            <button
              onClick={() => setActiveTransferData(null)}
              className="absolute top-3.5 right-3.5 text-slate-400 hover:text-white hover:bg-white/10 p-1 rounded-full transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>

            {/* Modal header */}
            <div className="text-center mb-3 mt-0">
              <span className="inline-flex items-center gap-1 bg-indigo-500/10 text-indigo-300 font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border border-indigo-500/20 mb-1.5">
                🔁 Мгновенный перевод
              </span>
              <h4 className="font-display font-bold text-white text-sm leading-tight">
                Перевод средств
              </h4>
              
              {/* Context Picker: From Account -> To Account */}
              <div className="grid grid-cols-2 gap-2 mt-2 bg-slate-950/60 p-2 rounded-xl border border-white/5 text-left">
                {/* From Account Picker */}
                <div className="flex flex-col gap-0.5 min-w-0">
                  <label className="text-[8.5px] font-bold uppercase tracking-wider text-slate-400 truncate">Откуда</label>
                  <SearchableDropdown<Account>
                    items={accounts.filter(acc => acc.id !== activeTransferData.toAccount.id)}
                    selectedItem={activeTransferData.fromAccount}
                    onSelect={(acc) => setActiveTransferData({ ...activeTransferData, fromAccount: acc })}
                    getLabel={(acc) => acc.name}
                    getIcon={(acc) => <Wallet size={10} className="text-indigo-400" />}
                    getSubtitle={(acc) => `${Math.round(acc.balance)} ₼`}
                    placeholder="Поиск..."
                    accentClass="bg-indigo-500/10 border-indigo-500/20"
                    textColorClass="text-indigo-300"
                  />
                </div>

                {/* To Account Picker */}
                <div className="flex flex-col gap-0.5 min-w-0">
                  <label className="text-[8.5px] font-bold uppercase tracking-wider text-slate-400 truncate">Куда</label>
                  <SearchableDropdown<Account>
                    items={accounts.filter(acc => acc.id !== activeTransferData.fromAccount.id)}
                    selectedItem={activeTransferData.toAccount}
                    onSelect={(acc) => setActiveTransferData({ ...activeTransferData, toAccount: acc })}
                    getLabel={(acc) => acc.name}
                    getIcon={(acc) => <Wallet size={10} className="text-emerald-400" />}
                    getSubtitle={(acc) => `${Math.round(acc.balance)} ₼`}
                    placeholder="Поиск..."
                    accentClass="bg-emerald-500/10 border-emerald-500/20"
                    textColorClass="text-emerald-300"
                  />
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleTransferSubmit} className="space-y-3">
              {/* Amount - large focused number field */}
              <div>
                <label className="block text-[8.5px] font-bold text-slate-400 mb-1 uppercase tracking-wider text-left">
                  Сумма перевода (₼) <span className="text-indigo-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-display font-black text-slate-400 text-base">
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
                    className="w-full pl-7 pr-3 py-1.5 bg-slate-950/80 border border-indigo-500/40 rounded-xl text-base font-display font-black text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-400 focus:border-transparent text-center"
                    required
                  />
                </div>
              </div>

              {/* Description & Date fields (advanced / helper) Grid style */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[8.5px] font-bold text-slate-400 mb-0.5 uppercase tracking-wider text-left">
                    Комментарий (опц.)
                  </label>
                  <input
                    type="text"
                    placeholder="Описание..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-950/60 border border-white/5 rounded-lg text-[11px] text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-indigo-400"
                  />
                </div>

                <div>
                  <label className="block text-[8.5px] font-bold text-slate-400 mb-0.5 uppercase tracking-wider text-left">
                    Дата операции
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-950/60 border border-white/5 rounded-lg text-[11px] text-slate-200 font-mono focus:outline-hidden focus:ring-1 focus:ring-indigo-400"
                    required
                  />
                </div>
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex gap-2 pt-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTransferData(null)}
                  className="flex-1 px-3 py-2 border border-white/10 bg-white/5 text-slate-350 hover:text-white rounded-xl hover:bg-white/10 text-xs font-bold transition-all cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 px-3 py-2 bg-gradient-to-r from-indigo-400 to-indigo-600 hover:from-indigo-300 hover:to-indigo-500 text-slate-950 text-xs font-black rounded-xl shadow-md transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-1 cursor-pointer uppercase tracking-wider"
                >
                  <Check size={13} />
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
