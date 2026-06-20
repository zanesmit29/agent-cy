import { useEffect, useRef, useState } from "react";

const VAPI_PUBLIC_KEY = "753f3541-f459-4c9e-b87e-63b5b9e2d93e";
const SQUAD_ID = "c767d939-3822-495c-bbaf-f7c880b2d093";

const STATES = { IDLE: "idle", CONNECTING: "connecting", LIVE: "live", ENDED: "ended", ERROR: "error" };

export default function TalkPage() {
  const [state, setState] = useState(STATES.IDLE);
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [vapiReady, setVapiReady] = useState(false);
  const vapiRef = useRef(null);
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const analyserRef = useRef(null);
  const audioContextRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (window.Vapi) { setVapiReady(true); return; }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@vapi-ai/web@latest/dist/vapi.js";
    script.async = true;
    script.onload = () => setVapiReady(true);
    script.onerror = () => console.error("Failed to load Vapi SDK");
    document.head.appendChild(script);
    return () => { try { document.head.removeChild(script); } catch(_) {} };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      const W = canvas.width; const H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      const bars = 48; const barW = 3; const gap = (W - bars * barW) / (bars + 1);
      if (state === STATES.LIVE && analyserRef.current) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        for (let i = 0; i < bars; i++) {
          const val = dataArray[Math.floor((i / bars) * dataArray.length)] / 255;
          const barH = Math.max(4, val * H * 0.85);
          const x = gap + i * (barW + gap);
          ctx.fillStyle = `rgba(99, 102, 241, ${agentSpeaking ? 1 : 0.6})`;
          ctx.beginPath(); ctx.roundRect(x, (H - barH) / 2, barW, barH, 2); ctx.fill();
        }
      } else if (state === STATES.CONNECTING) {
        const t = Date.now() / 600;
        for (let i = 0; i < bars; i++) {
          const wave = Math.sin(t + i * 0.4) * 0.3 + 0.35;
          const barH = Math.max(4, wave * H * 0.5);
          const x = gap + i * (barW + gap);
          ctx.fillStyle = "rgba(99, 102, 241, 0.5)";
          ctx.beginPath(); ctx.roundRect(x, (H - barH) / 2, barW, barH, 2); ctx.fill();
        }
      } else {
        for (let i = 0; i < bars; i++) {
          const x = gap + i * (barW + gap);
          ctx.fillStyle = "rgba(99, 102, 241, 0.2)";
          ctx.beginPath(); ctx.roundRect(x, H / 2 - 2, barW, 4, 2); ctx.fill();
        }
      }
    };
    draw();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [state, agentSpeaking]);

  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = canvas.offsetWidth * window.devicePixelRatio;
        canvas.height = canvas.offsetHeight * window.devicePixelRatio;
        const ctx = canvas.getContext("2d");
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const startMicAnalyser = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
    } catch (e) { console.warn("Mic analyser failed:", e); }
  };

  const initVapi = () => {
    if (vapiRef.current) return;
    const vapi = new window.Vapi(VAPI_PUBLIC_KEY);
    vapi.on("call-start", async () => { setState(STATES.LIVE); await startMicAnalyser(); });
    vapi.on("speech-start", () => setAgentSpeaking(true));
    vapi.on("speech-end", () => setAgentSpeaking(false));
    vapi.on("call-end", () => { setState(STATES.ENDED); cleanup(); });
    vapi.on("error", () => { setState(STATES.ERROR); cleanup(); });
    vapiRef.current = vapi;
  };

  const cleanup = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
    analyserRef.current = null;
  };

  const handleStart = () => {
    if (!vapiReady) return;
    initVapi();
    setState(STATES.CONNECTING);
    vapiRef.current.start({ squadId: SQUAD_ID });
  };

  const handleEnd = () => { vapiRef.current?.stop(); };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 20px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <div style={{ position: "absolute", top: "24px", left: "28px", fontSize: "18px", fontWeight: "700", letterSpacing: "-0.3px" }}>
        Agent<span style={{ color: "#6366f1" }}>(cy)</span>
      </div>
      <canvas ref={canvasRef} style={{ width: "min(480px, 90vw)", height: "80px", marginBottom: "48px", display: "block" }} />
      <h1 style={{ fontSize: "clamp(28px, 5vw, 48px)", fontWeight: "700", letterSpacing: "-1px", margin: "0 0 20px", textAlign: "center", lineHeight: 1.1 }}>Tell us who you are.</h1>
      {state === STATES.IDLE && (
        <p style={{ fontSize: "clamp(14px, 2.5vw, 17px)", color: "#888", maxWidth: "480px", textAlign: "center", lineHeight: 1.65, margin: "0 0 44px" }}>
          We find engineers from their real work — commits, models, community contributions. Or from what they've built privately — showcased on their terms, with full control over who sees it. Whether we found you, or you found us — you're in the right place. No CVs. Just what you've actually done.
        </p>
      )}
      {state === STATES.CONNECTING && <p style={{ color: "#666", fontSize: "15px", margin: "0 0 44px" }}>Connecting...</p>}
      {state === STATES.LIVE && <p style={{ color: "#6366f1", fontSize: "15px", margin: "0 0 44px" }}>{agentSpeaking ? "Agent speaking..." : "Listening..."}</p>}
      {state === STATES.ENDED && <p style={{ color: "#888", fontSize: "16px", maxWidth: "400px", textAlign: "center", margin: "0 0 44px", lineHeight: 1.6 }}>Thanks for the conversation.</p>}
      {state === STATES.ERROR && <p style={{ color: "#ef4444", fontSize: "15px", margin: "0 0 44px", textAlign: "center" }}>Something went wrong. Try again or reach us at hello@agentcy.io</p>}
      {(state === STATES.IDLE || state === STATES.ERROR) && (
        <button onClick={handleStart} disabled={!vapiReady}
          style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: "100px", padding: "16px 40px", fontSize: "16px", fontWeight: "600", cursor: vapiReady ? "pointer" : "not-allowed", opacity: vapiReady ? 1 : 0.5, letterSpacing: "-0.2px", transition: "background 0.2s" }}
          onMouseEnter={e => { if (vapiReady) e.currentTarget.style.background = "#4f46e5"; }}
          onMouseLeave={e => { if (vapiReady) e.currentTarget.style.background = "#6366f1"; }}>
          Start talking
        </button>
      )}
      {state === STATES.CONNECTING && (
        <button disabled style={{ background: "#1a1a1a", color: "#555", border: "1px solid #2a2a2a", borderRadius: "100px", padding: "16px 40px", fontSize: "16px", fontWeight: "600", cursor: "not-allowed" }}>Connecting...</button>
      )}
      {state === STATES.LIVE && (
        <button onClick={handleEnd} style={{ background: "transparent", color: "#555", border: "1px solid #2a2a2a", borderRadius: "100px", padding: "14px 36px", fontSize: "14px", fontWeight: "500", cursor: "pointer" }}>End conversation</button>
      )}
      <div style={{ position: "absolute", bottom: "24px", fontSize: "12px", color: "#333", display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center" }}>
        <span>🔒 GDPR protected</span>
        <a href="mailto:privacy@agentcy.io" style={{ color: "#333", textDecoration: "none" }}>Remove my data</a>
      </div>
    </div>
  );
}