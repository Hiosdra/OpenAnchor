import { useState } from 'react';
import { Anchor, Crosshair, BatteryWarning, Smartphone } from 'lucide-react';
import { useI18n } from '../hooks/useI18n';

export interface OnboardingProps {
  visible: boolean;
  onComplete: () => void;
}

const STEPS = [
  {
    icon: Anchor,
    titleKey: 'obWelcome',
    bodyKey: 'obWelcomeBody',
    html: false,
    iconColor: 'text-blue-500',
  },
  {
    icon: Crosshair,
    titleKey: 'obZone',
    bodyKey: 'obZoneBody',
    html: false,
    iconColor: 'text-green-500',
  },
  {
    icon: BatteryWarning,
    titleKey: 'obRules',
    bodyKey: 'obRulesBody',
    html: true,
    iconColor: 'text-orange-500',
  },
  {
    icon: Smartphone,
    titleKey: 'obExpand',
    bodyKey: 'obExpandBody',
    html: false,
    iconColor: 'text-purple-400',
  },
] as const;

export function Onboarding({ visible, onComplete }: OnboardingProps) {
  const { t } = useI18n();
  const [step, setStep] = useState(0);

  if (!visible) return null;

  const isLast = step === STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <div id="onboarding-overlay" className="fixed inset-0 bg-slate-900 z-[6000] flex flex-col">
      <div className="flex-grow relative overflow-hidden">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          return (
            <div
              key={i}
              className={`absolute inset-0 flex flex-col items-center justify-center p-8 text-center transition-opacity duration-300 ${
                isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              <Icon className={`w-24 h-24 ${s.iconColor} mb-6`} />
              <h2 className="text-3xl font-bold text-white mb-4">{t[s.titleKey]}</h2>
              {s.html ? (
                <p
                  className="text-slate-300 text-sm leading-relaxed max-w-sm"
                  dangerouslySetInnerHTML={{ __html: t[s.bodyKey] }}
                />
              ) : (
                <p className="text-slate-300 text-sm leading-relaxed max-w-sm">{t[s.bodyKey]}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-6 bg-slate-800 border-t border-slate-700 flex justify-between items-center">
        <button
          onClick={onComplete}
          className="text-slate-400 font-medium text-sm px-4 py-2 hover:text-white transition-colors"
        >
          {t.obSkip}
        </button>

        <div className="flex gap-2">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                i === step ? 'bg-blue-500' : 'bg-slate-600'
              }`}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-xl transition-colors"
        >
          {isLast ? t.obStart : t.obNext}
        </button>
      </div>
    </div>
  );
}
