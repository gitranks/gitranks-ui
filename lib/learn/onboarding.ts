import type { Route } from 'next';

import { SETUP_LANGUAGES, type SetupInput, type SetupLanguage, type SetupLevel, type SetupValues } from './setup';

/*
 * Learn's onboarding at `/learn/setup`: two steps, "How Learn works" and "Your languages", for a person without the
 * Learn sign. A person with the sign gets the editor there, the setup form, unless a page sent them with a way back,
 * which they then go straight to.
 */

/** The steps' names, in the strip over the onboarding. */
export const ONBOARDING_STEPS = ['How Learn works', 'Your languages'] as const;

/** The first step's three lines: a title in bold, then its text. */
export const HOW_LEARN_WORKS: readonly { title: string; text: string }[] = [
  {
    title: 'Short lessons, one idea each.',
    text: 'Read for two minutes, then answer one question. A wrong answer shows why.',
  },
  { title: 'Lessons come back.', text: 'We ask again after a few days, so you keep what you learned.' },
  {
    title: 'Then fix a real issue.',
    text: 'Your agent fixes an open-source issue and writes a lesson on the fix. You answer its questions before the pull request opens.',
  },
];

/** The second step's line under its title. */
export const YOUR_LANGUAGES_TEXT = 'Pick the languages you want to learn. We start you at the first lesson of each.';

/** What `/learn/setup` draws for a signed-in person, or where it sends them before drawing anything. */
export type LearnSetupPage =
  | { kind: 'redirect'; to: Route }
  | { kind: 'onboarding'; back: Route | null }
  | { kind: 'editor'; back: Route | null };

/**
 * The page by the Learn sign: with it, the editor, or straight `back` when a page sent the person here; without it,
 * the onboarding. When the sign cannot be read (null), never `back` (the page that sent them would send them here
 * again): the setup's state decides as before the sign, a saved setup getting the editor, anything else the onboarding.
 */
export function learnSetupPageOf({
  sign,
  back,
  saved,
}: {
  sign: boolean | null;
  back: Route | null;
  /** The person's setup is saved; read only when the sign cannot be. */
  saved: boolean;
}): LearnSetupPage {
  if (sign === true) return back ? { kind: 'redirect', to: back } : { kind: 'editor', back: null };
  if (sign === false) return { kind: 'onboarding', back };
  return { kind: saved ? 'editor' : 'onboarding', back };
}

/** The level a save sends when the onboarding does not ask it: some experience. */
const LEVEL_UNASKED: SetupLevel = 2;

/**
 * The onboarding's save from the languages ticked and the setup as read (saved, or our guess): null while nothing is
 * ticked. The main language is the read one while it is still ticked, else the first ticked in Learn's order; the
 * others are the rest of the ticked. The level is the read one, else some experience.
 */
export function onboardingSaveOf(ticked: readonly SetupLanguage[], read: SetupValues): SetupInput | null {
  const languages = SETUP_LANGUAGES.filter((language) => ticked.includes(language));
  if (!languages.length) return null;
  const mainLanguage = read.mainLanguage && languages.includes(read.mainLanguage) ? read.mainLanguage : languages[0];
  return {
    mainLanguage,
    otherLanguages: languages.filter((language) => language !== mainLanguage),
    level: read.level ?? LEVEL_UNASKED,
  };
}

/** The languages ticked at first: the setup's as read, main first. */
export const onboardingTicksOf = (read: SetupValues): SetupLanguage[] =>
  SETUP_LANGUAGES.filter((language) => language === read.mainLanguage || read.otherLanguages.includes(language));

/** The lesson a way back opens, by its slug; null for any other page. */
export function lessonSlugOfBack(back: string | null): string | null {
  const match = back ? /^\/learn\/lessons\/([^/?#]+)\/?(?:[?#]|$)/.exec(back) : null;
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

/** The line over the first step: where the person goes once the onboarding is done, for a way back to a lesson or an issue. */
export function onboardingLineOf(back: string | null, answerKept: boolean): string | null {
  if (lessonSlugOfBack(back) !== null) {
    return answerKept
      ? 'Your answer is kept. After this you go back to the lesson.'
      : 'After this you go back to the lesson.';
  }
  if (back && /^\/my\/(?:issues|start)\//.test(back)) return 'After this you go back to the issue.';
  return null;
}
