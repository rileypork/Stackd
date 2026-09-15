// Pure helpers for subscriptions + email-signal parsing. No I/O, no Cloudflare imports (unit-testable).
// Privacy: `parseEmail` only ever returns structured fields; callers must never persist `body`/`snippet`.

export const INTERVALS = ["weekly", "monthly", "quarterly", "yearly", "one_time"] as const;
export type Interval = (typeof INTERVALS)[number];
export const SUB_STATUSES = ["active", "trialing", "canceled", "paused"] as const;
export type SubStatus = (typeof SUB_STATUSES)[number];
export const SIGNAL_KINDS = ["receipt", "renewal", "trial", "cancellation", "price_change", "unknown"] as const;
export type SignalKind = (typeof SIGNAL_KINDS)[number];

export type Subscription = {
  id: string;
  serviceName: string;
  domain: string | null;
  category: string;
  planName: string | null;
  cost: number;
  currency: string;
  billingInterval: Interval;
  nextRenewalDate: string | null;
  trialEndDate: string | null;
  cancelUrl: string | null;
  status: SubStatus;
  projectId: string | null;
  appId: string | null;
  lastDetectedAt: string | null;
  signalCount: number;
  updatedAt: string;
};

export type Signal = {
  id: string;
  subscriptionId: string;
  kind: SignalKind;
  source: string;
  senderDomain: string | null;
  subject: string;
  amount: number | null;
  currency: string | null;
  billingInterval: Interval | null;
  renewalDate: string | null;
  trialEndDate: string | null;
  cancelUrl: string | null;
  confidence: number;
  detectedAt: string;
};

export type SubscriptionPayload = {
  serviceName?: string;
  domain?: string | null;
  category?: string;
  planName?: string | null;
  cost?: number;
  currency?: string;
  billingInterval?: string;
  nextRenewalDate?: string | null;
  trialEndDate?: string | null;
  cancelUrl?: string | null;
  status?: string;
  projectId?: string | null;
  appId?: string | null;
};

export type EmailInput = {
  id?: string;
  from?: string;
  subject?: string;
  date?: string;
  snippet?: string;
  body?: string;
};

export type ParsedSignal = {
  messageHash: string;
  kind: SignalKind;
  serviceName: string;
  senderDomain: string | null;
  category: string;
  subject: string;
  planName: string | null;
  amountCents: number | null;
  currency: string | null;
  billingInterval: Interval | null;
  renewalDate: string | null;
  trialEndDate: string | null;
  cancelUrl: string | null;
  confidence: number;
};

const CATEGORY_BY_DOMAIN: Record<string, string> = {
  "openai.com": "AI", "anthropic.com": "AI", "midjourney.com": "AI", "perplexity.ai": "AI", "elevenlabs.io": "AI",
  "notion.so": "Productivity", "todoist.com": "Productivity", "linear.app": "Productivity", "asana.com": "Productivity",
  "figma.com": "Design", "canva.com": "Design", "adobe.com": "Design", "framer.com": "Design",
  "github.com": "Developer", "vercel.com": "Developer", "cloudflare.com": "Developer", "netlify.com": "Developer", "raycast.com": "Developer",
  "slack.com": "Communication", "zoom.us": "Communication", "loom.com": "Communication",
  "spotify.com": "Media", "netflix.com": "Media", "youtube.com": "Media", "apple.com": "Media",
  "dropbox.com": "Storage", "google.com": "Storage", "icloud.com": "Storage",
  "substack.com": "Creator tools", "beehiiv.com": "Creator tools", "descript.com": "Creator tools", "riverside.fm": "Creator tools",
};

const GENERIC_SENDER_WORDS = /\b(team|billing|receipts?|support|no-?reply|noreply|notifications?|hello|hi|info|mail|payments?|invoices?|accounts?|the)\b/gi;

export function isInterval(value: unknown): value is Interval {
  return (INTERVALS as readonly string[]).includes(String(value));
}
export function isSubStatus(value: unknown): value is SubStatus {
  return (SUB_STATUSES as readonly string[]).includes(String(value));
}

