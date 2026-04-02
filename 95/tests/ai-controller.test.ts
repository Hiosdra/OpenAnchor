import { describe, it, expect } from 'vitest';
import { AIController } from '../src/modules/anchor/ai-controller';

describe('AIController', () => {
  // ------------------------------------------------------------------
  // buildContextPrompt — 100% pure, no network, no DOM
  // ------------------------------------------------------------------
  describe('buildContextPrompt', () => {
    const baseState = {
      currentPos: null,
      isAnchored: false,
      anchorPos: null,
      radius: 50,
      anchorStartTime: null,
      alarmCount: 0,
      distance: 0,
      alarmState: 'SAFE',
      maxDistanceSwing: 0,
      maxSogDuringAnchor: 0,
      chainLengthM: null,
      depthM: null,
      accuracy: 5,
    };

    it('starts with "Current context:" header', () => {
      const ctrl = new AIController();
      const result = ctrl.buildContextPrompt(baseState);
      expect(result).toMatch(/^Current context:/);
    });

    it('includes boat position when available', () => {
      const ctrl = new AIController();
      const state = { ...baseState, currentPos: { lat: 54.123456, lng: 18.654321 } };
      const result = ctrl.buildContextPrompt(state);
      expect(result).toContain('54.123456');
      expect(result).toContain('18.654321');
      expect(result).toContain('GPS accuracy');
    });

    it('omits boat position when null', () => {
      const ctrl = new AIController();
      const result = ctrl.buildContextPrompt(baseState);
      expect(result).not.toContain('Boat position');
    });

    it('includes anchor details when anchored', () => {
      const ctrl = new AIController();
      const state = {
        ...baseState,
        isAnchored: true,
        anchorPos: { lat: 54.0, lng: 18.0 },
        radius: 60,
        anchorStartTime: Date.now() - 3600000, // 1h ago
        alarmCount: 2,
        distance: 35,
        alarmState: 'SAFE',
        maxDistanceSwing: 42,
        maxSogDuringAnchor: 1.3,
      };
      const result = ctrl.buildContextPrompt(state);
      expect(result).toContain('Anchor position: 54.000000, 18.000000');
      expect(result).toContain('Safe zone radius: 60m');
      expect(result).toContain('Anchored for:');
      expect(result).toContain('Alarms so far: 2');
      expect(result).toContain('distance from anchor: 35m');
      expect(result).toContain('alarm state: SAFE');
      expect(result).toContain('Max swing distance: 42m');
      expect(result).toContain('Max SOG while anchored: 1.3');
    });

    it('omits anchor section when not anchored', () => {
      const ctrl = new AIController();
      const result = ctrl.buildContextPrompt(baseState);
      expect(result).not.toContain('Anchor position');
      expect(result).not.toContain('Alarms so far');
    });

    it('includes chain and depth when set', () => {
      const ctrl = new AIController();
      const state = { ...baseState, chainLengthM: 30, depthM: 8 };
      const result = ctrl.buildContextPrompt(state);
      expect(result).toContain('Chain deployed: 30m');
      expect(result).toContain('Water depth: 8m');
    });

    it('omits chain and depth when null', () => {
      const ctrl = new AIController();
      const result = ctrl.buildContextPrompt(baseState);
      expect(result).not.toContain('Chain');
      expect(result).not.toContain('depth');
    });

    it('omits max swing/SOG when zero', () => {
      const ctrl = new AIController();
      const state = {
        ...baseState,
        isAnchored: true,
        anchorPos: { lat: 54.0, lng: 18.0 },
        maxDistanceSwing: 0,
        maxSogDuringAnchor: 0,
      };
      const result = ctrl.buildContextPrompt(state);
      expect(result).not.toContain('Max swing');
      expect(result).not.toContain('Max SOG');
    });
  });

  // ------------------------------------------------------------------
  // Chat management
  // ------------------------------------------------------------------
  describe('chat management', () => {
    it('starts with empty chat history', () => {
      const ctrl = new AIController();
      expect(ctrl.chatHistory).toHaveLength(0);
    });

    it('clearChat resets history', () => {
      const ctrl = new AIController();
      ctrl.chatHistory = [{ role: 'user', parts: [{ text: 'hello' }] }];
      ctrl.clearChat();
      expect(ctrl.chatHistory).toHaveLength(0);
    });
  });

  // ------------------------------------------------------------------
  // API key management
  // ------------------------------------------------------------------
  describe('API key management', () => {
    it('setKey stores key in instance and localStorage', () => {
      const ctrl = new AIController();
      ctrl.setKey('test-key-123');
      expect(ctrl.apiKey).toBe('test-key-123');
      expect(localStorage.getItem('anchor_ai_key')).toBe('test-key-123');
    });

    it('clearKey removes key', () => {
      const ctrl = new AIController();
      ctrl.setKey('secret');
      ctrl.clearKey();
      expect(ctrl.apiKey).toBe('');
      expect(localStorage.getItem('anchor_ai_key')).toBeNull();
    });

    it('reads key from localStorage on construction', () => {
      localStorage.setItem('anchor_ai_key', 'stored-key');
      const ctrl = new AIController();
      expect(ctrl.apiKey).toBe('stored-key');
    });

    it('defaults to empty string when no key in localStorage', () => {
      const ctrl = new AIController();
      expect(ctrl.apiKey).toBe('');
    });
  });
});
