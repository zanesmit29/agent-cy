import CandidateCard from "./CandidateCard";

export default function KanbanColumn({ title, candidates, onCardClick, renderCard }) {
  return (
    <div className="w-64 flex flex-col flex-shrink-0">
      <div className="mb-3 px-1">
        <div className="flex items-center justify-between">
          <h3 className="font-sans text-xs font-medium tracking-[0.12em] uppercase text-white/50">
            {title}
          </h3>
          {candidates.length > 0 && (
            <span className="font-sans text-xs text-white/30">{candidates.length}</span>
          )}
        </div>
        <div className="mt-2 h-px bg-white/10" />
      </div>

      <div className="flex-1 min-h-[520px] flex flex-col gap-2 overflow-y-auto pr-0.5">
        {candidates.length === 0 ? (
          <div className="flex-1 rounded-sm bg-white/5 border border-white/10 flex items-center justify-center">
            <p className="font-sans text-xs text-white/20">No candidates</p>
          </div>
        ) : (
          candidates.map((c) =>
            renderCard ? renderCard(c) : (
              <CandidateCard key={c.id} candidate={c} onClick={onCardClick} />
            )
          )
        )}
      </div>
    </div>
  );
}