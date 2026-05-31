import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Gemini safely
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({
    apiKey: apiKey || "MOCK_KEY_IF_UNDEFINED",
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API endpoint for financial AI assistant analysis & QA
  app.post("/api/assistant", async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const { message, history, financeData } = req.body;

      if (!apiKey) {
        res.status(500).json({ error: "Ключ API Gemini (GEMINI_API_KEY) не установлен. Настройте его в Settings -> Secrets." });
        return;
      }

      // Prepare detailed context of accounts, categories, budgets, and transactions
      let financialContext = "У пользователя пока нет зафиксированных финансовых данных.";
      if (financeData) {
        const { accounts = [], categories = [], budgets = [], transactions = [] } = financeData;

        const accSummary = accounts
          .map((a: any) => `- ${a.name}: ${Math.round(a.balance).toLocaleString('ru-RU')} ₼ (тип: ${a.type === 'savings' ? 'Копилка / Накопления' : 'Расчетный счет/карта'})`)
          .join("\n");

        const catSummary = categories
          .map((c: any) => `- ${c.name} (${c.type === 'expense' ? 'Расходная категория' : 'Доходная категория'})`)
          .join("\n");

        const budgetSummary = budgets
          .map((b: any) => {
            const cat = categories.find((c: any) => c.id === b.categoryId);
            return `- Бюджет на "${cat ? cat.name : 'Категорию ' + b.categoryId}": лимит ${b.amount} ₼`;
          })
          .join("\n");

        // Sorted by date descending (latest first), up to 50 items
        const txSorted = [...transactions].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const txSummary = txSorted.slice(0, 50).map((t: any) => {
          const acc = accounts.find((a: any) => a.id === t.accountId);
          const cat = categories.find((c: any) => c.id === t.categoryId);
          const formattedDate = new Date(t.date).toLocaleDateString('ru-RU');
          const sign = t.type === 'expense' ? '-' : '+';
          return `- ${formattedDate}: [${t.type === 'expense' ? 'РАСХОД' : 'ДОХОД'}] ${sign}${Math.round(t.amount)} ₼ | "${cat ? cat.name : 'Без категории'}" | Счет: "${acc ? acc.name : 'Неизвестно'}" ${t.comment ? '(' + t.comment + ')' : ''}`;
        }).join("\n");

        financialContext = `
=== СЧЕТА И НАКОПЛЕНИЯ ===
${accSummary || 'Нет данных'}

=== КАТЕГОРИИ И БЮДЖЕТЫ ===
${catSummary || 'Нет категорий'}
${budgetSummary ? '\nТекущие лимиты бюджетов:\n' + budgetSummary : '\nБюджеты не установлены.'}

=== ПОСЛЕДНИЕ ОПЕРАЦИИ (ДО 50 ШТУК) ===
${txSummary || 'Нет операций'}
`;
      }

      const systemInstruction = `Вы — профессиональный финансовый советник, дружелюбный и искренний ИИ-помощник по имени Milli (Милли) в приложении "Домашние Финансы".
Ваша цель — помогать пользователю анализировать его расходы и доходы, давать практичные советы по оптимизации бюджета, ставить умные финансовые цели и отвечать на любые финансовые вопросы.

Пожалуйста, руководствуйтесь следующими правилами:
1. Основная валюта приложения — Азербайджанский манат (обозначается как ₼ или AZN). Текстовые ответы должны оперировать этой валютой.
2. Подробно анализируйте переданные структурированные данные о счетах, бюджетах и транзакциях пользователя, чтобы давать индивидуальные советы, например:
   - "Я заметил(а), что у вас по счету 'Зарубежные акции' баланс равен..."
   - "Вы тратите много на категорию '...', возможно стоит установить для нее лимит бюджета?"
   - "В этом месяце вы уже совершили несколько крупных переводов..."
3. Форматируйте свои ответы красиво и читабельно с использованием Markdown (подзаголовки, жирные шрифты, списки и эмодзи).
4. Отвечайте строго на русском языке, будьте вежливы, лаконичны и профессиональны. Избегайте скучных сухих отчетов; используйте живой человеческий слог.

Текущие финансовые данные пользователя для анализа:
${financialContext}
`;

      // Map conversation history
      const contents: any[] = [];
      if (history && Array.isArray(history)) {
        for (const msg of history) {
          contents.push({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
          });
        }
      }

      // Add final query
      contents.push({
        role: 'user',
        parts: [{ text: message }]
      });

      // Make the API call to Gemini-3.5-flash
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        }
      });

      res.json({ text: response.text });
    } catch (err: any) {
      console.error("AI Assistant Error:", err);
      res.status(500).json({ error: err?.message || "Произошла неизвестная ошибка при анализе данных." });
    }
  });

  // Vite frontend serving middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: express.Request, res: express.Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server started on http://localhost:${PORT}`);
  });
}

startServer();
