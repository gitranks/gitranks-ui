/**
 * Contribute's landing in words: the hero, the two ways and the steps. The page (`landing.tsx`) and its Markdown copy
 * (`landing-doc.ts`) both read them, so the two say the same.
 */

export const LANDING_HERO = {
  title: 'Fix real open-source issues with the AI you already pay for',
  lead: 'We find issues maintainers want solved and match them to what you know. An agent writes the fix: ours, running on your Claude key, or your own agent on your machine. You review every change, and the pull request opens in your name.',
  terms: 'Free to use. Nothing reaches GitHub without your OK. Leave any time.',
};

export const LANDING_WAYS_HEAD = {
  title: 'Two ways to contribute. Pick either, add the other later.',
  text: 'Both get the same issues, the same review before anything is sent, and the same pull request in your name. They differ in who runs the agent and whose credits it spends.',
};

export const LANDING_WAYS: {
  path: 'key' | 'agent';
  who: string;
  title: string;
  text: string;
  facts: [string, string][];
}[] = [
  {
    path: 'key',
    who: 'We run the agent',
    title: 'On your Claude key',
    text: "Best if your Claude Max, Ultra or Team plan has API credits that expire unused. We pick an issue, run Claude in Anthropic's hosted sandbox, and bring you a tested change to review. You never touch a terminal.",
    facts: [
      ['You bring', 'A Claude API key, from a workspace with its own spend limit'],
      ['It spends', 'Your API credits; each run stops at the caps you set'],
      ['The pace', 'Spread across your billing cycle, or as fast as your caps allow'],
      ['Setup', 'One step, about two minutes'],
    ],
  },
  {
    path: 'agent',
    who: 'Your agent does the work',
    title: 'With your own agent',
    text: 'Best if you already work with a coding agent: Claude Code, Codex, Cursor, Gemini CLI, Antigravity or VS Code. It asks GitRanks for an issue, fixes it on your machine, and hands the change back for your review here.',
    facts: [
      ['You bring', "An agent that speaks MCP. It signs in with your GitHub account; a client that can't gets a token"],
      ['It spends', 'Nothing through us: your agent, your plan'],
      [
        'The pace',
        'Whenever you ask your agent. An issue is held for you 24 hours from its last step, 48 hours without a patch that passes the checks, 7 days at most',
      ],
      ['Setup', 'Add GitRanks, then sign in and Allow in your browser. About a minute'],
    ],
  },
];

export const LANDING_STEPS_TITLE = 'From an issue to a merged pull request';

/** The steps: `who` is the step's short label beside its number. */
export const LANDING_STEPS: { who: string; title: string; text: string }[] = [
  {
    who: 'we pick',
    title: 'Issues worth your time',
    text: "From active repos that handle outside PRs and want the issue solved, ranked by your languages and the repos you've worked on.",
  },
  {
    who: 'the agent works',
    title: 'A fix, with tests run',
    text: "It reads the repo, writes the change and runs the project's tests. Nothing leaves the sandbox, or your machine, yet.",
  },
  {
    who: 'you review',
    title: 'The diff, the tests, the cost',
    text: 'Submit it, send it back with a note, or discard it. Every pull request waits for your OK.',
  },
  {
    who: 'it opens in your name',
    title: 'From your fork',
    text: 'On your first submit we ask GitHub for one permission, public_repo, so we can fork and open the PR as you.',
  },
  {
    who: 'maintainers reply',
    title: 'You see it here',
    text: 'Reviews and comments show up in Pull requests, with a draft reply or a follow-up commit when they ask for changes.',
  },
];

/** "01 · we pick": a step's label on the page. */
export const landingStepLabelOf = (index: number, who: string) => `${String(index + 1).padStart(2, '0')} · ${who}`;
