import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (request) => {
  const payload = await request.json();
  return new Response(JSON.stringify({ ok: true, imported: payload.contacts?.length ?? 0 }), {
    headers: { "Content-Type": "application/json" }
  });
});
