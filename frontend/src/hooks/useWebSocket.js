import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for WebSocket connection with auto-reconnect
 * @param {string} url - WebSocket URL
 * @param {object} options - Configuration options
 * @returns {object} - { message, status, sendMessage }
 */
export function useWebSocket(url, options = {}) {
  const {
    reconnectInterval = 5000,
    maxRetries = 10,
    onOpen,
    onClose,
    onError,
    onMessage,
  } = options;

  const [message, setMessage] = useState(null);
  const [status, setStatus] = useState('connecting');
  const ws = useRef(null);
  const retryCount = useRef(0);
  const reconnectTimeout = useRef(null);

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        setStatus('connected');
        retryCount.current = 0;
        if (retryCount.current > 0) {
          console.log('WebSocket reconnected successfully');
        }
        onOpen?.();
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setMessage(data);
          onMessage?.(data);
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      ws.current.onerror = (error) => {
        setStatus('error');
        onError?.(error);
      };

      ws.current.onclose = (event) => {
        setStatus('disconnected');
        onClose?.(event);

        // Auto-reconnect logic
        if (retryCount.current < maxRetries) {
          retryCount.current += 1;
          
          reconnectTimeout.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else {
          setStatus('failed');
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setStatus('error');
    }
  }, [url, reconnectInterval, maxRetries, onOpen, onClose, onError, onMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    retryCount.current = maxRetries; // Prevent auto-reconnect
    ws.current?.close();
  }, [maxRetries]);

  const sendMessage = useCallback((data) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(typeof data === 'string' ? data : JSON.stringify(data));
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    message,
    status,
    sendMessage,
    reconnect: connect,
    disconnect,
  };
}

export default useWebSocket;
