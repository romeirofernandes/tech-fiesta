import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for polling radar sweep data
 * Polls /api/radar/latest every 2 seconds for real-time visualization
 * 
 * @param {string} apiBase - API base URL
 * @param {object} options - Configuration options
 * @returns {object} - { sweepData, latestAlert, stats, status, lastUpdated, refetch }
 */
export function useRadarPolling(apiBase, options = {}) {
  const {
    pollInterval = 2000,      // Poll every 2 seconds (faster for radar)
    deviceId = 'radar_01',    // Radar device ID
    limit = 180,              // Number of readings (full sweep)
    enabled = true,           // Enable/disable polling
    onNewData,                // Callback when new data arrives
  } = options;

  const [sweepData, setSweepData] = useState([]);
  const [latestAlert, setLatestAlert] = useState(null);
  const [stats, setStats] = useState(null);
  const [status, setStatus] = useState('idle'); // 'idle' | 'polling' | 'connected' | 'error'
  const [radarStatus, setRadarStatus] = useState('unknown'); // 'connected' | 'disconnected' | 'unknown'
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  
  const pollTimer = useRef(null);
  const statusCheckTimer = useRef(null);
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

  // Check radar connection status
  const checkRadarStatus = useCallback(async () => {
    try {
      const response = await fetch(`${apiBase}/api/radar/status`);
      if (!response.ok) return;
      
      const statusData = await response.json();
      if (mountedRef.current) {
        setRadarStatus(statusData.isConnected ? 'connected' : 'disconnected');
      }
    } catch (err) {
      console.error('Radar status check error:', err);
      if (mountedRef.current) {
        setRadarStatus('disconnected');
      }
    }
  }, [apiBase]);

  // Fetch latest radar sweep data
  const fetchData = useCallback(async () => {
    if (!enabled || !mountedRef.current) return;

    try {
      setStatus('polling');
      
      // Fetch from in-memory live endpoint (no DB)
      const url = `${apiBase}/api/radar/live`;

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const payload = await response.json();

      if (!mountedRef.current) return;

      setStatus('connected');
      setError(null);
      setLastUpdated(Date.now());

      // payload = { readings: [...], isConnected: bool, threshold: 10 }
      const newData = payload.readings || payload;
      if (newData && newData.length > 0) {
        const sortedData = [...newData].sort((a, b) => a.angle - b.angle);
        setSweepData(sortedData);
        
        // Notify callback via ref (won't cause re-renders)
        if (!isFirstFetch.current) {
          onNewDataRef.current?.(sortedData);
        }
        isFirstFetch.current = false;
      }
    } catch (err) {
      console.error('Radar polling error:', err);
      if (mountedRef.current) {
        setStatus('error');
        setError(err.message);
      }
    }
  }, [apiBase, deviceId, limit, enabled]);

  // Fetch latest alert
  const fetchLatestAlert = useCallback(async () => {
    if (!enabled || !mountedRef.current) return;

    try {
      const url = `${apiBase}/api/radar/alerts?deviceId=${deviceId}&limit=1&isResolved=false`;
      const response = await fetch(url);
      
      if (!response.ok) return;

      const data = await response.json();
      if (data.results && data.results.length > 0 && mountedRef.current) {
        setLatestAlert(data.results[0]);
      }
    } catch (err) {
      console.error('Alert fetch error:', err);
    }
  }, [apiBase, deviceId, enabled]);

  // Fetch radar statistics
  const fetchStats = useCallback(async () => {
    if (!enabled || !mountedRef.current) return;

    try {
      const url = `${apiBase}/api/radar/stats?deviceId=${deviceId}&hours=24`;
      const response = await fetch(url);
      
      if (!response.ok) return;

      const data = await response.json();
      if (mountedRef.current) {
        setStats(data);
      }
    } catch (err) {
      console.error('Stats fetch error:', err);
    }
  }, [apiBase, deviceId, enabled]);

  // Manual refetch (resets and fetches all data)
  const refetch = useCallback(() => {
    isFirstFetch.current = true;
    setSweepData([]);
    fetchData();
    fetchLatestAlert();
    fetchStats();
  }, [fetchData, fetchLatestAlert, fetchStats]);

  // Start polling — stable deps prevent infinite interval resets
  useEffect(() => {
    if (!enabled) {
      setStatus('idle');
      return;
    }

    // Initial fetch
    checkRadarStatus();
    fetchData();
    fetchLatestAlert();
    fetchStats();
    
    // Check radar status every 10 seconds
    statusCheckTimer.current = setInterval(() => {
      checkRadarStatus();
    }, 10000);

    // Set up polling interval for sweep data
    pollTimer.current = setInterval(() => {
      fetchData();
    }, pollInterval);

    // Set up slower interval for alerts and stats (every 10 seconds)
    const statsTimer = setInterval(() => {
      fetchLatestAlert();
      fetchStats();
    }, 10000);

    return () => {
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
      }
      if (statsTimer) {
        clearInterval(statsTimer);
      }
      if (statusCheckTimer.current) {
        clearInterval(statusCheckTimer.current);
      }
    };
  }, [enabled, pollInterval, fetchData, fetchLatestAlert, fetchStats, checkRadarStatus]);

  return {
    sweepData,      // Array of radar readings {angle, distance}
    latestAlert,    // Most recent unresolved alert
    stats,          // Radar statistics
    status,         // 'idle' | 'polling' | 'connected' | 'error'
    radarStatus,    // 'connected' | 'disconnected' | 'unknown'
    lastUpdated,    // Timestamp of last successful fetch
    error,          // Error message if any
    refetch,        // Manual refetch function
  };
}
