import { useState, useMemo } from 'react';
import { Transaction, Category, Account, BudgetLimit } from '../types';
import { IconComponent } from './IconComponent';
import { Wallet, ArrowUpRight, ArrowDownLeft, TrendingUp, AlertTriangle, Filter, Calendar, HelpCircle, FileSpreadsheet, Download, RefreshCw, LogIn, LogOut, CheckCircle, AlertCircle } from 'lucide-react';
import { exportToGoogleSheets } from '../googleSheetsService';

interface DashboardOverviewProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  budgets: BudgetLimit[];
  onQuickNavigate: (tab: string) => void;
  currentUser: any;
  gAccessToken: string | null;
  onGoogleLogin: () => void;
  onGoogleLogout: () => void;
}

export function DashboardOverview({
  transactions,
  categories,
  accounts,
  budgets,
  onQuickNavigate,
  currentUser,
  gAccessToken,
  onGoogleLogin,
  onGoogleLogout
}: DashboardOverviewProps) {
  
  // Custom states for export status
  const [exportStatus, setExportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [exportedSpreadsheetUrl, setExportedSpreadsheetUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Dynamic Charts Filtering
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState<'may' | 'april' | 'all'>('may');
  const [analyticsAccount, setAnalyticsAccount] = useState<string>('all');

  const handleExportCSV = () => {
    // Generate simple and elegant Azerbaijani finance CSV
    let csvContent = '\uFEFF'; // Add UTF-8 BOM so Excel opens Cyrillic/Russian details correctly!
    
    // Header section: Report Metadata
    csvContent += 'ОТЧЕТ ПО ДОМАШНИМ ФИНАНСАМ (MilliFinance 🇦🇿)\n';
    csvContent += `Период: ${analyticsTimeframe === 'may' ? 'Май 2026' : analyticsTimeframe === 'april' ? 'Апрель 2026' : 'Все время'}\n`;
    csvContent += `Фильтр по счету: ${analyticsAccount === 'all' ? 'Все счета' : accounts.find(a => a.id === analyticsAccount)?.name || 'Выбранный счет'}\n`;
    csvContent += `Дата генерации: ${new Date().toLocaleString('ru-RU')}\n\n`;

    // Section 1: Sums & Totals
    csvContent += '1. ИТОГОВЫЕ СУММЫ ЗА ПЕРИОД\n';
    csvContent += `Общие доходы;${statsOverview.incomesInPeriod.toFixed(2)} AZN\n`;
    csvContent += `Общие расходы;${statsOverview.expensesInPeriod.toFixed(2)} AZN\n`;
    csvContent += `Чистые сбережения;${statsOverview.netSavings.toFixed(2)} AZN\n`;
    csvContent += `Доля сбережений;${statsOverview.savingsRate.toFixed(1)}%\n\n`;

    // Section 2: Breakdown by categories
    csvContent += '2. РАЗБИВКА РАСХОДОВ ПО КАТЕГОРИЯМ\n';
    csvContent += 'Категория;Сумма (₼);Процент (%)\n';
    categoryBreakdown.list.forEach(item => {
      csvContent += `${item.category.name};${item.amount.toFixed(2)};${item.percentage.toFixed(1)}%\n`;
    });
    csvContent += '\n';

    // Section 3: List of individual transactions
    csvContent += '3. СПИСОК ОПЕРАЦИЙ\n';
    csvContent += 'Дата;Тип;Счет;Категория;Описание;Сумма (AZN)\n';
    filteredAnalyticsTransactions.forEach(tx => {
      const cat = categories.find(c => c.id === tx.categoryId);
      const acc = accounts.find(a => a.id === tx.accountId);
      const typeStr = tx.type === 'income' ? 'Доход' : 'Расход';
      const amountSign = tx.type === 'income' ? '' : '-';
      csvContent += `${tx.date};${typeStr};"${acc?.name || 'Неизвестно'}";"${cat?.name || 'Другое'}";"${tx.description || ''}";${amountSign}${tx.amount.toFixed(2)}\n`;
    });

    // Create blobs and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `MilliFinance_Otchet_${analyticsTimeframe}_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportSheets = async () => {
    if (!gAccessToken) {
      onGoogleLogin();
      return;
    }
    setExportStatus('loading');
    setErrorMessage('');
    try {
      const sheetPeriodLabel = analyticsTimeframe === 'may' ? 'Май 2026' : analyticsTimeframe === 'april' ? 'Апрель 2026' : 'Все время';
      const spreadsheetUrl = await exportToGoogleSheets(
        gAccessToken,
        sheetPeriodLabel,
        transactions,
        categories,
        accounts
      );
      if (spreadsheetUrl) {
        setExportStatus('success');
        setExportedSpreadsheetUrl(spreadsheetUrl);
      } else {
        throw new Error('Не удалось зафиксировать уникальную ссылку на таблицу');
      }
    } catch (err: any) {
      console.error(err);
      setExportStatus('error');
      setErrorMessage(err.message || 'Ошибка экспорта. Пожалуйста, войдите в Google заново.');
    }
  };

  // Filtered transactions for the graphics engine
  const filteredAnalyticsTransactions = useMemo(() => {
    let result = [...transactions];

    // Filter by timeframe
    if (analyticsTimeframe === 'may') {
      result = result.filter(t => t.date.startsWith('2026-05'));
    } else if (analyticsTimeframe === 'april') {
      result = result.filter(t => t.date.startsWith('2026-04'));
    }

    // Filter by bank account
    if (analyticsAccount !== 'all') {
      result = result.filter(t => t.accountId === analyticsAccount);
    }

    return result;
  }, [transactions, analyticsTimeframe, analyticsAccount]);

  // General core stats (Overall - for all time)
  const statsOverview = useMemo(() => {
    let totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
    
    // Period-based stats according to active filter
    const incomesInPeriod = filteredAnalyticsTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expensesInPeriod = filteredAnalyticsTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const netSavings = incomesInPeriod - expensesInPeriod;
    const savingsRate = incomesInPeriod > 0 ? (netSavings / incomesInPeriod) * 100 : 0;

    return {
      totalBalance,
      incomesInPeriod,
      expensesInPeriod,
      netSavings,
      savingsRate
    };
  }, [accounts, filteredAnalyticsTransactions]);

  // Compute category breakdown for the Donut/Pie Chart
  const categoryBreakdown = useMemo(() => {
    const expenses = filteredAnalyticsTransactions.filter(t => t.type === 'expense');
    const totalExp = expenses.reduce((sum, t) => sum + t.amount, 0);

    const breakdownMap: { [key: string]: { category: Category; amount: number; percentage: number } } = {};

    expenses.forEach(tx => {
      const cat = categories.find(c => c.id === tx.categoryId);
      if (!cat) return;

      if (!breakdownMap[tx.categoryId]) {
        breakdownMap[tx.categoryId] = {
          category: cat,
          amount: 0,
          percentage: 0
        };
      }
      breakdownMap[tx.categoryId].amount += tx.amount;
    });

    const list = Object.values(breakdownMap);
    list.forEach(item => {
      item.percentage = totalExp > 0 ? (item.amount / totalExp) * 100 : 0;
    });

    // Sort matching highest expense
    list.sort((a, b) => b.amount - a.amount);
    return {
      list,
      total: totalExp
    };
  }, [filteredAnalyticsTransactions, categories]);

  // Compute monthly totals for the bar chart comparison (March, April, May 2026)
  const monthlyBarSummary = useMemo(() => {
    const targetMonths = [
      { key: '2026-03', label: 'Март' },
      { key: '2026-04', label: 'Апрель' },
      { key: '2026-05', label: 'Май' }
    ];

    const data = targetMonths.map(m => {
      const txs = transactions.filter(t => t.date.startsWith(m.key));
      
      // Account filter inside analytics
      const filteredTxs = analyticsAccount === 'all' 
        ? txs 
        : txs.filter(t => t.accountId === analyticsAccount);

      const income = filteredTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expense = filteredTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

      return {
        label: m.label,
        income,
        expense
      };
    });

    return data;
  }, [transactions, analyticsAccount]);

  // Determine budget warnings for active month May 2026
  const budgetWarnings = useMemo(() => {
    const warnings: Array<{ category: Category; limit: number; spent: number; percent: number }> = [];

    budgets.forEach(b => {
      const cat = categories.find(c => c.id === b.categoryId);
      if (!cat) return;

      const spent = transactions
        .filter(t => t.date.startsWith('2026-05') && t.categoryId === b.categoryId)
        .reduce((sum, t) => sum + t.amount, 0);

      const percent = (spent / b.limitAmount) * 100;
      if (percent >= 85) {
        warnings.push({
          category: cat,
          limit: b.limitAmount,
          spent,
          percent
        });
      }
    });

    return warnings;
  }, [budgets, categories, transactions]);

  // Donut chart interactive tracker
  const [hoveredDonutSlice, setHoveredDonutSlice] = useState<number | null>(null);

  // Helper calculation for SVG Donut slices
  let cumulativeAngle = 0;
  const donutRadius = 60;
  const donutStrokeWidth = 14;
  const donutCircumference = 2 * Math.PI * donutRadius;

  return (
    <div className="space-y-6" id="dashboard-overview-view">
      
      {/* 1. Main visual cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Card: Wallet Balance */}
        <div className="bg-white/10 backdrop-blur-md text-white rounded-3xl p-5 border border-white/20 flex flex-col justify-between hover:shadow-lg transition-all relative overflow-hidden glow-primary">
          <div className="absolute right-[-40px] top-[-45px] w-32 h-32 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-slate-300 font-semibold tracking-wider uppercase font-display">Общий капитал</span>
            <div className="p-2 bg-teal-400/20 text-teal-300 border border-white/10 rounded-xl">
              <Wallet size={16} />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-display font-extrabold tracking-tight text-white">
              {statsOverview.totalBalance.toFixed(2)} <span className="font-sans font-medium text-lg">₼</span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-1 leading-normal">
              Доступный баланс по всем {accounts.length} финансовым счетам
            </p>
          </div>
        </div>

        {/* Card: Period Incomes */}
        <div className="bg-white/5 backdrop-blur-md rounded-3xl p-5 border border-white/10 flex flex-col justify-between hover:border-white/25 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Обороты по доходам</span>
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <ArrowUpRight size={16} />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-display font-extrabold tracking-tight text-emerald-400">
              +{statsOverview.incomesInPeriod.toFixed(2)} <span className="font-sans font-medium text-lg">₼</span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-1 leading-normal">
              Поступления за выбранный период фильтрации
            </p>
          </div>
        </div>

        {/* Card: Period Expenses */}
        <div className="bg-white/5 backdrop-blur-md rounded-3xl p-5 border border-white/10 flex flex-col justify-between hover:border-white/25 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Зафиксировано расходов</span>
            <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl">
              <ArrowDownLeft size={16} />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-display font-extrabold tracking-tight text-rose-400">
              -{statsOverview.expensesInPeriod.toFixed(2)} <span className="font-sans font-medium text-lg">₼</span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-1 leading-normal">
              Траты за выбранный период и выбранный счет
            </p>
          </div>
        </div>

        {/* Card: Life Net Savings / Performance */}
        <div className="bg-white/5 backdrop-blur-md rounded-3xl p-5 border border-white/10 flex flex-col justify-between hover:border-white/25 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Процент сбережений</span>
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <TrendingUp size={16} />
            </div>
          </div>
          <div>
            <h3 className={`text-2xl font-display font-extrabold tracking-tight ${
              statsOverview.netSavings >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {statsOverview.netSavings >= 0 ? '+' : ''}{statsOverview.netSavings.toFixed(1)} ₼
            </h3>
            <p className="text-[10px] text-slate-400 mt-1 leading-normal flex items-center gap-1">
              <span>Сохранено</span> 
              <b className="px-1.5 py-0.2 bg-white/10 rounded text-teal-300 font-mono font-medium">
                {statsOverview.savingsRate.toFixed(0)}%
              </b>
              <span>от общего дохода</span>
            </p>
          </div>
        </div>

      </div>

      {/* 1.5. Financial Exports & Google Sheets Synchronization */}
      <div className="bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden" id="financial-exports-section">
        {/* Decorative ambient blobs */}
        <div className="absolute left-[-20px] top-[-20px] w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
        <div className="absolute right-[-20px] bottom-[-20px] w-24 h-24 bg-sky-500/5 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-center gap-4 z-10">
          <div className="p-3 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-2xl">
            <FileSpreadsheet size={24} />
          </div>
          <div>
            <h3 className="font-display font-bold text-white text-base">Экспорт финансовых отчетов (₼)</h3>
            <p className="text-xs text-slate-400">
              Выгружайте транзакции, разбивки категорий и балансы в таблицы CSV или Google Sheets в 1 клик!
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 z-10 w-full md:w-auto justify-end">
          {/* CSV Download Button */}
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-white/10 hover:border-white/20 text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer uppercase tracking-wider font-display col-span-1"
          >
            <Download size={14} />
            Экспорт в CSV
          </button>

          {/* Google Auth Status / Actions */}
          {!currentUser ? (
            <button
              onClick={onGoogleLogin}
              className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer uppercase tracking-wider font-display"
            >
              <LogIn size={14} />
              Google Sheets Экспорт
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-slate-200">{currentUser.displayName}</p>
                <p className="text-[10px] text-teal-305">Google Линк Активен</p>
              </div>

              <button
                onClick={handleExportSheets}
                disabled={exportStatus === 'loading'}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer uppercase tracking-wider font-display disabled:opacity-50"
              >
                {exportStatus === 'loading' ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <FileSpreadsheet size={14} />
                )}
                Обновить Google Таблицу
              </button>

              <button
                onClick={onGoogleLogout}
                className="p-2.5 bg-white/5 hover:bg-white/10 text-slate-450 hover:text-white rounded-xl border border-white/10 transition-colors cursor-pointer"
                title="Выйти из Google"
              >
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Floating overlays for operation feedback states */}
        {exportStatus === 'loading' && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center gap-3 z-30 animate-fade-in">
            <RefreshCw size={20} className="text-teal-450 animate-spin" />
            <span className="text-xs font-bold text-slate-200">Синхронизируем финансовые данные с Google Таблицами...</span>
          </div>
        )}

        {exportStatus === 'success' && exportedSpreadsheetUrl && (
          <div className="absolute inset-0 bg-teal-950/95 border border-teal-500/30 rounded-3xl p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 z-40 animate-fade-in">
            <div className="flex items-center gap-3">
              <CheckCircle size={22} className="text-teal-400 shrink-0" />
              <div>
                <b className="text-xs text-teal-200 uppercase tracking-wider">Отчет Google-Sheets Готов!</b>
                <p className="text-[11px] text-teal-300">Таблица содержит итоговые обороты по Азербайджану, балансы счетов и список транзакций.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={exportedSpreadsheetUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md inline-block text-center"
              >
                Открыть таблицу в Google
              </a>
              <button
                onClick={() => setExportStatus('idle')}
                className="px-3 py-2 bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Закрыть
              </button>
            </div>
          </div>
        )}

        {exportStatus === 'error' && (
          <div className="absolute inset-0 bg-rose-950/95 border border-rose-500/30 rounded-3xl p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 z-40 animate-fade-in">
            <div className="flex items-center gap-3">
              <AlertCircle size={22} className="text-rose-450 shrink-0" />
              <div>
                <b className="text-xs text-rose-200 uppercase tracking-wider">Ошибка синхронизации Google Sheets</b>
                <p className="text-[11px] text-rose-300">{errorMessage}</p>
              </div>
            </div>
            <button
              onClick={() => setExportStatus('idle')}
              className="px-4 py-2 bg-white/15 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Вернуться
            </button>
          </div>
        )}
      </div>

      {/* 2. Budget Threshold Warnings Section (only shown if warning triggers exist) */}
      {budgetWarnings.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <AlertTriangle size={18} className="stroke-[2.5px]" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-amber-300 uppercase tracking-wide">Внимание! Лимиты бюджетирования близки к исчерпанию</h4>
              <p className="text-xs text-amber-200">
                Обнаружено {budgetWarnings.length} категорий расходов за Май 2026, превысивших порог безопасной экономии (85%+):
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {budgetWarnings.map(w => (
              <span key={w.category.id} className="text-[10px] bg-amber-950/40 border border-amber-500/35 font-semibold text-amber-300 px-2.5 py-1 rounded-lg">
                {w.category.name}: {w.spent.toFixed(0)} / {w.limit.toFixed(0)} ₼ ({w.percent.toFixed(0)}%)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 3. Analytics filter controls and charts rendering */}
      <div className="bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10 shadow-lg">
        
        {/* Dynamic Analytics Configuration panel */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-white/5 mb-6">
          <div>
            <h3 className="text-lg font-display font-bold text-white">Аналитика и графики</h3>
            <p className="text-xs text-slate-400">Свободные настройки фильтров для визуализации распределения капитала</p>
          </div>

          {/* Interactive filter controls directly manipulating active charts */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center bg-white/5 border border-white/10 p-1 rounded-xl">
              <button
                onClick={() => setAnalyticsTimeframe('may')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  analyticsTimeframe === 'may' ? 'bg-teal-500 text-slate-950 font-bold shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Май '26
              </button>
              <button
                onClick={() => setAnalyticsTimeframe('april')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  analyticsTimeframe === 'april' ? 'bg-teal-500 text-slate-950 font-bold shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Апр '26
              </button>
              <button
                onClick={() => setAnalyticsTimeframe('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  analyticsTimeframe === 'all' ? 'bg-teal-500 text-slate-950 font-bold shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Всё время
              </button>
            </div>

            <select
              value={analyticsAccount}
              onChange={(e) => setAnalyticsAccount(e.target.value)}
              className="px-3 py-1.5 bg-slate-900 border border-white/10 rounded-xl text-xs text-white focus:outline-hidden focus:ring-1 focus:ring-teal-400 cursor-pointer"
            >
              <option value="all">По всем счетам</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>Счет: {acc.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Charts Grid: Bar chart + Donut chart side-by-side */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          
          {/* Chart 1: Monthly comparison bar chart */}
          <div className="border border-white/5 rounded-2xl p-4 bg-white/5" id="monthly-bar-chart-card">
            <div className="mb-4">
              <h4 className="font-semibold text-sm text-teal-300 leading-tight">Сравнение доходов и расходов по месяцам</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Временной тренд: Март, Апрель и Май 2026 года в AZN</p>
            </div>

            {/* SVG custom bar graph */}
            <div className="relative w-full h-[220px] flex items-end justify-between px-2 pt-8">
              
              {/* Backing Y-axis gridlines inside SVG chart */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-5 text-[10px] font-mono text-slate-500">
                <div className="border-b border-dashed border-white/10 w-full pt-1"><span>3000 AZN</span></div>
                <div className="border-b border-dashed border-white/10 w-full pt-1"><span>1500 AZN</span></div>
                <div className="border-b border-dashed border-white/5 w-full pt-1"><span>750 AZN</span></div>
                <div className="w-full"><span>0 AZN</span></div>
              </div>

              {/* Graphical Bars Columns */}
              <div className="w-full h-full flex justify-around items-end z-10 pb-5">
                {monthlyBarSummary.map((bar, idx) => {
                  
                  // Compute dynamic Heights relative to a maximum value of 3000 max манат
                  const maxChartAmount = 3000;
                  const incHeight = Math.min((bar.income / maxChartAmount) * 100, 100);
                  const expHeight = Math.min((bar.expense / maxChartAmount) * 100, 100);

                  return (
                    <div key={idx} className="flex flex-col items-center justify-end h-full w-20 group relative">
                      
                      {/* Live hover information tooltip */}
                      <div className="absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white rounded-lg p-2 text-[10px] shadow-lg pointer-events-none z-50 flex flex-col gap-1 min-w-[100px] text-center border border-white/10">
                        <span className="font-bold border-b border-white/5 pb-0.5">{bar.label}</span>
                        <span className="text-emerald-400 font-mono">Доход: {bar.income.toFixed(0)}₼</span>
                        <span className="text-rose-400 font-mono">Расход: {bar.expense.toFixed(0)}₼</span>
                      </div>

                      {/* Side by side dual bars container */}
                      <div className="flex gap-2 items-end w-full justify-center h-full">
                        {/* Income Bar column */}
                        <div 
                          style={{ height: `${incHeight}%` }} 
                          className="w-4 bg-emerald-500 rounded-t-lg transition-all duration-700 hover:scale-x-115 cursor-pointer hover:bg-emerald-400 shadow-xs" 
                        />
                        {/* Expense Bar column */}
                        <div 
                          style={{ height: `${expHeight}%` }} 
                          className="w-4 bg-rose-500 rounded-t-lg transition-all duration-700 hover:scale-x-115 cursor-pointer hover:bg-rose-400 shadow-xs" 
                        />
                      </div>

                      <span className="mt-2 text-xs font-semibold text-slate-300">{bar.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend guide flags */}
            <div className="flex items-center gap-4 justify-center mt-3 text-xs">
              <div className="flex items-center gap-1.5 font-medium text-slate-300">
                <span className="w-3 h-3 bg-emerald-500 rounded-full" />
                <span>Доходы (Оборот)</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium text-slate-300">
                <span className="w-3 h-3 bg-rose-500 rounded-full" />
                <span>Расходы (Фиксация)</span>
              </div>
            </div>
          </div>

          {/* Chart 2: Category breakdown donut chart */}
          <div className="border border-white/5 rounded-2xl p-4 bg-white/5 flex flex-col justify-between" id="category-distribution-card">
            <div>
              <h4 className="font-semibold text-sm text-teal-300 leading-tight">Структура расходов по категориям</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Долевой процент за выбранные фильтры: {analyticsTimeframe === 'may' ? 'Май 2026' : analyticsTimeframe === 'april' ? 'Апрель 2026' : 'Весь период'}</p>
            </div>

            {categoryBreakdown.list.length === 0 ? (
              <div className="text-center py-10 flex flex-col items-center justify-center flex-1">
                <HelpCircle className="text-slate-500 mb-2" size={32} />
                <p className="text-slate-300 font-semibold text-xs">Нет данных о расходах</p>
                <p className="text-[10px] text-slate-400 max-w-xs mt-1">За выбранные даты и на выбранном счете расходы не зафиксированы.</p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-4 flex-1">
                
                {/* SVG Ring Donut */}
                <div className="relative w-44 h-44 flex items-center justify-center shrink-0">
                  <svg width="100%" height="100%" viewBox="0 0 160 160" className="transform -rotate-90">
                    {categoryBreakdown.list.map((item, idx) => {
                      const slicePercentage = item.percentage;
                      const strokeDash = (slicePercentage / 100) * donutCircumference;
                      const strokeOffset = donutCircumference - (cumulativeAngle / 100) * donutCircumference;
                      cumulativeAngle += slicePercentage;

                      // Flag state for cursor hover highlight
                      const isHovered = hoveredDonutSlice === idx;

                      return (
                        <circle
                           key={item.category.id}
                           cx="80"
                           cy="80"
                           r={donutRadius}
                           fill="transparent"
                           stroke={item.category.color}
                           strokeWidth={isHovered ? donutStrokeWidth + 4 : donutStrokeWidth}
                           strokeDasharray={`${strokeDash} ${donutCircumference}`}
                           strokeDashoffset={strokeOffset}
                           strokeLinecap={slicePercentage > 3 ? "round" : "butt"}
                           onMouseEnter={() => setHoveredDonutSlice(idx)}
                           onMouseLeave={() => setHoveredDonutSlice(null)}
                           className="transition-all duration-300 cursor-pointer"
                        />
                      );
                    })}
                  </svg>

                  {/* High contrast internal focal labels */}
                  <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none select-none px-4">
                    {hoveredDonutSlice !== null && categoryBreakdown.list[hoveredDonutSlice] ? (
                      <>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider truncate max-w-[110px]">
                           {categoryBreakdown.list[hoveredDonutSlice].category.name}
                        </span>
                        <span className="text-sm font-display font-black text-white leading-none mt-0.5">
                          {categoryBreakdown.list[hoveredDonutSlice].amount.toFixed(0)} ₼
                        </span>
                        <span className="text-[9px] text-teal-300 font-extrabold mt-0.5">
                          {categoryBreakdown.list[hoveredDonutSlice].percentage.toFixed(1)}%
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Всего трат</span>
                        <span className="text-base font-display font-black text-white leading-tight">
                          {categoryBreakdown.total.toFixed(1)} ₼
                        </span>
                        <span className="text-[9px] text-slate-400 leading-none mt-1">Наведите на сектор</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Legend list showing percentages */}
                <div className="flex-1 space-y-1.5 w-full overflow-y-auto max-h-[160px] pr-1 custom-scrollbar">
                  {categoryBreakdown.list.map((item, idx) => (
                    <div 
                      key={item.category.id} 
                      className={`flex items-center justify-between p-1.5 rounded-lg transition-all text-xs ${
                        hoveredDonutSlice === idx ? 'bg-white/10' : ''
                      }`}
                      onMouseEnter={() => setHoveredDonutSlice(idx)}
                      onMouseLeave={() => setHoveredDonutSlice(null)}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span 
                          className="w-3 h-3 rounded-full shrink-0" 
                          style={{ backgroundColor: item.category.color }}
                        />
                        <span className="font-semibold text-slate-200 truncate">{item.category.name}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-white">{item.amount.toFixed(0)} ₼</span>
                        <span className="text-[10px] text-slate-400 ml-1.5 font-bold font-mono">({item.percentage.toFixed(0)}%)</span>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
