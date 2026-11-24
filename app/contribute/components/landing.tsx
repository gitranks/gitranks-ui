import type { Route } from 'next';
import Link from 'next/link';
import { Fragment, type ReactNode } from 'react';

import { HashSafeLink } from './public-pages';
import { Pill } from '@/components/pill/pill';
import { buttonVariants } from '@/components/ui/button';
import { ComingSoon } from '@/components/workspace/agent/coming-soon';
import { H2, MUTED_SECTION, WIDTH } from '@/components/workspace/getting-in/landing-parts';
import { ResumeLink } from '@/components/workspace/getting-in/resume-link';
import { MaskedIssueFacts } from '@/components/workspace/masked-issue/facts';
import { type AgentPageStats, agentPageStatsLineOf } from '@/lib/contribute/agent-page.types';
import { LANDING_QUESTIONS } from '@/lib/contribute/faq';
import type { LandingExample } from '@/lib/contribute/landing-example';
import { cn } from '@/lib/utils';
import { contributeSource } from '@/lib/workspace/click-tracking';
import type { ContributeComingSoonProvider } from '@/lib/workspace/contribute.types';
import type { LandingViewer } from '@/lib/workspace/contribute-state';
import type { LandingStart } from '@/lib/workspace/getting-in';
import {
  AGENTS_DOC_PATH,
  CONTRIBUTE_TERMS_PATH,
  FAQ_PATH,
  MAINTAINERS_PATH,
  MCP_DOCS_PATH,
  WORKSPACE_PATHS,
} from '@/lib/workspace/paths';

