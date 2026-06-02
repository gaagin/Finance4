import React, { useState } from 'react';
import { Transaction, Category, BudgetLimit, formatCategoryDisplayName, getDynamicTimeframeOptions, formatTimeframeLabel, getCurrentMonthYyyymm } from '../types';
import { IconComponent } from './IconComponent';
import { Plus, Sliders, Trash2, Edit2, AlertCircle, CheckCircle2, TrendingUp, Info, X, AlertTriangle, Calendar } from 'lucide-react';
import { SearchableSelect } from './SearchableSelect';

interface BudgetingPanelProps {
  transactions: Transaction[];
  categories: Category[];
  budgets: BudgetLimit[];
  onSaveBudget: (categoryId: string, amount: number, month?: string) => void;
  onDeleteBudget: (categoryId: string, month?: string) => void;
  theme?: 'light' | 'dark';
}

export function BudgetingPanel({
  transactions,
  categories,
  budgets,
  onSaveBudget,
  onDeleteBudget,
  theme = 'light'
}: BudgetingPanelProps) {
  const [selectedMonth, setSelectedMonth] = useState(() => getCurrentMonthYyyymm());
  const [selectedCategory, setSelectedCategory] = useState('');
  const [baseAmountInput, setBaseAmountInput] = useState('');
  const [adjAmountInput, setAdjAmountInput] = useState('');
  const [isEditing, setIsEditing] = useState<string | null>(null); // holds categoryId being edited
  const [isAddingBudget, setIsAddingBudget] = useState(false);

  // Budget delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{ categoryId: string; categoryName: string } | null>(null);

  // Get dynamic months list for user selection
  const monthOptions = getDynamicTimeframeOptions(transactions).filter(opt => opt.type === 'month');

  // Budget calculations based on the currently selected month context
  const currentMonthTransactions = transactions.filter(t => {
    return t.date.startsWith(selectedMonth) && t.type === 'expense';
  });

  const getSpentForCategory = (catId: string) => {
    return currentMonthTransactions
      .filter(t => t.categoryId === catId)
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const formatMonthKey = (monthStr: string) => {
    if (!monthStr || !monthStr.includes('-')) return monthStr;
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

  // Find all configured budgets
  // Active composite stats for the selected month
  const compositeBudgets = React.useMemo(() => {
    const baseMap = new Map<string, BudgetLimit>();
    const adjustmentMap = new Map<string, BudgetLimit>();

    budgets.forEach(b => {
      const isBase = !b.month || b.month === 'base' || b.month === '';
      if (isBase) {
        baseMap.set(b.categoryId, b);
      } else if (b.month === selectedMonth) {
        adjustmentMap.set(b.categoryId, b);
      }
    });

    const configuredCatIds = new Set([
      ...baseMap.keys(),
      ...adjustmentMap.keys()
    ]);

    return Array.from(configuredCatIds).map(catId => {
      const base = baseMap.get(catId);
      const adj = adjustmentMap.get(catId);
      const baseAmount = base ? base.limitAmount : 0;
      const adjAmount = adj ? adj.limitAmount : 0;
      const totalAmount = baseAmount + adjAmount;

      return {
        categoryId: catId,
        baseBudget: base,
        adjustmentBudget: adj,
        baseAmount,
        adjAmount,
        totalAmount
      };
    });
  }, [budgets, selectedMonth]);

  const expenseCategories = categories.filter(c => c.type === 'expense');

  // Categories that do NOT have a base budget or adjustment set for the selected month
  const unbudgetedCategories = expenseCategories.filter(
    cat => !compositeBudgets.some(b => b.categoryId === cat.id)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetCatId = selectedCategory;
    if (!targetCatId) return;

    // 1. Process Base Budget
    const cleanBase = baseAmountInput.trim();
    if (cleanBase && !isNaN(Number(cleanBase)) && Number(cleanBase) > 0) {
      onSaveBudget(targetCatId, Number(cleanBase), 'base');
    } else {
      onDeleteBudget(targetCatId, 'base');
    }

    // 2. Process Monthly Adjustment Budget
    const cleanAdj = adjAmountInput.trim();
    if (cleanAdj && !isNaN(Number(cleanAdj)) && Number(cleanAdj) !== 0) {
      onSaveBudget(targetCatId, Number(cleanAdj), selectedMonth);
    } else {
      onDeleteBudget(targetCatId, selectedMonth);
    }

    // Reset fields
    setSelectedCategory('');
    setBaseAmountInput('');
    setAdjAmountInput('');
    setIsEditing(null);
    setIsAddingBudget(false);
  };

  const handleStartEdit = (b: { categoryId: string; baseAmount: number; adjAmount: number }) => {
    setIsEditing(b.categoryId);
    setSelectedCategory(b.categoryId);
    setBaseAmountInput(b.baseAmount > 0 ? b.baseAmount.toString() : '');
    setAdjAmountInput(b.adjAmount !== 0 ? b.adjAmount.toString() : '');
  };

  const handleCancelEdit = () => {
    setIsEditing(null);
    setSelectedCategory('');
    setBaseAmountInput('');
    setAdjAmountInput('');
  };

  // Aggregated statuses
  const totalBudgeted = compositeBudgets.reduce((sum, item) => sum + Math.max(0, item.totalAmount), 0);
  const totalSpentInBudgeted = compositeBudgets.reduce((sum, item) => sum + getSpentForCategory(item.categoryId), 0);

  return (
    <div className="w-full" id="budgeting-panel-root">
      
      {/* 2-Columns layout removed: Budgets Progress & List now takes full width */}
      <div className={`w-full backdrop-blur-md rounded-3xl p-6 border shadow-lg flex flex-col justify-between transition-colors duration-200 ${
        theme === 'dark'
          ? 'bg-slate-900/40 border-white/10'
          : 'bg-white border-slate-200'
      }`}>
        <div>
          <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-4 border-b transition-colors duration-200 ${
            theme === 'dark' ? 'border-b border-white/5' : 'border-b border-slate-100'
          }`}>
            <div>
              <h2 className={`text-lg font-display font-bold ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>Активные бюджетные лимиты</h2>
              <p className={`text-xs ${
                theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
              }`}>
                Свод показателей экономии по категориям за <span className="font-semibold text-teal-400">{formatTimeframeLabel(selectedMonth)}</span>
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Month Selector Dropdown */}
              <div className="relative inline-flex items-center gap-2">
                <Calendar size={14} className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className={`pl-2 pr-8 py-1.5 rounded-xl border text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-teal-400 cursor-pointer appearance-none ${
                    theme === 'dark'
                      ? 'bg-slate-950 border-white/10 text-slate-200'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                  style={{
                    backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='none' stroke='${theme === 'dark' ? '%2394a3b8' : '%23475569'}' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'><path d='m6 9 6 6 6-6'></path></svg>")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundSize: '1rem',
                    backgroundRepeat: 'no-repeat'
                  }}
                >
                  {monthOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border transition-colors ${
                theme === 'dark'
                  ? 'bg-white/5 border-white/10'
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <span className={`text-xs ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                }`}>Общий бюджет:</span>
                <span className={`font-display font-extrabold ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}>
                  {totalSpentInBudgeted.toFixed(0)}₼ <span className="text-slate-400 font-normal">/</span> {totalBudgeted.toFixed(0)}₼
                </span>
              </div>

              <button
                onClick={() => setIsAddingBudget(true)}
                className="px-4 py-2 bg-teal-500 hover:bg-teal-400 active:bg-teal-600 text-slate-950 text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <Plus size={14} className="stroke-[2.5px]" />
                Установить лимит
              </button>
            </div>
          </div>

          {compositeBudgets.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center justify-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 border transition-colors ${
                theme === 'dark'
                  ? 'bg-white/5 border-white/10 text-slate-400'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                <Sliders size={28} />
              </div>
              <p className={`font-semibold text-sm ${
                theme === 'dark' ? 'text-slate-300' : 'text-slate-705'
              }`}>Ни один бюджетный лимит не установлен</p>
              <p className={`text-xs max-w-sm mt-1 mb-5 leading-relaxed ${
                theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
              }`}>
                Задайте месячный лимит по категориям расходов для <span className="font-semibold text-teal-400">{formatTimeframeLabel(selectedMonth)}</span>, чтобы отслеживать перерасходы и экономию.
              </p>
              <button
                onClick={() => setIsAddingBudget(true)}
                className="px-4.5 py-2.5 bg-teal-500 hover:bg-teal-400 active:bg-teal-600 text-slate-950 text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Plus size={14} className="stroke-[2.5px]" />
                Установить лимит
              </button>
            </div>
          ) : (
            <div className="space-y-6 max-h-[380px] lg:max-h-[720px] overflow-y-auto pr-1 custom-scrollbar">
              {compositeBudgets.map(b => {
                const cat = categories.find(c => c.id === b.categoryId);
                if (!cat) return null;

                const spent = getSpentForCategory(b.categoryId);
                const effectiveLimit = Math.max(0, b.totalAmount);
                const percent = effectiveLimit > 0 ? (spent / effectiveLimit) * 100 : 0;
                const remaining = effectiveLimit - spent;

                let progressColor = 'bg-teal-500';
                let textColor = 'text-teal-400';
                let badgeStyle = 'bg-teal-500/10 text-teal-300 border-teal-500/20';
                let statusLabel = 'В норме';

                if (b.totalAmount <= 0) {
                  progressColor = 'bg-rose-500/60';
                  textColor = 'text-rose-400';
                  badgeStyle = 'bg-rose-500/10 text-rose-300 border-rose-500/25';
                  statusLabel = 'Лимит равен 0';
                } else if (percent >= 100) {
                  progressColor = 'bg-rose-500';
                  textColor = 'text-rose-400 font-bold';
                  badgeStyle = 'bg-rose-500/15 text-rose-400 border-rose-500/35';
                  statusLabel = 'Перерасход!';
                } else if (percent >= 85) {
                  progressColor = 'bg-amber-500';
                  textColor = 'text-amber-400 font-bold';
                  badgeStyle = 'bg-amber-500/15 text-amber-400 border-amber-500/35';
                  statusLabel = 'Близко к лимиту';
                } else {
                  progressColor = 'bg-emerald-500';
                  textColor = 'text-emerald-400';
                  badgeStyle = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/35';
                  statusLabel = 'Экономия';
                }

                return (
                  <div key={b.categoryId} className={`p-4 border rounded-2xl transition-all ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10 hover:bg-white/10'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}>
                    <div className="flex items-center justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
                          style={{ backgroundColor: cat.color }}
                        >
                          <IconComponent name={cat.icon} size={20} />
                        </div>
                        <div>
                          <h4 className={`font-semibold text-sm ${
                            theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
                          }`}>{formatCategoryDisplayName(cat.name)}</h4>
                          <span className={`inline-flex items-center text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md border ${badgeStyle} mt-0.5`}>
                            {statusLabel}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleStartEdit(b)}
                          className={`p-2 border rounded-xl hover:bg-teal-500 hover:text-slate-950 transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                            theme === 'dark'
                              ? 'bg-white/10 text-slate-200 border-white/10'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                          title="Редактировать лимит"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => {
                            const categoryName = categories.find(c => c.id === b.categoryId)?.name || 'Категория';
                            setDeleteConfirm({ categoryId: b.categoryId, categoryName });
                          }}
                          className={`p-1.5 border rounded-lg transition-colors cursor-pointer ${
                            theme === 'dark'
                              ? 'bg-white/5 border-white/5 text-slate-400 hover:bg-rose-500/15 hover:text-rose-400 hover:border-rose-500/35'
                              : 'bg-slate-100 border-slate-300 text-slate-500 hover:bg-rose-100 hover:text-rose-600 hover:border-rose-250'
                          }`}
                          title="Удалить бюджетный лимит"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Composite Budget Breakdown */}
                    <div className={`mt-2.5 p-2.5 rounded-xl border text-[11px] grid grid-cols-1 xs:grid-cols-3 gap-2 align-middle transition-colors ${
                      theme === 'dark'
                        ? 'bg-slate-950/40 border-white/5'
                        : 'bg-white border-slate-100'
                    }`}>
                      <div>
                        <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>Регулярный:</span>{' '}
                        <span className={`font-semibold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-705'}`}>
                          {b.baseAmount > 0 ? `${b.baseAmount} ₼` : 'нет'}
                        </span>
                      </div>
                      <div>
                        <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>Сдвиг в {formatTimeframeLabel(selectedMonth)}:</span>{' '}
                        <span className={`font-bold ${
                          b.adjAmount > 0 ? 'text-teal-400' : b.adjAmount < 0 ? 'text-rose-400' : (theme === 'dark' ? 'text-slate-500' : 'text-slate-400')
                        }`}>
                          {b.adjAmount > 0 ? `+${b.adjAmount} ₼` : b.adjAmount < 0 ? `${b.adjAmount} ₼` : 'нет'}
                        </span>
                      </div>
                      <div className="xs:text-right">
                        <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>Итоговый лимит:</span>{' '}
                        <span className="font-extrabold text-amber-500 font-display">
                          {b.totalAmount} ₼
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className={`flex justify-between text-xs font-display font-medium mb-1.5 ${
                        theme === 'dark' ? 'text-slate-400' : 'text-slate-505'
                      }`}>
                        <span>Расход: <b className={theme === 'dark' ? 'text-white' : 'text-slate-800'}>{spent.toFixed(1)} ₼</b></span>
                        <span>Лимит: <b className={theme === 'dark' ? 'text-white' : 'text-slate-800'}>{effectiveLimit.toFixed(0)} ₼</b></span>
                      </div>

                      <div className={`w-full h-2.5 rounded-full overflow-hidden border ${
                        theme === 'dark' ? 'bg-white/10 border-white/5' : 'bg-slate-200 border-slate-200/50'
                      }`}>
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                          style={{ width: `${Math.min(percent, 100)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] mt-1.5">
                        <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-505'}>Использовано {percent.toFixed(0)}%</span>
                        {b.totalAmount <= 0 ? (
                          <span className="text-rose-400 font-semibold">Лимит не задан или равен 0</span>
                        ) : remaining >= 0 ? (
                          <span className="text-emerald-500 font-semibold">Осталось: +{remaining.toFixed(1)} ₼</span>
                        ) : (
                          <span className="text-rose-500 font-bold">Превышение: {Math.abs(remaining).toFixed(1)} ₼</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>


      </div>
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className={`w-full max-w-sm max-h-[85vh] sm:max-h-[90vh] flex flex-col border rounded-3xl shadow-2xl overflow-hidden text-left transition-colors duration-200 ${
            theme === 'dark'
              ? 'bg-slate-900 border-white/10'
              : 'bg-white border-slate-200'
          }`}>
            <div className={`flex items-center justify-between px-5 py-4 border-b shrink-0 transition-colors duration-200 ${
              theme === 'dark'
                ? 'border-white/10 bg-white/5'
                : 'border-slate-100 bg-slate-50'
            }`}>
              <div>
                <h3 className={`text-base font-display font-bold flex items-center gap-2 ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}>
                  <Sliders className="text-teal-400" size={18} />
                  Управление бюджетом
                </h3>
                <p className={`text-xs mt-1 ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                }`}>Настройка базового лимита и сдвига</p>
              </div>
              <button
                type="button"
                onClick={handleCancelEdit}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  theme === 'dark'
                    ? 'hover:bg-white/10 text-slate-400 hover:text-white'
                    : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
                }`}
              >
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 overflow-y-auto custom-scrollbar space-y-3.5 flex-1">
              <div>
                <label className={`block text-[11px] font-semibold mb-1.5 uppercase tracking-wider ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  Категория расходов
                </label>
                <select
                  disabled
                  value={selectedCategory}
                  className={`w-full p-3 border rounded-xl text-xs cursor-not-allowed opacity-60 ${
                    theme === 'dark'
                      ? 'bg-slate-950/40 border-white/10 text-slate-400'
                      : 'bg-slate-100 border-slate-200 text-slate-500'
                  }`}
                >
                  <option value={isEditing}>
                    {categories.find(c => c.id === isEditing)?.name || 'Текущая категория'}
                  </option>
                </select>
              </div>

              {/* Standard Regular Budget */}
              <div>
                <label className={`block text-[11px] font-semibold mb-1.5 uppercase tracking-wider ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  Регулярный бюджет на каждый месяц (₼, AZN)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-display font-medium text-xs">
                    ₼
                  </span>
                  <input
                    type="number"
                    step="any"
                    placeholder="Пример: 500"
                    value={baseAmountInput}
                    onChange={(e) => setBaseAmountInput(e.target.value)}
                    className={`w-full pl-8 pr-4 py-2.5 border rounded-xl text-sm font-display font-bold focus:outline-hidden focus:ring-2 focus:ring-teal-400 ${
                      theme === 'dark'
                        ? 'bg-slate-950/60 border-white/10 text-slate-200'
                        : 'bg-slate-50 border-slate-200 text-slate-850'
                    }`}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                  Будет автоматически повторяться каждый месяц по умолчанию
                </p>
              </div>

              {/* Monthly Adjustment Budget */}
              <div>
                <label className={`block text-[11px] font-semibold mb-1.5 uppercase tracking-wider ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  Сдвиг (плюс/минус) в {formatTimeframeLabel(selectedMonth)} (₼)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-display font-medium text-xs">
                    ₼
                  </span>
                  <input
                    type="number"
                    step="any"
                    placeholder="Пример: +150 или -50"
                    value={adjAmountInput}
                    onChange={(e) => setAdjAmountInput(e.target.value)}
                    className={`w-full pl-8 pr-4 py-2.5 border rounded-xl text-sm font-display font-bold focus:outline-hidden focus:ring-2 focus:ring-teal-400 ${
                      theme === 'dark'
                        ? 'bg-slate-950/60 border-white/10 text-slate-200'
                        : 'bg-slate-50 border-slate-200 text-slate-850'
                    }`}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                  Увеличит или уменьшит бюджет только для выбранного месяца
                </p>
              </div>

              {/* Total Calculation */}
              <div className={`p-3 rounded-xl border text-[11px] transition-colors ${
                theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'
              }`}>
                <div className="flex justify-between items-center animate-none">
                  <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-505'}>Расчет итоговой суммы:</span>
                  <span className="font-extrabold text-amber-500 font-display text-sm">
                    {(Number(baseAmountInput) || 0) + (Number(adjAmountInput) || 0)} ₼
                  </span>
                </div>
                <div className="mt-1 flex gap-2 text-slate-500 text-[10px]">
                  <span>Регулярный: {Number(baseAmountInput) || 0}₼</span>
                  <span>➕</span>
                  <span>Сдвиг: {Number(adjAmountInput) || 0}₼</span>
                </div>
              </div>

              {/* 12-Month Average Expenses Stats */}
              {selectedCategory && (
                (() => {
                  const avgData = calculateAverage12Months(selectedCategory);
                  return (
                    <div className={`p-3 border rounded-xl space-y-2.5 transition-colors ${
                      theme === 'dark'
                        ? 'bg-slate-950/45 border-amber-500/10'
                        : 'bg-amber-50/20 border-amber-500/15'
                    }`}>
                      <div className="flex justify-between items-center">
                        <span className={`text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1 ${
                          theme === 'dark' ? 'text-slate-450' : 'text-slate-500'
                        }`}>
                          <TrendingUp size={12} className="text-amber-500 shrink-0" />
                          Средний расход за 12 месяцев
                        </span>
                        <span className="text-xs font-black text-amber-550">
                          {avgData.average.toFixed(1)} ₼ <span className={`text-[10px] font-normal ${
                            theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                          }`}>/ мес</span>
                        </span>
                      </div>

                      <div className="text-[10px] space-y-2">
                        <div className={`flex justify-between items-center border-b pb-1.5 ${
                          theme === 'dark' ? 'text-slate-400 border-white/5' : 'text-slate-600 border-slate-100'
                        }`}>
                          <span>Всего за последние 12 мес:</span>
                          <span className={`font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                            {avgData.totalSum.toFixed(1)} ₼
                          </span>
                        </div>
                        
                        {/* Mini breakdown of months with spending */}
                        <div className="space-y-1 max-h-[105px] overflow-y-auto custom-scrollbar pr-1">
                          <span className={`text-[9px] block font-semibold uppercase tracking-wider ${
                            theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                          }`}>Индивидуальный тренд по месяцам:</span>
                          {avgData.monthlyDetails.slice(-6).map((det, idx) => (
                            <div key={idx} className="flex justify-between items-center py-0.5">
                              <span className={`text-[10px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                {formatMonthKey(det.month)}
                              </span>
                              <span className={det.amount > 0 
                                ? `font-bold text-[10px] ${theme === 'dark' ? 'text-slate-350' : 'text-slate-705'}` 
                                : `text-[10px] ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`
                              }>
                                {det.amount > 0 ? `${det.amount.toFixed(0)} ₼` : '0 ₼'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}

              <div className={`flex gap-3 pt-4 border-t ${
                theme === 'dark' ? 'border-white/5' : 'border-slate-100'
              }`}>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/5 text-slate-350 hover:bg-white/10 hover:text-white'
                      : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-250 hover:text-slate-800'
                  }`}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer shadow-md"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BUDGET ADD MODAL */}
      {isAddingBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in" id="add-budget-modal">
          <div className={`w-full max-w-sm max-h-[85vh] sm:max-h-[90vh] flex flex-col border rounded-3xl shadow-2xl overflow-hidden text-left transition-colors duration-200 ${
            theme === 'dark'
              ? 'bg-slate-900 border-white/10'
              : 'bg-white border-slate-200'
          }`}>
            <div className={`flex items-center justify-between px-5 py-4 border-b shrink-0 transition-colors duration-200 ${
              theme === 'dark'
                ? 'border-white/10 bg-white/5'
                : 'border-slate-100 bg-slate-50'
            }`}>
              <div>
                <h3 className={`text-base font-display font-bold flex items-center gap-2 ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}>
                  <Sliders className="text-teal-400" size={18} />
                  Установить лимит бюджета
                </h3>
                <p className={`text-xs mt-1 ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                }`}>Ограничение расходов по категории</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddingBudget(false);
                  setSelectedCategory('');
                  setBaseAmountInput('');
                  setAdjAmountInput('');
                }}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  theme === 'dark'
                    ? 'hover:bg-white/10 text-slate-400 hover:text-white'
                    : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
                }`}
              >
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 overflow-y-auto custom-scrollbar space-y-3.5 flex-1">
              <div>
                <label className={`block text-[11px] font-semibold mb-1.5 uppercase tracking-wider ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  Категория расходов
                </label>
                <SearchableSelect
                  items={unbudgetedCategories}
                  value={selectedCategory}
                  onChange={(id) => setSelectedCategory(id)}
                  placeholder="Выберите категорию..."
                  searchPlaceholder="Поиск категории..."
                  idKey="id"
                  theme={theme}
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
                      <span className="truncate">{formatCategoryDisplayName(cat.name)}</span>
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
                      <span className="font-semibold">{formatCategoryDisplayName(cat.name)}</span>
                    </div>
                  )}
                />
              </div>

              {/* Standard Regular Budget */}
              <div>
                <label className={`block text-[11px] font-semibold mb-1.5 uppercase tracking-wider ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  Регулярный бюджет на каждый месяц (₼, AZN)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-display font-medium text-xs">
                    ₼
                  </span>
                  <input
                    type="number"
                    step="any"
                    placeholder="Пример: 250"
                    value={baseAmountInput}
                    onChange={(e) => setBaseAmountInput(e.target.value)}
                    className={`w-full pl-8 pr-4 py-2.5 border rounded-xl text-sm font-display font-bold focus:outline-hidden focus:ring-2 focus:ring-teal-400 ${
                      theme === 'dark'
                        ? 'bg-slate-950/60 border-white/10 text-slate-200'
                        : 'bg-slate-50 border-slate-200 text-slate-805'
                    }`}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                  Будет автоматически повторяться каждый месяц по умолчанию
                </p>
              </div>

              {/* Monthly Adjustment Budget */}
              <div>
                <label className={`block text-[11px] font-semibold mb-1.5 uppercase tracking-wider ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  Сдвиг (плюс/минус) в {formatTimeframeLabel(selectedMonth)} (₼)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-display font-medium text-xs">
                    ₼
                  </span>
                  <input
                    type="number"
                    step="any"
                    placeholder="Пример: +100 или -50"
                    value={adjAmountInput}
                    onChange={(e) => setAdjAmountInput(e.target.value)}
                    className={`w-full pl-8 pr-4 py-2.5 border rounded-xl text-sm font-display font-bold focus:outline-hidden focus:ring-2 focus:ring-teal-400 ${
                      theme === 'dark'
                        ? 'bg-slate-950/60 border-white/10 text-slate-200'
                        : 'bg-slate-50 border-slate-200 text-slate-805'
                    }`}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                  Увеличит или уменьшит бюджет только для выбранного месяца
                </p>
              </div>

              {/* Total Calculation */}
              <div className={`p-3 rounded-xl border text-[11px] transition-colors ${
                theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'
              }`}>
                <div className="flex justify-between items-center">
                  <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-505'}>Расчет итоговой суммы:</span>
                  <span className="font-extrabold text-amber-500 font-display text-sm">
                    {(Number(baseAmountInput) || 0) + (Number(adjAmountInput) || 0)} ₼
                  </span>
                </div>
                <div className="mt-1 flex gap-2 text-slate-500 text-[10px]">
                  <span>Регулярный: {Number(baseAmountInput) || 0}₼</span>
                  <span>➕</span>
                  <span>Сдвиг: {Number(adjAmountInput) || 0}₼</span>
                </div>
              </div>

              {/* 12-Month Average Expenses Stats */}
              {selectedCategory && (
                (() => {
                  const avgData = calculateAverage12Months(selectedCategory);
                  return (
                    <div className={`p-3 border rounded-xl space-y-2.5 transition-colors ${
                      theme === 'dark'
                        ? 'bg-slate-950/45 border-amber-500/10'
                        : 'bg-amber-50/20 border-amber-500/15'
                    }`}>
                      <div className="flex justify-between items-center">
                        <span className={`text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1 ${
                          theme === 'dark' ? 'text-slate-450' : 'text-slate-500'
                        }`}>
                          <TrendingUp size={12} className="text-amber-500 shrink-0" />
                          Средний расход за 12 месяцев
                        </span>
                        <span className="text-xs font-black text-amber-550">
                          {avgData.average.toFixed(1)} ₼ <span className={`text-[10px] font-normal ${
                            theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                          }`}>/ мес</span>
                        </span>
                      </div>

                      <div className="text-[10px] space-y-2">
                        <div className={`flex justify-between items-center border-b pb-1.5 ${
                          theme === 'dark' ? 'text-slate-400 border-white/5' : 'text-slate-600 border-slate-100'
                        }`}>
                          <span>Всего за последние 12 мес:</span>
                          <span className={`font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                            {avgData.totalSum.toFixed(1)} ₼
                          </span>
                        </div>
                        
                        {/* Mini breakdown of months with spending */}
                        <div className="space-y-1 max-h-[105px] overflow-y-auto custom-scrollbar pr-1">
                          <span className={`text-[9px] block font-semibold uppercase tracking-wider ${
                            theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                          }`}>Индивидуальный тренд по месяцам:</span>
                          {avgData.monthlyDetails.slice(-6).map((det, idx) => (
                            <div key={idx} className="flex justify-between items-center py-0.5">
                              <span className={`text-[10px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-505'}`}>
                                {formatMonthKey(det.month)}
                              </span>
                              <span className={det.amount > 0 
                                ? `font-bold text-[10px] ${theme === 'dark' ? 'text-slate-350' : 'text-slate-705'}` 
                                : `text-[10px] ${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}`
                              }>
                                {det.amount > 0 ? `${det.amount.toFixed(0)} ₼` : '0 ₼'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}

              <div className={`flex gap-3 pt-4 border-t ${
                theme === 'dark' ? 'border-white/5' : 'border-slate-100'
              }`}>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingBudget(false);
                    setSelectedCategory('');
                    setBaseAmountInput('');
                    setAdjAmountInput('');
                  }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/5 text-slate-350 hover:bg-white/10 hover:text-white'
                      : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-250 hover:text-slate-800'
                  }`}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer shadow-md"
                >
                  Создать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className={`w-full max-w-sm border rounded-3xl p-6 text-center space-y-4 animate-scale-up transition-colors duration-200 ${
            theme === 'dark'
              ? 'bg-slate-900 border-white/10'
              : 'bg-white border-slate-200 shadow-2xl'
          }`} id="delete-budget-modal">
            <div className="w-12 h-12 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto">
              <Trash2 size={22} className="stroke-[2.5px]" />
            </div>
            
            <div className="space-y-1.5 animate-none text-center">
              <h3 className={`text-base font-display font-bold ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>Удалить лимит бюджета?</h3>
              <p className={`text-xs leading-relaxed text-balance text-center ${
                theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
              }`}>
                Вы действительно хотите удалить бюджетные лимиты (включая базовый регулярный лимит и любые месячные сдвиги) для категории <span className={`font-semibold ${
                  theme === 'dark' ? 'text-white' : 'text-slate-800'
                }`}>"{deleteConfirm.categoryName}"</span>? Статистика расходов не исчезнет, но лимиты будут полностью убраны.
              </p>
            </div>

            <div className={`flex gap-3 pt-2 border-t ${
              theme === 'dark' ? 'border-white/5' : 'border-slate-50'
            }`}>
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className={`flex-1 py-2.5 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-white/5 border-white/5 text-slate-350 hover:bg-white/10 hover:text-white'
                    : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200 hover:text-slate-850'
                }`}
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteBudget(deleteConfirm.categoryId, 'base');
                  onDeleteBudget(deleteConfirm.categoryId, selectedMonth);
                  setDeleteConfirm(null);
                }}
                className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md shadow-rose-500/10 hover:shadow-rose-500/20 cursor-pointer"
              >
                Удалить всё
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
