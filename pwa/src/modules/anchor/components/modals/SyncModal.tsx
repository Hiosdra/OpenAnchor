import { useState } from 'react';
import { Smartphone } from 'lucide-react';
import { Modal } from './Modal';
import { useI18n } from '../../hooks/useI18n';

export interface SyncModalProps {
  open: boolean;
  onClose: () => void;
  wsConnected: boolean;
  wsUrl: string;
  onConnect: (url: string) => void;
  onDisconnect: () => void;
  onUrlChange: (url: string) => void;
}

export function SyncModal({
  open,
  onClose,
  wsConnected,
  wsUrl,
  onConnect,
  onDisconnect,
  onUrlChange,
}: SyncModalProps) {
  const { t } = useI18n();

  return (
    <Modal
      open={open}
      onClose={onClose}
      id="ws-sync-modal"
      className="border border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
    >
      <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
        <Smartphone className="text-blue-400" />
        <span>{t.wsTitle}</span>
      </h3>

      <p className="text-slate-300 text-xs mb-4">{t.wsDesc}</p>

      <div className="flex items-center gap-2 mb-3">
        <span
          className={`w-2.5 h-2.5 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`}
        />
        <span className={`text-xs font-medium ${wsConnected ? 'text-green-400' : 'text-red-400'}`}>
          {wsConnected ? t.connOnline : t.connOffline}
        </span>
      </div>

      <label className="block text-slate-300 text-xs mb-1">{t.wsInputLabel}</label>
      <input
        type="text"
        value={wsUrl}
        onChange={(e) => onUrlChange(e.target.value)}
        placeholder="ws://192.168.43.1:8080"
        className="w-full bg-slate-700 text-white p-3 rounded-lg border border-slate-600 outline-none mb-4 font-mono text-sm"
      />

      <div className="flex gap-3">
        <button
          onClick={onDisconnect}
          disabled={!wsConnected}
          className="flex-1 bg-red-900/50 hover:bg-red-900 text-red-300 py-3 rounded-xl font-bold border border-red-800 transition-colors disabled:opacity-50"
        >
          {t.btnDisconnect}
        </button>
        <button
          onClick={() => onConnect(wsUrl)}
          disabled={wsConnected || !wsUrl}
          className="flex-1 bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-bold text-white transition-colors disabled:opacity-50"
        >
          {t.btnConnect}
        </button>
      </div>

      <button
        onClick={onClose}
        className="w-full mt-3 bg-slate-700 py-2 rounded-xl text-sm font-bold border border-slate-600"
      >
        {t.wsCloseWindow}
      </button>
    </Modal>
  );
}
