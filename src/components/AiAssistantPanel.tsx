import React, { useState, useRef, useEffect } from 'react';
import { FinanceData } from '../types';
import { Sparkles, Send, Trash2, HelpCircle, Bot, User, ArrowRight, Loader2, DollarSign, Wallet, ShieldAlert, BarChart3 } from 'lucide-react';

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
    setLoading(true);

    try {
      // Map existing messages format to backend expects
      const historyPayload = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        text: m.text
      }));

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
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Ошибка сервера (${res.status})`);
      }

      const data = await res.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString() + '-assistant',
        role: 'assistant',
        text: data.text || 'К сожалению, ответ не был получен.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error(err);
      addToast(err?.message || "Не удалось связаться с ИИ-помощником.", 'critical');
      
      // Add error message to chat so user knows what failed
      const errorMessage: Message = {
        id: (Date.now() + 1).toString() + '-assistant',
        role: 'assistant',
        text: `⚠️ **Ошибка подключения к ИИ-помощнику**: ${err?.message || 'Пожалуйста, проверьте наличие ключа GEMINI_API_KEY в меню настроек.'}`,
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

      {/* Messages / Welcome View Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
        {messages.length === 0 ? (
          <div className="max-w-xl mx-auto py-6 space-y-6">
            
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
              <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
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
          <div className="max-w-2xl mx-auto space-y-4 pb-6">
            {messages.map((m) => {
              const isUser = m.role === 'user';
              return (
                <div 
                  key={m.id} 
                  className={`flex gap-3 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
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
                  <div className={`p-4 rounded-2xl text-[13px] border ${
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
              <div className="flex gap-3 max-w-[80%]">
                <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center bg-slate-950 text-emerald-400 border border-slate-800 text-xs font-bold animate-pulse">
                  <Loader2 size={13} className="animate-spin" />
                </div>
                <div className={`p-4 rounded-2xl text-xs border flex flex-col gap-1.5 justify-center ${
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
          className="max-w-2xl mx-auto flex gap-2"
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
