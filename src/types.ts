export type TransactionType = 'expense' | 'income';

export interface Account {
  id: string;
  name: string;
  type: string; // 'cash' | 'card' | 'savings' | 'other'
  balance: number;
  color: string; // Tailwind color classes
}

export interface Category {
  id: string;
  name: string;
  icon: string; // Lucide icon name
  color: string; // Hex color or tailwind class
  type: TransactionType;
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
