import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const allJobs = await base44.asServiceRole.entities.Job.filter({ status: "Open" });

    if (!allJobs || allJobs.length === 0) {
      return Response.json({ message: "No open jobs found.", updated: 0 });
    }

    const slotsByCompany = {};
    for (const job of allJobs) {
      const companyId = job.company_id;
      const slots = job.open_slots || 0;
      slotsByCompany[companyId] = (slotsByCompany[companyId] || 0) + slots;
    }

    const modeForCompany = (totalSlots) => {
      if (totalSlots >= 11) return "Active";
      if (totalSlots >= 3)  return "Light";
      return "Passive";
    };

    const updates = [];

    for (const job of allJobs) {
      const totalSlots = slotsByCompany[job.company_id] || 0;
      const mode = modeForCompany(totalSlots);

      await base44.asServiceRole.entities.Job.update(job.id, {
        suggested_outreach_mode: mode,
      });

      updates.push({ jobId: job.id, title: job.title, company_id: job.company_id, totalSlots, mode });
    }

    return Response.json({ success: true, jobs_updated: updates.length, breakdown: updates });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});