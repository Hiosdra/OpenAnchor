import React from 'react';

interface QRModalProps {
  isNightMode: boolean;
  showQRModal: boolean;
  setShowQRModal: (v: boolean) => void;
  qrError: string | null;
  qrCodeRef: React.RefObject<HTMLDivElement | null>;
}

export function QRModal({ isNightMode, showQRModal, setShowQRModal, qrError, qrCodeRef }: QRModalProps) {
  if (!showQRModal) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 print:hidden"
      onClick={() => setShowQRModal(false)}
      onKeyDown={(e) => {
        if (e.key === 'Escape' || e.key === 'Esc') {
          setShowQRModal(false);
        }
      }}
    >
      <div
        className={`rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 ${isNightMode ? 'bg-zinc-950 border border-red-900' : 'bg-white'}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-modal-title"
        tabIndex={-1}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 id="qr-modal-title" className={`text-xl font-bold ${isNightMode ? 'text-red-500' : 'text-sky-900'}`}>
            Udostępnij przez QR kod
          </h3>
          <button
            onClick={() => setShowQRModal(false)}
            className={`p-3 min-h-[44px] min-w-[44px] rounded-full transition ${isNightMode ? 'hover:bg-red-950 text-red-500' : 'hover:bg-slate-100 text-slate-500'}`}
            aria-label="Zamknij okno (Escape)"
            autoFocus
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        {qrError ? (
          <div className={`p-4 rounded-lg mb-4 text-center ${isNightMode ? 'bg-red-950 text-red-400 border border-red-900' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            <p className="text-sm font-medium">{qrError}</p>
          </div>
        ) : (
          <div className={`flex justify-center items-center p-4 rounded-lg mb-4 ${isNightMode ? 'bg-black' : 'bg-slate-50'}`}>
            <div ref={qrCodeRef} className="flex justify-center"></div>
          </div>
        )}
        <p className={`text-sm text-center ${isNightMode ? 'text-red-700' : 'text-slate-600'}`}>
          {qrError ? 'Użyj przycisku "Udostępnij" aby skopiować link do schowka.' : 'Zeskanuj ten kod QR, aby udostępnić swój grafik wacht'}
        </p>
      </div>
    </div>
  );
}