/** Monthly-normalized cost for burn-rate math. */
export function monthlyCost(cost: number, interval: Interval) {
  switch (interval) {
    case "weekly": return cost * 52 / 12;
    case "quarterly": return cost / 3;
    case "yearly": return cost / 12;
    case "one_time": return 0;
    default: return cost;
  }
}

function toIso(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = String(value).trim().slice(0, 40);
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function optionalText(value: unknown, max: number) {
  const text = String(value ?? "").trim().slice(0, max);
  return text || null;
}

function safeUrl(value: unknown) {
  const text = optionalText(value, 500);
  if (!text) return null;
  try {
    const url = new URL(text);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function cleanSubscription(payload: SubscriptionPayload) {
  const serviceName = String(payload.serviceName ?? "").trim().slice(0, 80);
  if (!serviceName) throw new Error("Service name is required.");
  const cost = Number(payload.cost ?? 0);
  if (!Number.isFinite(cost) || cost < 0) throw new Error("Cost must be a non-negative number.");
  const currency = String(payload.currency ?? "USD").trim().toUpperCase().slice(0, 3) || "USD";
  return {
    serviceName,
    domain: optionalText(payload.domain, 120)?.toLowerCase() ?? null,
    category: String(payload.category ?? "Other").trim().slice(0, 40) || "Other",
    planName: optionalText(payload.planName, 80),
    costCents: Math.round(cost * 100),
    currency,
    billingInterval: isInterval(payload.billingInterval) ? payload.billingInterval : "monthly",
    nextRenewalDate: toIso(payload.nextRenewalDate),
    trialEndDate: toIso(payload.trialEndDate),
    cancelUrl: safeUrl(payload.cancelUrl),
    status: isSubStatus(payload.status) ? payload.status : "active",
    projectId: optionalText(payload.projectId, 64),
    appId: optionalText(payload.appId, 64),
  };
}

export function rowToSubscription(row: Record<string, unknown>): Subscription {
  return {
    id: String(row.id),
    serviceName: String(row.service_name),
    domain: row.domain ? String(row.domain) : null,
    category: String(row.category ?? "Other"),
    planName: row.plan_name ? String(row.plan_name) : null,
    cost: Number(row.cost_cents ?? 0) / 100,
    currency: String(row.currency ?? "USD"),
    billingInterval: isInterval(row.billing_interval) ? row.billing_interval : "monthly",
    nextRenewalDate: row.next_renewal_date ? String(row.next_renewal_date) : null,
    trialEndDate: row.trial_end_date ? String(row.trial_end_date) : null,
    cancelUrl: row.cancel_url ? String(row.cancel_url) : null,
    status: isSubStatus(row.status) ? row.status : "active",
    projectId: row.project_id ? String(row.project_id) : null,
    appId: row.app_id ? String(row.app_id) : null,
    lastDetectedAt: row.last_detected_at ? String(row.last_detected_at) : null,
    signalCount: Number(row.signal_count ?? 0),
    updatedAt: String(row.updated_at ?? ""),
  };
}

export function rowToSignal(row: Record<string, unknown>): Signal {
  const kind = String(row.kind);
  return {
    id: String(row.id),
    subscriptionId: String(row.subscription_id),
    kind: (SIGNAL_KINDS as readonly string[]).includes(kind) ? (kind as SignalKind) : "unknown",
    source: String(row.source ?? "gmail"),
    senderDomain: row.sender_domain ? String(row.sender_domain) : null,
    subject: String(row.subject ?? ""),
    amount: row.amount_cents == null ? null : Number(row.amount_cents) / 100,
    currency: row.currency ? String(row.currency) : null,
    billingInterval: isInterval(row.billing_interval) ? row.billing_interval : null,
    renewalDate: row.renewal_date ? String(row.renewal_date) : null,
    trialEndDate: row.trial_end_date ? String(row.trial_end_date) : null,
    cancelUrl: row.cancel_url ? String(row.cancel_url) : null,
    confidence: Number(row.confidence ?? 0),
    detectedAt: String(row.detected_at ?? ""),
  };
}

// ---------- email parsing ----------

/** FNV-1a 32-bit — stable, dependency-free content hash for de-duplication (not for security). */
export function fnv1a(input: string) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function senderDomain(from: string) {
  const match = /@([a-z0-9.-]+\.[a-z]{2,})/i.exec(from);
  if (!match) return null;
  const labels = match[1]!.toLowerCase().split(".");
  return labels.slice(-2).join(".");
}

export function serviceNameFromSender(from: string) {
  const display = from.replace(/<[^>]*>/, "").replace(/["']/g, "").trim();
  const cleaned = display.replace(GENERIC_SENDER_WORDS, "").replace(/[|,@•·-]+$/g, "").replace(/\s{2,}/g, " ").trim();
  if (cleaned && !/@/.test(cleaned)) return cleaned.slice(0, 80);
  const domain = senderDomain(from);
  if (!domain) return "Unknown service";
  const label = domain.split(".")[0]!;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const MONTHS = "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
const DATE_PATTERN = `(\\d{4}-\\d{2}-\\d{2}|(?:${MONTHS})\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4}|\\d{1,2}(?:st|nd|rd|th)?\\s+(?:${MONTHS})\\.?,?\\s+\\d{4}|\\d{1,2}/\\d{1,2}/\\d{4})`;

function parseDateToken(token: string): string | null {
  const cleaned = token.replace(/(\d)(st|nd|rd|th)/g, "$1").replace(/\./g, "");
  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(cleaned);
  if (slash) return toIso(`${slash[3]}-${slash[1]!.padStart(2, "0")}-${slash[2]!.padStart(2, "0")}`);
  return toIso(cleaned.includes("-") ? cleaned : `${cleaned} UTC`);
}

function findDate(text: string, cueWords: string, messageDate: Date | null) {
  const cue = new RegExp(`(?:${cueWords})[^\\n]{0,60}?${DATE_PATTERN}`, "i");
  const match = cue.exec(text);
  if (match) return parseDateToken(match[1]!);
  const relative = new RegExp(`(?:${cueWords})[^\\n]{0,40}?in\\s+(\\d{1,3})\\s+days?`, "i").exec(text);
  if (relative && messageDate) {
    const date = new Date(messageDate.getTime() + Number(relative[1]) * 86_400_000);
    return date.toISOString().slice(0, 10);
  }
  return null;
}

function findAmount(text: string): { amountCents: number; currency: string } | null {
  const symbol = /(\$|US\$|USD|€|EUR|£|GBP)\s?(\d{1,5}(?:[.,]\d{2})?)/i.exec(text) ?? null;
  const trailing = /(\d{1,5}(?:[.,]\d{2})?)\s?(USD|EUR|GBP)\b/i.exec(text) ?? null;
  const raw = symbol ? symbol[2]! : trailing ? trailing[1]! : null;
  const unit = symbol ? symbol[1]! : trailing ? trailing[2]! : null;
  if (!raw || !unit) return null;
  const value = Number(raw.replace(",", "."));
  if (!Number.isFinite(value)) return null;
  const currency = /€|EUR/i.test(unit) ? "EUR" : /£|GBP/i.test(unit) ? "GBP" : "USD";
  return { amountCents: Math.round(value * 100), currency };
}

function findInterval(text: string): Interval | null {
  if (/\b(per|a|each|every)\s+year\b|\bannual(ly)?\b|\byearly\b|\/\s?y(ea)?r\b/i.test(text)) return "yearly";
  if (/\bquarter(ly)?\b|\bevery\s+3\s+months\b/i.test(text)) return "quarterly";
  if (/\b(per|a|each|every)\s+month\b|\bmonthly\b|\/\s?mo(nth)?\b/i.test(text)) return "monthly";
  if (/\b(per|a|each|every)\s+week\b|\bweekly\b|\/\s?wk\b/i.test(text)) return "weekly";
  if (/\bone[- ]time\b|\blifetime\b/i.test(text)) return "one_time";
  return null;
}

function findCancelUrl(text: string) {
  const urls = text.match(/https?:\/\/[^\s<>"')\]]+/gi) ?? [];
  const preferred = urls.find((url) => /cancel|unsubscribe|manage|billing|subscription|account/i.test(url));
  return safeUrl(preferred ?? null);
}

function findPlan(text: string) {
  const match = /\b(Pro|Plus|Premium|Team|Business|Enterprise|Starter|Basic|Personal|Creator|Studio|Max|Ultimate)\b(?:\s+(?:plan|tier|subscription))?/i.exec(text);
  return match ? match[1]!.charAt(0).toUpperCase() + match[1]!.slice(1).toLowerCase() : null;
}

function classify(text: string): SignalKind {
  if (/\b(cancel(l)?ed|cancellation confirmed|subscription (has )?ended|we're sorry to see you go)\b/i.test(text)) return "cancellation";
  if (/\b(free )?trial\b/i.test(text) && /\b(end|ending|ends|expire|expiring|expires|over|convert|days? left)\b/i.test(text)) return "trial";
  if (/\bprice (change|increase|update)\b|\bnew price\b/i.test(text)) return "price_change";
  if (/\b(receipt|invoice|payment (received|confirmation|successful)|thanks for your payment|(was|were|has been) charged|order confirmation)\b/i.test(text)) return "receipt";
  if (/\b(renew(s|al|ed|ing)?|upcoming charge|will be charged|next (billing|payment)|auto-?renew)\b/i.test(text)) return "renewal";
  return "unknown";
}

/**
 * Turn an email's metadata (+ body, in memory only) into a structured signal.
 * The returned object contains no free text beyond the truncated subject line.
 */
export function parseEmail(input: EmailInput): ParsedSignal {
  const from = String(input.from ?? "").slice(0, 300);
  const subject = String(input.subject ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
  const text = `${subject}\n${String(input.snippet ?? "")}\n${String(input.body ?? "")}`.replace(/<[^>]+>/g, " ").replace(/&nbsp;|&amp;/g, " ").slice(0, 50_000);
  const messageDate = input.date ? new Date(input.date) : null;
  const validDate = messageDate && !Number.isNaN(messageDate.getTime()) ? messageDate : null;

  const kind = classify(text);
  const amount = findAmount(text);
  const billingInterval = findInterval(text);
  const trialEndDate = kind === "trial" || /\btrial\b/i.test(text) ? findDate(text, "trial (?:ends?|expires?|will end|is ending|period ends)|ends?|expires?", validDate) : null;
  const renewalDate = findDate(text, "renews?|renewal(?: date)?|next (?:billing|payment|charge)(?: date)?|will be (?:charged|billed)|due", validDate)
    ?? (kind === "renewal" ? findDate(text, "on", validDate) : null);
  const domain = senderDomain(from);
  const hashSource = input.id ? `id:${input.id}` : `${from}|${subject}|${input.date ?? ""}`;

  let confidence = 20;
  if (kind !== "unknown") confidence += 25;
  if (amount) confidence += 25;
  if (billingInterval) confidence += 15;
  if (renewalDate || trialEndDate) confidence += 15;

  return {
    messageHash: fnv1a(hashSource),
    kind,
    serviceName: serviceNameFromSender(from),
    senderDomain: domain,
    category: (domain && CATEGORY_BY_DOMAIN[domain]) || "Other",
    subject,
    planName: findPlan(text),
    amountCents: amount?.amountCents ?? null,
    currency: amount?.currency ?? null,
    billingInterval,
    renewalDate,
    trialEndDate,
    cancelUrl: findCancelUrl(text),
    confidence: Math.min(100, confidence),
  };
}

/** Status a subscription should move to after a signal (null = leave unchanged). */
export function statusAfterSignal(kind: SignalKind): SubStatus | null {
  if (kind === "cancellation") return "canceled";
  if (kind === "trial") return "trialing";
  if (kind === "receipt" || kind === "renewal") return "active";
  return null;
}

export function daysUntil(iso: string | null, now = new Date()) {
  if (!iso) return null;
  const target = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(target.getTime())) return null;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((target.getTime() - today) / 86_400_000);
}
