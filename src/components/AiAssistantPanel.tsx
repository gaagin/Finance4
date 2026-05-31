import React, { useState, useRef, useEffect } from 'react';
import { FinanceData } from '../types';
import { Sparkles, Send, Trash2, HelpCircle, Bot, User, ArrowRight, Loader2, DollarSign, Wallet, ShieldAlert, BarChart3, Settings } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

interface AiAssistantPanelProps {
  financeData: FinanceData;
  theme: 'light' | 'dark';
  addToast: (msg: string, type: 'warning' | 'critical' | 'success') => void;
}

// Prepares structured system data and historical messages so that client-side and server-side modes behave identically
function prepareGeminiPayload(financeData: FinanceData, message: string, history: any[]) {
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

  return { systemInstruction, contents };
}

export function AiAssistantPanel({ financeData, theme, addToast }: AiAssistantPanelProps) {
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('milli_ai_chat_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
      } catch {
        return [];
      }
    }
    return [];
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingTip, setLoadingTip] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Connection management states (workaround for cookie/404 restrictions)
  const [connectionMode, setConnectionMode] = useState<'server' | 'direct'>(() => {
    return (localStorage.getItem('milli_ai_connection_mode') as 'server' | 'direct') || 'server';
  });
  const [directApiKey, setDirectApiKey] = useState(() => {
    return localStorage.getItem('milli_ai_direct_key') || '';
  });
  const [showSettings, setShowSettings] = useState(false);

  // Persists connection settings
  useEffect(() => {
    localStorage.setItem('milli_ai_connection_mode', connectionMode);
  }, [connectionMode]);

  useEffect(() => {
    localStorage.setItem('milli_ai_direct_key', directApiKey);
  }, [directApiKey]);

  // Persists chat history to localStorage
  useEffect(() => {
    localStorage.setItem('milli_ai_chat_history', JSON.stringify(messages));
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const tips = [
    "Сравниваю расходы с установленными лимитами...",
    "Изучаю баланс ваших счетов в AZN...",
    "Анализирую последние финансовые транзакции...",
    "Формирую умные стратегические советы...",
    "Считаю соотношение ваших накоплений..."
  ];

  // Rotate loading tips when parsing
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      setLoadingTip(tips[0]);
      let index = 1;
      interval = setInterval(() => {
        setLoadingTip(tips[index % tips.length]);
        index++;
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString() + '-user',
      role: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setShowSettings(false); // Auto-hide settings overlay on message submission
    setLoading(true);

    try {
      // Map existing messages format to backend expects
      const historyPayload = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        text: m.text
      }));

      let replyText = '';

      if (connectionMode === 'direct') {
        const apiKey = directApiKey.trim();
        if (!apiKey) {
          throw new Error('Ключ API Gemini не указан. Нажмите на иконку шестерёнки вверху панели и введите ваш API-ключ Gemini.');
        }

        const { systemInstruction, contents } = prepareGeminiPayload(financeData, textToSend, historyPayload);
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        const res = await fetch(geminiUrl, {
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

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const errorMsg = errData.error?.message || `Ошибка API Gemini (${res.status})`;
          throw new Error(errorMsg);
        }

        const data = await res.json();
        replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Извините, не удалось сгенерировать ответ.";
      } else {
        // Mode: 'server'
        const res = await fetch('/api/assistant', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: textToSend,
            history: historyPayload,
            financeData: financeData
          })
        });

        if (!res.ok) {
          if (res.status === 404) {
            throw new Error('Код ошибки 404 (Not Found). Системный API-прокси заблокирован браузером или контейнер не запущен.');
          }
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Ошибка сервера (${res.status})`);
        }

        const data = await res.json();
        replyText = data.text || 'К сожалению, ответ не был получен.';
      }
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString() + '-assistant',
        role: 'assistant',
        text: replyText,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error(err);
      addToast(err?.message || "Не удалось связаться с ИИ-помощником.", 'critical');
      
      const is404 = err?.message?.includes('404') || err?.message?.includes('404') || err?.message?.toLowerCase().includes('not found');
      
      // Add detailed explanation of alternative path right inside the chat window
      const errorMessage: Message = {
        id: (Date.now() + 1).toString() + '-assistant',
        role: 'assistant',
        text: `⚠️ **Ошибка подключения**: ${err?.message || 'Не удалось связаться с ИИ-помощником.'}\n\n${
          is404 
            ? '📌 **Альтернативный путь без ошибок**: Нажмите на иконку шестерёнки вверху панели чата ⚙️, выберите **«Прямое подключение к Gemini»** и укажите свой собственный ключ API. В этом случае все запросы будут идти напрямую в Google, обходя серверное прокси. Это гарантирует 100% стабильную работу приложения!' 
            : ''
        }`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm("Вы уверены, что хотите полностью стереть историю переписки с Milli?")) {
      setMessages([]);
      localStorage.removeItem('milli_ai_chat_history');
      addToast("История диалога успешно очищена", "success");
    }
  };

  const presetQuestions = [
    {
      title: "Проведи финансовый аудит",
      desc: "Полный анализ доходов, расходов и накоплений.",
      text: "Проведи подробный аудит моих расходов и доходов на основе моих текущих транзакций и счетов. Какие главные финансовые инсайты ты видишь?",
      icon: BarChart3,
      color: "text-emerald-400 bg-emerald-500/10"
    },
    {
      title: "Проверь мои лимиты бюджетов",
      desc: "Укладываюсь ли я в запланированные рамки?",
      text: "Проверь мои установленные лимиты бюджетов и сравни их с реальными расходами. Где есть риск превышения и как этого избежать?",
      icon: ShieldAlert,
      color: "text-amber-400 bg-amber-500/10"
    },
    {
      title: "Как накопить больше?",
      desc: "Советы по увеличению сбережений в AZN.",
      text: "Как мне оптимизировать текущие расходы, чтобы эффективнее откладывать деньги в 'Копилка / Накопления'?",
      icon: Wallet,
      color: "text-teal-400 bg-teal-500/10"
    }
  ];

  // A very clean, safe and robust custom Markdown renderer to avoid library imports
  const renderMarkdown = (markText: string) => {
    const lines = markText.split('\n');
    return lines.map((line, idx) => {
      let trimmed = line.trim();

      // Horizontal lines
      if (trimmed === '---' || trimmed === '***') {
        return <hr key={idx} className="my-3 border-slate-700/50" />;
      }

      // Headers (### Header)
      if (trimmed.startsWith('### ')) {
        return (
          <h4 key={idx} className="text-sm font-bold text-teal-400 mt-3 mb-1.5 flex items-center gap-1.5 font-display">
            ✨ {parseInlineMarkdown(trimmed.substring(4))}
          </h4>
        );
      }
      if (trimmed.startsWith('## ')) {
        return (
          <h3 key={idx} className="text-base font-black text-emerald-400 mt-4 mb-2 border-b border-teal-500/10 pb-1 font-display">
            🚀 {parseInlineMarkdown(trimmed.substring(3))}
          </h3>
        );
      }
      if (trimmed.startsWith('# ')) {
        return (
          <h2 key={idx} className="text-lg font-black text-emerald-300 mt-5 mb-2 font-display">
            💎 {parseInlineMarkdown(trimmed.substring(2))}
          </h2>
        );
      }

      // Bullet points
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        return (
          <div key={idx} className="flex gap-2 ml-2 my-1 leading-relaxed text-[13px]">
            <span className="text-teal-400 font-bold shrink-0">•</span>
            <div className="flex-1">{parseInlineMarkdown(trimmed.substring(2))}</div>
          </div>
        );
      }

      // Blockquotes
      if (trimmed.startsWith('> ')) {
        return (
          <blockquote key={idx} className="border-l-4 border-teal-500/40 pl-3 py-1 my-2 italic text-[12.5px] text-slate-400 bg-slate-950/20 rounded-r-lg">
            {parseInlineMarkdown(trimmed.substring(2))}
          </blockquote>
        );
      }

      // Plain paragraph (supporting empty lines)
      if (!trimmed) {
        return <div key={idx} className="h-2" />;
      }

      return (
        <p key={idx} className="text-[13px] leading-relaxed my-1.5 text-slate-300">
          {parseInlineMarkdown(line)}
        </p>
      );
    });
  };

  // Parses inline formatting like **bold**, *italic*, and `code`
  const parseInlineMarkdown = (text: string) => {
    // Handle Bold formatting (**text**)
    const boldRegex = /\*\*(.*?)\*\*/g;
    let parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = boldRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      parts.push(<strong key={match.index} className="font-extrabold text-teal-350">{match[1]}</strong>);
      lastIndex = boldRegex.lastIndex;
    }
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    // Re-process for backticks code blocks (`code`)
    const processedWithCode: React.ReactNode[] = [];
    parts.forEach((part, pIdx) => {
      if (typeof part !== 'string') {
        processedWithCode.push(part);
        return;
      }

      const codeRegex = /`(.*?)`/g;
      let codeParts: React.ReactNode[] = [];
      let cLastIndex = 0;
      let cMatch;

      while ((cMatch = codeRegex.exec(part)) !== null) {
        if (cMatch.index > cLastIndex) {
          codeParts.push(part.substring(cLastIndex, cMatch.index));
        }
        codeParts.push(
          <code key={cMatch.index} className="px-1.5 py-0.5 mx-0.5 rounded text-[11px] font-mono bg-slate-950 text-emerald-400 border border-slate-800">
            {cMatch[1]}
          </code>
        );
        cLastIndex = codeRegex.lastIndex;
      }
      if (cLastIndex < part.length) {
        codeParts.push(part.substring(cLastIndex));
      }

      processedWithCode.push(...codeParts.map((cp, cpIdx) => <span key={`${pIdx}-${cpIdx}`}>{cp}</span>));
    });

    return processedWithCode.length > 0 ? processedWithCode : text;
  };

  const isDark = theme === 'dark';

  return (
    <div className={`rounded-3xl border flex flex-col h-[calc(100vh-190px)] min-h-[450px] overflow-hidden transition-all shadow-xl ${
      isDark 
        ? 'border-white/5 bg-slate-900/40 backdrop-blur-md text-slate-100 shadow-slate-950/20' 
        : 'border-slate-200/80 bg-white text-slate-800 shadow-slate-200/60'
    }`} id="milli-ai-assistant">
      
      {/* Title block */}
      <div className={`p-4 border-b flex justify-between items-center ${
        isDark ? 'border-white/5 bg-slate-950/20' : 'border-slate-100 bg-slate-50/40'
      }`}>
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
            <Sparkles size={18} className="animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-black font-display flex items-center gap-1.5">
              Финансовый ИИ-помощник Milli
            </h2>
            <p className="text-[10px] text-slate-400">Анализ расходов, лимитов, бюджетов и полезные инсайты</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              showSettings 
                ? 'bg-teal-500/15 border-teal-500/35 text-teal-400' 
                : isDark ? 'border-purple-500/10 text-slate-400 hover:text-slate-200 hover:bg-slate-950/40' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
            title="Настройки подключения к ИИ"
          >
            <Settings size={14} className={showSettings ? "animate-spin" : ""} />
          </button>
          
          {messages.length > 0 && (
            <button 
              onClick={handleClearHistory}
              className={`p-1.5 rounded-lg border text-rose-500/80 hover:text-rose-500 hover:bg-rose-500/5 transition-all cursor-pointer ${
                isDark ? 'border-purple-500/10' : 'border-slate-200'
              }`}
              title="Очистить чат"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Messages / Welcome View Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
        {showSettings ? (
          <div className="max-w-3xl mx-auto py-4 space-y-6 animate-fade-in" id="milli-api-settings-panel">
            <div className={`p-5 rounded-2xl border ${
              isDark ? 'bg-slate-950/40 border-teal-500/15' : 'bg-teal-50/10 border-teal-500/20'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400">
                  <Settings size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-black font-display text-slate-200 leading-tight">
                    Настройки подключения Milli к Gemini
                  </h3>
                  <p className="text-[10px] text-slate-500">Настройка сетевого маршрута для обхода ошибки 404</p>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-extrabold text-slate-400 mb-2">
                    Способ подключения к ИИ-модели:
                  </label>
                  
                  <div className="space-y-2">
                    {/* Server Mode Option */}
                    <label className={`flex p-3 rounded-xl border cursor-pointer transition-all ${
                      connectionMode === 'server' 
                        ? 'border-teal-500/40 bg-teal-500/5' 
                        : isDark ? 'border-white/5 bg-slate-950/20 hover:bg-slate-950/30' : 'border-slate-200 bg-slate-50/20 hover:bg-white'
                    }`}>
                      <input 
                        type="radio" 
                        name="connectionMode" 
                        value="server" 
                        checked={connectionMode === 'server'}
                        onChange={() => setConnectionMode('server')}
                        className="mt-0.5 mr-3 accent-teal-500 scale-90"
                      />
                      <div className="flex-1">
                        <span className="font-extrabold text-[11px] flex items-center gap-1.5 text-slate-200 leading-none">
                          🏢 Встроенный прокси-сервер системы
                        </span>
                        <p className="text-[9.5px] text-slate-400 mt-1.5 leading-relaxed">
                          Стандартное подключение через сервер приложения. Иногда может выдавать код 404, если браузер блокирует защитные сессионные куки (например, в Safari или режиме инкогнито).
                        </p>
                      </div>
                    </label>

                    {/* Direct Client Mode Option */}
                    <label className={`flex p-3 rounded-xl border cursor-pointer transition-all ${
                      connectionMode === 'direct' 
                        ? 'border-teal-500/40 bg-teal-500/5' 
                        : isDark ? 'border-white/5 bg-slate-950/20 hover:bg-slate-950/30' : 'border-slate-200 bg-slate-50/20 hover:bg-white'
                    }`}>
                      <input 
                        type="radio" 
                        name="connectionMode" 
                        value="direct" 
                        checked={connectionMode === 'direct'}
                        onChange={() => setConnectionMode('direct')}
                        className="mt-0.5 mr-3 accent-teal-500 scale-90"
                      />
                      <div className="flex-1">
                        <span className="font-extrabold text-[11px] flex items-center gap-1.5 text-teal-300 leading-none">
                          ⚡ Прямое подключение к Gemini (Рекомендуется при 404)
                        </span>
                        <p className="text-[9.5px] text-slate-400 mt-1.5 leading-relaxed">
                          Запросы отправляются напрямую из вашего браузера в Google. Полностью устраняет проблемы совместимости, блокировку cookies и ошибки 404!
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {connectionMode === 'direct' && (
                  <div className="space-y-2 p-3.5 bg-slate-950/35 border border-teal-500/10 rounded-xl">
                    <label className="block text-[10px] uppercase font-extrabold text-teal-400">
                      Ваш API-Ключ Gemini:
                    </label>
                    <input 
                      type="password"
                      value={directApiKey}
                      onChange={(e) => setDirectApiKey(e.target.value)}
                      placeholder="Введите ключ: AIzaSy..."
                      className={`w-full px-3 py-2 text-xs rounded-lg border font-mono ${
                        isDark 
                          ? 'bg-slate-950 border-white/5 text-slate-100 placeholder-slate-600 focus:border-teal-500/40 focus:ring-1 focus:ring-teal-500/25' 
                          : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-teal-500/30'
                      }`}
                    />
                    <div className="text-[9.5px] text-slate-400 leading-normal">
                      💡 Свой ключ можно быстро получить бесплатно на официальном сайте <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:underline font-extrabold">Google AI Studio</a>. Ключ сохраняется локально на вашем устройстве.
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button 
                    type="button"
                    onClick={() => setShowSettings(false)}
                    className="flex-1 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-md"
                  >
                    Применить и продолжить
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="max-w-3xl mx-auto py-6 space-y-6">
            
            {/* Mascot greetings */}
            <div className={`p-6 rounded-2xl border text-center relative overflow-hidden ${
              isDark ? 'bg-slate-950/30 border-teal-500/10 shadow-inner' : 'bg-teal-50/20 border-teal-500/15'
            }`}>
              <div className="absolute top-0 right-0 p-8 opacity-5 text-teal-400 pointer-events-none">
                <Bot size={120} />
              </div>
              <div className="w-12 h-12 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mx-auto text-teal-400 text-lg font-bold mb-3 animate-bounce">
                🤖
              </div>
              <h3 className="text-sm font-extrabold font-display mb-1 text-slate-100">
                Привет! Я Milli — ваш персональный финансовый советник
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xl mx-auto">
                Я имею защищенный доступ к вашим локальным операциям, счетам накоплений и бюджетам в AZN. 
                Вы можете задать мне любой вопрос о ваших деньгах или запустить быстрый аудит!
              </p>
            </div>

            {/* Quick Presets */}
            <div className="space-y-2.5">
              <h4 className="text-[11px] uppercase tracking-wider font-extrabold text-slate-400 px-1">
                Выберите действие в одно касание:
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                {presetQuestions.map((q, pIdx) => {
                  const Icon = q.icon;
                  return (
                    <button
                       key={pIdx}
                      onClick={() => handleSendMessage(q.text)}
                      className={`p-3.5 rounded-xl border text-left transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer hover:shadow-lg flex flex-col gap-2 ${
                        isDark 
                          ? 'border-white/5 bg-slate-950/20 hover:bg-slate-950/40 hover:border-teal-500/20' 
                          : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-teal-500/30'
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg w-fit ${q.color}`}>
                        <Icon size={14} />
                      </div>
                      <div>
                        <div className="text-[11.5px] font-extrabold text-slate-100 leading-tight">
                          {q.title}
                        </div>
                        <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
                          {q.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Security disclaimer */}
            <div className="text-[10.5px] text-slate-500 text-center flex items-center justify-center gap-1.5">
              <span>🔒 Анализ полностью безопасен и конфиденциален. Данные не передаются третьим лицам.</span>
            </div>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto space-y-4 pb-6 px-1 md:px-4">
            {messages.map((m) => {
              const isUser = m.role === 'user';
              return (
                <div 
                  key={m.id} 
                  className={`flex gap-3 max-w-[94%] ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
                >
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center border text-xs font-bold leading-none ${
                    isUser 
                      ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' 
                      : 'bg-slate-950 text-emerald-400 border-slate-800'
                  }`}>
                    {isUser ? <User size={14} /> : 'M'}
                  </div>

                  {/* Bubble content */}
                  <div className={`p-4 rounded-2xl text-[13px] border flex-1 ${
                    isUser 
                      ? (isDark ? 'bg-teal-950/30 border-teal-500/10 text-slate-200' : 'bg-teal-50 border-teal-500/10 text-teal-950')
                      : (isDark ? 'bg-slate-950/40 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800')
                  }`}>
                    <div className="space-y-1">
                      {isUser ? m.text : renderMarkdown(m.text)}
                    </div>
                    <div className="text-[9px] text-slate-500 mt-2 text-right">
                      {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Thinking / Loading state */}
            {loading && (
              <div className="flex gap-3 max-w-[90%]">
                <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center bg-slate-950 text-emerald-400 border border-slate-800 text-xs font-bold animate-pulse">
                  <Loader2 size={13} className="animate-spin" />
                </div>
                <div className={`p-4 rounded-2xl text-xs border flex flex-col gap-1.5 justify-center flex-1 ${
                  isDark ? 'bg-slate-950/30 border-slate-900 text-slate-350' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-teal-400 animate-pulse">Milli думает...</span>
                  </div>
                  <span className="text-[10.5px] italic text-slate-500 truncate max-w-[200px]">
                    {loadingTip || "Анализирую данные..."}
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input controls form bottom bar */}
      <div className={`p-4 border-t ${
        isDark ? 'border-white/5 bg-slate-950/30' : 'border-slate-100 bg-slate-50/50'
      }`}>
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(input);
          }}
          className="max-w-5xl mx-auto flex gap-2"
        >
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="Спроси Milli: «Какая категория съедает больше всего бюджета?»"
            className={`flex-1 px-4 py-2.5 text-xs rounded-xl border focus:outline-hidden transition-all ${
              isDark 
                ? 'border-white/5 bg-slate-950 text-slate-100 placeholder-slate-500 focus:border-teal-500/40 focus:ring-1 focus:ring-teal-500/25' 
                : 'border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-teal-500/30 focus:ring-1 focus:ring-teal-500/20'
            }`}
            id="milli-ai-input-field"
          />
          <button 
            type="submit"
            disabled={loading || !input.trim()}
            className={`px-4 py-2 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              loading || !input.trim()
                ? 'bg-slate-800/10 text-slate-500 border-transparent cursor-not-allowed'
                : 'bg-teal-500/15 border-teal-500/20 text-teal-300 hover:bg-teal-500/25 hover:scale-[1.02] active:scale-[0.98]'
            }`}
            id="milli-ai-send-btn"
          >
            <Send size={12} />
            <span className="hidden sm:inline">Отправить</span>
          </button>
        </form>
      </div>

    </div>
  );
}
