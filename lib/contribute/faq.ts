import type { Route } from 'next';

import { MAINTAINERS_PATH, MCP_DOCS_PATH } from './contribute-path';
import { CONTACT_EMAIL } from '@/lib/legal';

/** A question, its answer, and where to read more. The id is its anchor on the questions page. */
export type FaqEntry = { id: string; question: string; answer: string; more?: { href: Route; label: string } };

export type FaqGroup = { id: string; title: string; entries: FaqEntry[] };

/** Autopilot's launch line, as Settings says it (manual-vs-autopilot, agreed 2026-11-03). */
export const AUTOPILOT_LAUNCH_LINE =
  'Autopilot opens about a month after launch. Until then every pull request waits for your review, and your record keeps counting.';

const IN_BETA: FaqEntry = {
  id: 'in-beta',
  question: 'Is Contribute in beta?',
  answer: `Yes. It is free, its limits may change, and every pull request waits for your review while autopilot is off. We read how every pull request turns out, to tune what we pick and how the agent works. Tell us what to fix at ${CONTACT_EMAIL}.`,
};

const COST: FaqEntry = {
  id: 'cost',
  question: 'Does it cost anything?',
  answer:
    "GitRanks is free. With your Claude key, the agent spends your API credits and stops at the caps you set. Give the key a workspace of its own with a spend limit, and keep auto-reload off: it can charge your card even while your plan's credits remain. With your own agent, nothing is spent through us.",
};

const GITHUB: FaqEntry = {
  id: 'github',
  question: 'What can you do on my GitHub account?',
  answer:
    'Only after your first submit, and only public_repo: fork a repo and keep the fork in step, push a branch to it, open the PR, and post the replies you approve (resolving their threads, or as a PR comment where a thread reply is refused). When you ask on GitRanks, we edit the PR title and text, fix its changelog or sign off its commits; for a proof you approve, we commit its screenshots to a branch in your fork, add it to the PR text and ask the review bot to check again. Nothing on private repos, never workflow files. Revoke it any time.',
};

const BILL: FaqEntry = {
  id: 'bill',
  question: 'Do you see my Claude bill or my code?',
  answer:
    'No. Your key is encrypted and used only for your attempts. Your own agent works on your machine and sends us only what it passes our tools: the patch, its report and the pull request text.',
};

const NOT_GOOD: FaqEntry = {
  id: 'not-good',
  question: "What if a fix isn't good?",
  answer: 'Discard it, or send it back with a note. Nothing reaches the maintainers until you submit.',
};

const FAIR: FaqEntry = {
  id: 'fair',
  question: 'Is it fair to maintainers?',
  answer:
    'We open at most one PR in a repo at a time, never more than four a month, and take a repo out of the shared pool for 90 days after two misses there within 90 days: a PR no one answers for 30 days, or one closed as wrong, low quality or harshly. Every PR says it was made with AI. Maintainers can opt their repo out.',
  more: { href: MAINTAINERS_PATH as Route, label: 'The rules for maintainers' },
};

/** The landing's six, short, in the landing's own order: that it is in beta, then cost (its visitors ask that first). */
export const LANDING_QUESTIONS: readonly FaqEntry[] = [IN_BETA, COST, GITHUB, BILL, NOT_GOOD, FAIR];

