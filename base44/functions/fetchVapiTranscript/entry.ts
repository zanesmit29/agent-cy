import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const { candidate_id } = await req.json();
    console.log("=== fetchVapiTranscript START ===");
    console.log("candidate_id:", candidate_id);
    const base44 = createClientFromRequest(req);

    const listRes = await fetch("https://api.vapi.ai/call?limit=1", {
      headers: { Authorization: `Bearer ${Deno.env.get("VAPI_PRIVATE_KEY")}` },
    });
    const calls = await listRes.json();
    
    const callId = Array.isArray(calls) && calls.length > 0 ? calls[0].id : null;
    console.log("callId:", callId);

    if (!callId) {
      console.log("ERROR: No call ID found");
      return Response.json({ error: "No recent Vapi call found" }, { status: 404 });
    }

    const detailRes = await fetch(`https://api.vapi.ai/call/${callId}`, {
      headers: { Authorization: `Bearer ${Deno.env.get("VAPI_PRIVATE_KEY")}` },
    });
    const vapiData = await detailRes.json();
    console.log("vapiData.status:", vapiData.status);
    console.log("vapiData.transcript type:", typeof vapiData.transcript);
    console.log("vapiData.transcript length:", vapiData.transcript ? vapiData.transcript.length : 0);
    console.log("vapiData.transcript preview:", vapiData.transcript ? vapiData.transcript.substring(0, 200) : "EMPTY OR NULL");

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