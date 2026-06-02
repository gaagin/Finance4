import React, { useState, useRef, useEffect } from 'react';
import { Account, Category, Transaction, formatCategoryDisplayName, BudgetLimit, getCurrentMonthYyyymm } from '../types';
import { IconComponent } from './IconComponent';
import { Wallet, HelpCircle, CornerRightDown, Plus, X, Sparkles, Check, ChevronDown, ArrowRight, Search, SlidersHorizontal, ChevronLeft, ChevronRight, CreditCard, FileText } from 'lucide-react';

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
  budgets?: BudgetLimit[];
  transactions?: Transaction[];
  timeframe?: string;
}

export function QuickDragDropBuilder({
  accounts,
  categories,
  onAddTransaction,
  onAddTransfer,
  addToast,
  budgets = [],
  transactions = [],
  timeframe = '',
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

  // Click sequence state for selecting account first, then category to transact or other account to transfer
  const [selectedAccountSeq, setSelectedAccountSeq] = useState<Account | null>(null);

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
    if (selectedAccountSeq) {
      const activeAcc = selectedAccountSeq;
      setSelectedAccountSeq(null);
      triggerQuickAmountModal(activeAcc, cat);
      return;
    }

    // If no account is active, fallback to the first account automatically
    if (sortedAccountsDisplay.length > 0) {
      const activeAcc = sortedAccountsDisplay[0];
      triggerQuickAmountModal(activeAcc, cat);
      addToast(`Авто-счет: ${activeAcc.name}`, 'success');
    } else {
      addToast('Пожалуйста, сначала создайте счет в настройках.', 'warning');
    }
  };

  const handleAccountClick = (acc: Account) => {
    if (selectedAccountSeq?.id === acc.id) {
      setSelectedAccountSeq(null);
      return;
    }

    if (selectedAccountSeq) {
      const fromAcc = selectedAccountSeq;
      setSelectedAccountSeq(null);
      triggerQuickTransferModal(fromAcc, acc);
      return;
    }

    setSelectedAccountSeq(acc);
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
    setSelectedAccountSeq(null);
    setActiveTxData({ account, category });
    setAmount('0');
    setDescription('');
    
    // Reset to current local date
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setDate(`${year}-${month}-${day}`);
  };

  const triggerQuickTransferModal = (fromAccount: Account, toAccount: Account) => {
    setSelectedAccountSeq(null);
    setActiveTransferData({ fromAccount, toAccount });
    setAmount('0');
    setDescription('');

    // Reset to current local date
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setDate(`${year}-${month}-${day}`);
  };

  const handleDialClick = (val: string) => {
    if (val === 'Стереть') {
      setAmount(prev => {
        if (prev.length <= 1) return '0';
        return prev.slice(0, -1);
      });
    } else if (val === '.') {
      setAmount(prev => {
        if (!prev || prev === '0') return '0.';
        if (prev.includes('.')) return prev;
        return prev + '.';
      });
    } else {
      setAmount(prev => {
        if (prev === '0' || prev === '') return val;
        return prev + val;
      });
    }
  };

  const handleQuickAdd = (val: number) => {
    setAmount(prev => {
      const current = parseFloat(prev) || 0;
      return (current + val).toString();
    });
  };

  const handleSaveTransaction = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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

  const handleSaveTransfer = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
      className="bg-white/5 backdrop-blur-md rounded-2xl p-1.5 xs:p-2 sm:p-4 lg:p-6 border border-white/10 shadow-lg relative overflow-hidden xl:min-h-[calc(100vh-210px)] flex flex-col justify-between" 
      id="quick-drag-action-panel"
    >
      {/* Decorative gradient corner */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Main interactive area */}
      <div className="flex flex-col gap-2.5 sm:gap-6 lg:gap-8 justify-between h-full flex-1">
        {/* ROW 1: Source Accounts */}
        <div>
          <span className="block text-[9.5px] xs:text-[10.5px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 sm:mb-2 select-none text-left flex items-center justify-between gap-1.5">
            <span>{isSortingMode ? "⚙️ Сортировка" : "Счета"}</span>
            <button
              type="button"
              onClick={() => setIsSortingMode(!isSortingMode)}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[8.5px] sm:text-[9.5px] font-extrabold cursor-pointer transition-all shrink-0 ${
                isSortingMode
                  ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 shadow-xs ring-1 ring-emerald-500/20'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:border-white/20 active:scale-95'
              }`}
            >
              <SlidersHorizontal size={9} />
              {isSortingMode ? 'Готово' : 'Порядок'}
            </button>
          </span>
          <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 sm:gap-2.5">
            {sortedAccountsDisplay.map(acc => {
              const bgClass = acc.type === 'card' ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20 hover:border-indigo-400/50' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:border-emerald-400/50';
              const isActive = activeDragAccount?.id === acc.id;
              const isOverAcc = dragOverAccountId === acc.id;
              const isSeqSelected = selectedAccountSeq?.id === acc.id;
              
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
                  onTouchStart={(e) => {
                    if (isSortingMode) return;
                    handleTouchStart(e, acc);
                  }}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  className={`relative p-2 xs:p-2.5 sm:p-3 md:p-3.5 rounded-xl border flex flex-col items-center justify-center text-center gap-1 sm:gap-1.5 transition-all select-none min-h-[50px] xs:min-h-[56px] sm:min-h-[58px] ${
                    isSeqSelected
                      ? 'border-yellow-400 bg-yellow-500/20 scale-[1.04] ring-2 ring-yellow-400/50 shadow-md shadow-yellow-500/10 animate-pulse'
                      : isOverAcc 
                        ? 'border-indigo-400 bg-indigo-500/20 scale-[1.05]'
                        : bgClass
                  } ${
                    isActive ? 'scale-[1.03] ring-1 ring-teal-400 border-teal-400 bg-teal-500/20' : ''
                  } ${
                    isSortingMode ? 'cursor-default' : 'cursor-grab active:cursor-grabbing touch-none'
                  }`}
                  id={`drag-acc-${acc.id}`}
                >
                  <div className="text-center w-full min-w-0 pointer-events-none">
                    <span className="block font-bold sm:font-extrabold text-[9.5px] xs:text-[11px] sm:text-[13px] md:text-[14px] leading-tight text-white px-0.5 truncate">{acc.name}</span>
                    <span className={`block text-[9.5px] xs:text-[10.5px] sm:text-[13px] md:text-[14px] font-mono font-bold sm:font-black leading-none mt-1 sm:mt-1 select-none drop-shadow-xs ${
                      acc.type === 'card' ? 'text-indigo-300' : 'text-emerald-300'
                    }`}>{Math.round(acc.balance).toLocaleString('ru-RU')} ₼</span>
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

        {/* ROW 2: Destination Categories Grid */}
        <div className="space-y-2.5 sm:space-y-4 flex-1 flex flex-col justify-around">
          {/* Expense Categories */}
          <div>
            <span className="block text-[9.5px] xs:text-[10.5px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 sm:mb-2 select-none text-left flex flex-wrap items-center justify-between gap-1.5">
              <span>Расходы</span>
            </span>
            <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2 sm:gap-2.5">
              {expenseCategories.map(cat => {
                const isOver = dragOverCategoryId === cat.id;

                const targetMonth = (timeframe && timeframe.length === 7) ? timeframe : getCurrentMonthYyyymm();
                
                // Get budget limits
                let baseVal = 0;
                let adjVal = 0;
                budgets.forEach(b => {
                  if (b.categoryId === cat.id) {
                    const isBase = !b.month || b.month === 'base' || b.month === '';
                    if (isBase) {
                      baseVal = b.limitAmount;
                    } else if (b.month === targetMonth) {
                      adjVal = b.limitAmount;
                    }
                  }
                });
                const totalLimit = baseVal + adjVal;
                const hasBudget = totalLimit > 0;

                // Get spent
                const spent = transactions
                  .filter(t => t.date.startsWith(targetMonth) && t.categoryId === cat.id && t.type === 'expense')
                  .reduce((sum, t) => sum + t.amount, 0);

                const percent = hasBudget ? (spent / totalLimit) * 100 : 0;
                const boundedPercent = Math.min(100, Math.max(0, percent));

                return (
                  <div
                    key={cat.id}
                    data-category-id={cat.id}
                    onDragOver={(e) => handleDragOverCategory(e, cat.id)}
                    onDragLeave={() => setDragOverCategoryId(null)}
                    onDrop={(e) => handleDropOnCategory(e, cat)}
                    onClick={() => !isSortingMode && handleCategoryClick(cat)}
                    className={`relative overflow-hidden p-2 xs:p-2.5 sm:p-2.5 md:p-3 rounded-xl border flex flex-col items-center justify-center text-center gap-1 sm:gap-1.5 transition-all select-none min-h-[46px] xs:min-h-[50px] sm:min-h-[52px] ${
                      isOver 
                        ? 'border-rose-400 bg-rose-500/25 scale-[1.03] shadow-md shadow-rose-500/10 ring-1 ring-rose-400' 
                        : 'border-rose-500/15 bg-rose-500/10 hover:bg-rose-500/20 hover:border-rose-500/30'
                    } ${
                      isSortingMode ? 'cursor-default' : 'cursor-pointer hover:scale-[1.04] active:scale-95'
                    }`}
                    id={`drop-cat-${cat.id}`}
                  >
                    {/* Liquid Rise Progress Level */}
                    {hasBudget && spent > 0 && (
                      <div
                        className={`absolute bottom-0 left-0 right-0 w-full transition-all duration-700 ease-out pointer-events-none rounded-b-xl ${
                          percent >= 100
                            ? 'bg-rose-500/40 border-t border-rose-500/60'
                            : percent >= 80
                              ? 'bg-amber-500/25 border-t border-amber-500/35'
                              : 'bg-emerald-500/20 border-t border-emerald-500/35'
                        }`}
                        style={{ height: `${boundedPercent}%`, zIndex: 0 }}
                      />
                    )}

                    <span className="relative z-10 text-[9.5px] xs:text-[11px] sm:text-[12px] md:text-[13px] font-bold sm:font-black font-sans tracking-tight leading-none sm:leading-normal text-white max-w-full px-0.5 pointer-events-none text-center uppercase break-words">
                      {formatCategoryDisplayName(cat.name)}
                    </span>

                    {/* Numeric breakdown details */}
                    {hasBudget ? (
                      <span className="relative z-10 text-[8px] sm:text-[9.5px] font-semibold font-mono text-white pointer-events-none mt-0.5 leading-none tracking-tight">
                        {spent.toFixed(0)}/{totalLimit.toFixed(0)} ₼
                      </span>
                    ) : (
                      <span className="relative z-10 text-[8px] sm:text-[9.5px] font-medium font-mono text-white/50 pointer-events-none mt-0.5 leading-none tracking-tight">
                        {spent > 0 ? `${spent.toFixed(0)} ₼` : '0 ₼'}
                      </span>
                    )}

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
            <div className="pt-2 sm:pt-4 border-t border-white/5">
              <span className="block text-[9.5px] xs:text-[10.5px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1 sm:mb-2 select-none text-left flex flex-wrap items-center justify-between gap-1.5">
                <span>Доходы</span>
              </span>
              <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2 sm:gap-2.5">
                {incomeCategories.map(cat => {
                  const isOver = dragOverCategoryId === cat.id;

                  const targetMonth = (timeframe && timeframe.length === 7) ? timeframe : getCurrentMonthYyyymm();
                  const incomeSpent = transactions
                    .filter(t => t.date.startsWith(targetMonth) && t.categoryId === cat.id && t.type === 'income')
                    .reduce((sum, t) => sum + t.amount, 0);

                  return (
                    <div
                      key={cat.id}
                      data-category-id={cat.id}
                      onDragOver={(e) => handleDragOverCategory(e, cat.id)}
                      onDragLeave={() => setDragOverCategoryId(null)}
                      onDrop={(e) => handleDropOnCategory(e, cat)}
                      onClick={() => !isSortingMode && handleCategoryClick(cat)}
                      className={`relative overflow-hidden p-2 xs:p-2.5 sm:p-2.5 md:p-3 rounded-xl border flex flex-col items-center justify-center text-center gap-1 sm:gap-1.5 transition-all select-none min-h-[46px] xs:min-h-[50px] sm:min-h-[52px] ${
                        isOver 
                          ? 'border-emerald-400 bg-emerald-500/25 scale-[1.03] shadow-md shadow-emerald-500/10 ring-1 ring-emerald-400' 
                          : 'border-emerald-500/15 bg-emerald-500/10 hover:bg-emerald-500/20 hover:border-emerald-500/30'
                      } ${
                        isSortingMode ? 'cursor-default' : 'cursor-pointer hover:scale-[1.04] active:scale-95'
                      }`}
                      id={`drop-cat-${cat.id}`}
                    >
                      <span className="relative z-10 text-[9.5px] xs:text-[11px] sm:text-[12px] md:text-[13px] font-bold sm:font-black font-sans tracking-tight leading-none sm:leading-normal text-white max-w-full px-0.5 pointer-events-none text-center uppercase break-words">
                        {formatCategoryDisplayName(cat.name)}
                      </span>

                      <span className="relative z-10 text-[8px] sm:text-[9.5px] font-semibold font-mono text-emerald-400 pointer-events-none mt-0.5 leading-none tracking-tight">
                        {incomeSpent > 0 ? `+${incomeSpent.toFixed(0)} ₼` : '0 ₼'}
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
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-[10000] flex items-center justify-center p-2 xs:p-4 overflow-y-auto font-sans"
          id="quick-transaction-modal"
          onClick={() => setActiveTxData(null)}
        >
          <div 
            className="w-full max-w-[340px] bg-white text-slate-900 rounded-3xl p-4 sm:p-5 shadow-2xl border border-slate-100 relative animate-scale-up my-auto flex flex-col gap-3.5 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between relative">
              <div className="w-full text-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  {activeTxData.category.type === 'income' ? 'ДОХОД' : 'РАСХОД'}
                </span>
              </div>
              <button
                onClick={() => setActiveTxData(null)}
                className="absolute right-0 top-1/2 -translate-y-1/2 bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 p-1.5 rounded-full transition-colors cursor-pointer"
              >
                <X size={12} className="stroke-[2.5]" />
              </button>
            </div>

            {/* Visual connector of accounts and categories */}
            <div className="flex items-center justify-between relative mt-1 px-1">
              {/* Connector line behind */}
              <div className="absolute left-1/2 top-5.5 -translate-y-1/2 w-[55%] -translate-x-1/2 h-[1px] bg-slate-100 z-0" />
              
              {/* Connector pill */}
              <div className="absolute left-1/2 top-5.5 -translate-y-1/2 -translate-x-1/2 px-2 py-0.5 bg-white border border-slate-200 rounded-full text-[8px] font-black uppercase tracking-widest text-slate-500 z-10 select-none shadow-xs whitespace-nowrap">
                {activeTxData.category.type === 'income' ? 'ПОЛУЧИТЬ' : 'ПОТРАТИТЬ'}
              </div>

              {/* Source Account Bubble */}
              <div className="flex flex-col items-center flex-1 z-10 min-w-0">
                <div className="w-11 h-11 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
                  <CreditCard size={18} className="stroke-[2]" />
                </div>
                <span className="mt-1 font-bold text-slate-800 text-[10px] sm:text-[11px] text-center leading-tight truncate w-full px-0.5">
                  {activeTxData.account.name}
                </span>
                <span className="text-[8.5px] text-slate-400 font-bold font-mono mt-0.5 whitespace-nowrap">
                  {Math.round(activeTxData.account.balance).toLocaleString('ru-RU')} ₼
                </span>
              </div>

              {/* Space in between */}
              <div className="w-8 shrink-0 h-4" />

              {/* Destination Category Bubble */}
              <div className="flex flex-col items-center flex-1 z-10 min-w-0">
                <div className="w-11 h-11 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
                  <IconComponent name={activeTxData.category.icon} size={18} className="stroke-[2]" />
                </div>
                <span className="mt-1 font-bold text-slate-800 text-[10px] sm:text-[11px] text-center leading-tight truncate w-full px-0.5">
                  {formatCategoryDisplayName(activeTxData.category.name)}
                </span>
                <span className="text-[8.5px] text-slate-400 font-bold mt-0.5 whitespace-nowrap truncate max-w-full uppercase tracking-wider">
                  {activeTxData.category.type === 'income' ? 'Пополнение' : 'Расход'}
                </span>
              </div>
            </div>

            {/* Input container: СУММА ТРАНЗАКЦИИ */}
            <div className="bg-[#f8fafc] rounded-xl py-2 px-3 border border-[#f1f5f9] flex flex-col mt-0.5">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider text-right mb-0.5 select-none self-end">
                СУММА ТРАНЗАКЦИИ
              </label>
              <div className="flex items-center justify-between gap-2">
                <span className="text-2xl font-display font-light text-[#94a3b8] select-none">
                  ₼
                </span>
                <div className="flex-1 text-right min-w-0 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    inputMode="none"
                    value={amount === '0' || amount === '' ? '0' : amount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.]/g, '');
                      setAmount(val === '' ? '0' : val);
                    }}
                    className="w-full bg-transparent border-none p-0 text-right font-display font-black text-emerald-600 text-2xl sm:text-3xl focus:outline-hidden focus:ring-0 placeholder-emerald-600/30"
                  />
                </div>
              </div>
            </div>

            {/* Custom Keypad dialer */}
            <div className="grid grid-cols-3 gap-1.5 my-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'Стереть'].map((keyVal) => {
                const isErase = keyVal === 'Стереть';
                return (
                  <button
                    key={keyVal}
                    type="button"
                    onClick={() => handleDialClick(keyVal)}
                    className={`h-10 sm:h-11 font-sans font-black text-sm sm:text-base rounded-xl flex items-center justify-center transition-all cursor-pointer select-none border-2 active:scale-95 active:translate-y-[1.5px] active:shadow-none ${
                      isErase 
                        ? 'bg-rose-50 border-rose-200 hover:bg-rose-100/90 hover:border-rose-300 text-rose-600 shadow-[0_2.5px_0_rgba(244,63,94,0.18)] text-[11px]' 
                        : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-800 shadow-[0_2.5px_0_rgba(148,163,184,0.18)] text-base'
                    }`}
                  >
                    {isErase ? '⌫ Стер.' : keyVal}
                  </button>
                );
              })}
            </div>

            {/* Date Input with Calendar icon & Optional Comment Input with Document icon */}
            <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-2">
              <div className="space-y-1 text-left">
                <label className="flex items-center gap-1.5 text-[#64748b] text-[8.5px] font-black uppercase tracking-wider">
                  <span className="text-[10px] shrink-0">📅</span>
                  <span>ДАТА ОПЕРАЦИИ</span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#f8fafc] border border-[#f1f5f9] hover:border-[#e2e8f0] rounded-lg text-[10px] text-slate-700 font-sans font-semibold focus:outline-hidden focus:ring-1 focus:ring-slate-300 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-1 text-left">
                <label className="flex items-center gap-1.5 text-[#64748b] text-[8.5px] font-black uppercase tracking-wider">
                  <FileText size={10} className="text-[#94a3b8] shrink-0" />
                  <span>КОММЕНТАРИЙ</span>
                </label>
                <input
                  type="text"
                  placeholder="Комментарий..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#f8fafc] border border-[#f1f5f9] hover:border-[#e2e8f0] rounded-lg text-[10px] text-slate-700 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-300 focus:bg-white transition-all font-sans"
                />
              </div>
            </div>

            {/* Form Bottom Actions */}
            <div className="flex gap-2.5 pt-0.5">
              <button
                type="button"
                onClick={() => {
                  setAmount('0');
                  setDescription('');
                }}
                className="flex-1 py-2 bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#475569] font-sans font-semibold text-[10.5px] uppercase tracking-wider rounded-xl cursor-pointer transition-all active:scale-[0.97] text-center"
              >
                Очистить
              </button>
              <button
                type="button"
                onClick={() => handleSaveTransaction()}
                className="flex-1 py-2 bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#475569] font-sans font-extrabold text-[10.5px] uppercase tracking-wider rounded-xl cursor-pointer transition-all active:scale-[0.97] text-center"
              >
                ✓ Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* THE QUICK TRANSFER RECORDING MODAL */}
      {activeTransferData && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-[10000] flex items-center justify-center p-2 xs:p-4 overflow-y-auto font-sans"
          id="quick-transfer-modal"
          onClick={() => setActiveTransferData(null)}
        >
          <div 
            className="w-full max-w-[340px] bg-white text-slate-900 rounded-3xl p-4 sm:p-5 shadow-2xl border border-slate-100 relative animate-scale-up my-auto flex flex-col gap-3.5 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between relative">
              <div className="w-full text-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  ПЕРЕВОД
                </span>
              </div>
              <button
                onClick={() => setActiveTransferData(null)}
                className="absolute right-0 top-1/2 -translate-y-1/2 bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 p-1.5 rounded-full transition-colors cursor-pointer"
              >
                <X size={12} className="stroke-[2.5]" />
              </button>
            </div>

            {/* Visual connector of accounts */}
            <div className="flex items-center justify-between relative mt-1 px-1">
              {/* Connector line behind */}
              <div className="absolute left-1/2 top-5.5 -translate-y-1/2 w-[55%] -translate-x-1/2 h-[1px] bg-slate-100 z-0" />
              
              {/* Connector pill */}
              <div className="absolute left-1/2 top-5.5 -translate-y-1/2 -translate-x-1/2 px-2 py-0.5 bg-white border border-slate-200 rounded-full text-[8px] font-black uppercase tracking-widest text-slate-500 z-10 select-none shadow-xs whitespace-nowrap">
                ПЕРЕВЕСТИ
              </div>

              {/* Source Account Bubble */}
              <div className="flex flex-col items-center flex-1 z-10 min-w-0">
                <div className="w-11 h-11 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
                  <CreditCard size={18} className="stroke-[2]" />
                </div>
                <span className="mt-1 font-bold text-slate-800 text-[10px] sm:text-[11px] text-center leading-tight truncate w-full px-0.5">
                  {activeTransferData.fromAccount.name}
                </span>
                <span className="text-[8.5px] text-slate-400 font-bold font-mono mt-0.5 whitespace-nowrap">
                  {Math.round(activeTransferData.fromAccount.balance).toLocaleString('ru-RU')} ₼
                </span>
              </div>

              {/* Space in between */}
              <div className="w-8 shrink-0 h-4" />

              {/* Destination Account Bubble */}
              <div className="flex flex-col items-center flex-1 z-10 min-w-0">
                <div className="w-11 h-11 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
                  <CreditCard size={18} className="stroke-[2]" />
                </div>
                <span className="mt-1 font-bold text-slate-800 text-[10px] sm:text-[11px] text-center leading-tight truncate w-full px-0.5">
                  {activeTransferData.toAccount.name}
                </span>
                <span className="text-[8.5px] text-slate-400 font-bold font-mono mt-0.5 whitespace-nowrap">
                  {Math.round(activeTransferData.toAccount.balance).toLocaleString('ru-RU')} ₼
                </span>
              </div>
            </div>

            {/* Input container: СУММА ТРАНЗАКЦИИ */}
            <div className="bg-[#f8fafc] rounded-xl py-2 px-3 border border-[#f1f5f9] flex flex-col mt-0.5">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider text-right mb-0.5 select-none self-end">
                СУММА ТРАНЗАКЦИИ
              </label>
              <div className="flex items-center justify-between gap-2">
                <span className="text-2xl font-display font-light text-[#94a3b8] select-none">
                  ₼
                </span>
                <div className="flex-1 text-right min-w-0 relative">
                  <input
                    ref={transferInputRef}
                    type="text"
                    inputMode="none"
                    value={amount === '0' || amount === '' ? '0' : amount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.]/g, '');
                      setAmount(val === '' ? '0' : val);
                    }}
                    className="w-full bg-transparent border-none p-0 text-right font-display font-black text-indigo-600 text-2xl sm:text-3xl focus:outline-hidden focus:ring-0 placeholder-indigo-600/30"
                  />
                </div>
              </div>
            </div>

            {/* Custom Keypad dialer */}
            <div className="grid grid-cols-3 gap-1.5 my-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'Стереть'].map((keyVal) => {
                const isErase = keyVal === 'Стереть';
                return (
                  <button
                    key={keyVal}
                    type="button"
                    onClick={() => handleDialClick(keyVal)}
                    className={`h-10 sm:h-11 font-sans font-black text-sm sm:text-base rounded-xl flex items-center justify-center transition-all cursor-pointer select-none border-2 active:scale-95 active:translate-y-[1.5px] active:shadow-none ${
                      isErase 
                        ? 'bg-rose-50 border-rose-200 hover:bg-rose-100/90 hover:border-rose-300 text-rose-600 shadow-[0_2.5px_0_rgba(244,63,94,0.18)] text-[11px]' 
                        : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-800 shadow-[0_2.5px_0_rgba(148,163,184,0.18)] text-base'
                    }`}
                  >
                    {isErase ? '⌫ Стер.' : keyVal}
                  </button>
                );
              })}
            </div>

            {/* Date Input with Calendar icon & Optional Comment Input with Document icon */}
            <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-2">
              <div className="space-y-1 text-left">
                <label className="flex items-center gap-1.5 text-[#64748b] text-[8.5px] font-black uppercase tracking-wider">
                  <span className="text-[10px] shrink-0">📅</span>
                  <span>ДАТА ПЕРЕВОДА</span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#f8fafc] border border-[#f1f5f9] hover:border-[#e2e8f0] rounded-lg text-[10px] text-slate-700 font-sans font-semibold focus:outline-hidden focus:ring-1 focus:ring-slate-300 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-1 text-left">
                <label className="flex items-center gap-1.5 text-[#64748b] text-[8.5px] font-black uppercase tracking-wider">
                  <FileText size={10} className="text-[#94a3b8] shrink-0" />
                  <span>КОММЕНТАРИЙ</span>
                </label>
                <input
                  type="text"
                  placeholder="Комментарий..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#f8fafc] border border-[#f1f5f9] hover:border-[#e2e8f0] rounded-lg text-[10px] text-slate-700 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-300 focus:bg-white transition-all font-sans"
                />
              </div>
            </div>

            {/* Form Bottom Actions */}
            <div className="flex gap-2.5 pt-0.5">
              <button
                type="button"
                onClick={() => {
                  setAmount('0');
                  setDescription('');
                }}
                className="flex-1 py-2 bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#475569] font-sans font-semibold text-[10.5px] uppercase tracking-wider rounded-xl cursor-pointer transition-all active:scale-[0.97] text-center"
              >
                Очистить
              </button>
              <button
                type="button"
                onClick={() => handleSaveTransfer()}
                className="flex-1 py-2 bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#475569] font-sans font-extrabold text-[10.5px] uppercase tracking-wider rounded-xl cursor-pointer transition-all active:scale-[0.97] text-center"
              >
                ✓ Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