/** The questions page: contribution first, then the guardrails, the credits, and the record last. */
export const FAQ_GROUPS: readonly FaqGroup[] = [
  {
    id: 'contributing',
    title: 'Contributing',
    entries: [
      {
        id: 'who-runs',
        question: 'Who runs the agent?',
        answer:
          "You choose. Your own agent (Claude Code, Codex, Cursor, Gemini CLI, Antigravity, VS Code or another MCP client) works on your machine and hands the change back through our MCP server. Or ours: Claude on Claude Managed Agents, a hosted agent service Anthropic offers in beta, running in a sandbox in your own Anthropic organization on your API key. Your key serves only your attempts, never anyone else's.",
        more: { href: MCP_DOCS_PATH, label: 'Connect your own agent' },
      },
      {
        id: 'whose-name',
        question: 'Whose name is on the pull request?',
        answer:
          'Yours. While autopilot is off, nothing reaches GitHub until you approve it. The pull request opens from your fork, under your GitHub account, and you answer the review. Its text says it was made with AI and that you reviewed and submitted it. The agent drafts replies to reviews; only the ones you approve are posted.',
      },
      {
        id: 'maintainers-themselves',
        question: "Why don't maintainers just run an agent themselves?",
        answer:
          "Some do. Most issues wait for time, not for an agent: someone has to pick the issue, check the change on a real setup, read the diff and answer the review. You bring that time, and the credits. The maintainer gets a pull request a person has checked and answers for, one at a time per repo. Maintainers who'd rather do it themselves can opt their repo out.",
        more: { href: MAINTAINERS_PATH as Route, label: 'For maintainers' },
      },
    ],
  },
  {
    id: 'guardrails',
    title: 'Guardrails',
    entries: [
      {
        id: 'agent-wrong',
        question: 'What happens when the agent is wrong?',
        answer:
          "Usually you find out first. Every change goes through our checks (it stays within your size limits, touches no workflow, CI or license file, adds nothing that looks like a secret, and the tests your agent ran passed) and then waits for you: discard it, or send it back with a note. If a maintainer asks for changes, you or your agent can follow up on the same pull request; if they close it, that's the end of it. A pull request no one answers for 30 days gets you a warning, and we close it at 45 days, at least 15 days after the warning, unless you keep it open. Two misses in one repo within 90 days (no answer for 30 days, or closed as wrong, low quality or harshly) take it out of the shared pool for 90 days; a merge cancels its own miss. A maintainer who closes one saying the project takes no AI-made pull requests takes the repo out of Contribute for 90 days, one who asks us to stay away for 365. You answer for what you submit, so review it as you would anyone's code.",
      },
      FAIR,
      {
        id: 'autopilot',
        question: 'Is there an autopilot?',
        answer: `Not yet. ${AUTOPILOT_LAUNCH_LINE} When it opens, it stays off until you turn it on, unlocks after three of your pull requests are merged through GitRanks, never submits on beginner issues or in repos that don't allow it, and emails you an hour before each submission so you can stop it.`,
      },
      GITHUB,
    ],
  },
  {
    id: 'credits',
    title: 'Cost and credits',
    entries: [
      {
        id: 'cost-per-pr',
        question: 'What does a pull request cost?',
        answer:
          "GitRanks is free. With your own agent, a pull request costs what your agent's plan costs; nothing is spent through us. With our agent on your Claude key, each run spends API credits and stops at the budget you set (counted at Anthropic's list prices), and Agent runs shows what each one spent. The model and effort you pick, and the size of the change, decide most of it.",
      },
      {
        id: 'plan-credits',
        question: "Can I use my Claude plan's credits?",
        answer:
          "Claude Max, Ultra and Team plans come with monthly API credits: $100 on Max, $200 on Ultra, and Team's pooled, up to $500. They apply to API usage in the Console organization linked to your plan: if your key is in that organization, our agent's runs draw on them. Anthropic's terms decide what they cover and when they lapse, not ours. Keep auto-reload off: it looks only at credits you bought, and can charge your card even while your plan's credits remain.",
      },
      BILL,
    ],
  },
  {
    id: 'beta',
    title: 'Beta and your record',
    entries: [
      IN_BETA,
      {
        id: 'record',
        question: 'Does it count toward my rank?',
        answer: 'Merged pull requests stay on your GitHub profile, and can count toward your Contributor rank.',
      },
      {
        id: 'leave',
        question: 'How do I stop?',
        answer:
          'Pause any time. Remove your key, revoke your tokens or the GitHub access, or delete your Contribute data in Settings (a few records stay a while; the Privacy policy says which). Your merged pull requests stay yours.',
        more: { href: '/privacy#contribute' as Route, label: 'What the Privacy policy says stays' },
      },
    ],
  },
];
