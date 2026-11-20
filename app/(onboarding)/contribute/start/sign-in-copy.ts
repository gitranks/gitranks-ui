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
