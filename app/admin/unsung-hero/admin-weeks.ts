import type { HeroBoard } from './admin.types';
import { weekShort } from './admin-copy';

const WEEK_MS = 7 * 86_400_000;

/** How many weeks the Schedule dialog offers, from the first one still open. */
export const WEEKS_OFFERED = 8;

/** The ISO week id of a date (`2026-W48`), in UTC. */
export function isoWeekOf(at: Date): string {
  const d = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
  // The week's Thursday decides its year.
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export type WeekOption = { week: string; startsAt: string; label: string; taken: boolean };

/**
 * The weeks Schedule may pick: the first still open and the ones after it. A week already holding a slot of the kind
 * scheduled now (a preview before launch, a real one after) is marked taken.
 */
export function weekOptionsOf(board: Pick<HeroBoard, 'firstOpenWeek' | 'upcoming' | 'live' | 'preview'>): WeekOption[] {
  const held = new Set(
    [...board.live, ...board.upcoming].filter((slot) => slot.preview === board.preview).map((slot) => slot.week),
  );
  const first = new Date(board.firstOpenWeek.startsAt).getTime();
  return Array.from({ length: WEEKS_OFFERED }, (_, index) => {
    const startsAt = new Date(first + index * WEEK_MS);
    const week = index === 0 ? board.firstOpenWeek.week : isoWeekOf(startsAt);
    const endsAt = new Date(startsAt.getTime() + WEEK_MS);
    return {
      week,
      startsAt: startsAt.toISOString(),
      label: `${weekShort({ startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() })} (${week})`,
      taken: held.has(week),
    };
  });
}
