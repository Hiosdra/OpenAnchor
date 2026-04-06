import { AlertCircle, SatelliteDish, BatteryWarning, Timer, Wifi } from 'lucide-react';
import { Modal } from './Modal';
import { useI18n } from '../../hooks/useI18n';

export interface AlertModalsProps {
  dragWarningOpen: boolean;
  onDragDismiss: () => void;
  onDragCheck: () => void;
  gpsLostOpen: boolean;
  onGpsLostClose: () => void;
  batteryLowOpen: boolean;
  onBatteryLowClose: () => void;
  watchAlertOpen: boolean;
  onWatchAlertOk: () => void;
  connLostOpen: boolean;
  onConnLostClose: () => void;
}

export function AlertModals({
  dragWarningOpen,
  onDragDismiss,
  onDragCheck,
  gpsLostOpen,
  onGpsLostClose,
  batteryLowOpen,
  onBatteryLowClose,
  watchAlertOpen,
  onWatchAlertOk,
  connLostOpen,
  onConnLostClose,
}: AlertModalsProps) {
  const { t } = useI18n();

  return (
    <>
      {/* Drag Warning */}
      <Modal
        open={dragWarningOpen}
        onClose={onDragDismiss}
        className="border-2 border-orange-500 shadow-[0_0_25px_rgba(249,115,22,0.3)]"
      >
        <h3 className="text-lg sm:text-xl font-bold text-orange-500 mb-2 flex items-center gap-2">
          <AlertCircle /> <span>{t.dragTitle}</span>
        </h3>
        <p className="text-slate-300 text-sm mb-4 sm:mb-6 leading-relaxed">{t.dragBody}</p>
        <div className="flex gap-2 sm:gap-3">
          <button
            onClick={onDragDismiss}
            className="flex-1 bg-slate-700 py-2.5 sm:py-3 rounded-xl font-bold text-sm sm:text-base border border-slate-600"
          >
            {t.dragIgnore}
          </button>
          <button
            onClick={onDragCheck}
            className="flex-1 bg-orange-600 hover:bg-orange-500 py-2.5 sm:py-3 rounded-xl font-bold text-sm sm:text-base text-white transition-colors"
          >
            {t.dragCheck}
          </button>
        </div>
      </Modal>

      {/* GPS Lost */}
      <Modal
        open={gpsLostOpen}
        onClose={onGpsLostClose}
        className="border-2 border-yellow-500 shadow-[0_0_25px_rgba(234,179,8,0.3)]"
      >
        <h3 className="text-xl font-bold text-yellow-500 mb-2 flex items-center gap-2">
          <SatelliteDish /> <span>{t.gpsLostTitle}</span>
        </h3>
        <p className="text-slate-300 text-sm mb-2 leading-relaxed">{t.gpsLostBody}</p>
        <p className="text-slate-400 text-xs mb-6">{t.gpsLostHint}</p>
        <button
          onClick={onGpsLostClose}
          className="w-full bg-yellow-600 hover:bg-yellow-500 py-3 rounded-xl font-bold text-white"
        >
          {t.btnUnderstood}
        </button>
      </Modal>

      {/* Battery Low */}
      <Modal
        open={batteryLowOpen}
        onClose={onBatteryLowClose}
        className="border-2 border-red-600 shadow-[0_0_30px_rgba(220,38,38,0.3)]"
      >
        <h3 className="text-xl font-bold text-red-500 mb-2 flex items-center gap-2">
          <BatteryWarning /> <span>{t.battLowTitle}</span>
        </h3>
        <p
          className="text-slate-300 text-sm mb-6 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: t.battLowBody }}
        />
        <button
          onClick={onBatteryLowClose}
          className="w-full bg-red-600 hover:bg-red-500 py-3 rounded-xl font-bold text-white"
        >
          {t.btnUnderstood}
        </button>
      </Modal>

      {/* Watch Alert */}
      <Modal
        open={watchAlertOpen}
        onClose={onWatchAlertOk}
        className="border-2 border-blue-500 shadow-[0_0_25px_rgba(59,130,246,0.3)] text-center"
      >
        <Timer className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-bounce" />
        <h3 className="text-2xl font-bold text-white mb-2">{t.watchAlertTitle}</h3>
        <p className="text-slate-300 text-sm mb-6 leading-relaxed">{t.watchAlertBody}</p>
        <button
          onClick={onWatchAlertOk}
          className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-bold text-white"
        >
          {t.watchAlertOk}
        </button>
      </Modal>

      {/* Connection Lost */}
      <Modal
        open={connLostOpen}
        onClose={onConnLostClose}
        className="border-2 border-red-600 shadow-[0_0_25px_rgba(220,38,38,0.3)]"
      >
        <h3 className="text-xl font-bold text-red-500 mb-2 flex items-center gap-2">
          <Wifi /> <span>{t.wsConnLost}</span>
        </h3>
        <p className="text-slate-300 text-sm mb-6 leading-relaxed">{t.wsConnLostBody}</p>
        <button
          onClick={onConnLostClose}
          className="w-full bg-red-600 hover:bg-red-500 py-3 rounded-xl font-bold text-white"
        >
          {t.btnUnderstood}
        </button>
      </Modal>
    </>
  );
}
