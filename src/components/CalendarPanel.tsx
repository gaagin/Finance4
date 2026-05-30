import React, { useState, useRef } from 'react';
import { Transaction, Category, Account } from '../types';
import { IconComponent } from './IconComponent';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Info } from 'lucide-react';
import { AddTransactionModal } from './AddTransactionModal';
import { SearchableSelect } from './SearchableSelect';

interface CalendarPanelProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  onAddTransactionOnDate: (date: string) => void;
  onEditTransaction: (transaction: Transaction) => void;
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
  onAddTransfer: (transfer: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    description: string;
    date: string;
  }) => void;
  onUpdateTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  clickedDate: string;
  setClickedDate: (date: string) => void;
}

const MONTHS_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const WEEKDAYS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export function CalendarPanel({
  transactions,
  categories,
  accounts,
  onAddTransactionOnDate,
  onEditTransaction,
  onAddTransaction,
  onAddTransfer,
  onUpdateTransaction,
  onDeleteTransaction,
  currentDate,
  setCurrentDate,
  clickedDate,
  setClickedDate
}: CalendarPanelProps) {
  const [selectedDayData, setSelectedDayData] = useState<{ date: string; txs: Transaction[] } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterCategoryId, setFilterCategoryId] = useState<string>('all');

  // Filter transactions by category if a category is selected
  const filteredTransactions = React.useMemo(() => {
    if (filterCategoryId === 'all') {
      return transactions;
    }
    return transactions.filter(t => t.categoryId === filterCategoryId);
  }, [transactions, filterCategoryId]);

  // Smooth scroll to the currently focused/clicked date cell on mount to restore focus without displacing the main viewport
  React.useEffect(() => {
    // Ensure the main viewport is never horizontally scrolled/displaced
    window.scrollTo({ left: 0 });
    if (document.documentElement) document.documentElement.scrollLeft = 0;
    if (document.body) document.body.scrollLeft = 0;

    if (clickedDate) {
      const timer = setTimeout(() => {
        const container = document.getElementById('calendar-grid-scroll-container');
        const cellElement = document.querySelector(`[data-date="${clickedDate}"]`) as HTMLElement;
        if (container && cellElement) {
          const cellLeft = cellElement.offsetLeft;
          const cellWidth = cellElement.offsetWidth;
          const containerWidth = container.offsetWidth;
          // Center the active cell specifically inside its own scroll container
          const targetScrollLeft = cellLeft - (containerWidth / 2) + (cellWidth / 2);
          
          container.scrollTo({
            left: Math.max(0, targetScrollLeft),
            behavior: 'smooth'
          });
        }
        
        // Double-check body alignment to avoid horizontal shift and clipping
        window.scrollTo({ left: 0 });
        if (document.documentElement) document.documentElement.scrollLeft = 0;
        if (document.body) document.body.scrollLeft = 0;
      }, 120);

      return () => clearTimeout(timer);
    }
  }, [clickedDate]);

  // Drag and drop states for pointer/touch support
  const [draggingTxId, setDraggingTxIdState] = useState<string | null>(null);
  const draggingTxIdRef = useRef<string | null>(null);
  const setDraggingTxId = (id: string | null) => {
    draggingTxIdRef.current = id;
    setDraggingTxIdState(id);
  };
  const [draggedOverDate, setDraggedOverDate] = useState<string | null>(null);
  const dragMovedRef = useRef(false);

  // Auto-scrolling on drag coordinates refs for horizontal/vertical traversal
  const dragXRef = useRef<number | null>(null);
  const dragYRef = useRef<number | null>(null);

  // Long press timer refs for touch-to-drag delay support
  const touchTimerRef = useRef<any>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const isTouchDraggingActiveRef = useRef<boolean>(false);

  React.useEffect(() => {
    if (!draggingTxId) {
      dragXRef.current = null;
      dragYRef.current = null;
      return;
    }

    const handleWindowDragOver = (e: DragEvent) => {
      if (e.clientX > 0 || e.clientY > 0) {
        dragXRef.current = e.clientX;
        dragYRef.current = e.clientY;
      }
    };

    window.addEventListener('dragover', handleWindowDragOver, true);
    return () => {
      window.removeEventListener('dragover', handleWindowDragOver, true);
    };
  }, [draggingTxId]);

  React.useEffect(() => {
    if (!draggingTxId) return;

    let scrollTimer: number;
    const scrollEdgeY = 110; // px zone from viewport edge
    const scrollEdgeX = 120; // px zone from viewport edge
    const maxScrollSpeed = 16; // px scroll increment speed

    const checkAndScroll = () => {
      if (dragXRef.current !== null && dragYRef.current !== null) {
        const x = dragXRef.current;
        const y = dragYRef.current;

        const width = window.innerWidth;
        const height = window.innerHeight;

        // 1. Vertical page-level scroll traversal
        let scrollYAmount = 0;
        if (y > height - scrollEdgeY) {
          const ratio = (y - (height - scrollEdgeY)) / scrollEdgeY;
          scrollYAmount = Math.min(ratio, 1) * maxScrollSpeed;
        } else if (y < scrollEdgeY) {
          const ratio = (scrollEdgeY - y) / scrollEdgeY;
          scrollYAmount = -Math.min(ratio, 1) * maxScrollSpeed;
        }

        if (scrollYAmount !== 0) {
          window.scrollBy({ top: scrollYAmount, behavior: 'auto' });
          if (document.scrollingElement) {
            document.scrollingElement.scrollTop += scrollYAmount;
          }
        }

        // 2. Horizontal component custom scrolling container traversal
        const scrollContainer = document.getElementById('calendar-grid-scroll-container');
        if (scrollContainer) {
          let scrollXAmount = 0;
          if (x > width - scrollEdgeX) {
            const ratio = (x - (width - scrollEdgeX)) / scrollEdgeX;
            scrollXAmount = Math.min(ratio, 1) * maxScrollSpeed;
          } else if (x < scrollEdgeX) {
            const ratio = (scrollEdgeX - x) / scrollEdgeX;
            scrollXAmount = -Math.min(ratio, 1) * maxScrollSpeed;
          }

          if (scrollXAmount !== 0) {
            scrollContainer.scrollBy({ left: scrollXAmount, behavior: 'auto' });
          }
        }
      }
      scrollTimer = requestAnimationFrame(checkAndScroll);
    };

    scrollTimer = requestAnimationFrame(checkAndScroll);
    return () => {
      cancelAnimationFrame(scrollTimer);
    };
  }, [draggingTxId]);

  const handleTouchMove = (e: React.TouchEvent, txId: string) => {
    const touch = e.touches[0];

    // If dragging is not active yet, check if finger has drifted more than 10px from start
    if (!isTouchDraggingActiveRef.current) {
      if (touchStartPosRef.current) {
        const dx = touch.clientX - touchStartPosRef.current.x;
        const dy = touch.clientY - touchStartPosRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 10) {
          // User is scrolling manually rather than long pressing — cancel the drag timer!
          if (touchTimerRef.current) {
            clearTimeout(touchTimerRef.current);
            touchTimerRef.current = null;
          }
        }
      }
      return; // Do not call preventDefault or perform drag logic. Normal scrolling works!
    }

    if (e.cancelable) {
      e.preventDefault();
    }
    dragMovedRef.current = true;
    dragXRef.current = touch.clientX;
    dragYRef.current = touch.clientY;

    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (element) {
      const cellElement = element.closest('[data-date]');
      if (cellElement) {
        const date = cellElement.getAttribute('data-date');
        if (date && date !== draggedOverDate) {
          setDraggedOverDate(date);
        }
      }
    }
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleGoToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    
    const yearStr = today.getFullYear();
    const monthStr = String(today.getMonth() + 1).padStart(2, '0');
    const dayStr = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yearStr}-${monthStr}-${dayStr}`;
    setClickedDate(todayStr);

    // Also trigger scroll after a short timeout to guarantee centering
    setTimeout(() => {
      const scrollContainer = document.getElementById('calendar-grid-scroll-container');
      const cellElement = document.querySelector(`[data-date="${todayStr}"]`) as HTMLElement;
      if (scrollContainer && cellElement) {
        const cellLeft = cellElement.offsetLeft;
        const cellWidth = cellElement.offsetWidth;
        const containerWidth = scrollContainer.offsetWidth;
        const targetScrollLeft = cellLeft - (containerWidth / 2) + (cellWidth / 2);
        
        scrollContainer.scrollTo({
          left: Math.max(0, targetScrollLeft),
          behavior: 'smooth'
        });
      }
    }, 50);
  };

  // Calendar calculations (Monday start)
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();
  // Adjust JS getDay() where 0 is Sunday to a Monday start (0=Monday, 6=Sunday)
  const startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

  const prevMonthDays = new Date(year, month, 0).getDate();

  const calendarCells = [];

  // Previous month filler days
  for (let i = startOffset - 1; i >= 0; i--) {
    const day = prevMonthDays - i;
    const prevMonthDateStr = `${month === 0 ? year - 1 : year}-${String(month === 0 ? 12 : month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    calendarCells.push({
      day,
      isCurrentMonth: false,
      dateString: prevMonthDateStr
    });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    calendarCells.push({
      day,
      isCurrentMonth: true,
      dateString
    });
  }

  // Next month filler days to complete 42 cells (6 rows of 7)
  const remainingCells = 42 - calendarCells.length;
  for (let day = 1; day <= remainingCells; day++) {
    const nextMonthDateStr = `${month === 11 ? year + 1 : year}-${String(month === 11 ? 1 : month + 2).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    calendarCells.push({
      day,
      isCurrentMonth: false,
      dateString: nextMonthDateStr
    });
  }

  // Group transactions by date using the active category filter
  const getTransactionsForDate = (dateStr: string) => {
    return filteredTransactions.filter(t => t.date === dateStr);
  };

  return (
    <div className="bg-white/5 backdrop-blur-md rounded-3xl p-4 sm:p-6 shadow-lg border border-white/10" id="calendar-panel-wrapper">
      {/* Calendar Header with Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 text-teal-300 border border-white/10 rounded-xl">
            <CalendarIcon size={22} className="stroke-[2px]" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-white">Календарь операций</h2>
            <p className="text-xs text-slate-400">Доходы и расходы по дням</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 shrink-0">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5 bg-slate-900/30 border border-white/5 pl-2.5 pr-1.5 py-1 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Фильтр:</span>
            <SearchableSelect
              items={[{ id: 'all', name: 'Все категории', type: 'expense', icon: 'Tag', color: '#94a3b8' }, ...categories]}
              value={filterCategoryId}
              onChange={(id) => setFilterCategoryId(id)}
              placeholder="Все категории"
              searchPlaceholder="Поиск категории..."
              idKey="id"
              className="min-w-[155px] sm:min-w-[175px]"
              compact={true}
              theme="dark"
              displayValue={(cat) => cat.id === 'all' ? 'Все категории' : cat.name}
              filterValue={(cat) => cat.name}
              renderItem={(cat) => (
                <div className="flex items-center gap-2 text-xs w-full py-0.5">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="font-semibold text-white/90">{cat.name}</span>
                  <span className={`text-[8px] uppercase tracking-wider ml-auto shrink-0 font-extrabold px-1.5 py-0.5 rounded-md ${
                    cat.id === 'all'
                      ? 'bg-slate-500/10 text-slate-400'
                      : cat.type === 'income'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-rose-500/10 text-rose-400'
                  }`}>
                    {cat.id === 'all' ? 'Все' : cat.type === 'income' ? 'Доход' : 'Расход'}
                  </span>
                </div>
              )}
            />
          </div>

          <button
            onClick={handleGoToToday}
            className="px-3 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/15 text-slate-200 border border-white/5 rounded-lg transition-colors cursor-pointer inline-flex items-center"
          >
            Сегодня
          </button>
          
          <div className="flex items-center bg-slate-900/40 border border-white/10 rounded-xl p-1">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
              title="Предыдущий месяц"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 py-1 text-sm font-display font-semibold text-white min-w-[110px] text-center">
              {MONTHS_RU[month]} {year}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
              title="Следующий месяц"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal scroll support for mobile to avoid squished text */}
      <div className="overflow-x-auto pb-3 -mx-4 px-4 lg:mx-0 lg:px-0 custom-scrollbar" id="calendar-grid-scroll-container">
        <div className="min-w-[780px] lg:min-w-0">
          {/* Weekdays indicator headers */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
            {WEEKDAYS_RU.map((day, ix) => (
              <div
                key={day}
                className={`text-center py-2 text-xs font-bold font-display uppercase tracking-wider ${
                  ix >= 5 ? 'text-rose-400 bg-rose-500/10' : 'text-slate-400 bg-white/5'
                } rounded-lg`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Grid cells */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {calendarCells.map((cell, idx) => {
              const dayTransactions = getTransactionsForDate(cell.dateString);
              const totalIncome = dayTransactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + t.amount, 0);
              const totalExpense = dayTransactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + t.amount, 0);

              const isTodayStr = cell.dateString === (() => {
                const d = new Date();
                const yr = d.getFullYear();
                const mn = String(d.getMonth() + 1).padStart(2, '0');
                const dy = String(d.getDate()).padStart(2, '0');
                return `${yr}-${mn}-${dy}`;
              })(); // highlight today dynamically

              return (
                <div
                  key={`${cell.dateString}-${idx}`}
                  data-date={cell.dateString}
                  onClick={() => {
                    if (cell.isCurrentMonth && !dragMovedRef.current) {
                      setClickedDate(cell.dateString);
                      setIsModalOpen(true);
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    dragMovedRef.current = true;
                    if (draggedOverDate !== cell.dateString) {
                      setDraggedOverDate(cell.dateString);
                    }
                  }}
                  onDragLeave={() => {
                    if (draggedOverDate === cell.dateString) {
                      setDraggedOverDate(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const txId = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('transactionId') || draggingTxIdRef.current;
                    if (txId) {
                      const txToMove = transactions.find(t => t.id === txId);
                      if (txToMove && txToMove.date !== cell.dateString) {
                        onUpdateTransaction({ ...txToMove, date: cell.dateString });
                      }
                    }
                    setDraggingTxId(null);
                    setDraggedOverDate(null);
                    dragMovedRef.current = false;
                  }}
                  className={`min-h-[85px] sm:min-h-[115px] flex flex-col justify-between p-1 rounded-lg border transition-all group cursor-pointer ${
                    cell.isCurrentMonth
                      ? 'bg-white/5 border-white/10 hover:border-teal-400/50 hover:bg-white/15 hover:shadow-md'
                      : 'bg-transparent border-white/5 text-slate-500'
                  } ${isTodayStr ? 'ring-2 ring-teal-400 bg-teal-400/10' : ''} ${
                    draggedOverDate === cell.dateString ? 'ring-2 ring-teal-400 bg-teal-400/20 border-teal-400 scale-[0.98]' : ''
                  }`}
                >
                  {/* Day Header row */}
                  <div className="flex items-center justify-between mb-0.5">
                    <span
                      className={`text-[10px] font-display font-extrabold flex items-center justify-center w-4 h-4 rounded-md ${
                        isTodayStr
                          ? 'bg-teal-400 text-slate-950'
                          : cell.isCurrentMonth
                          ? 'text-slate-200'
                          : 'text-slate-500'
                      }`}
                    >
                      {cell.day}
                    </span>

                    {cell.isCurrentMonth && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setClickedDate(cell.dateString);
                          setIsModalOpen(true);
                        }}
                        className="opacity-100 md:opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-all cursor-pointer"
                        title="Добавить расход/доход"
                      >
                        <Plus size={10} />
                      </button>
                    )}
                  </div>

                  {/* Transactions List with SCROLLBAR enabled specifically for mobile/desktop wrapping constraints */}
                  <div 
                    className="flex-1 overflow-y-auto max-h-[48px] sm:max-h-[72px] space-y-1 custom-scrollbar pr-0.5 select-none"
                    onTouchStart={(e) => e.stopPropagation()} // allows direct finger scroll over cells on touchscreens
                  >
                    {dayTransactions.map(tx => {
                      const cat = categories.find(c => c.id === tx.categoryId);
                      const isIncome = tx.type === 'income';
                      return (
                        <div
                          key={tx.id}
                          draggable={cell.isCurrentMonth}
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', tx.id);
                            try {
                              e.dataTransfer.setData('transactionId', tx.id);
                            } catch (_) {}
                            setDraggingTxId(tx.id);
                            dragMovedRef.current = false;
                          }}
                          onDragEnd={() => {
                            setDraggingTxId(null);
                            setDraggedOverDate(null);
                          }}
                          onTouchStart={(e) => {
                            const touch = e.touches[0];
                            touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
                            isTouchDraggingActiveRef.current = false;
                            dragMovedRef.current = false;

                            if (touchTimerRef.current) {
                              clearTimeout(touchTimerRef.current);
                            }

                            touchTimerRef.current = setTimeout(() => {
                              isTouchDraggingActiveRef.current = true;
                              setDraggingTxId(tx.id);
                              dragXRef.current = touch.clientX;
                              dragYRef.current = touch.clientY;
                              if (typeof navigator !== 'undefined' && navigator.vibrate) {
                                try {
                                  navigator.vibrate(50);
                                } catch (_) {}
                              }
                            }, 250);
                          }}
                          onTouchMove={(e) => handleTouchMove(e, tx.id)}
                          onTouchEnd={() => {
                            if (touchTimerRef.current) {
                              clearTimeout(touchTimerRef.current);
                              touchTimerRef.current = null;
                            }

                            if (isTouchDraggingActiveRef.current && draggedOverDate) {
                              const txToMove = transactions.find(t => t.id === tx.id);
                              if (txToMove && txToMove.date !== draggedOverDate) {
                                onUpdateTransaction({ ...txToMove, date: draggedOverDate });
                              }
                            }
                            setDraggingTxId(null);
                            setDraggedOverDate(null);
                            dragXRef.current = null;
                            dragYRef.current = null;
                            touchStartPosRef.current = null;
                            isTouchDraggingActiveRef.current = false;
                            setTimeout(() => {
                              dragMovedRef.current = false;
                            }, 50);
                          }}
                          onTouchCancel={() => {
                            if (touchTimerRef.current) {
                              clearTimeout(touchTimerRef.current);
                              touchTimerRef.current = null;
                            }
                            setDraggingTxId(null);
                            setDraggedOverDate(null);
                            dragXRef.current = null;
                            dragYRef.current = null;
                            touchStartPosRef.current = null;
                            isTouchDraggingActiveRef.current = false;
                            dragMovedRef.current = false;
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (dragMovedRef.current) {
                              return;
                            }
                            onEditTransaction(tx);
                          }}
                          style={{
                            touchAction: draggingTxId === tx.id ? 'none' : 'pan-y'
                          }}
                          className={`text-[10px] p-1 rounded-sm leading-tight transition-all cursor-pointer border truncate select-none group/tx ${
                            draggingTxId === tx.id ? 'opacity-40 border-dashed border-teal-500 bg-teal-100/10' : ''
                          } ${
                            isIncome
                              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25'
                              : 'bg-rose-500/15 border-rose-500/30 text-rose-400 hover:bg-rose-500/25'
                          }`}
                          title={`${cat?.name || 'Другое'}: ${tx.amount} ₼ — ${tx.description || ''}`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-[9px] sm:text-[9.5px] uppercase tracking-wide truncate">
                              {tx.type === 'transfer' ? 'Перевод' : (cat?.name || 'Другое')}
                            </span>
                            <span className="font-mono font-bold text-[9.5px] shrink-0">
                              {isIncome ? '+' : '-'}{Math.round(tx.amount)}₼
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Balance footer for the day (if any transactions exist) */}
                  {dayTransactions.length > 0 && (
                    <div className="border-t border-white/5 pt-1 mt-1 flex flex-col gap-0.5">
                      <div className="flex justify-between text-[9px] font-mono leading-none">
                        {totalIncome > 0 && <span className="text-emerald-400 font-bold">+{Math.round(totalIncome)}₼</span>}
                        {totalExpense > 0 && <span className="text-rose-400 font-bold">-{Math.round(totalExpense)}₼</span>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>



      {/* Modern Add Transaction Modal directly on clicked calendar day */}
      <AddTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        date={clickedDate}
        accounts={accounts}
        categories={categories}
        onAddTransaction={onAddTransaction}
        onAddTransfer={onAddTransfer}
      />
    </div>
  );
}
