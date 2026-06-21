export default function CandidateCard({ candidate, onClick }) {
  const source = (candidate.discovered_via || "Unknown") === "self-registered" ? "Self-Registered" : (candidate.discovered_via || "Unknown");
  const channel = candidate.outreach_channel ?? "";
  const stage = candidate.current_stage ?? "";
  const isBeyondDiscovered = stage !== "Discovered";

  return (
    <div
      onClick={() => onClick(candidate)}
      className="bg-white/5 border border-white/10 rounded-sm px-3 py-3 cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-sans text-sm text-white font-medium truncate">{candidate.name}</p>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="font-sans text-xs px-2 py-0.5 rounded-sm bg-[#dba12c]/10 text-[#dba12c]">{source}</span>
          {isBeyondDiscovered && channel === "Email" && (
            <span className="font-sans text-xs px-2 py-0.5 rounded-sm bg-blue-400/10 text-blue-400">Email</span>
          )}
          {isBeyondDiscovered && channel === "LinkedIn" && (
            <span className="font-sans text-xs px-2 py-0.5 rounded-sm bg-sky-400/10 text-sky-400">LinkedIn</span>
          )}
          {isBeyondDiscovered && channel === "Twitter DM" && (
            <span className="font-sans text-xs px-2 py-0.5 rounded-sm bg-purple-400/10 text-purple-400">Twitter DM</span>
          )}
        </div>
      </div>
      {candidate.email && (
        <p className="font-sans text-xs text-white/35 mt-1 truncate">{candidate.email}</p>
      )}
    </div>
  );
}