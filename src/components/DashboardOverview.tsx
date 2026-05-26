import React, { useState, useMemo, useRef } from 'react';
import { Transaction, Category, Account, BudgetLimit } from '../types';
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
  addToast: (message: string, type: 'warning' | 'critical' | 'success') => void;
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
  addToast
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

  // Render a beautifully styled grid representation of the Treemap
  const renderTreemap = (items: any[], type: 'income' | 'expense') => {
    if (!items || items.length === 0) return null;
    
    // Select top items for nice bento blocks
    const sorted = [...items].sort((a,b) => b.amount - a.amount).slice(0, 6);
    const borderColor = type === 'expense' ? 'border-[#e88d8b]/40' : 'border-[#d0edd9]/40';
    const bgColor = type === 'expense' ? 'bg-[#f4c3c2]/5' : 'bg-[#d0edd9]/5';
    const hoverBg = type === 'expense' ? 'hover:bg-[#f4c3c2]/10' : 'hover:bg-[#d0edd9]/10';
    const textColor = type === 'expense' ? 'text-rose-400' : 'text-emerald-400';
    
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-1.5 w-full mt-3 animate-fade-in pb-1 select-none">
        {sorted.map((item, idx) => {
          return (
            <div 
              key={idx} 
              className={`border ${borderColor} ${bgColor} ${hoverBg} p-2 rounded-xl flex flex-col justify-between transition-all hover:scale-[1.015] shadow-xs cursor-pointer`}
              style={{ minHeight: '52px' }}
            >
              <div className="text-[9px] uppercase font-bold text-slate-400 tracking-tight truncate leading-tight">
                {item.category.name}
              </div>
              <div className={`text-[11px] font-mono font-black ${textColor} leading-none mt-1`}>
                {type === 'expense' ? '-' : '+'}{Math.round(item.amount).toLocaleString('ru-RU')} ₼
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
  const trendSvgHeight = 245;
  const trendPaddingLeft = 65;
  const trendPaddingRight = 20;
  const trendPaddingTop = 20;
  const trendPaddingBottom = 40;
  const trendChartWidth = trendSvgWidth - trendPaddingLeft - trendPaddingRight;
  const trendChartHeight = trendSvgHeight - trendPaddingTop - trendPaddingBottom;

  const trendStats = useMemo(() => {
    if (balanceTrendData.length === 0) return { min: 0, max: 100, points: [], linePath: '', areaPath: '', zeroPercent: 50, yZero: 100 };

    const balancesList = balanceTrendData.map(d => d.balance);
    let max = Math.max(...balancesList, 100);
    let min = Math.min(...balancesList, 0);

    // Give some vertical breathing space in chart
    const range = max - min;
    const paddingVal = range * 0.15 || 50;
    const graphMax = max + paddingVal;
    const graphMin = min - paddingVal;
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
  }, [balanceTrendData, trendChartWidth, trendChartHeight]);

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

      {/* --- QUICK INTERACTIVE GESTURE TRANSACTION BUILDER --- */}
      <QuickDragDropBuilder
        accounts={accounts}
        categories={categories}
        onAddTransaction={onAddTransaction}
        addToast={addToast}
      />

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
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-x-4 gap-y-1 text-xs text-slate-305 w-full sm:w-auto sm:text-right font-display justify-end">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold text-left sm:text-right">Начало периода ({formatRussianDate(firstPoint.date)})</span>
                  <span className="font-mono font-bold text-slate-300 text-left sm:text-right">{Math.round(startBalance).toLocaleString('ru-RU')} ₼</span>
                </div>
                <div className="w-px h-6 bg-white/10 hidden sm:block" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold text-left sm:text-right">Итог на сегодня ({formatRussianDate(lastPoint.date)})</span>
                  <span className="font-mono font-bold text-teal-400 text-[13px] text-left sm:text-right shrink-0">
                    {Math.round(endBalance).toLocaleString('ru-RU')} ₼ 
                    <span className={`text-xs ml-1.5 font-sans font-extrabold ${percentChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      ({changePrefix}{percentChange.toFixed(0)}%)
                    </span>
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="relative w-full aspect-video sm:aspect-auto sm:h-[245px]" id="trend-svg-container">
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

              {/* Dynamic Y Axis Gridlines and Labels */}
              {Array.from({ length: 5 }).map((_, i) => {
                const fraction = i / 4;
                const val = trendStats.min + fraction * (trendStats.max - trendStats.min);
                const y = trendPaddingTop + trendChartHeight - fraction * trendChartHeight;
                const roundedVal = Math.round(val);

                return (
                  <g key={i} className="font-mono text-[9px] select-none text-slate-500">
                    {/* Horizontal grid dashline */}
                    <line
                      x1={trendPaddingLeft}
                      y1={y}
                      x2={trendSvgWidth - trendPaddingRight}
                      y2={y}
                      stroke={roundedVal === 0 ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.06)"}
                      strokeWidth={roundedVal === 0 ? 1.5 : 1}
                      strokeDasharray={roundedVal === 0 ? "none" : "3 3"}
                    />
                    {/* Tick Label */}
                    <text
                      x={trendPaddingLeft - 10}
                      y={y + 3}
                      textAnchor="end"
                      fill={roundedVal === 0 ? "#94a3b8" : "#64748b"}
                      className="font-medium"
                    >
                      {roundedVal.toLocaleString('ru-RU')} ₼
                    </text>
                  </g>
                );
              })}

              {/* X-axis tick descriptors (Dates labels at bounds) */}
              {trendStats.points.length > 1 && (
                <>
                  {/* Min start date */}
                  <text
                    x={trendStats.points[0].x}
                    y={trendSvgHeight - 12}
                    textAnchor="start"
                    className="font-display font-bold text-[10px] fill-slate-500"
                  >
                    {formatRussianDate(trendStats.points[0].date).replace(' г.', '')}
                  </text>
                  
                  {/* Middle descriptor */}
                  {trendStats.points.length > 5 && (
                    <text
                      x={trendStats.points[Math.floor(trendStats.points.length / 2)].x}
                      y={trendSvgHeight - 12}
                      textAnchor="middle"
                      className="font-display text-[9px] fill-slate-500 font-semibold"
                    >
                      Июль / Середина
                    </text>
                  )}

                  {/* Max end date */}
                  <text
                    x={trendStats.points[trendStats.points.length - 1].x}
                    y={trendSvgHeight - 12}
                    textAnchor="end"
                    className="font-display font-bold text-[10px] fill-slate-500"
                  >
                    {formatRussianDate(trendStats.points[trendStats.points.length - 1].date).replace(' г.', '')}
                  </text>
                </>
              )}

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

          <p className="text-center text-[11px] text-slate-400 italic mt-3 flex items-center justify-center gap-1">
            <Calendar size={12} className="text-teal-400 shrink-0" />
            Нажмите на точку или график в любой день, чтобы посмотреть доходы и расходы за выбранный день.
          </p>
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
                      className="flex items-center justify-between p-3.5 bg-slate-950/60 rounded-xl border border-white/5 hover:border-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs"
                          style={{ backgroundColor: isTransfer ? '#f59e0b' : (cat?.color || '#3b82f6') }}
                        >
                          {isTransfer ? <ArrowUpDown size={14} /> : <IconComponent name={cat?.icon || 'HelpCircle'} size={14} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-200 truncate">{tx.description || (isTransfer ? 'Перевод' : (cat?.name || 'Операция'))}</p>
                          <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
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
        <div className="bg-white/5 border border-white/5 rounded-2xl md:rounded-3xl p-3 sm:p-5 md:p-6 mb-8" id="honeymoney-panels-container">
          
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
                                <span className="truncate">{item.category.name}</span>
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

                {/* Simulated high-fidelity matching Treemap boxes */}
                {categoryBreakdown.list.length > 0 && (
                  <div className="mt-5 pt-3 border-t border-white/5">
                    <span className="text-[9.5px] uppercase font-bold text-slate-500 tracking-wider">Карта распределения (Treemap)</span>
                    {renderTreemap(categoryBreakdown.list, 'expense')}
                  </div>
                )}
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
                                <span className="truncate">{item.category.name}</span>
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

                {/* Simulated high-fidelity matching Income Treemap */}
                {incomeCategoryBreakdown.list.length > 0 && (
                  <div className="mt-5 pt-3 border-t border-white/5">
                    <span className="text-[9.5px] uppercase font-bold text-slate-500 tracking-wider">Карта источников (Treemap)</span>
                    {renderTreemap(incomeCategoryBreakdown.list, 'income')}
                  </div>
                )}
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
                onClick={() => onQuickNavigate('budgeting')}
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
                           {donutCategoryBreakdown.list[hoveredDonutSlice].category.name}
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
