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
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 my-1">
        

        

        <h1 className="font-heading text-white text-5xl md:text-6xl lg:text-7xl leading-[1.05] mb-6 font-medium max-w-3xl mt-10">We connect engineers to the right roles. Our AI does the groundwork.


        </h1>

        <div className="w-full max-w-[800px] mb-10 mx-auto" style={{ borderRadius: "8px", overflow: "hidden" }}>
          <iframe
            width="100%"
            style={{ aspectRatio: "16/9", display: "block", border: "none" }}
            src="https://www.youtube.com/embed/ekJhgic6ll4?modestbranding=1&rel=0&showinfo=0"
            title="Agent(cy) intro"
            allowFullScreen />
          
        </div>

        

        

        <div className="flex flex-col items-center gap-4">
          

          
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