import { useState } from "react";
import { base44 } from "@/api/base44Client";

export default function DiscoverPanel({ onSuccess }) {
  const [githubUrl, setGithubUrl] = useState("");
  const [hfUrl, setHfUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { type: 'success'|'warning'|'error', message: string }

  const handleDiscover = async () => {
    setResult(null);
    setLoading(true);

    try {
      if (!githubUrl && !hfUrl) {
        setResult({ type: "error", message: "Please provide at least a GitHub or HuggingFace URL." });
        setLoading(false);
        return;
      }

      if (githubUrl) {
        const username = githubUrl.replace(/https?:\/\/github\.com\//i, "").replace(/\/$/, "").trim();
        if (!username) {
          setResult({ type: "error", message: "Invalid GitHub URL." });
          setLoading(false);
          return;
        }

        const res = await base44.functions.invoke("collectGitHubEvidence", { username });
        const data = res.data;

        if (data?.candidate_created) {
          setResult({ type: "success", message: "Candidate added to Discovered ✓" });
          onSuccess?.();
        } else if (data?.reason?.includes("No contact path")) {
          setResult({ type: "warning", message: "No contact path found on this profile. Candidate not added." });
        } else if (data?.reason?.includes("already exists")) {
          setResult({ type: "warning", message: `Candidate already exists in the pipeline.` });
        } else {
          setResult({ type: "error", message: data?.reason ?? data?.error ?? "Unknown error." });
        }
      } else {
        // HuggingFace-only: no backend function for manual HF discovery yet
        setResult({ type: "warning", message: "HuggingFace-only discovery is handled by the automated search. Please provide a GitHub URL." });
      }
    } catch (err) {
      setResult({ type: "error", message: err?.response?.data?.error ?? err?.message ?? "Request failed." });
    } finally {
      setLoading(false);
    }
  };

  const bannerStyles = {
    success: "bg-green-500/15 border border-green-500/30 text-green-400",
    warning: "bg-amber-500/15 border border-amber-500/30 text-amber-400",
    error: "bg-red-500/15 border border-red-500/30 text-red-400",
  };

  return (
    <div className="px-8 pt-6 pb-4">
      <div className="bg-white/5 border border-white/10 rounded-sm px-4 py-3">
        <p className="font-sans text-xs text-white/40 uppercase tracking-wider mb-3">Discover a Candidate</p>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            placeholder="https://github.com/username"
            className="flex-1 bg-white/5 border border-white/15 rounded-sm px-3 py-2 font-sans text-xs text-white placeholder-white/25 focus:outline-none focus:border-white/30 transition-colors"
          />
          <input
            type="text"
            value={hfUrl}
            onChange={(e) => setHfUrl(e.target.value)}
            placeholder="https://huggingface.co/username"
            className="flex-1 bg-white/5 border border-white/15 rounded-sm px-3 py-2 font-sans text-xs text-white placeholder-white/25 focus:outline-none focus:border-white/30 transition-colors"
          />
          <button
            onClick={handleDiscover}
            disabled={loading}
            className="flex-shrink-0 bg-[#dba12c] hover:bg-[#c8912a] disabled:opacity-50 disabled:cursor-not-allowed text-[#0a0e13] font-sans text-xs font-medium px-4 py-2 rounded-sm transition-colors"
          >
            {loading ? "Discovering…" : "Discover"}
          </button>
        </div>

        {result && (
          <div className={`mt-3 px-3 py-2 rounded-sm font-sans text-xs ${bannerStyles[result.type]}`}>
            {result.message}
          </div>
        )}
      </div>
    </div>
  );
}