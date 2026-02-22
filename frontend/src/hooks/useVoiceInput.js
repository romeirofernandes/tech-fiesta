import { useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

/**
 * Hook for speech-to-text input using WebkitSpeechRecognition + Groq parsing.
 * Supports any language — the browser handles speech-to-text,
 * then Groq extracts structured form data from the transcript.
 *
 * @param {string} type - 'production' | 'expense' | 'sale'
 * @param {object} context - { animals: [...] } for Groq to match animal names
 * @returns {object} { isListening, transcript, parsedData, startListening, stopListening, error, isProcessing }
 */
export function useVoiceInput(type = 'production', context = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef(null);

  // Use refs to always have latest values in async callbacks
  const typeRef = useRef(type);
  const contextRef = useRef(context);
  useEffect(() => { typeRef.current = type; }, [type]);
  useEffect(() => { contextRef.current = context; }, [context]);

  const isSupported = typeof window !== 'undefined' &&
    ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

  const parseWithGroq = useCallback(async (text) => {
    setIsProcessing(true);
    try {
      // Send only essential animal data to avoid huge payloads
      const animals = (contextRef.current.animals || []).map(a => ({
        _id: a._id, name: a.name, species: a.species
      }));
      const res = await axios.post(`${API_BASE}/api/voice/parse`, {
        transcript: text,
        type: typeRef.current,
        context: { animals }
      });

      if (res.data.success) {
        setParsedData(res.data.data);
      } else {
        setError(res.data.error || 'Failed to parse voice input');
      }
    } catch (err) {
      console.error('Groq parse error:', err);
      setError('Failed to process voice input. Please try again or enter manually.');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Speech recognition is not supported in this browser. Use Chrome or Edge.');
      return;
    }

    setError('');
    setTranscript('');
    setParsedData(null);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    // Use hi-IN as default — browser handles multi-language recognition well with this
    recognition.lang = 'hi-IN';

    let finalTranscript = '';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }
      setTranscript(finalTranscript + interim);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        setError('No speech detected. Please try again.');
      } else if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone permissions.');
      } else {
        setError(`Speech recognition error: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = async () => {
      setIsListening(false);
      const text = finalTranscript.trim();
      if (text) {
        setTranscript(text);
        await parseWithGroq(text);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, parseWithGroq]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  return {
    isListening,
    transcript,
    parsedData,
    error,
    isProcessing,
    isSupported,
    startListening,
    stopListening,
    setParsedData,
    setTranscript,
  };
}
