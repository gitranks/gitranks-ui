import type { LearnPromoPlacement, LearnRecord } from './learn.types';
import { learnOpenInBrowser } from './learn-open';
import {
  type LearnPromoAnswer,
  type LearnRecordAnswer,
  learnPromoUrl,
  learnRecordOf,
  learnRecordUrl,
  type ShownPromo,
  shownPromoOf,
} from './learn-promo';

/** One JSON read; null on any failure. */
async function read<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

/**
 * The viewer's Learn suggestion here, read in the browser after the cached page: asked only when Learn is open to them
 * (the menu asks that already), so nobody else costs a read. Null for none, and on any failure.
 */
export async function readLearnPromo(
  placement: LearnPromoPlacement,
  viewer: string | null | undefined,
  profile?: string | null,
): Promise<ShownPromo | null> {
  const url = learnPromoUrl(placement, viewer, profile);
  if (!url || !(await learnOpenInBrowser(viewer))) return null;
  const answer = await read<LearnPromoAnswer>(url);
  // Checked again here: the route answers only what it shows, and this keeps a stray answer from showing anything.
  return answer?.promo ? shownPromoOf({ learnOpen: true, learnPromo: { show: true, ...answer.promo } }) : null;
}

/** A login's public Learn record, read in the browser; null for none, and on any failure. */
export async function readLearnRecord(login: string): Promise<LearnRecord | null> {
  const url = learnRecordUrl(login);
  if (!url) return null;
  return learnRecordOf((await read<LearnRecordAnswer>(url))?.record);
}
