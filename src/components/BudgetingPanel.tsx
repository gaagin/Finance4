import React, { useState } from 'react';
import { Transaction, Category, BudgetLimit, formatCategoryDisplayName } from '../types';
import { IconComponent } from './IconComponent';
import { Plus, Sliders, Trash2, Edit2, AlertCircle, CheckCircle2, TrendingUp, Info, X, AlertTriangle } from 'lucide-react';

interface BudgetingPanelProps {
  transactions: Transaction[];
  categories: Category[];
  budgets: BudgetLimit[];
  onSaveBudget: (categoryId: string, amount: number) => void;
  onDeleteBudget: (categoryId: string) => void;
}

export function BudgetingPanel({
  transactions,
  categories,
  budgets,
  onSaveBudget,
  onDeleteBudget
}: BudgetingPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [limitAmount, setLimitAmount] = useState('');
  const [isEditing, setIsEditing] = useState<string | null>(null); // holds categoryId being edited

  // Budget delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{ categoryId: string; categoryName: string } | null>(null);

  // Budget calculations based on May 2026 operations (the "current" month context)
  const currentMonthTransactions = transactions.filter(t => {
    return t.date.startsWith('2026-05') && t.type === 'expense';
  });

  const getSpentForCategory = (catId: string) => {
    return currentMonthTransactions
      .filter(t => t.categoryId === catId)
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const expenseCategories = categories.filter(c => c.type === 'expense');

  // Categories that do NOT have a budget limit configured yet
  const unbudgetedCategories = expenseCategories.filter(
    cat => !budgets.some(b => b.categoryId === cat.id)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || !limitAmount || isNaN(Number(limitAmount)) || Number(limitAmount) <= 0) {
      return;
    }

    onSaveBudget(selectedCategory, Number(limitAmount));
    setSelectedCategory('');
    setLimitAmount('');
    setIsEditing(null);
  };

  const handleStartEdit = (budget: BudgetLimit) => {
    setIsEditing(budget.categoryId);
    setSelectedCategory(budget.categoryId);
    setLimitAmount(budget.limitAmount.toString());
  };

  const handleCancelEdit = () => {
    setIsEditing(null);
    setSelectedCategory('');
    setLimitAmount('');
  };

  // Aggregated statuses
  const totalBudgeted = budgets.reduce((sum, b) => sum + b.limitAmount, 0);
  const totalSpentInBudgeted = budgets.reduce((sum, b) => sum + getSpentForCategory(b.categoryId), 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="budgeting-panel-root">
      
      {/* Left Column: Set or Update Budget Forms */}
      <div className="bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10 shadow-lg h-fit">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-white/10 text-teal-300 border border-white/10 rounded-xl">
            <Sliders size={20} />
          </div>
          <h3 className="font-display font-semibold text-white">
            {isEditing ? 'Изменить лимит бюджета' : 'Установить лимит бюджета'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEditing ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Категория расходов
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full p-3 bg-slate-950/60 border border-white/10 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-400 text-slate-200 cursor-pointer"
                >
                  <option value="" className="bg-slate-950 text-slate-300">Выберите категорию...</option>
                  {unbudgetedCategories.map(cat => (
                    <option key={cat.id} value={cat.id} className="bg-slate-950 text-slate-300">
                      {formatCategoryDisplayName(cat.name)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Месячный Лимит (₼, AZN)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-display font-medium text-sm">
                    ₼
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    placeholder="Например: 250"
                    value={limitAmount}
                    onChange={(e) => setLimitAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 bg-slate-950/60 border border-white/10 rounded-xl text-sm font-display font-bold focus:outline-hidden focus:ring-2 focus:ring-teal-400 text-slate-200"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-teal-500 hover:bg-teal-400 active:bg-teal-600 text-slate-950 rounded-xl text-sm font-bold transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                >
                  Создать лимит
                </button>
              </div>
            </>
          ) : (
            <div className="p-4 py-6 border border-dashed border-teal-500/20 bg-teal-500/5 rounded-2xl text-center text-xs text-teal-300">
              Лимит бюджета редактируется в модальном окне
            </div>
          )}
        </form>

        <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-300 space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold">
            <AlertCircle size={14} className="stroke-[2.5px] text-amber-400" />
            <span>Индикатор предупреждений:</span>
          </div>
          <p>Бюджеты отслеживаются для текущего месяца (<b>Май 2026</b>).</p>
          <ul className="list-disc pl-4 space-y-1 mt-1 text-slate-300">
            <li>При тратах более <b className="text-amber-400">85%</b> шкала окрашивается в жёлтый цвет.</li>
            <li>При превышении лимита <b className="text-rose-400">(более 100%)</b> шкала окрашивается в красный со статусом перерасхода.</li>
          </ul>
        </div>
      </div>

      {/* Right 2-Columns: Budgets Progress & List */}
      <div className="lg:col-span-2 bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10 shadow-lg flex flex-col justify-between">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/5">
            <div>
              <h2 className="text-lg font-display font-bold text-white">Активные бюджетные лимиты</h2>
              <p className="text-xs text-slate-400">Свод показателей экономии по категориям за Май 2026</p>
            </div>
            
            <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
              <span className="text-xs text-slate-400">Общий бюджет:</span>
              <span className="font-display font-extrabold text-white">
                {totalSpentInBudgeted.toFixed(0)}₼ <span className="text-slate-500 font-normal">/</span> {totalBudgeted.toFixed(0)}₼
              </span>
            </div>
          </div>

          {budgets.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-white/5 text-slate-400 border border-white/10 rounded-full flex items-center justify-center mb-3">
                <Sliders size={28} />
              </div>
              <p className="text-slate-300 font-semibold text-sm">Ни один бюджетный лимит не установлен</p>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Выберите категорию расходов на панели слева и задайте месячный лимит, чтобы отслеживать перелимиты и экономию.
              </p>
            </div>
          ) : (
            <div className="space-y-6 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
              {budgets.map(b => {
                const cat = categories.find(c => c.id === b.categoryId);
                if (!cat) return null;

                const spent = getSpentForCategory(b.categoryId);
                const percent = b.limitAmount > 0 ? (spent / b.limitAmount) * 100 : 0;
                const remaining = b.limitAmount - spent;

                let progressColor = 'bg-teal-500';
                let textColor = 'text-teal-400';
                let badgeStyle = 'bg-teal-500/10 text-teal-300 border-teal-500/20';
                let statusLabel = 'В норме';

                if (percent >= 100) {
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
                  <div key={b.categoryId} className="p-4 bg-white/5 border border-white/10 rounded-2xl transition-all hover:bg-white/10">
                    <div className="flex items-center justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                          style={{ backgroundColor: cat.color }}
                        >
                          <IconComponent name={cat.icon} size={20} />
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm text-slate-200">{formatCategoryDisplayName(cat.name)}</h4>
                          <span className={`inline-flex items-center text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md border ${badgeStyle} mt-0.5`}>
                            {statusLabel}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleStartEdit(b)}
                          className="p-2 bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-white/10 rounded-xl hover:bg-teal-500 hover:text-slate-950 dark:hover:bg-teal-450 dark:hover:text-slate-950 transition-all cursor-pointer flex items-center justify-center shrink-0"
                          title="Редактировать лимит"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => {
                            const categoryName = categories.find(c => c.id === b.categoryId)?.name || 'Категория';
                            setDeleteConfirm({ categoryId: b.categoryId, categoryName });
                          }}
                          className="p-1.5 bg-white/5 hover:bg-rose-500/15 text-slate-400 hover:text-rose-400 border border-white/5 hover:border-rose-500/35 rounded-lg transition-colors cursor-pointer"
                          title="Удалить бюджетный лимит"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-xs font-display font-medium text-slate-400 mb-1.5">
                        <span>Расход: <b className="text-white">{spent.toFixed(1)} ₼</b></span>
                        <span>Лимит: <b className="text-white">{b.limitAmount.toFixed(0)} ₼</b></span>
                      </div>

                      <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden border border-white/5">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                          style={{ width: `${Math.min(percent, 100)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] mt-1.5">
                        <span className="text-slate-400">Использовано {percent.toFixed(0)}%</span>
                        {remaining >= 0 ? (
                          <span className="text-emerald-400 font-semibold">Осталось: +{remaining.toFixed(1)} ₼</span>
                        ) : (
                          <span className="text-rose-400 font-bold">Превышение: {Math.abs(remaining).toFixed(1)} ₼</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2 p-3 bg-white/5 rounded-2xl text-xs text-teal-300 border border-white/10 shrink-0">
          <Info size={14} className="shrink-0" />
          <span>Бюджетирование позволяет контролировать бесконтрольные траты. Установите разумные рамки для «Кафе и Чайхана», продуктов или шопинга!</span>
        </div>
      </div>

      {/* BUDGET EDIT MODAL */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden text-left">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-white/5">
              <div>
                <h3 className="text-base font-display font-bold text-white flex items-center gap-2">
                  <Sliders className="text-teal-400" size={18} />
                  Редактировать бюджетный лимит
                </h3>
                <p className="text-xs text-slate-400 mt-1">Корректировка месячной суммы</p>
              </div>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Категория расходов
                </label>
                <select
                  disabled
                  value={selectedCategory}
                  className="w-full p-3 bg-slate-950/40 border border-white/10 rounded-xl text-xs text-slate-400 cursor-not-allowed opacity-60"
                >
                  <option value={isEditing}>
                    {categories.find(c => c.id === isEditing)?.name || 'Текущая категория'}
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Новый Лимит (₼, AZN)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-display font-medium text-xs">
                    ₼
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    placeholder="Сумма"
                    value={limitAmount}
                    onChange={(e) => setLimitAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-950/60 border border-white/10 rounded-xl text-sm font-display font-bold focus:outline-hidden focus:ring-2 focus:ring-teal-400 text-slate-200"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-slate-350 text-xs font-semibold rounded-xl border border-white/5 transition-colors cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
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
          <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-3xl shadow-2xl p-6 text-center space-y-4 animate-scale-up" id="delete-budget-modal">
            <div className="w-12 h-12 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto">
              <Trash2 size={22} className="stroke-[2.5px]" />
            </div>
            
            <div className="space-y-1.5 animate-none">
              <h3 className="text-base font-display font-bold text-white">Удалить лимит бюджета?</h3>
              <p className="text-xs text-slate-400 leading-relaxed text-balance text-left sm:text-center">
                Вы действительно хотите удалить бюджетный лимит для категории <span className="text-white font-semibold">"{deleteConfirm.categoryName}"</span>? Статистика расходов не исчезнет, но лимит больше не будет отслеживаться.
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
                  onDeleteBudget(deleteConfirm.categoryId);
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
