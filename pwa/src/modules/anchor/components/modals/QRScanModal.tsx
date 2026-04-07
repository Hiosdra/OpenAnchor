import { useState } from 'react';
import { QrCode } from 'lucide-react';
import { Modal } from './Modal';
import { useI18n } from '../../hooks/useI18n';

export interface QRScanModalProps {
  open: boolean;
  onClose: () => void;
  onConnect: (url: string) => void;
}

export function QRScanModal({ open, onClose, onConnect }: QRScanModalProps) {
  const { t } = useI18n();
  const [scanUrl, setScanUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = () => {
    if (scanUrl) {
      onConnect(scanUrl);
      onClose();
    }
  };

  return (
    <Modal open={open} onClose={onClose} className="border border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
      <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
        <QrCode className="text-emerald-400" />
        <span>{t.qrTitle}</span>
      </h3>

      <p className="text-slate-400 text-xs mb-3">{t.qrDesc}</p>

      {/* QR scanner mounts here */}
      <div
        id="qr-reader"
        className="w-full rounded-xl overflow-hidden mb-3 bg-slate-900"
        style={{ minHeight: 250 }}
      />

      {scanUrl && (
        <div className="bg-emerald-900/50 p-3 rounded-xl border border-emerald-700 mb-3">
          <div className="text-emerald-400 text-sm font-bold mb-1">{t.qrFound}</div>
          <div className="text-white font-mono text-xs break-all">{scanUrl}</div>
        </div>
      )}

      {error && (
        <div className="text-red-400 text-sm mb-3">{error}</div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 rounded-xl font-bold border border-slate-600"
        >
          {t.btnClose}
        </button>
        {scanUrl && (
          <button
            onClick={handleConnect}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-3 rounded-xl font-bold text-white"
          >
            {t.btnConnect}
          </button>
        )}
      </div>
    </Modal>
  );
}
