import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for long polling IoT sensor data
 * Polls /api/iot/sensors/latest/ only when IoT device is connected
 * 
 * @param {string} apiBase - API base URL
 * @param {object} options - Configuration options
 * @returns {object} - { data, latestReading, status, iotStatus, lastUpdated, refetch }
 */
export function useIotPolling(apiBase, options = {}) {
  const {
    pollInterval = 5000,      // Poll every 5 seconds
    rfid = null,              // Filter by RFID (optional)
    limit = 50,               // Number of readings to fetch
    enabled = true,           // Enable/disable polling
    onNewData,                // Callback when new data arrives
  } = options;

  const [data, setData] = useState([]);
  const [latestReading, setLatestReading] = useState(null);
  const [status, setStatus] = useState('idle'); // 'idle' | 'polling' | 'connected' | 'error'
  const [iotStatus, setIotStatus] = useState('disconnected'); // 'connected' | 'disconnected' | 'unknown'
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  
  const lastTimestamp = useRef(null);
  const pollTimer = useRef(null);
  const isFirstFetch = useRef(true);

  // Store onNewData in a ref so it never causes re-renders / interval resets
  const onNewDataRef = useRef(onNewData);
  onNewDataRef.current = onNewData;

  // Keep a ref to isMounted to prevent state updates after unmount
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Check IoT device connection status
  const checkIotStatus = useCallback(async () => {
    if (!enabled || !mountedRef.current) return false;

    try {
      const response = await fetch(`${apiBase}/api/iot/status`);
      
      if (!response.ok) {
        if (mountedRef.current) setIotStatus('unknown');
        return false;
      }

      const statusData = await response.json();
      const isConnected = statusData.connected;

      if (mountedRef.current) {
        setIotStatus(isConnected ? 'connected' : 'disconnected');
      }

      return isConnected;
    } catch (err) {
      console.error('IoT status check error:', err);
      if (mountedRef.current) setIotStatus('unknown');
      return false;
    }
  }, [apiBase, enabled]);

  // Fetch latest sensor data — only stable deps (no onNewData)
  const fetchData = useCallback(async (useSince = true, skipIotCheck = false) => {
    if (!enabled || !mountedRef.current) return;

    // Check IoT connection status first (unless explicitly skipped for initial load)
    const iotConnected = await checkIotStatus();

    try {
      setStatus('polling');
      
      // Build URL
      let url = `${apiBase}/api/iot/sensors/latest?limit=${limit}`;
      
      if (rfid) {
        url += `&rfid=${encodeURIComponent(rfid)}`;
      }
      
      // Only use 'since' parameter after first fetch to get incremental updates
      if (useSince && lastTimestamp.current && !isFirstFetch.current) {
        url += `&since=${encodeURIComponent(lastTimestamp.current)}`;
      }

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const newData = await response.json();

      if (!mountedRef.current) return;

      setStatus('connected');
      setError(null);
      setLastUpdated(Date.now());

      if (newData && newData.length > 0) {
        // Update last timestamp for next poll
        lastTimestamp.current = newData[0].timestamp;
        
        // Set latest reading
        setLatestReading(newData[0]);
        
        // On first fetch, replace all data
        if (isFirstFetch.current) {
          setData(newData.reverse()); // Oldest first for charts
          isFirstFetch.current = false;
        } else {
          // On subsequent fetches, merge new data
          setData(prev => {
            // Add new readings (they're newest first, so reverse to append)
            const merged = [...prev, ...newData.reverse()];
            // Keep last 500 readings max to prevent memory issues
            return merged.slice(-500);
          });
          
          // Notify callback via ref (won't cause re-renders)
          onNewDataRef.current?.(newData);
        }
      }
    } catch (err) {
      console.error('IoT polling error:', err);
      if (mountedRef.current) {
        setStatus('error');
        setError(err.message);
      }
    }
  }, [apiBase, rfid, limit, enabled, checkIotStatus]);

  // Manual refetch (resets and fetches all data)
  const refetch = useCallback(() => {
    lastTimestamp.current = null;
    isFirstFetch.current = true;
    setData([]);
    fetchData(false);
  }, [fetchData]);

  // Start polling — stable deps prevent infinite interval resets
  useEffect(() => {
    if (!enabled) {
      setStatus('idle');
      return;
    }

    let statusCheckInterval;

    // Initial fetch (always fetch once to show historical data)
    fetchData(false);

    // Set up IoT status checker and conditional polling
    const startPollingIfConnected = async () => {
      const iotConnected = await checkIotStatus();
      
      if (iotConnected) {
        // IoT is connected - start continuous polling
        if (!pollTimer.current) {
          pollTimer.current = setInterval(() => {
            fetchData(true);
          }, pollInterval);
        }
      } else {
        // IoT is disconnected - stop polling
        if (pollTimer.current) {
          clearInterval(pollTimer.current);
          pollTimer.current = null;
        }
      }
    };

    // Check IoT status every 10 seconds to start/stop polling
    statusCheckInterval = setInterval(startPollingIfConnected, 10000);
    
    // Initial check
    startPollingIfConnected();

    return () => {
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
      }
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
  }, [enabled, pollInterval, fetchData, checkIotStatus]);

  // Reset when rfid changes
  useEffect(() => {
    lastTimestamp.current = null;
    isFirstFetch.current = true;
    setData([]);
    setLatestReading(null);
  }, [rfid]);

  return {
    data,           // Array of readings (oldest first)
    latestReading,  // Most recent reading
    status,         // 'idle' | 'polling' | 'connected' | 'error'
    iotStatus,      // 'connected' | 'disconnected' | 'unknown'
    lastUpdated,    // Timestamp of last successful fetch
    error,          // Error message if any
    refetch,        // Manual refetch function
  };
}
