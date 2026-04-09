/**
 * useAIChat — encapsulates AI chat state, effects, and handlers
 * extracted from ModalManager to reduce its size.
 */

import { useState, useCallback, useEffect } from 'react';

import { AIController } from '../ai-controller';
import type { AnchorState } from './useAnchorState';
import type { ModalName } from '../contexts/ModalContext';

// ─── AI Controller singleton ───
const aiCtrl = new AIController();

 
interface SessionDb {
  db: React.RefObject<any>;
}

interface UseAIChatParams {
  stateRef: React.RefObject<AnchorState>;
  session: SessionDb;
  openModal: (name: ModalName) => void;
  closeModal: (name: ModalName) => void;
  isAiModalOpen: boolean;
}

export function useAIChat({
  stateRef,
  session,
  openModal,
  closeModal,
  isAiModalOpen,
}: UseAIChatParams) {
  // ─── State ───
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: 'user' | 'assistant'; content: string }>
  >([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [logbookEntry, setLogbookEntry] = useState<{
    summary: string;
    logEntry: string;
    safetyNote: string;
  } | null>(null);
  const [hasAiKey, setHasAiKey] = useState(() => !!aiCtrl.apiKey);

  // ─── Redirect ai → apiKey if no key ───
  useEffect(() => {
    if (isAiModalOpen && !aiCtrl.apiKey) {
      closeModal('ai');
      openModal('apiKey');
    }
  }, [isAiModalOpen, closeModal, openModal]);

  // ─── Handlers ───

  const handleAiSendMessage = useCallback(
    async (message: string) => {
      setChatMessages((prev) => [...prev, { role: 'user', content: message }]);
      setAiLoading(true);

      const s = stateRef.current!;
      const contextPrompt = aiCtrl.buildContextPrompt({
        currentPos: s.currentPos ? { lat: s.currentPos.lat, lng: s.currentPos.lng } : null,
        isAnchored: s.isAnchored,
        anchorPos: s.anchorPos ? { lat: s.anchorPos.lat, lng: s.anchorPos.lng } : null,
        radius: s.radius,
        anchorStartTime: s.anchorStartTime,
        alarmCount: s.alarmCount,
        distance: s.distance,
        alarmState: s.alarmState,
        maxDistanceSwing: s.maxDistanceSwing,
        maxSogDuringAnchor: s.maxSogDuringAnchor,
        chainLengthM: s.chainLengthM,
        depthM: s.depthM,
        accuracy: s.accuracy,
      });

      let weatherContext = '';
      if (s.currentPos) {
        try {
          weatherContext = await aiCtrl.fetchWeather(s.currentPos.lat, s.currentPos.lng);
        } catch {
          /* ignore weather fetch errors */
        }
      }

      const systemInstruction =
        'You are a helpful maritime assistant for the OpenAnchor app. ' +
        'You help sailors with anchoring, weather conditions, navigation, and safety. ' +
        'Be concise, practical, and safety-focused. Always respond in the language of the question.';

      const response = await aiCtrl.askWithContext(
        message,
        systemInstruction,
        contextPrompt,
        weatherContext,
      );

      setChatMessages((prev) => [...prev, { role: 'assistant', content: response }]);
      setAiLoading(false);

      if (response.includes('SUMMARY:') && response.includes('LOG:')) {
        const summaryMatch = response.match(/SUMMARY:\s*(.+)/);
        const logMatch = response.match(/LOG:\s*(.+)/);
        const safetyMatch = response.match(/SAFETY:\s*(.+)/);
        if (summaryMatch && logMatch) {
          setLogbookEntry({
            summary: summaryMatch[1].trim(),
            logEntry: logMatch[1].trim(),
            safetyNote: safetyMatch?.[1]?.trim() ?? '',
          });
        }
      }
    },
    [stateRef],
  );

  const handleAiClearChat = useCallback(() => {
    setChatMessages([]);
    setLogbookEntry(null);
    aiCtrl.clearChat();
  }, []);

  const handleSaveLogbook = useCallback(async () => {
    if (!logbookEntry || !stateRef.current!.sessionId) return;
    try {
      const db = session.db.current;
      if (db?.db) {
        await db.db.addLogbookEntry({
          sessionId: stateRef.current!.sessionId,
          createdAt: Date.now(),
          summary: logbookEntry.summary,
          logEntry: logbookEntry.logEntry,
          safetyNote: logbookEntry.safetyNote,
          isAiGenerated: true,
        });
      }
    } catch (err) {
      console.warn('Failed to save logbook entry:', err);
    }
  }, [logbookEntry, session, stateRef]);

  const handleSaveApiKey = useCallback(
    (key: string) => {
      aiCtrl.setKey(key);
      setHasAiKey(true);
      closeModal('apiKey');
      openModal('ai');
    },
    [closeModal, openModal],
  );

  const handleClearApiKey = useCallback(() => {
    aiCtrl.clearKey();
    setHasAiKey(false);
  }, []);

  return {
    chatMessages,
    aiLoading,
    logbookEntry,
    hasAiKey,
    handleAiSendMessage,
    handleAiClearChat,
    handleSaveLogbook,
    handleSaveApiKey,
    handleClearApiKey,
  };
}
