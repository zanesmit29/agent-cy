export default function CandidateCard({ candidate, onClick }) {
  const source = candidate.discovered_via || "Unknown";
  const sourceColor = source === "HuggingFace" ? "text-[#ff9900]" : source === "GitHub" ? "text-[#dba12c]" : "text-white/40";
  const sourceDot = source === "HuggingFace" ? "bg-[#ff9900]" : source === "GitHub" ? "bg-[#dba12c]" : "bg-white/30";

  return (
    <div
      onClick={() => onClick(candidate)}
      className="bg-white/5 border border-white/10 rounded-sm px-3 py-3 cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all"
    >
      <p className="font-sans text-sm text-white font-medium truncate">{candidate.name}</p>
      <div className="flex items-center gap-1.5 mt-1">
        <span className={`w-1.5 h-1.5 rounded-full ${sourceDot} flex-shrink-0`} />
        <span className={`font-sans text-xs ${sourceColor}`}>{source}</span>
      </div>
      {candidate.contact_path && (
        <p className="font-sans text-xs text-white/35 mt-1 truncate">{candidate.contact_path}</p>
      )}
    </div>
  );
}