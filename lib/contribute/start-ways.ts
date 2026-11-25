import { GETTING_IN_PATHS, KEY_REPLACE_PATH, WORKSPACE_PATHS } from '@/lib/workspace/paths';

/*
 * Step 1 of Contribute's flow (page 38): how Contribute works, then who does the work. The page is the same in every
 * case: the two boxes keep their place and only a box's top line and its button change, worked out here as words.
 */

/** The three numbered lines of "How Contribute works", the same in every case: a bold start, then the rest. */
export const HOW_CONTRIBUTE_WORKS = [
  {
    lead: 'Your agent does the work.',
    rest: 'It takes an issue we picked for you, fixes it on its own copy of the project, and hands the change back.',
  },
  {
    lead: 'You approve every pull request.',
    rest: 'Nothing reaches GitHub until you read the change and press Approve on GitRanks. The pull request opens in your name.',
  },
  {
    lead: 'It is fair to maintainers.',
    rest: 'You can see 10 to 70 full issues a day, by your GitRanks tier, and 5 more for each pull request merged through GitRanks, up to 100. Every pull request says it was made with GitRanks and your agent.',
  },
] as const;

export const START_WAYS_TITLE = 'Who does the work?';
const PICK_LINE =
  'An agent writes each fix, and you read it before anything reaches GitHub. Pick one way now. You can add the other later.';
export const VISITOR_LINE =
  'Your GitHub account is needed from here: the agent works for it, and each pull request opens in your name.';
export const FROM_ISSUE_LINE = 'You opened an issue. After this setup you go back to it.';
export const MORE_ABOUT_CONTRIBUTE = { label: 'More about Contribute', href: '/contribute/about' } as const;

/** The two ways. */
export type StartWayName = 'own' | 'key';

/** What a way's box says that never changes: its title, sentence and four facts. */
export const START_WAYS: Record<
  StartWayName,
  { top: string; title: string; text: string; facts: readonly { label: string; value: string }[] }
> = {
  own: {
    top: 'Recommended',
    title: 'Your own agent',
    text: 'Claude Code, Codex, Cursor, Gemini CLI, VS Code or Antigravity takes an issue, fixes it on your computer and hands the change back for you to read here.',
    facts: [
      { label: 'You bring', value: 'A coding agent that speaks MCP' },
      { label: 'It spends', value: 'Nothing through us' },
      { label: 'The pace', value: 'Whenever you ask your agent' },
      { label: 'Setup', value: 'About a minute' },
    ],
  },
  key: {
    top: 'No terminal needed',
    title: 'A hosted agent on your Claude key',
    text: 'We pick an issue, run Claude for you in a hosted sandbox and bring you a tested change to read. Best if your plan has API credits that expire unused.',
    facts: [
      { label: 'You bring', value: 'A Claude API key' },
      { label: 'It spends', value: 'Your credits, up to your caps' },
      { label: 'The pace', value: 'Spread across your billing cycle' },
      { label: 'Setup', value: 'About two minutes' },
    ],
  },
};

/** What step 1 reads. */
export type StartWaysRead = {
  signedIn: boolean;
  /** The Contribute sign: the person went through this onboarding before. */
  sign: boolean;
  /** The name of the person's own agent when one is connected ("Claude Code"), '' when its name is not known; null when none is. */
  own: string | null;
  /** The Claude key: none saved, saved and working, or stopped working. */
  key: 'none' | 'connected' | 'invalid';
  /** The person has an attempt: "Go to your first issue" becomes "Go to your issues", to Contribute home. */
  attempt: boolean;
  /** The way back (`?issue=`), when the flow was opened from an issue; null otherwise. */
  issue: string | null;
  /** The issue of the way back still reads: only then the line above the title is drawn. */
  issueReads: boolean;
};

/** A box's button: filled or outlined; `signIn` signs a visitor in with GitHub first, then opens `href`. */
export type StartWayButton = { label: string; href: string; filled: boolean; signIn: boolean };

/** One box, as words. `small`: one row under the done box, with a short line in the place of the facts. */
export type StartWayBox = {
  name: StartWayName;
  top: { text: string; tone: 'brand' | 'done' | 'warning' };
  button: StartWayButton | null;
  small: { line: string } | null;
};

/** The page, as words. */
export type StartWays = {
  fromIssueLine: string | null;
  headLine: string;
  visitorLine: string | null;
  /** In the order drawn: the own agent first, unless only the key is done and the own agent's box is the small one. */
  boxes: StartWayBox[];
  /** The one "Continue" under the boxes, when both are done and the person has no sign. */
  next: StartWayButton | null;
};

/** The head's line once a way is connected and the person has no sign yet: the step is done. */
export const DONE_LINE = 'This step is done. Continue to your first issue.';
const KEY_DONE_LINE = 'Your Claude key is connected.';

/** `href` with the way back on it, when there is one. */
export function withWayBack(href: string, issue: string | null): string {
  if (!issue) return href;
  return `${href}${href.includes('?') ? '&' : '?'}issue=${encodeURIComponent(issue)}`;
}

/** "Claude Code is connected." for a box without the sign, or "Your agent is connected." when its name is not known. */
const ownDoneLine = (own: string) => `${own || 'Your agent'} is connected.`;

/** The head's second line, a box's done line and its words for the other way, for a person who connected one way. */
function readyLineOf(read: StartWaysRead): string | null {
  if (!read.sign) return null;
  const own = read.own !== null;
  const key = read.key === 'connected';
  if (own && key) return 'Both ways are connected, so you are ready. Go on to your first issue.';
  if (own)
    return `${read.own || 'Your agent'} is connected, so you are ready. Go on to your first issue, or add the other way as well.`;
  if (key)
    return 'Your Claude key is connected, so you are ready. Go on to your first issue, or add the other way as well.';
  return null;
}

