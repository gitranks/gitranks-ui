/** The matching moment after a key is stored: four lines that tick one by one while the first picks are ranked. */

/** Each line stays at least this long, so the sequence reads. */
export const MATCHING_LINE_MS = 900;
/** How often the picks are asked about. */
export const MATCHING_POLL_MS = 1_500;
/** Once the picks are ready, the page goes on by itself after this. */
export const MATCHING_CONTINUE_MS = 1_500;
/** Without picks after this, it goes on anyway: the list then says they are still being ranked. */
export const MATCHING_GIVE_UP_MS = 20_000;

export const MATCHING_LINES = 4;

/**
 * The lines ticked `elapsed` ms into the moment: one each `MATCHING_LINE_MS`, the last only once the picks are
 * computed. All of them ticked is the end.
 */
export const matchingTicksOf = (elapsed: number, computed: boolean): number =>
  Math.min(Math.floor(Math.max(0, elapsed) / MATCHING_LINE_MS), computed ? MATCHING_LINES : MATCHING_LINES - 1);

/** The lines, the profile's languages named in the second. */
export const matchingLinesOf = (languages: string[]): string[] => [
  'Your key works, and your plan is set',
  languages.length ? `Reading your profile: ${languages.join(', ')}` : 'Reading your profile',
  'Looking across the active repos that merge outside work',
  'Ranking the issues you would be good at',
];
