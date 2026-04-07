import { useState, useRef, useEffect } from 'react';
import { Sparkles, Key, Trash2, Send, Anchor, MessageCircle, CloudLightning, BookOpen, Save, Loader2 } from 'lucide-react';
import { Modal } from './Modal';
import { useI18n } from '../../hooks/useI18n';

export interface AIModalProps {
  open: boolean;
  onClose: () => void;
  chatMessages: Array<{ role: 'user' | 'assistant'; content: string }>;
  loading: boolean;
  onSendMessage: (message: string) => void;
  onClearChat: () => void;
  logbookEntry: { summary: string; logEntry: string; safetyNote: string } | null;
  onSaveLogbook: () => void;
  hasApiKey: boolean;
  onOpenApiKeyModal: () => void;
}

export function AIModal({
  open,
  onClose,
  chatMessages,
  loading,
  onSendMessage,
  onClearChat,
  logbookEntry,
  onSaveLogbook,
  hasApiKey,
  onOpenApiKeyModal,
}: AIModalProps) {
  const { t } = useI18n();
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSend = () => {
    const msg = input.trim();
    if (!msg || loading) return;
    onSendMessage(msg);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      id="ai-modal"
      className="flex flex-col max-h-[90vh] border border-purple-600 shadow-[0_0_15px_rgba(147,51,234,0.3)]"
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Sparkles className="text-purple-400" />
          <span>{t.aiTitle}</span>
        </h3>
        <div className="flex items-center gap-2">
          <button
            id="ai-clear-chat-btn"
            onClick={onClearChat}
            className={`text-slate-500 hover:text-red-400 transition-colors${chatMessages.length === 0 ? ' invisible' : ''}`}
            title="Clear chat"
            aria-label="Clear chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            id="edit-api-key-btn"
            onClick={onOpenApiKeyModal}
            className="text-slate-400"
            aria-label="API Key"
          >
            <Key className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Context badge */}
      <div className="mb-2 text-[10px] bg-purple-900/50 text-purple-300 px-2 py-1 rounded-lg flex items-center gap-1">
        <Anchor className="w-3 h-3" />
        <span>{t.aiContextActive}</span>
      </div>

      {/* Chat area */}
      <div id="ai-chat-area" className="flex-grow overflow-y-auto mb-3 space-y-2 min-h-[120px] max-h-[45vh]">
        {chatMessages.length === 0 && !loading && (
          <div className="text-slate-500 text-xs text-center py-6">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>{t.aiChatPlaceholder}</p>
          </div>
        )}
        {chatMessages.map((msg, i) => (
          <div
            key={i}
            className={`rounded-xl px-3 py-2 text-sm max-w-[85%] ${
              msg.role === 'user'
                ? 'bg-purple-900/50 text-white ml-auto'
                : 'bg-slate-700 text-slate-200'
            }`}
          >
            {msg.content}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-purple-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{t.aiAnalyzing}</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      {!hasApiKey && (
        <div className="text-xs text-yellow-400 mb-2">
          {t.aiErrorKey}{' '}
          <button onClick={onOpenApiKeyModal} className="underline">{t.apiTitle}</button>
        </div>
      )}

      <div className="flex gap-2 shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t.aiInputPlaceholder}
          className="flex-grow bg-slate-700 text-white p-2.5 rounded-xl outline-none text-sm border border-slate-600 focus:border-purple-500"
          disabled={!hasApiKey}
        />
        <button
          onClick={handleSend}
          disabled={loading || !hasApiKey || !input.trim()}
          className="bg-purple-600 hover:bg-purple-500 px-4 rounded-xl font-bold text-white transition-colors shrink-0 flex items-center justify-center disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      <div className="text-[10px] text-blue-400 mt-1.5 flex items-center gap-1">
        <CloudLightning className="w-3 h-3" />
        <span>{t.aiInfo}</span>
      </div>

      {/* Logbook entry */}
      {logbookEntry && (
        <div className="mt-3 space-y-2 border-t border-slate-700 pt-3">
          <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1">
            <BookOpen className="w-3 h-3" /> {t.logTitle}
          </h4>
          <div className="text-white text-sm font-bold border-l-4 border-blue-500 pl-3 py-1">
            {logbookEntry.summary}
          </div>
          <div className="text-slate-200 text-sm leading-relaxed italic bg-slate-900/50 p-3 rounded-lg">
            {logbookEntry.logEntry}
          </div>
          {logbookEntry.safetyNote && (
            <div className="text-xs flex items-start gap-2 bg-slate-900/50 p-2 rounded-lg">
              <span className="text-slate-300">{logbookEntry.safetyNote}</span>
            </div>
          )}
          <button
            onClick={onSaveLogbook}
            className="w-full bg-blue-600 hover:bg-blue-500 py-2.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" /> {t.logSave}
          </button>
        </div>
      )}

      <button
        onClick={onClose}
        className="w-full bg-slate-700 py-2.5 rounded-xl font-bold shrink-0 mt-2 text-sm"
      >
        {t.btnClose}
      </button>
    </Modal>
  );
}
