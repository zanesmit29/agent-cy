import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json().catch(() => ({}));
    const { call_id, candidate_id } = body;

    if (!call_id || !candidate_id) {
      return Response.json({ error: "Missing call_id or candidate_id" }, { status: 400 });
    }

    const vapiKey = Deno.env.get("VAPI_PRIVATE_KEY");
    if (!vapiKey) {
      return Response.json({ error: "VAPI_PRIVATE_KEY not configured" }, { status: 500 });
    }

    const vapiRes = await fetch(`https://api.vapi.ai/call/${call_id}`, {
      headers: {
        "Authorization": `Bearer ${vapiKey}`,
        "Content-Type": "application/json",
        "User-Agent": "Agentcy/1.0",
      },
    });

    if (!vapiRes.ok) {
      const errText = await vapiRes.text();
      return Response.json(
        { error: `Vapi API error: ${vapiRes.status}`, detail: errText },
        { status: 502 }
      );
    }

    const callData = await vapiRes.json();

    const transcript =
      callData?.artifact?.transcript ||
      callData?.transcript ||
      "";

    const updatePayload = {
      vapi_call_id: call_id,
      current_stage: "Intake Done",
    };
    if (transcript) {
      updatePayload.vapi_transcript = transcript;
    }

    await base44.asServiceRole.entities.Candidate.update(candidate_id, updatePayload);

    return Response.json({
      success: true,
      candidate_id,
      call_id,
      transcript_captured: transcript.length > 0,
      transcript_length: transcript.length,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});