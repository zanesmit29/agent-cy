import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const { candidate_id } = await req.json();
    const base44 = createClientFromRequest(req);

    const candidate = await base44.asServiceRole.entities.Candidate.get(candidate_id);
    const transcript = candidate.vapi_transcript || "";
    const evidenceCard = candidate.evidence_card || "";

    if (!transcript) {
      return Response.json({ error: "No transcript found for this candidate" }, { status: 400 });
    }

    const prompt = `You are a recruiter assistant at Agent(cy). Prepare a match packet from a candidate intake conversation.

Rules:
- Write observations ONLY — never verdicts or scores
- ✅ "Candidate mentioned fine-tuning models on HuggingFace"
- ❌ "Strong candidate" or "High match"
- Every hiring decision is made by a human recruiter — your role is to surface facts

Candidate transcript:
${transcript}

Evidence card:
${evidenceCard}

Return a JSON object with these exact keys:
- "intake_summary": 2-3 sentence summary of what was discussed
- "role_fit_observations": bullet-point observations from the transcript and evidence (facts only)
- "open_questions": questions the recruiter should ask in the interview
- "logistics_and_availability": anything mentioned about availability, location, notice period, or "Not captured in intake"
- "recommended_next_step": one of "Advance", "Request more info", or "Pass"
- "reasoning": one sentence explaining the recommendation, prefixed with "AI suggestion only — "`;

    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          intake_summary: { type: "string" },
          role_fit_observations: { type: "string" },
          open_questions: { type: "string" },
          logistics_and_availability: { type: "string" },
          recommended_next_step: { type: "string" },
          reasoning: { type: "string" },
        },
      },
    });

    const packet = aiResponse;

    if (!packet) {
      return Response.json({ error: "AI response could not be parsed" }, { status: 500 });
    }

    const report = await base44.asServiceRole.entities.Report.create({
      candidate_id,
      intake_summary: packet.intake_summary || "",
      role_fit_observations: packet.role_fit_observations || "",
      open_questions: packet.open_questions || "",
      logistics_and_availability: packet.logistics_and_availability || "",
      recommended_next_step: packet.recommended_next_step || "Request more info",
      reasoning: packet.reasoning || "",
      generated_at: new Date().toISOString(),
    });

    await base44.asServiceRole.entities.Candidate.update(candidate_id, {
      current_stage: "Match Packet Ready",
    });

    return Response.json({ success: true, report_id: report.id });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});