import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import KanbanColumn from "@/components/dashboard/KanbanColumn";
import CandidateDetailModal from "@/components/dashboard/CandidateDetailModal";

const STAGES = [
  "Discovered",
  "Pending Review",
  "Outreach Approved",
  "Intake Done",
  "Match Packet Ready",
  "Interview Scheduled",
];

const SOURCE_OPTIONS = ["All", "GitHub", "HuggingFace", "Discord", "LinkedIn"];

export default function Dashboard() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState("All");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    base44.entities.Candidate.list("-created_date", 500).then((data) => {
      setCandidates(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, []);

  const filtered = sourceFilter === "All"
    ? candidates
    : candidates.filter((c) => c.discovered_via === sourceFilter);

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
          <span className="font-sans text-xs text-white/40 tracking-wide uppercase">Recruiter Dashboard</span>
        </div>
      </header>

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
                onCardClick={setSelected}
              />
            ))}
          </div>
        )}
      </main>

      <CandidateDetailModal candidate={selected} onClose={() => setSelected(null)} />
    </div>
  );
}