import React, { useState } from 'react';
import { Header } from './Header';
import { PdfRenderer } from '../pdf-renderer';
import { savePdfData, verifyPdfHash } from '../../../shared/storage/indexed-db';

interface ImportPdfScreenProps {
  onImportComplete: () => void;
}

interface HashWarning {
  hash: string;
  blob: Blob;
  meta: { hash: string; filename: string; importDate: string; fileSize: number };
}

export function ImportPdfScreen({ onImportComplete }: ImportPdfScreenProps) {
  const [importing, setImporting] = useState(false);
  const [progress, setProgressText] = useState('');
  const [hashWarning, setHashWarning] = useState<HashWarning | null>(null);

  const finishImport = async (blob: Blob, meta: HashWarning['meta']) => {
    setImporting(true);
    setHashWarning(null);
    setProgressText('Zapisywanie bazy pytań...');
    await savePdfData(blob, meta);

    setProgressText('Ładowanie pytań...');
    await PdfRenderer.loadFromBlob(blob);

    setImporting(false);
    onImportComplete();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) return;

    setImporting(true);
    setProgressText('Wczytywanie pliku...');

    try {
      const arrayBuffer = await file.arrayBuffer();
      setProgressText('Obliczanie sumy kontrolnej...');
      const { valid, hash } = await verifyPdfHash(arrayBuffer);
      const blob = new Blob([arrayBuffer], { type: 'application/pdf' });

      const meta = {
        hash,
        filename: file.name,
        importDate: new Date().toISOString(),
        fileSize: file.size,
      };

      if (!valid) {
        setImporting(false);
        setHashWarning({ hash, blob, meta });
        return;
      }

      await finishImport(blob, meta);
    } catch (err) {
      setProgressText('Błąd importu: ' + (err instanceof Error ? err.message : String(err)));
      setImporting(false);
    }
  };

  return (
    <>
      <Header title="Egzamin ZJ / JSM" />
      <div className="relative z-10 max-w-lg md:max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-700/20 border border-amber-500/20 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round" width="40" height="40">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="12" y1="18" x2="12" y2="12"/>
              <line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Importuj bazę pytań</h1>
          <p className="text-sm text-white/50 leading-relaxed max-w-sm mx-auto">
            Aby korzystać z modułu egzaminacyjnego, zaimportuj plik PDF z bazą pytań egzaminacyjnych.
          </p>
        </div>

        {!importing && !hashWarning && (
          <div className="space-y-4">
            <label className="block w-full py-4 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 text-white font-bold text-base text-center cursor-pointer hover:from-amber-500 hover:to-amber-400 transition-all active:scale-[0.98]">
              <div className="flex items-center justify-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Wybierz plik PDF
              </div>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
            <p className="text-xs text-white/30 text-center">
              Plik PDF z bazą pytań egzaminacyjnych (ok. 5 MB)
            </p>
          </div>
        )}

        {importing && (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-400 mx-auto mb-4"></div>
            <p className="text-sm text-white/70">{progress}</p>
          </div>
        )}

        {hashWarning && (
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-5">
            <div className="flex items-start gap-3 mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" width="24" height="24" className="flex-shrink-0 mt-0.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <div>
                <h3 className="font-bold text-amber-300 mb-1">Nieoczekiwany plik</h3>
                <p className="text-sm text-white/60 leading-relaxed">
                  Suma kontrolna SHA-256 tego pliku nie odpowiada oczekiwanej wartosci.
                  Plik moze byc niekompatybilny z ta wersja aplikacji.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => finishImport(hashWarning.blob, hashWarning.meta)}
                className="flex-1 py-3 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 font-semibold text-sm hover:bg-amber-500/30 transition-colors"
              >
                Kontynuuj mimo to
              </button>
              <button
                onClick={() => { setHashWarning(null); setProgressText(''); }}
                className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 font-semibold text-sm hover:bg-white/10 transition-colors"
              >
                Anuluj
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
