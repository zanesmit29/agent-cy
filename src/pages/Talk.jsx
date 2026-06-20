import { useEffect, useRef, useState } from "react";
import Vapi from "@vapi-ai/web";

const VAPI_PUBLIC_KEY = "753f3541-f459-4c9e-b87e-63b5b9e2d93e";
const SQUAD_ID = "c767d939-3822-495c-bbaf-f7c880b2d093";

const STATES = { IDLE: "idle", CONNECTING: "connecting", LIVE: "live", ENDED: "ended", ERROR: "error" };

export default function TalkPage() {
  const [state, setState] = useState(STATES.IDLE);
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const vapiRef = useRef(null);
  const orbRef = useRef(null);
  const ring1Ref = useRef(null);
  const ring2Ref = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);

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
        orb.style.transform = `scale(${0.85 + Math.sin(t * 0.6) * 0.08})`;
        orb.style.opacity = "0.45";
        orb.style.boxShadow = "0 0 40px 8px rgba(201,169,110,0.15)";
        if (ring1) ring1.style.opacity = "0";
        if (ring2) ring2.style.opacity = "0";
      } else if (state === STATES.CONNECTING) {
        orb.style.transform = `scale(${0.9 + Math.sin(t * 1.2) * 0.1})`;
        orb.style.opacity = "0.7";
        orb.style.boxShadow = "0 0 60px 12px rgba(201,169,110,0.25)";
        if (ring1) { ring1.style.opacity = String(0.3 + Math.sin(t) * 0.2); ring1.style.transform = `scale(${1.2 + Math.sin(t * 0.8) * 0.15})`; }
        if (ring2) ring2.style.opacity = "0";
      } else if (state === STATES.LIVE) {
        const fast = agentSpeaking;
        orb.style.transform = `scale(${fast ? 1 + Math.sin(t * 3) * 0.12 : 0.95 + Math.sin(t * 1.5) * 0.05})`;
        orb.style.opacity = fast ? "1" : "0.75";
        orb.style.boxShadow = fast ? "0 0 80px 20px rgba(201,169,110,0.45)" : "0 0 50px 10px rgba(201,169,110,0.25)";
        const speed = fast ? 1.5 : 0.8;
        if (ring1) { const p = (t * speed) % 1; ring1.style.transform = `scale(${1.3 + p * 0.8})`; ring1.style.opacity = String(Math.max(0, 0.5 - p * 0.5)); }
        if (ring2) { const p = (t * speed + 0.5) % 1; ring2.style.transform = `scale(${1.3 + p * 0.8})`; ring2.style.opacity = String(Math.max(0, 0.5 - p * 0.5)); }
      } else {
        orb.style.transform = "scale(0.7)";
        orb.style.opacity = "0.2";
        orb.style.boxShadow = "none";
        if (ring1) ring1.style.opacity = "0";
        if (ring2) ring2.style.opacity = "0";
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
    } catch(e) { console.warn("Mic:", e); }
  };

  const cleanup = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
    analyserRef.current = null;
  };

  const initVapi = () => {
    if (vapiRef.current) return;
    const vapi = new Vapi(VAPI_PUBLIC_KEY);
    vapi.on("call-start", async () => { setState(STATES.LIVE); await startMicAnalyser(); });
    vapi.on("speech-start", () => setAgentSpeaking(true));
    vapi.on("speech-end", () => setAgentSpeaking(false));
    vapi.on("call-end", () => { setState(STATES.ENDED); cleanup(); });
    vapi.on("error", (e) => { 
      console.error("Vapi error:", e); 
      setErrorMessage(e?.message || e?.error?.message || JSON.stringify(e) || "Unknown error"); 
      setState(STATES.ERROR); 
      cleanup(); 
    });
    vapiRef.current = vapi;
  };

  const handleStart = () => {
    initVapi();
    setState(STATES.CONNECTING);
    vapiRef.current.start({ squadId: SQUAD_ID });
  };

  const handleEnd = () => vapiRef.current?.stop();
  const handleRestart = () => { vapiRef.current = null; setState(STATES.IDLE); };

  const amber = "#c9a96e";
  const grey = "#a09a8e";
  const dark = "#3a3530";

  return (
    <div style={{ minHeight: "100vh", background: "#13120f", color: "#f0ebe3", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 20px", fontFamily: "Georgia, 'Times New Roman', serif", position: "relative" }}>
      <div style={{ position: "absolute", top: "28px", left: "32px", fontSize: "17px", fontWeight: "700", letterSpacing: "-0.2px" }}>
        Agent<span style={{ color: amber }}>(cy)</span>
      </div>
      <a href="/" style={{ position: "absolute", top: "32px", right: "32px", fontSize: "13px", color: grey, textDecoration: "none" }}>← Back</a>
      <div style={{ position: "relative", width: "160px", height: "160px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "56px" }}>
        <div ref={ring1Ref} style={{ position: "absolute", width: "160px", height: "160px", borderRadius: "50%", border: `1px solid ${amber}`, opacity: 0 }} />
        <div ref={ring2Ref} style={{ position: "absolute", width: "160px", height: "160px", borderRadius: "50%", border: `1px solid ${amber}`, opacity: 0 }} />
        <div ref={orbRef} style={{ width: "96px", height: "96px", borderRadius: "50%", background: "radial-gradient(circle at 35% 35%, #e8d5a3, #c9a96e 45%, #8b6914)", transition: "opacity 0.3s ease" }} />
      </div>
      <h1 style={{ fontSize: "clamp(30px, 5vw, 52px)", fontWeight: "400", margin: "0 0 20px", textAlign: "center", lineHeight: 1.15 }}>
        {state === STATES.IDLE && "Tell us who you are."}
        {state === STATES.CONNECTING && <em style={{ color: grey }}>Connecting...</em>}
        {state === STATES.LIVE && (agentSpeaking ? "Agent speaking." : "Listening.")}
        {state === STATES.ENDED && "Conversation complete."}
        {state === STATES.ERROR && "Something went wrong."}
      </h1>
      {state === STATES.IDLE && (
        <p style={{ fontSize: "16px", color: grey, maxWidth: "460px", textAlign: "center", lineHeight: 1.75, margin: "0 0 48px", fontFamily: "-apple-system, sans-serif" }}>
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
        <p style={{ fontSize: "14px", color: "#b87171", margin: "0 0 12px", textAlign: "center", fontFamily: "-apple-system, sans-serif" }}>
          The call couldn't connect. Please try again or email hello@agentcy.io
        </p>
      )}
      {state === STATES.ERROR && errorMessage && (
        <p style={{ fontSize: "12px", color: "#6b4040", margin: "0 0 36px", textAlign: "center", fontFamily: "monospace", maxWidth: "480px", wordBreak: "break-all" }}>
          {errorMessage}
        </p>
      )}
      {state === STATES.CONNECTING && <div style={{ marginBottom: "48px" }} />}
      {(state === STATES.IDLE || state === STATES.ERROR) && (
        <button onClick={handleStart}
          style={{ background: "transparent", color: "#f0ebe3", border: "1px solid #f0ebe3", borderRadius: "100px", padding: "15px 40px", fontSize: "15px", cursor: "pointer", fontFamily: "-apple-system, sans-serif", transition: "border-color 0.2s, color 0.2s" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = amber; e.currentTarget.style.color = amber; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#f0ebe3"; e.currentTarget.style.color = "#f0ebe3"; }}>
          Start conversation →
        </button>
      )}
      {state === STATES.CONNECTING && (
        <button disabled style={{ background: "transparent", color: dark, border: `1px solid ${dark}`, borderRadius: "100px", padding: "15px 40px", fontSize: "15px", fontFamily: "-apple-system, sans-serif", cursor: "not-allowed" }}>
          Connecting...
        </button>
      )}
      {state === STATES.LIVE && (
        <button onClick={handleEnd}
          style={{ background: "transparent", color: grey, border: `1px solid ${dark}`, borderRadius: "100px", padding: "13px 36px", fontSize: "14px", fontFamily: "-apple-system, sans-serif", cursor: "pointer" }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "#6b6158"}
          onMouseLeave={e => e.currentTarget.style.borderColor = dark}>
          End conversation
        </button>
      )}
      {state === STATES.ENDED && (
        <button onClick={handleRestart}
          style={{ background: "transparent", color: grey, border: `1px solid ${dark}`, borderRadius: "100px", padding: "13px 36px", fontSize: "14px", fontFamily: "-apple-system, sans-serif", cursor: "pointer" }}>
          Start again
        </button>
      )}
      <div style={{ position: "absolute", bottom: "24px", fontSize: "12px", color: dark, display: "flex", gap: "20px", flexWrap: "wrap", justifyContent: "center", fontFamily: "-apple-system, sans-serif" }}>
        <span>Processed under GDPR — 90 day retention</span>
        <a href="mailto:privacy@agentcy.io" style={{ color: dark, textDecoration: "none" }}>Remove my data</a>
      </div>
    </div>
  );
}