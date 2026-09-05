"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Status = "Active" | "Trialing" | "Saved" | "Inactive" | "Needs Review";
type View = "Home" | "My Stack" | "Projects" | "Stack Map" | "Trials" | "Subscriptions" | "Saved" | "Inbox" | "Ask Stackd" | "Settings";
type AppItem = {
  id: number | string;
  name: string;
  initials: string;
  tone: string;
  description: string;
  category: string;
  status: Status;
  cost: number;
  projects: string[];
  sources: string[];
  last: string;
  confidence: number;
  website?: string;
  billingFrequency?: string;
  renewalDate?: string;
  trialStartDate?: string;
  trialEndDate?: string;
  cancellationDate?: string;
  accessEndDate?: string;
  notes?: string;
};
type EnrichedCandidate = AppItem & { input: string; error?: string };

const seedApps: AppItem[] = [
  { id: 1, name: "OpenAI", initials: "◎", tone: "ink", description: "AI models and developer platform", category: "AI", status: "Active", cost: 42, projects: ["Rally", "Object Report"], sources: ["GitHub", "Gmail"], last: "Today", confidence: 98, website: "openai.com" },
  { id: 2, name: "Anthropic", initials: "A", tone: "sand", description: "AI research and Claude models", category: "AI", status: "Active", cost: 20, projects: ["Rally"], sources: ["GitHub", "Gmail"], last: "Today", confidence: 96, website: "anthropic.com" },
  { id: 3, name: "Supabase", initials: "S", tone: "mint", description: "Database and backend platform", category: "Development", status: "Active", cost: 25, projects: ["Rally", "Object Report"], sources: ["Google", "Gmail", "GitHub"], last: "Today", confidence: 98, website: "supabase.com" },
  { id: 4, name: "Railway", initials: "R", tone: "violet", description: "Application deployment platform", category: "Infrastructure", status: "Active", cost: 34, projects: ["Rally"], sources: ["GitHub", "Gmail"], last: "Yesterday", confidence: 94, website: "railway.com" },
  { id: 5, name: "Vercel", initials: "▲", tone: "ink", description: "Frontend cloud and deployments", category: "Infrastructure", status: "Active", cost: 20, projects: ["Object Report"], sources: ["GitHub"], last: "2 days ago", confidence: 91, website: "vercel.com" },
  { id: 6, name: "Cursor", initials: "C", tone: "charcoal", description: "AI-native code editor", category: "Development", status: "Trialing", cost: 20, projects: ["Personal Tools"], sources: ["Gmail"], last: "Today", confidence: 88, website: "cursor.com" },
  { id: 7, name: "Figma", initials: "F", tone: "coral", description: "Collaborative product design", category: "Design", status: "Active", cost: 15, projects: ["Rally", "Object Report"], sources: ["Google", "Gmail"], last: "Yesterday", confidence: 95, website: "figma.com" },
  { id: 8, name: "Granola", initials: "G", tone: "amber", description: "AI-powered meeting notes", category: "Productivity", status: "Active", cost: 18, projects: ["Personal Tools"], sources: ["Gmail"], last: "Today", confidence: 89, website: "granola.ai" },
  { id: 9, name: "Mapbox", initials: "M", tone: "blue", description: "Maps, navigation, and location", category: "Development", status: "Active", cost: 12, projects: ["Rally"], sources: ["GitHub"], last: "3 days ago", confidence: 87, website: "mapbox.com" },
  { id: 10, name: "Langfuse", initials: "L", tone: "indigo", description: "LLM observability and tracing", category: "Analytics", status: "Active", cost: 29, projects: ["Rally"], sources: ["GitHub"], last: "Today", confidence: 93, website: "langfuse.com" },
  { id: 11, name: "Arcade", initials: "A", tone: "blue", description: "Interactive product demos", category: "Marketing", status: "Trialing", cost: 32, projects: ["Object Report"], sources: ["Gmail"], last: "Yesterday", confidence: 84, website: "arcade.software" },
  { id: 12, name: "Perplexity", initials: "P", tone: "teal", description: "AI answer engine and research", category: "Research", status: "Saved", cost: 0, projects: [], sources: ["Manual"], last: "Saved Aug 24", confidence: 100, website: "perplexity.ai" },
  { id: 13, name: "Lovable", initials: "L", tone: "pink", description: "AI application builder", category: "Development", status: "Saved", cost: 0, projects: ["New Startup Idea"], sources: ["Manual"], last: "Saved Aug 21", confidence: 100, website: "lovable.dev" },
  { id: 14, name: "PostHog", initials: "H", tone: "yellow", description: "Product analytics platform", category: "Analytics", status: "Needs Review", cost: 0, projects: [], sources: ["GitHub"], last: "19 days ago", confidence: 61, website: "posthog.com" },
  { id: 15, name: "Jasper", initials: "J", tone: "lilac", description: "AI marketing content platform", category: "Marketing", status: "Inactive", cost: 49, projects: [], sources: ["Gmail"], last: "4 months ago", confidence: 41, website: "jasper.ai" },
  { id: 16, name: "Stripe", initials: "S", tone: "indigo", description: "Payments and billing infrastructure", category: "Finance", status: "Active", cost: 0, projects: ["Object Report"], sources: ["GitHub"], last: "Yesterday", confidence: 92, website: "stripe.com" },
];

const nav: { label: View; glyph: string; count?: string }[] = [
  { label: "Home", glyph: "⌂" }, { label: "My Stack", glyph: "▦", count: "147" }, { label: "Projects", glyph: "◫", count: "4" },
  { label: "Stack Map", glyph: "⌁" }, { label: "Trials", glyph: "◷", count: "8" }, { label: "Subscriptions", glyph: "$", count: "34" }, { label: "Saved", glyph: "◇", count: "31" },
  { label: "Inbox", glyph: "↧", count: "17" },
];

const discoveries = [
  { name: "Linear", initials: "L", tone: "charcoal", source: "Gmail", confidence: 96, detail: "Workspace notification detected today" },
  { name: "Gamma", initials: "G", tone: "lilac", source: "Gmail", confidence: 88, detail: "Account welcome email · Aug 22" },
  { name: "Supabase", initials: "S", tone: "mint", source: "Gmail", confidence: 98, detail: "Billing receipt and project notification" },
  { name: "Granola", initials: "G", tone: "amber", source: "Gmail", confidence: 91, detail: "5 recent meeting summaries" },
];

const trialData = [
  { name: "Cursor", days: 1, date: "Sep 2", cost: 20, active: "Used today", tone: "charcoal", initials: "C" },
  { name: "Arcade", days: 3, date: "Sep 4", cost: 32, active: "Used yesterday", tone: "blue", initials: "A" },
  { name: "Clay", days: 6, date: "Sep 7", cost: 149, active: "No activity in 8 days", tone: "mint", initials: "C" },
  { name: "Framer", days: 12, date: "Sep 13", cost: 30, active: "Used 4 days ago", tone: "ink", initials: "F" },
];

const subscriptionData = [
  { name: "OpenAI", initials: "◎", tone: "ink", state: "Active", cost: 42, cadence: "Monthly", renewal: "Sep 18", lastPayment: "Aug 18", activity: "Used today", project: "Rally" },
  { name: "Railway", initials: "R", tone: "violet", state: "Active", cost: 34, cadence: "Monthly", renewal: "Sep 12", lastPayment: "Aug 12", activity: "Used yesterday", project: "Rally" },
  { name: "Supabase", initials: "S", tone: "mint", state: "Active", cost: 25, cadence: "Monthly", renewal: "Sep 21", lastPayment: "Aug 21", activity: "Used today", project: "Rally" },
  { name: "Figma", initials: "F", tone: "coral", state: "Active", cost: 15, cadence: "Monthly", renewal: "Sep 9", lastPayment: "Aug 9", activity: "Used yesterday", project: "Object Report" },
  { name: "Granola", initials: "G", tone: "amber", state: "Active", cost: 18, cadence: "Monthly", renewal: "Sep 26", lastPayment: "Aug 26", activity: "Used today", project: "Personal Tools" },
  { name: "Jasper", initials: "J", tone: "lilac", state: "Inactive", cost: 49, cadence: "Monthly", canceled: "Aug 14", lastPayment: "Jul 14", accessEnds: "Ended Aug 14", activity: "Last used Apr 19", project: "Unassigned" },
  { name: "Canva", initials: "C", tone: "blue", state: "Inactive", cost: 15, cadence: "Monthly", canceled: "Jul 28", lastPayment: "Jun 28", accessEnds: "Ended Jul 28", activity: "Last used Jun 4", project: "Personal Tools" },
  { name: "Notion", initials: "N", tone: "ink", state: "Inactive", cost: 10, cadence: "Monthly", canceled: "Jun 3", lastPayment: "May 3", accessEnds: "Ended Jun 3", activity: "Last used May 17", project: "Personal Tools" },
  { name: "Slack", initials: "S", tone: "coral", state: "Inactive", cost: 8, cadence: "Monthly", canceled: "May 22", lastPayment: "Apr 22", accessEnds: "Ended May 22", activity: "Last used Apr 30", project: "Agency Work" },
];

