/**
 * Contribute's landing in words: the head, the two ways, the steps, the defaults, the band and the footer it quotes.
 * The page (`landing.tsx`) and its Markdown copy (`landing-doc.ts`) both read them, so the two say the same. The proof
 * (the top card and "Merged through GitRanks") is live data and is not here.
 */

/** The page's title in search results. */
export const LANDING_SEARCH_TITLE = 'GitRanks Contribute: fix real open-source issues with the AI you already pay for';

export const LANDING_HERO = {
  title: 'Fix real open-source issues with the AI you already pay for',
  lead: 'We find issues maintainers want solved and match them to what you know. An AI agent writes the fix, you review it, and the pull request opens in your name.',
  terms: 'Free to use. Nothing reaches GitHub without your OK. Leave any time.',
};

export const LANDING_WAYS_HEAD = {
  title: 'Two ways to contribute. Pick either, add the other later.',
  text: 'Both get the same issues, the same review before anything is sent, and the same pull request in your name.',
};

/** One way to contribute, as the landing's two boxes say it: the same parts in the same places. */
export type LandingWay = {
  /** The small line on top: who does the work. */
  top: string;
  title: string;
  text: string;
  /** Four facts, label then value, one line each. */
  facts: readonly { label: string; value: string }[];
};

/** "Two ways to contribute": the hosted agent first, then the person's own. */
export const LANDING_WAYS: readonly LandingWay[] = [
  {
    top: 'We run the agent',
    title: 'On your Claude key',
    text: 'Best if your Claude plan has API credits that expire unused. We pick an issue, run Claude in a hosted sandbox, and bring you a tested change to review. You never touch a terminal.',
    facts: [
      { label: 'You bring', value: 'A Claude API key with its own spend limit' },
      { label: 'It spends', value: 'Your API credits, up to the caps you set' },
      { label: 'The pace', value: 'Spread across your billing cycle' },
      { label: 'Setup', value: 'One step, about two minutes' },
    ],
  },
  {
    top: 'Your agent does the work',
    title: 'With your own agent',
    text: 'Best if you already work with Claude Code, Codex, Cursor, Gemini CLI, VS Code or Antigravity. It asks GitRanks for an issue, fixes it on your machine, and hands the change back for your review.',
    facts: [
      { label: 'You bring', value: 'A coding agent that speaks MCP' },
      { label: 'It spends', value: 'Nothing through us: your agent, your plan' },
      { label: 'The pace', value: 'Whenever you ask your agent' },
      { label: 'Setup', value: 'Add GitRanks and allow it, about a minute' },
    ],
  },
];

export const LANDING_STEPS_TITLE = 'From an issue to a merged pull request';

/** The four steps, named like the stages of a pull request: `who` is the short label beside the step's number. */
export const LANDING_STEPS: readonly { who: string; title: string; text: string }[] = [
  {
    who: 'we pick',
    title: 'An issue worth your time',
    text: 'From active projects that want the issue solved, ranked by your languages. You see the full issue before you decide.',
  },
  {
    who: 'fix',
    title: 'Your agent writes the change',
    text: 'It reads the project, writes the fix and runs the tests. Nothing reaches GitHub yet.',
  },
  {
    who: 'approve',
    title: 'You read it and send it',
    text: 'Send it, send it back with a note, or drop it. The pull request opens in your name.',
  },
  {
    who: 'review',
    title: 'Maintainers answer',
    text: 'When they ask for a change, your agent prepares the answer and you send it. Then it is merged.',
  },
];

/** "01 · we pick": a step's label on the page. */
export const landingStepLabelOf = (index: number, who: string) => `${String(index + 1).padStart(2, '0')} · ${who}`;

export const LANDING_DEFAULTS_HEAD = {
  title: 'Everything is set for you, and all of it is yours to change',
  text: "You start with sensible defaults, so there's nothing to configure before your first issue. Settings has every one of these.",
};

/** What is set for a new person, six of them, in two rows of three. */
export const LANDING_DEFAULTS: readonly { title: string; text: string }[] = [
  {
    title: 'What you work on',
    text: "Every kind of issue at first: bugs, docs, tests, features. Your profile's languages rank first. Narrow by language or repo whenever you like.",
  },
  {
    title: 'Spend limits',
    text: "On your Claude key: monthly, weekly, daily and per-attempt caps, starting from your plan's allowance.",
  },
  {
    title: 'Pacing',
    text: 'Attempts spread across your billing cycle, so the credits last until they renew. Speed it up or pause any time.',
  },
  { title: 'The agent', text: 'Which models it uses and how large a pull request may get.' },
  {
    title: 'Your review',
    text: 'Every pull request waits for you. Autopilot opens about a month after launch, and only if you turn it on.',
  },
  {
    title: 'Leaving',
    text: 'Remove your key, disconnect your agent, revoke GitHub access, or delete your data. Your merged PRs stay yours.',
  },
];

/** "Honest with maintainers": what Contribute promises the projects it sends pull requests to. */
export const LANDING_BAND_TEXT =
  "Every pull request says an AI agent wrote the fix and who reviewed it. We open one pull request in a project at a time, follow each project's rules on AI, and stay out of projects that ask us to.";

/** One line of a pull request's footer: its words, with the part that is a link on GitHub. */
export type PrFooterLine = { before: string; link: string; after: string };

/**
 * The footer a pull request sent with a person's own agent ends with, as GitHub shows it, for the band beside
 * "Honest with maintainers": an example sender and agent. The pull requests' own footer is written elsewhere; this
 * copy is kept to its words by `landing-copy.spec.ts`.
 */
export const LANDING_PR_FOOTER: readonly [PrFooterLine, PrFooterLine] = [
  {
    before: 'Made with ',
    link: 'GitRanks Contribute',
    after: ' and Claude Code (Opus) · Reviewed and submitted by @mira-dev',
  },
  { before: 'Something off? ', link: 'Tell us or opt out in one step', after: '. Maintainers are always in control.' },
];

/** A footer line as a person reads it, its link as plain words. */
export const prFooterTextOf = ({ before, link, after }: PrFooterLine) => `${before}${link}${after}`;
