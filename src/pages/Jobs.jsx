import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import JobFormModal from "@/components/jobs/JobFormModal";

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingJob, setEditingJob] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [jobsData, companiesData] = await Promise.all([
      base44.entities.Job.list("-created_date"),
      base44.entities.Company.list("name"),
    ]);
    setJobs(jobsData ?? []);
    setCompanies(companiesData ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const companyMap = Object.fromEntries(companies.map((c) => [c.id, c.name]));

  const handleSave = async (data) => {
    if (editingJob) {
      await base44.entities.Job.update(editingJob.id, data);
    } else {
      await base44.entities.Job.create(data);
    }
    setShowForm(false);
    setEditingJob(null);
    fetchData();
  };

  const handleEdit = (job) => {
    setEditingJob(job);
    setShowForm(true);
  };

  const handleNew = () => {
    setEditingJob(null);
    setShowForm(true);
  };

  const statusColors = {
    Open: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    Paused: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    Closed: "text-white/30 bg-white/5 border-white/10",
  };

  return (
    <div className="min-h-screen bg-[#0a0e13] text-white flex flex-col">
      {/* Header */}
      <header className="px-8 py-5 flex items-center justify-between border-b border-white/10">
        <span className="font-heading text-xl tracking-tight">
          <span className="text-white">Agent</span><span className="text-[#dba12c]">(cy)</span>
          <span className="font-sans text-sm text-white/40 ml-4 tracking-widest uppercase">Jobs</span>
        </span>
        <div className="flex items-center gap-4">
          <a href="/dashboard" className="font-sans text-xs text-white/40 hover:text-white/70 transition-colors">← Pipeline</a>
          <button
            onClick={handleNew}
            className="bg-[#dba12c] hover:bg-[#c8912a] text-[#0a0e13] font-sans text-xs font-semibold px-4 py-2 rounded-sm transition-colors"
          >
            + New Job
          </button>
        </div>
      </header>

      <main className="flex-1 px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  {["Title", "Company", "Role Type", "Location", "Work Type", "Salary", "Slots", "Status"].map((h) => (
                    <th key={h} className="text-left font-sans text-xs text-white/40 tracking-widest uppercase pb-3 pr-6">{h}</th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                    <td className="py-3 pr-6 font-sans text-sm text-white">{job.title}</td>
                    <td className="py-3 pr-6 font-sans text-sm text-white/70">
                      {companyMap[job.company_id] ?? <span className="text-white/20 italic">—</span>}
                    </td>
                    <td className="py-3 pr-6 font-sans text-xs text-white/50">{job.role_type ?? "—"}</td>
                    <td className="py-3 pr-6 font-sans text-xs text-white/50">{job.location ?? "—"}</td>
                    <td className="py-3 pr-6 font-sans text-xs text-white/50">{job.work_type ?? "—"}</td>
                    <td className="py-3 pr-6 font-sans text-xs text-white/50">{job.salary_range ?? "—"}</td>
                    <td className="py-3 pr-6 font-sans text-xs text-white/50">{job.open_slots ?? "—"}</td>
                    <td className="py-3 pr-6">
                      <span className={`font-sans text-xs px-2 py-0.5 rounded-sm border ${statusColors[job.status] ?? "text-white/30"}`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => handleEdit(job)}
                        className="font-sans text-xs text-white/30 hover:text-white/70 transition-colors"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
                {jobs.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-16 text-center font-sans text-sm text-white/20">No jobs yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {showForm && (
        <JobFormModal
          job={editingJob}
          companies={companies}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingJob(null); }}
        />
      )}
    </div>
  );
}