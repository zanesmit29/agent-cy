import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const { candidate_id } = await req.json();
    const base44 = createClientFromRequest(req);

    const listRes = await fetch("https://api.vapi.ai/call?limit=1", {
      headers: { Authorization: `Bearer ${Deno.env.get("VAPI_PRIVATE_KEY")}` },
    });
    const calls = await listRes.json();
    const callId = Array.isArray(calls) && calls.length > 0 ? calls[0].id : null;

    if (!callId) {
      return Response.json({ error: "No recent Vapi call found" }, { status: 404 });
    }

    await new Promise(resolve => setTimeout(resolve, 5000));

    const detailRes = await fetch(`https://api.vapi.ai/call/${callId}`, {
      headers: { Authorization: `Bearer ${Deno.env.get("VAPI_PRIVATE_KEY")}` },
    });
    const vapiData = await detailRes.json();
    const transcript = vapiData.transcript || "";

    await base44.asServiceRole.entities.Candidate.update(candidate_id, {
      vapi_call_id: callId,
      vapi_transcript: transcript,
      current_stage: "Intake Done",
    });

    return Response.json({ success: true, call_id: callId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});