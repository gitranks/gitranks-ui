import 'server-only';

import type { PackageRefreshStatus } from '@/app/package/[registry]/[...name]/utils/package-refresh.types';
import type { RegistryId } from '@/lib/packages/registries';
import { signedFetch } from '@/lib/signed-fetch';

// What the package routes keep between requests on this server: each package's refresh status for a few seconds, and
// the update each package's page was last expired for.

export type Upstream<T> = { ok: true; body: T } | { ok: false; status: number };

/** The upstream answer; one that throws or whose body is not a JSON object reads as a 502. */
export async function readUpstream<T>(call: () => Promise<Response>): Promise<Upstream<T>> {
  try {
    const response = await call();
    if (!response.ok) {
      return { ok: false, status: response.status };
    }
    const body: unknown = await response.json();
    return body && typeof body === 'object' ? { ok: true, body: body as T } : { ok: false, status: 502 };
  } catch {
    return { ok: false, status: 502 };
  }
}

/** How long a status answer is kept per package: every page waiting on one refresh shares one call a few seconds. */
const STATUS_TTL_MS = 5_000;
/** The most packages whose status or last expired update is kept at once; the oldest goes first. */
const KEPT = 1_000;

type StatusRead = Upstream<PackageRefreshStatus>;
const statuses = new Map<string, { at: number; read: Promise<StatusRead> }>();
/** The update each package's page was last expired for: one expiry per update, however often it is asked about. */
const expiredFor = new Map<string, string>();

/** Whether the page under `tag` is still to be expired for the update at `lastUpdatedAt`; from now on it counts as done. */
export function claimExpiry(tag: string, lastUpdatedAt: string): boolean {
  if (expiredFor.get(tag) === lastUpdatedAt) return false;
  keep(expiredFor, tag, lastUpdatedAt);
  return true;
}

/** Keeps `value` under `key` as the newest entry, dropping the oldest past `KEPT`. */
function keep<T>(map: Map<string, T>, key: string, value: T) {
  map.delete(key);
  map.set(key, value);
  if (map.size > KEPT) {
    const oldest = map.keys().next().value;
    if (oldest !== undefined) map.delete(oldest);
  }
}

/** Forgets the kept statuses and expiries (tests). */
export function resetPackageRefreshState() {
  statuses.clear();
  expiredFor.clear();
}

/** The package's refresh status from the API, read as the site; kept a few seconds per package, one call at a time. */
export function readStatus(registry: RegistryId, name: string, now: number): Promise<StatusRead> {
  const key = `${registry}/${name}`;
  const kept = statuses.get(key);
  if (kept && now - kept.at < STATUS_TTL_MS) {
    return kept.read;
  }
  const read = readUpstream<PackageRefreshStatus>(() =>
    signedFetch(`/packages/refresh/status?${new URLSearchParams({ registry, name })}`, { cache: 'no-store' }),
  );
  keep(statuses, key, { at: now, read });
  return read;
}
