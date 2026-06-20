import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import GoogleIcon from "@/components/GoogleIcon";

export default function Home() {
  const handleRecruiterLogin = () => {
    base44.auth.loginWithProvider("google", "/dashboard");
  };

  const handleCandidateLogin = () => {
    base44.auth.loginWithProvider("google", "/talk");
  };

  return (
    <div className="min-h-screen bg-[#0a0e13] flex flex-col text-white">
      {/* Nav */}
      <header className="px-8 py-6 flex items-center justify-between border-b border-white/10">
        <span className="font-heading text-xl tracking-tight"><span className="text-white [font-family:'EB_Garamond',_Garamond,_Georgia,_serif] font-normal">Agent</span><span className="text-[#dba12c] [font-family:'EB_Garamond',_Garamond,_Georgia,_serif] font-normal">(cy)</span></span>
        




        
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 my-1">
        

        

        <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl leading-[1.05] font-medium max-w-3xl mb-12 mt-12">We connect engineers to the right roles. Our AI does the groundwork.


        </h1>

        <div className="w-full max-w-[800px] mb-10 mx-auto" style={{ borderRadius: "8px", overflow: "hidden" }}>
          <video
            width="100%"
            style={{ aspectRatio: "16/9", display: "block" }}
            controls
            playsInline>
            
            <source src="https://base44.app/api/apps/6a343189bec08d927de377d0/files/mp/public/6a343189bec08d927de377d0/5a3eeabd7_agentcy_intro.mp4" type="video/mp4" />
          </video>
          
        </div>

        

        

        {/* Login Section */}
        <div className="w-full max-w-xl mx-auto flex items-stretch gap-0 border border-white/10 rounded-sm overflow-hidden mb-6">
          {/* Recruiter Login */}
          <div className="flex-1 flex flex-col items-center px-6 py-8">
            <p className="font-sans text-xs text-white/40 uppercase tracking-wider mb-4">Recruiter Login</p>
            <Button
              variant="outline"
              className="w-full h-12 text-sm font-sans font-medium bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white rounded-sm"
              onClick={handleRecruiterLogin}>
              
              <GoogleIcon className="w-5 h-5 mr-2" />
              Continue with Google
            </Button>
          </div>

          {/* Divider */}
          <div className="w-px bg-white/10 flex-shrink-0" />

          {/* Candidate Login */}
          <div className="flex-1 flex flex-col items-center px-6 py-8">
            <p className="font-sans text-xs text-white/40 uppercase tracking-wider mb-4">Candidate Login</p>
            <Button
              variant="outline"
              className="w-full h-12 text-sm font-sans font-medium bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white rounded-sm"
              onClick={handleCandidateLogin}>
              
              <GoogleIcon className="w-5 h-5 mr-2" />
              Continue with Google
            </Button>
          </div>
        </div>
      </main>

      {/* Footer — GDPR Art. 13/14 */}
      <footer className="px-8 py-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 my-6">
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