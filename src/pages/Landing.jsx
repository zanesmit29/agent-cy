import { ArrowRight } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#faf9f7] flex flex-col">
      {/* Nav */}
      <header className="px-8 py-6 flex items-center justify-between border-b border-[#dbd4cc]">
        <span className="font-heading text-[#0f3b59] text-xl tracking-tight">Agent(cy)</span>
        <a
          href="/login"
          className="font-sans text-sm text-[#7d929e] hover:text-[#0f3b59] transition-colors"
        >
          Recruiter login →
        </a>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-3xl mx-auto">
        <p className="font-sans text-xs tracking-[0.2em] uppercase text-[#dba12c] mb-8">
          AI-Native Engineering Recruitment
        </p>

        <h1 className="font-heading text-[#0f3b59] text-5xl md:text-6xl lg:text-7xl leading-[1.05] mb-6 font-medium">
          We connect engineers<br />
          <em>to the right roles.</em>
        </h1>

        <p className="font-heading text-[#7d929e] text-xl md:text-2xl leading-relaxed mb-4 max-w-xl">
          Our AI does the groundwork.
        </p>

        <p className="font-sans text-[#7d929e] text-base leading-relaxed mb-12 max-w-lg">
          We look at real work, not CVs. If we reached out, a recruiter has reviewed your profile and wants to learn more.
        </p>

        <div className="flex flex-col items-center gap-3">
          <button
            className="group inline-flex items-center gap-3 bg-[#0f3b59] text-white font-sans text-sm px-8 py-4 hover:bg-[#0a2e45] transition-colors tracking-wide"
            style={{ letterSpacing: '0.04em' }}
          >
            Talk to our AI recruiter
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
          <p className="font-sans text-xs text-[#7d929e] max-w-xs text-center leading-relaxed">
            You'll speak with an AI assistant. A human recruiter reviews every profile.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-8 py-6 flex items-center justify-between border-t border-[#dbd4cc]">
        <span className="font-sans text-xs text-[#7d929e]">Built for EU AI Act compliance.</span>
        <span className="font-sans text-xs text-[#7d929e]">© 2026 Agent(cy)</span>
      </footer>
    </div>
  );
}