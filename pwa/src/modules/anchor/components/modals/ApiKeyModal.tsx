import { useState } from 'react';
import { Key } from 'lucide-react';
import { Modal } from './Modal';
import { useI18n } from '../../hooks/useI18n';

export interface ApiKeyModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
  onClear: () => void;
  hasKey: boolean;
}

export function ApiKeyModal({ open, onClose, onSave, onClear, hasKey }: ApiKeyModalProps) {
  const { t } = useI18n();
  const [keyValue, setKeyValue] = useState('');

  const handleSave = () => {
    if (keyValue.trim()) {
      onSave(keyValue.trim());
      setKeyValue('');
      onClose();
    }
  };

  return (
    <Modal open={open} onClose={onClose} id="api-key-modal" className="border border-purple-500 shadow-[0_0_15px_rgba(147,51,234,0.3)]">
      <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
        <Key className="text-purple-400" />
        <span>{t.apiTitle}</span>
      </h3>

      <p className="text-slate-300 text-sm mb-3">{t.apiDesc}</p>

      <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 mb-4">
        <p className="text-slate-400 text-xs mb-2 font-bold">{t.apiHow}</p>
        <ol className="text-slate-400 text-xs space-y-1 list-decimal list-inside">
          <li>
            {t.apiStep1}{' '}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              Google AI Studio
            </a>
          </li>
          <li>{t.apiStep2}</li>
          <li>{t.apiStep3}</li>
          <li>{t.apiStep4}</li>
        </ol>
      </div>

      <input
        type="password"
        id="api-key-input"
        value={keyValue}
        onChange={(e) => setKeyValue(e.target.value)}
        placeholder="AIzaSy..."
        className="w-full bg-slate-700 text-white p-3 rounded-lg border border-slate-600 outline-none mb-4 font-mono text-sm"
      />

      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 bg-slate-700 py-3 rounded-xl font-bold"
        >
          {t.btnCancel}
        </button>
        <button
          id="save-api-key-btn"
          onClick={handleSave}
          disabled={!keyValue.trim()}
          className="flex-1 bg-purple-600 py-3 rounded-xl font-bold text-white disabled:opacity-50"
        >
          {t.btnSave}
        </button>
      </div>

      {hasKey && (
        <button
          id="edit-api-key-btn"
          onClick={onClear}
          className="w-full mt-3 text-xs text-red-400 underline"
        >
          {t.apiDelete}
        </button>
      )}
    </Modal>
  );
}
