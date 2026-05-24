import { FinanceData } from './types';

export const initialFinanceData: FinanceData = {
  accounts: [
    { id: 'acc-1', name: 'Наличные (Манаты)', type: 'cash', balance: 340, color: 'text-amber-600' },
    { id: 'acc-2', name: 'Карта Birbank (Kapital)', type: 'card', balance: 1420, color: 'text-red-600' },
    { id: 'acc-3', name: 'Карта ABB (Tamkart)', type: 'card', balance: 2890, color: 'text-sky-600' },
    { id: 'acc-4', name: 'Кошелёк m10 (Pasha)', type: 'card', balance: 125, color: 'text-teal-600' },
    { id: 'acc-5', name: 'Копилка (Халг Банк)', type: 'savings', balance: 5000, color: 'text-indigo-600' }
  ],
  cards: [
    { id: 'card-1', name: 'Birbank Red', bank: 'Kapital Bank', lastFour: '4521' },
    { id: 'card-2', name: 'ABB Tamkart', bank: 'ABB', lastFour: '8907' },
    { id: 'card-3', name: 'm10 Virtual', bank: 'Pasha Pay', lastFour: '1120' }
  ],
  categories: [
    // Expenses
    { id: 'cat-prods', name: 'Продукты (Bravo/Bazarstore)', icon: 'ShoppingCart', color: '#ef4444', type: 'expense' },
    { id: 'cat-cafe', name: 'Кафе и Чайхана (Кавказ)', icon: 'Coffee', color: '#f97316', type: 'expense' },
    { id: 'cat-rent', name: 'Аренда квартиры (Баку)', icon: 'Home', color: '#a855f7', type: 'expense' },
    { id: 'cat-utils', name: 'Коммунальные (Azərişıq/Azərsu)', icon: 'Zap', color: '#eab308', type: 'expense' },
    { id: 'cat-trans', name: 'Транспорт и BakuKart', icon: 'Bus', color: '#3b82f6', type: 'expense' },
    { id: 'cat-health', name: 'Здоровье и Аптека (Zeferan)', icon: 'Heart', color: '#10b981', type: 'expense' },
    { id: 'cat-shop', name: 'Одежда и Шопинг (Baku Mall)', icon: 'ShoppingBag', color: '#ec4899', type: 'expense' },
    { id: 'cat-other-exp', name: 'Прочие расходы', icon: 'Gift', color: '#6b7280', type: 'expense' },
    
    // Incomes
    { id: 'cat-salary', name: 'Оклад (Зарплата)', icon: 'Briefcase', color: '#22c55e', type: 'income' },
    { id: 'cat-freelance', name: 'Фриланс (Проекты)', icon: 'Laptop', color: '#06b6d4', type: 'income' },
    { id: 'cat-cashback', name: 'Кэшбэк (ABB/Kapital)', icon: 'Percent', color: '#14b8a6', type: 'income' },
    { id: 'cat-other-inc', name: 'Прочие доходы', icon: 'Coins', color: '#6366f1', type: 'income' }
  ],
  budgets: [
    { categoryId: 'cat-prods', limitAmount: 450 },
    { categoryId: 'cat-cafe', limitAmount: 180 },
    { categoryId: 'cat-rent', limitAmount: 600 },
    { categoryId: 'cat-utils', limitAmount: 100 },
    { categoryId: 'cat-trans', limitAmount: 40 },
    { categoryId: 'cat-shop', limitAmount: 300 }
  ],
  transactions: [
    // May 2026 Incomes
    { id: 't-1', accountId: 'acc-3', categoryId: 'cat-salary', amount: 2400, type: 'income', date: '2026-05-01', description: 'Зарплата за апрель', cardId: 'card-2' },
    { id: 't-2', accountId: 'acc-2', categoryId: 'cat-freelance', amount: 450, type: 'income', date: '2026-05-18', description: 'Создание сайта - дизайн', cardId: 'card-1' },
    { id: 't-3', accountId: 'acc-2', categoryId: 'cat-cashback', amount: 48.50, type: 'income', date: '2026-05-20', description: 'Кэшбэк 10% от Bravo', cardId: 'card-1' },
    
    // May 2026 Expenses
    { id: 't-4', accountId: 'acc-3', categoryId: 'cat-rent', amount: 550, type: 'expense', date: '2026-05-05', description: 'Аренда квартиры 28 Мая', cardId: 'card-2' },
    { id: 't-5', accountId: 'acc-2', categoryId: 'cat-prods', amount: 124.30, type: 'expense', date: '2026-05-15', description: 'Продукты в Bazarstore', cardId: 'card-1' },
    { id: 't-6', accountId: 'acc-1', categoryId: 'cat-cafe', amount: 35.00, type: 'expense', date: '2026-05-22', description: 'Чайхана с друзьями в Ичери-Шехер' },
    { id: 't-7', accountId: 'acc-4', categoryId: 'cat-trans', amount: 20.00, type: 'expense', date: '2026-05-10', description: 'Пополнение BakuKart', cardId: 'card-3' },
    { id: 't-8', accountId: 'acc-3', categoryId: 'cat-utils', amount: 42.50, type: 'expense', date: '2026-05-07', description: 'Свет (Azərişıq)', cardId: 'card-2' },
    { id: 't-9', accountId: 'acc-3', categoryId: 'cat-utils', amount: 23.00, type: 'expense', date: '2026-05-08', description: 'Интернет (Katv1)', cardId: 'card-2' },
    { id: 't-10', accountId: 'acc-1', categoryId: 'cat-cafe', amount: 15.00, type: 'expense', date: '2026-05-12', description: 'Kumpir & Кофе' },
    { id: 't-11', accountId: 'acc-2', categoryId: 'cat-prods', amount: 84.10, type: 'expense', date: '2026-05-23', description: 'Закупка в Bravo синема', cardId: 'card-1' },
    { id: 't-12', accountId: 'acc-2', categoryId: 'cat-shop', amount: 180.00, type: 'expense', date: '2026-05-19', description: 'Куртка в Zara (Port Baku Mall)', cardId: 'card-1' },
    { id: 't-13', accountId: 'acc-1', categoryId: 'cat-health', amount: 18.20, type: 'expense', date: '2026-05-14', description: 'Витамины в Zeferan' },

    // April 2026 Incomes & Expenses (To show monthly trend)
    { id: 't-101', accountId: 'acc-3', categoryId: 'cat-salary', amount: 2400, type: 'income', date: '2026-04-01', description: 'Зарплата за март' },
    { id: 't-102', accountId: 'acc-3', categoryId: 'cat-rent', amount: 550, type: 'expense', date: '2026-04-05', description: 'Аренда квартиры 28 Мая' },
    { id: 't-103', accountId: 'acc-2', categoryId: 'cat-prods', amount: 230, type: 'expense', date: '2026-04-10', description: 'Супермаркет' },
    { id: 't-104', accountId: 'acc-2', categoryId: 'cat-freelance', amount: 300, type: 'income', date: '2026-04-12', description: 'Разработка Telegram бота' },
    { id: 't-105', accountId: 'acc-1', categoryId: 'cat-cafe', amount: 75.00, type: 'expense', date: '2026-04-18', description: 'Семейный ужин' },
    { id: 't-106', accountId: 'acc-4', categoryId: 'cat-trans', amount: 30.00, type: 'expense', date: '2026-04-03', description: 'Пополнение BakuKart' },
    { id: 't-107', accountId: 'acc-3', categoryId: 'cat-utils', amount: 65.00, type: 'expense', date: '2026-04-06', description: 'Газ, Вода, Свет' },
    { id: 't-108', accountId: 'acc-2', categoryId: 'cat-shop', amount: 220.00, type: 'expense', date: '2026-04-22', description: 'Обувь' },
    { id: 't-109', accountId: 'acc-2', categoryId: 'cat-cashback', amount: 35.80, type: 'income', date: '2026-04-30', description: 'Кэшбэк за месяц' }
  ]
};
