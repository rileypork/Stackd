export type AppPayload = {
  id?: string;
  name?: string;
  initials?: string;
  tone?: string;
  website?: string;
  description?: string;
  category?: string;
  status?: string;
  cost?: number;
  billingFrequency?: string;
  renewalDate?: string;
  trialStartDate?: string;
  trialEndDate?: string;
  cancellationDate?: string;
  accessEndDate?: string;
  projects?: string[];
  sources?: string[];
  last?: string;
  confidence?: number;
  notes?: string;
};

export const STATUSES = ["Active", "Trialing", "Saved", "Inactive", "Needs Review"] as const;
export type Status = (typeof STATUSES)[number];

export function isStatus(value: unknown): value is Status {
  return (STATUSES as readonly string[]).includes(String(value));
}

export function userEmailFromRequest(request: Request): string | null {
  const email = request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase();
  if (email) return email;
  const host = new URL(request.url).hostname;
  return host === "localhost" || host === "127.0.0.1" ? "local@stackd.dev" : null;
}

export function cleanPayload(payload: AppPayload) {
  const name = String(payload.name ?? "").trim().slice(0, 120);
  if (!name) throw new Error("App name is required.");
  const status: Status = isStatus(payload.status) ? payload.status : "Needs Review";
  const cost = Number.isFinite(Number(payload.cost)) ? Math.max(0, Math.round(Number(payload.cost) * 100)) : 0;
  const text = (value: unknown, max = 500) => String(value ?? "").trim().slice(0, max) || null;
  const list = (value: unknown, fallback: string[]) => Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean).slice(0, 30) : fallback;
  return {
    name,
    initials: text(payload.initials, 4) ?? name.slice(0, 2).toUpperCase(),
    tone: text(payload.tone, 20) ?? "blue",
    website: text(payload.website, 300),
    description: text(payload.description, 600) ?? "",
    category: text(payload.category, 80) ?? "Other",
    status,
    monthlyCostCents: cost,
    billingFrequency: text(payload.billingFrequency, 40),
    renewalDate: text(payload.renewalDate, 40),
    trialStartDate: text(payload.trialStartDate, 40),
    trialEndDate: text(payload.trialEndDate, 40),
    cancellationDate: text(payload.cancellationDate, 40),
    accessEndDate: text(payload.accessEndDate, 40),
    projectsJson: JSON.stringify(list(payload.projects, [])),
    sourcesJson: JSON.stringify(list(payload.sources, ["Manual"])),
    lastActivity: text(payload.last, 120),
    confidence: Math.min(100, Math.max(0, Math.round(Number(payload.confidence ?? 100)))),
    notes: text(payload.notes, 4000) ?? "",
  };
}

export function rowToApp(row: Record<string, unknown>) {
  const parseList = (value: unknown) => {
    try {
      const parsed = JSON.parse(String(value ?? "[]"));
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch { return []; }
  };
  return {
    id: String(row.id), name: String(row.name), initials: String(row.initials), tone: String(row.tone),
    website: row.website ? String(row.website) : undefined, description: String(row.description ?? ""),
    category: String(row.category), status: isStatus(row.status) ? row.status : "Needs Review",
    cost: Number(row.monthly_cost_cents ?? 0) / 100,
    billingFrequency: row.billing_frequency ? String(row.billing_frequency) : undefined,
    renewalDate: row.renewal_date ? String(row.renewal_date) : undefined,
    trialStartDate: row.trial_start_date ? String(row.trial_start_date) : undefined,
    trialEndDate: row.trial_end_date ? String(row.trial_end_date) : undefined,
    cancellationDate: row.cancellation_date ? String(row.cancellation_date) : undefined,
    accessEndDate: row.access_end_date ? String(row.access_end_date) : undefined,
    projects: parseList(row.projects_json), sources: parseList(row.sources_json),
    last: row.last_activity ? String(row.last_activity) : "No activity yet",
    confidence: Number(row.confidence ?? 100), notes: String(row.notes ?? ""),
  };
}
