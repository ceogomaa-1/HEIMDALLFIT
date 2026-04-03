import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (request) => {
  const payload = await request.json();
  return new Response(JSON.stringify({ checkoutUrl: "https://checkout.stripe.com/pay/mock-session", payload }), {
    headers: { "Content-Type": "application/json" }
  });
});
