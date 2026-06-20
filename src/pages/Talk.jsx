import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Candidate, User } from "@/api/entities";
import { base44 } from "@/api/base44Client";

const pt = base44;
const SQUAD_ID = "c767d939-3822-495c-bbaf-f7c880b2d093";

const STATES = { IDLE: "idle", CONNECTING: "connecting", LIVE: "live", ENDED: "ended", ERROR: "error" };

export default function TalkPage() {
  const navigate = useNavigate();
  const [state, setState] = useState(STATES.IDLE);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [vapiReady, setVapiReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const vapiRef = useRef(null);
  const vapiKeyRef = useRef(null);
  const orbRef = useRef(null);
  const ring1Ref = useRef(null);
  const ring2Ref = useRef(null);
  const micStreamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const candidateIdRef = useRef(null);

  // Load Vapi public key
  useEffect(() => {
    pt.functions.invoke("getVapiPublicKey", {})
      .then(res => { vapiKeyRef.current = res.data.publicKey; setVapiReady(true); })
      .catch(() => { setErrorMsg("Failed to load configuration"); setState(STATES.ERROR); });
  }, []);

  // Match or create candidate on mount
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
      } catch(e) {
        console.warn("candidate match/create failed", e);
      }
    };
    run();
  }, []);

  // Orb animation
  useEffect(() => {
    let raf; let t = 0;
    const rgb = "219,161,44";
    const animate = () => {
      raf = requestAnimationFrame(animate); t += 0.02;
      const orb = orbRef.current, r1 = ring1Ref.current, r2 = ring2Ref.current;
      if (!orb) return;
      if (state === STATES.IDLE) {
        orb.style.transform = `scale(${0.85 + Math.sin(t * 0.6) * 0.08})`; orb.style.opacity = "0.45"; orb.style.boxShadow = `0 0 40px 8px rgba(${rgb},0.15)`;
        if (r1) r1.style.opacity = "0"; if (r2) r2.style.opacity = "0";
      } else if (state === STATES.CONNECTING) {
        orb.style.transform = `scale(${0.9 + Math.sin(t * 1.2) * 0.1})`; orb.style.opacity = "0.7"; orb.style.boxShadow = `0 0 60px 12px rgba(${rgb},0.25)`;
        if (r1) { r1.style.opacity = String(0.3 + Math.sin(t) * 0.2); r1.style.transform = `scale(${1.2 + Math.sin(t * 0.8) * 0.15})`; } if (r2) r2.style.opacity = "0";
      } else if (state === STATES.LIVE) {
        const spk = isSpeaking;
        orb.style.transform = `scale(${spk ? 1 + Math.sin(t * 3) * 0.12 : 0.95 + Math.sin(t * 1.5) * 0.05})`; orb.style.opacity = spk ? "1" : "0.75"; orb.style.boxShadow = spk ? `0 0 80px 20px rgba(${rgb},0.45)` : `0 0 50px 10px rgba(${rgb},0.25)`;
        const spd = spk ? 1.5 : 0.8;
        if (r1) { const p = (t * spd) % 1; r1.style.transform = `scale(${1.3 + p * 0.8})`; r1.style.opacity = String(Math.max(0, 0.5 - p * 0.5)); }
        if (r2) { const p = (t * spd + 0.5) % 1; r2.style.transform = `scale(${1.3 + p * 0.8})`; r2.style.opacity = String(Math.max(0, 0.5 - p * 0.5)); }
      } else {
        orb.style.transform = "scale(0.7)"; orb.style.opacity = "0.2"; orb.style.boxShadow = "none";
        if (r1) r1.style.opacity = "0"; if (r2) r2.style.opacity = "0";
      }
    };
    animate(); return () => cancelAnimationFrame(raf);
  }, [state, isSpeaking]);

  const startMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const ctx = new AudioContext(); audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser(); analyser.fftSize = 256;
      src.connect(analyser); analyserRef.current = analyser;
    } catch(e) { console.warn("Mic:", e); }
  };

  const stopMic = () => {
    micStreamRef.current?.getTracks().forEach(t => t.stop()); micStreamRef.current = null;
    audioCtxRef.current?.close(); audioCtxRef.current = null; analyserRef.current = null;
  };

  const initVapi = () => {
    if (vapiRef.current) return;
    const Vapi = window.Vapi;
    if (!Vapi) { console.error("Vapi not loaded"); return; }
    const vapi = new Vapi(vapiKeyRef.current);
    vapi.on("call-start", async () => { setState(STATES.LIVE); await startMic(); });
    vapi.on("speech-start", () => setIsSpeaking(true));
    vapi.on("speech-end", () => setIsSpeaking(false));
    vapi.on("call-end", () => { setState(STATES.ENDED); stopMic(); setTimeout(() => navigate("/candidate-dashboard"), 2500); });
    vapi.on("error", (err) => { console.error("Vapi error:", err); setErrorMsg(err?.message || JSON.stringify(err) || "Unknown error"); setState(STATES.ERROR); stopMic(); });
    vapiRef.current = vapi;
  };

  // Load Vapi SDK script
  useEffect(() => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/@vapi-ai/web@latest/dist/vapi.iife.js";
    s.async = true;
    document.head.appendChild(s);
    return () => { document.head.removeChild(s); };
  }, []);

  const handleStart = async () => {
    if (!vapiReady) return;
    try {
      initVapi();
      setState(STATES.CONNECTING);
      await vapiRef.current.start(undefined, undefined, SQUAD_ID);
    } catch (err) {
      console.error("Start failed:", err);
      setErrorMsg(err?.message || "Failed to start call");
      setState(STATES.ERROR);
    }
  };

  const handleEnd = async () => {
    // Capture call ID BEFORE stopping
    let callId = null;
    try { callId = vapiRef.current?.call?.id || null; } catch(e) {}

    // Stop call and clean up
    vapiRef.current?.stop();
    setState(STATES.ENDED);
    stopMic();

    // Persist call data and fetch transcript
    const cid = candidateIdRef.current;
    if (callId && cid) {
      try { await Candidate.update(cid, { vapi_call_id: callId }); } catch(e) {}
      fetch("/functions/fetchVapiTranscript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ call_id: callId, candidate_id: cid }),
      }).catch(() => {});
    }

    setTimeout(() => navigate("/candidate-dashboard"), 2500);
  };

  const handleReset = () => { vapiRef.current = null; setErrorMsg(""); setState(STATES.IDLE); };

  return (
    <div className="min-h-screen bg-[#0a0e13] text-white flex flex-col items-center justify-center px-5 py-6 relative">
      <header className="absolute top-0 left-0 right-0 px-8 py-6 flex items-center justify-between border-b border-white/10">
        <span className="font-heading text-xl tracking-tight">
          <span className="text-white">Agent</span><span className="text-[#dba12c]">(cy)</span>
        </span>
        <a href="/" className="font-sans text-sm text-white/40 hover:text-white/80 transition-colors">← Back</a>
      </header>

      <div className="relative w-40 h-40 flex items-center justify-center mb-14 mt-16">
        <div ref={ring1Ref} className="absolute w-40 h-40 rounded-full border border-[#dba12c] opacity-0" />
        <div ref={ring2Ref} className="absolute w-40 h-40 rounded-full border border-[#dba12c] opacity-0" />
        <div ref={orbRef} className="w-24 h-24 rounded-full transition-opacity duration-300" style={{ background: "radial-gradient(circle at 35% 35%, #ecd89b, #dba12c 45%, #8b6914)" }} />
      </div>

      <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl leading-tight text-center mb-5 font-medium">
        {state === STATES.IDLE && "Tell us who you are."}
        {state === STATES.CONNECTING && <em className="text-white/40">Connecting...</em>}
        {state === STATES.LIVE && (isSpeaking ? "Agent speaking." : "Listening.")}
        {state === STATES.ENDED && "Conversation complete."}
        {state === STATES.ERROR && "Something went wrong."}
      </h1>

      {state === STATES.IDLE && (
        <p className="font-sans text-base text-white/50 max-w-md text-center leading-relaxed mb-12">
          We find engineers from their real work — commits, models, contributions. Whether we reached out or you found us, you're in the right place. No CVs. Just what you've actually built.
        </p>
      )}
      {state === STATES.LIVE && <p className="font-sans text-sm text-white/40 mb-12">You'll speak with an AI assistant. A human recruiter reviews every profile.</p>}
      {state === STATES.ENDED && <p className="font-sans text-sm text-white/50 max-w-sm text-center leading-relaxed mb-12">A recruiter on our team will review your profile within 48 hours.</p>}
      {state === STATES.ERROR && (
        <>
          <p className="font-sans text-sm text-red-400/80 text-center mb-3">The call couldn't connect. Please try again or email hello@agentcy.io</p>
          {errorMsg && <p className="font-mono text-xs text-red-400/40 text-center max-w-lg mb-9 break-all">{errorMsg}</p>}
        </>
      )}
      {state === STATES.CONNECTING && <div className="mb-12" />}

      {(state === STATES.IDLE || state === STATES.ERROR) && (
        <button onClick={handleStart} disabled={!vapiReady}
          className={`font-sans text-sm rounded-full px-10 py-4 border transition-colors ${vapiReady ? "border-white/60 text-white hover:border-[#dba12c] hover:text-[#dba12c] cursor-pointer" : "border-white/10 text-white/20 cursor-not-allowed"}`}>
          Start conversation →
        </button>
      )}
      {state === STATES.CONNECTING && (
        <button disabled className="font-sans text-sm rounded-full px-10 py-4 border border-white/10 text-white/20 cursor-not-allowed">
          Connecting...
        </button>
      )}
      {state === STATES.LIVE && (
        <button onClick={handleEnd}
          className="font-sans text-sm rounded-full px-9 py-3.5 border border-white/10 text-white/40 hover:border-white/25 hover:text-white/60 transition-colors cursor-pointer">
          End conversation
        </button>
      )}

      <footer className="absolute bottom-6 font-sans text-xs text-white/20 text-center">
        Processed under GDPR · 90 day retention ·{" "}
        <a href="mailto:privacy@agentcy.io" className="underline underline-offset-2">Remove my data</a>
      </footer>
    </div>
  );
}