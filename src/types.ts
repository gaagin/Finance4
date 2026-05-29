export type TransactionType = 'expense' | 'income' | 'transfer';

export interface Account {
  id: string;
  name: string;
  type: string; // 'cash' | 'card' | 'savings' | 'other'
  balance: number;
  color: string; // Tailwind color classes
  quickEntry?: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon: string; // Lucide icon name
  color: string; // Hex color or tailwind class
  type: TransactionType;
  quickEntry?: boolean;
}

export interface BankCard {
  id: string;
  name: string;      // Название карты (например: Зарплатная Birbank)
  bank: string;      // Банк (например: Kapital Bank, ABB, Pasha Bank)
  lastFour: string;  // Последние 4 цифры
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
