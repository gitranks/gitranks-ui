/**
 * The words of Contribute's flow pages, kept here so the pages and the design catalogue draw the same ones (a page file
 * may export only what the framework reads). The first step's two boxes keep their words with them
 * (`lib/contribute/start-ways.ts`), and the languages dialog with it.
 */

/** The first step's name, as the line of steps and the page's title say it. */
export const AGENT_TITLE = 'Your agent';

/** The way back from either way to the first step. */
export const BACK_TO_CHOICE = 'Two ways';

/** Connecting the person's own agent: the line over the title, and the title. */
export const OWN_AGENT_HEAD = {
  eyebrow: 'About a minute · no Claude key needed',
  title: 'Connect your own agent',
} as const;

/** Connecting a Claude key: its title (the key's own screen draws its head). */
export const KEY_TITLE = 'Connect your Claude key';

/**
 * The second step: its title, its parts' headings and the two lines under the list. When nothing fits, the list's place
 * has Contribute home's words (`NONE_FITS`).
 */
export const FIRST_ISSUE = {
  title: 'Pick your first issue',
  opened: 'The issue you opened',
  openedStart: 'Start fixing it',
  another: 'Or pick another',
  next: 'Next: you see one issue in full, your agent writes the fix, and you read it before anything reaches GitHub.',
  skip: 'Skip for now: open Contribute',
} as const;
