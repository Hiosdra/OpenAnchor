import { useCallback, useEffect, useRef } from 'react';
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
  const rootRef = useRef<HTMLDivElement>(null);

  // Sync hidden class with `open` prop after every render.
  // This is needed because E2E tests may manipulate the DOM directly
  // (e.g., classList.remove('hidden')) which desynchronises React's VDOM.
  useEffect(() => {
    if (rootRef.current) {
      rootRef.current.classList.toggle('hidden', !open);
    }
  });

  const handleClose = useCallback(() => {
    // Imperatively re-hide in case the modal was shown via DOM manipulation
    if (!open && rootRef.current) {
      rootRef.current.classList.add('hidden');
    }
    onClose();
  }, [open, onClose]);

  return (
    <div
      ref={rootRef}
      id={id}
      className={`modal fixed inset-0 bg-black/80 flex items-center justify-center z-[2000] p-4 ${
        open ? '' : 'hidden'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className={`bg-slate-800 p-6 rounded-2xl max-w-sm w-full border border-slate-700 relative ${className}`}>
        {title ? (
          <div className="flex items-center justify-between mb-4">
            <h3 id="modal-title" className="text-xl font-bold text-white">{title}</h3>
            <button
              onClick={handleClose}
              className="modal-close-btn text-slate-400 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleClose}
            className="modal-close-btn absolute top-3 right-3 text-slate-400 hover:text-white transition-colors z-10"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
