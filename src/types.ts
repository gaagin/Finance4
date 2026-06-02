export type TransactionType = 'expense' | 'income' | 'transfer';

export interface Account {
  id: string;
  name: string;
  type: string; // 'cash' | 'card' | 'savings' | 'other'
  balance: number;
  color: string; // Tailwind color classes
  quickEntry?: boolean;
  updatedAt?: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string; // Lucide icon name
  color: string; // Hex color or tailwind class
  type: TransactionType;
  quickEntry?: boolean;
  updatedAt?: number;
}

export interface BankCard {
  id: string;
  name: string;      // Название карты (например: Зарплатная Birbank)
  bank: string;      // Банк (например: Kapital Bank, ABB, Pasha Bank)
  lastFour: string;  // Последние 4 цифры
  updatedAt?: number;
}

export interface Transaction {
  id: string;
  accountId: string;
  categoryId: string;
  amount: number;
  type: TransactionType;
  date: string; // YYYY-MM-DD
  description: string;
  cardId?: string; // Связанная банковская карта (опционально)
  transferAccountId?: string; // Другой счет перевода (опционально)
  transferType?: 'out' | 'in'; // Направление ('out' - списание, 'in' - зачисление)
  updatedAt?: number; // Временная метка изменения для дельта-синхронизации (в мс)
}

export interface BudgetLimit {
  categoryId: string;
  limitAmount: number;
  month?: string; // YYYY-MM (e.g., '2026-06')
  updatedAt?: number;
}

export interface FinanceData {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: BudgetLimit[];
  cards: BankCard[]; // Список банковских карт
}

export function formatCategoryDisplayName(name: string): string {
  if (!name) return '';
  const separators = ['/', '—', '–', '-', '−'];
  for (const sep of separators) {
    if (name.includes(sep)) {
      const parts = name.split(sep);
      const lastPart = parts[parts.length - 1].trim();
      if (lastPart) {
        return lastPart;
      }
    }
  }
  return name;
}

export interface TimeframeOption {
  value: string; // e.g., '2026-05', 'may'
  label: string; // e.g., 'Май 2026'
  type: 'all' | 'month' | 'year' | 'custom';
}

const RussianMonthNames: { [key: string]: string } = {
  '01': 'Январь',
  '02': 'Февраль',
  '03': 'Март',
  '04': 'Апрель',
  '05': 'Май',
  '06': 'Июнь',
  '07': 'Июль',
  '08': 'Август',
  '09': 'Сентябрь',
  '10': 'Октябрь',
  '11': 'Ноябрь',
  '12': 'Декабрь'
};

export function formatTimeframeLabel(value: string): string {
  if (value === 'may') return 'Май 2026';
  if (value === 'april') return 'Апрель 2026';
  if (value === 'all') return 'Всё время (С 2022)';
  if (value === 'custom') return 'Указать вручную';
  
  if (/^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split('-');
    const mName = RussianMonthNames[month] || month;
    return `${mName} ${year}`;
  }
  
  if (/^\d{4}$/.test(value)) {
    return `${value} год`;
  }
  
  return value;
}

export function getCurrentMonthYyyymm(): string {
  const now = new Date();
  const year = now.getFullYear();
  // Ensure that if the current year is less than 2026 (e.g. 2025), we treat 2026-06 as the active month because the workspace datasets are in 2026
  const targetYear = year < 2026 ? 2026 : year;
  const targetMonth = year < 2026 ? '06' : String(now.getMonth() + 1).padStart(2, '0');
  return `${targetYear}-${targetMonth}`;
}

export function getDynamicTimeframeOptions(transactions: Transaction[]): TimeframeOption[] {
  const options: TimeframeOption[] = [];
  
  // Track unique months
  const monthSet = new Set<string>();
  
  // 1. Gather dynamic months from transactions
  transactions.forEach(t => {
    if (t.date && t.date.length >= 7) {
      const yyyymm = t.date.substring(0, 7);
      if (/^\d{4}-\d{2}$/.test(yyyymm)) {
        monthSet.add(yyyymm);
      }
    }
  });
  
  // 2. Add current month to ensure it is always present
  const currentYyyymm = getCurrentMonthYyyymm();
  monthSet.add(currentYyyymm);
  
  // Guarantee seed months exist in 2026
  monthSet.add('2026-06');
  monthSet.add('2026-05');
  monthSet.add('2026-04');
  
  // Sort months chronologically descending (newest first)
  const sortedMonths = Array.from(monthSet).sort((a, b) => b.localeCompare(a));
  
  // 3. Gather years based on months + seed years
  const yearSet = new Set<string>();
  monthSet.forEach(m => {
    yearSet.add(m.split('-')[0]);
  });
  ['2026', '2025', '2024', '2023', '2022'].forEach(y => yearSet.add(y));
  const sortedYears = Array.from(yearSet).sort((a, b) => b.localeCompare(a));
  
  // Assemble
  options.push({ value: 'all', label: 'Всё время (С 2022)', type: 'all' });
  
  const currentYearStr = currentYyyymm.split('-')[0];
  sortedMonths.forEach(m => {
    const monthYear = m.split('-')[0];
    if (monthYear === currentYearStr) {
      options.push({ value: m, label: formatTimeframeLabel(m), type: 'month' });
    }
  });
  
  sortedYears.forEach(y => {
    options.push({ value: y, label: `${y} год`, type: 'year' });
  });
  
  return options;
}

export function filterTransactionByTimeframe(tx: Transaction, timeframe: string): boolean {
  if (timeframe === 'all' || !timeframe) return true;
  if (timeframe === 'may') {
    return tx.date.startsWith('2026-05');
  }
  if (timeframe === 'april') {
    return tx.date.startsWith('2026-04');
  }
  return tx.date.startsWith(timeframe);
}

