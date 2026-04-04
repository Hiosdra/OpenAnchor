import React, { useState, useEffect, useRef } from 'react';
import type { EgzaminQuestion } from '../types';
import { renderEgzaminQuestion } from '../pdf-runtime';
import { CategoryBadge } from './CategoryBadge';

interface QuestionImageCardProps {
  question: EgzaminQuestion;
}

function revokeRenderedImage(url: string | null): void {
  if (url?.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

export function QuestionImageCard({ question }: QuestionImageCardProps) {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Revoke previous blob URL to prevent memory leaks
    if (blobUrlRef.current) {
      revokeRenderedImage(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    setLoading(true);
    setError(false);
    setImageDataUrl(null);

    renderEgzaminQuestion({
      questionId: question.id,
      pageIndex: question.pdfPage,
      cropYStart: question.cropYStart,
      cropYEnd: question.cropYEnd,
      pageHeight: question.pageHeight,
    })
      .then((dataUrl) => {
        if (!cancelled) {
          if (dataUrl) {
            blobUrlRef.current = dataUrl;
            setImageDataUrl(dataUrl);
          } else {
            setError(true);
          }
          setLoading(false);
        } else {
          revokeRenderedImage(dataUrl);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      if (blobUrlRef.current) {
        revokeRenderedImage(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [question.id, question.pdfPage, question.cropYStart, question.cropYEnd, question.pageHeight]);

  return (
    <div className="rounded-2xl bg-white border border-white/10 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5">
        <CategoryBadge categoryId={question.category} />
        <span className="text-sm text-slate-400">#{question.id}</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32 bg-white">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : error || !imageDataUrl ? (
        <div className="flex items-center justify-center h-28 bg-slate-800 text-slate-500 text-sm">
          Nie udało się załadować pytania
        </div>
      ) : (
        <img
          src={imageDataUrl}
          alt={`Pytanie #${question.id}`}
          className="w-full h-auto cursor-zoom-in"
          onClick={() => setZoomed(true)}
        />
      )}

      {zoomed && imageDataUrl && (
        <div className="image-modal" onClick={() => setZoomed(false)}>
          <img src={imageDataUrl} alt={`Pytanie #${question.id}`} />
        </div>
      )}
    </div>
  );
}
