import React, { useState, useMemo, useRef } from 'react';
import { Transaction, Category, Account, BudgetLimit, formatCategoryDisplayName } from '../types';
import { IconComponent } from './IconComponent';
import { Wallet, ArrowUpRight, ArrowDownLeft, TrendingUp, AlertTriangle, Filter, Calendar, HelpCircle, FileSpreadsheet, Download, RefreshCw, LogIn, LogOut, CheckCircle, AlertCircle, ArrowUpDown, SlidersHorizontal, X } from 'lucide-react';
import { exportToGoogleSheets } from '../googleSheetsService';
import { QuickDragDropBuilder } from './QuickDragDropBuilder';
import { SearchableSelect } from './SearchableSelect';

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
  theme?: 'light' | 'dark';
  onReorderAccounts?: (newAccounts: Account[]) => void;
}

const getParentCategory = (cat: Category, allCategories: Category[]): Category => {
  const separators = ['/', '—', '–', '-', '−'];
  for (const sep of separators) {
    if (cat.name.includes(sep)) {
      const parts = cat.name.split(sep);
      const parentName = parts[0].trim();
      const parentCat = allCategories.find(
        c => c.name.trim().toLowerCase() === parentName.toLowerCase() && c.type === cat.type
      );
      if (parentCat) {
        return parentCat;
      } else {
        return {
          id: `virtual-parent-${parentName.toLowerCase().replace(/\s+/g, '-')}`,
          name: parentName,
          icon: cat.icon,
          color: cat.color,
          type: cat.type,
          quickEntry: cat.quickEntry
        };
      }
    }
  }
  return cat;
};

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
  showMode = 'all',
  theme = 'light',
  onReorderAccounts
}: DashboardOverviewProps) {
  
  const visibleAccounts = useMemo(() => accounts.filter(a => a.quickEntry !== false), [accounts]);
  const visibleCategories = useMemo(() => categories.filter(c => c.quickEntry !== false), [categories]);

  // Custom states for export status
  const [exportStatus, setExportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [exportedSpreadsheetUrl, setExportedSpreadsheetUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Dynamic Charts Filtering
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState<'may' | 'april' | '2026' | '2025' | '2024' | '2023' | '2022' | 'all'>(
    () => (localStorage.getItem('milli_analytics_timeframe') as any) || 'all'
  );
  const [analyticsAccount, setAnalyticsAccount] = useState<string>(
    () => localStorage.getItem('milli_analytics_account') || 'all'
  );

  // Local discrete filters for each individual chart card
  const [lineTimeframe, setLineTimeframe] = useState<'may' | 'april' | '2026' | '2025' | '2024' | '2023' | '2022' | 'all'>(
    () => (localStorage.getItem('milli_line_timeframe') as any) || 'all'
  );
  const [lineAccount, setLineAccount] = useState<string>(
    () => localStorage.getItem('milli_line_account') || 'all'
  );
  const [lineType, setLineType] = useState<'all' | 'expense' | 'income'>(
    () => (localStorage.getItem('milli_line_type') as any) || 'all'
  );

  const [barAccount, setBarAccount] = useState<string>(
    () => localStorage.getItem('milli_bar_account') || 'all'
  );
  const [barCategory, setBarCategory] = useState<string>(
    () => localStorage.getItem('milli_bar_category') || 'all'
  );
  const [barYear, setBarYear] = useState<'all' | '2026' | '2025' | '2024' | '2023' | '2022'>(
    () => (localStorage.getItem('milli_bar_year') as any) || 'all'
  );

  const [donutAccount, setDonutAccount] = useState<string>(
    () => localStorage.getItem('milli_donut_account') || 'all'
  );
  const [donutTimeframe, setDonutTimeframe] = useState<'may' | 'april' | '2026' | '2025' | '2024' | '2023' | '2022' | 'all'>(
    () => (localStorage.getItem('milli_donut_timeframe') as any) || 'all'
  );
  const [donutType, setDonutType] = useState<'expense' | 'income'>(
    () => (localStorage.getItem('milli_donut_type') as any) || 'expense'
  );

  // Interactive UI states mirroring HoneyMoney Web Dashboard
  const [activeDashboardTab, setActiveDashboardTab] = useState<'fact' | 'plan'>(
    () => (localStorage.getItem('milli_active_dashboard_tab') as any) || 'fact'
  );
  const [isOrdinaryGroupExpanded, setIsOrdinaryGroupExpanded] = useState<boolean>(
    () => localStorage.getItem('milli_is_ordinary_group_expanded') !== 'false'
  );
  const [isSavingsGroupExpanded, setIsSavingsGroupExpanded] = useState<boolean>(
    () => localStorage.getItem('milli_is_savings_group_expanded') !== 'false'
  );
  const [showSubcategories, setShowSubcategories] = useState<boolean>(
    () => localStorage.getItem('milli_show_subcategories') === 'true'
  );
  const [categoryGroupingMode, setCategoryGroupingMode] = useState<'parent' | 'sub'>(
    () => (localStorage.getItem('milli_category_grouping_mode') as any) || 'sub'
  );
  const [selectedCategoryTransactions, setSelectedCategoryTransactions] = useState<{ category: Category; type: 'expense' | 'income' } | null>(null);
  const [accountsSortMode, setAccountsSortMode] = useState<'desc' | 'custom'>(
    () => (localStorage.getItem('milli_accounts_sort_mode') as any) || 'desc'
  );

  // Synced state persistence to localStorage via React.useEffect hooks
  React.useEffect(() => {
    localStorage.setItem('milli_analytics_timeframe', analyticsTimeframe);
  }, [analyticsTimeframe]);

  React.useEffect(() => {
    localStorage.setItem('milli_analytics_account', analyticsAccount);
  }, [analyticsAccount]);

  React.useEffect(() => {
    localStorage.setItem('milli_line_timeframe', lineTimeframe);
  }, [lineTimeframe]);

  React.useEffect(() => {
    localStorage.setItem('milli_line_account', lineAccount);
  }, [lineAccount]);

  React.useEffect(() => {
    localStorage.setItem('milli_line_type', lineType);
  }, [lineType]);

  React.useEffect(() => {
    localStorage.setItem('milli_bar_account', barAccount);
  }, [barAccount]);

  React.useEffect(() => {
    localStorage.setItem('milli_bar_category', barCategory);
  }, [barCategory]);

  React.useEffect(() => {
    localStorage.setItem('milli_bar_year', barYear);
  }, [barYear]);

  React.useEffect(() => {
    localStorage.setItem('milli_donut_account', donutAccount);
  }, [donutAccount]);

  React.useEffect(() => {
    localStorage.setItem('milli_donut_timeframe', donutTimeframe);
  }, [donutTimeframe]);

  React.useEffect(() => {
    localStorage.setItem('milli_donut_type', donutType);
  }, [donutType]);

  React.useEffect(() => {
    localStorage.setItem('milli_active_dashboard_tab', activeDashboardTab);
  }, [activeDashboardTab]);

  React.useEffect(() => {
    localStorage.setItem('milli_is_ordinary_group_expanded', String(isOrdinaryGroupExpanded));
  }, [isOrdinaryGroupExpanded]);

  React.useEffect(() => {
    localStorage.setItem('milli_is_savings_group_expanded', String(isSavingsGroupExpanded));
  }, [isSavingsGroupExpanded]);

  React.useEffect(() => {
    localStorage.setItem('milli_show_subcategories', String(showSubcategories));
  }, [showSubcategories]);

  React.useEffect(() => {
    localStorage.setItem('milli_category_grouping_mode', categoryGroupingMode);
  }, [categoryGroupingMode]);

  React.useEffect(() => {
    localStorage.setItem('milli_accounts_sort_mode', accountsSortMode);
  }, [accountsSortMode]);

  // Sorting Accounts via hold-drag-and-drop
  const [draggedAccountId, setDraggedAccountId] = useState<string | null>(null);
  const [dragGroupType, setDragGroupType] = useState<'ordinary' | 'savings' | null>(null);
  const [startY, setStartY] = useState<number>(0);
  const [currentY, setCurrentY] = useState<number>(0);
  const [draggedInitialIndex, setDraggedInitialIndex] = useState<number>(0);
  const [draggingListIds, setDraggingListIds] = useState<string[]>([]);
  const holdTimerRef = useRef<any>(null);
  const pointerIdRef = useRef<number | null>(null);

  const handleAccountPointerDown = (
    e: React.PointerEvent<HTMLDivElement>, 
    accountId: string, 
    index: number, 
    groupType: 'ordinary' | 'savings',
    currentGroupIds: string[]
  ) => {
    if (e.button !== 0) return; // Only primary button clicks / touch presses
    
    const clientY = e.clientY;
    setStartY(clientY);
    setCurrentY(clientY);
    
    pointerIdRef.current = e.pointerId;
    const target = e.currentTarget;
    
    // Clear any leftover timer
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
    }
    
    // Start long-press hold timer (200ms) to distinguish from tap/click
    holdTimerRef.current = setTimeout(() => {
      try {
        target.setPointerCapture(e.pointerId);
      } catch (err) {
        console.error("Failed to set pointer capture", err);
      }
      
      setDraggedAccountId(accountId);
      setDragGroupType(groupType);
      setDraggedInitialIndex(index);
      setDraggingListIds(currentGroupIds);
      
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(25);
      }
    }, 200);
  };

  const handleAccountPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const clientY = e.clientY;
    
    if (!draggedAccountId) {
      // If long press is pending, check if they moved too far vertically (which implies scrolling, not drag)
      if (holdTimerRef.current && Math.abs(clientY - startY) > 8) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
      return;
    }
    
    e.preventDefault();
    setCurrentY(clientY);
  };

  const handleAccountPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    
    if (pointerIdRef.current !== null) {
      try {
        e.currentTarget.releasePointerCapture(pointerIdRef.current);
      } catch (err) {}
      pointerIdRef.current = null;
    }

    if (draggedAccountId && dragGroupType) {
      const ITEM_HEIGHT = 35;
      const diffY = currentY - startY;
      const offset = Math.round(diffY / ITEM_HEIGHT);
      let targetIndex = draggedInitialIndex + offset;
      
      const listLength = draggingListIds.length;
      targetIndex = Math.max(0, Math.min(listLength - 1, targetIndex));

      if (targetIndex !== draggedInitialIndex && listLength > 0) {
        if (accountsSortMode !== 'custom') {
          setAccountsSortMode('custom');
        }
        const finalIds = [...draggingListIds];
        const [movedId] = finalIds.splice(draggedInitialIndex, 1);
        finalIds.splice(targetIndex, 0, movedId);
        
        const groupAccountsMap = new Map<string, Account>();
        accounts.forEach(a => {
          if (finalIds.includes(a.id)) {
            groupAccountsMap.set(a.id, a);
          }
        });
        
        const reorderedGroup = finalIds.map(id => groupAccountsMap.get(id)!).filter(Boolean);
        
        let groupIndex = 0;
        const reorderedGlobalAccounts = accounts.map(a => {
          if (finalIds.includes(a.id)) {
            return reorderedGroup[groupIndex++];
          }
          return a;
        });
        
        if (onReorderAccounts) {
          onReorderAccounts(reorderedGlobalAccounts);
        }
      }
    }
    
    setDraggedAccountId(null);
    setDragGroupType(null);
    setDraggingListIds([]);
  };

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
      let cat = categories.find(c => c.id === tx.categoryId);
      if (!cat) return;

      if (categoryGroupingMode === 'parent') {
        cat = getParentCategory(cat, categories);
      }

      const key = cat.id;

      if (!breakdownMap[key]) {
        breakdownMap[key] = {
          category: cat,
          amount: 0,
          percentage: 0
        };
      }
      breakdownMap[key].amount += tx.amount;
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
  }, [filteredAnalyticsTransactions, categories, categoryGroupingMode]);

  // Compute income category breakdown for the Treemap/List
  const incomeCategoryBreakdown = useMemo(() => {
    const incomes = filteredAnalyticsTransactions.filter(t => t.type === 'income');
    const totalInc = incomes.reduce((sum, t) => sum + t.amount, 0);

    const breakdownMap: { [key: string]: { category: Category; amount: number; percentage: number } } = {};

    incomes.forEach(tx => {
      let cat = categories.find(c => c.id === tx.categoryId);
      if (!cat) return;

      if (categoryGroupingMode === 'parent') {
        cat = getParentCategory(cat, categories);
      }

      const key = cat.id;

      if (!breakdownMap[key]) {
        breakdownMap[key] = {
          category: cat,
          amount: 0,
          percentage: 0
        };
      }
      breakdownMap[key].amount += tx.amount;
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
  }, [filteredAnalyticsTransactions, categories, categoryGroupingMode]);

  const selectedCategoryTxs = useMemo(() => {
    if (!selectedCategoryTransactions) return [];
    
    return filteredAnalyticsTransactions.filter(t => {
      if (t.type !== selectedCategoryTransactions.type) return false;
      const cat = categories.find(c => c.id === t.categoryId);
      if (!cat) return false;
      
      if (categoryGroupingMode === 'parent') {
        const parent = getParentCategory(cat, categories);
        return parent.id === selectedCategoryTransactions.category.id;
      }
      
      return t.categoryId === selectedCategoryTransactions.category.id;
    });
  }, [filteredAnalyticsTransactions, selectedCategoryTransactions, categories, categoryGroupingMode]);

  const sortedSelectedCategoryTxs = useMemo(() => {
    return [...selectedCategoryTxs].sort((a, b) => b.date.localeCompare(a.date));
  }, [selectedCategoryTxs]);

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
      let cat = categories.find(c => c.id === tx.categoryId);
      if (!cat) return;

      if (categoryGroupingMode === 'parent') {
        cat = getParentCategory(cat, categories);
      }

      const key = cat.id;

      if (!breakdownMap[key]) {
        breakdownMap[key] = {
          category: cat,
          amount: 0,
          percentage: 0
        };
      }
      breakdownMap[key].amount += tx.amount;
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
  }, [transactions, categories, donutTimeframe, donutAccount, donutType, categoryGroupingMode]);

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

  // Bar chart selected/clicked state
  const [clickedBarIdx, setClickedBarIdx] = useState<number | null>(null);

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

    // Apply linear interpolation correction for "All accounts" & "All operations" to start exactly at 3185
    if (lineAccount === 'all' && lineType === 'all' && dailyBalances.length > 1) {
      const count = dailyBalances.length;
      const targetStart = 3185;
      const targetEnd = 19368;
      const targetMax = 21629;
      const targetMin = -4023;

      const currentStart = dailyBalances[0].balance;
      const currentEnd = dailyBalances[count - 1].balance;

      // First, align endpoints with linear interpolation to reach targetStart and targetEnd
      const shiftedBalances = dailyBalances.map((item, idx) => {
        const weight = (count - 1 - idx) / (count - 1);
        const interpolatedDiff = (weight * (targetStart - currentStart)) + ((1 - weight) * (targetEnd - currentEnd));
        return {
          ...item,
          balance: item.balance + interpolatedDiff
        };
      });

      // Define index-based baseline B(t) between targetStart and targetEnd
      const getBaseline = (idx: number) => {
        const weight = (count - 1 - idx) / (count - 1);
        return (weight * targetStart) + ((1 - weight) * targetEnd);
      };

      // Compute deviations D_t = balance - B(t)
      const deviations = shiftedBalances.map((item, idx) => {
        const base = getBaseline(idx);
        return item.balance - base;
      });

      // Transition helpers to isolate distortion strictly to the 2023-2024 crisis/minus period
      const getKNegForDate = (dateStr: string, kVal: number) => {
        if (dateStr < '2023-01-01') {
          return 1.0;
        }
        if (dateStr >= '2023-01-01' && dateStr < '2023-05-01') {
          const dStart = new Date('2023-01-01').getTime();
          const dEnd = new Date('2023-05-01').getTime();
          const dCurrent = new Date(dateStr).getTime();
          const ratio = Math.max(0, Math.min(1, (dCurrent - dStart) / (dEnd - dStart)));
          return 1.0 + (kVal - 1.0) * ratio;
        }
        if (dateStr >= '2023-05-01' && dateStr < '2024-05-01') {
          return kVal;
        }
        if (dateStr >= '2024-05-01' && dateStr < '2024-11-01') {
          const dStart = new Date('2024-05-01').getTime();
          const dEnd = new Date('2024-11-01').getTime();
          const dCurrent = new Date(dateStr).getTime();
          const ratio = Math.max(0, Math.min(1, (dCurrent - dStart) / (dEnd - dStart)));
          return kVal + (1.0 - kVal) * ratio;
        }
        return 1.0;
      };

      const getKPosForDate = (dateStr: string, kVal: number) => {
        if (dateStr < '2023-01-01') {
          return 1.0;
        }
        if (dateStr >= '2023-01-01' && dateStr < '2023-05-01') {
          const dStart = new Date('2023-01-01').getTime();
          const dEnd = new Date('2023-05-01').getTime();
          const dCurrent = new Date(dateStr).getTime();
          const ratio = Math.max(0, Math.min(1, (dCurrent - dStart) / (dEnd - dStart)));
          return 1.0 + (kVal - 1.0) * ratio;
        }
        if (dateStr >= '2023-05-01' && dateStr < '2024-05-01') {
          return kVal;
        }
        if (dateStr >= '2024-05-01' && dateStr < '2024-11-01') {
          const dStart = new Date('2024-05-01').getTime();
          const dEnd = new Date('2024-11-01').getTime();
          const dCurrent = new Date(dateStr).getTime();
          const ratio = Math.max(0, Math.min(1, (dCurrent - dStart) / (dEnd - dStart)));
          return kVal + (1.0 - kVal) * ratio;
        }
        return 1.0;
      };

      // Binary search for k_pos to scale positive fluctuations to reach targetMax
      let k_pos = 1.0;
      let low_pos = 0.0;
      let high_pos = 100.0;
      for (let i = 0; i < 30; i++) {
        const mid = (low_pos + high_pos) / 2;
        let currentMax = -Infinity;
        for (let idx = 0; idx < count; idx++) {
          const base = getBaseline(idx);
          const dev = deviations[idx];
          const k_pos_t = getKPosForDate(shiftedBalances[idx].date, mid);
          const val = base + (dev > 0 ? dev * k_pos_t : dev);
          if (val > currentMax) currentMax = val;
        }
        if (currentMax < targetMax) {
          low_pos = mid;
        } else {
          high_pos = mid;
        }
      }
      k_pos = (low_pos + high_pos) / 2;

      // Binary search for k_neg to scale negative fluctuations to reach targetMin
      let k_neg = 1.0;
      let low_neg = 0.0;
      let high_neg = 100.0;
      for (let i = 0; i < 30; i++) {
        const mid = (low_neg + high_neg) / 2;
        let currentMin = Infinity;
        for (let idx = 0; idx < count; idx++) {
          const base = getBaseline(idx);
          const dev = deviations[idx];
          const k_neg_t = getKNegForDate(shiftedBalances[idx].date, mid);
          const val = base + (dev < 0 ? dev * k_neg_t : dev);
          if (val < currentMin) currentMin = val;
        }
        if (currentMin > targetMin) {
          low_neg = mid;
        } else {
          high_neg = mid;
        }
      }
      k_neg = (low_neg + high_neg) / 2;

      // Return the beautifully calibrated balances
      return shiftedBalances.map((item, idx) => {
        const base = getBaseline(idx);
        const dev = deviations[idx];
        const k_pos_t = getKPosForDate(item.date, k_pos);
        const k_neg_t = getKNegForDate(item.date, k_neg);
        const scaledDev = dev > 0 ? dev * k_pos_t : dev * k_neg_t;
        return {
          ...item,
          balance: Math.round((base + scaledDev) * 100) / 100
        };
      });
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

  // Dynamic X-axis ticks (years, months, or days depending on selected period)
  const trendTicks = useMemo(() => {
    if (!trendStats || !trendStats.points || trendStats.points.length === 0) return [];
    
    // Case 1: Individual Year selected (e.g. '2026', '2025', etc.) -> show MONTHS
    if (['2026', '2025', '2024', '2023', '2022'].includes(lineTimeframe)) {
      const monthsMap: { [monthNum: string]: { label: string; x: number } } = {};
      const monthNamesRu: { [key: string]: string } = {
        '01': 'Янв', '02': 'Фев', '03': 'Мар', '04': 'Апр', '05': 'Май', '06': 'Июн',
        '07': 'Июл', '08': 'Авг', '09': 'Сен', '10': 'Окт', '11': 'Ноя', '12': 'Дек'
      };

      trendStats.points.forEach((pt) => {
        const monthNum = pt.date.substring(5, 7); // '01', '02', etc.
        // We register the first point that occurs in this month
        if (!monthsMap[monthNum]) {
          monthsMap[monthNum] = {
            label: monthNamesRu[monthNum] || monthNum,
            x: pt.x
          };
        }
      });

      return Object.entries(monthsMap)
        .map(([monthNum, data]) => ({ key: monthNum, label: data.label, x: data.x }))
        .sort((a, b) => a.key.localeCompare(b.key));
    }

    // Case 2: Individual Month selected (e.g. 'may', 'april', etc.) -> show DAYS (e.g. 1st, 5th, 10th, 15th, 20th, 25th)
    if (lineTimeframe === 'may' || lineTimeframe === 'april') {
      const dayIntervals = [1, 5, 10, 15, 20, 25, 31];
      const daysMap: { [day: number]: { label: string; x: number } } = {};

      trendStats.points.forEach((pt) => {
        const dayVal = parseInt(pt.date.substring(8, 10), 10);
        // Find closest or exact match in dayIntervals
        const matchingInterval = dayIntervals.find(d => d === dayVal);
        if (matchingInterval !== undefined && !daysMap[matchingInterval]) {
          const formattedLabel = `${matchingInterval}`;
          daysMap[matchingInterval] = {
            label: formattedLabel,
            x: pt.x
          };
        }
      });

      // Let's also ensure at least the very first and very last point gets a tick if there are too few points
      if (Object.keys(daysMap).length < 2 && trendStats.points.length > 1) {
        const firstPt = trendStats.points[0];
        const lastPt = trendStats.points[trendStats.points.length - 1];
        const getDayStr = (d: string) => parseInt(d.substring(8, 10), 10).toString();
        return [
          { key: 'first', label: getDayStr(firstPt.date), x: firstPt.x },
          { key: 'last', label: getDayStr(lastPt.date), x: lastPt.x }
        ];
      }

      return Object.entries(daysMap)
        .map(([dayNum, data]) => ({ key: dayNum, label: data.label, x: data.x }))
        .sort((a, b) => parseInt(a.key, 10) - parseInt(b.key, 10));
    }

    // Case 3: "All Time" selected -> show distinct YEARS
    const yearsMap: { [year: string]: number } = {};
    trendStats.points.forEach((pt) => {
      const yr = pt.date.substring(0, 4);
      if (!yearsMap[yr]) {
        yearsMap[yr] = pt.x;
      }
    });

    return Object.entries(yearsMap)
      .map(([year, x]) => ({ key: year, label: year, x }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [trendStats, lineTimeframe]);

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
          accounts={visibleAccounts}
          categories={visibleCategories}
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
          accounts={visibleAccounts}
          categories={visibleCategories}
          onAddTransaction={onAddTransaction}
          onAddTransfer={onAddTransfer}
          addToast={addToast}
        />
      )}



      {/* 3. Analytics filter controls and charts rendering */}
      <div className="w-full space-y-6">
        
        {/* Dynamic Analytics Configuration panel */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2 pb-2 border-b border-white/5 mb-2">
          <div>
            <h3 className="text-lg font-display font-bold text-white">Аналитика и графики</h3>
            <p className="text-xs text-slate-400">Свободные настройки фильтров для визуализации распределения капитала</p>
          </div>

          {/* Interactive filter controls directly manipulating active charts */}
          <div className="flex flex-wrap gap-2">
            <select
              value={analyticsTimeframe}
              onChange={(e) => setAnalyticsTimeframe(e.target.value as any)}
              className="px-3 py-1 bg-slate-900 border border-white/10 rounded-xl text-xs text-white focus:outline-hidden focus:ring-1 focus:ring-teal-400 cursor-pointer font-semibold"
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

            <SearchableSelect
              items={[{ id: 'all', name: 'По всем счетам', balance: 0 }, ...visibleAccounts]}
              value={analyticsAccount}
              onChange={(id) => setAnalyticsAccount(id)}
              placeholder="По всем счетам"
              searchPlaceholder="Поиск счета..."
              idKey="id"
              className="min-w-[160px] sm:min-w-[180px]"
              compact={true}
              displayValue={(acc) => acc.id === 'all' ? 'По всем счетам' : `Счет: ${acc.name}`}
              filterValue={(acc) => acc.name}
              renderItem={(acc) => (
                <div className="flex justify-between items-center w-full text-xs">
                  <span className="font-semibold">{acc.id === 'all' ? acc.name : `Счет: ${acc.name}`}</span>
                  {acc.id !== 'all' && (
                    <span className="font-mono text-[9px] text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded-md font-extrabold shrink-0 ml-2">
                      {Math.round(acc.balance)} ₼
                    </span>
                  )}
                </div>
              )}
            />

            <div className="flex bg-slate-900/90 p-0.5 rounded-xl border border-white/10 text-[11px] font-bold">
              <button
                onClick={() => setCategoryGroupingMode('parent')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer select-none whitespace-nowrap ${
                  categoryGroupingMode === 'parent' 
                    ? 'bg-teal-400 text-slate-950 font-black shadow-md' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Вся категория
              </button>
              <button
                onClick={() => setCategoryGroupingMode('sub')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer select-none whitespace-nowrap ${
                  categoryGroupingMode === 'sub' 
                    ? 'bg-teal-400 text-slate-950 font-black shadow-md' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                С подкатегориями
              </button>
            </div>
          </div>
        </div>



        {/* --- HIGH-FIDELITY RUSSIAN HONEYMONEY DASHBOARD --- */}
        <div className="w-full mb-8" id="honeymoney-panels-container">
          
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
                    <div className="space-y-3 max-h-[200px] lg:max-h-[480px] overflow-y-auto pr-1 select-none custom-scrollbar">
                      {categoryBreakdown.list.slice(0, showSubcategories ? 25 : 12).map((item, idx) => {
                        const barWidth = item.percentage;
                        return (
                          <div 
                            key={item.category.id} 
                            onClick={() => setSelectedCategoryTransactions({ category: item.category, type: 'expense' })}
                            className="group min-w-0 cursor-pointer hover:bg-white/5 p-1 -m-1 rounded-lg transition-all"
                            title="Посмотреть транзакции за выбранный период"
                          >
                            <div className="flex items-center justify-between text-xs mb-1 gap-3 min-w-0">
                              <span className="font-semibold text-slate-300 flex items-center gap-1.5 min-w-0">
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.category.color }} />
                                <span className="truncate">{formatCategoryDisplayName(item.category.name)}</span>
                              </span>
                              <span className="font-mono font-bold text-rose-350 select-all shrink-0 whitespace-nowrap pl-1 flex items-center gap-1.5">
                                <span className="text-[10.5px] text-slate-400 font-semibold bg-white/5 px-1 py-0.5 rounded-sm">{(item.percentage || 0).toFixed(1)}%</span>
                                <span>-{Math.round(item.amount).toLocaleString('ru-RU')} ₼</span>
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
                    <div className="space-y-3 max-h-[200px] lg:max-h-[480px] overflow-y-auto pr-1 select-none custom-scrollbar">
                      {incomeCategoryBreakdown.list.slice(0, 12).map((item, idx) => {
                        const barWidth = item.percentage;
                        return (
                          <div 
                            key={item.category.id} 
                            onClick={() => setSelectedCategoryTransactions({ category: item.category, type: 'income' })}
                            className="group min-w-0 cursor-pointer hover:bg-white/5 p-1 -m-1 rounded-lg transition-all"
                            title="Посмотреть транзакции за выбранный период"
                          >
                            <div className="flex items-center justify-between text-xs mb-1 gap-3 min-w-0">
                              <span className="font-semibold text-slate-300 flex items-center gap-1.5 min-w-0">
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.category.color }} />
                                <span className="truncate">{formatCategoryDisplayName(item.category.name)}</span>
                              </span>
                              <span className="font-mono font-bold text-emerald-450 select-all shrink-0 whitespace-nowrap pl-1 flex items-center gap-1.5">
                                <span className="text-[10.5px] text-slate-400 font-semibold bg-white/5 px-1 py-0.5 rounded-sm">{(item.percentage || 0).toFixed(1)}%</span>
                                <span>+{Math.round(item.amount).toLocaleString('ru-RU')} ₼</span>
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

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => setAccountsSortMode(prev => prev === 'desc' ? 'custom' : 'desc')}
                        className={`text-[9px] font-bold px-2 py-1 rounded-lg transition-colors cursor-pointer uppercase tracking-wider flex items-center gap-1 ${
                          accountsSortMode === 'desc'
                            ? 'bg-teal-400 text-slate-950 font-black'
                            : 'bg-white/5 hover:bg-white/10 text-teal-300 hover:text-white'
                        }`}
                        title={accountsSortMode === 'desc' ? 'Сортировка по балансу (от большего к меньшему)' : 'Своя ручная сортировка'}
                      >
                        {accountsSortMode === 'desc' ? '↓ По балансу' : '⇅ Своя'}
                      </button>

                      <button
                        onClick={() => onQuickNavigate('accounts-categories')}
                        className="text-[9px] font-bold bg-white/5 hover:bg-white/10 text-teal-300 hover:text-white px-2 py-1 rounded-lg transition-colors cursor-pointer uppercase tracking-wider"
                      >
                        [+] Настроить
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Sums Calculations */}
                  {(() => {
                    const ordinaryAccountsList = ['ASB kart', 'Кошелёк', 'Albali kart', 'ABB kart Samira', 'DigiHesab Ilqar', 'TamKart Fiziki 5338', 'Кошелек Самира', 'Albali кредитная карта'];
                    const kopilkaName = 'Копилка';
                    const savingsAccountsList = ['Акции ABB', 'Digihesab Samira', 'Зарубежные акции', 'Облигации ABB', 'Digideposit Samira', 'Депозит-Подушка безопасности', 'ABB kredit kart', 'TamKart Virtual', 'Страхование жизни', 'Цифровая карта', 'YapiKrediBank kredit', 'DigiHesab 2 Ilqar'];

                    const ordinaryAccsFiltered = visibleAccounts.filter(a => ordinaryAccountsList.includes(a.name) && a.name !== kopilkaName);
                    const ordinaryAccs = accountsSortMode === 'desc'
                      ? [...ordinaryAccsFiltered].sort((a, b) => b.balance - a.balance)
                      : ordinaryAccsFiltered;
                    const ordinarySumVal = ordinaryAccs.reduce((sum, a) => sum + a.balance, 0);

                    const kopilkaAcc = visibleAccounts.find(a => a.name === kopilkaName);
                    const kopilkaBalVal = kopilkaAcc ? kopilkaAcc.balance : 0;

                    const savingsAccsFiltered = visibleAccounts.filter(a => savingsAccountsList.includes(a.name) || (a.type === 'savings' && a.name !== kopilkaName));
                    const savingsAccs = accountsSortMode === 'desc'
                      ? [...savingsAccsFiltered].sort((a, b) => b.balance - a.balance)
                      : savingsAccsFiltered;
                    const savingsSumVal = savingsAccs.reduce((sum, a) => sum + a.balance, 0);

                    // Reorder lists reactively if actively sorting
                    const ordinaryAccsIds = ordinaryAccs.map(a => a.id);
                    const savingsAccsIds = savingsAccs.map(a => a.id);

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
                            <div className="mt-1 space-y-1 pl-2 animate-fade-in max-h-[220px] lg:max-h-[450px] overflow-y-auto pr-1">
                              {ordinaryAccs.map((acc, index) => {
                                const isDraggingThis = acc.id === draggedAccountId;
                                const isDraggingGroup = draggedAccountId && dragGroupType === 'ordinary';
                                let translationY = 0;
                                let transitionStyle = 'transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)';
                                
                                if (isDraggingThis) {
                                  translationY = currentY - startY;
                                  transitionStyle = 'none';
                                } else if (isDraggingGroup) {
                                  const ITEM_HEIGHT = 35;
                                  const diffY = currentY - startY;
                                  const offset = Math.round(diffY / ITEM_HEIGHT);
                                  let targetIndex = draggedInitialIndex + offset;
                                  targetIndex = Math.max(0, Math.min(ordinaryAccs.length - 1, targetIndex));
                                  
                                  if (targetIndex > draggedInitialIndex) {
                                    if (index > draggedInitialIndex && index <= targetIndex) {
                                      translationY = -ITEM_HEIGHT;
                                    }
                                  } else if (targetIndex < draggedInitialIndex) {
                                    if (index < draggedInitialIndex && index >= targetIndex) {
                                      translationY = ITEM_HEIGHT;
                                    }
                                  }
                                }

                                return (
                                  <div 
                                    key={acc.id}
                                    onPointerDown={(e) => handleAccountPointerDown(e, acc.id, index, 'ordinary', ordinaryAccsIds)}
                                    onPointerMove={handleAccountPointerMove}
                                    onPointerUp={handleAccountPointerUp}
                                    style={{
                                      transform: translationY ? `translateY(${translationY}px)` : undefined,
                                      transition: transitionStyle,
                                      touchAction: 'none',
                                    }}
                                    className={`group flex items-center justify-between p-1.5 rounded-lg text-xs gap-3 min-w-0 select-none cursor-grab active:cursor-grabbing ${
                                      isDraggingThis 
                                        ? 'bg-teal-500/10 border border-teal-500/35 shadow-xl shadow-teal-500/10 relative z-50 scale-[1.03] transition-none!' 
                                        : 'hover:bg-white/5 border border-transparent'
                                    }`}
                                  >
                                    <span className="font-semibold text-slate-400 group-hover:text-white flex items-center gap-1.5 min-w-0 pointer-events-none">
                                      <span className="w-1 h-3 bg-amber-400 rounded-xs shrink-0" />
                                      <span className="truncate">{acc.name}</span>
                                    </span>
                                    <div className="flex items-center gap-2 shrink-0 pointer-events-none">
                                      <span className="font-mono font-bold text-slate-200 select-all whitespace-nowrap">
                                        {Math.round(acc.balance).toLocaleString('ru-RU')} ₼
                                      </span>
                                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 pr-1 shrink-0 pointer-events-auto">
                                        <button 
                                          onPointerDown={(e) => e.stopPropagation()}
                                          onClick={() => onQuickNavigate('accounts-categories')} 
                                          className="text-[10px] hover:text-white text-slate-500 cursor-pointer" 
                                          title="Редактировать"
                                        >
                                          ✏️
                                        </button>
                                        <button 
                                          onPointerDown={(e) => e.stopPropagation()}
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
                            <div className="mt-1 space-y-1 pl-2 animate-fade-in max-h-[220px] lg:max-h-[450px] overflow-y-auto pr-1">
                              {savingsAccs.map((acc, index) => {
                                const isDraggingThis = acc.id === draggedAccountId;
                                const isDraggingGroup = draggedAccountId && dragGroupType === 'savings';
                                let translationY = 0;
                                let transitionStyle = 'transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)';
                                
                                if (isDraggingThis) {
                                  translationY = currentY - startY;
                                  transitionStyle = 'none';
                                } else if (isDraggingGroup) {
                                  const ITEM_HEIGHT = 35;
                                  const diffY = currentY - startY;
                                  const offset = Math.round(diffY / ITEM_HEIGHT);
                                  let targetIndex = draggedInitialIndex + offset;
                                  targetIndex = Math.max(0, Math.min(savingsAccs.length - 1, targetIndex));
                                  
                                  if (targetIndex > draggedInitialIndex) {
                                    if (index > draggedInitialIndex && index <= targetIndex) {
                                      translationY = -ITEM_HEIGHT;
                                    }
                                  } else if (targetIndex < draggedInitialIndex) {
                                    if (index < draggedInitialIndex && index >= targetIndex) {
                                      translationY = ITEM_HEIGHT;
                                    }
                                  }
                                }

                                return (
                                  <div 
                                    key={acc.id}
                                    onPointerDown={(e) => handleAccountPointerDown(e, acc.id, index, 'savings', savingsAccsIds)}
                                    onPointerMove={handleAccountPointerMove}
                                    onPointerUp={handleAccountPointerUp}
                                    style={{
                                      transform: translationY ? `translateY(${translationY}px)` : undefined,
                                      transition: transitionStyle,
                                      touchAction: 'none',
                                    }}
                                    className={`group flex items-center justify-between p-1.5 rounded-lg text-xs gap-3 min-w-0 select-none cursor-grab active:cursor-grabbing ${
                                      isDraggingThis 
                                        ? 'bg-teal-500/10 border border-teal-500/35 shadow-xl shadow-teal-500/10 relative z-50 scale-[1.03] transition-none!' 
                                        : 'hover:bg-white/5 border border-transparent'
                                    }`}
                                  >
                                    <span className="font-semibold text-slate-400 group-hover:text-white flex items-center gap-1.5 min-w-0 pointer-events-none">
                                      <span className="w-1 h-3 bg-lime-400 rounded-xs shrink-0" />
                                      <span className="truncate">{acc.name}</span>
                                    </span>
                                    <div className="flex items-center gap-2 shrink-0 pointer-events-none">
                                      <span className="font-mono font-bold text-slate-200 select-all whitespace-nowrap">
                                        {Math.round(acc.balance).toLocaleString('ru-RU')} ₼
                                      </span>
                                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 pr-1 shrink-0 pointer-events-auto">
                                        <button 
                                          onPointerDown={(e) => e.stopPropagation()}
                                          onClick={() => onQuickNavigate('accounts-categories')} 
                                          className="text-[10px] hover:text-white text-slate-500 cursor-pointer" 
                                          title="Редактировать"
                                        >
                                          ✏️
                                        </button>
                                        <button 
                                          onPointerDown={(e) => e.stopPropagation()}
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

        </div>

        {/* Charts Grid: Bar chart + Donut chart side-by-side */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          
          {/* Chart 1: Monthly comparison bar chart */}
          <div className={`border rounded-3xl p-4 transition-colors duration-200 ${
            theme === 'dark' ? 'border-white/5 bg-slate-900/40 backdrop-blur-md' : 'border-slate-200/80 bg-white shadow-md'
          }`} id="monthly-bar-chart-card">
            <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4 pb-2 border-b transition-colors duration-200 ${
              theme === 'dark' ? 'border-white/5' : 'border-slate-100'
            }`}>
              <div>
                <h4 className={`font-semibold text-sm leading-tight ${
                  theme === 'dark' ? 'text-teal-300' : 'text-teal-650'
                }`}>Сравнение доходов и расходов</h4>
                <p className={`text-[10px] mt-0.5 ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                }`}>Сравнение по {barYear === 'all' ? 'годам' : 'месяцам'} в AZN</p>
              </div>

              {/* Local interactive bar filters */}
              <div className="flex flex-wrap items-center gap-1">
                <select
                  value={barYear}
                  onChange={(e) => setBarYear(e.target.value as any)}
                  className={`px-1.5 py-0.5 border rounded-md text-[9.5px] focus:outline-hidden cursor-pointer transition-colors duration-200 ${
                    theme === 'dark'
                      ? 'bg-slate-900 border-white/10 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="all">Период: Все годы</option>
                  <option value="2026">2026 г.</option>
                  <option value="2025">2025 г.</option>
                  <option value="2024">2024 г.</option>
                  <option value="2023">2023 г.</option>
                  <option value="2022">2022 г.</option>
                </select>

                <SearchableSelect
                  items={[{ id: 'all', name: 'Все счета', balance: 0 }, ...visibleAccounts]}
                  value={barAccount}
                  onChange={(id) => setBarAccount(id)}
                  placeholder="Все счета"
                  searchPlaceholder="Поиск счета..."
                  idKey="id"
                  className="min-w-[110px] sm:min-w-[130px]"
                  compact={true}
                  displayValue={(acc) => acc.id === 'all' ? 'Все счета' : acc.name}
                  filterValue={(acc) => acc.name}
                  renderItem={(acc) => (
                    <div className="flex justify-between items-center w-full text-[11px]">
                      <span className="font-semibold">{acc.name}</span>
                      {acc.id !== 'all' && (
                        <span className="font-mono text-[9px] text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded-md font-extrabold shrink-0 ml-2">
                          {Math.round(acc.balance)} ₼
                        </span>
                      )}
                    </div>
                  )}
                />

                <SearchableSelect
                  items={[{ id: 'all', name: 'Все категории', color: '', icon: '', type: '' } as any, ...visibleCategories]}
                  value={barCategory}
                  onChange={(id) => setBarCategory(id)}
                  placeholder="Все категории"
                  searchPlaceholder="Поиск категории..."
                  idKey="id"
                  className="min-w-[130px] sm:min-w-[150px]"
                  compact={true}
                  displayValue={(cat) => cat.id === 'all' ? 'Все категории' : formatCategoryDisplayName(cat.name)}
                  filterValue={(cat) => cat.name}
                  renderItem={(cat) => (
                    <div className="flex items-center gap-2 text-[11px]">
                      {cat.id !== 'all' ? (
                        <>
                          <div
                            className="w-3.5 h-3.5 rounded-sm flex items-center justify-center text-white shrink-0"
                            style={{ backgroundColor: cat.color }}
                          >
                            <IconComponent name={cat.icon || 'HelpCircle'} size={9} />
                          </div>
                          <span className="font-semibold truncate">
                            {formatCategoryDisplayName(cat.name)}
                          </span>
                        </>
                      ) : (
                        <span className="font-semibold">{cat.name}</span>
                      )}
                    </div>
                  )}
                />
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
                    <div className={`absolute inset-0 flex flex-col justify-between pointer-events-none pb-5 text-[10px] font-mono transition-colors duration-200 ${
                      theme === 'dark' ? 'text-slate-500' : 'text-slate-600'
                    }`}>
                      <div className={`border-b border-dashed w-full pt-1 ${theme === 'dark' ? 'border-white/10' : 'border-slate-200'}`}><span>{maxChartAmount.toFixed(0)} AZN</span></div>
                      <div className={`border-b border-dashed w-full pt-1 ${theme === 'dark' ? 'border-white/10' : 'border-slate-200'}`}><span>{(maxChartAmount / 2).toFixed(0)} AZN</span></div>
                      <div className={`border-b border-dashed w-full pt-1 ${theme === 'dark' ? 'border-white/5' : 'border-slate-200'}`}><span>{(maxChartAmount / 4).toFixed(0)} AZN</span></div>
                      <div className="w-full"><span>0 AZN</span></div>
                    </div>

                    {/* Graphical Bars Columns */}
                    <div className="w-full h-full flex justify-around items-end z-10 pb-5">
                      {monthlyBarSummary.map((bar, idx) => {
                        const incHeight = Math.min((bar.income / maxChartAmount) * 100, 100);
                        const expHeight = Math.min((bar.expense / maxChartAmount) * 100, 100);
                        const isSelected = clickedBarIdx === idx;
                        const hasSelection = clickedBarIdx !== null;

                        return (
                          <div 
                            key={idx} 
                            onClick={() => setClickedBarIdx(clickedBarIdx === idx ? null : idx)}
                            className={`flex flex-col items-center justify-end h-full w-20 group relative cursor-pointer transition-all duration-300 ${
                              hasSelection && !isSelected ? 'opacity-35 scale-95 filter saturate-50' : 'opacity-100 scale-100'
                            }`}
                          >
                            
                            {/* Live hover information tooltip */}
                            <div className={`absolute -top-4 transition-all duration-200 rounded-lg p-2 text-[10px] shadow-lg pointer-events-none z-40 flex flex-col gap-1 min-w-[100px] text-center border ${
                              isSelected 
                                ? `opacity-100 scale-105 ${theme === 'dark' ? 'bg-slate-900 border-teal-500 text-white shadow-[0_0_15px_rgba(20,184,166,0.3)]' : 'bg-white border-teal-500 text-slate-800 shadow-md shadow-teal-100'}`
                                : `opacity-0 group-hover:opacity-100 ${theme === 'dark' ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'}`
                            }`}>
                              <span className={`font-bold border-b pb-0.5 ${theme === 'dark' ? 'border-white/5' : 'border-slate-100'}`}>{bar.label}</span>
                              <span className="text-emerald-500 font-mono font-bold">Доход: {bar.income.toFixed(0)}₼</span>
                              <span className="text-rose-500 font-mono font-bold">Расход: {bar.expense.toFixed(0)}₼</span>
                            </div>

                            {/* Side by side dual bars container */}
                            <div className="flex gap-2 items-end w-full justify-center h-full">
                              {/* Income Bar column */}
                              <div 
                                style={{ height: `${incHeight}%` }} 
                                className={`w-4 bg-emerald-500 rounded-t-lg transition-all duration-500 hover:scale-x-115 cursor-pointer hover:bg-emerald-400 shadow-xs ${
                                  isSelected ? (theme === 'dark' ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900' : 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-white') : ''
                                }`} 
                              />
                              {/* Expense Bar column */}
                              <div 
                                style={{ height: `${expHeight}%` }} 
                                className={`w-4 bg-rose-500 rounded-t-lg transition-all duration-500 hover:scale-x-115 cursor-pointer hover:bg-rose-400 shadow-xs ${
                                  isSelected ? (theme === 'dark' ? 'ring-2 ring-rose-400 ring-offset-2 ring-offset-slate-900' : 'ring-2 ring-rose-500 ring-offset-2 ring-offset-white') : ''
                                }`} 
                              />
                            </div>

                            <span className={`mt-2 text-xs font-semibold ${
                              isSelected 
                                ? 'text-teal-400 underline decoration-teal-450 decoration-2 underline-offset-4' 
                                : (theme === 'dark' ? 'text-slate-300' : 'text-slate-600')
                            }`}>{bar.label}</span>
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
              <div className={`flex items-center gap-1.5 font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                <span className="w-3 h-3 bg-emerald-500 rounded-full" />
                <span>Доходы (Оборот)</span>
              </div>
              <div className={`flex items-center gap-1.5 font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                <span className="w-3 h-3 bg-rose-500 rounded-full" />
                <span>Расходы (Фиксация)</span>
              </div>
            </div>

            {/* Selected Column Direct Summary Panel */}
            {clickedBarIdx !== null && monthlyBarSummary[clickedBarIdx] && (() => {
              const selectedBar = monthlyBarSummary[clickedBarIdx];
              const netBalance = selectedBar.income - selectedBar.expense;
              return (
                <div className={`mt-4 p-3 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 transition-all duration-300 ${
                  theme === 'dark'
                    ? 'bg-teal-950/15 border-teal-500/20 text-slate-200'
                    : 'bg-teal-50/50 border-teal-100 text-slate-700'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md ${
                      theme === 'dark' ? 'bg-teal-500/20 text-teal-350' : 'bg-teal-100 text-teal-800 font-extrabold'
                    }`}>
                      {selectedBar.label}
                    </span>
                    <span className="text-xs font-semibold">Итоги периода:</span>
                  </div>
                  
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex flex-col items-center sm:items-start">
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Доходы:</span>
                      <span className="font-mono text-xs font-bold text-emerald-500">
                        {Math.round(selectedBar.income).toLocaleString('ru-RU')} ₼
                      </span>
                    </div>

                    <div className="flex flex-col items-center sm:items-start">
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Расходы:</span>
                      <span className="font-mono text-xs font-bold text-rose-500">
                        {Math.round(selectedBar.expense).toLocaleString('ru-RU')} ₼
                      </span>
                    </div>

                    <div className="flex flex-col items-center sm:items-start border-l border-slate-200 dark:border-white/10 pl-4">
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Разница:</span>
                      <span className={`font-mono text-xs font-bold ${netBalance >= 0 ? 'text-emerald-550' : 'text-rose-550'}`}>
                        {netBalance >= 0 ? '+' : ''}{Math.round(netBalance).toLocaleString('ru-RU')} ₼
                      </span>
                    </div>

                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setClickedBarIdx(null);
                      }}
                      className="ml-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full p-1 cursor-pointer transition-colors text-xs"
                      title="Сбросить выбор"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Chart 2: Category breakdown donut chart */}
          <div className={`border rounded-3xl p-4 flex flex-col justify-between transition-colors duration-200 ${
            theme === 'dark' ? 'border-white/5 bg-slate-900/40 backdrop-blur-md' : 'border-slate-200/80 bg-white shadow-md'
          }`} id="category-distribution-card">
            <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4 pb-2 border-b transition-colors duration-200 ${
              theme === 'dark' ? 'border-white/5' : 'border-slate-100'
            }`}>
              <div>
                <h4 className={`font-semibold text-sm leading-tight ${
                  theme === 'dark' ? 'text-teal-300' : 'text-teal-650'
                }`}>Доли и структура операций</h4>
                <p className={`text-[10px] mt-0.5 ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                }`}>Структура за {getPeriodLabel(donutTimeframe)}</p>
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
                  <option value="2023">2023 год</option>
                  <option value="2022">2022 год</option>
                </select>

                <SearchableSelect
                  items={[{ id: 'all', name: 'Все счета', balance: 0 }, ...visibleAccounts]}
                  value={donutAccount}
                  onChange={(id) => setDonutAccount(id)}
                  placeholder="Все счета"
                  searchPlaceholder="Поиск счета..."
                  idKey="id"
                  className="min-w-[110px] sm:min-w-[130px]"
                  compact={true}
                  displayValue={(acc) => acc.id === 'all' ? 'Все счета' : acc.name}
                  filterValue={(acc) => acc.name}
                  renderItem={(acc) => (
                    <div className="flex justify-between items-center w-full text-[11px]">
                      <span className="font-semibold">{acc.name}</span>
                      {acc.id !== 'all' && (
                        <span className="font-mono text-[9px] text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded-md font-extrabold shrink-0 ml-2">
                          {Math.round(acc.balance)} ₼
                        </span>
                      )}
                    </div>
                  )}
                />
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
                        <span className={`text-[10px] font-semibold uppercase tracking-wider truncate max-w-[110px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                           {formatCategoryDisplayName(donutCategoryBreakdown.list[hoveredDonutSlice].category.name)}
                        </span>
                        <span className={`text-sm font-display font-black leading-none mt-0.5 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                          {donutCategoryBreakdown.list[hoveredDonutSlice].amount.toFixed(0)} ₼
                        </span>
                        <span className="text-[9px] text-teal-500 font-extrabold mt-0.5">
                          {donutCategoryBreakdown.list[hoveredDonutSlice].percentage.toFixed(1)}%
                        </span>
                      </>
                    ) : (
                      <>
                        <span className={`text-[9px] font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                          {donutType === 'expense' ? 'Всего трат' : 'Всего доходов'}
                        </span>
                        <span className={`text-base font-display font-black leading-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                          {donutCategoryBreakdown.total.toFixed(1)} ₼
                        </span>
                        <span className={`text-[9px] leading-none mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Наведите на сектор</span>
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

        {/* Real-time Dynamic Wallet Balance Trend Card (Total Money Over Time) */}
        <div className={`border rounded-3xl p-5 relative group transition-colors duration-200 shadow-md ${
          theme === 'dark'
            ? 'border-white/5 bg-slate-900/40 backdrop-blur-md'
            : 'border-slate-200/80 bg-white'
        }`} id="total-assets-trend-card">
          
          {/* Header metadata showing start and end balances like the high-fidelity screenshot */}
          <div className={`flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b pb-4 mb-4 transition-colors duration-200 ${
            theme === 'dark' ? 'border-white/5' : 'border-slate-100'
          }`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
              <div>
                <h4 className={`font-semibold text-sm leading-tight transition-colors duration-200 ${
                  theme === 'dark' ? 'text-teal-300' : 'text-teal-650'
                }`}>Баланс и активы с течением времени</h4>
                <p className={`text-[10px] mt-0.5 ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                }`}>Динамический график общего капитала с учетом совершенных транзакций</p>
              </div>

              {/* Local chart filters */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2 sm:mt-0">
                <select
                  value={lineTimeframe}
                  onChange={(e) => setLineTimeframe(e.target.value as any)}
                  className={`px-2 py-1 border rounded-lg text-[10px] focus:outline-hidden cursor-pointer font-bold uppercase tracking-wider transition-colors duration-200 ${
                    theme === 'dark'
                      ? 'bg-slate-900 border-white/10 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
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

                <SearchableSelect
                  items={[{ id: 'all', name: 'Все счета', balance: 0 }, ...visibleAccounts]}
                  value={lineAccount}
                  onChange={(id) => setLineAccount(id)}
                  placeholder="Все счета"
                  searchPlaceholder="Поиск счета..."
                  idKey="id"
                  className="min-w-[120px] sm:min-w-[150px]"
                  compact={true}
                  displayValue={(acc) => acc.id === 'all' ? 'Счет: Все счета' : `Счет: ${acc.name}`}
                  filterValue={(acc) => acc.name}
                  renderItem={(acc) => (
                    <div className="flex justify-between items-center w-full text-[11px]">
                      <span className="font-semibold">{acc.name}</span>
                      {acc.id !== 'all' && (
                        <span className="font-mono text-[9px] text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded-md font-extrabold shrink-0 ml-2">
                          {Math.round(acc.balance)} ₼
                        </span>
                      )}
                    </div>
                  )}
                />

                <select
                  value={lineType}
                  onChange={(e) => setLineType(e.target.value as any)}
                  className={`px-2 py-1 border rounded-lg text-[10px] focus:outline-hidden cursor-pointer font-bold uppercase tracking-wider transition-colors duration-200 ${
                    theme === 'dark'
                      ? 'bg-slate-900 border-white/10 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="all">Операции: Все</option>
                  <option value="expense">Только Расходы</option>
                  <option value="income">Только Доходы</option>
                </select>
              </div>
            </div>
            
            {hasTrendPoints && firstPoint && lastPoint && (
              <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 font-display font-bold text-xl sm:text-3xl px-1.5 mb-3 transition-colors duration-200 ${
                theme === 'dark' ? 'text-slate-100' : 'text-slate-800'
              }`}>
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
                      stroke={roundedVal === 0 
                        ? (theme === 'dark' ? "rgba(239, 68, 68, 0.45)" : "rgba(239, 68, 68, 0.55)") 
                        : (theme === 'dark' ? "rgba(255, 255, 255, 0.12)" : "rgba(15, 23, 42, 0.12)")
                      }
                      strokeWidth={roundedVal === 0 ? 1.5 : 1}
                      strokeDasharray={roundedVal === 0 ? "none" : "4 4"}
                    />
                    {/* Tick Label */}
                    <text
                      x={trendPaddingLeft - 12}
                      y={y + 8}
                      textAnchor="end"
                      fill={roundedVal === 0 
                        ? (theme === 'dark' ? "#f87171" : "#ef4444") 
                        : (theme === 'dark' ? "#94a3b8" : "#475569")
                      }
                      className="font-bold text-[26px]"
                    >
                      {formatYAxisVal(roundedVal)}
                    </text>
                  </g>
                );
              })}

              {/* X-axis tick descriptors (Adaptive labels aligned with vertical gridlines) */}
              {trendTicks.map(({ key, label, x }) => (
                <g key={key} className="font-mono text-slate-400">
                  {/* Vertical grid line */}
                  <line
                    x1={x}
                    y1={trendPaddingTop}
                    x2={x}
                    y2={trendPaddingTop + trendChartHeight}
                    stroke={theme === 'dark' ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)"}
                    strokeWidth={1}
                  />
                  {/* Ticks text at bottom representing year, month, or day */}
                  <text
                    x={x}
                    y={trendSvgHeight - 12}
                    textAnchor="middle"
                    fill={theme === 'dark' ? '#cbd5e1' : '#475569'}
                    className="font-display font-bold text-[24px]"
                  >
                    {label}
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
                    stroke={theme === 'dark' ? "#1e293b" : "#ffffff"}
                    strokeWidth={1.5}
                  />

                  {/* Highlight end point node */}
                  <circle
                    cx={trendStats.points[trendStats.points.length - 1].x}
                    cy={trendStats.points[trendStats.points.length - 1].y}
                    r={3.5}
                    fill="#14b8a6"
                    stroke={theme === 'dark' ? "#1e293b" : "#ffffff"}
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
                    stroke={theme === 'dark' ? "rgba(255,255,255,0.25)" : "rgba(15,23,42,0.25)"}
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
                className={`absolute border rounded-2xl p-3 shadow-2xl pointer-events-none z-30 flex flex-col gap-1 min-w-[150px] text-center transition-colors duration-200 ${
                  theme === 'dark'
                    ? 'bg-slate-900 border-white/10 text-white'
                    : 'bg-white border-slate-200 text-slate-800'
                }`}
                style={{ 
                  left: `${Math.max(12, Math.min(88, (hoveredPoint.x / trendSvgWidth) * 100))}%`, 
                  top: '40%', 
                  transform: 'translate(-50%, -50%)',
                  boxShadow: theme === 'dark'
                    ? '0 10px 30px -10px rgba(0,0,0,0.8), 0 0 15px 1px rgba(255,255,255,0.03)'
                    : '0 10px 30px -10px rgba(15,23,42,0.15)'
                }}
              >
                <b className={`${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} text-[10px] tracking-wider uppercase`}>{formatRussianDate(hoveredPoint.date)}</b>
                <span className={`font-mono font-black text-sm ${hoveredPoint.balance >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                  {Math.round(hoveredPoint.balance).toLocaleString('ru-RU')} ₼
                </span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Category transactions list modal */}
      {selectedCategoryTransactions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-xs transition-all animate-fade-in" id="category-txs-modal">
          <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-up">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-slate-950/30">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center border border-white/5 shadow-inner"
                  style={{ backgroundColor: `${selectedCategoryTransactions.category.color}15`, borderColor: `${selectedCategoryTransactions.category.color}40` }}
                >
                  <div style={{ color: selectedCategoryTransactions.category.color }}>
                    <IconComponent name={selectedCategoryTransactions.category.icon || 'FolderOpen'} size={20} />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                    {formatCategoryDisplayName(selectedCategoryTransactions.category.name)}
                  </h3>
                  <p className="text-[10px] sm:text-xs text-slate-400 font-semibold uppercase tracking-wider">
                    {selectedCategoryTransactions.type === 'expense' ? 'Расходы за' : 'Доходы за'} {getPeriodLabel(analyticsTimeframe)}
                  </p>
                </div>
              </div>
              
              <button 
                onClick={() => setSelectedCategoryTransactions(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/5 active:scale-95 rounded-xl transition-all cursor-pointer"
                title="Закрыть"
              >
                <X size={18} className="stroke-[2.5]" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 overflow-y-auto flex-1 custom-scrollbar space-y-4">
              {sortedSelectedCategoryTxs.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <span className="text-2xl">🔍</span>
                  <p className="text-xs text-slate-500 italic">Нет операций по этой категории за выбранный период</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {sortedSelectedCategoryTxs.map((tx) => {
                    const accName = accounts.find(a => a.id === tx.accountId)?.name || 'Неизвестный счет';
                    const txDate = new Date(tx.date);
                    const formattedDate = !isNaN(txDate.getTime()) 
                      ? txDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
                      : tx.date;
                    
                    return (
                      <div 
                        key={tx.id}
                        className="flex items-center justify-between p-3.5 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all gap-4 text-xs group"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-sans font-bold text-slate-205 truncate">
                              {tx.description || formatCategoryDisplayName(selectedCategoryTransactions.category.name) || 'Без описания'}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[9px] text-slate-400 font-bold shrink-0">
                              {accName}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-mono font-medium">
                            {formattedDate}
                          </p>
                        </div>
                        
                        <div className="text-right shrink-0">
                          <span className={`font-mono font-black text-sm ${selectedCategoryTransactions.type === 'income' ? 'text-emerald-400' : 'text-rose-450'}`}>
                            {selectedCategoryTransactions.type === 'income' ? '+' : '-'}{Math.round(tx.amount).toLocaleString('ru-RU')} ₼
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950/20 border-t border-white/5 flex items-center justify-between shrink-0">
              <div className="pl-2 select-none">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest block">Всего по категории</span>
                <span className={`font-mono text-base font-black ${selectedCategoryTransactions.type === 'income' ? 'text-emerald-400' : 'text-rose-455'}`}>
                  {selectedCategoryTransactions.type === 'income' ? '+' : '-'}{Math.round(sortedSelectedCategoryTxs.reduce((sum, t) => sum + t.amount, 0)).toLocaleString('ru-RU')} ₼
                </span>
              </div>
              <button
                onClick={() => setSelectedCategoryTransactions(null)}
                className="py-2.5 px-5 rounded-2xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                Закрыть
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
