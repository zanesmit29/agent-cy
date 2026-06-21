import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import GoogleIcon from "@/components/GoogleIcon";
import { Search, User, Shield, Users } from "lucide-react";

export default function Home() {
  const handleRecruiterLogin = () => {
    base44.auth.loginWithProvider("google", "/dashboard");
  };

  const handleCandidateLogin = () => {
    base44.auth.loginWithProvider("google", "/talk");
  };

  return (
    <div className="min-h-screen bg-[#0a0d10] flex flex-col text-[#f5f0e8]">
      {/* Nav */}
      <header className="px-6 md:px-10 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-white/[0.07] gap-3 sm:gap-0">
        <span className="font-heading text-xl tracking-tight">
          <span className="text-[#f5f0e8]">Agent</span>
          <span className="text-[#dba12c]">(cy)</span>
        </span>

        <div
          className="flex items-center gap-3 whitespace-nowrap self-end sm:self-auto"
          style={{ background: "#ede9e0", borderRadius: "8px", padding: "10px 20px", border: "1px solid #ede9e0" }}
        >
          <span className="font-sans text-[13px] text-[#333] tracking-[0.3px] font-light">
            powered by
          </span>
          <img
            src="https://base44.app/api/apps/6a343189bec08d927de377d0/files/mp/public/6a343189bec08d927de377d0/1ee3e2911_base44_logo_clean.svg"
            alt="Base44"
            className="h-9 w-auto"
          />
          <span className="text-[#999] text-sm">·</span>
          <img
            src="https://base44.app/api/apps/6a343189bec08d927de377d0/files/mp/public/6a343189bec08d927de377d0/57b018885_vapi_logo.svg"
            alt="Vapi"
            className="h-9 w-auto"
          />
          <span className="text-[#999] text-sm">·</span>
          <img
            src="https://base44.app/api/apps/6a343189bec08d927de377d0/files/mp/public/6a343189bec08d927de377d0/cfaaaa044_pixverse_logo.svg"
            alt="PixVerse"
            className="h-9 w-auto"
          />
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-6 pt-24 md:pt-32 pb-16 md:pb-20">
        <h1 className="font-heading text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[1.08] font-medium max-w-4xl tracking-tight">
          The first AI‑native recruitment agency in Europe.
        </h1>

        <p className="font-sans text-base sm:text-lg text-white/50 max-w-2xl mt-8 leading-relaxed font-light">
          Agent(cy) helps companies find better candidates faster, and helps candidates showcase their
          work — whether we discover them through GitHub and Hugging Face or they discover Agent(cy)
          and use it as their showcase.
        </p>

        <p className="font-heading text-base sm:text-lg text-[#dba12c]/60 mt-6">
          Built from day one for the EU AI Act.
        </p>
      </section>

      {/* Video */}
      <section className="px-6 md:px-10 pb-20 md:pb-24 max-w-4xl mx-auto w-full">
        <div className="mb-5 text-center">
          <p className="font-sans text-[11px] uppercase tracking-[0.2em] text-white/25 mb-2">
            Watch the video
          </p>
        </div>
        <div
          className="overflow-hidden border border-white/[0.08]"
          style={{ borderRadius: "12px" }}
        >
          <video
            width="100%"
            style={{ aspectRatio: "16/9", display: "block" }}
            controls
            playsInline
          >
            <source
              src="https://base44.app/api/apps/6a343189bec08d927de377d0/files/mp/public/6a343189bec08d927de377d0/f112b5e05_agentcy_intro_new.mp4"
              type="video/mp4"
            />
          </video>
        </div>
        <p className="font-sans text-sm text-white/30 text-center mt-5 max-w-xl mx-auto leading-relaxed font-light">
          See how Agent(cy) works when candidates are discovered through GitHub and Hugging Face
          or come to us directly to showcase their work.
        </p>
      </section>

      {/* Two-way explanation */}
      <section className="px-6 md:px-10 pb-20 md:pb-24 max-w-4xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/[0.06] rounded-sm overflow-hidden">
          {/* Left: We find you */}
          <div className="bg-[#0a0d10] px-8 md:px-10 py-10 md:py-12 flex flex-col items-center text-center">
            <Search className="w-6 h-6 text-[#dba12c]/50 mb-6" strokeWidth={1.5} />
            <h3 className="font-heading text-2xl text-[#f5f0e8] font-medium mb-3">
              We find you
            </h3>
            <p className="font-sans text-sm text-white/40 leading-relaxed font-light max-w-xs">
              Agent(cy) searches GitHub and Hugging Face for public work evidence and surfaces
              strong candidates to our team.
            </p>
          </div>

          {/* Right: You find us */}
          <div className="bg-[#0a0d10] px-8 md:px-10 py-10 md:py-12 flex flex-col items-center text-center">
            <User className="w-6 h-6 text-[#dba12c]/50 mb-6" strokeWidth={1.5} />
            <h3 className="font-heading text-2xl text-[#f5f0e8] font-medium mb-3">
              You find us
            </h3>
            <p className="font-sans text-sm text-white/40 leading-relaxed font-light max-w-xs">
              Candidates can discover Agent(cy) themselves and use it as a showcase to present
              their work through a guided voice experience.
            </p>
          </div>
        </div>
      </section>

      {/* Login cards */}
      <section className="px-6 md:px-10 pb-20 md:pb-24 max-w-2xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/[0.06] rounded-sm overflow-hidden">
          {/* Left: Recruiter */}
          <div className="bg-[#0a0d10] px-8 py-10 flex flex-col items-center text-center">
            <Shield className="w-6 h-6 text-[#dba12c]/40 mb-5" strokeWidth={1.5} />
            <h3 className="font-heading text-xl text-[#f5f0e8] font-medium mb-1">
              For our Agent(cy) team
            </h3>
            <p className="font-sans text-xs text-white/35 mb-6 font-light">
              Internal recruiter login for the people running Agent(cy)
            </p>
            <Button
              variant="outline"
              className="w-full h-11 text-sm font-sans font-normal bg-transparent border-white/[0.12] text-[#f5f0e8]/70 hover:bg-white/[0.04] hover:text-[#f5f0e8] rounded-sm"
              onClick={handleRecruiterLogin}
            >
              <GoogleIcon className="w-4 h-4 mr-2" />
              Continue with Google
            </Button>
          </div>

          {/* Right: Candidate */}
          <div className="bg-[#0a0d10] px-8 py-10 flex flex-col items-center text-center">
            <Users className="w-6 h-6 text-[#dba12c]/40 mb-5" strokeWidth={1.5} />
            <h3 className="font-heading text-xl text-[#f5f0e8] font-medium mb-1">
              For candidates
            </h3>
            <p className="font-sans text-xs text-white/35 mb-6 font-light">
              Log in to showcase your work or continue your voice conversation
            </p>
            <Button
              variant="outline"
              className="w-full h-11 text-sm font-sans font-normal bg-transparent border-white/[0.12] text-[#f5f0e8]/70 hover:bg-white/[0.04] hover:text-[#f5f0e8] rounded-sm"
              onClick={handleCandidateLogin}
            >
              <GoogleIcon className="w-4 h-4 mr-2" />
              Continue with Google
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 md:px-10 py-8 border-t border-white/[0.07] flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="font-sans text-xs text-white/25 text-center sm:text-left max-w-xl leading-relaxed font-light">
          Agent(cy) uses AI to discover candidates and prepare evidence. All hiring decisions are
          made by human recruiters. Data controller: Agent(cy) —{" "}
          <a href="mailto:privacy@agentcy.io" className="underline hover:text-white/45 transition-colors">
            privacy@agentcy.io
          </a>
        </p>
        <a
          href="mailto:privacy@agentcy.io"
          className="font-sans text-xs text-white/25 underline hover:text-white/45 transition-colors whitespace-nowrap"
        >
          Remove my data
        </a>
      </footer>
    </div>
  );
}