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
    if (cog !== null) {
      setBearing((cog + 180) % 360);
    }
  };

  const handleApply = () => {
    onApply(dist, bearing);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose}>
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
            value={bearing}
            min={0}
            max={360}
            onChange={(e) => setBearing(Number(e.target.value))}
            className="w-full bg-slate-700 text-white p-3 rounded-lg border border-slate-600 outline-none"
          />
          <button
            onClick={handleBehind}
            disabled={cog === null}
            className="bg-slate-600 px-3 rounded-lg text-xs font-bold text-slate-300 disabled:opacity-50"
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
          onClick={handleApply}
          className="flex-1 bg-blue-600 py-3 rounded-xl font-bold text-white"
        >
          {t.btnSet}
        </button>
      </div>
    </Modal>
  );
}
