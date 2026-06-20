import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // STEP 0 — Run selectOutreachChannel logic internally
    const discoveredCandidates = await base44.asServiceRole.entities.Candidate.filter({
      current_stage: 'Discovered',
    });

    let channelsAssigned = 0;
    for (const c of discoveredCandidates ?? []) {
      if (c.opted_out || c.outreach_channel) continue;
      const contactPath = (c.contact_path ?? '').toLowerCase();
      let channel = null;
      if (contactPath.startsWith('email:') || c.email?.trim()) {
        channel = 'Email';
      } else if (contactPath.startsWith('linkedin:') || c.linkedin_url?.trim()) {
        channel = 'LinkedIn';
      } else if (contactPath.startsWith('twitter:') || c.twitter_handle?.trim()) {
        channel = 'Twitter DM';
      }
      if (channel) {
        await base44.asServiceRole.entities.Candidate.update(c.id, {
          outreach_channel: channel,
          outreach_status: 'Not contacted',
        });
        channelsAssigned++;
      }
    }

    // STEP 1 — Fetch eligible candidates
    const allCandidates = await base44.asServiceRole.entities.Candidate.filter({
      current_stage: 'Discovered',
    });
    const eligible = (allCandidates ?? []).filter((c) =>
      c.outreach_channel &&
      (c.outreach_status === 'Not contacted' || !c.outreach_status) &&
      !c.opted_out &&
      !c.outreach_message
    );

    if (eligible.length === 0) {
      return Response.json({
        success: true,
        message: 'No eligible candidates to process.',
        channels_assigned_step0: channelsAssigned,
        drafts_generated: 0,
        skipped_no_evidence: 0,
      });
    }

    // Load open jobs and companies
    const openJobs = await base44.asServiceRole.entities.Job.filter({ status: 'Open' });
    const allCompanies = await base44.asServiceRole.entities.Company.list();
    const companyMap = {};
    for (const co of allCompanies ?? []) companyMap[co.id] = co.name;

    const jobList = (openJobs ?? []).map((j) => ({
      id: j.id,
      title: j.title,
      company: companyMap[j.company] ?? 'Unknown Company',
      required_stack: j.required_stack ?? '',
      description: j.conversational_description ?? j.description ?? '',
    }));

    const results = [];
    let draftsGenerated = 0;
    let skippedNoEvidence = 0;

    for (const candidate of eligible) {
      // STEP 2 — Evidence gate
      let evidenceCard = {};
      try { evidenceCard = JSON.parse(candidate.evidence_card ?? '{}'); } catch (_) {}

      const ossContributions = Array.isArray(evidenceCard.oss_contributions) ? evidenceCard.oss_contributions : [];
      const stars = evidenceCard.stars ?? '';
      const hfModels = evidenceCard.huggingface_models ?? '';
      const languages = Array.isArray(evidenceCard.languages) ? evidenceCard.languages : [];
      const commits = evidenceCard.commits_90d ?? '';
      const publicRepos = evidenceCard.public_repos ?? 0;

      const hasSpecificRepo = ossContributions.length > 0 || stars.length > 10;
      const hasSpecificModel = hfModels.length > 5;

      if (!hasSpecificRepo && !hasSpecificModel) {
        skippedNoEvidence++;
        results.push({ id: candidate.id, name: candidate.name, status: 'skipped', reason: 'Insufficient evidence — no specific repo or model found' });
        continue;
      }

      const evidenceSummary = [
        commits ? `Commits (last 90 days): ${commits}` : null,
        stars ? `Stars: ${stars}` : null,
        ossContributions.length > 0 ? `OSS contributions: ${ossContributions.join(', ')}` : null,
        languages.length > 0 ? `Primary languages: ${languages.join(', ')}` : null,
        hfModels ? `HuggingFace models: ${hfModels}` : null,
        publicRepos > 0 ? `Public repos: ${publicRepos}` : null,
      ].filter(Boolean).join('\n');

      let specificReference = '';
      if (ossContributions.length > 0) specificReference = ossContributions[0];
      else if (hfModels) specificReference = hfModels;
      else if (stars) { const m = stars.match(/\(([^:)]+):/); specificReference = m ? m[1] : stars; }

      // STEP 3 — AI job matching
      let matchedJob = null;
      let matchReason = '';

      if (jobList.length > 0) {
        const matchPrompt = `You are a technical recruitment assistant. Given a candidate's public work evidence and a list of open jobs, identify the single best job match.

Candidate: ${candidate.name}
Discovered via: ${candidate.discovered_via ?? 'GitHub'}

Evidence:
${evidenceSummary}

Open jobs:
${jobList.map((j, i) => `${i + 1}. [ID: ${j.id}] ${j.title} at ${j.company} | Stack: ${j.required_stack} | ${j.description}`).join('\n')}

Respond with ONLY a valid JSON object. No markdown. No code blocks. Just raw JSON:
{"job_id": "<id or null>", "reason": "<one plain English sentence or null>"}

If no job fits, return: {"job_id": null, "reason": null}`;

        try {
          const matchText = await base44.integrations.Core.InvokeLLM({
            prompt: matchPrompt,
            model: 'gpt_5_mini',
          });
          const cleaned = matchText.replace(/```json|```/g, '').trim();
          const parsed = JSON.parse(cleaned);
          if (parsed.job_id && parsed.job_id !== 'null' && parsed.job_id !== null) {
            matchedJob = jobList.find((j) => j.id === parsed.job_id) ?? null;
            matchReason = parsed.reason ?? '';
          }
        } catch (_) { matchedJob = null; }
      }

      // STEP 4+5 — Channel-specific message generation
      const channel = candidate.outreach_channel;
      const platform = candidate.discovered_via ?? 'GitHub';
      const isEmail = channel === 'Email';
      const isLinkedIn = channel === 'LinkedIn';
      const messageType = matchedJob ? 'personalised' : 'talent_pool';

      const messagePrompt = messageType === 'personalised'
        ? `You are writing a recruitment outreach message on behalf of Agent(cy), an EU-compliant AI recruitment service based in Amsterdam.

Write a ${isEmail ? 'professional email' : isLinkedIn ? 'LinkedIn message' : 'Twitter DM'} to ${candidate.name}.

Rules:
- Warm, professional tone. Not corporate. Not generic.
- Do NOT start with "I came across your profile" or "I hope this message finds you well"
- Reference their specific work: ${specificReference}
- Mention the role: ${matchedJob.title} at ${matchedJob.company}
- Use this match reason naturally: ${matchReason}
- End with: "Would you be open to a quick chat?"
- ${isEmail ? 'First line must be: Subject: <subject>. Then body. 4 sentences max.' : isLinkedIn ? '3 sentences max. No subject line.' : '2-3 sentences max. No subject line.'}
- Do NOT add GDPR text or opt-out instructions. Those are added separately.
- Output only the message. Nothing else.`
        : `You are writing a recruitment outreach message on behalf of Agent(cy), an EU-compliant AI recruitment service based in Amsterdam.

Write a ${isEmail ? 'professional email' : isLinkedIn ? 'LinkedIn message' : 'Twitter DM'} to ${candidate.name}.

Rules:
- Warm, professional tone. Not corporate. Not generic.
- Do NOT start with "I came across your profile" or "I hope this message finds you well"
- Reference their specific work: ${specificReference}
- Do NOT mention a specific role. Say we work with AI-native companies building in this space in Amsterdam.
- End with: "Would you be open to staying in touch?"
- ${isEmail ? 'First line must be: Subject: <subject>. Then body. 3-4 sentences max.' : isLinkedIn ? '3 sentences max. No subject line.' : '2-3 sentences max. No subject line.'}
- Do NOT add GDPR text or opt-out instructions. Those are added separately.
- Output only the message. Nothing else.`;

      let draftMessage = '';
      try {
        draftMessage = (await base44.integrations.Core.InvokeLLM({
          prompt: messagePrompt,
          model: 'gpt_5_mini',
        })).trim();
      } catch (_) {
        results.push({ id: candidate.id, name: candidate.name, status: 'error', reason: 'LLM message generation failed' });
        continue;
      }

      if (!draftMessage) {
        results.push({ id: candidate.id, name: candidate.name, status: 'error', reason: 'Empty message returned' });
        continue;
      }

      // STEP 6 — Append mandatory GDPR footer in code (never by LLM)
      const gdprFooter = `\n\n---\nAgent(cy) found your profile via publicly available information on ${platform}. We hold: your public profile URL and publicly visible work signals. We process this under legitimate interests to match candidates to relevant roles. You can request deletion or object to processing at any time: privacy@agentcy.io. If you don't respond, your data is deleted after 90 days. Reply REMOVE to be deleted from our system immediately.`;

      const fullMessage = draftMessage + gdprFooter;

      // STEP 7 — Save and advance to Pending Review
      await base44.asServiceRole.entities.Candidate.update(candidate.id, {
        outreach_message: fullMessage,
        outreach_status: 'Draft ready',
        current_stage: 'Pending Review',
      });

      draftsGenerated++;
      results.push({
        id: candidate.id,
        name: candidate.name,
        status: 'draft_generated',
        channel,
        message_type: messageType,
        matched_job: matchedJob ? `${matchedJob.title} at ${matchedJob.company}` : null,
        match_reason: matchReason || null,
      });
    }

    return Response.json({
      success: true,
      channels_assigned_step0: channelsAssigned,
      eligible_candidates: eligible.length,
      drafts_generated: draftsGenerated,
      skipped_no_evidence: skippedNoEvidence,
      breakdown: results,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});