import type { BuildLanguage, BuildLevel, BuildMine, BuildProjectCard } from './types';

/*
 * A project as a card says it, on Home and on Projects: its facts on the last line (level, steps, time), and for a
 * signed-in person their place in it on the line above.
 */

/** A project's level, in words. */
export const LEVEL_WORDS: Record<BuildLevel, string> = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };

/** A language's name. */
export const LANGUAGE_NAMES: Record<BuildLanguage, string> = { typescript: 'TypeScript', python: 'Python' };

const SMALL_NUMBERS = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

/** A whole number in words up to ten, in digits above: "three", "14". */
export const numberWords = (count: number): string => SMALL_NUMBERS[count] || count.toLocaleString('en-US');

/** The same with a capital first letter, to start a sentence: "Three", "14". */
export const numberWordsFirst = (count: number): string => {
  const words = numberWords(count);
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/**
 * How long a project takes, as a person reads it: to the nearest half hour, "about an hour and a half", "about two
 * hours"; under a quarter of an hour, in minutes. Nothing for no time.
 */
export function minutesWords(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '';
  const halves = Math.round(minutes / 30);
  if (halves === 0) return `about ${Math.max(5, Math.round(minutes / 5) * 5)} minutes`;
  if (halves === 1) return 'about half an hour';
  if (halves === 2) return 'about an hour';
  if (halves === 3) return 'about an hour and a half';
  const hours = Math.floor(halves / 2);
  return `about ${numberWords(hours)}${halves % 2 ? ' and a half' : ''} hours`;
}

/** A card's last line: "Easy · 16 steps · about an hour and a half". A fact the API did not give is left out. */
export function projectFactsOf(card: Pick<BuildProjectCard, 'level' | 'baseSteps' | 'minutes'>): string {
  const facts = [
    LEVEL_WORDS[card.level] ?? '',
    card.baseSteps > 0 ? `${card.baseSteps.toLocaleString('en-US')} ${card.baseSteps === 1 ? 'step' : 'steps'}` : '',
    minutesWords(card.minutes),
  ];
  return facts.filter(Boolean).join(' · ');
}

/** A mark a built project carries: the gold test passed ("Repeated after a week"), every step's question answered. */
export type BuildCardMark = 'gold' | 'answered';

/**
 * A person's place in a project, as its card shows it: the step they are on, the test left, or Built with its marks.
 * A part in progress after the base is told by its step.
 */
export type BuildCardPlace =
  | { kind: 'step'; number: number; of: number }
  | { kind: 'test_left' }
  | { kind: 'built'; marks: BuildCardMark[] };

/** One build's place, as a card says it. */
export function buildPlaceOf(build: BuildMine): BuildCardPlace {
  const { state } = build;
  if (state.kind === 'in_progress') return { kind: 'step', number: state.step.number, of: state.of };
  if (state.kind === 'test_left') return { kind: 'test_left' };
  const marks: BuildCardMark[] = [];
  if (state.gold.kind === 'earned') marks.push('gold');
  if (build.answeredEveryStep) marks.push('answered');
  return { kind: 'built', marks };
}

/**
 * The person's place on each project they touched, by the project's slug. With two builds of a project (one in each
 * language), the card shows the one touched last, as the project's own page puts it first.
 */
export function cardPlacesOf(builds: readonly BuildMine[]): Map<string, BuildCardPlace> {
  const last = new Map<string, BuildMine>();
  for (const build of builds) {
    const kept = last.get(build.project.slug);
    if (!kept || build.lastStepAt > kept.lastStepAt) last.set(build.project.slug, build);
  }
  return new Map([...last].map(([slug, build]) => [slug, buildPlaceOf(build)]));
}

/** A place in words, for the line of a card: "Step 9 of 16", "Every step done, the test is left". */
export const placeWordsOf = (place: Exclude<BuildCardPlace, { kind: 'built' }>): string =>
  place.kind === 'step' ? `Step ${place.number} of ${place.of}` : 'Every step done, the test is left';

/** What each mark says on a card. */
export const MARK_WORDS: Record<BuildCardMark | 'built', string> = {
  gold: 'Repeated after a week',
  answered: 'Answered every step',
  built: 'Built',
};
