import { useState, useEffect, useRef, useCallback } from "react";
import { Heart, Space, ChevronDown } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
const RFID_TAG = "RFID-IND-0001";
const ANIMAL_NAME = "Gauri";

const HR_RANGES = [
  { label: "60 – 65 BPM", min: 60, max: 65 },
  { label: "65 – 72 BPM", min: 65, max: 72 },
  { label: "72 – 80 BPM", min: 72, max: 80 },
  { label: "80 – 90 BPM", min: 80, max: 90 },
];

function randomInRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default function FakeHeartrate() {
  const [selectedRange, setSelectedRange] = useState(HR_RANGES[1]); // default 65-72
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [currentBPM, setCurrentBPM] = useState(0);
  const [lastSent, setLastSent] = useState(null);
  const [sending, setSending] = useState(false);
  const [log, setLog] = useState([]);
  const intervalRef = useRef(null);
  const spaceRef = useRef(false);
  const rangeRef = useRef(selectedRange);

  // keep rangeRef in sync
  useEffect(() => {
    rangeRef.current = selectedRange;
  }, [selectedRange]);

  const addLog = useCallback((msg) => {
    setLog((prev) => [{ msg, ts: new Date().toLocaleTimeString() }, ...prev].slice(0, 40));
  }, []);

  // send a single reading to the backend
  const sendReading = useCallback(
    async (bpm) => {
      setSending(true);
      try {
        const body = {
          rfidTag: RFID_TAG,
          heartRate: bpm,
          temperature: null,
          humidity: null,
          sensorType: "HR",
          deviceId: "fake-hr-console",
        };
        const res = await fetch(`${API_BASE}/api/iot/sensors`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setLastSent({ bpm, ts: new Date() });
        addLog(`✓ Sent ${bpm} BPM → saved (id: ${data._id?.slice(-6) || "ok"})`);
      } catch (err) {
        addLog(`✗ Error: ${err.message}`);
      } finally {
        setSending(false);
      }
    },
    [addLog]
  );

  // also send heartbeat to keep IoT status "connected"
  const sendHeartbeat = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/api/iot/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: "fake-hr-console" }),
      });
    } catch (_) {
      // silent
    }
  }, []);

  // start / stop the sending interval based on space key
  useEffect(() => {
    if (spaceHeld) {
      // send immediately
      const bpm = randomInRange(rangeRef.current.min, rangeRef.current.max);
      setCurrentBPM(bpm);
      sendReading(bpm);
      sendHeartbeat();

      // then every 2s
      intervalRef.current = setInterval(() => {
        const b = randomInRange(rangeRef.current.min, rangeRef.current.max);
        setCurrentBPM(b);
        sendReading(b);
        sendHeartbeat();
      }, 2000);
    } else {
      // flatline: send 0
      setCurrentBPM(0);
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      sendReading(0);
      addLog("— Space released → flatline (0 BPM)");
    }

    return () => {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [spaceHeld, sendReading, sendHeartbeat, addLog]);

  // keyboard listeners (global)
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        if (!spaceRef.current) {
          spaceRef.current = true;
          setSpaceHeld(true);
        }
      }
    };
    const onKeyUp = (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        spaceRef.current = false;
        setSpaceHeld(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // heartbeat keep-alive every 5s while page is open
  useEffect(() => {
    const hb = setInterval(sendHeartbeat, 5000);
    sendHeartbeat();
    return () => clearInterval(hb);
  }, [sendHeartbeat]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: spaceHeld
          ? "linear-gradient(135deg, #0a0a0a 0%, #1a0a0a 100%)"
          : "linear-gradient(135deg, #0a0a0a 0%, #0a0a1a 100%)",
        color: "#e0e0e0",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "40px 20px",
        userSelect: "none",
      }}
    >
      {/* Title */}
      <h1
        style={{
          fontSize: "14px",
          textTransform: "uppercase",
          letterSpacing: "4px",
          color: "#555",
          marginBottom: "8px",
        }}
      >
        Fake Heart Rate Console
      </h1>
      <p style={{ fontSize: "12px", color: "#444", marginBottom: "32px" }}>
        {ANIMAL_NAME} — {RFID_TAG}
      </p>

      {/* Big BPM Display */}
      <div
        style={{
          position: "relative",
          width: "280px",
          height: "280px",
          borderRadius: "50%",
          border: `3px solid ${spaceHeld ? "#ff3333" : "#333"}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "32px",
          transition: "border-color 0.3s, box-shadow 0.3s",
          boxShadow: spaceHeld
            ? "0 0 60px rgba(255,51,51,0.3), inset 0 0 40px rgba(255,51,51,0.05)"
            : "0 0 30px rgba(0,0,0,0.3)",
        }}
      >
        {/* Pulse animation ring */}
        {spaceHeld && (
          <div
            style={{
              position: "absolute",
              inset: "-12px",
              borderRadius: "50%",
              border: "2px solid rgba(255,51,51,0.4)",
              animation: "pulse-ring 1s ease-out infinite",
            }}
          />
        )}

        <span
          style={{
            fontSize: "72px",
            fontWeight: "700",
            fontVariantNumeric: "tabular-nums",
            color: spaceHeld ? "#ff3333" : "#444",
            lineHeight: 1,
            transition: "color 0.3s",
          }}
        >
          {currentBPM}
        </span>
        <span
          style={{
            fontSize: "16px",
            color: spaceHeld ? "#ff6666" : "#555",
            marginTop: "4px",
            fontWeight: "500",
          }}
        >
          BPM
        </span>
        <span
          style={{
            fontSize: "11px",
            color: spaceHeld ? "#884444" : "#333",
            marginTop: "8px",
          }}
        >
          {spaceHeld ? "TRANSMITTING" : "FLATLINE"}
        </span>
      </div>

      {/* Range Dropdown */}
      <div style={{ position: "relative", marginBottom: "24px", zIndex: 10 }}>
        <button
          onClick={() => setDropdownOpen((o) => !o)}
          style={{
            background: "#1a1a1a",
            border: "1px solid #333",
            borderRadius: "8px",
            padding: "10px 20px",
            color: "#ccc",
            fontSize: "14px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            minWidth: "200px",
            justifyContent: "space-between",
          }}
        >
          <span>Range: {selectedRange.label}</span>
          <span style={{ fontSize: "10px", color: "#666" }}>▼</span>
        </button>
        {dropdownOpen && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              background: "#1a1a1a",
              border: "1px solid #333",
              borderRadius: "8px",
              marginTop: "4px",
              overflow: "hidden",
            }}
          >
            {HR_RANGES.map((r) => (
              <button
                key={r.label}
                onClick={() => {
                  setSelectedRange(r);
                  setDropdownOpen(false);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "10px 20px",
                  background:
                    r.label === selectedRange.label ? "#2a1a1a" : "transparent",
                  border: "none",
                  color:
                    r.label === selectedRange.label ? "#ff6666" : "#aaa",
                  fontSize: "14px",
                  cursor: "pointer",
                  textAlign: "left",
                }}
                onMouseEnter={(e) =>
                  (e.target.style.background = "#222")
                }
                onMouseLeave={(e) =>
                  (e.target.style.background =
                    r.label === selectedRange.label ? "#2a1a1a" : "transparent")
                }
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Space bar instruction */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "16px 32px",
          background: spaceHeld ? "rgba(255,51,51,0.1)" : "rgba(255,255,255,0.03)",
          borderRadius: "12px",
          border: `1px solid ${spaceHeld ? "rgba(255,51,51,0.3)" : "#222"}`,
          marginBottom: "32px",
          transition: "all 0.3s",
        }}
      >
        <div
          style={{
            padding: "6px 24px",
            background: spaceHeld ? "#ff3333" : "#222",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: "700",
            letterSpacing: "2px",
            color: spaceHeld ? "#fff" : "#666",
            border: `1px solid ${spaceHeld ? "#ff3333" : "#333"}`,
            transition: "all 0.15s",
            minWidth: "120px",
            textAlign: "center",
          }}
        >
          SPACE
        </div>
        <span style={{ fontSize: "13px", color: "#888" }}>
          {spaceHeld ? "Release to flatline" : "Hold to send heartbeats"}
        </span>
      </div>

      {/* Status */}
      <div
        style={{
          fontSize: "12px",
          color: "#555",
          marginBottom: "24px",
          textAlign: "center",
        }}
      >
        {lastSent && (
          <span>
            Last sent: {lastSent.bpm} BPM at {lastSent.ts.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Log */}
      <div
        style={{
          width: "100%",
          maxWidth: "500px",
          background: "#111",
          borderRadius: "8px",
          border: "1px solid #222",
          padding: "12px",
          maxHeight: "200px",
          overflowY: "auto",
          fontSize: "11px",
          fontFamily: "monospace",
          color: "#666",
        }}
      >
        {log.length === 0 ? (
          <div style={{ textAlign: "center", padding: "8px", color: "#444" }}>
            Press and hold SPACE to start sending heartbeats...
          </div>
        ) : (
          log.map((entry, i) => (
            <div key={i} style={{ padding: "2px 0" }}>
              <span style={{ color: "#444" }}>[{entry.ts}]</span>{" "}
              <span
                style={{
                  color: entry.msg.startsWith("✓")
                    ? "#4a4"
                    : entry.msg.startsWith("✗")
                    ? "#a44"
                    : "#666",
                }}
              >
                {entry.msg}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Pulse CSS animation */}
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.15); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
