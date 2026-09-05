import { unauthorized, userEmail } from "../shared";

type Candidate = { input: string; name: string; website?: string; description: string; category: string; status: "Needs Review"; cost: number; projects: string[]; sources: string[]; last: string; confidence: number; initials: string; tone: string; error?: string };

const categoryRules: Array<[string, RegExp]> = [
  ["Design", /\b(design|prototype|creative|graphics|interface|ux|ui|canvas)\b/i],
  ["AI", /\b(ai|artificial(?:\s+\w+){0,2}\s+intelligence|machine learning|llm|generative|copilot)\b/i],
  ["Development", /\b(developer|api|code|software|database|backend|frontend|repository|cloud platform)\b/i],
  ["Analytics", /\b(analytics|observability|monitoring|insights|metrics|data platform)\b/i],
  ["Marketing", /\b(marketing|campaign|seo|content|audience|sales)\b/i],
  ["Productivity", /\b(productivity|workspace|notes|calendar|meeting|collaboration|tasks)\b/i],
  ["Finance", /\b(payment|finance|accounting|billing|banking|expense|payroll)\b/i],
  ["Infrastructure", /\b(hosting|deploy|infrastructure|server|compute|cdn|cloud)\b/i],
  ["Research", /\b(research|search engine|knowledge|answers)\b/i],
];

function meta(html: string, key: string) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`, "i"),
  ];
  return patterns.map((pattern) => html.match(pattern)?.[1]).find(Boolean)?.trim();
}

function decode(value: string) {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
}

function safeUrl(raw: string) {
  const value = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const url = new URL(value);
  if (!/^https?:$/.test(url.protocol)) throw new Error("Only public websites can be checked.");
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || /^(127\.|10\.|192\.168\.|169\.254\.)/.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host) || host === "0.0.0.0" || host === "::1") throw new Error("That address is not a public website.");
  return url;
}

function parseInput(input: string) {
  const parts = input.split("|").map((part) => part.trim()).filter(Boolean);
  const websitePart = parts.find((part) => /^(https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/.*)?$/i.test(part));
  const namePart = parts.find((part) => part !== websitePart);
  return { namePart, websitePart };
}

async function enrich(input: string): Promise<Candidate> {
  const { namePart, websitePart } = parseInput(input);
  const fallbackName = namePart || websitePart?.replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[./]/)[0].replace(/[-_]/g, " ") || input;
  const base = { input, name: fallbackName.replace(/\b\w/g, (letter) => letter.toUpperCase()), description: "", category: "Other", status: "Needs Review" as const, cost: 0, projects: [], sources: ["Website"], last: "Enriched today", confidence: 45, initials: fallbackName.slice(0, 2).toUpperCase(), tone: "blue" };
  if (!websitePart) return { ...base, sources: ["Manual"], error: "Add the official website after the name, separated by |, to pull company information." };
  try {
    const requested = safeUrl(websitePart);
    const response = await fetch(requested, { redirect: "follow", headers: { "user-agent": "StackdCompanyProfile/1.0", accept: "text/html,application/xhtml+xml" }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`Website returned ${response.status}.`);
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) throw new Error("Website did not return a readable company page.");
    const html = (await response.text()).slice(0, 500_000);
    const title = meta(html, "og:site_name") || meta(html, "application-name") || meta(html, "og:title") || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
    const description = meta(html, "og:description") || meta(html, "description") || meta(html, "twitter:description") || "";
    const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1];
    const finalUrl = safeUrl(canonical ? new URL(canonical, response.url).toString() : response.url);
    const cleanTitle = title ? decode(title).replace(/\s+[|–—-]\s+.*$/, "").slice(0, 120) : base.name;
    const cleanDescription = description ? decode(description).slice(0, 600) : "Company information pulled from the official website. Add a summary if the site did not publish one.";
    const haystack = `${cleanTitle} ${cleanDescription}`;
    const category = categoryRules.find(([, pattern]) => pattern.test(haystack))?.[0] ?? "Other";
    return { ...base, name: namePart || cleanTitle, initials: (namePart || cleanTitle).slice(0, 2).toUpperCase(), website: finalUrl.hostname.replace(/^www\./, ""), description: cleanDescription, category, confidence: description ? 90 : 70 };
  } catch (error) { return { ...base, website: websitePart.replace(/^https?:\/\//, "").split("/")[0], error: error instanceof Error ? error.message : "Unable to read that website." }; }
}

export async function POST(request: Request) {
  const email = userEmail(request);
  if (!email) return unauthorized();
  try {
    const body = await request.json() as { entries?: unknown[] };
    const entries = (Array.isArray(body.entries) ? body.entries : []).map(String).map((entry) => entry.trim()).filter(Boolean).slice(0, 50);
    if (!entries.length) return Response.json({ error: "Add at least one app name or website." }, { status: 400 });
    const candidates: Candidate[] = [];
    for (let index = 0; index < entries.length; index += 5) candidates.push(...await Promise.all(entries.slice(index, index + 5).map(enrich)));
    return Response.json({ candidates });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Unable to enrich apps." }, { status: 400 }); }
}