const WAYS: {
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
    title: 'Claude Code, Codex, Cursor, Gemini CLI or Antigravity',
    text: 'Best if you already work with a coding agent. It asks GitRanks for an issue, fixes it on your machine, and hands the change back for your review here. Your agent and its model stay your own.',
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

const STEPS = [
  {
    label: '01 · we pick',
    title: 'Issues worth your time',
    text: "From active repos that handle outside PRs and want the issue solved, ranked by your languages and the repos you've worked on.",
  },
  {
    label: '02 · the agent works',
    title: 'A fix, with tests run',
    text: "It reads the repo, writes the change and runs the project's tests. Nothing leaves the sandbox, or your machine, yet.",
  },
  {
    label: '03 · you review',
    title: 'The diff, the tests, the cost',
    text: 'Submit it, send it back with a note, or discard it. Every pull request waits for your OK.',
  },
  {
    label: '04 · it opens in your name',
    title: 'From your fork',
    text: 'On your first submit we ask GitHub for one permission, public_repo, so we can fork and open the PR as you.',
  },
  {
    label: '05 · maintainers reply',
    title: 'You see it here',
    text: 'Reviews and comments show up in Pull requests, with a draft reply or a follow-up commit when they ask for changes.',
  },
];

const DEFAULTS = [
  {
    title: 'What you work on',
    text: "Every kind of issue at first: bugs, docs, tests, features. Your profile's languages rank first. Narrow by language, kind, size or repo whenever you like.",
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

/** The landing's foot: the pages open to every visitor. `plain`: a file, not a page (a plain link, no router). */
const FOOT_LINKS: { href: Route; label: string; plain?: boolean }[] = [
  { href: MCP_DOCS_PATH, label: 'MCP server docs' },
  { href: AGENTS_DOC_PATH as Route, label: 'For AI agents', plain: true },
  { href: FAQ_PATH, label: 'Questions' },
  { href: CONTRIBUTE_TERMS_PATH, label: 'Terms' },
];

/** The landing's one button, in the hero and again in the closing row. Full width on a phone. */
function StartButton({ start }: { start: LandingStart }) {
  const classes = cn(buttonVariants({ size: 'lg' }), 'min-h-11.5 px-5 text-base font-semibold max-sm:flex-[1_1_100%]');
  if ('member' in start) {
    return (
      // Unmarked: a member going back to their tab is no start, and the landing's mark counts starts.
      <Link href={WORKSPACE_PATHS.contribute} prefetch={false} className={classes} data-landing-start="">
        Open Contribute
      </Link>
    );
  }
  return (
    <ResumeLink
      side="contribute"
      href={start.href}
      signedIn={start.signedIn}
      className={classes}
      data-landing-start=""
      {...contributeSource('contribute_landing')}
    >
      Start contributing
    </ResumeLink>
  );
}

function ExampleCard({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-2.5 rounded-xl border bg-card px-5 py-4 shadow-xs">{children}</div>;
}

/** The example issue as a list shows it once its details are hidden: its facts and its title, no project. */
const MASKED_EXAMPLE = { language: 'Rust', size: 'S', kind: 'bug', projectTier: 4 } as const;

/**
 * The example's first card: the issue as a list shows it, masked once the rules are live, named before; while the rules
 * are not known, its title alone, so the page says nothing that may be wrong.
 */
function ExampleIssue({ example }: { example: LandingExample }) {
  if (example === 'shared') {
    return (
      <ExampleCard>
        <div className="flex items-center justify-end gap-3 text-xs text-muted-foreground" data-example="shared">
          <span>picked for you</span>
        </div>
        <span className="font-semibold">Formatter drops a trailing comment in match arms</span>
      </ExampleCard>
    );
  }
  if (example === 'masked') {
    return (
      <ExampleCard>
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground" data-example="masked">
          <span>Issue details are hidden until you see the full issue</span>
          <span>picked for you</span>
        </div>
        <MaskedIssueFacts issue={MASKED_EXAMPLE} />
        <span className="font-semibold">Formatter drops a trailing comment in match arms</span>
        <span className="text-xs text-muted-foreground">Why: you write Rust, and the project takes outside fixes</span>
      </ExampleCard>
    );
  }
  return (
    <ExampleCard>
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground" data-example="named">
        <span className="font-mono">fern-lang/fern · #2481</span>
        <span>picked for you</span>
      </div>
      <span className="font-semibold">Formatter drops a trailing comment in match arms</span>
      <div className="flex flex-wrap gap-1.5">
        <Pill tone="green">good first issue</Pill>
        <Pill>bug</Pill>
        <Pill>Rust</Pill>
      </div>
      <span className="text-xs text-muted-foreground">
        Why: you write Rust, and you've contributed to fern-lang/fern-lsp
      </span>
    </ExampleCard>
  );
}

/**
 * Contribute's landing: what it does from an issue to a merged pull request, the two ways an agent works, the ways that
 * are coming, what is set for the user, the questions. One button, Start contributing, into the flow (for a member
 * reading how it works, Open Contribute). `preview`: a signed-in user seeing the visitor's page (`?as=visitor`).
 * `noted`: the coming-soon providers the user asked to be told about.
 */
export function Landing({
  viewer,
  start,
  preview = false,
  noted,
  stats = null,
  example = 'named',
}: {
  viewer: LandingViewer;
  start: LandingStart;
  preview?: boolean;
  noted?: readonly ContributeComingSoonProvider[];
  /** The pool's public numbers, a line under the hero's button; left out when unread. */
  stats?: AgentPageStats | null;
  /** How the example issue is shown, by the rules that hold (`landingExampleOf`). */
  example?: LandingExample;
}) {
  return (
    <main className="flex flex-col" data-landing-viewer={viewer}>
      <section className={cn(WIDTH, 'flex flex-wrap items-center gap-9 pt-8 pb-11 sm:gap-14 sm:pt-14 sm:pb-16')}>
        <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-5">
          <Pill tone="violet">Beta</Pill>
          <h1 className="text-4xl font-bold tracking-tight text-balance md:text-5xl">
            Fix real open-source issues with the AI you already pay for
          </h1>
          <p className="max-w-xl text-lg text-foreground/80">
            We find issues maintainers want solved and match them to what you know. An agent writes the fix: ours,
            running on your Claude key, or your own agent on your machine. You review every change, and the pull request
            opens in your name.
          </p>
          <div className="flex flex-wrap gap-3">
            <StartButton start={start} />
          </div>
          <p className="text-sm text-muted-foreground">
            Free to use. Nothing reaches GitHub without your OK. Leave any time.
          </p>
          {stats ? (
            <p className="text-sm text-muted-foreground" data-landing="stats">
              {agentPageStatsLineOf(stats)}.
            </p>
          ) : null}
        </div>

        <figure
          aria-label="Example: from an issue to a merged pull request"
          className="m-0 flex min-w-0 flex-[1_1_400px] flex-col gap-3.5"
        >
          <ExampleIssue example={example} />
          <div aria-hidden="true" className="flex items-center gap-2.5 pl-5 font-mono text-xs text-muted-foreground">
            <span className="h-8 w-0.5 bg-primary/30" />
            an agent writes the fix · you review · you submit
          </div>
          <ExampleCard>
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
                Merged
              </span>
              <span className="text-xs text-muted-foreground">3 days after you submitted</span>
            </div>
            <span className="font-semibold">Keep trailing comments when formatting match arms</span>
            <div className="flex flex-wrap gap-4 font-mono text-xs">
              <span>
                <span className="text-positive">+18</span> <span className="text-negative">−3</span>
              </span>
              <span className="text-muted-foreground">2 files</span>
              <span className="text-muted-foreground">in your name</span>
            </div>
          </ExampleCard>
        </figure>
      </section>

      <section id="ways" className={cn(MUTED_SECTION, 'scroll-mt-4')}>
        <div className={cn(WIDTH, 'flex flex-col gap-7 py-11 sm:py-16')}>
          <div className="flex flex-col gap-2">
            <h2 className={H2}>Two ways to contribute. Pick either, add the other later.</h2>
            <p className="max-w-3xl text-muted-foreground">
              Both get the same issues, the same review before anything is sent, and the same pull request in your name.
              They differ in who runs the agent and whose credits it spends.
            </p>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-5">
            {WAYS.map(({ path, who, title, text, facts }) => (
              <div key={path} className="flex min-w-0 flex-col gap-4.5 rounded-2xl border bg-card p-5 sm:p-7">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-primary">{who}</span>
                  <h3 className="text-2xl font-bold">{title}</h3>
                  <p className="text-foreground/80">{text}</p>
                </div>
                <dl className="grid grid-cols-1 gap-y-0.5 text-sm sm:grid-cols-[120px_1fr] sm:gap-x-4 sm:gap-y-2.5">
                  {facts.map(([term, detail]) => (
                    <Fragment key={term}>
                      <dt className="text-muted-foreground">{term}</dt>
                      <dd className="max-sm:mb-2">{detail}</dd>
                    </Fragment>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ComingSoon viewer={viewer} preview={preview} noted={noted} />

      <section className={cn(WIDTH, 'flex flex-col gap-7 py-11 sm:py-16')}>
        <h2 className={H2}>From an issue to a merged pull request</h2>
        <ol className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-6">
          {STEPS.map(({ label, title, text }) => (
            <li key={label} className="flex min-w-0 flex-col gap-2">
              <span className="font-mono text-xs text-primary">{label}</span>
              <span className="font-bold">{title}</span>
              <span className="text-sm text-muted-foreground">{text}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className={MUTED_SECTION}>
        <div className={cn(WIDTH, 'flex flex-col gap-7 py-11 sm:py-16')}>
          <div className="flex flex-col gap-2">
            <h2 className={H2}>Everything is set for you, and all of it is yours to change</h2>
            <p className="max-w-3xl text-muted-foreground">
              You start with sensible defaults, so there's nothing to configure before your first issue. Settings has
              every one of these.
            </p>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-4">
            {DEFAULTS.map(({ title, text }) => (
              <div key={title} className="flex min-w-0 flex-col gap-1.5 rounded-xl border bg-card p-5">
                <h3 className="font-bold">{title}</h3>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={cn(WIDTH, 'flex flex-wrap gap-12 py-11 sm:py-16')}>
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-2.5">
          <h2 className={H2}>Questions</h2>
          <p className="text-muted-foreground">
            Still unsure which way fits you? Start with either. You can add the other later on the Agent tab.
          </p>
          <Link href={FAQ_PATH} prefetch={false} className="self-start font-semibold text-link hover:underline">
            All questions →
          </Link>
        </div>
        <dl className="flex min-w-0 flex-[2_1_560px] flex-col gap-5.5">
          {LANDING_QUESTIONS.map(({ question, answer }) => (
            <div key={question} className="flex flex-col gap-1">
              <dt className="font-bold">{question}</dt>
              <dd className="text-foreground/80">{answer}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="border-t">
        <div className={cn(WIDTH, 'flex flex-wrap items-center justify-between gap-5 pt-12 pb-16')}>
          <h2 className="text-2xl font-bold">Ready for your first issue?</h2>
          <div className="flex flex-wrap gap-3 max-sm:w-full">
            <StartButton start={start} />
          </div>
          <p className="basis-full text-sm text-muted-foreground">
            Maintain a repo?{' '}
            <Link href={MAINTAINERS_PATH} prefetch={false} className="font-semibold text-link">
              Opt it out →
            </Link>
          </p>
          <nav aria-label="More about Contribute" className="basis-full">
            <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
              {FOOT_LINKS.map(({ href, label, plain }) => {
                const linkClass =
                  'inline-flex items-center max-sm:min-h-11 text-muted-foreground hover:text-foreground hover:underline';
                return (
                  <li key={href}>
                    {plain ? (
                      <a href={href} className={linkClass}>
                        {label}
                      </a>
                    ) : (
                      <HashSafeLink href={href} className={linkClass}>
                        {label}
                      </HashSafeLink>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </section>
    </main>
  );
}
