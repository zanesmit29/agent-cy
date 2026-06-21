import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const { candidate_id, subject, body } = await req.json();
    const base44 = createClientFromRequest(req);

    const candidate = await base44.asServiceRole.entities.Candidate.get(candidate_id);
    const toEmail = candidate.email;

    if (!toEmail) {
      return Response.json({ error: "No email address on candidate" }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("gmail");

    const emailLines = [
      `To: ${toEmail}`,
      `Subject: ${subject}`,
      `Content-Type: text/plain; charset=UTF-8`,
      ``,
      body,
    ];
    const rawMessage = emailLines.join("\r\n");
    const encodedMessage = btoa(rawMessage);

    const sendRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: encodedMessage }),
    });

    if (!sendRes.ok) {
      const err = await sendRes.text();
      return Response.json({ error: `Gmail API error: ${err}` }, { status: 500 });
    }

    return Response.json({ success: true, sent_to: toEmail });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});