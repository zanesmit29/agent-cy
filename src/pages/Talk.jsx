import { useEffect, useRef, useState } from "react";

const VAPI_PUBLIC_KEY = "753f3541-f459-4c9e-b87e-63b5b9e2d93e";
const SQUAD_ID = "c767d939-3822-495c-bbaf-f7c880b2d093";

const STATES = { IDLE: "idle", CONNECTING: "connecting", LIVE: "live", ENDED: "ended", ERROR: "error" };

export default function TalkPage() {
  const [state, setState] = useState(STATES.IDLE);
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [vapiReady, setVapiReady] = useState(false);
  const vapiRef = useRef(null);
  const animRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const orbRef = useRef(null);
  const ring1Ref = useRef(null);
  const ring2Ref = useRef(null);

  // Load Vapi SDK
  useEffect(() => {
    if (window.Vapi) { setVapiReady(true); return; }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@vapi-ai/web@latest/dist/vapi.js";
    script.async = true;
    script.onload = () => setVapiReady(true);
    script.onerror = () => console.error("Vapi SDK failed to load");
    document.head.appendChild(script);
    return () => { try { document.head.removeChild(script); } catch(_){} };
  }, []);

  // Orb animation
  useEffect(() => {
    let frame;
    let t = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      t += 0.02;
      const orb = orbRef.current;
      const ring1 = ring1Ref.current;
      const ring2 = ring2Ref.current;
      if (!orb) return;

      if (state === STATES.IDLE) {
        const pulse = 0.85 + Math.sin(t * 0.6) * 0.08;
        orb.style.transform = `scale(${pulse})`;
        orb.style.opacity = "0.45";
        orb.style.boxShadow = "0 0 40px 8px rgba(201,169,110,0.15)";
        if (ring1) ring1.style.opacity = "0";
        if (ring2) ring2.style.opacity = "0";
      } else if (state === STATES.CONNECTING) {
        const pulse = 0.9 + Math.sin(t * 1.2) * 0.1;
        orb.style.transform = `scale(${pulse})`;
        orb.style.opacity = "0.7";
        orb.style.boxShadow = "0 0 60px 12px rgba(201,169,110,0.25)";
        if (ring1) { ring1.style.opacity = String(0.3 + Math.sin(t) * 0.2); ring1.style.transform = `scale(${1.2 + Math.sin(t*0.8)*0.15})`; }
        if (ring2) ring2.style.opacity = "0";
      } else if (state === STATES.LIVE) {
        let scale, glow;
        if (agentSpeaking) {
          scale = 1 + Math.sin(t * 3) * 0.12;
          glow = "0 0 80px 20px rgba(201,169,110,0.45)";
          orb.style.opacity = "1";
        } else {
          scale = 0.95 + Math.sin(t * 1.5) * 0.05;
          glow = "0 0 50px 10px rgba(201,169,110,0.25)";
          orb.style.opacity = "0.75";
        }
        orb.style.transform = `scale(${scale})`;
        orb.style.boxShadow = glow;
        if (ring1) {
          const r1s = 1.3 + ((t * (agentSpeaking ? 1.5 : 0.8)) % 1) * 0.8;
          const r1o = Math.max(0, 0.5 - ((t * (agentSpeaking ? 1.5 : 0.8)) % 1) * 0.5);
          ring1.style.transform = `scale(${r1s})`;
          ring1.style.opacity = String(r1o);
        }
        if (ring2) {
          const r2s = 1.3 + ((t * (agentSpeaking ? 1.5 : 0.8) + 0.5) % 1) * 0.8;
          const r2o = Math.max(0, 0.5 - ((t * (agentSpeaking ? 1.5 : 0.8) + 0.5) % 1) * 0.5);
          ring2.style.transform = `scale(${r2s})`;
          ring2.style.opacity = String(r2o);
        }
      } else if (state === STATES.ENDED) {
        orb.style.transform = "scale(0.7)";
        orb.style.opacity = "0.2";
        orb.style.boxShadow = "none";
        if (ring1) ring1.style.opacity = "0";
        if (ring2) ring2.style.opacity = "0";
      } else {
        orb.style.transform = "scale(0.8)";
        orb.style.opacity = "0.3";
        orb.style.boxShadow = "none";
      }
    };
    animate();
    return () => cancelAnimationFrame(frame);
  }, [state, agentSpeaking]);

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
    } catch(e) { console.warn("Mic analyser:", e); }
  };

  const cleanup = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
    analyserRef.current = null;
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

  const handleStart = () => {
    if (!vapiReady) return;
    initVapi();
    setState(STATES.CONNECTING);
    vapiRef.current.start({ squadId: SQUAD_ID });
  };

  const handleEnd = () => { vapiRef.current?.stop(); };

  const handleRestart = () => {
    vapiRef.current = null;
    setState(STATES.IDLE);
  };

  const bg = "#13120f";
  const amber = "#c9a96e";
  const grey = "#a09a8e";
  const darkGrey = "#3a3530";

  return (
    <div style={{ minHeight: "100vh", background: bg, color: "#f0ebe3", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 20px", fontFamily: "Georgia, 'Times New Roman', serif", position: "relative" }}>

      {/* Nav */}
      <div style={{ position: "absolute", top: "28px", left: "32px", fontSize: "17px", fontWeight: "700", letterSpacing: "-0.2px", color: "#f0ebe3" }}>
        Agent<span style={{ color: amber }}>(cy)</span>
      </div>
      <a href="/" style={{ position: "absolute", top: "32px", right: "32px", fontSize: "13px", color: grey, textDecoration: "none", letterSpacing: "0.02em" }}>← Back</a>

      {/* Orb container */}
      <div style={{ position: "relative", width: "160px", height: "160px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "56px" }}>
        {/* Rings */}
        <div ref={ring1Ref} style={{ position: "absolute", width: "160px", height: "160px", borderRadius: "50%", border: `1px solid ${amber}`, opacity: 0, transition: "none" }} />
        <div ref={ring2Ref} style={{ position: "absolute", width: "160px", height: "160px", borderRadius: "50%", border: `1px solid ${amber}`, opacity: 0, transition: "none" }} />
        {/* Orb */}
        <div ref={orbRef} style={{ width: "96px", height: "96px", borderRadius: "50%", background: `radial-gradient(circle at 35% 35%, #e8d5a3, #c9a96e 45%, #8b6914)`, transition: "opacity 0.3s ease" }} />
      </div>

      {/* Headline */}
      <h1 style={{ fontSize: "clamp(30px, 5vw, 52px)", fontWeight: "400", letterSpacing: "-0.5px", margin: "0 0 20px", textAlign: "center", lineHeight: 1.15, fontStyle: "normal" }}>
        {state === STATES.IDLE && "Tell us who you are."}
        {state === STATES.CONNECTING && <em style={{ color: grey }}>Connecting...</em>}
        {state === STATES.LIVE && (agentSpeaking ? "Agent speaking." : "Listening.")}
        {state === STATES.ENDED && "Conversation complete."}
        {state === STATES.ERROR && "Something went wrong."}
      </h1>

      {/* Subtext */}
      {state === STATES.IDLE && (
        <p style={{ fontSize: "clamp(14px, 2vw, 16px)", color: grey, maxWidth: "460px", textAlign: "center", lineHeight: 1.75, margin: "0 0 48px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontWeight: "400" }}>
          We find engineers from their real work — commits, models, contributions. Whether we reached out or you found us, you're in the right place. No CVs. Just what you've actually built.
        </p>
      )}
      {state === STATES.LIVE && (
        <p style={{ fontSize: "14px", color: grey, margin: "0 0 48px", fontFamily: "-apple-system, sans-serif" }}>
          You'll speak with an AI assistant. A human recruiter reviews every profile.
        </p>
      )}
      {state === STATES.ENDED && (
        <p style={{ fontSize: "15px", color: grey, maxWidth: "400px", textAlign: "center", margin: "0 0 48px", lineHeight: 1.7, fontFamily: "-apple-system, sans-serif" }}>
          A recruiter on our team will review your profile within 48 hours.
        </p>
      )}
      {state === STATES.ERROR && (
        <p style={{ fontSize: "14px", color: "#b87171", margin: "0 0 48px", textAlign: "center", fontFamily: "-apple-system, sans-serif" }}>
          The call couldn't connect. Please try again or email us at hello@agentcy.io
        </p>
      )}
      {state === STATES.CONNECTING && (
        <p style={{ fontSize: "14px", color: darkGrey, margin: "0 0 48px", fontFamily: "-apple-system, sans-serif" }}>&nbsp;</p>
      )}

      {/* Buttons */}
      {(state === STATES.IDLE || state === STATES.ERROR) && (
        <button onClick={handleStart} disabled={!vapiReady}
          style={{ background: "transparent", color: "#f0ebe3", border: `1px solid ${vapiReady ? "#f0ebe3" : darkGrey}`, borderRadius: "100px", padding: "15px 40px", fontSize: "15px", fontWeight: "400", cursor: vapiReady ? "pointer" : "not-allowed", opacity: vapiReady ? 1 : 0.4, letterSpacing: "0.02em", fontFamily: "-apple-system, sans-serif", transition: "border-color 0.2s, color 0.2s" }}
          onMouseEnter={e => { if(vapiReady){ e.currentTarget.style.borderColor = amber; e.currentTarget.style.color = amber; }}}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#f0ebe3"; e.currentTarget.style.color = "#f0ebe3"; }}>
          Start conversation →
        </button>
      )}
      {state === STATES.CONNECTING && (
        <button disabled style={{ background: "transparent", color: darkGrey, border: `1px solid ${darkGrey}`, borderRadius: "100px", padding: "15px 40px", fontSize: "15px", fontFamily: "-apple-system, sans-serif", cursor: "not-allowed" }}>
          Connecting...
        </button>
      )}
      {state === STATES.LIVE && (
        <button onClick={handleEnd}
          style={{ background: "transparent", color: grey, border: `1px solid ${darkGrey}`, borderRadius: "100px", padding: "13px 36px", fontSize: "14px", fontFamily: "-apple-system, sans-serif", cursor: "pointer", transition: "border-color 0.2s" }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "#6b6158"}
          onMouseLeave={e => e.currentTarget.style.borderColor = darkGrey}>
          End conversation
        </button>
      )}
      {state === STATES.ENDED && (
        <button onClick={handleRestart}
          style={{ background: "transparent", color: grey, border: `1px solid ${darkGrey}`, borderRadius: "100px", padding: "13px 36px", fontSize: "14px", fontFamily: "-apple-system, sans-serif", cursor: "pointer" }}>
          Start again
        </button>
      )}

      {/* Footer */}
      <div style={{ position: "absolute", bottom: "24px", fontSize: "12px", color: darkGrey, display: "flex", gap: "20px", flexWrap: "wrap", justifyContent: "center", fontFamily: "-apple-system, sans-serif" }}>
        <span>Processed under GDPR — 90 day retention</span>
        <a href="mailto:privacy@agentcy.io" style={{ color: darkGrey, textDecoration: "none" }}>Remove my data</a>
      </div>
    </div>
  );
}