const projectData = [
  { name: "Rally", description: "AI-powered local companion", tools: 7, cost: 184, active: 7, updated: "Today", accent: "cobalt", appNames: ["OpenAI", "Supabase", "Railway", "Mapbox", "Langfuse", "Anthropic"] },
  { name: "Object Report", description: "Editorial commerce and product stories", tools: 9, cost: 112, active: 6, updated: "Yesterday", accent: "coral", appNames: ["OpenAI", "Supabase", "Vercel", "Figma", "Stripe"] },
  { name: "Personal Tools", description: "Everyday creative and productivity system", tools: 18, cost: 126, active: 12, updated: "Today", accent: "amber", appNames: ["Cursor", "Granola", "Figma", "Perplexity"] },
  { name: "New Startup Idea", description: "Early-stage experiments and research", tools: 5, cost: 64, active: 2, updated: "Aug 28", accent: "mint", appNames: ["Lovable", "Perplexity", "OpenAI"] },
];

const mapSeed = [
  { id: 1, name: "GitHub", initials: "GH", tone: "ink", x: 70, y: 80, category: "Source", cost: 0 },
  { id: 2, name: "Railway", initials: "R", tone: "violet", x: 320, y: 180, category: "Hosts", cost: 34 },
  { id: 3, name: "Supabase", initials: "S", tone: "mint", x: 595, y: 76, category: "Database", cost: 25 },
  { id: 4, name: "OpenAI", initials: "◎", tone: "ink", x: 595, y: 250, category: "AI", cost: 42 },
  { id: 5, name: "Sendblue", initials: "SB", tone: "blue", x: 862, y: 110, category: "Messaging", cost: 42 },
  { id: 6, name: "Mapbox", initials: "M", tone: "teal", x: 862, y: 280, category: "Maps", cost: 12 },
  { id: 7, name: "Langfuse", initials: "L", tone: "indigo", x: 595, y: 425, category: "Analytics", cost: 29 },
];

const mapEdges: [number, number, string][] = [[1,2,"Deploys"],[2,3,"Database"],[2,4,"API"],[2,5,"Messaging"],[2,6,"Maps"],[4,7,"Traces"]];

const brandLogoSlugs: Record<string, string> = {
  OpenAI: "openai", Anthropic: "anthropic", Supabase: "supabase", Railway: "railway", Vercel: "vercel",
  Cursor: "cursor", Figma: "figma", Granola: "granola", Mapbox: "mapbox", Langfuse: "langfuse",
  Arcade: "arcade", Perplexity: "perplexity", Lovable: "lovable", PostHog: "posthog", Jasper: "jasper",
  Stripe: "stripe", Linear: "linear", Gamma: "gamma", Clay: "clay", Framer: "framer", Resend: "resend",
  GitHub: "github", Sendblue: "sendblue", Canva: "canva", Notion: "notion", Slack: "slack", "Google Account": "google", Google: "google", Gmail: "gmail", "Gmail inboxes": "gmail",
};

