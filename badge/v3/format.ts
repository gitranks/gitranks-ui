import type { Run, Segment, Tone } from './types';
import { getPercentileRank } from '@/utils/get-percentile-rank';

const full = new Intl.NumberFormat('en-US');
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

/** "41,206". */
export const formatFull = (value: number) => full.format(value);

/** "312k", "54.2k", "5.3M": thousands in lower case, as the designs write them. */
export const formatCompact = (value: number) => compact.format(value).replace('K', 'k');

/** "top 1%", or `null` past the top half or without a total. */
export function topShare(rank: number | null | undefined, total: number | null | undefined): string | null {
  if (!rank || !total) {
    return null;
  }
  const share = getPercentileRank(rank, total);
  return share === null ? null : `top ${share}%`;
}

export const text = (value: string, tone?: Tone): Run => (tone ? { text: value, tone } : { text: value });
export const mono = (value: string, tone?: Tone): Run =>
  tone ? { text: value, mono: true, tone } : { text: value, mono: true };

export const segment = (...runs: Run[]): Segment => ({ runs });

/** "#41,206". */
export const rankSegment = (rank: number): Segment => segment(mono(`#${formatFull(rank)}`));

/**
 * A rank's move since the 1st: "↑312" in the positive colour for a climb, "↓12" for a fall, nothing when it held.
 * Ranks count down, so a climb is `startRank > rank`.
 */
export function rankMoveSegment(rank: number | null | undefined, startRank: number | null | undefined): Segment | null {
  if (!rank || !startRank || rank === startRank) {
    return null;
  }
  const move = startRank - rank;
  return move > 0 ? segment(text(`↑${formatFull(move)}`, 'positive')) : segment(text(`↓${formatFull(-move)}`));
}
