import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

async function sha256(text: string) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req: Request) => {
  // 1) Verify security token to prevent unauthorized access
  const url = new URL(req.url);
  const token = req.headers.get("x-evo-token") || url.searchParams.get("token");
  const expectedToken = Deno.env.get("EVO_WEBHOOK_TOKEN");

  if (!expectedToken || token !== expectedToken) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  // 2) Parse JSON Payload
  let payload: any;
  try {
    payload = await req.json();
  } catch (err) {
    return new Response(JSON.stringify({ error: "Bad JSON payload" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Extract instance and event type robustly
  const instance = payload?.instance || payload?.data?.instance || payload?.session || "unknown";
  const eventType = payload?.event || payload?.type || payload?.data?.event || "unknown";

  // 3) Idempotency Key - Prevent duplicate webhook processing
  const candidateId = payload?.data?.key?.id || payload?.data?.message?.key?.id || payload?.data?.id || payload?.id;
  const rawString = JSON.stringify(payload);
  const eventKey = candidateId
    ? `${instance}:${eventType}:${candidateId}`
    : `${instance}:${eventType}:hash:${await sha256(rawString)}`;

  // 4) Supabase connection (Service Role to bypass RLS)
  const supabaseUrl = Deno.env.get("NEXCRM_URL")!;
  const serviceKey = Deno.env.get("NEXCRM_SERVICE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // 5) Save Event-Log-First (Ingestion only)
  console.log(`[Webhook] Ingesting: ${eventType} | Instance: ${instance}`);

  const { error } = await supabase
    .from("WhatsappEventRaw") // Matches Prisma table name exactly
    .insert({
      id: crypto.randomUUID(),
      instance,
      eventType,
      eventKey,
      payload
    });

  // If error is duplicate key, it means Evolution retried but we already have it.
  // Still return 200 OK so Evolution stops retrying.
  if (error) {
    const isDuplicate = String(error.message || "").toLowerCase().includes("duplicate");
    if (!isDuplicate) {
      console.error("[Webhook Insert Error]:", error);
      // We still return 200 OK to stop the loop, but log the error
      return new Response(JSON.stringify({ status: "ok", _errorLogged: error.message }), {
        status: 200, headers: { "Content-Type": "application/json" }
      });
    } else {
      console.log(`[Webhook] Ignored Duplicate Event: ${eventKey}`);
    }
  }

  // 6) Fast ACK - Tell Evolution API we got it successfully
  return new Response(JSON.stringify({ status: "ok", ingested: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
});
