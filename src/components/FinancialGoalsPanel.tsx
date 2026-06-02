import React, { useState, useMemo } from 'react';
import { Account, FinancialGoal } from '../types';
import { 
  Target, 
  Plus, 
  Trash2, 
  Edit2, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  TrendingUp, 
  Info, 
  X, 
  AlertTriangle,
  Award,
  Wallet,
  PieChart
} from 'lucide-react';

const PALETTE = [
  '#0d9488', // Teal
  '#6366f1', // Indigo
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#3b82f6', // Blue
  '#f43f5e'  // Rose
];

interface FinancialGoalsPanelProps {
  accounts: Account[];
  goals?: FinancialGoal[];
  onSaveGoal: (goal: FinancialGoal) => void;
  onDeleteGoal: (id: string) => void;
  theme: 'light' | 'dark';
}

export function FinancialGoalsPanel({
  accounts,
  goals = [],
  onSaveGoal,
  onDeleteGoal,
  theme
}: FinancialGoalsPanelProps) {
  // Modal & form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [accountId, setAccountId] = useState('');
  const [formError, setFormError] = useState('');

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<FinancialGoal | null>(null);

  // Active filter
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  // Interactive goals chart hover tracking
  const [hoveredGoalId, setHoveredGoalId] = useState<string | null>(null);

  // Open creation form
  const handleOpenCreate = () => {
    setName('');
    setTargetAmount('');
    // Default deadline to 6 months from now
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 6);
    setTargetDate(futureDate.toISOString().split('T')[0]);
    
    // Default to first account if available
    if (accounts.length > 0) {
      setAccountId(accounts[0].id);
    } else {
      setAccountId('');
    }
    setEditingGoal(null);
    setFormError('');
    setIsFormOpen(true);
  };

  // Open edit form
  const handleOpenEdit = (goal: FinancialGoal) => {
    setEditingGoal(goal);
    setName(goal.name);
    setTargetAmount(String(goal.targetAmount));
    setTargetDate(goal.targetDate);
    setAccountId(goal.accountId);
    setFormError('');
    setIsFormOpen(true);
  };

  // Handle save
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('Укажите название цели');
      return;
    }

    const parsedAmount = parseFloat(targetAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Укажите корректную целевую сумму (больше 0)');
      return;
    }

    if (!targetDate) {
      setFormError('Укажите срок исполнения цели');
      return;
    }

    if (!accountId) {
      setFormError('Выберите привязанный счет');
      return;
    }

    const savedGoal: FinancialGoal = {
      id: editingGoal ? editingGoal.id : `goal-${Date.now()}`,
      name: name.trim(),
      targetAmount: parsedAmount,
      targetDate,
      accountId,
      createdAt: editingGoal ? editingGoal.createdAt : Date.now(),
      updatedAt: Date.now()
    };

    onSaveGoal(savedGoal);
    setIsFormOpen(false);
  };

  // Compute stats and details for rendering
  const processedGoals = useMemo(() => {
    return goals.map(goal => {
      const account = accounts.find(a => a.id === goal.accountId);
      const currentAmount = account ? account.balance : 0;
      
      const percent = goal.targetAmount > 0 
        ? Math.min(100, Math.max(0, (currentAmount / goal.targetAmount) * 100))
        : 0;

      const isCompleted = percent >= 100;

      // Calculate remaining time and recommendations
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const deadline = new Date(goal.targetDate);
      deadline.setHours(0, 0, 0, 0);

      const diffTime = deadline.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const diffMonths = diffDays > 0 ? diffDays / 30.4 : 0;

      const remainingAmount = Math.max(0, goal.targetAmount - currentAmount);
      
      let recommendedMonthly = 0;
      if (remainingAmount > 0 && diffMonths > 0) {
        recommendedMonthly = remainingAmount / Math.max(1, diffMonths);
      }

      return {
        ...goal,
        account,
        currentAmount,
        percent,
        isCompleted,
        diffDays,
        diffMonths,
        remainingAmount,
        recommendedMonthly
      };
    });
  }, [goals, accounts]);

  // Totals for headers
  const totalSummary = useMemo(() => {
    const total = processedGoals.length;
    const completed = processedGoals.filter(g => g.isCompleted).length;
    const active = total - completed;
    const totalTarget = processedGoals.reduce((sum, g) => sum + g.targetAmount, 0);
    const totalSaved = processedGoals.reduce((sum, g) => sum + g.currentAmount, 0);
    const totalNeeded = processedGoals.reduce((sum, g) => sum + g.remainingAmount, 0);

    return {
      total,
      completed,
      active,
      totalTarget,
      totalSaved,
      totalNeeded
    };
  }, [processedGoals]);

  // Filtered list
  const filteredGoals = useMemo(() => {
    return processedGoals.filter(g => {
      if (filter === 'active') return !g.isCompleted;
      if (filter === 'completed') return g.isCompleted;
      return true;
    });
  }, [processedGoals, filter]);

  // Overall calculations for the visual chart
  const overallPercent = useMemo(() => {
    return totalSummary.totalTarget > 0 
      ? Math.min(100, (totalSummary.totalSaved / totalSummary.totalTarget) * 100) 
      : 0;
  }, [totalSummary]);

  const activeHoveredGoal = useMemo(() => {
    if (!hoveredGoalId) return null;
    return processedGoals.find(g => g.id === hoveredGoalId);
  }, [hoveredGoalId, processedGoals]);

  const goalSlices = useMemo(() => {
    const totalTarget = totalSummary.totalTarget;
    if (totalTarget <= 0) return [];
    
    let accumulatedPercent = 0;
    const outerCircumference = 2 * Math.PI * 72; // 452.389
    
    return processedGoals.map((g, idx) => {
      const percentage = (g.targetAmount / totalTarget) * 100;
      const strokeLength = (percentage / 100) * outerCircumference;
      const strokeOffset = outerCircumference - (accumulatedPercent / 100) * outerCircumference;
      
      accumulatedPercent += percentage;
      
      return {
        ...g,
        color: PALETTE[idx % PALETTE.length],
        percentage,
        strokeLength,
        strokeOffset
      };
    });
  }, [processedGoals, totalSummary.totalTarget]);

  // Russian date formatting helper
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const isDark = theme === 'dark';

  return (
    <div className="space-y-6 pb-20">
      {/* Upper Panel Header Section */}
      <div className={`w-full backdrop-blur-md rounded-3xl p-4 sm:p-6 border shadow-lg flex flex-col justify-between transition-colors duration-200 ${
        isDark ? 'bg-slate-900/40 border-white/10' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className={`text-base sm:text-lg font-display font-black tracking-tight flex items-center gap-2 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              <Target className="text-teal-500 animate-pulse" size={20} />
              Финансовые цели
            </h2>
            <p className={`text-[11px] sm:text-xs font-semibold leading-normal font-sans mt-0.5 ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Создавайте и отслеживайте накопительные цели, привязанные к конкретным расчетным счетам.
            </p>
          </div>

          <button
            onClick={handleOpenCreate}
            className={`cursor-pointer px-4 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-2.5 transition-all text-slate-950 bg-teal-400 hover:bg-teal-300 shadow-md hover:scale-[1.02] active:scale-[0.98]`}
          >
            <Plus size={14} className="stroke-[3]" />
            Новая цель
          </button>
        </div>

        {/* Dashboard statistics for Goals */}
        {processedGoals.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-5 pt-5 border-t border-slate-100 dark:border-white/5">
            {/* Stat 1 */}
            <div className={`p-3.5 rounded-2xl border transition-all ${
              isDark ? 'bg-slate-950/40 border-white/5 text-slate-300' : 'bg-slate-50/80 border-slate-150 text-slate-700'
            }`}>
              <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500 mb-1 flex items-center gap-1">
                <Target size={11} className="text-teal-500" />
                Всего целей
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-xl font-display font-black tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                  {totalSummary.total}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold font-sans">
                  ({totalSummary.completed} выполнено)
                </span>
              </div>
            </div>

            {/* Stat 2 */}
            <div className={`p-3.5 rounded-2xl border transition-all ${
              isDark ? 'bg-slate-950/40 border-white/5 text-slate-300' : 'bg-slate-50/80 border-slate-150 text-slate-700'
            }`}>
              <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500 mb-1 flex items-center gap-1">
                <Award size={11} className="text-green-500" />
                Сумма в целях
              </div>
              <p className={`text-xl font-display font-black tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                {totalSummary.totalTarget.toLocaleString('ru-RU')} ₼
              </p>
            </div>

            {/* Stat 3 */}
            <div className={`p-3.5 rounded-2xl border transition-all ${
              isDark ? 'bg-slate-950/40 border-white/5 text-slate-300' : 'bg-slate-50/80 border-slate-150 text-slate-700'
            }`}>
              <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500 mb-1 flex items-center gap-1">
                <Wallet size={11} className="text-amber-500" />
                Осталось накопить
              </div>
              <p className={`text-xl font-display font-black tracking-tight text-teal-500`}>
                {totalSummary.totalNeeded.toLocaleString('ru-RU')} ₼
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Primary Workspace: list and tabs filter */}
      {goals.length === 0 ? (
        /* Dynamic Empty State */
        <div className={`backdrop-blur-md rounded-3xl p-8 sm:p-12 border text-center transition-all ${
          isDark ? 'bg-slate-900/40 border-white/10' : 'bg-white border-slate-200'
        }`}>
          <div className="w-16 h-16 bg-teal-550/15 text-teal-400 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
            <Target size={32} className="stroke-[1.5]" />
          </div>
          <h3 className={`text-lg sm:text-xl font-display font-black tracking-tight mb-2 ${
            isDark ? 'text-slate-100' : 'text-slate-900'
          }`}>
            У вас пока нет финансовых целей
          </h3>
          <p className={`text-xs max-w-md mx-auto mb-6 ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}>
            Цели помогают систематически откладывать сбережения на крупные покупки, инвестиции или подушку безопасности, привязывая накопления к конкретным счетам. 
          </p>
          <button
            onClick={handleOpenCreate}
            className="cursor-pointer px-5 py-2.5 text-xs font-black text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-xl transition-all shadow-md align-middle"
          >
            Создать первую цель
          </button>
        </div>
      ) : (
        <>
          {/* Portfolio Breakdown Analytics Card */}
          <div className={`backdrop-blur-md rounded-3xl p-5 sm:p-6 border shadow-lg transition-all duration-200 ${
            isDark ? 'bg-slate-900/40 border-white/10' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center gap-2 mb-4">
              <PieChart className="text-teal-500" size={18} />
              <div>
                <h3 className={`text-sm sm:text-base font-display font-black tracking-tight ${
                  isDark ? 'text-slate-100' : 'text-slate-900'
                }`}>
                  Распределение и прогресс портфеля целей
                </h3>
                <p className={`text-[10px] sm:text-xs font-semibold leading-normal font-sans ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  Наведите на сектор или элементы списка, чтобы увидеть детали целей и текущую укомплектованность.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Left Column: Hybrid Donut Wheel */}
              <div className="col-span-1 lg:col-span-5 flex flex-col items-center justify-center relative p-2">
                <div className="relative w-[210px] h-[210px]">
                  <svg 
                    width="100%" 
                    height="100%" 
                    viewBox="0 0 200 200" 
                    className="transform -rotate-90 select-none animate-fade-in"
                  >
                    {/* Outer Wheel background ring */}
                    <circle 
                      cx="100" 
                      cy="100" 
                      r="72" 
                      fill="transparent" 
                      stroke={isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(15, 23, 42, 0.04)"} 
                      strokeWidth="10"
                    />

                    {/* Inner Wheel background ring */}
                    <circle 
                      cx="100" 
                      cy="100" 
                      r="52" 
                      fill="transparent" 
                      stroke={isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(15, 23, 42, 0.06)"} 
                      strokeWidth="10"
                    />

                    {/* Outer Wheel slices (Goal targets proportion) */}
                    {goalSlices.map((slice) => {
                      const isHovered = hoveredGoalId === slice.id;
                      return (
                        <circle
                          key={slice.id}
                          cx="100"
                          cy="100"
                          r="72"
                          fill="transparent"
                          stroke={slice.color}
                          strokeWidth={isHovered ? 14 : 10}
                          strokeDasharray={`${slice.strokeLength} ${2 * Math.PI * 72 - slice.strokeLength}`}
                          strokeDashoffset={slice.strokeOffset}
                          onMouseEnter={() => setHoveredGoalId(slice.id)}
                          onMouseLeave={() => setHoveredGoalId(null)}
                          className="cursor-pointer transition-all duration-200"
                          style={{
                            transformOrigin: 'center',
                            opacity: hoveredGoalId ? (isHovered ? 1 : 0.45) : 0.9,
                            filter: isHovered ? 'drop-shadow(0 0 4px rgba(255,255,255,0.15))' : 'none'
                          }}
                        />
                      );
                    })}

                    {/* Inner progress loop segment showing general progress */}
                    <circle 
                      cx="100" 
                      cy="100" 
                      r="52" 
                      fill="transparent" 
                      stroke="#14b8a6" 
                      strokeWidth="10"
                      strokeDasharray={`${(overallPercent / 100) * 2 * Math.PI * 52} ${2 * Math.PI * 52}`}
                      strokeDashoffset={2 * Math.PI * 52}
                      strokeLinecap="round"
                      style={{
                        transformOrigin: 'center',
                        opacity: hoveredGoalId ? 0.35 : 0.95,
                        filter: isDark ? 'drop-shadow(0 0 2px rgba(20, 184, 166, 0.35))' : 'none',
                        transition: 'opacity 0.2s ease-out'
                      }}
                    />
                  </svg>

                  {/* Absolute positioning of text in the center */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center pointer-events-none select-none">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 leading-none mb-1">
                      {hoveredGoalId ? 'ЦЕЛЬ' : 'ПРОГРЕСС'}
                    </span>
                    <span className={`text-2xl font-black font-display leading-none tracking-tight ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}>
                      {hoveredGoalId ? `${activeHoveredGoal?.percent.toFixed(0)}%` : `${overallPercent.toFixed(0)}%`}
                    </span>
                    <span className="text-[9.5px] font-extrabold font-mono mt-1 text-teal-500 leading-none">
                      {hoveredGoalId 
                        ? `${Math.round(activeHoveredGoal?.currentAmount || 0).toLocaleString('ru-RU')} ₼`
                        : `${Math.round(totalSummary.totalSaved).toLocaleString('ru-RU')} ₼`
                      }
                    </span>
                    <span className="text-[8.5px] font-semibold text-slate-400 dark:text-slate-500 mt-1 leading-normal max-w-[110px] truncate">
                      {hoveredGoalId ? activeHoveredGoal?.name : `из ${Math.round(totalSummary.totalTarget).toLocaleString('ru-RU')} ₼`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Legend matching colors & progress rows */}
              <div className="col-span-1 lg:col-span-7 space-y-2 max-h-[240px] overflow-y-auto pr-1">
                {goalSlices.map((slice) => {
                  const isHovered = hoveredGoalId === slice.id;
                  
                  return (
                    <div 
                      key={slice.id}
                      onMouseEnter={() => setHoveredGoalId(slice.id)}
                      onMouseLeave={() => setHoveredGoalId(null)}
                      className={`p-2 px-3 rounded-xl border flex items-center justify-between gap-3 transition-all duration-200 cursor-pointer ${
                        isHovered 
                          ? isDark 
                            ? 'bg-white/5 border-white/20 shadow-sm' 
                            : 'bg-slate-50 border-slate-300 shadow-sm'
                          : isDark
                            ? 'bg-transparent border-transparent'
                            : 'bg-transparent border-transparent'
                      }`}
                    >
                      {/* Left: Indicator color dot & name */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span 
                          className="w-2.5 h-2.5 rounded-full shrink-0" 
                          style={{ backgroundColor: slice.color }}
                        />
                        <div className="min-w-0">
                          <p className={`text-[11.5px] font-bold font-sans truncate ${
                            isDark ? 'text-slate-200' : 'text-slate-800'
                          }`}>
                            {slice.name}
                          </p>
                          <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 leading-none mt-0.5">
                            Доля: {slice.percentage.toFixed(0)}% • Срок: {formatDate(slice.targetDate)}
                          </p>
                        </div>
                      </div>

                      {/* Right: progress values */}
                      <div className="text-right shrink-0">
                        <p className={`text-[11px] font-black font-mono ${
                          isDark ? 'text-slate-100' : 'text-slate-900'
                        }`}>
                          {slice.currentAmount.toLocaleString('ru-RU')} ₼
                        </p>
                        <p className="text-[9px] font-semibold tracking-normal text-slate-400 dark:text-slate-500 leading-none mt-0.5">
                          из {slice.targetAmount.toLocaleString('ru-RU')} ₼ ({slice.percent.toFixed(0)}%)
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick tab filters */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-2">
            <div className="flex gap-2">
              {(['all', 'active', 'completed'] as const).map(tabKey => (
                <button
                  key={tabKey}
                  onClick={() => setFilter(tabKey)}
                  className={`text-[11px] sm:text-xs font-display font-bold px-3 py-1.5 rounded-lg transition-all border cursor-pointer ${
                    filter === tabKey
                      ? 'bg-teal-500 text-slate-950 border-teal-400 font-extrabold shadow-sm'
                      : isDark
                        ? 'bg-white/5 border-transparent text-slate-400 hover:text-slate-200'
                        : 'bg-slate-100 border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tabKey === 'all' && `Все (${processedGoals.length})`}
                  {tabKey === 'active' && `В процессе (${processedGoals.filter(g => !g.isCompleted).length})`}
                  {tabKey === 'completed' && `Достигнуто (${processedGoals.filter(g => g.isCompleted).length})`}
                </button>
              ))}
            </div>

            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-sans">
              Показано в списке: {filteredGoals.length}
            </span>
          </div>

          {filteredGoals.length === 0 ? (
            <div className={`backdrop-blur-md rounded-2xl p-8 border text-center transition-all ${
              isDark ? 'bg-slate-900/40 border-white/5' : 'bg-slate-50/50 border-slate-200/50'
            }`}>
              <Info className="mx-auto mb-2.5 text-slate-400" size={18} />
              <p className="text-xs text-slate-500 font-semibold font-sans">Нет накоплений, соответствующих выбранному фильтру.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredGoals.map(goal => {
                const accColor = goal.account?.color || 'text-teal-400';
                
                return (
                  <div
                    key={goal.id}
                    className={`backdrop-blur-md rounded-3xl p-5 border shadow-md flex flex-col justify-between group transition-all duration-300 relative overflow-hidden ${
                      isDark 
                        ? 'bg-slate-900/30 hover:bg-slate-900/50 border-white/10 hover:border-white/20' 
                        : 'bg-white hover:bg-slate-50/30 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Visual corner badge */}
                    {goal.isCompleted && (
                      <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none">
                        <div className="absolute top-3 right-[-24px] rotate-45 bg-teal-500 text-slate-950 font-black text-[8px] tracking-widest text-center py-1 w-24 shadow-sm uppercase">
                          Goal!
                        </div>
                      </div>
                    )}

                    {/* Top Row: Info and controls */}
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <h4 className={`text-sm sm:text-base font-display font-black tracking-tight ${
                            isDark ? 'text-white' : 'text-slate-900'
                          }`}>
                            {goal.name}
                          </h4>
                          
                          {/* Account badge */}
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-teal-500 shrink-0" />
                            <span className={`text-[11px] font-bold font-sans ${accColor}`}>
                              Счет: {goal.account?.name || 'Удаленный счет'}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">•</span>
                            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 font-mono">
                              Баланс: {goal.currentAmount.toLocaleString('ru-RU')} ₼
                            </span>
                          </div>
                        </div>

                        {/* Edit & Delete actions */}
                        <div className="flex items-center gap-1 border-l pl-2 border-slate-200 dark:border-white/10 z-10">
                          <button
                            onClick={() => handleOpenEdit(goal)}
                            className={`p-1.5 border rounded-lg hover:bg-teal-500 hover:text-slate-950 transition-colors cursor-pointer flex items-center justify-center shrink-0 ${
                              isDark
                                ? 'bg-white/5 text-slate-300 border-white/5 hover:border-teal-400'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-teal-500'
                            }`}
                            title="Редактировать цель"
                          >
                            <Edit2 size={11} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(goal)}
                            className={`p-1.5 border rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0 ${
                              isDark
                                ? 'bg-white/5 border-white/5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20'
                                : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-220'
                            }`}
                            title="Удалить цель"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>

                      {/* Progress Metrics & Bar */}
                      <div className="mt-4 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold font-sans">
                          <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                            Накоплено: {goal.currentAmount.toLocaleString('ru-RU')} ₼ из {goal.targetAmount.toLocaleString('ru-RU')} ₼
                          </span>
                          <span className="text-teal-550 dark:text-teal-400 font-black font-mono">
                            {goal.percent.toFixed(0)}%
                          </span>
                        </div>

                        {/* Progress bar container */}
                        <div className={`w-full h-2 rounded-full overflow-hidden relative ${
                          isDark ? 'bg-slate-950/80' : 'bg-slate-150'
                        }`}>
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ease-out ${
                              goal.isCompleted 
                                ? 'bg-gradient-to-r from-teal-450 to-emerald-500 shadow-[0_0_8px_rgba(20,184,166,0.3)]' 
                                : 'bg-gradient-to-r from-teal-500 to-indigo-550'
                            }`}
                            style={{ width: `${goal.percent}%` }}
                          />
                        </div>
                      </div>

                      {/* Date tracker */}
                      <div className="flex items-center gap-1.5 mt-3.5 text-[10.5px]">
                        <Calendar size={12} className="text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-400 dark:text-slate-500">
                          Срок: <b className={isDark ? 'text-slate-300' : 'text-slate-700'}>{formatDate(goal.targetDate)}</b>
                        </span>
                        <span className="text-slate-400 dark:text-slate-500">•</span>
                        {goal.diffDays > 0 ? (
                          <span className="text-teal-550 dark:text-teal-450 font-bold">
                            Осталось: {Math.ceil(goal.diffDays)} дн. ({Math.ceil(goal.diffMonths)} мес.)
                          </span>
                        ) : (
                          <span className="text-rose-500 dark:text-rose-455 font-black uppercase flex items-center gap-1.5">
                            <AlertCircle size={10} /> Срок истек!
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Dynamic Recommendations Drawer */}
                    <div className={`mt-3 pt-3 border-t border-dashed w-full text-[11px] ${
                      isDark ? 'border-white/5' : 'border-slate-100'
                    }`}>
                      {goal.isCompleted ? (
                        <div className="text-green-500 font-bold flex items-center gap-1.5">
                          <CheckCircle2 size={12} />
                          Поздравляем! Цель успешно достигнута. Баланс счета покрывает {goal.targetAmount.toLocaleString('ru-RU')} ₼.
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                          <span className="text-slate-400 dark:text-slate-500 font-semibold font-sans">
                            Необходимо отложить еще: <b className="font-mono text-amber-500">{(goal.remainingAmount).toFixed(0)} ₼</b>
                          </span>
                          
                          {goal.recommendedMonthly > 0 && goal.diffDays > 0 && (
                            <span className={`font-black p-1 px-2 rounded-lg ${
                              isDark ? 'bg-teal-500/10 text-teal-300' : 'bg-teal-50 text-teal-600'
                            }`}>
                              Рекомендуется: {goal.recommendedMonthly.toFixed(0)} ₼ / мес.
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Creation and Editing Modal Form Dialog */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-md cursor-pointer"
            onClick={() => setIsFormOpen(false)}
          />
          
          <div 
            className={`w-full max-w-md rounded-3xl p-5 sm:p-6 border shadow-2xl relative transition-colors duration-200 z-10 ${
              isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-display font-black tracking-tight flex items-center gap-2">
                <Target size={18} className="text-teal-400" />
                {editingGoal ? 'Редактировать цель' : 'Создать накопительную цель'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className={`p-1 rounded-lg transition-colors cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                <X size={16} />
              </button>
            </div>

            {/* Error banner */}
            {formError && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-bold leading-normal flex items-start gap-2">
                <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {/* Main Form Fields */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={`block text-[10.5px] uppercase font-black tracking-widest mb-1.5 ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  Название цели
                </label>
                <input
                  type="text"
                  placeholder="Например: Подушка безопасности, Купить авто"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl text-xs font-bold border focus:outline-hidden focus:ring-1 focus:ring-teal-400 ${
                    isDark 
                      ? 'bg-slate-950 border-white/5 text-slate-100 placeholder-slate-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                  }`}
                  maxLength={50}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className={`block text-[10.5px] uppercase font-black tracking-widest mb-1.5 ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    Целевая сумма (₼)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    placeholder="2500"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    className={`w-full px-3.5 py-2 rounded-xl text-xs font-bold border font-mono focus:outline-hidden focus:ring-1 focus:ring-teal-400 ${
                      isDark 
                        ? 'bg-slate-950 border-white/5 text-slate-100 placeholder-slate-500' 
                        : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className={`block text-[10.5px] uppercase font-black tracking-widest mb-1.5 ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    Срок исполнения
                  </label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className={`w-full px-3.5 py-2 rounded-xl text-xs font-bold border focus:outline-hidden focus:ring-1 focus:ring-teal-400 ${
                      isDark 
                        ? 'bg-slate-950 border-white/5 text-slate-100' 
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                    required
                  />
                </div>
              </div>

              <div>
                <label className={`block text-[10.5px] uppercase font-black tracking-widest mb-1.5 ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  Привязать к счету
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl text-xs font-bold border focus:outline-hidden focus:ring-1 focus:ring-teal-400 ${
                    isDark 
                      ? 'bg-slate-950 border-white/5 text-slate-100' 
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                  required
                >
                  <option value="" disabled>-- Выберите расчетный счет --</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} (баланс: {acc.balance.toFixed(0)} ₼)
                    </option>
                  ))}
                </select>
                <span className="text-[9.5px] mt-1 text-slate-400 dark:text-slate-500 block leading-tight font-sans">
                  * Накопленная сумма будет равна текущему остатку средств на этом счете. Лимит и прогресс пересчитываются на лету!
                </span>
              </div>

              {/* Submit panel buttons */}
              <div className="flex gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-white/5 justify-end">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className={`cursor-pointer px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
                    isDark
                      ? 'bg-transparent border-white/5 text-slate-400 hover:bg-white/5 hover:text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="cursor-pointer px-4  py-2 text-xs font-black rounded-xl text-slate-950 bg-teal-400 hover:bg-teal-300 shadow-md"
                >
                  {editingGoal ? 'Сохранить изменения' : 'Создать цель'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation popup dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-md cursor-pointer"
            onClick={() => setDeleteConfirm(null)}
          />
          <div 
            className={`w-full max-w-sm rounded-3xl p-5 border shadow-2xl relative transition-all duration-200 z-10 text-center ${
              isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="w-11 h-11 rounded-full bg-rose-500/15 text-rose-550 flex items-center justify-center mx-auto mb-3.5 shadow-inner">
              <Trash2 size={20} className="stroke-[2]" />
            </div>
            
            <h3 className="text-sm sm:text-base font-display font-black tracking-tight mb-1.5">
              Удалить финансовую цель?
            </h3>
            
            <p className={`text-[11px] font-semibold leading-normal font-sans mb-5 max-w-xs mx-auto ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Вы уверены, что хотите удалить финансовую цель <b className="text-rose-500 font-bold">"{deleteConfirm.name}"</b>? Это действие необратимо.
            </p>

            <div className="flex gap-2.5 justify-center">
              <button
                onClick={() => setDeleteConfirm(null)}
                className={`cursor-pointer px-4 py-2 text-xs font-bold rounded-lg border transition-all ${
                  isDark
                    ? 'bg-transparent border-white/5 text-slate-400 hover:bg-white/5 hover:text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  onDeleteGoal(deleteConfirm.id);
                  setDeleteConfirm(null);
                }}
                className="cursor-pointer px-4 py-2 text-xs font-black rounded-lg text-white bg-rose-550 hover:bg-rose-600 shadow-md"
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
