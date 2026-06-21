import { useState } from "react";
import { base44 } from "@/api/base44Client";

export default function PendingReviewCard({ candidate, onUpdate, onClick }) {
  const [saving, setSaving] = useState(null);

  const channel = candidate.outreach_channel ?? "";
  const source = (candidate.discovered_via ?? "Unknown") === "self-registered" ? "Self-Registered" : (candidate.discovered_via ?? "Unknown");
  const contactInfo = candidate.contact_path || candidate.email || "";

  const handleApprove = async (e) => {
    e.stopPropagation();
    setSaving("approve");
    const me = await base44.auth.me();
    await base44.entities.Candidate.update(candidate.id, {
      outreach_message: candidate.outreach_message ?? "",
      outreach_status: "Approved",
      outreach_approved_by: me?.full_name ?? me?.email ?? "Recruiter",
      outreach_approved_at: new Date().toISOString().split("T")[0],
      current_stage: "Outreach Approved",
    });
    await base44.functions.invoke("sendCandidateEmail", {
      candidate_id: candidate.id,
      subject: "Opportunity from Agent(cy)",
      body: candidate.outreach_message ?? "",
    });
    setSaving(null);
    onUpdate?.();
  };

  const handleDecline = async (e) => {
    e.stopPropagation();
    setSaving("decline");
    await base44.entities.Candidate.update(candidate.id, {
      outreach_message: candidate.outreach_message ?? "",
    });
    setSaving(null);
    onUpdate?.();
  };

  return (
    <div
      onClick={() => onClick?.(candidate)}
      className="bg-white/5 border border-white/10 rounded-sm cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all"
    >
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <p className="font-sans text-sm text-white font-medium truncate">{candidate.name}</p>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="font-sans text-xs px-2 py-0.5 rounded-sm bg-[#dba12c]/10 text-[#dba12c]">{source}</span>
            {channel === "Email" && (
              <span className="font-sans text-xs px-2 py-0.5 rounded-sm bg-blue-400/10 text-blue-400">Email</span>
            )}
            {channel === "LinkedIn" && (
              <span className="font-sans text-xs px-2 py-0.5 rounded-sm bg-sky-400/10 text-sky-400">LinkedIn</span>
            )}
            {channel === "Twitter DM" && (
              <span className="font-sans text-xs px-2 py-0.5 rounded-sm bg-purple-400/10 text-purple-400">Twitter DM</span>
            )}
          </div>
        </div>
        {contactInfo && (
          <p className="font-sans text-xs text-white/35 mt-1 truncate">{contactInfo}</p>
        )}
      </div>

      {/* Actions — always visible, stop propagation to avoid modal */}
      <div className="px-3 pb-3 flex items-center gap-1.5">
        <button
          onClick={handleApprove}
          disabled={!!saving}
          title="Approve"
          className="w-7 h-7 rounded-[10px] flex items-center justify-center text-white text-sm font-bold transition-all duration-150 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(180deg, #4ade80 0%, #16a34a 100%)",
            boxShadow: "0 4px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)",
          }}
        >
          {saving === "approve" ? (
            <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            "✓"
          )}
        </button>
        <button
          onClick={(e) => e.stopPropagation()}
          disabled={!!saving}
          title="Hold"
          className="w-7 h-7 rounded-[10px] flex items-center justify-center text-white text-sm transition-all duration-150 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(180deg, #fbbf24 0%, #d97706 100%)",
            boxShadow: "0 4px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)",
          }}
        >
          ⏸
        </button>
        <button
          onClick={handleDecline}
          disabled={!!saving}
          title="Don't contact"
          className="w-7 h-7 rounded-[10px] flex items-center justify-center text-white text-sm font-bold transition-all duration-150 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(180deg, #f87171 0%, #dc2626 100%)",
            boxShadow: "0 4px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)",
          }}
        >
          {saving === "decline" ? (
            <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            "✕"
          )}
        </button>
      </div>
    </div>
  );
}