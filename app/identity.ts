import { env } from "cloudflare:workers";

export const USER_EMAIL_HEADER = "oai-authenticated-user-email";
export const LOCAL_DEV_EMAIL = "local@stackd.dev";
export const DEFAULT_WORKER_USER_EMAIL = "rileyporcarello@gmail.com";

export function isLocalHost(hostname: string): boolean {
  const host = hostname.split(":")[0]?.toLowerCase() ?? "";
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

export function emailFromSitesHeader(headers: Headers): string | null {
  const email = headers.get(USER_EMAIL_HEADER)?.trim().toLowerCase();
  return email || null;
}

/**
 * Cloudflare Workers identity when ChatGPT Sites headers are missing.
 * - unset / missing → `DEFAULT_WORKER_USER_EMAIL`
 * - non-empty string → that email
 * - explicit `""` → disabled (header-only auth)
 */
export function workerFallbackEmail(): string | null {
  const configured = env.STACKD_DEV_USER_EMAIL;
  if (configured === "") return null;
  const email = String(configured ?? DEFAULT_WORKER_USER_EMAIL).trim().toLowerCase();
  return email || null;
}

export function userEmailFromRequest(request: Request): string | null {
  const fromHeader = emailFromSitesHeader(request.headers);
  if (fromHeader) return fromHeader;
  const host = new URL(request.url).hostname;
  if (isLocalHost(host)) return LOCAL_DEV_EMAIL;
  return workerFallbackEmail();
}
