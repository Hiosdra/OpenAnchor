// @ts-nocheck
import React from 'react';
import { Icon } from './Icon';

interface HelpPanelProps {
  isNightMode: boolean;
}

export function HelpPanel({ isNightMode }: HelpPanelProps) {
  return (
    <div className={`p-4 rounded-xl border print:hidden ${isNightMode ? 'bg-zinc-950 border-red-900' : 'bg-blue-50 border-blue-200'}`}>
      <div className="flex items-start space-x-3">
        <Icon name="HelpCircle" className={`w-5 h-5 shrink-0 mt-0.5 ${isNightMode ? 'text-red-500' : 'text-blue-600'}`} />
        <div className="flex-1">
          <h3 className={`font-semibold mb-2 ${isNightMode ? 'text-red-400' : 'text-blue-900'}`}>
            Szybka pomoc
          </h3>
          <div className={`text-sm space-y-1 ${isNightMode ? 'text-red-700' : 'text-blue-800'}`}>
            <p><strong>Krok 1:</strong> Dodaj członków załogi (minimum 3 osoby)</p>
            <p><strong>Krok 2:</strong> Wybierz lub dostosuj system wacht po prawej stronie</p>
            <p><strong>Krok 3:</strong> Ustaw datę rozpoczęcia i długość rejsu</p>
            <p><strong>Krok 4:</strong> Kliknij "Generuj harmonogram wacht"</p>
            <details className="mt-3">
              <summary className={`cursor-pointer font-medium ${isNightMode ? 'text-red-500 hover:text-red-400' : 'text-blue-700 hover:text-blue-600'}`}>
                Skróty klawiszowe
              </summary>
              <div className={`mt-2 pl-4 space-y-1 text-xs ${isNightMode ? 'text-red-800' : 'text-blue-700'}`}>
                <p><kbd className={`px-2 py-0.5 rounded ${isNightMode ? 'bg-zinc-900' : 'bg-white'}`}>Ctrl+G</kbd> - Generuj harmonogram</p>
                <p><kbd className={`px-2 py-0.5 rounded ${isNightMode ? 'bg-zinc-900' : 'bg-white'}`}>Ctrl+P</kbd> - Drukuj</p>
                <p><kbd className={`px-2 py-0.5 rounded ${isNightMode ? 'bg-zinc-900' : 'bg-white'}`}>Ctrl+Z</kbd> - Cofnij</p>
                <p><kbd className={`px-2 py-0.5 rounded ${isNightMode ? 'bg-zinc-900' : 'bg-white'}`}>Ctrl+Y</kbd> - Ponów</p>
                <p><kbd className={`px-2 py-0.5 rounded ${isNightMode ? 'bg-zinc-900' : 'bg-white'}`}>Esc</kbd> - Zamknij okno modalne</p>
                <p><kbd className={`px-2 py-0.5 rounded ${isNightMode ? 'bg-zinc-900' : 'bg-white'}`}>Tab</kbd> - Nawigacja po elementach</p>
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
