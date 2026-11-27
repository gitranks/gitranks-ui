import { BUILD_BAR_MINE_PATH } from '@/lib/build/paths';
import type { BuildBar } from '@/lib/build/types';

/*
 * The person's bar, read in the browser by two parts of a page: Build's bar on Build's pages, and the site's header
 * (Grow's "New"). On a full load of a Build page both want it at once, so the header takes the bar's read when one
 * started a moment ago, and asks itself only when none did.
 */

/** How long a read of the bar serves the header too: long enough for one page load, short enough to stay fresh. */
export const BUILD_BAR_REUSE_MS = 10_000;

let last: { at: number; bar: Promise<BuildBar | null> } | null = null;

/** The person's bar as the API answers it; none on any failure. Each call reads it again. */
export function readBuildBar(signal?: AbortSignal): Promise<BuildBar | null> {
  const bar = (async () => {
    try {
      const res = await fetch(BUILD_BAR_MINE_PATH, signal ? { cache: 'no-store', signal } : { cache: 'no-store' });
      if (!res.ok) return null;
      return ((await res.json()) as { bar?: BuildBar | null } | null)?.bar ?? null;
    } catch {
      return null;
    }
  })();
  last = { at: Date.now(), bar };
  return bar;
}

/**
 * The bar within `waitMs`: the read another part started in the last few seconds, or a new one. Later than that is
 * none (and a read of its own stops).
 */
export function readBuildBarWithin(waitMs: number): Promise<BuildBar | null> {
  const controller = new AbortController();
  const reused = last && Date.now() - last.at < BUILD_BAR_REUSE_MS ? last.bar : null;
  const bar = reused ?? readBuildBar(controller.signal);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve(null);
    }, waitMs);
  });
  return Promise.race([bar, late]).finally(() => clearTimeout(timer));
}

/** Forgets the last read (tests). */
export function forgetBuildBarRead(): void {
  last = null;
}
