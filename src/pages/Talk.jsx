import { useEffect, useRef, useState } from "react";
import { Candidate } from "@/api/entities";
import { User } from "@/api/entities";

const VAPI_PUBLIC_KEY = "753f3541-f459-4c9e-b87e-63b5b9e2d93e";
const SQUAD_ID = "c767d939-3822-495c-bbaf-f7c880b2d093";

const STATES = {
  IDLE: "IDLE",
  CONNECTING: "CONNECTING",
  LIVE: "LIVE",
  ENDED: "ENDED",
  ERROR: "ERROR",
};

export default function TalkPage() {
  const [state, setState] = useState(STATES.IDLE);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const vapiRef = useRef(null);
  const candidateIdRef = useRef(null);

  // Match or create candidate record on mount
  useEffect(() => {
    const run = async () => {
      try {
        const user = await User.me();
        if (!user?.email) return;
        const existing = await Candidate.filter({ email: user.email });
        if (existing?.length > 0) {
          candidateIdRef.current = existing[0].id;
        } else {
          const due = new Date();
          due.setDate(due.getDate() + 90);
          const c = await Candidate.create({
            name: user.full_name || user.email,
            email: user.email,
            current_stage: "Discovered",
            discovered_via: "Self-registered",
            gdpr_deletion_due: due.toISOString().split("T")[0],
          });
          candidateIdRef.current = c.id;
        }
      } catch (e) {
        console.warn("candidate match/create failed", e);
      }
    };
    run();
  }, []);

  // Load Vapi SDK
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@vapi-ai/web@latest/dist/vapi.iife.js";
    script.async = true;
    script.onload = () => {
      const vapi = new window.Vapi(VAPI_PUBLIC_KEY);
      vapiRef.current = vapi;

      vapi.on("call-start", () => setState(STATES.LIVE));
      vapi.on("speech-start", () => setIsSpeaking(true));
      vapi.on("speech-end", () => setIsSpeaking(false));
      vapi.on("error", () => setState(STATES.ERROR));
    };
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const handleStart = () => {
    if (!vapiRef.current) return;
    setState(STATES.CONNECTING);
    vapiRef.current.start(undefined, undefined, SQUAD_ID);
  };

  const handleEnd = async () => {
    // Capture call ID BEFORE stopping
    let callId = null;
    try {
      callId = vapiRef.current?.call?.id || null;
    } catch (e) {}

    // Stop the call
    if (vapiRef.current) {
      vapiRef.current.stop();
    }
    setState(STATES.ENDED);

    // Write call_id and fetch transcript
    const cid = candidateIdRef.current;
    if (callId && cid) {
      try {
        await Candidate.update(cid, { vapi_call_id: callId });
      } catch (e) {}
      fetch("/functions/fetchVapiTranscript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ call_id: callId, candidate_id: cid }),
      }).catch(() => {});
    }

    setTimeout(() => {
      window.location.href = "/candidate-dashboard";
    }, 2500);
  };

  // Orb visual state
  const orbStyle = () => {
    const base = {
      width: 120,
      height: 120,
      borderRadius: "50%",
      margin: "0 auto",
      transition: "all 0.5s ease",
    };
    if (state === STATES.IDLE) return { ...base, background: "radial-gradient(circle at 40% 35%, #8a7a5a, #3a3020)", boxShadow: "0 0 30px rgba(201,169,110,0.15)" };
    if (state === STATES.CONNECTING) return { ...base, background: "radial-gradient(circle at 40% 35%, #b8955a, #5a4525)", boxShadow: "0 0 50px rgba(201,169,110,0.35)", animation: "pulse 2s ease-in-out infinite" };
    if (state === STATES.LIVE && isSpeaking) return { ...base, background: "radial-gradient(circle at 40% 35%, #e8b870, #7a5a20)", boxShadow: "0 0 80px rgba(201,169,110,0.7)", animation: "pulse-fast 0.8s ease-in-out infinite" };
    if (state === STATES.LIVE) return { ...base, background: "radial-gradient(circle at 40% 35%, #d4a855, #6a4a18)", boxShadow: "0 0 60px rgba(201,169,110,0.5)", animation: "pulse 1.5s ease-in-out infinite" };
    if (state === STATES.ENDED) return { ...base, background: "radial-gradient(circle at 40% 35%, #3a3020, #1a1810)", boxShadow: "0 0 10px rgba(201,169,110,0.05)" };
    return base;
  };

  return (
    <div style={{ minHeight: "100vh", background: "#13120f", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", color: "#e8e0d0", padding: "40px 20px", position: "relative" }}>
      <style>{`
        @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.08); } }
        @keyframes pulse-fast { 0%,100% { transform: scale(1); } 50% { transform: scale(1.12); } }
      `}</style>

      {/* Header */}
      <div style={{ position: "absolute", top: 24, left: 32, fontSize: 18, fontFamily: "Georgia, serif" }}>
        Agent<span style={{ color: "#c9a96e" }}>(cy)</span>
      </div>
      <a href="/" style={{ position: "absolute", top: 24, right: 32, fontSize: 14, color: "#a09a8e", textDecoration: "none" }}>← Back</a>

      {/* Orb */}
      <div style={{ marginBottom: 48 }}>
        <div style={orbStyle()} />
      </div>

      {/* Content by state */}
      {state === STATES.IDLE && (
        <>
          <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: "normal", textAlign: "center", marginBottom: 20, lineHeight: 1.15 }}>Tell us who you are.</h1>
          <p style={{ color: "#a09a8e", textAlign: "center", maxWidth: 520, lineHeight: 1.7, marginBottom: 48, fontSize: 16 }}>
            We find engineers from their real work — commits, models, contributions. Whether we reached out or you found us, you're in the right place. No CVs. Just what you've actually built.
          </p>
          <button onClick={handleStart} style={{ padding: "14px 36px", borderRadius: 999, border: "1px solid #e8e0d0", background: "transparent", color: "#e8e0d0", fontSize: 16, cursor: "pointer", fontFamily: "Georgia, serif", letterSpacing: 0.3 }}>
            Start conversation →
          </button>
        </>
      )}

      {state === STATES.CONNECTING && (
        <p style={{ color: "#a09a8e", fontSize: 18, letterSpacing: 1 }}>Connecting...</p>
      )}

      {state === STATES.LIVE && (
        <>
          <p style={{ color: "#a09a8e", fontSize: 18, marginBottom: 40 }}>
            {isSpeaking ? "Agent speaking..." : "Listening..."}
          </p>
          <button onClick={handleEnd} style={{ padding: "12px 32px", borderRadius: 999, border: "1px solid #a09a8e", background: "transparent", color: "#a09a8e", fontSize: 15, cursor: "pointer", fontFamily: "Georgia, serif" }}>
            End conversation
          </button>
        </>
      )}

      {state === STATES.ENDED && (
        <p style={{ color: "#a09a8e", fontSize: 20, textAlign: "center" }}>Thanks for the conversation.</p>
      )}

      {state === STATES.ERROR && (
        <>
          <p style={{ color: "#c97a6e", fontSize: 16, marginBottom: 24 }}>Something went wrong. Please try again.</p>
          <button onClick={() => setState(STATES.IDLE)} style={{ padding: "12px 32px", borderRadius: 999, border: "1px solid #c97a6e", background: "transparent", color: "#c97a6e", fontSize: 15, cursor: "pointer", fontFamily: "Georgia, serif" }}>
            Retry
          </button>
        </>
      )}

      {/* Footer */}
      <div style={{ position: "absolute", bottom: 24, fontSize: 12, color: "#5a5650", textAlign: "center" }}>
        Processed under GDPR · 90 day retention &nbsp;·&nbsp;
        <a href="/remove" style={{ color: "#5a5650" }}>Remove my data</a>
      </div>
    </div>
  );
}