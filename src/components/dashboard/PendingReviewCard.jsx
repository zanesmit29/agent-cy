import { useState } from "react";
import { base44 } from "@/api/base44Client";

function EvidenceFacts({ evidenceCard }) {
  let parsed = {};
  try { parsed = typeof evidenceCard === "string" ? JSON.parse(evidenceCard) : (evidenceCard ?? {}); } catch (_) {}

  const rows = [
    { key: "commits_90d", label: "Commits (90d)" },
    { key: "stars", label: "Stars" },
    { key: "oss_contributions", label: "OSS contributions" },
    { key: "languages", label: "Languages" },
    { key: "huggingface_models", label: "HF models" },
    { key: "public_repos", label: "Public repos" },
  ];

  return (
    <div className="space-y-1.5">
      {rows.map(({ key, label }) => {
        const val = parsed[key];
        if (!val || (Array.isArray(val) && val.length === 0)) return null;
        const display = Array.isArray(val) ? val.join(", ") : String(val);
        return (
          <div key={key} className="flex gap-3">
            <span className="font-sans text-xs text-white/35 w-32 flex-shrink-0">{label}</span>
            <span className="font-sans text-xs text-white/75 break-all">{display}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function PendingReviewCard({ candidate, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [message, setMessage] = useState(candidate.outreach_message ?? "");
  const [saving, setSaving] = useState(null);
  const [dontContactReason, setDontContactReason] = useState("");
  const [showDeclineInput, setShowDeclineInput] = useState(false);

  const source = candidate.discovered_via ?? "Unknown";
  const channel = candidate.outreach_channel ?? "";

  const contactInfo = candidate.contact_path || candidate.email || "";

  const handleApprove = async () => {
    setSaving("approve");
    const me = await base44.auth.me();
    await base44.entities.Candidate.update(candidate.id, {
      outreach_message: message,
      outreach_status: "Approved",
      outreach_approved_by: me?.full_name ?? me?.email ?? "Recruiter",
      outreach_approved_at: new Date().toISOString().split("T")[0],
      current_stage: "Outreach Approved",
    });
    setSaving(null);
    onUpdate?.();
  };

  const handleDecline = async () => {
    if (!showDeclineInput) { setShowDeclineInput(true); return; }
    setSaving("decline");
    const note = dontContactReason.trim();
    await base44.entities.Candidate.update(candidate.id, {
      outreach_message: note ? `[Do not contact: ${note}]\n\n${message}` : message,
    });
    setSaving(null);
    onUpdate?.();
  };

  const gdprSeparator = "\n\n---\n";
  const separatorIndex = message.indexOf(gdprSeparator);
  const draftPart = separatorIndex !== -1 ? message.slice(0, separatorIndex) : message;
  const gdprPart = separatorIndex !== -1 ? message.slice(separatorIndex + gdprSeparator.length) : null;

  return (
    <div className="bg-white/5 border border-white/10 rounded-sm">
      {/* Compact header — always visible */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="px-3 pt-3 pb-2 cursor-pointer hover:bg-white/[0.07] transition-colors"
      >
        <div className="flex items-start justify-between gap-2">
          <p className="font-sans text-sm text-white font-medium truncate">{candidate.name}</p>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="font-sans text-xs px-2 py-0.5 rounded-sm bg-[#dba12c]/10 text-[#dba12c]">GitHub</span>
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

      {/* Expanded detail — only when clicked */}
      {expanded && (
        <div className="px-3 pb-3 space-y-4 border-t border-white/5 pt-3">
          {/* Evidence */}
          {candidate.evidence_card && (
            <div>
              <p className="font-sans text-xs text-white/30 uppercase tracking-wider mb-2">Evidence</p>
              <div className="bg-black/20 rounded-sm p-3">
                <EvidenceFacts evidenceCard={candidate.evidence_card} />
              </div>
            </div>
          )}

          {/* Draft message */}
          <div>
            <p className="font-sans text-xs text-white/30 uppercase tracking-wider mb-2">Draft Message</p>
            <textarea
              value={draftPart}
              onChange={(e) => setMessage(gdprPart ? e.target.value + gdprSeparator + gdprPart : e.target.value)}
              rows={6}
              className="w-full bg-black/20 border border-white/10 rounded-sm px-3 py-2.5 font-sans text-xs text-white/85 placeholder-white/25 focus:outline-none focus:border-white/25 resize-none transition-colors"
            />
            {gdprPart && (
              <div className="mt-1 bg-white/[0.03] border border-white/[0.08] rounded-sm px-3 py-2">
                <p className="font-sans text-xs text-white/25 uppercase tracking-wider mb-1">Mandatory GDPR Footer (not editable)</p>
                <p className="font-sans text-xs text-white/30 whitespace-pre-wrap">{gdprPart}</p>
              </div>
            )}
          </div>

          {/* Don't contact reason */}
          {showDeclineInput && (
            <input
              type="text"
              value={dontContactReason}
              onChange={(e) => setDontContactReason(e.target.value)}
              placeholder="Optional reason (e.g. overqualified, wrong location)…"
              className="w-full bg-black/20 border border-white/10 rounded-sm px-3 py-2 font-sans text-xs text-white/85 placeholder-white/25 focus:outline-none focus:border-white/25 transition-colors"
            />
          )}
        </div>
      )}

      {/* Actions — always visible */}
      <div className="px-3 pb-3 flex items-center gap-3">
        <button
          onClick={handleApprove}
          disabled={!!saving}
          title="Approve"
          className="w-10 h-10 rounded-[12px] flex items-center justify-center text-white text-lg font-bold transition-all duration-150 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
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
          disabled={!!saving}
          title="Hold"
          className="w-10 h-10 rounded-[12px] flex items-center justify-center text-white text-base transition-all duration-150 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
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
          className="w-10 h-10 rounded-[12px] flex items-center justify-center text-white text-lg font-bold transition-all duration-150 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(180deg, #f87171 0%, #dc2626 100%)",
            boxShadow: "0 4px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)",
          }}
        >
          {saving === "decline" ? (
            <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : showDeclineInput ? (
            "✓"
          ) : (
            "✕"
          )}
        </button>
      </div>
    </div>
  );
}