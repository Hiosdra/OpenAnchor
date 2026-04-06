import { X } from 'lucide-react';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export function Modal({ open, onClose, title, children, className = '', id }: ModalProps) {
  return (
    <div
      id={id}
      className={`modal fixed inset-0 bg-black/80 flex items-center justify-center z-[2000] p-4 ${
        open ? '' : 'hidden'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`bg-slate-800 p-6 rounded-2xl max-w-sm w-full border border-slate-700 ${className}`}>
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h3 id="modal-title" className="text-xl font-bold text-white">{title}</h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
