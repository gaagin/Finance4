import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const DEBUG_FILE = "/tmp/milli_request_debug.log";

function logDebug(msg: string) {
  try {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(DEBUG_FILE, `[${timestamp}] ${msg}\n`);
  } catch (err) {
    console.error("Error writing debug:", err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Log all api requests
  app.use("/api", (req, res, next) => {
    logDebug(`Express API request received: ${req.method} ${req.originalUrl}`);
    next();
  });

  // GET API healthcheck endpoint
  app.get("/api/assistant", (req, res) => {
    logDebug("Express GET /api/assistant hit");
    res.json({ status: "milli_ready", server: "express_backend" });
  });

  // API endpoint for financial AI assistant analysis & QA using standard fetch API
  app.post("/api/assistant", async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const { message, history, financeData } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

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

      // Add final user query
      contents.push({
        role: 'user',
        parts: [{ text: message }]
      });

      // Direct HTTP fetch to Gemini API
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const response = await fetch(geminiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: contents,
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          generationConfig: {
            temperature: 0.7
          }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `Ошибка API Gemini (${response.status})`);
      }

      const responseData = await response.json();
      const replyText = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "Извините, не удалось сгенерировать ответ.";

      res.json({ text: replyText });
    } catch (err: any) {
      console.error("AI Assistant Error:", err);
      res.status(500).json({ error: err?.message || "Произошла неизвестная ошибка при анализе данных." });
    }
  });

  // Vite frontend serving middleware setup in dev mode or production
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
