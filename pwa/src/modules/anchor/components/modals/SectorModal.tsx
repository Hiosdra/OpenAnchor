import { useState, useEffect } from 'react';
import { PieChart } from 'lucide-react';
import { Modal } from './Modal';
import { useI18n } from '../../hooks/useI18n';

export interface SectorModalProps {
  open: boolean;
  onClose: () => void;
  sectorEnabled: boolean;
  sectorBearing: number;
  sectorWidth: number;
  onSave: (enabled: boolean, bearing: number, width: number) => void;
}

export function SectorModal({
  open,
  onClose,
  sectorEnabled,
  sectorBearing,
  sectorWidth,
  onSave,
}: SectorModalProps) {
  const { t } = useI18n();
  const [enabled, setEnabled] = useState(sectorEnabled);
  const [bearing, setBearing] = useState(sectorBearing);
  const [width, setWidth] = useState(sectorWidth);

  useEffect(() => {
    setEnabled(sectorEnabled);
    setBearing(sectorBearing);
    setWidth(sectorWidth);
  }, [sectorEnabled, sectorBearing, sectorWidth]);

  const handleSave = () => {
    onSave(enabled, bearing, width);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose}>
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <PieChart className="text-blue-400" />
        <span>{t.sectorTitle}</span>
      </h3>

      <label className="flex items-center gap-3 bg-slate-700 p-3 rounded-xl mb-4 border border-slate-600 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="w-5 h-5 accent-blue-500 rounded"
        />
        <span className="text-white font-medium">{t.sectorEnable}</span>
      </label>

      <div
        className={`grid grid-cols-2 gap-4 mb-6 transition-opacity ${enabled ? '' : 'opacity-50 pointer-events-none'}`}
      >
        <div>
          <label className="block text-slate-300 text-xs mb-1">{t.sectorCenter}</label>
          <input
            type="number"
            value={bearing}
            min={0}
            max={360}
            onChange={(e) => setBearing(Number(e.target.value))}
            className="w-full bg-slate-900 text-white p-2 rounded-lg border border-slate-600 outline-none"
          />
        </div>
        <div>
          <label className="block text-slate-300 text-xs mb-1">{t.sectorWidth}</label>
          <input
            type="number"
            value={width}
            min={10}
            max={360}
            onChange={(e) => setWidth(Number(e.target.value))}
            className="w-full bg-slate-900 text-white p-2 rounded-lg border border-slate-600 outline-none"
          />
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
          onClick={handleSave}
          className="flex-1 bg-blue-600 py-3 rounded-xl font-bold text-white"
        >
          {t.btnSave}
        </button>
      </div>
    </Modal>
  );
}