/**
 * The page in every case of section 7.2: a visitor, opened from an issue, a key that stopped working, one way or both
 * connected without the sign (the step is done: "Continue"), and with the sign (back to add the other way).
 */
export function startWaysOf(read: StartWaysRead): StartWays {
  const back = (href: string) => withWayBack(href, read.issue);
  const fromIssueLine = read.issue && read.issueReads ? FROM_ISSUE_LINE : null;
  const step2 = back(GETTING_IN_PATHS.contributeIssue);
  const own = read.own !== null;
  const key = read.key === 'connected';
  const ownTop = { text: START_WAYS.own.top, tone: 'brand' as const };
  const keyTop = { text: START_WAYS.key.top, tone: 'brand' as const };

  if (!read.signedIn) {
    return {
      fromIssueLine,
      headLine: PICK_LINE,
      visitorLine: VISITOR_LINE,
      boxes: [
        {
          name: 'own',
          top: ownTop,
          button: {
            label: 'Sign in and connect your agent',
            href: back(GETTING_IN_PATHS.contributeAgentOwn),
            filled: true,
            signIn: true,
          },
          small: null,
        },
        {
          name: 'key',
          top: keyTop,
          button: {
            label: 'Sign in and use a Claude key',
            href: back(GETTING_IN_PATHS.contributeAgentKey),
            filled: false,
            signIn: true,
          },
          small: null,
        },
      ],
      next: null,
    };
  }

  if (read.sign) {
    const go: StartWayButton = {
      label: read.attempt ? 'Go to your issues' : 'Go to your first issue',
      href: read.attempt ? back(WORKSPACE_PATHS.contribute) : step2,
      filled: true,
      signIn: false,
    };
    const ownBox: StartWayBox = own
      ? {
          name: 'own',
          top: { text: read.own ? `Connected · ${read.own}` : 'Connected · your agent', tone: 'done' },
          button: go,
          small: null,
        }
      : {
          name: 'own',
          top: ownTop,
          button: {
            label: key ? 'Connect your own agent too' : 'Connect your agent',
            href: back(WORKSPACE_PATHS.agentConnect),
            filled: !key,
            signIn: false,
          },
          small: null,
        };
    const keyBox: StartWayBox =
      read.key === 'invalid' && !own
        ? invalidKeyBox(back(KEY_REPLACE_PATH))
        : key
          ? {
              name: 'key',
              top: { text: 'Connected · your Claude key', tone: 'done' },
              button: { ...go, filled: !own },
              small: null,
            }
          : {
              name: 'key',
              top: keyTop,
              button: {
                label: own ? 'Add a Claude key too' : 'Use a Claude key',
                href: back(WORKSPACE_PATHS.agentKey),
                filled: false,
                signIn: false,
              },
              small: null,
            };
    return {
      fromIssueLine,
      headLine: readyLineOf(read) ?? PICK_LINE,
      visitorLine: null,
      boxes: [ownBox, keyBox],
      next: null,
    };
  }

  // Signed in, no sign: the flow's own connect steps.
  const ownPath = back(GETTING_IN_PATHS.contributeAgentOwn);
  const keyPath = back(GETTING_IN_PATHS.contributeAgentKey);
  const cont: StartWayButton = { label: 'Continue', href: step2, filled: true, signIn: false };

  if (own && key) {
    return {
      fromIssueLine,
      headLine: DONE_LINE,
      visitorLine: null,
      boxes: [
        { name: 'own', top: { text: ownDoneLine(read.own ?? ''), tone: 'done' }, button: null, small: null },
        { name: 'key', top: { text: KEY_DONE_LINE, tone: 'done' }, button: null, small: null },
      ],
      next: cont,
    };
  }
  if (own) {
    return {
      fromIssueLine,
      headLine: DONE_LINE,
      visitorLine: null,
      boxes: [
        { name: 'own', top: { text: ownDoneLine(read.own ?? ''), tone: 'done' }, button: cont, small: null },
        {
          name: 'key',
          top: keyTop,
          button: { label: 'Add a Claude key', href: keyPath, filled: false, signIn: false },
          small: { line: 'No terminal needed. You can add it later.' },
        },
      ],
      next: null,
    };
  }
  if (key) {
    return {
      fromIssueLine,
      headLine: DONE_LINE,
      visitorLine: null,
      boxes: [
        { name: 'key', top: { text: KEY_DONE_LINE, tone: 'done' }, button: cont, small: null },
        {
          name: 'own',
          top: ownTop,
          button: { label: 'Connect your agent', href: ownPath, filled: false, signIn: false },
          small: { line: 'Recommended. You can add it later.' },
        },
      ],
      next: null,
    };
  }
  return {
    fromIssueLine,
    headLine: PICK_LINE,
    visitorLine: null,
    boxes: [
      {
        name: 'own',
        top: ownTop,
        button: { label: 'Connect your agent', href: ownPath, filled: true, signIn: false },
        small: null,
      },
      read.key === 'invalid'
        ? invalidKeyBox(keyPath)
        : {
            name: 'key',
            top: keyTop,
            button: { label: 'Use a Claude key', href: keyPath, filled: false, signIn: false },
            small: null,
          },
    ],
    next: null,
  };
}

/** The key's box when the key stopped working and nothing else is connected: "Replace your key", no "Continue". */
function invalidKeyBox(href: string): StartWayBox {
  return {
    name: 'key',
    top: { text: 'Your Claude key stopped working.', tone: 'warning' },
    button: { label: 'Replace your key', href, filled: false, signIn: false },
    small: null,
  };
}
