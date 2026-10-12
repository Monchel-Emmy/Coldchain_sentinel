import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Sparkles, Bot, User, Loader2, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

const QUICK_SUGGESTIONS = [
  "How do I perform a shake test?",
  "What is the storage temperature of polio vaccine?",
  "What should I do if the freezer goes out of range?",
  "How do I defrost a refrigerator safely?"
];

export default function AIChatBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize with welcome message
  useEffect(() => {
    setMessages([
      {
        sender: 'ai',
        text: 'Hello! I am **Sentinel AI**, your virtual Cold Chain assistant.\n\nI can help you with:\n- Vaccine storage temperature requirements (refrigerators & freezers)\n- Managing temperature excursions (too hot or too cold alerts)\n- Equipment maintenance (defrosting, cleaning, sensor alignment)\n- WHO/UNICEF clinical protocols (such as the **Shake Test** or **VVM guidelines**)\n\nWhat cold chain questions or storage issues can I assist you with today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Create history package (excluding current message)
      const history = messages.map(m => ({
        sender: m.sender,
        text: m.text
      }));

      const result = await api.sendAIChat(history, textToSend);

      const aiMessage: ChatMessage = {
        sender: 'ai',
        text: result.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('AI chat failed:', error);
      const errorMessage: ChatMessage = {
        sender: 'ai',
        text: '⚠️ **Communication Error**: I am having trouble connecting to the server. Please check your connection and try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    if (window.confirm("Start a new chat session? This will clear current history.")) {
      setMessages([
        {
          sender: 'ai',
          text: 'Hello! I am **Sentinel AI**, your virtual Cold Chain assistant.\n\nI can help you with:\n- Vaccine storage temperature requirements (refrigerators & freezers)\n- Managing temperature excursions (too hot or too cold alerts)\n- Equipment maintenance (defrosting, cleaning, sensor alignment)\n- WHO/UNICEF clinical protocols (such as the **Shake Test** or **VVM guidelines**)\n\nWhat cold chain questions or storage issues can I assist you with today?',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  };

  // Simple formatter for bold, bullets, and line breaks
  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, i) => {
      let content = line.trim();
      if (!content) return <div key={i} className="h-2" />;

      // Check if bullet point
      const isBullet = content.startsWith('* ') || content.startsWith('- ');
      if (isBullet) {
        content = content.substring(2);
      }

      // Parse bold text **bold**
      const parts = [];
      let lastIdx = 0;
      const boldRegex = /\*\*(.*?)\*\*/g;
      let match;
      while ((match = boldRegex.exec(content)) !== null) {
        if (match.index > lastIdx) {
          parts.push(content.substring(lastIdx, match.index));
        }
        parts.push(<strong key={match.index} className="font-semibold text-blue-400">{match[1]}</strong>);
        lastIdx = boldRegex.lastIndex;
      }
      if (lastIdx < content.length) {
        parts.push(content.substring(lastIdx));
      }

      const displayContent = parts.length > 0 ? parts : content;

      if (isBullet) {
        return (
          <li key={i} className="ml-4 list-disc list-outside mb-1 text-slate-200 text-sm">
            {displayContent}
          </li>
        );
      }
      return (
        <p key={i} className="mb-1.5 text-slate-200 leading-relaxed text-sm">
          {displayContent}
        </p>
      );
    });
  };

  return (
    <>
      {/* Floating Chat Bubble Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center group"
        title="Ask Sentinel AI"
      >
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500"></span>
        </span>
        <MessageSquare size={24} className="group-hover:rotate-12 transition-transform duration-300" />
      </button>

      {/* Slide-out Chat Drawer Container */}
      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <div
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 transition-opacity duration-300"
          />

          {/* Drawer panel */}
          <div
            className={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-slate-900/95 backdrop-blur-md border-l border-slate-850 text-slate-100 shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out transform translate-x-0`}
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-850 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center text-white shadow-md">
                  <Bot size={20} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                    Sentinel AI Assistant
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">Cold Chain Safety Expert</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleReset}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  title="Clear chat session"
                >
                  <RefreshCw size={16} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Chat Messages Log */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-3 max-w-[85%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-sm
                    ${msg.sender === 'user' ? 'bg-slate-700 text-slate-200' : 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white'}`}
                  >
                    {msg.sender === 'user' ? <User size={13} /> : <Sparkles size={13} />}
                  </div>

                  {/* Message Bubble */}
                  <div className="flex flex-col">
                    <div
                      className={`p-3 rounded-2xl shadow-sm text-sm border
                      ${msg.sender === 'user'
                          ? 'bg-blue-600/25 border-blue-500/30 text-slate-100 rounded-tr-none'
                          : 'bg-slate-800/80 border-slate-750/70 text-slate-200 rounded-tl-none'
                        }`}
                    >
                      {msg.sender === 'ai' ? (
                        <div className="space-y-1">{renderMarkdown(msg.text)}</div>
                      ) : (
                        <p className="leading-relaxed text-slate-100 text-sm whitespace-pre-wrap">{msg.text}</p>
                      )}
                    </div>
                    <span
                      className={`text-[10px] text-slate-500 mt-1 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}
                    >
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              ))}

              {/* Loader */}
              {isLoading && (
                <div className="flex gap-3 max-w-[85%] mr-auto">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Sparkles size={13} />
                  </div>
                  <div className="flex flex-col">
                    <div className="p-3 bg-slate-800/80 border border-slate-750/70 rounded-2xl rounded-tl-none flex items-center gap-2 text-slate-400 text-xs">
                      <Loader2 size={14} className="animate-spin text-blue-500" />
                      Sentinel is analyzing...
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Suggestions Drawer */}
            {messages.length === 1 && !isLoading && (
              <div className="px-4 py-2 bg-slate-850/50 border-t border-slate-850">
                <p className="text-[11px] text-slate-400 font-semibold mb-2 uppercase tracking-wider">Suggested Questions</p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_SUGGESTIONS.map((sug, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(sug)}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700/50 text-slate-300 hover:text-white transition-all text-left w-full hover:border-blue-500/30"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat Input form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputValue);
              }}
              className="p-3 bg-slate-850 border-t border-slate-800 flex gap-2"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about storage of vaccines..."
                disabled={isLoading}
                className="flex-1 bg-slate-900 border border-slate-750 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center shrink-0"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </>
      )}
    </>
  );
}
