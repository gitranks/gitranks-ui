/**
 * The words of Contribute's flow pages, kept here so the pages and the design catalogue draw the same ones (a page file
 * may export only what the framework reads).
 */

/** Step 1's head. */
export const WORK_HEAD = {
  title: 'What do you work on?',
  text: 'Issues are picked for these. You can change them any time in Settings.',
} as const;

/** Step 2's head, the choice of who does the work. */
export const AGENT_HEAD = {
  title: 'Who does the work?',
  text: 'An agent writes each fix and you review it before anything reaches GitHub. Pick one way now; you can add the other later.',
} as const;

/** Step 2's way back from either way to the choice. */
export const BACK_TO_CHOICE = 'Two ways';

/** Step 2 with the person's own agent: the line over the title, and the title. */
export const OWN_AGENT_HEAD = {
  eyebrow: 'About a minute · no Claude key needed',
  title: 'Connect your own agent',
} as const;

/** Step 2 with a Claude key, for a visitor (the key's own screen draws its head once signed in). */
export const KEY_HEAD = {
  title: 'Connect your Claude key',
  text: 'The hosted agent runs Claude on your key and brings you a tested change to review.',
} as const;

/** Step 3: its title, the visitor's line, the note when no issue matches, and the two lines under the list. */
export const FIRST_ISSUE = {
  title: 'Pick your first issue',
  visitorText: 'Issues picked for what you work on, ready for your agent.',
  none: 'No open issues match what you work on yet. New ones come in every day.',
  review: 'You review every change before anything reaches GitHub.',
  skip: 'Skip for now: open Contribute',
} as const;

/** Why the account is needed from Contribute's step 2 on. */
const NEEDED =
  'Your account is needed from this step: the agent works for it, and each pull request opens in your name.';

/** The sign-in card's words on Contribute's steps that need an account: the choice keeps the picks of step 1. */
export const CHOICE_SIGN_IN = {
  title: 'Sign in to connect an agent',
  text: `${NEEDED} What you picked in step 1 is kept.`,
} as const;

export const CONNECT_SIGN_IN = { title: 'Sign in to connect an agent', text: NEEDED } as const;

export const FIRST_ISSUE_SIGN_IN = { title: 'Sign in to pick your first issue', text: NEEDED } as const;
