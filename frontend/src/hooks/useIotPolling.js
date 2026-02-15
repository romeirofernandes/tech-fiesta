import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for long polling IoT sensor data
 * Polls /api/iot/sensors/latest/ every N seconds
 * 
 * @param {string} apiBase - API base URL
 * @param {object} options - Configuration options
 * @returns {object} - { data, latestReading, status, lastUpdated, refetch }
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

  // Fetch latest sensor data — only stable deps (no onNewData)
  const fetchData = useCallback(async (useSince = true) => {
    if (!enabled || !mountedRef.current) return;

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
  }, [apiBase, rfid, limit, enabled]);

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

    // Initial fetch
    fetchData(false);

    // Set up polling interval
    pollTimer.current = setInterval(() => {
      fetchData(true);
    }, pollInterval);

    return () => {
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
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
    data,           // Array of readings (oldest first)
    latestReading,  // Most recent reading
    status,         // 'idle' | 'polling' | 'connected' | 'error'
    lastUpdated,    // Timestamp of last successful fetch
    error,          // Error message if any
    refetch,        // Manual refetch function
  };
}
