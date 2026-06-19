const STAGES = [
  "Discovered",
  "Pending Review",
  "Outreach Approved",
  "Intake Done",
  "Match Packet Ready",
  "Interview Scheduled",
];

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-[#0a0e13] flex flex-col text-white">
      {/* Top bar */}
      <header className="px-8 py-5 flex items-center justify-between border-b border-white/10">
        <span className="font-heading text-white text-xl tracking-tight">Agent(cy)</span>
        <span className="font-sans text-xs text-white/40 tracking-wide uppercase">Recruiter Dashboard</span>
      </header>

      {/* Kanban */}
      <main className="flex-1 overflow-x-auto px-8 py-8">
        <div className="flex gap-4 min-w-max h-full">
          {STAGES.map((stage) => (
            <KanbanColumn key={stage} title={stage} />
          ))}
        </div>
      </main>
    </div>
  );
}

function KanbanColumn({ title }) {
  return (
    <div className="w-64 flex flex-col">
      {/* Column header */}
      <div className="mb-3 px-1">
        <h3 className="font-sans text-xs font-medium tracking-[0.12em] uppercase text-white/50">
          {title}
        </h3>
        <div className="mt-2 h-px bg-white/10" />
      </div>

      {/* Empty column body */}
      <div className="flex-1 min-h-[520px] rounded-sm bg-white/5 border border-white/10 flex items-center justify-center">
        <p className="font-sans text-xs text-white/20">No candidates</p>
      </div>
    </div>
  );
}