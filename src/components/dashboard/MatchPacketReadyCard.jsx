import { useState } from "react";
import { CalendarCheck, Pause } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function MatchPacketReadyCard({ candidate, onUpdate, onClick }) {
  const [saving, setSaving] = useState(null);
  const source = (candidate.discovered_via || "Unknown") === "self-registered" ? "Self-Registered" : (candidate.discovered_via || "Unknown");

  const handleSchedule = async (e) => {
    e.stopPropagation();
    setSaving("schedule");
    await base44.entities.Candidate.update(candidate.id, {
      current_stage: "Interview Scheduled",
    });
    setSaving(null);
    onUpdate?.();
  };

  const handleHold = (e) => {
    e.stopPropagation();
    // Placeholder for future functionality
  };

  return (
    <div
      onClick={() => onClick?.(candidate)}
      className="bg-white/5 border border-white/10 rounded-sm cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all"
    >
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <p className="font-sans text-sm text-white font-medium truncate">{candidate.name}</p>
          <span className="font-sans text-xs px-2 py-0.5 rounded-sm bg-[#dba12c]/10 text-[#dba12c] flex-shrink-0">{source}</span>
        </div>
        {candidate.email && (
          <p className="font-sans text-xs text-white/35 mt-1 truncate">{candidate.email}</p>
        )}
      </div>

      <div className="px-3 pb-3 flex items-center justify-end gap-1.5">
        <button
          onClick={handleSchedule}
          disabled={!!saving}
          title="Schedule Interview"
          className="w-7 h-7 rounded-[10px] flex items-center justify-center text-white text-sm transition-all duration-150 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(180deg, #4ade80 0%, #16a34a 100%)",
            boxShadow: "0 4px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)",
          }}
        >
          {saving === "schedule" ? (
            <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <CalendarCheck className="w-3.5 h-3.5" />
          )}
        </button>
        <button
          onClick={handleHold}
          disabled={!!saving}
          title="Hold"
          className="w-7 h-7 rounded-[10px] flex items-center justify-center text-white text-sm transition-all duration-150 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(180deg, #fbbf24 0%, #d97706 100%)",
            boxShadow: "0 4px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)",
          }}
        >
          <Pause className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}