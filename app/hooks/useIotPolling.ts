import { useState, useEffect, useRef, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

interface UseIotPollingOptions {
  pollInterval?: number;
  rfid?: string | null;
  limit?: number;
  enabled?: boolean;
  onNewData?: (data: any[]) => void;
}

export function useIotPolling(options: UseIotPollingOptions = {}) {
  const {
    pollInterval = 5000,
    rfid = null,
    limit = 50,
    enabled = true,
    onNewData,
  } = options;

  const [data, setData] = useState<any[]>([]);
  const [latestReading, setLatestReading] = useState<any>(null);
  const [status, setStatus] = useState<'idle' | 'polling' | 'connected' | 'error'>('idle');
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lastTimestamp = useRef<any>(null);
  const pollTimer = useRef<any>(null);
  const isFirstFetch = useRef(true);
  const mountedRef = useRef(true);

  // Use refs for values that fetchData reads but shouldn't trigger re-creation
  const statusRef = useRef(status);
  statusRef.current = status;
  const rfidRef = useRef(rfid);
  rfidRef.current = rfid;
  const limitRef = useRef(limit);
  limitRef.current = limit;
  const onNewDataRef = useRef(onNewData);
  onNewDataRef.current = onNewData;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // fetchData uses refs, so it has ZERO volatile dependencies.
  // This means it will NOT be recreated on state changes → no infinite loop.
  const fetchData = useCallback(async (useSince = true) => {
    if (!mountedRef.current || !API_BASE_URL) return;

    // === CRITICAL: Check connectivity with NetInfo.fetch() before every request ===
    // This is a direct API call, NOT a hook — it always gives the real, current state.
    try {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        // Offline: skip silently (no error logs, no state updates, no re-renders)
        return;
      }
    } catch {
      return;
    }

    try {
      if (statusRef.current !== 'connected') setStatus('polling');

      let url = `${API_BASE_URL}/api/iot/sensors/latest?limit=${limitRef.current}`;

      if (rfidRef.current) {
        url += `&rfid=${encodeURIComponent(rfidRef.current)}`;
      }

      if (useSince && lastTimestamp.current && !isFirstFetch.current) {
        url += `&since=${encodeURIComponent(lastTimestamp.current)}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const newData = await response.json();

      if (!mountedRef.current) return;

      setStatus('connected');
      setError(null);
      setLastUpdated(Date.now());

      if (Array.isArray(newData) && newData.length > 0) {
        lastTimestamp.current = newData[0].timestamp;

        if (newData[0]) {
          setLatestReading(newData[0]);
        }

        if (isFirstFetch.current) {
          setData(newData.reverse());
          isFirstFetch.current = false;
        } else {
          setData((prev) => {
            const merged = [...prev, ...newData.reverse()];
            return merged.slice(-500);
          });
          onNewDataRef.current?.(newData);
        }
      } else if (isFirstFetch.current) {
        isFirstFetch.current = false;
      }
    } catch (err: any) {
      // Only log once, don't spam
      if (mountedRef.current && statusRef.current !== 'error') {
        console.log('[Vitals] Polling error:', err.message);
        setStatus('error');
        setError(err.message);
      }
    }
  }, []); // Empty deps: uses refs for everything, never recreated

  const refetch = useCallback(() => {
    lastTimestamp.current = null;
    isFirstFetch.current = true;
    setData([]);
    fetchData(false);
  }, [fetchData]);

  // Single, stable interval. Only recreated when enabled or pollInterval changes.
  // fetchData is stable (empty deps), so it won't cause re-runs.
  useEffect(() => {
    if (!enabled) {
      setStatus('idle');
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
      return;
    }

    // Initial fetch
    fetchData(false);

    // Set up interval — fetchData internally checks connectivity each time
    pollTimer.current = setInterval(() => {
      fetchData(true);
    }, pollInterval);

    return () => {
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
    };
  }, [enabled, pollInterval, fetchData]);

  // Reset when rfid changes
  useEffect(() => {
    lastTimestamp.current = null;
    isFirstFetch.current = true;
    setData([]);
    setLatestReading(null);
  }, [rfid]);

  return {
    data,
    latestReading,
    status,
    lastUpdated,
    error,
    refetch,
  };
}
