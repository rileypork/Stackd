import { unauthorized, userEmail } from "../../apps/shared";
import { parseEmail, type EmailInput } from "../../subscriptions/payload";
import { applySignal, listSubscriptions } from "../../subscriptions/shared";

const MAX_MESSAGES = 50;
const MIN_CONFIDENCE = 45;

type IngestBody = { messages?: EmailInput[] } | EmailInput;

/**
 * Accepts billing / renewal / trial emails (metadata + body), extracts structured signals and upserts subscriptions.
 * Privacy: bodies and snippets live only for the duration of this request — nothing but the parsed fields
 * and a content hash (for de-duplication) is written to D1.
 */
export async function POST(request: Request) {
  const email = userEmail(request);
  if (!email) return unauthorized();
  let body: IngestBody;
  try {
    body = (await request.json()) as IngestBody;
  } catch {
    return Response.json({ error: "Body must be JSON." }, { status: 400 });
  }
  const messages = "messages" in body && Array.isArray(body.messages) ? body.messages : [body as EmailInput];
  if (!messages.length) return Response.json({ error: "No messages supplied." }, { status: 400 });
  if (messages.length > MAX_MESSAGES) return Response.json({ error: `Send at most ${MAX_MESSAGES} messages per request.` }, { status: 400 });

  const results: { subject: string; kind: string; serviceName: string; confidence: number; outcome: "created" | "updated" | "duplicate" | "skipped" }[] = [];
  for (const message of messages) {
    if (!message || typeof message !== "object" || !message.from) {
      results.push({ subject: "", kind: "unknown", serviceName: "", confidence: 0, outcome: "skipped" });
      continue;
    }
    const signal = parseEmail(message);
    if (signal.kind === "unknown" || signal.confidence < MIN_CONFIDENCE) {
      results.push({ subject: signal.subject, kind: signal.kind, serviceName: signal.serviceName, confidence: signal.confidence, outcome: "skipped" });
      continue;
    }
    const outcome = await applySignal(email, signal);
    results.push({
      subject: signal.subject, kind: signal.kind, serviceName: signal.serviceName, confidence: signal.confidence,
      outcome: outcome.duplicate ? "duplicate" : outcome.created ? "created" : "updated",
    });
  }
  return Response.json({ results, subscriptions: await listSubscriptions(email) });
}
