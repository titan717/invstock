"use client";

import { useEffect, useState } from "react";

const cache = new Map<string, { at: number; data: unknown }>();

/** Fetches JSON from the app's API with a small in-memory cache. Returns null while loading or on failure. */
export function useJson<T>(url: string | null, maxAgeMs = 60_000): { data: T | null; loading: boolean; failed: boolean } {
  const [state, setState] = useState<{ url: string | null; data: T | null; failed: boolean }>(() => {
    const hit = url ? cache.get(url) : undefined;
    return { url, data: (hit?.data as T) ?? null, failed: false };
  });
  useEffect(() => {
    if (!url) return;
    const hit = cache.get(url);
    if (hit && Date.now() - hit.at < maxAgeMs) { setState({ url, data: hit.data as T, failed: false }); return; }
    let cancelled = false;
    setState(previous => ({ url, data: previous.url === url ? previous.data : null, failed: false }));
    fetch(url, { cache: "no-store" })
      .then(response => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then(data => { if (cancelled) return; cache.set(url, { at: Date.now(), data }); setState({ url, data: data as T, failed: false }); })
      .catch(() => { if (!cancelled) setState({ url, data: null, failed: true }); });
    return () => { cancelled = true; };
  }, [url, maxAgeMs]);
  const current = state.url === url;
  return { data: current ? state.data : null, loading: !!url && current && !state.data && !state.failed, failed: current && state.failed };
}
