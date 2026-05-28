import React, { useState, useMemo, useRef } from 'react';
import { Transaction, Category, Account, BudgetLimit, formatCategoryDisplayName } from '../types';
import { IconComponent } from './IconComponent';
import { Wallet, ArrowUpRight, ArrowDownLeft, TrendingUp, AlertTriangle, Filter, Calendar, HelpCircle, FileSpreadsheet, Download, RefreshCw, LogIn, LogOut, CheckCircle, AlertCircle, ArrowUpDown, SlidersHorizontal } from 'lucide-react';
import { exportToGoogleSheets } from '../googleSheetsService';
import { QuickDragDropBuilder } from './QuickDragDropBuilder';

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
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
  onAddTransfer: (transfer: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    description: string;
    date: string;
  }) => void;
  addToast: (message: string, type: 'warning' | 'critical' | 'success') => void;
  showMode?: 'quick-records' | 'analytics' | 'all';
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
  onGoogleLogout,
  onAddTransaction,
  onAddTransfer,
  addToast,
  showMode = 'all'
}: DashboardOverviewProps) {
  
  // Custom states for export status
  const [exportStatus, setExportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [exportedSpreadsheetUrl, setExportedSpreadsheetUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Dynamic Charts Filtering
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState<'may' | 'april' | '2026' | '2025' | '2024' | '2023' | '2022' | 'all'>('all');
  const [analyticsAccount, setAnalyticsAccount] = useState<string>('all');

  // Local discrete filters for each individual chart card
  const [lineTimeframe, setLineTimeframe] = useState<'may' | 'april' | '2026' | '2025' | '2024' | '2023' | '2022' | 'all'>('all');
  const [lineAccount, setLineAccount] = useState<string>('all');
  const [lineType, setLineType] = useState<'all' | 'expense' | 'income'>('all');

  const [barAccount, setBarAccount] = useState<string>('all');
  const [barCategory, setBarCategory] = useState<string>('all');
  const [barYear, setBarYear] = useState<'all' | '2026' | '2025' | '2024' | '2023' | '2022'>('all');

  const [donutAccount, setDonutAccount] = useState<string>('all');
  const [donutTimeframe, setDonutTimeframe] = useState<'may' | 'april' | '2026' | '2025' | '2024' | '2023' | '2022' | 'all'>('all');
  const [donutType, setDonutType] = useState<'expense' | 'income'>('expense');

  // Interactive UI states mirroring HoneyMoney Web Dashboard
  const [activeDashboardTab, setActiveDashboardTab] = useState<'fact' | 'plan'>('fact');
  const [isOrdinaryGroupExpanded, setIsOrdinaryGroupExpanded] = useState(true);
  const [isSavingsGroupExpanded, setIsSavingsGroupExpanded] = useState(true);
  const [showSubcategories, setShowSubcategories] = useState(false);

  // Render a beautifully styled representation of the distribution weight (formerly grid Treemap)
  const renderTreemap = (items: any[], type: 'income' | 'expense') => {
    if (!items || items.length === 0) return null;
    
    // Select top items for representation
    const sorted = [...items].sort((a,b) => b.amount - a.amount).slice(0, 6);
    const borderColor = type === 'expense' ? 'border-rose-500/10' : 'border-emerald-500/10';
    const bgColor = type === 'expense' ? 'bg-rose-500/5' : 'bg-emerald-500/5';
    const fillBarColor = type === 'expense' ? 'bg-rose-500/10' : 'bg-emerald-500/10';
    const textColor = type === 'expense' ? 'text-rose-400' : 'text-emerald-400';
    
    // Find maximum amount in these top items to scale the bars relative to the winner
    const maxAmount = sorted[0]?.amount || 1;
    
    return (
      <div className="flex flex-col gap-2 w-full mt-3 animate-fade-in pb-1 select-none">
        {sorted.map((item, idx) => {
          const relativePercentage = (item.amount / maxAmount) * 100;
          return (
            <div 
              key={idx} 
              className={`relative border ${borderColor} ${bgColor} p-3 rounded-xl transition-all hover:scale-[1.01] shadow-xs cursor-pointer overflow-hidden flex items-center justify-between min-h-[46px]`}
            >
              {/* Proportional visual background bar */}
              <div 
                className={`absolute left-0 top-0 bottom-0 ${fillBarColor} transition-all duration-500 rounded-l-xl`}
                style={{ width: `${relativePercentage}%` }}
              />
              
              <div className="relative flex items-center justify-between w-full min-w-0 z-10 gap-4">
                <span className="text-xs font-bold text-slate-205 tracking-wide truncate flex items-center gap-2">
                  <span className="text-slate-450 font-medium">#{idx + 1}</span>
                  <span>{formatCategoryDisplayName(item.category.name)}</span>
                </span>
                <span className={`text-xs font-mono font-black ${textColor} shrink-0`}>
                  {type === 'expense' ? '-' : '+'}{Math.round(item.amount).toLocaleString('ru-RU')} ₼
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const getPeriodLabel = (tf: string) => {
    switch (tf) {
      case 'may': return 'Май 2026';
      case 'april': return 'Апрель 2026';
      case '2026': return '2026 год';
      case '2025': return '2025 год';
      case '2024': return '2024 год';
      case '2023': return '2023 год';
      case '2022': return '2022 год';
      default: return 'Всё время (С 2022)';
    }
  };

  const handleExportCSV = () => {
    // Generate simple and elegant Azerbaijani finance CSV
    let csvContent = '\uFEFF'; // Add UTF-8 BOM so Excel opens Cyrillic/Russian details correctly!
    
    // Header section: Report Metadata
    csvContent += 'ОТЧЕТ ПО ДОМАШНИМ ФИНАНСАМ (MilliFinance 🇦🇿)\n';
    csvContent += `Период: ${getPeriodLabel(analyticsTimeframe)}\n`;
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
      const typeStr = tx.type === 'transfer' ? 'Перевод' : (tx.type === 'income' ? 'Доход' : 'Расход');
      const amountSign = tx.type === 'income' || (tx.type === 'transfer' && tx.transferType === 'in') ? '' : '-';
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
    } else if (['2026', '2025', '2024', '2023', '2022'].includes(analyticsTimeframe)) {
      result = result.filter(t => t.date.startsWith(analyticsTimeframe));
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

  // Compute income category breakdown for the Treemap/List
  const incomeCategoryBreakdown = useMemo(() => {
    const incomes = filteredAnalyticsTransactions.filter(t => t.type === 'income');
    const totalInc = incomes.reduce((sum, t) => sum + t.amount, 0);

    const breakdownMap: { [key: string]: { category: Category; amount: number; percentage: number } } = {};

    incomes.forEach(tx => {
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
      item.percentage = totalInc > 0 ? (item.amount / totalInc) * 100 : 0;
    });

    // Sort matching highest income
    list.sort((a, b) => b.amount - a.amount);
    return {
      list,
      total: totalInc
    };
  }, [filteredAnalyticsTransactions, categories]);

  // Compute monthly totals for the bar chart comparison (supported by localized filters)
  const monthlyBarSummary = useMemo(() => {
    let targetMonths: Array<{ key: string; label: string }> = [];

    if (barYear === 'all') {
      // Show yearly comparison
      targetMonths = [
        { key: '2022', label: '2022' },
        { key: '2023', label: '2023' },
        { key: '2024', label: '2024' },
        { key: '2025', label: '2025' },
        { key: '2026', label: '2026' }
      ];
    } else {
      // For a year, show monthly comparison of that year
      const y = barYear;
      targetMonths = [
        { key: `${y}-01`, label: 'Янв' },
        { key: `${y}-02`, label: 'Фев' },
        { key: `${y}-03`, label: 'Мар' },
        { key: `${y}-04`, label: 'Апр' },
        { key: `${y}-05`, label: 'Май' },
        { key: `${y}-06`, label: 'Июн' },
        { key: `${y}-07`, label: 'Июл' },
        { key: `${y}-08`, label: 'Авг' },
        { key: `${y}-09`, label: 'Сен' },
        { key: `${y}-10`, label: 'Окт' },
        { key: `${y}-11`, label: 'Ноя' },
        { key: `${y}-12`, label: 'Дек' }
      ];
    }

    const data = targetMonths.map(m => {
      const txs = transactions.filter(t => t.date.startsWith(m.key));
      
      let filteredTxs = barAccount === 'all' 
        ? txs 
        : txs.filter(t => t.accountId === barAccount);

      if (barCategory !== 'all') {
        filteredTxs = filteredTxs.filter(t => t.categoryId === barCategory);
      }

      const income = filteredTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expense = filteredTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

      return {
        label: m.label,
        income,
        expense
      };
    });

    return data;
  }, [transactions, barAccount, barCategory, barYear]);

  // Compute a dedicated, highly customizable category breakdown for the Donut Chart
  const donutCategoryBreakdown = useMemo(() => {
    let result = [...transactions];

    // Filter by timeframe
    if (donutTimeframe === 'may') {
      result = result.filter(t => t.date.startsWith('2026-05'));
    } else if (donutTimeframe === 'april') {
      result = result.filter(t => t.date.startsWith('2026-04'));
    } else if (['2026', '2025', '2024', '2023', '2022'].includes(donutTimeframe)) {
      result = result.filter(t => t.date.startsWith(donutTimeframe));
    }

    // Filter by bank account
    if (donutAccount !== 'all') {
      result = result.filter(t => t.accountId === donutAccount);
    }

    const typedTxs = result.filter(t => t.type === donutType);
    const totalVal = typedTxs.reduce((sum, t) => sum + t.amount, 0);

    const breakdownMap: { [key: string]: { category: Category; amount: number; percentage: number } } = {};

    typedTxs.forEach(tx => {
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
      item.percentage = totalVal > 0 ? (item.amount / totalVal) * 100 : 0;
    });

    list.sort((a, b) => b.amount - a.amount);
    return {
      list,
      total: totalVal
    };
  }, [transactions, categories, donutTimeframe, donutAccount, donutType]);

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

  // Total money trend chart interactive states
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; date: string; balance: number } | null>(null);
  const [selectedTrendDate, setSelectedTrendDate] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Helper function to format Date strings to Russian display format
  const formatRussianDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length !== 3) return dateStr;
      const year = parseInt(parts[0], 10);
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const dateObj = new Date(year, monthIndex, day);
      return dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  // 1. All-time sorted unique dates of transactions to find bounds of history and build backward balances
  const allTimeBalancesLine = useMemo(() => {
    if (transactions.length === 0) {
      const todayStr = '2026-05-24';
      const bal = lineAccount === 'all'
        ? accounts.reduce((sum, a) => sum + a.balance, 0)
        : accounts.find(a => a.id === lineAccount)?.balance || 0;
      return [{ date: todayStr, balance: bal }];
    }

    const uniqueDates = Array.from(new Set(transactions.map(t => t.date))).sort();
    const minDate = uniqueDates[0];
    const maxDate = '2026-05-24'; // System baseline locked on May 24, 2026

    // Generate all dates from min to max
    const allDates: string[] = [];
    let current = new Date(minDate);
    const end = new Date(maxDate);
    let limit = 0;
    while (current <= end && limit < 5000) {
      allDates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
      limit++;
    }

    // Current total balance for accounts
    let finalBalance = 0;
    if (lineAccount === 'all') {
      finalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
    } else {
      finalBalance = accounts.find(a => a.id === lineAccount)?.balance || 0;
    }

    // Group transactions by date
    const txByDate: { [date: string]: Transaction[] } = {};
    transactions.forEach(t => {
      if (!txByDate[t.date]) txByDate[t.date] = [];
      txByDate[t.date].push(t);
    });

    // Walk backward in time
    const dailyBalances: { date: string; balance: number }[] = [];
    let runningBalance = finalBalance;

    for (let i = allDates.length - 1; i >= 0; i--) {
      const d = allDates[i];
      dailyBalances.unshift({ date: d, balance: runningBalance });

      const dayTxs = txByDate[d] || [];
      const filteredDayTxs = lineAccount === 'all'
        ? dayTxs
        : dayTxs.filter(t => t.accountId === lineAccount);

      let netChange = 0;
      filteredDayTxs.forEach(t => {
        // Option to display only incomes / only expenses
        if (lineType === 'expense' && t.type !== 'expense') return;
        if (lineType === 'income' && t.type !== 'income') return;

        if (t.type === 'income') {
          netChange += t.amount;
        } else if (t.type === 'expense') {
          netChange -= t.amount;
        } else if (t.type === 'transfer') {
          if (t.transferType === 'in') {
            netChange += t.amount;
          } else {
            netChange -= t.amount;
          }
        }
      });

      runningBalance -= netChange;
    }

    return dailyBalances;
  }, [transactions, accounts, lineAccount, lineType]);

  // 2. Filter computed trend to selected timeframe
  const balanceTrendData = useMemo(() => {
    if (lineTimeframe === 'all') {
      return allTimeBalancesLine;
    }

    if (['2022', '2023', '2024', '2025', '2026'].includes(lineTimeframe)) {
      return allTimeBalancesLine.filter(item => item.date.startsWith(lineTimeframe));
    }

    let startCompare = '2026-05-01';
    let endCompare = '2026-05-24';
    if (lineTimeframe === 'april') {
      startCompare = '2026-04-01';
      endCompare = '2026-04-30';
    }

    return allTimeBalancesLine.filter(item => item.date >= startCompare && item.date <= endCompare);
  }, [allTimeBalancesLine, lineTimeframe]);

  // SVG Coordinates calculations
  const trendSvgWidth = 800;
  const trendSvgHeight = 310;
  const trendPaddingLeft = 110;
  const trendPaddingRight = 20;
  const trendPaddingTop = 10;
  const trendPaddingBottom = 35;
  const trendChartWidth = trendSvgWidth - trendPaddingLeft - trendPaddingRight;
  const trendChartHeight = trendSvgHeight - trendPaddingTop - trendPaddingBottom;

  const trendStats = useMemo(() => {
    if (balanceTrendData.length === 0) return { min: 0, max: 100, points: [], linePath: '', areaPath: '', zeroPercent: 50, yZero: 100 };

    const balancesList = balanceTrendData.map(d => d.balance);
    let max = Math.max(...balancesList, 100);
    let min = Math.min(...balancesList, 0);

    // Give some vertical breathing space in chart
    const range = max - min;
    const paddingVal = range * 0.04 || 15;
    let graphMax = max + paddingVal;
    let graphMin = min - paddingVal;

    // Let's round graphMax and graphMin to nice multiple steps so they produce neat rounded values like 10k, 5k, 0, -5k
    const step = range > 15000 ? 5000 : (range > 3000 ? 1000 : 500);
    graphMax = Math.ceil(graphMax / step) * step;
    graphMin = Math.floor(graphMin / step) * step;
    const graphRange = graphMax - graphMin;

    const zeroPercent = Math.max(0, Math.min(100, ((graphMax - 0) / graphRange) * 100));
    
    // Map data points into SVG space
    const points = balanceTrendData.map((d, index) => {
      const x = trendPaddingLeft + (balanceTrendData.length > 1 ? (index / (balanceTrendData.length - 1)) : 0.5) * trendChartWidth;
      const y = trendPaddingTop + trendChartHeight - ((d.balance - graphMin) / graphRange) * trendChartHeight;
      return { x, y, date: d.date, balance: d.balance };
    });

    // Zero-line Y coordinate calculation
    const yZero = trendPaddingTop + trendChartHeight - ((0 - graphMin) / graphRange) * trendChartHeight;

    // Build SVG paths
    let linePath = '';
    let areaPath = '';

    if (points.length > 0) {
      linePath = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        linePath += ` L ${points[i].x} ${points[i].y}`;
      }

      const clampedYZero = Math.max(trendPaddingTop, Math.min(trendPaddingTop + trendChartHeight, yZero));
      areaPath = `M ${points[0].x} ${clampedYZero} L ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        areaPath += ` L ${points[i].x} ${points[i].y}`;
      }
      areaPath += ` L ${points[points.length - 1].x} ${clampedYZero} Z`;
    }

    return {
      min: graphMin,
      max: graphMax,
      points,
      linePath,
      areaPath,
      zeroPercent,
      yZero
    };
  }, [balanceTrendData, trendChartWidth, trendChartHeight, trendPaddingLeft, trendPaddingTop]);

  // Compute distinct years present in the selected timeframe data to align vertical year gridlines
  const distinctYears = useMemo(() => {
    const yearsMap: { [year: string]: number } = {};
    if (!trendStats || !trendStats.points) return [];
    trendStats.points.forEach((pt) => {
      const yr = pt.date.substring(0, 4);
      if (!yearsMap[yr]) {
        yearsMap[yr] = pt.x;
      }
    });
    return Object.entries(yearsMap).map(([year, x]) => ({ year, x }));
  }, [trendStats.points]);

  const handleTrendMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!svgRef.current || trendStats.points.length === 0) return;
    try {
      const rect = svgRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      
      const svgWidth = rect.width;
      const scaleX = trendSvgWidth / svgWidth;
      const targetX = mouseX * scaleX;

      const relativeX = (targetX - trendPaddingLeft) / trendChartWidth;
      const index = Math.round(relativeX * (trendStats.points.length - 1));
      const clampedIndex = Math.max(0, Math.min(trendStats.points.length - 1, index));
      
      setHoveredPoint(trendStats.points[clampedIndex]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleTrendMouseLeave = () => {
    setHoveredPoint(null);
  };

  // Filter transactions for clicked trend day
  const clickedDateTransactions = useMemo(() => {
    if (!selectedTrendDate) return [];
    return transactions.filter(t => t.date === selectedTrendDate && (lineAccount === 'all' || t.accountId === lineAccount));
  }, [selectedTrendDate, transactions, lineAccount]);

  // Helper calculations for displaying start/end balance summaries on top of trend chart
  const trendPointsCount = trendStats.points.length;
  const hasTrendPoints = trendPointsCount > 0;
  const firstPoint = hasTrendPoints ? trendStats.points[0] : null;
  const lastPoint = hasTrendPoints ? trendStats.points[trendPointsCount - 1] : null;
  const startBalance = firstPoint ? firstPoint.balance : 0;
  const endBalance = lastPoint ? lastPoint.balance : 0;
  const percentChange = startBalance !== 0 
    ? ((endBalance - startBalance) / Math.abs(startBalance)) * 100 
    : 0;
  const changePrefix = percentChange >= 0 ? '+' : '';

  // Helper calculation for SVG Donut slices
  let cumulativeAngle = 0;
  const donutRadius = 60;
  const donutStrokeWidth = 14;
  const donutCircumference = 2 * Math.PI * donutRadius;

  if (showMode === 'quick-records') {
    return (
      <div className="space-y-6" id="dashboard-overview-view-quick">
        {/* --- QUICK INTERACTIVE GESTURE TRANSACTION BUILDER --- */}
        <QuickDragDropBuilder
          accounts={accounts}
          categories={categories}
          onAddTransaction={onAddTransaction}
          onAddTransfer={onAddTransfer}
          addToast={addToast}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6" id="dashboard-overview-view">
      
      {showMode === 'all' && (
        /* --- QUICK INTERACTIVE GESTURE TRANSACTION BUILDER --- */
        <QuickDragDropBuilder
          accounts={accounts}
          categories={categories}
          onAddTransaction={onAddTransaction}
          onAddTransfer={onAddTransfer}
          addToast={addToast}
        />
      )}



      {/* 3. Analytics filter controls and charts rendering */}
      <div className="w-full space-y-6">
        
        {/* Dynamic Analytics Configuration panel */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-white/5 mb-6">
          <div>
            <h3 className="text-lg font-display font-bold text-white">Аналитика и графики</h3>
            <p className="text-xs text-slate-400">Свободные настройки фильтров для визуализации распределения капитала</p>
          </div>

          {/* Interactive filter controls directly manipulating active charts */}
          <div className="flex flex-wrap gap-3">
            <select
              value={analyticsTimeframe}
              onChange={(e) => setAnalyticsTimeframe(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-900 border border-white/10 rounded-xl text-xs text-white focus:outline-hidden focus:ring-1 focus:ring-teal-400 cursor-pointer font-semibold"
            >
              <option value="all">За всё время (С 2022)</option>
              <option value="may">Май 2026 (Текущий)</option>
              <option value="april">Апрель 2026</option>
              <option value="2026">Весь 2026 год</option>
              <option value="2025">2025 год</option>
              <option value="2024">2024 год</option>
              <option value="2023">2023 год</option>
              <option value="2022">2022 год</option>
            </select>

            <select
              value={analyticsAccount}
              onChange={(e) => setAnalyticsAccount(e.target.value)}
              className="px-3 py-1.5 bg-slate-900 border border-white/10 rounded-xl text-xs text-white focus:outline-hidden focus:ring-1 focus:ring-teal-400 cursor-pointer font-semibold"
            >
              <option value="all">По всем счетам</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>Счет: {acc.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Real-time Dynamic Wallet Balance Trend Card (Total Money Over Time) */}
        <div className="border border-white/5 rounded-2xl p-5 bg-white/5 mb-8 relative group" id="total-assets-trend-card">
          
          {/* Header metadata showing start and end balances like the high-fidelity screenshot */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
              <div>
                <h4 className="font-semibold text-sm text-teal-300 leading-tight">Баланс и активы с течением времени</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Динамический график общего капитала с учетом совершенных транзакций</p>
              </div>

              {/* Local chart filters */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2 sm:mt-0">
                <select
                  value={lineTimeframe}
                  onChange={(e) => setLineTimeframe(e.target.value as any)}
                  className="px-2 py-1 bg-slate-900 border border-white/10 rounded-lg text-[10px] text-white focus:outline-hidden cursor-pointer font-bold uppercase tracking-wider"
                >
                  <option value="all">Период: Все время</option>
                  <option value="may">Май 2026</option>
                  <option value="april">Апрель 2026</option>
                  <option value="2026">2026 год</option>
                  <option value="2025">2025 год</option>
                  <option value="2024">2024 год</option>
                  <option value="2023">2023 год</option>
                  <option value="2022">2022 год</option>
                </select>

                <select
                  value={lineAccount}
                  onChange={(e) => setLineAccount(e.target.value)}
                  className="px-2 py-1 bg-slate-900 border border-white/10 rounded-lg text-[10px] text-white focus:outline-hidden cursor-pointer font-bold uppercase tracking-wider"
                >
                  <option value="all">Счет: Все счета</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>

                <select
                  value={lineType}
                  onChange={(e) => setLineType(e.target.value as any)}
                  className="px-2 py-1 bg-slate-900 border border-white/10 rounded-lg text-[10px] text-white focus:outline-hidden cursor-pointer font-bold uppercase tracking-wider"
                >
                  <option value="all">Операции: Все</option>
                  <option value="expense">Только Расходы</option>
                  <option value="income">Только Доходы</option>
                </select>
              </div>
            </div>
            
            {hasTrendPoints && firstPoint && lastPoint && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-100 font-display font-bold text-xl sm:text-3xl px-1.5 mb-3">
                <span className="opacity-90">{formatRussianDate(firstPoint.date).replace(' г.', '')}</span>
                <span className="opacity-30 font-normal select-none">—</span>
                <span className="opacity-90">{formatRussianDate(lastPoint.date).replace(' г.', '')}</span>
              </div>
            )}
          </div>

          <div className="relative w-full h-[220px] sm:h-[300px]" id="trend-svg-container">
            {/* SVG Area Chart */}
            <svg
              ref={svgRef}
              viewBox={`0 0 ${trendSvgWidth} ${trendSvgHeight}`}
              className="w-full h-full select-none"
              onMouseMove={handleTrendMouseMove}
              onMouseLeave={handleTrendMouseLeave}
              onClick={() => {
                if (hoveredPoint) {
                  setSelectedTrendDate(hoveredPoint.date);
                }
              }}
            >
              <defs>
                {/* Responsive dynamic bi-directional gradient: green/teal above zero, red/rose below zero */}
                <linearGradient id="areaFillGrad" x1="0" y1="yZero" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset={`${trendStats.zeroPercent}%`} stopColor="#10b981" stopOpacity="0.0" />
                  <stop offset={`${trendStats.zeroPercent}%`} stopColor="#ef4444" stopOpacity="0.0" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.25" />
                </linearGradient>

                <linearGradient id="strokeLineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="1" />
                  <stop offset={`${trendStats.zeroPercent}%`} stopColor="#14b8a6" stopOpacity="1" />
                  <stop offset={`${trendStats.zeroPercent}%`} stopColor="#ef4444" stopOpacity="1" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="1" />
                </linearGradient>
              </defs>

              {/* Dynamic Y Axis Gridlines and Labels (8 ticks as in mockup) */}
              {Array.from({ length: 8 }).map((_, i) => {
                const fraction = i / 7;
                const val = trendStats.min + fraction * (trendStats.max - trendStats.min);
                const y = trendPaddingTop + trendChartHeight - fraction * trendChartHeight;
                const roundedVal = Math.round(val);

                // Format as shorthand e.g. 25k, -10k, 0
                const formatYAxisVal = (valNum: number) => {
                  const r = Math.round(valNum);
                  if (Math.abs(r) >= 1000) {
                    return `${(r / 1000).toFixed(0)}k`;
                  }
                  return `${r}`;
                };

                return (
                  <g key={i} className="font-mono text-[26px] select-none text-slate-300">
                    {/* Horizontal grid line */}
                    <line
                      x1={trendPaddingLeft}
                      y1={y}
                      x2={trendSvgWidth - trendPaddingRight}
                      y2={y}
                      stroke={roundedVal === 0 ? "rgba(239, 68, 68, 0.45)" : "rgba(255,255,255,0.06)"}
                      strokeWidth={roundedVal === 0 ? 1.5 : 1}
                      strokeDasharray={roundedVal === 0 ? "none" : "3 3"}
                    />
                    {/* Tick Label */}
                    <text
                      x={trendPaddingLeft - 12}
                      y={y + 8}
                      textAnchor="end"
                      fill={roundedVal === 0 ? "#ef4444" : "#94a3b8"}
                      className="font-bold text-[26px]"
                    >
                      {formatYAxisVal(roundedVal)}
                    </text>
                  </g>
                );
              })}

              {/* X-axis tick descriptors (Year labels aligned with vertical gridlines like high fidelity mockup) */}
              {distinctYears.map(({ year, x }) => (
                <g key={year} className="font-mono text-slate-400">
                  {/* Vertical grid line */}
                  <line
                    x1={x}
                    y1={trendPaddingTop}
                    x2={x}
                    y2={trendPaddingTop + trendChartHeight}
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth={1}
                  />
                  {/* Year text at bottom */}
                  <text
                    x={x}
                    y={trendSvgHeight - 12}
                    textAnchor="middle"
                    className="font-display font-extrabold text-[27px] fill-slate-300"
                  >
                    {year}
                  </text>
                </g>
              ))}

              {/* Render computed paths (only if data exists) */}
              {hasTrendPoints && (
                <>
                  {/* Shaded Area underneath */}
                  <path
                    d={trendStats.areaPath}
                    fill="url(#areaFillGrad)"
                    className="transition-all duration-300"
                  />
                  {/* Solid stroke curve */}
                  <path
                    d={trendStats.linePath}
                    fill="none"
                    stroke="url(#strokeLineGrad)"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all duration-300"
                  />

                  {/* Highlight start point node */}
                  <circle
                    cx={trendStats.points[0].x}
                    cy={trendStats.points[0].y}
                    r={3.5}
                    fill="#10b981"
                    stroke="#1e293b"
                    strokeWidth={1.5}
                  />

                  {/* Highlight end point node */}
                  <circle
                    cx={trendStats.points[trendStats.points.length - 1].x}
                    cy={trendStats.points[trendStats.points.length - 1].y}
                    r={3.5}
                    fill="#14b8a6"
                    stroke="#1e293b"
                    strokeWidth={1.5}
                  />
                </>
              )}

              {/* Hover highlight line & marker dots */}
              {hoveredPoint && (
                <g className="animate-fade-in">
                  <line
                    x1={hoveredPoint.x}
                    y1={trendPaddingTop}
                    x2={hoveredPoint.x}
                    y2={trendPaddingTop + trendChartHeight}
                    stroke="rgba(255,255,255,0.25)"
                    strokeWidth={1.2}
                    strokeDasharray="2 2"
                  />
                  {/* Outer glow ring */}
                  <circle
                    cx={hoveredPoint.x}
                    cy={hoveredPoint.y}
                    r={7}
                    fill="rgba(20, 184, 166, 0.3)"
                  />
                  {/* Inner focal core */}
                  <circle
                    cx={hoveredPoint.x}
                    cy={hoveredPoint.y}
                    r={3.5}
                    fill={hoveredPoint.balance >= 0 ? "#10b981" : "#ef4444"}
                    stroke="#fff"
                    strokeWidth={1.5}
                  />
                </g>
              )}
            </svg>

            {/* Float overlay information tooltip absolute wrapper */}
            {hoveredPoint && (
              <div 
                className="absolute bg-slate-900 border border-white/10 text-white rounded-2xl p-3 shadow-2xl pointer-events-none z-30 flex flex-col gap-1 min-w-[150px] text-center"
                style={{ 
                  left: `${Math.max(12, Math.min(88, (hoveredPoint.x / trendSvgWidth) * 100))}%`, 
                  top: '40%', 
                  transform: 'translate(-50%, -50%)',
                  boxShadow: '0 10px 30px -10px rgba(0,0,0,0.8), 0 0 15px 1px rgba(255,255,255,0.03)'
                }}
              >
                <b className="text-slate-400 text-[10px] tracking-wider uppercase">{formatRussianDate(hoveredPoint.date)}</b>
                <span className={`font-mono font-black text-sm ${hoveredPoint.balance >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {Math.round(hoveredPoint.balance).toLocaleString('ru-RU')} ₼
                </span>
                <span className="text-[9px] text-slate-500 font-semibold leading-none mt-1">
                  Нажмите, чтобы детализировать
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Selected Day Transaction Breakdown Drawer */}
        {selectedTrendDate && (
          <div className="bg-slate-900/85 border border-white/10 rounded-2xl p-5 mb-8 animate-fade-in text-left shadow-lg">
            <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-teal-400" />
                <h4 className="font-extrabold text-xs text-white uppercase tracking-wider font-display">
                  Анализ операций за {formatRussianDate(selectedTrendDate)}
                </h4>
              </div>
              <button
                onClick={() => setSelectedTrendDate(null)}
                className="text-xs bg-white/10 hover:bg-white/20 text-slate-300 px-3 py-1 rounded-xl transition-all font-semibold cursor-pointer"
              >
                Закрыть детальный просмотр
              </button>
            </div>

            {clickedDateTransactions.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-xs text-slate-400 font-medium leading-normal">
                  В этот день ({formatRussianDate(selectedTrendDate)}) в системе нет зафиксированных операций (транзакций или переводов).
                </p>
                <p className="text-[10px] text-slate-500 mt-1">Остаток на балансе оставался неизменным и составлял {Math.round(balanceTrendData.find(d => d.date === selectedTrendDate)?.balance || 0)} ₼.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1 select-none custom-scrollbar">
                 {clickedDateTransactions.map(tx => {
                  const cat = categories.find(c => c.id === tx.categoryId);
                  const acc = accounts.find(a => a.id === tx.accountId);
                  const isTransfer = tx.type === 'transfer';
                  const isInc = tx.type === 'income' || (isTransfer && tx.transferType === 'in');

                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-2 bg-slate-950/60 rounded-xl border border-white/5 hover:border-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs"
                          style={{ backgroundColor: isTransfer ? '#f59e0b' : (cat?.color || '#3b82f6') }}
                        >
                          {isTransfer ? <ArrowUpDown size={12} /> : <IconComponent name={cat?.icon || 'HelpCircle'} size={12} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-200 truncate leading-tight">{tx.description || (isTransfer ? 'Перевод' : (cat?.name || 'Операция'))}</p>
                          <span className="text-[9.5px] text-slate-400 font-medium block mt-0.5">
                            Счет: <b className="text-slate-300">{acc?.name || 'Неизвестно'}</b> • Категория: <b className="text-slate-300">{isTransfer ? 'Перевод' : (cat?.name || 'Прочее')}</b>
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0 pl-3">
                        <span className={`font-mono text-xs font-black select-all ${isTransfer ? (tx.transferType === 'in' ? 'text-teal-400' : 'text-amber-400') : (isInc ? 'text-emerald-400' : 'text-rose-400')}`}>
                          {isTransfer ? (tx.transferType === 'in' ? '+' : '-') : (isInc ? '+' : '-')}{Math.round(tx.amount)} ₼
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* --- HIGH-FIDELITY RUSSIAN HONEYMONEY DASHBOARD --- */}
        <div className="w-full mb-8" id="honeymoney-panels-container">
          
          {/* Header Tab Selector */}
          <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4 md:mb-6">
            <div className="flex items-center gap-4 sm:gap-6">
              <button
                onClick={() => setActiveDashboardTab('fact')}
                className={`pb-3 pr-1 sm:pr-2 font-display text-sm font-black uppercase tracking-wider transition-all cursor-pointer relative ${
                  activeDashboardTab === 'fact' ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Факт
                {activeDashboardTab === 'fact' && (
                  <span className="absolute bottom-0 left-0 right-1 sm:right-2 h-0.5 bg-amber-400 animate-fade-in" />
                )}
              </button>
              
              <button
                onClick={() => setActiveDashboardTab('plan')}
                className={`pb-3 pr-1 sm:pr-2 font-display text-sm font-black uppercase tracking-wider transition-all cursor-pointer relative ${
                  activeDashboardTab === 'plan' ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                План (Бюджет)
                {activeDashboardTab === 'plan' && (
                  <span className="absolute bottom-0 left-0 right-1 sm:right-2 h-0.5 bg-amber-400 animate-fade-in" />
                )}
              </button>
            </div>

            <span className="text-[10px] text-slate-500 font-mono hidden sm:block">
              HoneyMoney Engine Active • {getPeriodLabel(analyticsTimeframe)}
            </span>
          </div>

          {activeDashboardTab === 'fact' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
              
              {/* PANEL 1: EXPENSES (РАСХОДЫ) */}
              <div className="bg-slate-950/40 rounded-2xl p-3 sm:p-4 border border-white/5 flex flex-col justify-between" id="honey-expenses-panel">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2 mb-3.5">
                    <div className="flex flex-wrap items-baseline gap-1.5 min-w-0">
                      <h4 className="font-display font-black text-xs text-slate-350 uppercase tracking-wider">Расходы</h4>
                      <span className="font-mono text-xs sm:text-sm font-black text-rose-450 select-all whitespace-nowrap">
                        -{Math.round(categoryBreakdown.total).toLocaleString('ru-RU')} ₼
                      </span>
                    </div>
                    
                    <button
                      onClick={() => setShowSubcategories(!showSubcategories)}
                      className="text-[9px] font-bold bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white px-2 py-1 rounded-lg transition-colors cursor-pointer uppercase tracking-wider whitespace-nowrap"
                    >
                      {showSubcategories ? '[-] Свернуть' : '[+] Подкатегории'}
                    </button>
                  </div>

                  {/* List of top categories with progress bars */}
                  {categoryBreakdown.list.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-4">Нет данных по расходам за период</p>
                  ) : (
                    <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1 select-none custom-scrollbar">
                      {categoryBreakdown.list.slice(0, showSubcategories ? 15 : 6).map((item, idx) => {
                        const barWidth = item.percentage;
                        return (
                          <div key={item.category.id} className="group min-w-0">
                            <div className="flex items-center justify-between text-xs mb-1 gap-3 min-w-0">
                              <span className="font-semibold text-slate-300 flex items-center gap-1.5 min-w-0">
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.category.color }} />
                                <span className="truncate">{formatCategoryDisplayName(item.category.name)}</span>
                              </span>
                              <span className="font-mono font-bold text-rose-350 select-all shrink-0 whitespace-nowrap pl-1">
                                -{Math.round(item.amount).toLocaleString('ru-RU')} ₼
                              </span>
                            </div>
                            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${barWidth}%` }}
                                className="h-full bg-rose-500 rounded-full transition-all duration-500 group-hover:bg-rose-450"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>


              </div>

              {/* PANEL 2: INCOMES (ДОХОДЫ) */}
              <div className="bg-slate-950/40 rounded-2xl p-3 sm:p-4 border border-white/5 flex flex-col justify-between" id="honey-incomes-panel">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2 mb-3.5">
                    <div className="flex flex-wrap items-baseline gap-1.5 min-w-0">
                      <h4 className="font-display font-black text-xs text-slate-330 uppercase tracking-wider">Доходы</h4>
                      <span className="font-mono text-xs sm:text-sm font-black text-emerald-400 select-all whitespace-nowrap">
                        +{Math.round(incomeCategoryBreakdown.total).toLocaleString('ru-RU')} ₼
                      </span>
                    </div>
                    
                    <span className="text-[9px] uppercase font-bold text-slate-500 whitespace-nowrap">Поступления</span>
                  </div>

                  {/* List of top incomes with progress bars */}
                  {incomeCategoryBreakdown.list.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-4">Нет данных по доходам за период</p>
                  ) : (
                    <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1 select-none custom-scrollbar">
                      {incomeCategoryBreakdown.list.slice(0, 6).map((item, idx) => {
                        const barWidth = item.percentage;
                        return (
                          <div key={item.category.id} className="group min-w-0">
                            <div className="flex items-center justify-between text-xs mb-1 gap-3 min-w-0">
                              <span className="font-semibold text-slate-300 flex items-center gap-1.5 min-w-0">
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.category.color }} />
                                <span className="truncate">{formatCategoryDisplayName(item.category.name)}</span>
                              </span>
                              <span className="font-mono font-bold text-emerald-450 select-all shrink-0 whitespace-nowrap pl-1">
                                +{Math.round(item.amount).toLocaleString('ru-RU')} ₼
                              </span>
                            </div>
                            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${barWidth}%` }}
                                className="h-full bg-emerald-500 rounded-full transition-all duration-500 group-hover:bg-emerald-450"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>


              </div>

              {/* PANEL 3: ACCOUNTS (СЧЕТА) */}
              <div className="bg-slate-950/40 rounded-2xl p-3 sm:p-4 border border-white/5 text-left flex flex-col justify-between" id="honey-accounts-panel">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2 mb-3.5">
                    <div className="flex flex-wrap items-baseline gap-1.5 min-w-0">
                      <h4 className="font-display font-black text-xs text-slate-330 uppercase tracking-wider">Счета</h4>
                      <span className="font-mono text-xs sm:text-sm font-black text-teal-300 select-all whitespace-nowrap">
                        {Math.round(accounts.reduce((sum, a) => sum + a.balance, 0)).toLocaleString('ru-RU')} ₼
                      </span>
                    </div>

                    <button
                      onClick={() => onQuickNavigate('categories')}
                      className="text-[9px] font-bold bg-white/5 hover:bg-white/10 text-teal-300 hover:text-white px-2 py-1 rounded-lg transition-colors cursor-pointer uppercase tracking-wider"
                    >
                      [+] Настроить
                    </button>
                  </div>

                  {/* Dynamic Sums Calculations */}
                  {(() => {
                    const ordinaryAccountsList = ['ASB kart', 'Кошелёк', 'Albali kart', 'ABB kart Samira', 'DigiHesab Ilqar', 'TamKart Fiziki 5338', 'Кошелек Самира', 'Albali кредитная карта'];
                    const kopilkaName = 'Копилка';
                    const savingsAccountsList = ['Акции ABB', 'Digihesab Samira', 'Зарубежные акции', 'Облигации ABB', 'Digideposit Samira', 'Депозит-Подушка безопасности', 'ABB kredit kart', 'TamKart Virtual', 'Страхование жизни', 'Цифровая карта', 'YapiKrediBank kredit', 'DigiHesab 2 Ilqar'];

                    const ordinaryAccs = accounts.filter(a => ordinaryAccountsList.includes(a.name) && a.name !== kopilkaName);
                    const ordinarySumVal = ordinaryAccs.reduce((sum, a) => sum + a.balance, 0);

                    const kopilkaAcc = accounts.find(a => a.name === kopilkaName);
                    const kopilkaBalVal = kopilkaAcc ? kopilkaAcc.balance : 0;

                    const savingsAccs = accounts.filter(a => savingsAccountsList.includes(a.name) || (a.type === 'savings' && a.name !== kopilkaName));
                    const savingsSumVal = savingsAccs.reduce((sum, a) => sum + a.balance, 0);

                    return (
                      <div className="space-y-4">
                        
                        {/* GROUP A: ORDINARY (ОБЫЧНЫЕ) */}
                        <div className="min-w-0">
                          {/* Group Header */}
                          <div 
                            onClick={() => setIsOrdinaryGroupExpanded(!isOrdinaryGroupExpanded)}
                            className="flex items-center justify-between py-1 px-1.5 hover:bg-white/5 rounded-lg cursor-pointer transition-colors text-xs font-bold font-display tracking-wide uppercase select-none text-slate-400 gap-2 min-w-0"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span>{isOrdinaryGroupExpanded ? '▼' : '►'}</span>
                              <span className="text-slate-300 truncate">Обычные</span>
                            </div>
                            <div className="font-mono text-[10px] sm:text-[11px] font-extrabold flex items-center gap-1 text-slate-355 leading-none shrink-0 whitespace-nowrap pl-1">
                              <span>{Math.round(ordinarySumVal).toLocaleString('ru-RU')} ₼</span>
                              {kopilkaBalVal > 0 && (
                                <span className="text-orange-400 flex items-center gap-0.5">
                                  + {Math.round(kopilkaBalVal)} ₼ ⚠️
                                </span>
                              )}
                            </div>
                          </div>

                          {/* List items */}
                          {isOrdinaryGroupExpanded && (
                            <div className="mt-1 space-y-1 pl-2 animate-fade-in max-h-[175px] overflow-y-auto pr-1">
                              {ordinaryAccs.map(acc => {
                                return (
                                  <div 
                                    key={acc.id}
                                    className="group flex items-center justify-between p-1.5 rounded-lg hover:bg-white/5 transition-all text-xs gap-3 min-w-0"
                                  >
                                    <span className="font-semibold text-slate-400 group-hover:text-white flex items-center gap-1.5 min-w-0">
                                      <span className="w-1 h-3 bg-amber-400 rounded-xs shrink-0" />
                                      <span className="truncate">{acc.name}</span>
                                    </span>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="font-mono font-bold text-slate-200 select-all whitespace-nowrap">
                                        {Math.round(acc.balance).toLocaleString('ru-RU')} ₼
                                      </span>
                                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 pr-1 shrink-0">
                                        <button 
                                          onClick={() => onQuickNavigate('categories')} 
                                          className="text-[10px] hover:text-white text-slate-500 cursor-pointer" 
                                          title="Редактировать"
                                        >
                                          ✏️
                                        </button>
                                        <button 
                                          onClick={() => onQuickNavigate('transactions')} 
                                          className="text-[10px] hover:text-white text-slate-500 cursor-pointer" 
                                          title="Журнал"
                                        >
                                          📋
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}

                              {/* Warning Account - Kopilka shown in line */}
                              {kopilkaAcc && (
                                <div 
                                  className="group flex items-center justify-between p-1.5 rounded-lg bg-orange-500/5 hover:bg-orange-500/10 border border-orange-500/20 transition-all text-xs gap-3 min-w-0"
                                >
                                  <span className="font-bold text-orange-200 flex items-center gap-1.5 min-w-0">
                                    <span className="font-sans shrink-0">⚠️</span>
                                    <span className="truncate">{kopilkaAcc.name}</span>
                                  </span>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="font-mono font-bold text-orange-300 whitespace-nowrap">
                                      {Math.round(kopilkaAcc.balance).toLocaleString('ru-RU')} ₼
                                    </span>
                                    <span className="text-[9px] text-slate-500 hidden sm:inline-block font-semibold">В Копилке</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* GROUP B: ACCUMULATIONS (НАКОПЛЕНИЯ) */}
                        <div className="min-w-0">
                          {/* Group Header */}
                          <div 
                            onClick={() => setIsSavingsGroupExpanded(!isSavingsGroupExpanded)}
                            className="flex items-center justify-between py-1 px-1.5 hover:bg-white/5 rounded-lg cursor-pointer transition-colors text-xs font-bold font-display tracking-wide uppercase select-none text-slate-400 gap-2 min-w-0"
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span>{isSavingsGroupExpanded ? '▼' : '►'}</span>
                              <span className="text-slate-300 truncate">Накопления</span>
                            </div>
                            <span className="font-mono text-[10px] sm:text-[11px] font-extrabold text-slate-305 shrink-0 pl-1">
                              {Math.round(savingsSumVal).toLocaleString('ru-RU')} ₼
                            </span>
                          </div>

                          {/* List items */}
                          {isSavingsGroupExpanded && (
                            <div className="mt-1 space-y-1 pl-2 animate-fade-in max-h-[175px] overflow-y-auto pr-1">
                              {savingsAccs.map(acc => {
                                return (
                                  <div 
                                    key={acc.id}
                                    className="group flex items-center justify-between p-1.5 rounded-lg hover:bg-white/5 transition-all text-xs gap-3 min-w-0"
                                  >
                                    <span className="font-semibold text-slate-400 group-hover:text-white flex items-center gap-1.5 min-w-0">
                                      <span className="w-1 h-3 bg-lime-400 rounded-xs shrink-0" />
                                      <span className="truncate">{acc.name}</span>
                                    </span>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="font-mono font-bold text-slate-200 select-all whitespace-nowrap">
                                        {Math.round(acc.balance).toLocaleString('ru-RU')} ₼
                                      </span>
                                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 pr-1 shrink-0">
                                        <button 
                                          onClick={() => onQuickNavigate('categories')} 
                                          className="text-[10px] hover:text-white text-slate-500 cursor-pointer" 
                                          title="Редактировать"
                                        >
                                          ✏️
                                        </button>
                                        <button 
                                          onClick={() => onQuickNavigate('transactions')} 
                                          className="text-[10px] hover:text-white text-slate-500 cursor-pointer" 
                                          title="Журнал"
                                        >
                                          📋
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                      </div>
                    );
                  })()}
                </div>

              </div>

            </div>
          ) : (
            <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-white/5 animate-fade-in">
              <SlidersHorizontal className="text-amber-400 mx-auto mb-3" size={32} />
              <b className="text-sm font-display font-black text-white uppercase tracking-wider block">Планирование (Бюджетная система конвертов)</b>
              <p className="text-xs text-slate-400 max-w-lg mx-auto mt-2 leading-relaxed">
                Система позволяет устанавливать лимиты расходования на следующий месяц. Конверты страхуют вас от импульсивных трат. Когда траты по категории превысят безопасные отметки (85% и выше), система сформирует предупреждающие Тосты на главной панели.
              </p>
              <button 
                onClick={() => onQuickNavigate('accounts-categories')}
                className="mt-5 px-4.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl transition-all uppercase tracking-wider font-display cursor-pointer"
              >
                Открыть Управление Конвертами
              </button>
            </div>
          )}

        </div>

        {/* Charts Grid: Bar chart + Donut chart side-by-side */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          
          {/* Chart 1: Monthly comparison bar chart */}
          <div className="border border-white/5 rounded-2xl p-4 bg-white/5" id="monthly-bar-chart-card">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4 pb-2 border-b border-white/5">
              <div>
                <h4 className="font-semibold text-sm text-teal-300 leading-tight">Сравнение доходов и расходов</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Сравнение по {barYear === 'all' ? 'годам' : 'месяцам'} в AZN</p>
              </div>

              {/* Local interactive bar filters */}
              <div className="flex flex-wrap items-center gap-1">
                <select
                  value={barYear}
                  onChange={(e) => setBarYear(e.target.value as any)}
                  className="px-1.5 py-0.5 bg-slate-900 border border-white/10 rounded-md text-[9.5px] text-white focus:outline-hidden cursor-pointer"
                >
                  <option value="all">Период: Все годы</option>
                  <option value="2026">2026 г.</option>
                  <option value="2025">2025 г.</option>
                  <option value="2024">2024 г.</option>
                  <option value="2023">2023 г.</option>
                  <option value="2022">2022 г.</option>
                </select>

                <select
                  value={barAccount}
                  onChange={(e) => setBarAccount(e.target.value)}
                  className="px-1.5 py-0.5 bg-slate-900 border border-white/10 rounded-md text-[9.5px] text-white focus:outline-hidden cursor-pointer max-w-[95px] truncate"
                >
                  <option value="all">Все счета</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>

                <select
                  value={barCategory}
                  onChange={(e) => setBarCategory(e.target.value)}
                  className="px-1.5 py-0.5 bg-slate-900 border border-white/10 rounded-md text-[9.5px] text-white focus:outline-hidden cursor-pointer max-w-[95px] truncate"
                >
                  <option value="all">Все категории</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* SVG custom bar graph */}
            <div className="relative w-full h-[220px] flex items-end justify-between px-2 pt-8">
              
              {/* Backing Y-axis gridlines inside SVG chart */}
              {(() => {
                const peakAmount = Math.max(...monthlyBarSummary.map(b => Math.max(b.income, b.expense)), 500);
                const maxChartAmount = Math.ceil(peakAmount * 1.15);
                return (
                  <>
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-5 text-[10px] font-mono text-slate-500">
                      <div className="border-b border-dashed border-white/10 w-full pt-1"><span>{maxChartAmount.toFixed(0)} AZN</span></div>
                      <div className="border-b border-dashed border-white/10 w-full pt-1"><span>{(maxChartAmount / 2).toFixed(0)} AZN</span></div>
                      <div className="border-b border-dashed border-white/5 w-full pt-1"><span>{(maxChartAmount / 4).toFixed(0)} AZN</span></div>
                      <div className="w-full"><span>0 AZN</span></div>
                    </div>

                    {/* Graphical Bars Columns */}
                    <div className="w-full h-full flex justify-around items-end z-10 pb-5">
                      {monthlyBarSummary.map((bar, idx) => {
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
                  </>
                );
              })()}
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4 pb-2 border-b border-white/5">
              <div>
                <h4 className="font-semibold text-sm text-teal-300 leading-tight">Доли и структура операций</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Структура за {getPeriodLabel(donutTimeframe)}</p>
              </div>

              {/* Local interactive donut filters */}
              <div className="flex flex-wrap items-center gap-1">
                <select
                  value={donutType}
                  onChange={(e) => setDonutType(e.target.value as any)}
                  className="px-1.5 py-0.5 bg-slate-900 border border-white/10 rounded-md text-[9.5px] text-white focus:outline-hidden cursor-pointer font-bold"
                >
                  <option value="expense">Расходы</option>
                  <option value="income">Доходы</option>
                </select>

                <select
                  value={donutTimeframe}
                  onChange={(e) => setDonutTimeframe(e.target.value as any)}
                  className="px-1.5 py-0.5 bg-slate-900 border border-white/10 rounded-md text-[9.5px] text-white focus:outline-hidden cursor-pointer"
                >
                  <option value="all">Все время</option>
                  <option value="may">Май 2026</option>
                  <option value="april">Апрель 2026</option>
                  <option value="2026">2026 год</option>
                  <option value="2025">2025 год</option>
                  <option value="2024">2024 год</option>
                </select>

                <select
                  value={donutAccount}
                  onChange={(e) => setDonutAccount(e.target.value)}
                  className="px-1.5 py-0.5 bg-slate-900 border border-white/10 rounded-md text-[9.5px] text-white focus:outline-hidden cursor-pointer max-w-[85px] truncate"
                >
                  <option value="all">Все счета</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {donutCategoryBreakdown.list.length === 0 ? (
              <div className="text-center py-10 flex flex-col items-center justify-center flex-1">
                <HelpCircle className="text-slate-500 mb-2" size={32} />
                <p className="text-slate-300 font-semibold text-xs">Нет данных об операциях</p>
                <p className="text-[10px] text-slate-400 max-w-xs mt-1">За выбранные даты и на выбранном счете операции не зафиксированы.</p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-4 flex-1">
                
                {/* SVG Ring Donut */}
                <div className="relative w-44 h-44 flex items-center justify-center shrink-0">
                  <svg width="100%" height="100%" viewBox="0 0 160 160" className="transform -rotate-90">
                    {donutCategoryBreakdown.list.map((item, idx) => {
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
                    {hoveredDonutSlice !== null && donutCategoryBreakdown.list[hoveredDonutSlice] ? (
                      <>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider truncate max-w-[110px]">
                           {formatCategoryDisplayName(donutCategoryBreakdown.list[hoveredDonutSlice].category.name)}
                        </span>
                        <span className="text-sm font-display font-black text-white leading-none mt-0.5">
                          {donutCategoryBreakdown.list[hoveredDonutSlice].amount.toFixed(0)} ₼
                        </span>
                        <span className="text-[9px] text-teal-300 font-extrabold mt-0.5">
                          {donutCategoryBreakdown.list[hoveredDonutSlice].percentage.toFixed(1)}%
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">
                          {donutType === 'expense' ? 'Всего трат' : 'Всего доходов'}
                        </span>
                        <span className="text-base font-display font-black text-white leading-tight">
                          {donutCategoryBreakdown.total.toFixed(1)} ₼
                        </span>
                        <span className="text-[9px] text-slate-400 leading-none mt-1">Наведите на сектор</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Legend list showing percentages */}
                <div className="flex-1 space-y-1.5 w-full overflow-y-auto max-h-[160px] pr-1 custom-scrollbar">
                  {donutCategoryBreakdown.list.map((item, idx) => (
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
                        <span className="font-semibold text-slate-200 truncate">{formatCategoryDisplayName(item.category.name)}</span>
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
