import { MapPinOff } from 'lucide-react';
import { useI18n } from '../hooks/useI18n';

export interface MapContainerProps {
  mapRef: React.RefObject<HTMLDivElement | null>;
  hasGpsFix: boolean;
  gpsSignalLost: boolean;
}

export function MapContainer({ mapRef, hasGpsFix, gpsSignalLost }: MapContainerProps) {
  const { t } = useI18n();
  const showNoSignal = !hasGpsFix || gpsSignalLost;

  return (
    <div
      id="map"
      ref={mapRef}
      className="flex-grow w-full relative min-h-[200px] max-h-[50vh]"
      role="application"
      aria-label="Anchor position map"
    >
      {showNoSignal && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm z-[1000]">
          <MapPinOff className="w-10 h-10 text-slate-500 mb-2" />
          <p className="text-slate-400 text-sm font-medium">{t.noGpsSignal}</p>
        </div>
      )}
    </div>
  );
}
