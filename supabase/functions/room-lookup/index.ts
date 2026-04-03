import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (request) => {
  const { roomId } = await request.json();
  return new Response(JSON.stringify({ roomId, found: true, message: "Replace with Supabase room lookup logic." }), {
    headers: { "Content-Type": "application/json" }
  });
});
