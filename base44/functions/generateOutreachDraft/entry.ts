import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const BATCH_SIZE = 5;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const allDiscovered = await base44.asServiceRole.entities.Candidate.filter({
      current_stage: 'Discovered',
    });

    const eligible = (allDiscovered ?? []).filter((c) =>
      c.outreach_channel &&
      (c.outreach_status === 'Not contacted' || !c.outreach_status) &&
      !c.opted_out &&
      !c.outreach_message
    );

    const totalEligible = eligible.length;
    const batch = eligible.slice(0, BATCH_SIZE);

    if (batch.length === 0) {
      return Response.json({
        success: true,
        message: 'No eligible candidates — all done or none have a channel assigned.',
        drafts_generated: 0,
        skipped_no_evidence: 0,
        remaining_in_queue: 0,
      });
    }

    const openJobs = await base44.asServiceRole.entities.Job.filter({ status: 'Open' });
    const allCompanies = await base44.asServiceRole.entities.Company.filter({});
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

    for (const candidate of batch) {
      let evidenceCard = {};
      try { evidenceCard = JSON.parse(candidate.evidence_card ?? '{}'); } catch (_) {}

      const ossContributions = Array.isArray(evidenceCard.oss_contributions) ? evidenceCard.oss_contributions : [];
      const starsRaw = evidenceCard.stars ?? '';
      const hfModels = evidenceCard.huggingface_models ?? '';
      const languages = Array.isArray(evidenceCard.languages) ? evidenceCard.languages : [];
      const commitsRaw = evidenceCard.commits_90d ?? '';
      const publicRepos = evidenceCard.public_repos ?? 0;

      const starCount = parseInt(starsRaw.match(/^(\d+)/)?.[1] ?? '0', 10);
      const commitCount = parseInt(commitsRaw.match(/^(\d+)/)?.[1] ?? '0', 10);
      const hasEvidence = ossContributions.length > 0 || starCount > 0 || commitCount > 5 || hfModels.length > 3;

      if (!hasEvidence) {
        skippedNoEvidence++;
        await base44.asServiceRole.entities.Candidate.update(candidate.id, {
          outreach_status: 'Skipped — no evidence',
        });
        results.push({ id: candidate.id, name: candidate.name, status: 'skipped', reason: 'No public activity' });
        continue;
      }

      const evidenceSummary = [
        commitsRaw ? `Recent commits: ${commitsRaw}` : null,
        starsRaw ? `Stars: ${starsRaw}` : null,
        ossContributions.length > 0 ? `OSS contributions: ${ossContributions.join(', ')}` : null,
        languages.length > 0 ? `Primary languages: ${languages.join(', ')}` : null,
        hfModels ? `HuggingFace models: ${hfModels}` : null,
        publicRepos > 0 ? `Public repos: ${publicRepos}` : null,
      ].filter(Boolean).join('\n');

      let specificReference = '';
      if (ossContributions.length > 0) specificReference = ossContributions[0];
      else if (hfModels) specificReference = hfModels;
      else if (starsRaw) { const m = starsRaw.match(/\(([^:)]+):/); specificReference = m ? m[1] : starsRaw.split(' ').slice(0, 6).join(' '); }
      else if (commitsRaw) specificReference = `${commitsRaw} in the last 90 days`;

      let matchedJob = null;
      let matchReason = '';

      if (jobList.length > 0) {
        const matchPrompt = `Match this candidate to the best open job, or return null if no good fit.

Candidate: ${candidate.name} (${candidate.discovered_via ?? 'GitHub'})
Evidence:
${evidenceSummary}

Jobs:
${jobList.map((j, i) => `${i + 1}. [ID: ${j.id}] ${j.title} at ${j.company} | Stack: ${j.required_stack} | ${j.description}`).join('\n')}

Reply with ONLY raw JSON (no markdown):
{"job_id": "<id or null>", "reason": "<one sentence or null>"}`;

        try {
          const matchText = await base44.integrations.Core.InvokeLLM({ prompt: matchPrompt, model: 'gpt_5_mini' });
          const cleaned = matchText.replace(/```json|```/g, '').trim();
          const parsed = JSON.parse(cleaned);
          if (parsed.job_id && parsed.job_id !== 'null' && parsed.job_id !== null) {
            matchedJob = jobList.find((j) => j.id === parsed.job_id) ?? null;
            matchReason = parsed.reason ?? '';
          }
        } catch (_) { matchedJob = null; }
      }

      const channel = candidate.outreach_channel;
      const platform = candidate.discovered_via ?? 'GitHub';
      const isEmail = channel === 'Email';
      const isLinkedIn = channel === 'LinkedIn';
      const messageType = matchedJob ? 'personalised' : 'talent_pool';

      const messagePrompt = messageType === 'personalised'
        ? `Write a ${isEmail ? 'recruitment email' : isLinkedIn ? 'LinkedIn message' : 'Twitter DM'} from Agent(cy) (AI recruitment, Amsterdam) to ${candidate.name}.
Warm, direct, human tone. Not corporate.
Don't open with "I came across your profile" or "I hope this message finds you well."
Reference their work: ${specificReference}
Role: ${matchedJob.title} at ${matchedJob.company}
Why it fits: ${matchReason}
Close: "Would you be open to a quick chat?"
${isEmail ? 'Line 1: Subject: <subject>. Then body. Max 4 sentences.' : isLinkedIn ? 'Max 3 sentences. No subject.' : 'Max 2-3 sentences. No subject.'}
NO GDPR text. Output only the message.`
        : `Write a ${isEmail ? 'recruitment email' : isLinkedIn ? 'LinkedIn message' : 'Twitter DM'} from Agent(cy) (AI recruitment, Amsterdam) to ${candidate.name}.
Warm, direct, human tone. Not corporate.
Don't open with "I came across your profile" or "I hope this message finds you well."
Reference their work: ${specificReference}
No specific role — say Agent(cy) connects AI builders with Amsterdam-based AI-native companies.
Close: "Would you be open to staying in touch?"
${isEmail ? 'Line 1: Subject: <subject>. Then body. Max 3-4 sentences.' : isLinkedIn ? 'Max 3 sentences. No subject.' : 'Max 2-3 sentences. No subject.'}
NO GDPR text. Output only the message.`;

      let draftMessage = '';
      try {
        draftMessage = (await base44.integrations.Core.InvokeLLM({ prompt: messagePrompt, model: 'gpt_5_mini' })).trim();
      } catch (_) {
        results.push({ id: candidate.id, name: candidate.name, status: 'error', reason: 'LLM message generation failed' });
        continue;
      }

      if (!draftMessage) {
        results.push({ id: candidate.id, name: candidate.name, status: 'error', reason: 'Empty message returned' });
        continue;
      }

      const gdprFooter = `\n\n---\nAgent(cy) found your profile via publicly available information on ${platform}. We hold: your public profile URL and publicly visible work signals. We process this under legitimate interests to match candidates to relevant roles. You can request deletion or object to processing at any time: privacy@agentcy.io. If you don't respond, your data is deleted after 90 days. Reply REMOVE to be deleted immediately.`;

      const fullMessage = draftMessage + gdprFooter;

      await base44.asServiceRole.entities.Candidate.update(candidate.id, {
        outreach_message: fullMessage,
        outreach_status: 'Draft ready',
        current_stage: 'Pending Review',
      });

      draftsGenerated++;
      results.push({
        id: candidate.id, name: candidate.name, status: 'draft_generated',
        channel, message_type: messageType,
        matched_job: matchedJob ? `${matchedJob.title} at ${matchedJob.company}` : null,
        match_reason: matchReason || null,
      });
    }

    return Response.json({
      success: true,
      batch_size: batch.length,
      drafts_generated: draftsGenerated,
      skipped_no_evidence: skippedNoEvidence,
      remaining_in_queue: Math.max(0, totalEligible - batch.length),
      breakdown: results,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});