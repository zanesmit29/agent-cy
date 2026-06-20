export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0e13] flex flex-col text-white">
      {/* Nav */}
      <header className="px-8 py-6 flex items-center justify-between border-b border-white/10">
        <span className="font-heading text-xl tracking-tight"><span className="text-white [font-family:'EB_Garamond',_Garamond,_Georgia,_serif] font-normal">Agent</span><span className="text-[#dba12c] [font-family:'EB_Garamond',_Garamond,_Georgia,_serif] font-normal">(cy)</span></span>
        <a
          href="/login"
          className="font-sans text-sm text-white/40 hover:text-white/80 transition-colors">
          
          Recruiter login →
        </a>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <p className="font-sans text-xs tracking-[0.2em] uppercase text-[#dba12c] mb-10">
          AI-Native Engineering Recruitment
        </p>

        <h1 className="font-heading text-white text-5xl md:text-6xl lg:text-7xl leading-[1.05] mb-6 font-medium max-w-3xl">
          We connect engineers to the right roles.{" "}
          <em className="text-white/55">Our AI does the groundwork.</em>
        </h1>

        <div className="w-full max-w-[800px] mb-10">
          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
            <iframe
              className="absolute inset-0 w-full h-full rounded-lg"
              src="https://www.youtube.com/embed/ekJhgic6ll4"
              title="Agent(cy) intro"
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ border: "none" }}
            />
          </div>
        </div>

        <p className="font-sans text-white/50 text-base md:text-lg leading-relaxed mb-14 max-w-lg">
          We look at real work, not CVs. If we reached out, a recruiter has reviewed your profile and wants to learn more.
        </p>

        <div className="flex flex-col items-center gap-4">
          <p className="font-sans text-base text-white/50 max-w-xs text-center leading-relaxed">
            A human recruiter reviews every profile we discover.
          </p>
        </div>
      </main>

      {/* Footer — GDPR Art. 13/14 */}
      <footer className="px-8 py-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="font-sans text-xs text-white/35 text-center sm:text-left max-w-xl leading-relaxed">
          Agent(cy) uses AI to discover candidates and prepare evidence. All hiring decisions are made by human recruiters. Data controller: Agent(cy) —{" "}
          <a href="mailto:privacy@agentcy.io" className="underline hover:text-white/60 transition-colors">
            privacy@agentcy.io
          </a>
        </p>
        <a
          href="mailto:privacy@agentcy.io"
          className="font-sans text-xs text-white/35 underline hover:text-white/60 transition-colors whitespace-nowrap">
          
          Remove my data
        </a>
      </footer>
    </div>);

}