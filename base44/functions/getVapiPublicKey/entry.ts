import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const publicKey = Deno.env.get("VAPI_PUBLIC_KEY");
        return Response.json({ publicKey });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});