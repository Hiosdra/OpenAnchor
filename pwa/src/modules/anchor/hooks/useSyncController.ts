import { useState, useRef, useCallback, useEffect } from 'react';
import L from 'leaflet';
import { ReconnectStrategy } from '../reconnect-strategy';
import {
  WS_PING_INTERVAL_MS,
  WS_HEARTBEAT_TIMEOUT_MS,
  WS_STATE_UPDATE_INTERVAL_MS,
  MessageType,
  type ConnectionState,
} from '@shared/constants/protocol';

interface UseSyncControllerParams {
  onMessage: (type: string, data: Record<string, any>) => void;
}

export function useSyncController({ onMessage }: UseSyncControllerParams) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [wsUrl, setWsUrl] = useState(() => localStorage.getItem('anchor_ws_url') || '');
  const [peerBattery, setPeerBattery] = useState<number | null>(null);
  const [peerCharging, setPeerCharging] = useState(false);
  const [peerPos, setPeerPos] = useState<L.LatLng | null>(null);
  const [connectionLostWarning, setConnectionLostWarning] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateUpdateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectStrategyRef = useRef(new ReconnectStrategy());
  const lastPeerPingTimeRef = useRef<number | null>(null);
  const lastSentStateHashRef = useRef<string | null>(null);
  const isConnectedRef = useRef(false);
  const urlRef = useRef(wsUrl);
  const doConnectRef = useRef<() => void>(() => {});

  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const clearIntervals = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (stateUpdateIntervalRef.current) {
      clearInterval(stateUpdateIntervalRef.current);
      stateUpdateIntervalRef.current = null;
    }
  }, []);

  const closeSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((type: string, payload: Record<string, any> = {}) => {
    if (!isConnectedRef.current || !wsRef.current) return;
    const msg = JSON.stringify({ type, timestamp: Date.now(), payload });
    wsRef.current.send(msg);
  }, []);

  const sendFullSync = useCallback(
    (state: {
      isAnchored: boolean;
      anchorPos: L.LatLng | null;
      sectorEnabled: boolean;
      radius: number;
      bufferRadius: number | null;
      unit: string;
      sectorBearing: number;
      sectorWidth: number;
      chainLengthM: number | null;
      depthM: number | null;
    }) => {
      const payload: Record<string, any> = {
        isAnchored: state.isAnchored,
        anchorPos: state.anchorPos,
        zoneType: state.sectorEnabled ? 'SECTOR' : 'CIRCLE',
        radiusMeters: state.radius,
        bufferRadiusMeters: state.bufferRadius,
        units: state.unit,
      };
      if (state.sectorEnabled) {
        payload.sector = {
          bearingDeg: state.sectorBearing,
          halfAngleDeg: state.sectorWidth / 2,
          radiusMeters: state.radius * 1.5,
        };
      }
      if (state.chainLengthM != null) payload.chainLengthM = state.chainLengthM;
      if (state.depthM != null) payload.depthM = state.depthM;
      sendMessage(MessageType.FULL_SYNC, payload);
    },
    [sendMessage],
  );

  const sendStateUpdate = useCallback(
    (state: {
      currentPos: L.LatLng | null;
      accuracy: number;
      distance: number;
      alarmState: string;
      sog: number;
      cog: number | null;
      batteryLevel: number;
      isCharging: boolean;
    }) => {
      const payload = {
        currentPos: state.currentPos,
        gpsAccuracy: state.accuracy,
        distanceToAnchor: state.distance,
        alarmState: state.alarmState,
        sog: state.sog,
        cog: state.cog,
        batteryLevel: state.batteryLevel,
        isCharging: state.isCharging,
      };
      const hash = JSON.stringify(payload);
      if (hash !== lastSentStateHashRef.current) {
        lastSentStateHashRef.current = hash;
        sendMessage(MessageType.STATE_UPDATE, payload);
      }
    },
    [sendMessage],
  );

  const sendTriggerAlarm = useCallback(
    (reason: string, message: string, alarmState: string) => {
      sendMessage(MessageType.TRIGGER_ALARM, { reason, message, alarmState });
    },
    [sendMessage],
  );

  const handleOnClose = useCallback(() => {
    const wasConnected = isConnectedRef.current;
    isConnectedRef.current = false;
    setIsConnected(false);
    lastPeerPingTimeRef.current = null;
    setConnectionLostWarning(false);
    setPeerBattery(null);
    setPeerPos(null);
    clearIntervals();

    if (urlRef.current && wasConnected) {
      const delay = reconnectStrategyRef.current.schedule(() => {
        if (!isConnectedRef.current && urlRef.current) {
          doConnectRef.current();
        }
      });
      if (delay !== null) {
        setConnectionState('reconnecting');
        console.warn(
          `WS: scheduling reconnect #${reconnectStrategyRef.current.attempts} in ${delay}ms`,
        );
      } else {
        setConnectionState('disconnected');
      }
    } else {
      setConnectionState('disconnected');
    }
  }, [clearIntervals]);

  const handleOnMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      if (!data || typeof data.type !== 'string') return;

      if (data.type === MessageType.PING) {
        lastPeerPingTimeRef.current = Date.now();
        setConnectionLostWarning(false);
        return;
      }

      if (data.type === MessageType.ANDROID_GPS_REPORT && data.payload) {
        const p = data.payload;
        if (p.pos && typeof p.pos.lat === 'number' && typeof p.pos.lng === 'number') {
          setPeerPos(L.latLng(p.pos.lat, p.pos.lng));
        }
        if (typeof p.batteryLevel === 'number') {
          setPeerBattery(p.batteryLevel);
          setPeerCharging(!!p.isCharging);
        }
      }

      onMessageRef.current(data.type, data.payload || {});
    } catch (err) {
      console.error('WS: Failed to parse message:', err);
    }
  }, []);

  const doConnect = useCallback(() => {
    try {
      setConnectionState('connecting');
      const ws = new WebSocket(urlRef.current);

      ws.onopen = () => {
        isConnectedRef.current = true;
        setIsConnected(true);
        setConnectionState('connected');
        reconnectStrategyRef.current.onConnected();
        lastPeerPingTimeRef.current = Date.now();
        setConnectionLostWarning(false);
        lastSentStateHashRef.current = null;

        pingIntervalRef.current = setInterval(() => {
          sendMessage(MessageType.PING);
        }, WS_PING_INTERVAL_MS);
      };

      ws.onclose = () => handleOnClose();
      ws.onerror = (e) => console.warn('WS: connection error', e);
      ws.onmessage = (msg) => handleOnMessage(msg);

      wsRef.current = ws;
    } catch (err) {
      console.error('WS: failed to create WebSocket', err);
      handleOnClose();
    }
  }, [sendMessage, handleOnClose, handleOnMessage]);

  doConnectRef.current = doConnect;

  const stopStateUpdateInterval = useCallback(() => {
    if (stateUpdateIntervalRef.current) {
      clearInterval(stateUpdateIntervalRef.current);
      stateUpdateIntervalRef.current = null;
    }
  }, []);

  const connect = useCallback(
    (url: string) => {
      reconnectStrategyRef.current.reset();
      closeSocket();
      clearIntervals();
      urlRef.current = url;
      setWsUrl(url);
      localStorage.setItem('anchor_ws_url', url);
      doConnect();
    },
    [closeSocket, clearIntervals, doConnect],
  );

  const disconnect = useCallback(
    (reason = 'USER_DISCONNECT') => {
      reconnectStrategyRef.current.markIntentional();
      if (wsRef.current && isConnectedRef.current) {
        sendMessage(MessageType.DISCONNECT, { reason });
      }
      closeSocket();
      clearIntervals();
      isConnectedRef.current = false;
      setIsConnected(false);
      setConnectionState('disconnected');
      lastPeerPingTimeRef.current = null;
      setConnectionLostWarning(false);
      setPeerBattery(null);
      setPeerPos(null);
    },
    [closeSocket, clearIntervals, sendMessage],
  );

  const checkHeartbeat = useCallback(() => {
    if (!isConnectedRef.current || !lastPeerPingTimeRef.current) return;
    const elapsed = Date.now() - lastPeerPingTimeRef.current;
    if (elapsed > WS_HEARTBEAT_TIMEOUT_MS) {
      setConnectionLostWarning(true);
      closeSocket();
      handleOnClose();
    }
  }, [closeSocket, handleOnClose]);

  const startStateUpdateInterval = useCallback(
    (
      getState: () => {
        currentPos: L.LatLng | null;
        accuracy: number;
        distance: number;
        alarmState: string;
        sog: number;
        cog: number | null;
        batteryLevel: number;
        isCharging: boolean;
      },
    ) => {
      if (stateUpdateIntervalRef.current) clearInterval(stateUpdateIntervalRef.current);
      stateUpdateIntervalRef.current = setInterval(() => {
        if (isConnectedRef.current) {
          sendStateUpdate(getState());
        }
      }, WS_STATE_UPDATE_INTERVAL_MS);
    },
    [sendStateUpdate],
  );

  useEffect(() => {
    return () => {
      closeSocket();
      clearIntervals();
      reconnectStrategyRef.current.reset();
    };
  }, [closeSocket, clearIntervals]);

  return {
    connect,
    disconnect,
    sendMessage,
    sendFullSync,
    sendStateUpdate,
    sendTriggerAlarm,
    checkHeartbeat,
    startStateUpdateInterval,
    stopStateUpdateInterval,
    isConnected,
    isConnectedRef,
    wsUrl,
    peerBattery,
    peerCharging,
    peerPos,
    connectionLostWarning,
    connectionState,
  };
}
