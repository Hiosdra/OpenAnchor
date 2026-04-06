import { useState } from 'react';
import { MoveDownLeft } from 'lucide-react';
import { Modal } from './Modal';
import { useI18n } from '../../hooks/useI18n';

export interface OffsetModalProps {
  open: boolean;
  onClose: () => void;
  cog: number | null;
  onApply: (distance: number, bearing: number) => void;
}

export function OffsetModal({ open, onClose, cog, onApply }: OffsetModalProps) {
  const { t } = useI18n();
  const [dist, setDist] = useState(30);
  const [bearing, setBearing] = useState(0);

  const handleBehind = () => {
    setBearing(((cog ?? 0) + 180) % 360);
  };

  const handleApply = () => {
    onApply(dist, bearing);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} id="offset-modal">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <MoveDownLeft className="text-blue-400" />
        <span>{t.offsetTitle}</span>
      </h3>

      <div className="mb-4">
        <label className="block text-slate-300 text-sm mb-1">
          {t.offsetDist} (m)
        </label>
        <input
          type="number"
          id="offset-dist"
          value={dist}
          min={1}
          onChange={(e) => setDist(Number(e.target.value))}
          className="w-full bg-slate-700 text-white p-3 rounded-lg border border-slate-600 outline-none"
        />
      </div>

      <div className="mb-6">
        <label className="block text-slate-300 text-sm mb-1">{t.offsetBearing}</label>
        <div className="flex gap-2">
          <input
            type="number"
            id="offset-bearing"
            value={bearing}
            min={0}
            max={360}
            onChange={(e) => setBearing(Number(e.target.value))}
            className="w-full bg-slate-700 text-white p-3 rounded-lg border border-slate-600 outline-none"
          />
          <button
            id="set-bearing-behind-btn"
            onClick={handleBehind}
            className="bg-slate-600 px-3 rounded-lg text-xs font-bold text-slate-300"
          >
            {t.offsetBehind}
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 bg-slate-700 py-3 rounded-xl font-bold border border-slate-600"
        >
          {t.btnCancel}
        </button>
        <button
          id="confirm-offset-btn"
          onClick={handleApply}
          className="flex-1 bg-blue-600 py-3 rounded-xl font-bold text-white"
        >
          {t.btnSet}
        </button>
      </div>
    </Modal>
  );
}
