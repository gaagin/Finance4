import fs from 'fs';
import path from 'path';
import { Account, Category, Transaction, FinanceData, BankCard } from './types';

// CSV fields mapping helper
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let currentField = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ';' && !inQuotes) {
      fields.push(currentField);
      currentField = '';
    } else {
      currentField += char;
    }
  }
  fields.push(currentField);
  return fields;
}

function runMigration() {
  console.log('Starting HoneyMoney Real CSV Export Conversion to JSON format...');
  const csvPath = path.join(process.cwd(), 'src', 'honey_export.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error('Error: honey_export.csv file not found at:', csvPath);
    process.exit(1);
  }

  const rawContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = rawContent.split(/\r?\n/).filter(line => line.trim().length > 0);
  
  // Real Account configs mapped from actual CSV data checks with exact screenshot final balances
  const realAccountsConfig: { name: string; type: string; balance: number; color: string }[] = [
    { name: "ASB kart", type: 'card', balance: 235.00, color: 'text-amber-500' },
    { name: "Кошелёк", type: 'cash', balance: 211.00, color: 'text-emerald-400' },
    { name: "Albali kart", type: 'card', balance: 56.00, color: 'text-fuchsia-400' },
    { name: "ABB kart Samira", type: 'card', balance: 430.00, color: 'text-teal-400' },
    { name: "DigiHesab Ilqar", type: 'card', balance: 1.00, color: 'text-indigo-400' },
    { name: "TamKart Fiziki 5338", type: 'card', balance: 0.00, color: 'text-red-400' },
    { name: "Копилка", type: 'savings', balance: 28.00, color: 'text-lime-500' },
    { name: "Кошелек Самира", type: 'cash', balance: 0.00, color: 'text-orange-400' },
    { name: "Акции ABB", type: 'savings', balance: 5488.00, color: 'text-lime-400' },
    { name: "Digihesab Samira", type: 'card', balance: 0.00, color: 'text-pink-400' },
    { name: "Зарубежные акции", type: 'savings', balance: 10471.00, color: 'text-purple-400' },
    { name: "Облигации ABB", type: 'savings', balance: 700.00, color: 'text-blue-400' },
    { name: "Digideposit Samira", type: 'savings', balance: 1028.00, color: 'text-yellow-400' },
    { name: "Депозит-Подушка безопасности", type: 'savings', balance: 960.00, color: 'text-sky-500' },
    { name: "ABB kredit kart", type: 'card', balance: 0.00, color: 'text-sky-300' },
    { name: "TamKart Virtual", type: 'card', balance: 0.00, color: 'text-yellow-300' },
    { name: "Страхование жизни", type: 'card', balance: 0.00, color: 'text-pink-500' },
    { name: "Цифровая карта", type: 'card', balance: 0.00, color: 'text-teal-500' },
    { name: "YapiKrediBank kredit", type: 'card', balance: 0.00, color: 'text-rose-500' },
    { name: "DigiHesab 2 Ilqar", type: 'card', balance: 0.00, color: 'text-indigo-500' },
    { name: "Albali кредитная карта", type: 'card', balance: 0.00, color: 'text-purple-400' }
  ];

  const accountsList: Account[] = realAccountsConfig.map((acc, idx) => ({
    id: `acc-parsed-${idx}`,
    name: acc.name,
    type: acc.type,
    balance: acc.balance,
    color: acc.color
  }));

  const accountsMapByName = new Map<string, Account>();
  accountsList.forEach(acc => accountsMapByName.set(acc.name, acc));

  // Allowlist set of real cash/card/savings accounts
  const realAccountsAllowlist = new Set(realAccountsConfig.map(acc => acc.name));

  // Pre-seed correct real categories matched directly with actual CSV labels
  const categoriesConfig: { name: string; icon: string; color: string; type: 'income' | 'expense' }[] = [
    { name: "Ребенок", icon: "Baby", color: "#38bdf8", type: "expense" },
    { name: "Ребенок / Траты", icon: "Baby", color: "#38bdf8", type: "expense" },
    { name: "Ребенок / Терапия", icon: "Baby", color: "#38bdf8", type: "expense" },
    { name: "Ребенок / Одежда", icon: "Baby", color: "#38bdf8", type: "expense" },
    { name: "Продукты", icon: "ShoppingCart", color: "#ef4444", type: "expense" },
    { name: "Развлечения и хобби", icon: "Gamepad2", color: "#ec4899", type: "expense" },
    { name: "Платный софт", icon: "Laptop", color: "#06b6d4", type: "expense" },
    { name: "Медицина / Лечение", icon: "Activity", color: "#10b981", type: "expense" },
    { name: "Медицина / Лекарства", icon: "Activity", color: "#10b981", type: "expense" },
    { name: "Проценты и бонусы", icon: "Percent", color: "#14b8a6", type: "income" },
    { name: "Ком. услуги / Отопление", icon: "Zap", color: "#eab308", type: "expense" },
    { name: "Ком. услуги / Вода", icon: "Zap", color: "#eab308", type: "expense" },
    { name: "Ком. услуги / Электроэнергия", icon: "Zap", color: "#eab308", type: "expense" },
    { name: "Ком. услуги / Квартира", icon: "Zap", color: "#eab308", type: "expense" },
    { name: "Одежда и обувь", icon: "ShoppingBag", color: "#a855f7", type: "expense" },
    { name: "Автомобиль / Бензин", icon: "Car", color: "#3b82f6", type: "expense" },
    { name: "Автомобиль / Мойка", icon: "Car", color: "#3b82f6", type: "expense" },
    { name: "Автомобиль / Запчасти", icon: "Car", color: "#3b82f6", type: "expense" },
    { name: "Автомобиль", icon: "Car", color: "#3b82f6", type: "expense" },
    { name: "Автомобиль / Ремонт", icon: "Car", color: "#3b82f6", type: "expense" },
    { name: "Подарки", icon: "Gift", color: "#f59e0b", type: "expense" },
    { name: "Гигиена и красота", icon: "Sparkles", color: "#f43f5e", type: "expense" },
    { name: "Дом", icon: "Home", color: "#6366f1", type: "expense" },
    { name: "Транспорт", icon: "Bus", color: "#14b8a6", type: "expense" },
    { name: "Пенсия Самира", icon: "Coins", color: "#10b981", type: "income" },
    { name: "Зарплата Ильгар", icon: "Briefcase", color: "#22c55e", type: "income" },
    { name: "Интернет и связь", icon: "Wifi", color: "#06b6d4", type: "expense" },
    { name: "Орифлейм", icon: "Sparkles", color: "#d946ef", type: "income" },
    { name: "Кафе, ресторан", icon: "Coffee", color: "#f97316", type: "expense" },
    { name: "Медицина / Стоматология", icon: "HeartPulse", color: "#10b981", type: "expense" },
    { name: "Образование", icon: "GraduationCap", color: "#a855f7", type: "expense" },
    { name: "Прочие доходы", icon: "DollarSign", color: "#10b981", type: "income" },
    { name: "Прочие расходы", icon: "HelpCircle", color: "#6b7280", type: "expense" }
  ];

  const categoriesList: Category[] = categoriesConfig.map((cat, idx) => ({
    id: `cat-parsed-${idx}`,
    name: cat.name,
    icon: cat.icon,
    color: cat.color,
    type: cat.type
  }));

  const categoriesMapByName = new Map<string, Category>();
  categoriesList.forEach(cat => categoriesMapByName.set(cat.name, cat));

  // Global resolve for fallback/backup categories for error protection
  const prochieExp = categoriesList.find(c => c.name === 'Прочие расходы') || categoriesList[categoriesList.length - 1];
  const prochieExpId = prochieExp.id;
  const prochieInc = categoriesList.find(c => c.name === 'Прочие доходы') || categoriesList[categoriesList.length - 2];
  const prochieIncId = prochieInc.id;

  const transactions: Transaction[] = [];
  let txIdCounter = 0;

  // Process rows
  const rows = lines.slice(1);
  rows.forEach((line) => {
    const fields = parseCSVLine(line).map(f => f.trim().replace(/^"/, '').replace(/"$/, '').trim());
    if (fields.length < 9) return;

    let dateStr = fields[0];
    const realSumStr = fields[1];
    const categoryName = fields[4];
    const description = fields[5];
    const accountName = fields[6];
    const transferStr = fields[8];

    // Typo repair: dates carrying "201-01-" are clearly standard truncated exports for "2022-01-"
    if (dateStr && dateStr.startsWith('201-')) {
      dateStr = dateStr.replace('201-', '2022-');
    }

    // STRICT planned/empty sums check: If empty or 0, this is ONLY planning or envelope budgeting information, so skip it immediately.
    if (!realSumStr || realSumStr === '0' || realSumStr === '0.0' || realSumStr === '""') {
       return; 
    }

    const amountVal = parseFloat(realSumStr);
    if (isNaN(amountVal) || amountVal === 0) return;

    // A. Verify if it is a Transfer
    if (transferStr && transferStr.includes('=>')) {
      const parts = transferStr.split('=>').map(s => s.trim());
      const fromAccName = parts[0];
      const toAccName = parts[1];

      // To strictly filter envelope allocations out, we check if BOTH sides of the transfer belong to our realAccounts allowlist
      if (!realAccountsAllowlist.has(fromAccName) || !realAccountsAllowlist.has(toAccName)) {
        return; 
      }

      const fromAcc = accountsMapByName.get(fromAccName);
      const toAcc = accountsMapByName.get(toAccName);

      if (!fromAcc || !toAcc) {
        return;
      }

      const absAmount = Math.abs(amountVal);

      // Create Outward transfer
      transactions.push({
        id: `tx-mig-${txIdCounter++}`,
        accountId: fromAcc.id,
        categoryId: prochieExpId,
        amount: absAmount,
        type: 'transfer',
        date: dateStr,
        description: description || `Перевод со счета ${fromAccName} в ${toAccName}`,
        transferAccountId: toAcc.id,
        transferType: 'out'
      });

      // Create Inward transfer
      transactions.push({
        id: `tx-mig-${txIdCounter++}`,
        accountId: toAcc.id,
        categoryId: prochieIncId,
        amount: absAmount,
        type: 'transfer',
        date: dateStr,
        description: description || `Перевод со счета ${fromAccName} в ${toAccName}`,
        transferAccountId: fromAcc.id,
        transferType: 'in'
      });

    } else {
      // B. Standard Transaction
      if (!accountName) return;

      // To strictly filter out envelope actions, check if the account is in our realAccounts allowlist
      if (!realAccountsAllowlist.has(accountName)) {
        return; 
      }

      const acc = accountsMapByName.get(accountName);
      if (!acc) return;

      const type: 'income' | 'expense' = amountVal < 0 ? 'expense' : 'income';
      const absAmount = Math.abs(amountVal);

      const resolvedCategoryName = categoryName || (type === 'income' ? 'Прочие доходы' : 'Прочие расходы');
      const cat = categoriesMapByName.get(resolvedCategoryName);
      const backupId = type === 'income' ? prochieIncId : prochieExpId;
      const categoryId = cat ? cat.id : backupId;

      transactions.push({
        id: `tx-mig-${txIdCounter++}`,
        accountId: acc.id,
        categoryId,
        amount: absAmount,
        type,
        date: dateStr,
        description: description || `${type === 'income' ? 'Доход' : 'Расход'}: ${resolvedCategoryName}`
      });
    }
  });

  const budgets = [
    { categoryId: categoriesList.find(c => c.name === 'Продукты')?.id || '', limitAmount: 350 },
    { categoryId: categoriesList.find(c => c.name === 'Ребенок')?.id || '', limitAmount: 700 },
    { categoryId: categoriesList.find(c => c.name === 'Автомобиль / Бензин')?.id || '', limitAmount: 200 },
    { categoryId: categoriesList.find(c => c.name === 'Медицина / Лекарства')?.id || '', limitAmount: 120 },
    { categoryId: categoriesList.find(c => c.name === 'Кафе, ресторан')?.id || '', limitAmount: 150 }
  ].filter(b => b.categoryId !== '');

  const finalCards: BankCard[] = accountsList
    .filter(a => a.type === 'card')
    .map((a, idx) => ({
      id: `card-mig-${idx}`,
      name: a.name,
      bank: a.name.toLowerCase().includes('birbank') ? 'Kapital Bank' : a.name.toLowerCase().includes('albali') ? 'Unibank' : 'ABB',
      lastFour: `85${(10 + idx)}`
    }));

  const data: FinanceData = {
    accounts: accountsList,
    categories: categoriesList,
    // Sort transactions chronologically backwards (newest first)
    transactions: transactions.sort((a, b) => b.date.localeCompare(a.date)),
    budgets,
    cards: finalCards
  };

  console.log(`JSON Conversion Completed!`);
  console.log(`- Extracted Accounts: ${accountsList.length}`);
  console.log(`- Extracted Categories: ${categoriesList.length}`);
  console.log(`- Extracted Actual Transactions (planned and envelopes filtered out): ${data.transactions.length}`);

  const outputString = `import { FinanceData } from './types';\n\nexport const initialFinanceData: FinanceData = ${JSON.stringify(data, null, 2)};\n`;
  const outputPath = path.join(process.cwd(), 'src', 'initialData.ts');
  fs.writeFileSync(outputPath, outputString, 'utf-8');
  console.log(`Successfully wrote converted literal JSON data to ${outputPath}`);
}

runMigration();
