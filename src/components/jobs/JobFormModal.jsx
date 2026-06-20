import { useState, useEffect } from "react";

const ROLE_TYPES = ["AI/ML", "Frontend", "Backend", "Fullstack", "Other"];
const STATUSES = ["Open", "Paused", "Closed"];
const WORK_TYPES = ["Remote", "Hybrid", "On-site"];

export default function JobFormModal({ job, companies, onSave, onClose }) {
  const [form, setForm] = useState({
    title: "",
    company_id: "",
    role_type: "",
    status: "Open",
    required_stack: "",
    location: "",
    work_type: "",
    salary_range: "",
    open_slots: "",
    description: "",
    conversational_description: "",
  });

  useEffect(() => {
    if (job) {
      setForm({
        title: job.title ?? "",
        company_id: job.company_id ?? "",
        role_type: job.role_type ?? "",
        status: job.status ?? "Open",
        required_stack: job.required_stack ?? "",
        location: job.location ?? "",
        work_type: job.work_type ?? "",
        salary_range: job.salary_range ?? "",
        open_slots: job.open_slots ?? "",
        description: job.description ?? "",
        conversational_description: job.conversational_description ?? "",
      });
    }
  }, [job]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...form, open_slots: form.open_slots !== "" ? Number(form.open_slots) : undefined });
  };

  const inputCls = "w-full bg-white/5 border border-white/15 rounded-sm px-3 py-2 font-sans text-xs text-white placeholder-white/25 focus:outline-none focus:border-white/30 transition-colors";
  const labelCls = "block font-sans text-xs text-white/40 uppercase tracking-wider mb-1";
  const selectCls = `${inputCls} appearance-none`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#0f1520] border border-white/10 rounded-sm w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-heading text-lg text-white">{job ? "Edit Job" : "New Job"}</h2>
          <button onClick={onClose} className="font-sans text-xs text-white/30 hover:text-white/60 transition-colors">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label className={labelCls}>Title *</label>
            <input required className={inputCls} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. ML Engineer — Fraud Detection" />
          </div>

          {/* Company */}
          <div>
            <label className={labelCls}>Company</label>
            <select className={selectCls} value={form.company_id} onChange={(e) => set("company_id", e.target.value)}>
              <option value="">— Select company —</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Role Type */}
            <div>
              <label className={labelCls}>Role Type</label>
              <select className={selectCls} value={form.role_type} onChange={(e) => set("role_type", e.target.value)}>
                <option value="">— Select —</option>
                {ROLE_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className={labelCls}>Status</label>
              <select className={selectCls} value={form.status} onChange={(e) => set("status", e.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Location */}
            <div>
              <label className={labelCls}>Location</label>
              <input className={inputCls} value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Amsterdam" />
            </div>

            {/* Work Type */}
            <div>
              <label className={labelCls}>Work Type</label>
              <select className={selectCls} value={form.work_type} onChange={(e) => set("work_type", e.target.value)}>
                <option value="">— Select —</option>
                {WORK_TYPES.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>

            {/* Salary */}
            <div>
              <label className={labelCls}>Salary Range</label>
              <input className={inputCls} value={form.salary_range} onChange={(e) => set("salary_range", e.target.value)} placeholder="e.g. €80k–€120k" />
            </div>

            {/* Open Slots */}
            <div>
              <label className={labelCls}>Open Slots</label>
              <input type="number" min="0" className={inputCls} value={form.open_slots} onChange={(e) => set("open_slots", e.target.value)} placeholder="e.g. 2" />
            </div>
          </div>

          {/* Required Stack */}
          <div>
            <label className={labelCls}>Required Stack</label>
            <input className={inputCls} value={form.required_stack} onChange={(e) => set("required_stack", e.target.value)} placeholder="e.g. Python, PyTorch, Kafka" />
          </div>

          {/* Conversational Description */}
          <div>
            <label className={labelCls}>Short Description (2 sentences)</label>
            <textarea rows={2} className={inputCls} value={form.conversational_description} onChange={(e) => set("conversational_description", e.target.value)} placeholder="Used in outreach drafts…" />
          </div>

          {/* Full Description */}
          <div>
            <label className={labelCls}>Full Description</label>
            <textarea rows={4} className={inputCls} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="font-sans text-xs text-white/40 hover:text-white/70 transition-colors px-4 py-2">
              Cancel
            </button>
            <button type="submit" className="bg-[#dba12c] hover:bg-[#c8912a] text-[#0a0e13] font-sans text-xs font-semibold px-5 py-2 rounded-sm transition-colors">
              {job ? "Save Changes" : "Create Job"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}