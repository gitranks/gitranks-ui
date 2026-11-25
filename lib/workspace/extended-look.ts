import { maskIdOf } from './masked-issue';

/**
 * The browser's mark of a look held longer on the way into an onboarding: "Start fixing it" without the sign spends the
 * look's one extension, so back on the issue the start form says when the hold really ends, and copying the prompt
 * asks for no second extension. It names the issue and ends with the hold.
 */
export type ExtendedLook = { id: string; until: string };

const KEY = 'gitranks:extended-look';

const storage = (): Storage | null => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
};

/** The look of `id` was held longer, until `until`. */
export function markExtendedLook(mark: ExtendedLook): void {
  const id = maskIdOf(mark.id);
  if (!id || !Number.isFinite(Date.parse(mark.until))) return;
  try {
    storage()?.setItem(KEY, JSON.stringify({ id, until: mark.until }));
  } catch {
    // A browser that keeps nothing: the form says today's words.
  }
}

/** Whether the look of `id` was held longer and its hold is not over at `now`. A mark past its time is dropped. */
export function isLookExtended(id: string, now: number): boolean {
  let raw: string | null = null;
  try {
    raw = storage()?.getItem(KEY) ?? null;
  } catch {
    return false;
  }
  if (!raw) return false;
  let mark: Partial<ExtendedLook> | null = null;
  try {
    mark = JSON.parse(raw) as Partial<ExtendedLook> | null;
  } catch {
    mark = null;
  }
  const until = typeof mark?.until === 'string' ? Date.parse(mark.until) : Number.NaN;
  if (Number.isFinite(until) && until > now) return maskIdOf(mark?.id) === id;
  try {
    storage()?.removeItem(KEY);
  } catch {
    // Nothing to drop.
  }
  return false;
}
