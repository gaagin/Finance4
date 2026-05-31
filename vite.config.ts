import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEBUG_FILE = "/tmp/milli_request_debug.log";

function logDebug(msg: string) {
  try {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(DEBUG_FILE, `[${timestamp}] ${msg}\n`);
  } catch (err) {
    console.error("Error writing debug:", err);
  }
}

export default defineConfig(() => {
  return {
    base: './',
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'milli-api-assistant-dev',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url && req.url.includes('/api')) {
              logDebug(`Vite Middleware received request: ${req.method} ${req.url}`);
            }

            if (req.url && req.url.includes('/api/assistant')) {
              if (req.method === 'GET') {
                logDebug(`Vite Middleware healthcheck GET hit`);
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ status: "milli_ready", server: "vite_dev_middleware" }));
                return;
              }

              if (req.method === 'POST') {
                try {
                let body = '';
                req.on('data', chunk => {
                  body += chunk;
                });
                req.on('end', async () => {
                  try {
                    const parsedBody = JSON.parse(body);
                    const { message, history, financeData } = parsedBody;

                    const apiKey = process.env.GEMINI_API_KEY;
                    if (!apiKey) {
                      res.statusCode = 500;
                      res.setHeader('Content-Type', 'application/json');
                      res.end(JSON.stringify({ error: "Ключ API Gemini (GEMINI_API_KEY) не установлен. Настройте его в Settings -> Secrets." }));
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

                    const contents: any[] = [];
                    if (history && Array.isArray(history)) {
                      for (const msg of history) {
                        contents.push({
                          role: msg.role === 'user' ? 'user' : 'model',
                          parts: [{ text: msg.text }]
                        });
                      }
                    }

                    contents.push({
                      role: 'user',
                      parts: [{ text: message }]
                    });

                    // Direct standard fetch call to Gemini API
                    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
                    const geminiRes = await fetch(geminiUrl, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json'
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

                    if (!geminiRes.ok) {
                      const errText = await geminiRes.text();
                      throw new Error(errText || `Ошибка API Gemini (${geminiRes.status})`);
                    }

                    const geminiData = await geminiRes.json();
                    const replyText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "Извините, я не смогла сформировать ответ.";

                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ text: replyText }));
                  } catch (err: any) {
                    console.error("Vite API Middleware error:", err);
                    res.statusCode = 500;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: err?.message || "Ошибка при генерации ответа ИИ." }));
                  }
                });
              } catch (err: any) {
                res.statusCode = 400;
                res.end("Bad Request");
              }
              }
              return;
            }
            next();
          });
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
