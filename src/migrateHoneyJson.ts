import fs from 'fs';
import path from 'path';
import { Account, Category, Transaction, FinanceData, BankCard } from './types';

function runJsonMigration() {
  console.log('Starting HoneyMoney JSON Export Conversion...');
  const jsonPath = path.join(process.cwd(), 'src', 'honey_export.json');
  
  if (!fs.existsSync(jsonPath)) {
    console.error('Error: honey_export.json file not found at:', jsonPath);
    process.exit(1);
  }

  const rawJson = fs.readFileSync(jsonPath, 'utf-8');
  const lines = rawJson.split(/\r?\n/);
  const cleanLines: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') continue;
    
    // Standard JSON structure lines in this export start with specific indentations:
    // 8 spaces and a quote for fields, 4 spaces for curly wrappers, or outermost brackets.
    const isStandard = 
      line.startsWith('        "') || 
      line.startsWith('    {') || 
      line.startsWith('    },') || 
      line.startsWith('    }') || 
      line.startsWith('[') || 
      line.startsWith(']');
      
    if (!isStandard && cleanLines.length > 0) {
      // Append this split line to the previous line to heal it
      cleanLines[cleanLines.length - 1] += ' ' + trimmed;
    } else {
      cleanLines.push(line);
    }
  }
  
  let cleanedJsonString = cleanLines.join('\n');
  
  // Clean up any remaining split nulls if any
  cleanedJsonString = cleanedJsonString.replace(/nu\s+ll/g, 'null');
  
  const items = JSON.parse(cleanedJsonString);

  // Real Accounts Config from actual user requirements
  const realAccountsConfig = [
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
  const realAccountsAllowlist = new Set(realAccountsConfig.map(acc => acc.name));

  // Pre-seed correct real categories matched directly with actual CSV labels
  const categoriesConfig = [
    { name: "Ребенок", icon: "Baby", color: "#38bdf8", type: "expense" as const },
    { name: "Ребенок / Траты", icon: "Baby", color: "#38bdf8", type: "expense" as const },
    { name: "Ребенок / Терапия", icon: "Baby", color: "#38bdf8", type: "expense" as const },
    { name: "Ребенок / Одежда", icon: "Baby", color: "#38bdf8", type: "expense" as const },
    { name: "Продукты", icon: "ShoppingCart", color: "#ef4444", type: "expense" as const },
    { name: "Развлечения и хобби", icon: "Gamepad2", color: "#ec4899", type: "expense" as const },
    { name: "Платный софт", icon: "Laptop", color: "#06b6d4", type: "expense" as const },
    { name: "Медицина / Лечение", icon: "Activity", color: "#10b981", type: "expense" as const },
    { name: "Медицина / Лекарства", icon: "Activity", color: "#10b981", type: "expense" as const },
    { name: "Проценты и бонусы", icon: "Percent", color: "#14b8a6", type: "income" as const },
    { name: "Ком. услуги / Отопление", icon: "Zap", color: "#eab308", type: "expense" as const },
    { name: "Ком. услуги / Вода", icon: "Zap", color: "#eab308", type: "expense" as const },
    { name: "Ком. услуги / Электроэнергия", icon: "Zap", color: "#eab308", type: "expense" as const },
    { name: "Ком. услуги / Квартира", icon: "Zap", color: "#eab308", type: "expense" as const },
    { name: "Одежда и обувь", icon: "ShoppingBag", color: "#a855f7", type: "expense" as const },
    { name: "Автомобиль / Бензин", icon: "Car", color: "#3b82f6", type: "expense" as const },
    { name: "Автомобиль / Мойка", icon: "Car", color: "#3b82f6", type: "expense" as const },
    { name: "Автомобиль / Запчасти", icon: "Car", color: "#3b82f6", type: "expense" as const },
    { name: "Автомобиль", icon: "Car", color: "#3b82f6", type: "expense" as const },
    { name: "Автомобиль / Ремонт", icon: "Car", color: "#3b82f6", type: "expense" as const },
    { name: "Подарки", icon: "Gift", color: "#f59e0b", type: "expense" as const },
    { name: "Гигиена и красота", icon: "Sparkles", color: "#f43f5e", type: "expense" as const },
    { name: "Дом", icon: "Home", color: "#6366f1", type: "expense" as const },
    { name: "Транспорт", icon: "Bus", color: "#14b8a6", type: "expense" as const },
    { name: "Пенсия Самира", icon: "Coins", color: "#10b981", type: "income" as const },
    { name: "Зарплата Ильгар", icon: "Briefcase", color: "#22c55e", type: "income" as const },
    { name: "Интернет и связь", icon: "Wifi", color: "#06b6d4", type: "expense" as const },
    { name: "Орифлейм", icon: "Sparkles", color: "#d946ef", type: "income" as const },
    { name: "Кафе, ресторан", icon: "Coffee", color: "#f97316", type: "expense" as const },
    { name: "Медицина / Стоматология", icon: "HeartPulse", color: "#10b981", type: "expense" as const },
    { name: "Образование", icon: "GraduationCap", color: "#a855f7", type: "expense" as const },
    { name: "Прочие доходы", icon: "DollarSign", color: "#10b981", type: "income" as const },
    { name: "Прочие расходы", icon: "HelpCircle", color: "#6b7280", type: "expense" as const }
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

  const prochieExp = categoriesList.find(c => c.name === 'Прочие расходы')!;
  const prochieExpId = prochieExp.id;
  const prochieInc = categoriesList.find(c => c.name === 'Прочие доходы')!;
  const prochieIncId = prochieInc.id;

  const transactions: Transaction[] = [];
  let txIdCounter = 0;

  items.forEach((item: any, idx: number) => {
    let dateStr = item["Дата"];
    const realSumVal = item["Реальная сумма"];
    const categoryName = item["Категория"];
    const description = item["Описание"];
    const accountName = item["Счёт"];
    const transferStr = item["Перевод"];

    if (!dateStr) {
      // Diagnostic check: log the first few occurrences of missing dates
      if (idx < 50 || idx % 1000 === 0) {
        console.log(`Warning at item ${idx}: missing "Дата", item keys:`, Object.keys(item), "raw:", JSON.stringify(item).substring(0, 150));
      }
      return;
    }

    if (dateStr && dateStr.startsWith('201-')) {
      dateStr = dateStr.replace('201-', '2022-');
    }

    // Filter out items without sum or sum of 0 (envelopes/planning)
    if (realSumVal === null || realSumVal === undefined || realSumVal === 0) {
      return;
    }

    const amountVal = Number(realSumVal);
    if (isNaN(amountVal) || amountVal === 0) return;

    // A. Verify if it is a Transfer
    if (transferStr && transferStr.includes('=>')) {
      const parts = transferStr.split('=>').map((s: string) => s.trim());
      const fromAccName = parts[0];
      const toAccName = parts[1];

      // To strictly filter envelope allocations out
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
    transactions: transactions.sort((a, b) => b.date.localeCompare(a.date)),
    budgets,
    cards: finalCards
  };

  console.log(`JSON Translation Completed successfully!`);
  console.log(`- Extracted Accounts: ${accountsList.length}`);
  console.log(`- Extracted Categories: ${categoriesList.length}`);
  console.log(`- Extracted Actual Transactions: ${data.transactions.length}`);

  const outputString = `import { FinanceData } from './types';\n\nexport const initialFinanceData: FinanceData = ${JSON.stringify(data, null, 2)};\n`;
  const outputPath = path.join(process.cwd(), 'src', 'initialData.ts');
  fs.writeFileSync(outputPath, outputString, 'utf-8');
  console.log(`Successfully wrote converted literal JSON data to ${outputPath}`);
}

runJsonMigration();
