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
    <div className="min-h-screen bg-[#faf9f7] flex flex-col">
      {/* Top bar */}
      <header className="px-8 py-5 flex items-center justify-between border-b border-[#dbd4cc] bg-white">
        <span className="font-heading text-[#0f3b59] text-xl tracking-tight">Agent(cy)</span>
        <span className="font-sans text-xs text-[#7d929e] tracking-wide uppercase">Recruiter Dashboard</span>
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
        <h3 className="font-sans text-xs font-medium tracking-[0.12em] uppercase text-[#0f3b59]">
          {title}
        </h3>
        <div className="mt-2 h-px bg-[#dbd4cc]" />
      </div>

      {/* Empty column body */}
      <div className="flex-1 min-h-[520px] rounded-sm bg-white border border-[#dbd4cc] flex items-center justify-center">
        <p className="font-sans text-xs text-[#dbd4cc]">No candidates</p>
      </div>
    </div>
  );
}