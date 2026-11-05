const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";
type Session = { cookie: string; crumb: string; at: number };
let session: Session | null = null;
let pending: Promise<Session> | null = null;

async function createSession(): Promise<Session> {
  const first = await fetch("https://fc.yahoo.com", { headers: { "User-Agent": UA }, redirect: "manual", cache: "no-store" }).catch(() => null);
  const setCookie = first?.headers.getSetCookie?.() ?? [];
  const cookie = setCookie.map(value => value.split(";")[0]).join("; ");
  const crumbResponse = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", { headers: { "User-Agent": UA, Cookie: cookie }, cache: "no-store" });
  const crumb = (await crumbResponse.text()).trim();
  if (!crumbResponse.ok || !crumb || crumb.includes("<")) throw new Error("Could not start a market data session.");
  return { cookie, crumb, at: Date.now() };
}

async function getSession(refresh = false): Promise<Session> {
  if (!refresh && session && Date.now() - session.at < 30 * 60_000) return session;
  pending ??= createSession().finally(() => { pending = null; });
  session = await pending;
  return session;
}

/** Fetches an authenticated Yahoo Finance JSON endpoint, refreshing the session once on 401/403. */
export async function yahooJson<T>(url: string): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const { cookie, crumb } = await getSession(attempt > 0);
    const separator = url.includes("?") ? "&" : "?";
    const response = await fetch(`${url}${separator}crumb=${encodeURIComponent(crumb)}`, { headers: { "User-Agent": UA, Cookie: cookie }, cache: "no-store" });
    if (response.status === 401 || response.status === 403) continue;
    if (!response.ok) throw new Error(`Market data request failed (${response.status}).`);
    return response.json() as Promise<T>;
  }
  throw new Error("Market data session was rejected.");
}

export const raw = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value === "object" && "raw" in value) { const inner = (value as { raw: unknown }).raw; return typeof inner === "number" && Number.isFinite(inner) ? inner : null; }
  return null;
};
