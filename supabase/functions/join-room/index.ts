import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (request) => {
  const payload = await request.json();
  return new Response(JSON.stringify({ status: "pending", payload, notification: "Coach push notification would be queued here." }), {
    headers: { "Content-Type": "application/json" }
  });
});
