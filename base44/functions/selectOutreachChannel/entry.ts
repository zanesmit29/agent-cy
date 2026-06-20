import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const candidates = await base44.asServiceRole.entities.Candidate.filter({
      current_stage: "Discovered",
    });

    if (!candidates || candidates.length === 0) {
      return Response.json({ message: "No discovered candidates found.", updated: 0 });
    }

    const results = [];

    for (const candidate of candidates) {
      if (candidate.opted_out) {
        results.push({ id: candidate.id, name: candidate.name, channel: null, reason: "opted_out — skipped" });
        continue;
      }

      if (candidate.outreach_channel) {
        results.push({ id: candidate.id, name: candidate.name, channel: candidate.outreach_channel, reason: "already set — skipped" });
        continue;
      }

      const contactPath = (candidate.contact_path || "").toLowerCase();
      let channel = null;

      if (contactPath.startsWith("email:") || (candidate.email && candidate.email.trim().length > 0)) {
        channel = "Email";
      } else if (contactPath.startsWith("linkedin:") || (candidate.linkedin_url && candidate.linkedin_url.trim().length > 0)) {
        channel = "LinkedIn";
      } else if (contactPath.startsWith("twitter:") || (candidate.twitter_handle && candidate.twitter_handle.trim().length > 0)) {
        channel = "Twitter DM";
      }

      if (channel) {
        await base44.asServiceRole.entities.Candidate.update(candidate.id, {
          outreach_channel: channel,
          outreach_status: "Not contacted",
        });
        results.push({ id: candidate.id, name: candidate.name, channel, reason: "assigned" });
      } else {
        results.push({ id: candidate.id, name: candidate.name, channel: null, reason: "no valid contact path found" });
      }
    }

    const assigned = results.filter(r => r.reason === "assigned").length;
    const skippedOptOut = results.filter(r => r.reason.startsWith("opted_out")).length;
    const skippedAlready = results.filter(r => r.reason.startsWith("already")).length;
    const noContact = results.filter(r => r.reason.startsWith("no valid")).length;

    return Response.json({
      success: true,
      total_processed: candidates.length,
      channels_assigned: assigned,
      skipped_opted_out: skippedOptOut,
      skipped_already_set: skippedAlready,
      skipped_no_contact: noContact,
      breakdown: results,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});