import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import KanbanColumn from "@/components/dashboard/KanbanColumn";
import CandidateDetailModal from "@/components/dashboard/CandidateDetailModal";
import DiscoverPanel from "@/components/dashboard/DiscoverPanel";
import PendingReviewCard from "@/components/dashboard/PendingReviewCard";

const STAGES = [
  "Discovered",
  "Pending Review",
  "Outreach Approved",
  "Intake Done",
  "Match Packet Ready",
  "Interview Scheduled",
  "Opted Out",
];

const SOURCE_OPTIONS = ["All", "GitHub", "HuggingFace"];

export default function Dashboard() {
  const [allCandidates, setAllCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState("All");
  const [selected, setSelected] = useState(null);
  const [generatingDrafts, setGeneratingDrafts] = useState(false);
  const [draftResult, setDraftResult] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const PAGE = 500;
    let skip = 0;
    let results = [];
    while (true) {
      const page = await base44.entities.Candidate.list("-created_date", PAGE, skip);
      if (!Array.isArray(page) || page.length === 0) break;
      results = results.concat(page);
      if (page.length < PAGE) break;
      skip += PAGE;
    }
    setAllCandidates(results);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleGenerateDrafts = useCallback(async () => {
    setGeneratingDrafts(true);
    setDraftResult(null);
    try {
      const res = await base44.functions.invoke("generateOutreachDraft", {});
      const data = res.data;
      const generated = data.drafts_generated ?? 0;
      const skipped = data.skipped_no_evidence ?? 0;
      const remaining = data.remaining_in_queue ?? 0;
      let msg = `✅ ${generated} draft${generated !== 1 ? "s" : ""} generated`;
      if (skipped > 0) msg += `, ${skipped} skipped`;
      if (remaining > 0) msg += `, ${remaining} remaining — press again to continue.`;
      else msg += " — queue complete.";
      setDraftResult({ type: remaining > 0 ? "warning" : "success", message: msg });
      fetchAll();
    } catch (err) {
      setDraftResult({ type: "error", message: err?.response?.data?.error ?? err?.message ?? "Failed to generate drafts." });
    } finally {
      setGeneratingDrafts(false);
    }
  }, [fetchAll]);

  const filtered = sourceFilter === "All"
    ? allCandidates
    : allCandidates.filter((c) => c.discovered_via === sourceFilter);

  const byStage = (stage) => filtered.filter((c) => c.current_stage === stage);

  return (
    <div className="min-h-screen bg-[#0a0e13] flex flex-col text-white">
      {/* Top bar */}
      <header className="px-8 py-5 flex items-center justify-between border-b border-white/10">
        <span className="font-heading text-xl tracking-tight">
          <span className="text-white">Agent</span><span className="text-[#dba12c]">(cy)</span>
        </span>
        <div className="flex items-center gap-4">
          {/* Source filter */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-sm px-1 py-1">
            {SOURCE_OPTIONS.map((src) => (
              <button
                key={src}
                onClick={() => setSourceFilter(src)}
                className={`font-sans text-xs px-3 py-1 rounded-sm transition-colors ${
                  sourceFilter === src
                    ? "bg-white/15 text-white"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                {src}
              </button>
            ))}
          </div>
          <span className="font-sans text-xs text-white/40 tracking-wide uppercase">
            {loading ? "Loading…" : `${filtered.length} / ${allCandidates.length} candidates`}
          </span>
          <button
            onClick={handleGenerateDrafts}
            disabled={generatingDrafts}
            className="flex items-center gap-2 bg-[#dba12c] hover:bg-[#c8912a] disabled:opacity-50 disabled:cursor-not-allowed text-[#0a0e13] font-sans text-xs font-semibold px-4 py-2 rounded-sm transition-colors"
          >
            {generatingDrafts ? (
              <><span className="w-3 h-3 border-2 border-[#0a0e13]/30 border-t-[#0a0e13] rounded-full animate-spin" /> Generating…</>
            ) : (
              "⚡ Generate Outreach Drafts"
            )}
          </button>
        </div>
      </header>

      {draftResult && (
        <div className={`mx-8 mt-4 px-4 py-2.5 rounded-sm font-sans text-xs border ${
          draftResult.type === "success"
            ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
            : draftResult.type === "warning"
            ? "bg-amber-500/10 border-amber-500/25 text-amber-400"
            : "bg-red-500/10 border-red-500/25 text-red-400"
        }`}>
          {draftResult.message}
        </div>
      )}

      <DiscoverPanel onSuccess={fetchAll} />

      {/* Kanban */}
      <main className="flex-1 overflow-x-auto px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex gap-4 min-w-max h-full">
            {STAGES.map((stage) => (
              <KanbanColumn
                key={stage}
                title={stage}
                candidates={byStage(stage)}
                onCardClick={stage === "Pending Review" ? undefined : setSelected}
                renderCard={stage === "Pending Review"
                  ? (c) => <PendingReviewCard key={c.id} candidate={c} onUpdate={fetchAll} />
                  : undefined
                }
              />
            ))}
          </div>
        )}
      </main>

      <CandidateDetailModal candidate={selected} onClose={() => setSelected(null)} />
    </div>
  );
}