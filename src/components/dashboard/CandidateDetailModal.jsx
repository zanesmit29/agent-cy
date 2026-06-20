import { X, Github, ExternalLink } from "lucide-react";

function EvidenceCard({ evidenceCard }) {
  let parsed = null;
  try {
    parsed = typeof evidenceCard === "string" ? JSON.parse(evidenceCard) : evidenceCard;
  } catch (_) {
    return <p className="font-mono text-xs text-white/40 whitespace-pre-wrap">{evidenceCard}</p>;
  }
  if (!parsed) return null;

  const rows = Object.entries(parsed).filter(([, v]) => v !== null && v !== undefined);

  return (
    <div className="space-y-2">
      {rows.map(([key, value]) => {
        const label = key.replace(/_/g, " ");
        let display;
        if (Array.isArray(value)) {
          display = value.length > 0 ? value.join(", ") : "—";
        } else {
          display = String(value) || "—";
        }
        return (
          <div key={key} className="flex gap-3">
            <span className="font-sans text-xs text-white/40 w-36 flex-shrink-0 capitalize">{label}</span>
            <span className="font-sans text-xs text-white/80 break-all">{display}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function CandidateDetailModal({ candidate, onClose }) {
  if (!candidate) return null;

  const source = candidate.discovered_via ?? "GitHub";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        className="bg-[#0d1117] border border-white/15 rounded-sm w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-white/10">
          <div>
            <h2 className="font-heading text-xl text-white">{candidate.name}</h2>
            <p className="font-sans text-xs text-white/40 mt-0.5">{source} · {candidate.current_stage}</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors mt-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Links */}
          <div className="flex flex-wrap gap-3">
            {candidate.github_url && (
              <a href={candidate.github_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-sans text-xs text-white/60 hover:text-white transition-colors">
                <Github className="w-3.5 h-3.5" />
                GitHub
              </a>
            )}
            {candidate.huggingface_url && (
              <a href={candidate.huggingface_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-sans text-xs text-[#ff9900]/70 hover:text-[#ff9900] transition-colors">
                <ExternalLink className="w-3.5 h-3.5" />
                HuggingFace
              </a>
            )}
          </div>

          {/* Contact */}
          {candidate.contact_path && (
            <div>
              <p className="font-sans text-xs text-white/40 mb-1 uppercase tracking-wider">Contact</p>
              <p className="font-sans text-sm text-white/80">{candidate.contact_path}</p>
            </div>
          )}

          {/* Evidence */}
          {candidate.evidence_card && (
            <div>
              <p className="font-sans text-xs text-white/40 mb-2 uppercase tracking-wider">Evidence</p>
              <div className="bg-white/5 rounded-sm border border-white/10 p-4">
                <EvidenceCard evidenceCard={candidate.evidence_card} />
              </div>
            </div>
          )}

          {/* GDPR */}
          {candidate.gdpr_deletion_due && (
            <p className="font-sans text-xs text-white/25">
              GDPR deletion due: {candidate.gdpr_deletion_due}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}