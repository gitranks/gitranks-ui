import { useEffect, useState } from 'react';

import { type HeroHit, UNSUNG_HERO_CURRENT_PATH, UNSUNG_HERO_HIT_PATH, type UnsungHero } from './unsung-hero';

// This week's hero, asked in the browser by a repository page to count a view of the hero's repository. Kept for the
// page's life up to `KEPT_MS` and never past the hero's week, so a tab left open moves on to the next one.

/** How long an answer is kept before a new mount asks again. */
const KEPT_MS = 10 * 60_000;

let asked: Promise<UnsungHero | null> | null = null;
let known: UnsungHero | null | undefined;
let keptUntil = 0;

/** A failed ask answers `null` and is not kept: the next mount asks again. */
async function readHero(): Promise<{ hero: UnsungHero | null; ok: boolean }> {
  try {
    const res = await fetch(UNSUNG_HERO_CURRENT_PATH);
    if (!res.ok) return { hero: null, ok: false };
    return { hero: ((await res.json()) as { hero?: UnsungHero | null }).hero ?? null, ok: true };
  } catch {
    return { hero: null, ok: false };
  }
}

function askHero(at?: number): Promise<UnsungHero | null> {
  const now = at ?? Date.now();
  if (asked && now >= keptUntil && known !== undefined) {
    asked = null;
    known = undefined;
  }
  asked ??= readHero().then(({ hero, ok }) => {
    if (!ok) {
      asked = null;
      return null;
    }
    const weekEnd = hero ? new Date(hero.endsAt).getTime() : Number.POSITIVE_INFINITY;
    keptUntil = Math.min(Date.now() + KEPT_MS, Number.isNaN(weekEnd) ? Number.POSITIVE_INFINITY : weekEnd);
    known = hero;
    return hero;
  });
  return asked;
}

/**
 * This week's hero once the browser has it; `null` before, in a week with none, and on any failure. Nothing reads the
 * clock while the page renders: a page built ahead of time may not, so a kept answer is taken in the effect.
 */
export function useUnsungHero(): UnsungHero | null {
  const [hero, setHero] = useState<UnsungHero | null>(null);

  useEffect(() => {
    let live = true;
    askHero().then((answer) => {
      if (live) setHero(answer);
    });
    return () => {
      live = false;
    };
  }, []);

  return hero;
}

const reported = new Set<string>();

/**
 * Reports a hit, once per kind and repository per page load; the count itself is once per visitor a day. Not waited
 * for, and it outlives the page it was sent from.
 */
export function reportHeroHit(hit: HeroHit): void {
  const key = `${hit.kind}:${hit.repo.toLowerCase()}`;
  if (reported.has(key)) return;
  reported.add(key);
  fetch(UNSUNG_HERO_HIT_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(hit),
    keepalive: true,
  }).catch(() => undefined);
}

/** Forgets the answer and the hits reported (tests). */
export function resetUnsungHero(): void {
  asked = null;
  known = undefined;
  keptUntil = 0;
  reported.clear();
}
