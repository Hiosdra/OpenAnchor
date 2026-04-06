import { useState, useEffect } from 'react';
import { Ruler } from 'lucide-react';
import { Modal } from './Modal';
import { useI18n } from '../../hooks/useI18n';

export interface CalcModalProps {
  open: boolean;
  onClose: () => void;
  onApply: (radius: number) => void;
  chainLengthM: number | null;
  depthM: number | null;
  onChainChange: (v: number) => void;
  onDepthChange: (v: number) => void;
}

export function CalcModal({
  open,
  onClose,
  onApply,
  chainLengthM,
  depthM,
  onChainChange,
  onDepthChange,
}: CalcModalProps) {
  const { t } = useI18n();
  const [depth, setDepth] = useState(depthM ?? 5);
  const [ratio, setRatio] = useState(5);

  useEffect(() => { if (depthM !== null) setDepth(depthM); }, [depthM]);

  const chainLength = depth * ratio;
  const swing = chainLength > depth
    ? Math.sqrt(chainLength * chainLength - depth * depth)
    : 0;
  const radius = Math.round(swing * 1.2);

  const handleApply = () => {
    onDepthChange(depth);
    onChainChange(chainLength);
    onApply(radius);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} className="border border-slate-700">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <Ruler className="text-blue-400" />
        <span>{t.calcTitle}</span>
      </h3>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-slate-300 text-xs mb-1">
            {t.calcDepth} (m)
          </label>
          <input
            type="number"
            value={depth}
            min={1}
            onChange={(e) => setDepth(Number(e.target.value))}
            className="w-full bg-slate-700 text-white p-2 rounded-lg border border-slate-600 outline-none"
          />
        </div>
        <div>
          <label className="block text-slate-300 text-xs mb-1">{t.calcMulti}</label>
          <select
            value={ratio}
            onChange={(e) => setRatio(Number(e.target.value))}
            className="w-full bg-slate-700 text-white p-2.5 rounded-lg border border-slate-600 outline-none"
          >
            <option value={3}>3:1</option>
            <option value={5}>5:1</option>
            <option value={7}>7:1</option>
          </select>
        </div>
      </div>

      <div className="bg-slate-900 p-3 rounded-xl mb-4 text-center border border-slate-700">
        <div className="text-slate-400 text-xs">{t.calcResult}</div>
        <div className="text-2xl font-bold text-blue-400">
          {radius} <span className="text-sm">m</span>
        </div>
        <div className="text-[10px] text-slate-500 mt-1">
          sqrt(L²-D²) + 20%
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 bg-slate-700 py-3 rounded-xl font-bold border border-slate-600"
        >
          {t.btnClose}
        </button>
        <button
          onClick={handleApply}
          className="flex-1 bg-blue-600 py-3 rounded-xl font-bold text-white"
        >
          {t.btnApply}
        </button>
      </div>
    </Modal>
  );
}
