import { useState } from 'react';
import { Transaction, Category, Account } from '../types';
import { IconComponent } from './IconComponent';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Info } from 'lucide-react';

interface CalendarPanelProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  onAddTransactionOnDate: (date: string) => void;
  onEditTransaction: (transaction: Transaction) => void;
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
  onEditTransaction
}: CalendarPanelProps) {
  // Default to May 2026, based on user's current date context
  const [currentDate, setCurrentDate] = useState(new Date(2026, 4, 1)); // Month index 4 is May
  const [selectedDayData, setSelectedDayData] = useState<{ date: string; txs: Transaction[] } | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleGoToToday = () => {
    setCurrentDate(new Date(2026, 4, 23)); // Set to 23 May 2026 (local context today)
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

  // Group transactions by date
  const getTransactionsForDate = (dateStr: string) => {
    return transactions.filter(t => t.date === dateStr);
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

        <div className="flex items-center justify-between sm:justify-end gap-2">
          <button
            onClick={handleGoToToday}
            className="px-3 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/15 text-slate-200 border border-white/5 rounded-lg transition-colors cursor-pointer"
          >
            Май 2026
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

          const isTodayStr = cell.dateString === '2026-05-23'; // highlight "today" contextually

          return (
            <div
              key={`${cell.dateString}-${idx}`}
              className={`min-h-[105px] sm:min-h-[140px] flex flex-col justify-between p-1.5 rounded-xl border transition-all group ${
                cell.isCurrentMonth
                  ? 'bg-white/5 border-white/10 hover:border-teal-400/50 hover:bg-white/10 hover:shadow-md'
                  : 'bg-transparent border-white/5 text-slate-500'
              } ${isTodayStr ? 'ring-2 ring-teal-400 bg-teal-400/10' : ''}`}
            >
              {/* Day Header row */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-display font-extrabold flex items-center justify-center w-5 h-5 rounded-md ${
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
                    onClick={() => onAddTransactionOnDate(cell.dateString)}
                    className="opacity-0 group-hover:opacity-100 md:opacity-0 hover:opacity-100 p-0.5 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-all cursor-pointer"
                    title="Добавить расход/доход"
                  >
                    <Plus size={12} />
                  </button>
                )}
              </div>

              {/* Transactions List with SCROLLBAR enabled specifically for mobile/desktop wrapping constraints */}
              <div 
                className="flex-1 overflow-y-auto max-h-[65px] sm:max-h-[92px] space-y-1 custom-scrollbar pr-0.5 select-none"
                onTouchStart={(e) => e.stopPropagation()} // allows direct finger scroll over cells on touchscreens
              >
                {dayTransactions.map(tx => {
                  const cat = categories.find(c => c.id === tx.categoryId);
                  const isIncome = tx.type === 'income';
                  return (
                    <div
                      key={tx.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditTransaction(tx);
                      }}
                      className={`text-[10px] p-1 rounded-sm leading-tight transition-all cursor-pointer border truncate ${
                        isIncome
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25'
                          : 'bg-rose-500/15 border-rose-500/30 text-rose-400 hover:bg-rose-500/25'
                      }`}
                      title={`${cat?.name || 'Другое'}: ${tx.amount} ₼ — ${tx.description || ''}`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold truncate">{tx.description || cat?.name || 'Инфо'}</span>
                        <span className="font-mono font-bold shrink-0">
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

      {/* Info indicator box */}
      <div className="mt-4 flex items-start gap-2 p-3 bg-white/5 rounded-2xl text-xs text-teal-300 border border-white/10">
        <Info size={14} className="mt-0.5 shrink-0" />
        <div>
          <span className="font-semibold">Совет по мобильному просмотру:</span> Список операций внутри каждого дня можно прокручивать пальцем (вертикальный скролл) прямо в ячейке, если в этот день занесено много записей. Нажмите на операцию для изменения или удаления.
        </div>
      </div>
    </div>
  );
}