function Logo({ item, small = false }: { item: { name?: string; initials: string; tone: string; website?: string }; small?: boolean }) {
  const [failed, setFailed] = useState(false);
  const slug = item.name ? brandLogoSlugs[item.name] : undefined;
  const remoteDomain = item.website?.replace(/^https?:\/\//, "").split("/")[0];
  const source = slug ? `/logos/${slug}.png` : remoteDomain ? `https://www.google.com/s2/favicons?domain_url=https://${encodeURIComponent(remoteDomain)}&sz=128` : null;

  return <span className={`logo tone-${item.tone} ${source && !failed ? "has-image" : ""} ${small ? "logo-small" : ""}`}>
    {source && !failed ? <img src={source} alt={`${item.name ?? "App"} logo`} onError={() => setFailed(true)} /> : item.initials}
  </span>;
}

function StatusBadge({ status }: { status: Status }) {
  return <span className={`status status-${status.toLowerCase().replace(" ", "-")}`}>{status}</span>;
}

export default function StackdApp() {
  const [view, setView] = useState<View>("Home");
  const [apps, setApps] = useState<AppItem[]>([]);
  const [dataReady, setDataReady] = useState(false);
  const [dataError, setDataError] = useState("");
  const [selectedApp, setSelectedApp] = useState<AppItem | null>(null);
  const [editingApp, setEditingApp] = useState<AppItem | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [categoryFilter, setCategoryFilter] = useState("All categories");
  const [grid, setGrid] = useState(true);
  const [dark, setDark] = useState(false);
  const [modal, setModal] = useState(false);
  const [smartUpload, setSmartUpload] = useState(false);
  const [toast, setToast] = useState("");
  const [inboxCount, setInboxCount] = useState(0);
  const [chat, setChat] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [mapNodes, setMapNodes] = useState(mapSeed);
  const [mapMode, setMapMode] = useState<"Project Map" | "Entire Stack">("Project Map");
  const [dragging, setDragging] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/apps")
      .then(async (response) => {
        const body = await response.json() as { apps?: AppItem[]; error?: string };
        if (!response.ok) throw new Error(body.error ?? "Unable to load your apps.");
        if (active) setApps(body.apps ?? []);
      })
      .catch((error) => { if (active) setDataError(error instanceof Error ? error.message : "Unable to load your apps."); })
      .finally(() => { if (active) setDataReady(true); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => apps.filter((app) => {
    const q = search.toLowerCase();
    return (!q || `${app.name} ${app.description} ${app.category}`.toLowerCase().includes(q)) &&
      (statusFilter === "All statuses" || app.status === statusFilter) &&
      (categoryFilter === "All categories" || app.category === categoryFilter);
  }), [apps, search, statusFilter, categoryFilter]);

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  }

  function navigate(next: View) {
    setSelectedApp(null);
    setView(next);
  }

  function openApp(app: AppItem) {
    setSelectedApp(app);
  }

  async function createApp(app: AppItem) {
    const response = await fetch("/api/apps", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(app) });
    const body = await response.json() as { app?: AppItem; error?: string };
    if (!response.ok || !body.app) throw new Error(body.error ?? "Unable to add app.");
    setApps((previous) => [body.app!, ...previous]);
    return body.app;
  }

  async function updateApp(app: AppItem) {
    const response = await fetch(`/api/apps/${encodeURIComponent(String(app.id))}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(app) });
    const body = await response.json() as { app?: AppItem; error?: string };
    if (!response.ok || !body.app) throw new Error(body.error ?? "Unable to update app.");
    setApps((previous) => previous.map((item) => item.id === app.id ? body.app! : item));
    setSelectedApp(body.app);
    return body.app;
  }

  async function deleteApp(app: AppItem) {
    if (!window.confirm(`Remove ${app.name} from your Stackd library?`)) return;
    const response = await fetch(`/api/apps/${encodeURIComponent(String(app.id))}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Unable to remove app.");
    setApps((previous) => previous.filter((item) => item.id !== app.id));
    setSelectedApp(null);
    flash(`${app.name} was removed.`);
  }

  async function importApps(file: File) {
    const raw = await file.text();
    let importedApps: Partial<AppItem>[] = [];
    if (file.name.toLowerCase().endsWith(".json")) {
      const parsed = JSON.parse(raw) as unknown;
      importedApps = Array.isArray(parsed) ? parsed : Array.isArray((parsed as { apps?: unknown[] }).apps) ? (parsed as { apps: Partial<AppItem>[] }).apps : [];
    } else {
      const rows = raw.split(/\r?\n/).filter(Boolean).map(parseCsvRow);
      const headers = (rows.shift() ?? []).map((header) => header.trim().toLowerCase());
      importedApps = rows.map((row) => {
        const record = Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""]));
        return { name: record.name, website: record.website || record.url, description: record.description, category: record.category || "Other", status: record.status || "Needs Review", cost: Number(record.monthly_cost || record.cost || 0), billingFrequency: record.billing_frequency || "Monthly", renewalDate: record.renewal_date, projects: record.project ? [record.project] : [], notes: record.notes, sources: ["Import"], last: "Imported today", confidence: 100 };
      });
    }
    const response = await fetch("/api/apps/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ apps: importedApps }) });
    const body = await response.json() as { apps?: AppItem[]; imported?: number; skipped?: number; error?: string };
    if (!response.ok) throw new Error(body.error ?? "Import failed.");
    setApps(body.apps ?? []);
    flash(`${body.imported ?? 0} apps imported${body.skipped ? ` · ${body.skipped} skipped` : ""}.`);
  }

  function exportApps() {
    const fields = ["name", "website", "description", "category", "status", "monthly_cost", "billing_frequency", "renewal_date", "project", "notes"];
    const rows = apps.map((app) => [app.name, app.website ?? "", app.description, app.category, app.status, app.cost, app.billingFrequency ?? "", app.renewalDate ?? "", app.projects.join(" | "), app.notes ?? ""]);
    const csv = [fields, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = `stackd-apps-${new Date().toISOString().slice(0, 10)}.csv`; link.click();
    URL.revokeObjectURL(url);
    flash("Your Stackd library was exported.");
  }

  function ask(question: string) {
    if (!question.trim()) return;
    const q = question.trim();
    const spend = apps.filter((app) => app.status !== "Inactive").reduce((sum, app) => sum + app.cost, 0);
    const paid = apps.filter((app) => app.cost > 0 && app.status !== "Inactive");
    const inactive = apps.filter((app) => app.status === "Inactive");
    const trials = apps.filter((app) => app.status === "Trialing");
    let answer = `Your live Stackd library contains ${apps.length} tool${apps.length === 1 ? "" : "s"}. Ask about spend, trials, projects, or inactive subscriptions.`;
    if (/spend|paying|cost/i.test(q)) answer = `You’re currently tracking $${spend.toFixed(0)}/month across ${paid.length} paid active subscription${paid.length === 1 ? "" : "s"}.`;
    if (/trial/i.test(q)) answer = trials.length ? `You have ${trials.length} trial${trials.length === 1 ? "" : "s"}: ${trials.map((app) => `${app.name}${app.trialEndDate ? ` ending ${app.trialEndDate}` : ""}`).join(", ")}.` : "You don’t have any trials in your live library yet.";
    if (/rally/i.test(q)) { const rally = apps.filter((app) => app.projects.includes("Rally")); answer = `Rally currently has ${rally.length} tracked tool${rally.length === 1 ? "" : "s"} costing $${rally.reduce((sum, app) => sum + app.cost, 0).toFixed(0)}/month: ${rally.map((app) => app.name).join(", ") || "none yet"}.`; }
    if (/not using|unused|inactive/i.test(q)) answer = inactive.length ? `You have ${inactive.length} inactive tool${inactive.length === 1 ? "" : "s"}: ${inactive.map((app) => `${app.name}${app.cost ? ` ($${app.cost}/month formerly)` : ""}`).join(", ")}.` : "You haven’t marked any apps inactive yet.";
    setChat((prev) => [...prev, { role: "user", text: q }, { role: "assistant", text: answer }]);
    setChatInput("");
  }

  const pageTitle = selectedApp ? selectedApp.name : view === "Home" ? "Your Stack" : view;
  const pageSubtitle = selectedApp ? selectedApp.description : ({
    Home: "Everything you use, try, pay for, and want to remember.",
    "My Stack": "Your complete software library, beautifully accounted for.",
    Projects: "The tools behind everything you’re building.",
    "Stack Map": "See how the technology in your digital life connects.",
    Trials: "Keep what earns its place. Cancel the rest in time.",
    Subscriptions: "Track what you pay for now—and what you’ve already left behind.",
    Saved: "Your software inspiration library.",
    Inbox: `${inboxCount} discoveries are waiting for your review.`,
    "Ask Stackd": "Ask questions about your tools, projects, spend, and usage.",
    Settings: "Connections, preferences, and discovery controls.",
  } as Record<View, string>)[view];

  return (
    <main className={`app-shell ${dark ? "theme-dark" : ""}`}>
      <aside className="sidebar">
        <button className="brand" onClick={() => navigate("Home")} aria-label="Stackd home"><span className="brand-mark">s</span><span>stackd</span><i>private beta</i></button>
        <nav className="primary-nav" aria-label="Primary navigation">
          {nav.map((item) => { const liveCount = item.label === "My Stack" ? apps.length : item.label === "Subscriptions" ? apps.filter((app) => app.cost > 0).length : item.label === "Trials" ? apps.filter((app) => app.status === "Trialing").length : item.label === "Saved" ? apps.filter((app) => app.status === "Saved").length : item.label === "Inbox" ? inboxCount : item.count; return <button key={item.label} className={view === item.label && !selectedApp ? "active" : ""} onClick={() => navigate(item.label)}><span className="nav-glyph">{item.glyph}</span><span>{item.label === "Inbox" ? "Inbox / Discoveries" : item.label}</span>{liveCount !== undefined && <em>{liveCount}</em>}</button>; })}
        </nav>
        <div className="nav-divider" />
        <button className={`ask-nav ${view === "Ask Stackd" ? "active" : ""}`} onClick={() => navigate("Ask Stackd")}><span className="spark">✦</span><span>Ask Stackd</span><kbd>⌘ K</kbd></button>
        <div className="sidebar-spacer" />
        <button className={`settings-link ${view === "Settings" ? "active" : ""}`} onClick={() => navigate("Settings")}><span>⚙</span> Settings</button>
        <div className="connection-health"><div><span className="connection-icon"><img src="/logos/gmail.png" alt="Gmail logo" /></span><span>Gmail</span><b>Source of truth</b></div></div>
        <div className="profile"><div className="avatar">RP</div><div><strong>Riley Porc</strong><span>Personal workspace</span></div><button aria-label="Profile menu">•••</button></div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <button className="mobile-brand" onClick={() => navigate("Home")}>stackd</button>
          <button className="command-search" onClick={() => { navigate("My Stack"); window.setTimeout(() => document.getElementById("stack-search")?.focus(), 50); }}><span>⌕</span> Search your stack… <kbd>⌘ K</kbd></button>
          <div className="top-actions"><button className="icon-button" aria-label="Toggle theme" onClick={() => setDark(!dark)}>{dark ? "☼" : "◐"}</button><button className="icon-button notification" aria-label="Notifications">♢<span /></button><button className="add-button" onClick={() => setModal(true)}>＋ Add App</button></div>
        </header>

        <div className="page-wrap">
          <header className="page-header">
            <div>{selectedApp && <button className="back-link" onClick={() => setSelectedApp(null)}>← Back to {view}</button>}<h1>{pageTitle}</h1><p>{pageSubtitle}</p></div>
            {view === "Home" && !selectedApp && <div className="last-sync"><span className="sync-dot" /> Private live library <button onClick={() => window.location.reload()}>↻</button></div>}
          </header>

          {selectedApp ? <AppDetail app={selectedApp} onAction={flash} onEdit={(app) => { setEditingApp(app); setModal(true); }} onDelete={async (app) => { try { await deleteApp(app); } catch (error) { flash(error instanceof Error ? error.message : "Unable to remove app."); } }} /> : <>
            {view === "Home" && <HomeView apps={apps} dataReady={dataReady} dataError={dataError} onNavigate={navigate} onOpenApp={(name) => { const app = apps.find((a) => a.name === name); if (app) openApp(app); }} onDiscover={async (item, status) => { try { const app = await createApp({ id: "", name: item.name, initials: item.initials, tone: item.tone, description: item.detail, category: "Other", status, cost: 0, projects: [], sources: [item.source], last: "Today", confidence: item.confidence }); flash(`${app.name} was added to your stack.`); } catch (error) { flash(error instanceof Error ? error.message : "Unable to add app."); } }} onAction={flash} />}
            {view === "My Stack" && <StackView apps={filtered} allApps={apps} dataReady={dataReady} dataError={dataError} search={search} setSearch={setSearch} statusFilter={statusFilter} setStatusFilter={setStatusFilter} categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter} grid={grid} setGrid={setGrid} onOpen={openApp} onImport={async (file) => { try { await importApps(file); } catch (error) { flash(error instanceof Error ? error.message : "Import failed."); } }} onExport={exportApps} onSmartUpload={() => setSmartUpload(true)} onAdd={() => { setEditingApp(null); setModal(true); }} />}
            {view === "Projects" && <ProjectsView onOpenApp={(name) => { const app = apps.find((a) => a.name === name); if (app) openApp(app); }} onMap={() => navigate("Stack Map")} />}
            {view === "Stack Map" && <MapView nodes={mapNodes} setNodes={setMapNodes} mode={mapMode} setMode={setMapMode} dragging={dragging} setDragging={setDragging} onOpen={(name) => { const app = apps.find((a) => a.name === name); if (app) openApp(app); }} onAction={flash} />}
            {view === "Trials" && <TrialsView apps={apps} onAction={flash} />}
            {view === "Subscriptions" && <SubscriptionsView apps={apps} onAction={flash} />}
            {view === "Saved" && <SavedView apps={apps.filter((a) => a.status === "Saved")} onOpen={openApp} onAdd={() => setModal(true)} />}
            {view === "Inbox" && <InboxView count={inboxCount} setCount={setInboxCount} onAction={flash} />}
            {view === "Ask Stackd" && <AskView chat={chat} input={chatInput} setInput={setChatInput} ask={ask} />}
            {view === "Settings" && <SettingsView dark={dark} setDark={setDark} onAction={flash} />}
          </>}
        </div>
      </section>

      {modal && <AddAppModal initialApp={editingApp} onClose={() => { setModal(false); setEditingApp(null); }} onAdd={async (app) => { try { const saved = editingApp ? await updateApp({ ...app, id: editingApp.id }) : await createApp(app); setModal(false); setEditingApp(null); navigate("My Stack"); flash(`${saved.name} was ${editingApp ? "updated" : "added to your stack"}.`); } catch (error) { flash(error instanceof Error ? error.message : "Unable to save app."); } }} />}
      {smartUpload && <SmartUploadModal onClose={() => setSmartUpload(false)} onImport={async (candidates) => { const response = await fetch("/api/apps/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ apps: candidates }) }); const body = await response.json() as { apps?: AppItem[]; imported?: number; skipped?: number; error?: string }; if (!response.ok) throw new Error(body.error ?? "Import failed."); setApps(body.apps ?? []); setSmartUpload(false); flash(`${body.imported ?? 0} enriched app${body.imported === 1 ? "" : "s"} added${body.skipped ? ` · ${body.skipped} skipped` : ""}.`); }} />}
      {toast && <div className="toast" role="status"><span>✓</span>{toast}</div>}
    </main>
  );
}

function HomeView({ apps, dataReady, dataError, onNavigate }: { apps: AppItem[]; dataReady: boolean; dataError: string; onNavigate: (view: View) => void; onOpenApp: (name: string) => void; onDiscover: (item: typeof discoveries[number], status: Status) => Promise<void>; onAction: (m: string) => void }) {
  const activeApps = apps.filter((app) => app.status === "Active");
  const paidSpend = apps.filter((app) => app.status !== "Inactive").reduce((sum, app) => sum + app.cost, 0);
  const inactiveApps = apps.filter((app) => app.status === "Inactive" && app.cost > 0);
  const metrics = [[String(apps.length), "Tools", "live library"], [String(activeApps.length), "Active", apps.length ? `${Math.round(activeApps.length / apps.length * 100)}% of stack` : "add your first app"], [String(apps.filter((app) => app.status === "Trialing").length), "Trialing", "tracked trials"], [String(apps.filter((app) => app.status === "Saved").length), "Saved", "for later"], [`$${paidSpend.toFixed(0)}`, "Monthly spend", "current estimate"]];
  return <div className="home-view">
    {!dataReady && <div className="data-banner loading"><span className="sync-dot" /><div><strong>Loading your live Stackd library…</strong><p>Your apps are stored privately and will appear here in a moment.</p></div></div>}
    {dataReady && dataError && <div className="data-banner error"><span>!</span><div><strong>Your library could not be loaded.</strong><p>{dataError}</p></div></div>}
    {dataReady && !dataError && apps.length === 0 && <div className="data-banner welcome"><span>＋</span><div><strong>Your live library is ready.</strong><p>Add apps individually or import a CSV/JSON file from My Stack. Everything you save will persist here.</p></div><button onClick={() => onNavigate("My Stack")}>Start populating →</button></div>}
    <section className="metric-ledger">{metrics.map(([value, label, note]) => <div key={label}><strong>{value}{label === "Monthly spend" && <small>/mo</small>}</strong><span>{label}</span><em>{note}</em></div>)}</section>
    <div className="section-heading"><div><span className="eyebrow">Gmail evidence</span><h2>Automatic discovery</h2><p>One read-only Gmail pipeline powers software discovery, billing, trials, renewals, cancellations, and activity.</p></div><button className="text-button" onClick={() => onNavigate("Settings")}>Configure Gmail →</button></div>
    <section className="source-readiness"><article><Logo item={{ name: "Gmail", initials: "M", tone: "coral" }} /><div><strong>Multiple Gmail inboxes</strong><p>Connect each inbox separately. Stackd retains evidence metadata—not full messages—and combines every inbox into one private library.</p></div><span>Setup required</span></article><article><Logo item={{ name: "Gmail", initials: "$", tone: "amber" }} /><div><strong>Billing evidence from email</strong><p>Receipts, invoices, renewal notices, and cancellation confirmations determine subscription status and latest known amounts.</p></div><span>Gmail only</span></article></section>
    <div className="home-columns">
      <section className="panel trials-panel"><div className="panel-header"><div><span className="eyebrow">Tracked by you</span><h2>Current trials</h2></div><button onClick={() => onNavigate("Trials")}>View all →</button></div>{apps.filter((app) => app.status === "Trialing").slice(0,3).map((app) => <div className="trial-row" key={app.id}><Logo item={app} small /><div><strong>{app.name}</strong><span>{app.trialEndDate ? `Ends ${app.trialEndDate}` : "End date not set"}</span></div><div className="trial-price"><b>${app.cost}</b><span>/month</span></div></div>)}{!apps.some((app) => app.status === "Trialing") && <div className="inactive-empty"><p>No trials tracked yet.</p></div>}</section>
      <section className="panel attention-panel"><div className="panel-header"><div><span className="eyebrow">Your records</span><h2>Needs attention</h2></div><span className="panel-count">{apps.filter((app) => app.status === "Needs Review").length}</span></div>{apps.filter((app) => app.status === "Needs Review").slice(0,4).map((app) => <button className="attention-item" key={app.id} onClick={() => onNavigate("My Stack")}><span className="alert-dot amber" /><div><strong>{app.name} needs review</strong><p>Confirm its status, cost, and evidence.</p></div><em>Review →</em></button>)}{!apps.some((app) => app.status === "Needs Review") && <div className="inactive-empty"><span>✓</span><p>Nothing needs review.</p></div>}</section>
    </div>
    <section className="inactive-subscriptions panel">
      <div className="panel-header"><div><span className="eyebrow">Subscription history</span><h2>Inactive subscriptions</h2></div><div className="inactive-summary"><strong>${inactiveApps.reduce((sum, app) => sum + app.cost, 0).toFixed(0)}</strong><span>former monthly spend</span><button onClick={() => onNavigate("Subscriptions")}>View all {inactiveApps.length} →</button></div></div>
      {inactiveApps.length ? <div className="inactive-preview">{inactiveApps.slice(0,3).map((item) => <div className="inactive-preview-item" key={item.id}><Logo item={item} small /><div><strong>{item.name}</strong><span>{item.last}</span></div><div><b>{item.cancellationDate ? `Canceled ${item.cancellationDate}` : "Inactive"}</b><span>{item.accessEndDate ? `Access ended ${item.accessEndDate}` : "No active billing"}</span></div><em>${item.cost}/mo former cost</em></div>)}{inactiveApps.length > 3 && <button className="inactive-more" onClick={() => onNavigate("Subscriptions")}><span>＋{inactiveApps.length - 3}</span><small>more inactive</small></button>}</div> : <div className="inactive-empty"><span>✓</span><p>No inactive paid subscriptions yet. When you cancel something, its history will stay here.</p></div>}
    </section>
  </div>;
}

function StackView({ apps, allApps, dataReady, dataError, search, setSearch, statusFilter, setStatusFilter, categoryFilter, setCategoryFilter, grid, setGrid, onOpen, onImport, onExport, onSmartUpload, onAdd }: { apps: AppItem[]; allApps: AppItem[]; dataReady: boolean; dataError: string; search: string; setSearch: (v: string) => void; statusFilter: string; setStatusFilter: (v: string) => void; categoryFilter: string; setCategoryFilter: (v: string) => void; grid: boolean; setGrid: (v: boolean) => void; onOpen: (app: AppItem) => void; onImport: (file: File) => Promise<void>; onExport: () => void; onSmartUpload: () => void; onAdd: () => void }) {
  const importRef = useRef<HTMLInputElement>(null);
  return <div><div className="library-toolbar"><label className="library-search">⌕<input id="stack-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${allApps.length} tools`} /></label><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option>All statuses</option>{["Active","Trialing","Saved","Inactive","Needs Review"].map((v) => <option key={v}>{v}</option>)}</select><select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}><option>All categories</option>{["AI","Development","Design","Productivity","Marketing","Analytics","Finance","Infrastructure","Research","Other"].map((v) => <option key={v}>{v}</option>)}</select><select aria-label="Sort tools"><option>Recently used</option><option>Recently discovered</option><option>Cost high to low</option><option>Alphabetical</option><option>Trial expiration</option><option>Most connected</option></select><div className="library-data-actions"><input ref={importRef} type="file" accept=".csv,.json,text/csv,application/json" onChange={async (event) => { const file = event.target.files?.[0]; if (file) await onImport(file); event.target.value = ""; }} /><button className="smart-upload-button" onClick={onSmartUpload}>✦ Smart upload</button><button onClick={() => importRef.current?.click()}>↑ CSV / JSON</button><button onClick={onExport} disabled={!allApps.length}>↓ Export</button><button className="primary-mini" onClick={onAdd}>＋ Add</button></div><div className="view-toggle"><button className={grid ? "active" : ""} onClick={() => setGrid(true)}>▦</button><button className={!grid ? "active" : ""} onClick={() => setGrid(false)}>☷</button></div></div>
    <div className="results-label"><span>{apps.length} tools shown</span><button>Clear filters</button></div>
    {!dataReady ? <EmptyState title="Loading your library…" text="Stackd is retrieving your privately stored apps." /> : dataError ? <EmptyState title="Your library could not be loaded." text={dataError} /> : allApps.length === 0 ? <div className="live-empty-state"><span className="empty-orbit">＋</span><span className="eyebrow">Live library</span><h2>Start with the tools you use today.</h2><p>Add an app in seconds, or import a CSV/JSON file to populate your stack in bulk.</p><div><button className="primary-action" onClick={onAdd}>＋ Add your first app</button><button onClick={() => importRef.current?.click()}>↑ Import a file</button></div><small>Suggested CSV columns: name, website, category, status, monthly_cost, project, notes</small></div> : apps.length === 0 ? <EmptyState title="No tools match those filters." text="Try broadening your search or clearing a filter." /> : grid ? <section className="app-grid">{apps.map((app) => <AppCard key={app.id} app={app} onOpen={onOpen} />)}</section> : <section className="app-list"><div className="list-header"><span>Tool</span><span>Status</span><span>Projects</span><span>Last signal</span><span>Cost</span></div>{apps.map((app) => <button className="app-list-row" key={app.id} onClick={() => onOpen(app)}><div><Logo item={app} small /><span><strong>{app.name}</strong><small>{app.category}</small></span></div><StatusBadge status={app.status} /><span>{app.projects.join(", ") || "—"}</span><span>{app.last}</span><strong>{app.cost ? `$${app.cost}/mo` : "Free"}</strong></button>)}</section>}
  </div>;
}

function AppCard({ app, onOpen }: { app: AppItem; onOpen: (app: AppItem) => void }) {
  return <button className="app-card" onClick={() => onOpen(app)}><div className="app-card-top"><Logo item={app} /><StatusBadge status={app.status} /></div><div className="app-card-title"><h3>{app.name}</h3><span>{app.cost ? `$${app.cost}/mo` : "Free"}</span></div><p>{app.description}</p><span className="category-label">{app.category}</span><div className="project-badges">{app.projects.slice(0,2).map((p) => <i key={p}>{p}</i>)}{app.projects.length === 0 && <i>Unassigned</i>}</div><div className="app-card-meta"><span>{app.sources.join(" · ")}</span><span>{app.last}</span></div></button>;
}

function AppDetail({ app, onAction, onEdit, onDelete }: { app: AppItem; onAction: (m: string) => void; onEdit: (app: AppItem) => void; onDelete: (app: AppItem) => Promise<void> }) {
  const evidence = app.sources.map((source) => [source, source === "Manual" ? "Added by you" : source === "Import" ? "Imported from your file" : `Detected from ${source}`, source === "Manual" ? "•" : "✓"]);
  return <div className="detail-page"><section className="detail-hero"><div className="detail-identity"><Logo item={app} /><div><span className="eyebrow">{app.category}</span><div className="detail-title-row"><h2>{app.name}</h2><StatusBadge status={app.status} /></div>{app.website && <a href={`https://${app.website.replace(/^https?:\/\//, "")}`} target="_blank" rel="noreferrer">{app.website} ↗</a>}</div></div><div className="detail-actions">{app.website && <button onClick={() => window.open(`https://${app.website!.replace(/^https?:\/\//, "")}`, "_blank", "noopener,noreferrer")}>Open App ↗</button>}<button onClick={() => onEdit(app)}>Edit</button><button onClick={() => void onDelete(app)}>Remove</button><button className="primary-action" onClick={() => onAction("Project assignment is available in Edit.")}>＋ Add to Project</button></div></section>
    <div className="detail-layout"><div className="detail-main">
      <section className="panel detail-section"><div className="panel-header"><h2>Overview</h2></div><p className="overview-copy">{app.description || `${app.name} is part of your personal stack.`} Stackd considers it {app.status.toLowerCase()} based on your saved record and evidence.</p><dl className="facts"><div><dt>Status</dt><dd>{app.status}</dd></div><div><dt>Monthly cost</dt><dd>{app.cost ? `$${app.cost.toFixed(2)}` : "Free"}</dd></div><div><dt>Billing</dt><dd>{app.billingFrequency || "—"}</dd></div><div><dt>Renewal date</dt><dd>{app.renewalDate || "—"}</dd></div><div><dt>Last detected use</dt><dd>{app.last}</dd></div><div><dt>Projects</dt><dd>{app.projects.join(", ") || "Unassigned"}</dd></div></dl></section>
      <section className="panel detail-section"><div className="panel-header"><div><span className="eyebrow">Why Stackd thinks this</span><h2>Discovery evidence</h2></div><div className="big-confidence"><strong>{app.confidence}%</strong><span>confidence</span></div></div><div className="confidence-bar"><i style={{ width: `${app.confidence}%` }} /></div><div className="evidence-list">{evidence.map(([name, detail, icon]) => <div key={name}><i>{icon}</i><div><strong>{name}</strong><span>{detail}</span></div><button>View</button></div>)}</div><p className="evidence-note">Your manual status always takes priority over automatic suggestions.</p></section>
      <section className="panel detail-section"><div className="panel-header"><h2>Connections</h2><button>Open in Stack Map →</button></div><div className="mini-map"><div><span className="mini-node">Railway</span><i>API</i><span className="mini-node current">{app.name}</span><i>Traces</i><span className="mini-node">Langfuse</span></div></div></section>
    </div><aside className="detail-aside">
      <section className="panel side-section"><div className="panel-header"><h2>Projects</h2><button>＋</button></div>{app.projects.length ? app.projects.map((p) => <div className="project-mini" key={p}><span>{p[0]}</span><div><strong>{p}</strong><small>Active project</small></div><button>→</button></div>) : <p className="muted-copy">This tool is not assigned to a project yet.</p>}</section>
      <section className="panel side-section"><div className="panel-header"><h2>Notes</h2><button onClick={() => onEdit(app)}>Edit</button></div><p className="note-paper">{app.notes || "No notes yet. Add context about why you use this app, its plan, or what to remember."}</p></section>
      <section className="panel side-section links-section"><div className="panel-header"><h2>Links</h2></div>{["Website","Dashboard","Billing","Documentation","GitHub"].map((link) => <button key={link}>{link}<span>↗</span></button>)}</section>
    </aside></div>
  </div>;
}

function ProjectsView({ onOpenApp, onMap }: { onOpenApp: (name: string) => void; onMap: () => void }) {
  return <div><div className="projects-summary"><span>4 projects</span><span>28 active services</span><span>$486 estimated monthly</span><button>＋ New Project</button></div><section className="project-grid">{projectData.map((project) => <article className="project-card" key={project.name}><div className={`project-monogram project-${project.accent}`}>{project.name[0]}</div><div className="project-title"><div><span className="eyebrow">Updated {project.updated}</span><h2>{project.name}</h2><p>{project.description}</p></div><button>•••</button></div><div className="project-stats"><div><strong>{project.tools}</strong><span>Tools</span></div><div><strong>${project.cost}</strong><span>Monthly</span></div><div><strong>{project.active}</strong><span>Active</span></div></div><div className="tool-stack">{project.appNames.slice(0,5).map((name, i) => <button key={name} onClick={() => onOpenApp(name)} aria-label={`Open ${name}`} style={{ zIndex: 10 - i }}><Logo item={{ name, initials: name.slice(0,2), tone: "ink" }} small /></button>)}<span>{project.appNames.length} connected tools</span></div><button className="project-open" onClick={project.name === "Rally" ? onMap : undefined}>Open project <span>→</span></button></article>)}</section></div>;
}

function MapView({ nodes, setNodes, mode, setMode, dragging, setDragging, onOpen, onAction }: { nodes: typeof mapSeed; setNodes: (nodes: typeof mapSeed) => void; mode: "Project Map" | "Entire Stack"; setMode: (m: "Project Map" | "Entire Stack") => void; dragging: number | null; setDragging: (n: number | null) => void; onOpen: (name: string) => void; onAction: (m: string) => void }) {
  const [zoom, setZoom] = useState(1);
  function autoLayout() { setNodes(mapSeed); onAction("Rally map arranged by data flow."); }
  return <div className="map-page"><div className="map-toolbar"><div className="segmented"><button className={mode === "Project Map" ? "active" : ""} onClick={() => setMode("Project Map")}>Project Map</button><button className={mode === "Entire Stack" ? "active" : ""} onClick={() => setMode("Entire Stack")}>Entire Stack</button></div><select aria-label="Select project"><option>Rally</option><option>Object Report</option><option>Personal Tools</option></select><span className="map-meta"><b>7</b> tools · <b>6</b> connections · <b>$184/mo</b></span><div className="map-actions"><button onClick={autoLayout}>⌁ Auto layout</button><button onClick={() => onAction("Click and drag from one tool to another to connect them.")}>＋ Connect</button></div></div>
    <div className="map-canvas" onPointerMove={(e) => { if (dragging === null) return; const rect = e.currentTarget.getBoundingClientRect(); const x = (e.clientX - rect.left) / zoom - 70; const y = (e.clientY - rect.top) / zoom - 38; setNodes(nodes.map((n) => n.id === dragging ? { ...n, x: Math.max(10, Math.min(970, x)), y: Math.max(10, Math.min(500, y)) } : n)); }} onPointerUp={() => setDragging(null)} onPointerLeave={() => setDragging(null)}>
      <div className="map-grid" style={{ transform: `scale(${zoom})` }}>
        {mapEdges.map(([fromId,toId,label]) => { const from = nodes.find((n) => n.id === fromId)!; const to = nodes.find((n) => n.id === toId)!; const x1 = from.x + 76, y1 = from.y + 36, x2 = to.x + 76, y2 = to.y + 36; const length = Math.hypot(x2-x1,y2-y1); const angle = Math.atan2(y2-y1,x2-x1) * 180 / Math.PI; return <div className="edge-wrap" key={`${fromId}-${toId}`} style={{ left: x1, top: y1, width: length, transform: `rotate(${angle}deg)` }}><span className="edge-line" /><i>{label}</i></div>; })}
        {nodes.map((node) => <button className={`map-node ${dragging === node.id ? "dragging" : ""}`} key={node.id} style={{ left: node.x, top: node.y }} onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setDragging(node.id); }} onDoubleClick={() => onOpen(node.name)}><Logo item={node} small /><span><strong>{node.name}</strong><small>{node.category}</small></span>{node.cost > 0 && <em>${node.cost}</em>}</button>)}
        <div className="map-note"><span>RALLY · PRODUCTION</span><strong>Drag tools to rearrange</strong><small>Double-click a tool for details.</small></div>
      </div><div className="zoom-controls"><button onClick={() => setZoom(Math.min(1.2, zoom + .1))}>＋</button><span>{Math.round(zoom * 100)}%</span><button onClick={() => setZoom(Math.max(.7, zoom - .1))}>−</button><button onClick={() => setZoom(1)}>⌖</button></div><div className="map-legend"><span><i className="legend-active" />Active</span><span><i className="legend-edge" />Data flow</span></div>
    </div>
  </div>;
}

function TrialsView({ apps, onAction }: { apps: AppItem[]; onAction: (m: string) => void }) {
  const trials = apps.filter((app) => app.status === "Trialing");
  const potential = trials.reduce((sum, app) => sum + app.cost, 0);
  return <div className="trials-page"><div className="trial-overview"><div><strong>${potential.toFixed(0)}</strong><span>Potential monthly spend</span></div><div><strong>{trials.length}</strong><span>Tracked trials</span></div><div><strong>{trials.filter((app) => app.trialEndDate).length}</strong><span>With an end date</span></div><div className="calendar-mini"><span>LIVE</span><b>Your data</b><i>No simulated trials</i></div></div><section className="trial-group"><div className="section-heading compact"><div><span className="eyebrow">{trials.length} trials</span><h2>Current trials</h2></div></div><div className="trial-card-list">{trials.map((trial) => <article className="trial-card" key={trial.id}><Logo item={trial} /><div className="trial-main"><h3>{trial.name}</h3><span>{trial.last}</span></div><div><span className="eyebrow">Trial ends</span><strong>{trial.trialEndDate || "Not set"}</strong><small>Saved record</small></div><div><span className="eyebrow">After trial</span><strong>${trial.cost}/mo</strong><small>{trial.billingFrequency || "Monthly"}</small></div><div className="trial-actions"><button onClick={() => onAction(`Open ${trial.name} from My Stack to update its status.`)}>Manage</button></div></article>)}{!trials.length && <EmptyState title="No trials tracked yet." text="Add an app with Trialing status and an optional end date." />}</div></section></div>;
}

function SubscriptionsView({ apps, onAction }: { apps: AppItem[]; onAction: (m: string) => void }) {
  const [tab, setTab] = useState<"Active" | "Inactive">("Active");
  const [query, setQuery] = useState("");
  const paidApps = apps.filter((item) => item.cost > 0);
  const activeItems = paidApps.filter((item) => item.status !== "Inactive");
  const inactiveItems = paidApps.filter((item) => item.status === "Inactive");
  const items = (tab === "Active" ? activeItems : inactiveItems).filter((item) => item.name.toLowerCase().includes(query.toLowerCase()));
  const activeSpend = activeItems.reduce((sum, item) => sum + item.cost, 0);
  const formerSpend = inactiveItems.reduce((sum, item) => sum + item.cost, 0);
  const nextRenewal = activeItems.find((item) => item.renewalDate);

  return <div className="subscriptions-page">
    <section className="subscription-ledger"><div><span className="eyebrow">Current commitment</span><strong>${activeSpend.toFixed(0)}<small>/mo</small></strong><p>Across {activeItems.length} paid subscriptions</p></div><div><span className="eyebrow">Inactive history</span><strong>{inactiveItems.length}</strong><p>${formerSpend.toFixed(0)} in former monthly spend</p></div><div><span className="eyebrow">Annualized savings</span><strong>${(formerSpend * 12).toFixed(0)}</strong><p>Based on inactive monthly costs</p></div><div><span className="eyebrow">Next renewal</span><strong>{nextRenewal?.renewalDate || "—"}</strong><p>{nextRenewal ? `${nextRenewal.name} · $${nextRenewal.cost}/month` : "Add a renewal date"}</p></div></section>
    <div className="subscription-toolbar"><div className="segmented"><button className={tab === "Active" ? "active" : ""} onClick={() => setTab("Active")}>Active <span>{activeItems.length}</span></button><button className={tab === "Inactive" ? "active" : ""} onClick={() => setTab("Inactive")}>Inactive <span>{inactiveItems.length}</span></button></div><label className="subscription-search">⌕<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${tab.toLowerCase()} subscriptions`} /></label><select aria-label="Sort subscriptions"><option>Recently updated</option><option>Cost high to low</option><option>Alphabetical</option>{tab === "Active" ? <option>Renewal date</option> : <option>Cancellation date</option>}</select></div>
    {tab === "Inactive" && <div className="inactive-callout"><span>✓</span><div><strong>Inactive subscriptions are excluded from current spend.</strong><p>Stackd keeps their history so you remember what you tried, what it cost, and when access ended.</p></div><b>${formerSpend.toFixed(0)}/mo former spend</b></div>}
    <section className="subscription-table"><div className="subscription-header"><span>Subscription</span><span>{tab === "Active" ? "Next renewal" : "Canceled"}</span><span>Billing</span><span>{tab === "Active" ? "Signal" : "Access"}</span><span>Cost</span><span /></div>{items.map((item) => <article className={`subscription-row ${tab === "Inactive" ? "is-inactive" : ""}`} key={item.id}><div className="subscription-name"><Logo item={item} small /><div><strong>{item.name}</strong><span>{item.projects.join(", ") || "Unassigned"} · {item.billingFrequency || "Monthly"}</span></div></div><div><strong>{tab === "Active" ? item.renewalDate || "Not set" : item.cancellationDate || "Not set"}</strong><span>{tab === "Active" ? "Renewal" : "Cancellation"}</span></div><div><strong>{item.billingFrequency || "Monthly"}</strong><span>From Gmail evidence</span></div><div><strong>{tab === "Active" ? item.last : item.accessEndDate || "Ended"}</strong><span>{tab === "Active" ? "Latest email signal" : item.last}</span></div><div className="subscription-cost"><strong>${item.cost}</strong><span>/month</span></div><div className="subscription-actions">{tab === "Active" ? <button onClick={() => onAction(`Open ${item.name} to review Gmail billing evidence.`)}>Evidence</button> : <button onClick={() => onAction(`Open ${item.name} and change its status to reactivate it.`)}>Reactivate</button>}</div></article>)}{items.length === 0 && <EmptyState title={tab === "Active" ? "No active paid subscriptions yet." : "No inactive subscriptions yet."} text="Connect Gmail or add an app manually to start tracking it." />}</section>
    {tab === "Inactive" && <section className="subscription-footnote"><div><span className="eyebrow">Historical context</span><h2>Inactive doesn’t mean forgotten.</h2></div><p>Former subscriptions stay linked to their projects, notes, evidence, and prior costs—without being counted toward current monthly spend.</p></section>}
  </div>;
}

function SavedView({ apps, onOpen, onAdd }: { apps: AppItem[]; onOpen: (app: AppItem) => void; onAdd: () => void }) {
  return <div><div className="saved-toolbar"><div className="tag-row"><button className="active">All saved <span>31</span></button><button>AI <span>12</span></button><button>Try soon <span>6</span></button><button>Creator tools <span>8</span></button><button>For Rally <span>3</span></button></div><button className="add-button" onClick={onAdd}>＋ Save an app</button></div><div className="saved-grid">{apps.map((app, index) => <button className="saved-card" key={app.id} onClick={() => onOpen(app)}><div className="saved-number">#{String(index + 1).padStart(2,"0")}</div><Logo item={app} /><div><span className="eyebrow">Saved Aug {24-index*3}</span><h2>{app.name}</h2><p>{app.description}</p></div><blockquote>“{app.name === "Lovable" ? "Test this for the next small product prototype." : "Use this for fast, source-backed research and discovery."}”</blockquote><div className="saved-footer"><span>{app.category}</span><em>{app.projects[0] || "No project"}</em><b>Open →</b></div></button>)}</div></div>;
}

function InboxView({ onAction }: { count: number; setCount: (n: number) => void; onAction: (m: string) => void }) {
  return <div className="inbox-page"><div className="inbox-banner"><div className="scan-orbit"><span>0</span></div><div><span className="eyebrow">Gmail discovery inbox</span><h2>No Gmail scans have run yet.</h2><p>Connect one or more Gmail inboxes to detect account signups, receipts, renewals, trials, cancellations, and product activity.</p></div><button onClick={() => onAction("Open Settings to connect a Gmail inbox.")}>Connect Gmail</button></div><EmptyState title="Your discovery inbox is empty." text="Every discovery will include Gmail evidence and a confidence score before it reaches your live library." /></div>;
}

function AskView({ chat, input, setInput, ask }: { chat: { role: "user" | "assistant"; text: string }[]; input: string; setInput: (v: string) => void; ask: (q: string) => void }) {
  const prompts = ["What am I spending on AI tools?", "Which trials end this week?", "What tools power Rally?", "What am I paying for but not using?"];
  return <div className="ask-page"><div className="ask-orb">✦</div><div className="ask-intro"><span className="eyebrow">Your stack, understood</span><h2>What would you like to know?</h2><p>Stackd answers from your organized tool data and shows the evidence behind every conclusion.</p></div>{chat.length === 0 ? <div className="prompt-grid">{prompts.map((p) => <button key={p} onClick={() => ask(p)}><span>↗</span>{p}</button>)}</div> : <div className="chat-thread">{chat.map((m, i) => <div className={`message ${m.role}`} key={i}>{m.role === "assistant" && <span className="assistant-mark">✦</span>}<p>{m.text}</p>{m.role === "assistant" && <button>View evidence</button>}</div>)}</div>}<form className="chat-composer" onSubmit={(e) => { e.preventDefault(); ask(input); }}><input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about your stack…" /><button type="submit">Ask Stackd <span>↑</span></button></form><p className="chat-disclaimer">Answers are based on your Stackd data, not a fresh search of your connected inbox.</p></div>;
}

function SettingsView({ dark, setDark, onAction }: { dark: boolean; setDark: (v: boolean) => void; onAction: (m: string) => void }) {
  const sources = [
    { name: "Gmail inboxes", detail: "Connect every inbox separately with read-only access. Each inbox feeds the same evidence pipeline.", initials: "M", tone: "coral", state: "Source of truth", action: "Add inbox" },
    { name: "Billing signals", detail: "Receipts, invoices, renewal notices, and cancellation confirmations determine cost and subscription status.", initials: "$", tone: "amber", state: "Via Gmail", action: "Review rules" },
    { name: "Product activity", detail: "Welcome emails, security alerts, workspace invitations, and product notifications establish account activity.", initials: "↗", tone: "blue", state: "Via Gmail", action: "Review rules" },
  ];
  return <div className="settings-page"><section className="panel source-intro"><span className="eyebrow">One source, explicit consent</span><h2>Gmail powers your Stackd</h2><p>Gmail is the single source of truth for software discovery, billing, trials, renewals, cancellations, and account activity. Connect each inbox separately; Stackd retains only the evidence metadata needed to support each conclusion.</p></section><section className="panel settings-section"><div className="panel-header"><div><span className="eyebrow">Gmail evidence pipeline</span><h2>Connections</h2></div></div>{sources.map((source) => <div className="setting-row" key={source.name}><Logo item={{ name: source.name === "Gmail inboxes" ? "Gmail" : undefined, initials: source.initials, tone: source.tone }} small /><div><strong>{source.name}</strong><span>{source.detail}</span></div><b className="setup-state"><i /> {source.state}</b><button onClick={() => onAction(`${source.name}: Gmail consent and provider credentials are required before live scanning can begin.`)}>{source.action}</button></div>)}</section><section className="panel settings-section"><div className="panel-header"><div><span className="eyebrow">Personalize Stackd</span><h2>Preferences</h2></div></div><label className="preference-row"><div><strong>Dark mode</strong><span>Use a darker palette across your workspace.</span></div><input type="checkbox" checked={dark} onChange={(e) => setDark(e.target.checked)} /></label><label className="preference-row"><div><strong>Weekly stack digest</strong><span>A concise email with new discoveries, renewals, and opportunities.</span></div><input type="checkbox" defaultChecked /></label><label className="preference-row"><div><strong>Trial reminders</strong><span>Notify me 3 days before a trial becomes paid.</span></div><input type="checkbox" defaultChecked /></label></section><section className="privacy-note"><span>◉</span><div><strong>Privacy is part of the product.</strong><p>Stackd stores sender, subject, date, merchant, amount, and evidence references—not full message bodies. Gmail authorization must remain encrypted server-side.</p></div><button>Read data principles</button></section></div>;
}

function SmartUploadModal({ onClose, onImport }: { onClose: () => void; onImport: (apps: EnrichedCandidate[]) => Promise<void> }) {
  const [entries, setEntries] = useState(""); const [candidates, setCandidates] = useState<EnrichedCandidate[]>([]); const [selected, setSelected] = useState<Set<number>>(new Set()); const [working, setWorking] = useState(false); const [error, setError] = useState("");
  async function enrich() { const lines = entries.split(/\r?\n/).map((line) => line.trim()).filter(Boolean); if (!lines.length) return; setWorking(true); setError(""); try { const response = await fetch("/api/apps/enrich", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ entries: lines }) }); const body = await response.json() as { candidates?: EnrichedCandidate[]; error?: string }; if (!response.ok) throw new Error(body.error ?? "Unable to pull company information."); const enriched = (body.candidates ?? []).map((candidate, index) => ({ ...candidate, id: `preview-${index}` })); setCandidates(enriched); setSelected(new Set(enriched.map((_, index) => index))); } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to pull company information."); } finally { setWorking(false); } }
  function update(index: number, changes: Partial<EnrichedCandidate>) { setCandidates((previous) => previous.map((candidate, candidateIndex) => candidateIndex === index ? { ...candidate, ...changes } : candidate)); }
  async function save() { setWorking(true); setError(""); try { await onImport(candidates.filter((_, index) => selected.has(index))); } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to import apps."); setWorking(false); } }
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="smart-upload-modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">Website-powered enrichment</span><h2>Smart upload tools</h2><p>Paste one tool per line. Use <b>Company | website.com</b> for the most accurate result.</p></div><button type="button" onClick={onClose}>×</button></div>{!candidates.length ? <><label className="bulk-entry"><span>Apps or official websites</span><textarea autoFocus value={entries} onChange={(event) => setEntries(event.target.value)} placeholder={"Figma | figma.com\nNotion | notion.so\nopenai.com"} /></label><div className="upload-explainer"><span>1</span><p><b>Stackd visits each official website</b> to pull its company name, summary, canonical domain, and logo.</p><span>2</span><p><b>A category is suggested</b> from the company’s own description. Every result starts as Needs Review.</p></div></> : <div className="enrichment-results"><div className="enrichment-summary"><strong>{candidates.length} tools ready to review</strong><span>{candidates.filter((candidate) => candidate.error).length} need manual attention</span></div>{candidates.map((candidate, index) => <article className={`enrichment-row ${candidate.error ? "has-warning" : ""}`} key={candidate.input}><input type="checkbox" checked={selected.has(index)} onChange={() => setSelected((current) => { const next = new Set(current); next.has(index) ? next.delete(index) : next.add(index); return next; })} aria-label={`Import ${candidate.name}`} /><Logo item={candidate} small /><div className="enrichment-fields"><div><input value={candidate.name} onChange={(event) => update(index, { name: event.target.value })} aria-label="Company name" /><select value={candidate.category} onChange={(event) => update(index, { category: event.target.value })}>{["AI","Development","Design","Productivity","Marketing","Analytics","Finance","Infrastructure","Research","Other"].map((category) => <option key={category}>{category}</option>)}</select></div><input value={candidate.website ?? ""} onChange={(event) => update(index, { website: event.target.value })} placeholder="official website" aria-label="Official website" /><textarea value={candidate.description} onChange={(event) => update(index, { description: event.target.value })} placeholder="Company summary" aria-label="Company summary" />{candidate.error && <small>⚠ {candidate.error}</small>}</div></article>)}</div>}{error && <p className="modal-error">{error}</p>}<div className="modal-footer"><button type="button" onClick={candidates.length ? () => { setCandidates([]); setError(""); } : onClose}>{candidates.length ? "← Back" : "Cancel"}</button>{candidates.length ? <button className="primary-action" type="button" disabled={working || selected.size === 0} onClick={() => void save()}>{working ? "Adding…" : `Add ${selected.size} to Stack`}</button> : <button className="primary-action" type="button" disabled={working || !entries.trim()} onClick={() => void enrich()}>{working ? "Pulling company info…" : "Review enriched tools →"}</button>}</div></section></div>;
}

function AddAppModal({ initialApp, onClose, onAdd }: { initialApp: AppItem | null; onClose: () => void; onAdd: (app: AppItem) => Promise<void> }) {
  const [name, setName] = useState(initialApp?.name ?? ""); const [website, setWebsite] = useState(initialApp?.website ?? ""); const [category, setCategory] = useState(initialApp?.category ?? "Other"); const [status, setStatus] = useState<Status>(initialApp?.status ?? "Active"); const [project, setProject] = useState(initialApp?.projects[0] ?? "No project"); const [cost, setCost] = useState(initialApp?.cost ? String(initialApp.cost) : ""); const [billingFrequency, setBillingFrequency] = useState(initialApp?.billingFrequency ?? "Monthly"); const [renewalDate, setRenewalDate] = useState(initialApp?.renewalDate ?? ""); const [trialEndDate, setTrialEndDate] = useState(initialApp?.trialEndDate ?? ""); const [cancellationDate, setCancellationDate] = useState(initialApp?.cancellationDate ?? ""); const [accessEndDate, setAccessEndDate] = useState(initialApp?.accessEndDate ?? ""); const [notes, setNotes] = useState(initialApp?.notes ?? ""); const [saving, setSaving] = useState(false);
  async function submit(e: React.FormEvent) { e.preventDefault(); setSaving(true); try { const display = name.trim(); await onAdd({ id: initialApp?.id ?? "", name: display, initials: initialApp?.initials ?? display.slice(0,2).toUpperCase(), tone: initialApp?.tone ?? "blue", description: initialApp?.description ?? "Manually added software tool", category, status, cost: Number(cost) || 0, billingFrequency, renewalDate: renewalDate || undefined, trialEndDate: trialEndDate || undefined, cancellationDate: cancellationDate || undefined, accessEndDate: accessEndDate || undefined, projects: project === "No project" ? [] : [project], sources: initialApp?.sources ?? ["Manual"], last: initialApp?.last ?? "Just now", confidence: initialApp?.confidence ?? 100, website: website.replace(/^https?:\/\//, ""), notes }); } finally { setSaving(false); } }
  return <div className="modal-backdrop" onMouseDown={onClose}><form className="add-modal" onSubmit={submit} onMouseDown={(e) => e.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">Live library</span><h2>{initialApp ? "Edit app" : "Add an app"}</h2><p>Save billing, status, and project details to your private Stackd library.</p></div><button type="button" onClick={onClose}>×</button></div><div className="form-split equal"><label><span>App name</span><input autoFocus required value={name} onChange={(e) => setName(e.target.value)} placeholder="Arcade" /></label><label><span>Official website</span><input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="arcade.software" /></label></div><div className="form-split equal"><label><span>Category</span><select value={category} onChange={(e) => setCategory(e.target.value)}>{["AI","Development","Design","Productivity","Marketing","Analytics","Finance","Infrastructure","Research","Other"].map((value) => <option key={value}>{value}</option>)}</select></label><label><span>Assign to project</span><select value={project} onChange={(e) => setProject(e.target.value)}><option>No project</option>{projectData.map((p) => <option key={p.name}>{p.name}</option>)}</select></label></div><fieldset><legend>Status</legend><div className="status-picker five">{(["Active","Trialing","Saved","Inactive","Needs Review"] as Status[]).map((v) => <label key={v} className={status === v ? "active" : ""}><input type="radio" name="status" value={v} checked={status === v} onChange={() => setStatus(v)} /><span>{v}</span></label>)}</div></fieldset><div className="form-split thirds"><label><span>Monthly cost</span><div className="cost-field">$<input type="number" min="0" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0" /></div></label><label><span>Billing</span><select value={billingFrequency} onChange={(e) => setBillingFrequency(e.target.value)}><option>Monthly</option><option>Annual</option><option>Usage-based</option><option>Free</option></select></label><label><span>{status === "Trialing" ? "Trial ends" : "Renews"}</span><input type="date" value={status === "Trialing" ? trialEndDate : renewalDate} onChange={(e) => status === "Trialing" ? setTrialEndDate(e.target.value) : setRenewalDate(e.target.value)} /></label></div>{status === "Inactive" && <div className="form-split equal"><label><span>Canceled</span><input type="date" value={cancellationDate} onChange={(e) => setCancellationDate(e.target.value)} /></label><label><span>Access ended</span><input type="date" value={accessEndDate} onChange={(e) => setAccessEndDate(e.target.value)} /></label></div>}<label><span>Notes <em>Optional</em></span><textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Plan details, cancellation notes, or why this app matters." /></label><div className="modal-footer"><button type="button" onClick={onClose}>Cancel</button><button className="primary-action" type="submit" disabled={saving}>{saving ? "Saving…" : initialApp ? "Save changes" : "Add to Stack"}</button></div></form></div>;
}

function parseCsvRow(line: string) {
  const cells: string[] = []; let value = ""; let quoted = false;
  for (let index = 0; index < line.length; index += 1) { const char = line[index]; if (char === '"') { if (quoted && line[index + 1] === '"') { value += '"'; index += 1; } else quoted = !quoted; } else if (char === "," && !quoted) { cells.push(value); value = ""; } else value += char; }
  cells.push(value); return cells;
}

function csvCell(value: unknown) { const text = String(value ?? ""); return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text; }

function EmptyState({ title, text }: { title: string; text: string }) { return <div className="empty-state"><span>◇</span><h2>{title}</h2><p>{text}</p></div>; }
