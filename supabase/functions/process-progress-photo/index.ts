import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (request) => {
  const payload = await request.json();
  return new Response(
    JSON.stringify({
      status: "queued",
      provider: "replace-with-background-removal-provider",
      photoId: payload.photoId
    }),
    {
      headers: { "Content-Type": "application/json" }
    }
  );
});
