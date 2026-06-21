import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const { call_id, candidate_id } = await req.json();
    const base44 = createClientFromRequest(req);

    const vapiRes = await fetch(`https://api.vapi.ai/call/${call_id}`, {
      headers: { Authorization: `Bearer ${Deno.env.get("VAPI_PRIVATE_KEY")}` },
    });
    const vapiData = await vapiRes.json();
    const transcript = vapiData.artifact?.transcript || "";

    await base44.asServiceRole.entities.Candidate.update(candidate_id, {
      vapi_transcript: transcript,
      current_stage: "Intake Done",
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});