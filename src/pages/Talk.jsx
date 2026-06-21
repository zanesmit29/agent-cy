import { useEffect, useRef, useState } from "react";
import Vapi from "@vapi-ai/web";
import { base44 } from "@/api/base44Client";

const SQUAD_ID = "c767d939-3822-495c-bbaf-f7c880b2d093";

const STATES = { IDLE: "idle", CONNECTING: "connecting", LIVE: "live", ENDED: "ended", ERROR: "error" };

export default function TalkPage() {
  const [state, setState] = useState(STATES.IDLE);
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [vapiReady, setVapiReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const vapiRef = useRef(null);
  const candidateIdRef = useRef(null);
  const candidateReadyRef = useRef(false);
  const apiKeyRef = useRef(null);
  const orbRef = useRef(null);
  const ring1Ref = useRef(null);
  const ring2Ref = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    base44.functions.invoke("getVapiPublicKey", {})
      .then((res) => { apiKeyRef.current = res.data.publicKey; setVapiReady(true); })
      .catch(() => { setErrorMessage("Failed to load Vapi configuration"); setState(STATES.ERROR); });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const user = await base44.auth.me();
        if (!user) return;
        const email = user.email;
        const fullName = user.full_name || "";

        const existing = await base44.entities.Candidate.filter({ email }, null, 1);
        if (existing.length > 0) {
          candidateIdRef.current = existing[0].id;
        } else {
          const created = await base44.entities.Candidate.create({
            name: fullName || email,
            email,
            current_stage: "Discovered",
            discovered_via: "self-registered",
          });
          candidateIdRef.current = created.id;
        }
        candidateReadyRef.current = true;
      } catch (e) {
        console.warn("Candidate lookup failed:", e);
      }
    })();
  }, []);

  useEffect(() => {
    let frame;
    let t = 0;
    const gold = "219,161,44";
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
        orb.style.boxShadow = `0 0 40px 8px rgba(${gold},0.15)`;
        if (ring1) ring1.style.opacity = "0";
        if (ring2) ring2.style.opacity = "0";
      } else if (state === STATES.CONNECTING) {
        orb.style.transform = `scale(${0.9 + Math.sin(t * 1.2) * 0.1})`;
        orb.style.opacity = "0.7";
        orb.style.boxShadow = `0 0 60px 12px rgba(${gold},0.25)`;
        if (ring1) { ring1.style.opacity = String(0.3 + Math.sin(t) * 0.2); ring1.style.transform = `scale(${1.2 + Math.sin(t * 0.8) * 0.15})`; }
        if (ring2) ring2.style.opacity = "0";
      } else if (state === STATES.LIVE) {
        const fast = agentSpeaking;
        orb.style.transform = `scale(${fast ? 1 + Math.sin(t * 3) * 0.12 : 0.95 + Math.sin(t * 1.5) * 0.05})`;
        orb.style.opacity = fast ? "1" : "0.75";
        orb.style.boxShadow = fast ? `0 0 80px 20px rgba(${gold},0.45)` : `0 0 50px 10px rgba(${gold},0.25)`;
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
    } catch (e) { console.warn("Mic:", e); }
  };

  const cleanup = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
    analyserRef.current = null;
  };

  const initVapi = () => {
    if (vapiRef.current) return;
    const vapi = new Vapi(apiKeyRef.current);
    vapi.on("call-start", async () => { setState(STATES.LIVE); await startMicAnalyser(); });
    vapi.on("speech-start", () => setAgentSpeaking(true));
    vapi.on("speech-end", () => setAgentSpeaking(false));
    vapi.on("call-end", async () => {
      setState(STATES.ENDED);
      cleanup();
      const cid = candidateIdRef.current;
      if (cid) {
        base44.functions.invoke("fetchVapiTranscript", { candidate_id: cid }).catch(() => {});
      }
      setTimeout(() => { window.location.href = "/candidate-dashboard"; }, 2500);
    });
    vapi.on("error", (e) => {
      console.error("Vapi error:", e);
      setErrorMessage(e?.message || e?.error?.message || JSON.stringify(e) || "Unknown error");
      setState(STATES.ERROR);
      cleanup();
    });
    vapiRef.current = vapi;
  };

  const handleStart = () => {
    if (!vapiReady) return;
    initVapi();
    setState(STATES.CONNECTING);
    vapiRef.current.start(undefined, undefined, SQUAD_ID);
  };

  const handleEnd = () => vapiRef.current?.stop();
  const handleRestart = () => { vapiRef.current = null; setErrorMessage(""); setState(STATES.IDLE); };

  return (
    <div className="min-h-screen bg-[#0a0e13] text-white flex flex-col items-center justify-center px-5 py-6 relative">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 px-8 py-6 flex items-center justify-between border-b border-white/10">
        <span className="font-heading text-xl tracking-tight">
          <span className="text-white">Agent</span><span className="text-[#dba12c]">(cy)</span>
        </span>
        <a href="/" className="font-sans text-sm text-white/40 hover:text-white/80 transition-colors">
          ← Back
        </a>
      </header>

      {/* Orb */}
      <div className="relative w-40 h-40 flex items-center justify-center mb-14 mt-16">
        <div ref={ring1Ref} className="absolute w-40 h-40 rounded-full border border-[#dba12c] opacity-0" />
        <div ref={ring2Ref} className="absolute w-40 h-40 rounded-full border border-[#dba12c] opacity-0" />
        <div
          ref={orbRef}
          className="w-24 h-24 rounded-full transition-opacity duration-300"
          style={{ background: "radial-gradient(circle at 35% 35%, #ecd89b, #dba12c 45%, #8b6914)" }}
        />
      </div>

      {/* Heading */}
      <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl leading-tight text-center mb-5 font-medium">
        {state === STATES.IDLE && (<span>Tell us who you are<br />and what you've built.</span>)}
        {state === STATES.CONNECTING && <em className="text-white/40">Connecting...</em>}
        {state === STATES.LIVE && (agentSpeaking ? "Agent speaking." : "Listening.")}
        {state === STATES.ENDED && "Conversation complete."}
        {state === STATES.ERROR && "Something went wrong."}
      </h1>

      {/* Subtext */}
      {state === STATES.IDLE && (
        <p className="font-sans text-base text-white/50 max-w-md text-center leading-relaxed mb-12">
          Whether Agent(cy) found you through GitHub or Hugging Face, or you found us yourself, this is where you can talk through your work in a guided voice conversation. A human recruiter will review the result.
        </p>
      )}
      {state === STATES.LIVE && (
        <p className="font-sans text-sm text-white/40 mb-12">
          You'll speak with an AI assistant. A human recruiter reviews every profile.
        </p>
      )}
      {state === STATES.ENDED && (
        <p className="font-sans text-sm text-white/50 max-w-sm text-center leading-relaxed mb-12">
          A recruiter on our team will review your profile within 48 hours.
        </p>
      )}
      {state === STATES.ERROR && (
        <>
          <p className="font-sans text-sm text-red-400/80 text-center mb-3">
            The call couldn't connect. Please try again or email hello@agentcy.io
          </p>
          {errorMessage && (
            <p className="font-mono text-xs text-red-400/40 text-center max-w-lg mb-9 break-all">
              {errorMessage}
            </p>
          )}
        </>
      )}
      {state === STATES.CONNECTING && <div className="mb-12" />}

      {/* Buttons */}
      {(state === STATES.IDLE || state === STATES.ERROR) && (
        <button
          onClick={handleStart}
          disabled={!vapiReady}
          className={`font-sans text-sm rounded-full px-10 py-4 border transition-colors ${
            vapiReady
              ? "border-white/60 text-white hover:border-[#dba12c] hover:text-[#dba12c] cursor-pointer"
              : "border-white/10 text-white/20 cursor-not-allowed"
          }`}
        >
          Start conversation →
        </button>
      )}
      {state === STATES.CONNECTING && (
        <button disabled className="font-sans text-sm rounded-full px-10 py-4 border border-white/10 text-white/20 cursor-not-allowed">
          Connecting...
        </button>
      )}
      {state === STATES.LIVE && (
        <button
          onClick={handleEnd}
          className="font-sans text-sm rounded-full px-9 py-3.5 border border-white/10 text-white/40 hover:border-white/25 hover:text-white/60 transition-colors cursor-pointer"
        >
          End conversation
        </button>
      )}
      {state === STATES.ENDED && (
        <button
          onClick={handleRestart}
          className="font-sans text-sm rounded-full px-9 py-3.5 border border-white/10 text-white/40 hover:border-white/25 hover:text-white/60 transition-colors cursor-pointer"
        >
          Start again
        </button>
      )}

      {/* Footer */}
      <footer className="absolute bottom-6 flex gap-5 flex-wrap justify-center font-sans text-xs text-white/20">
        <span>Processed under GDPR · 90 day retention</span>
        <a href="mailto:privacy@agentcy.io" className="underline hover:text-white/40 transition-colors">
          Remove my data
        </a>
      </footer>
    </div>
  );
}