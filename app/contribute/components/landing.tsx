import type { Route } from 'next';
import Link from 'next/link';
import { Fragment, type ReactNode } from 'react';

import { ComingSoon } from './coming-soon';
import { Pill } from './primitives';
import { SignInButton, type SignInPath } from './sign-in-dialog';
import type { ContributeComingSoonProvider } from '@/lib/contribute/contribute.types';
import { CONNECT_AGENT_PATH, CONNECT_KEY_PATH, MAINTAINERS_PATH } from '@/lib/contribute/contribute-path';
import type { LandingViewer } from '@/lib/contribute/contribute-state';
import { cn } from '@/lib/utils';

const ACTIONS: Record<SignInPath, { label: string; href: Route }> = {
  key: { label: 'Start with my Claude key', href: CONNECT_KEY_PATH },
  agent: { label: 'Connect my own agent', href: CONNECT_AGENT_PATH },
};

const WAYS: {
  path: SignInPath;
  who: string;
  title: string;
  text: string;
  facts: [string, string][];
}[] = [
  {
    path: 'key',
    who: 'We run the agent',
    title: 'On your Claude key',
    text: "Best if your Claude Max or Team plan has API credits that expire unused. We pick an issue, run Claude in Anthropic's hosted sandbox, and bring you a tested change to review. You never touch a terminal.",
    facts: [
      ['You bring', 'A Claude API key, from a workspace with its own spend limit'],
      ['It spends', 'Your API credits, never more than the caps you set'],
      ['The pace', 'Spread across your billing cycle, or as fast as your caps allow'],
      ['Setup', 'One step, about two minutes'],
    ],
  },
  {
    path: 'agent',
    who: 'Your agent does the work',
    title: 'Claude Code, Codex, Cursor or Gemini CLI',
    text: 'Best if you already work with a coding agent. It asks GitRanks for an issue, fixes it on your machine, and hands the change back for your review here. Your agent and its model stay your own.',
    facts: [
      ['You bring', 'An agent that speaks MCP, and a token we give you'],
      ['It spends', 'Nothing through us: your agent, your plan'],
      ['The pace', 'Whenever you ask your agent. An issue is held for you 24 hours from its last step, 7 days at most'],
      ['Setup', 'Two short pastes, about a minute'],
    ],
  },
];

const STEPS = [
  {
    label: '01 · we pick',
    title: 'Issues worth your time',
    text: "From active repos that merge outside work and want the issue solved, ranked by your languages and the repos you've worked on.",
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
    text: 'Reviews and comments show up on My contributions, with a draft reply or a follow-up commit when they ask for changes.',
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
    text: 'Every pull request waits for you. After three of yours are merged you can turn on autopilot, if you want it.',
  },
  {
    title: 'Leaving',
    text: 'Remove your key, revoke your tokens and GitHub access, or delete your data. Your merged PRs stay yours.',
  },
];

const QUESTIONS = [
  {
    question: 'Does it cost anything?',
    answer:
      'No. With your Claude key, the agent spends your API credits, never past your caps. With your own agent, nothing is spent through us.',
  },
  {
    question: 'What can you do on my GitHub account?',
    answer:
      'Only after your first submit, and only public_repo: fork a repo, push a branch to the fork and open the PR. Nothing on private repos, never workflow files. Revoke it any time.',
  },
  {
    question: 'Do you see my Claude bill or my code?',
    answer:
      'No. Your key is encrypted and used only for your attempts. Your own agent works on your machine and sends us only the patch you submit.',
  },
  {
    question: "What if a fix isn't good?",
    answer: 'Discard it, or send it back with a note. Nothing reaches the maintainers until you submit.',
  },
  {
    question: 'Is it fair to maintainers?',
    answer:
      'We open at most one PR in a repo at a time, never more than four a month, and pause after two are closed in a row. Every PR says it was made with AI. Maintainers can opt their repo out.',
  },
];

const EYEBROW = 'text-[13px] font-semibold uppercase tracking-[0.06em] text-violet-700 dark:text-violet-300';
const H2 = 'text-[26px] font-extrabold tracking-[-0.01em] text-balance sm:text-[32px]';
const WIDTH = 'mx-auto w-full max-w-[1180px] px-4';
const MUTED_SECTION = 'border-y bg-muted/40';

/**
 * One of the two ways in. A visitor's opens the sign-in first; a signed-in user's goes straight to the step. `wide`:
 * the hero's and the closing row's, full width on a phone.
 */
function StartAction({
  path,
  viewer,
  preview,
  wide = false,
  className,
}: {
  path: SignInPath;
  viewer: LandingViewer;
  preview: boolean;
  wide?: boolean;
  className?: string;
}) {
  const { label, href } = ACTIONS[path];
  const classes = cn(
    'inline-flex items-center rounded-[10px] font-semibold transition-colors',
    wide ? 'min-h-[46px] max-sm:flex-[1_1_100%] max-sm:justify-center' : 'min-h-11',
    path === 'key'
      ? 'bg-primary px-5 text-primary-foreground hover:bg-primary/90'
      : 'border px-[18px] text-foreground hover:bg-accent',
    className,
  );
  if (viewer === 'visitor') {
    return (
      <SignInButton path={path} preview={preview} className={classes}>
        {label}
      </SignInButton>
    );
  }
  return (
    <Link href={href} prefetch={false} className={classes}>
      {label}
    </Link>
  );
}

function ExampleCard({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-2.5 rounded-[14px] border bg-card px-5 py-4 shadow-xs">{children}</div>;
}

/** A user whose agent token is live and whose agent has not called yet: carry on, or manage the token. */
function MidSetupStrip() {
  return (
    <div
      className="border-b border-violet-200 bg-violet-50 dark:border-violet-900 dark:bg-violet-950/40"
      data-landing="mid-setup"
    >
      <div className={cn(WIDTH, 'flex flex-wrap items-center justify-between gap-3 py-3 text-sm')}>
        <span>
          <span className="font-semibold">Almost there.</span> Your token is ready, and your agent hasn't connected yet.
        </span>
        <span className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <Link href={CONNECT_AGENT_PATH} prefetch={false} className="font-semibold text-primary">
            Continue setup →
          </Link>
          <Link
            href="/contribute/settings"
            prefetch={false}
            className="font-medium text-muted-foreground hover:text-foreground"
          >
            Settings
          </Link>
        </span>
      </div>
    </div>
  );
}

/**
 * Contribute's landing: what it does from an issue to a merged pull request, the two ways in, the ways that are coming,
 * what is set for the user, the questions. The same page for a visitor, a signed-in user and one mid-setup; only the
 * buttons and the strip change. `preview`: a signed-in user seeing the visitor's page (`?as=visitor`). `noted`: the
 * coming-soon providers the user asked to be told about.
 */
export function Landing({
  viewer,
  preview = false,
  noted,
}: {
  viewer: LandingViewer;
  preview?: boolean;
  noted?: readonly ContributeComingSoonProvider[];
}) {
  const action = (path: SignInPath, props: { wide?: boolean; className?: string } = {}) => (
    <StartAction path={path} viewer={viewer} preview={preview} {...props} />
  );

  return (
    <main className="flex flex-col" data-landing-viewer={viewer}>
      {viewer === 'mid-setup' ? <MidSetupStrip /> : null}

      <section className={cn(WIDTH, 'flex flex-wrap items-center gap-9 pt-8 pb-11 sm:gap-14 sm:pt-14 sm:pb-16')}>
        <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-5">
          <span className={EYEBROW}>Contribute</span>
          <h1 className="text-[36px] leading-[1.05] font-extrabold tracking-[-0.02em] text-balance sm:text-[52px]">
            Fix real open-source issues with the AI you already pay for
          </h1>
          <p className="max-w-[580px] text-lg leading-[1.55] text-foreground/80">
            We find issues maintainers want solved and match them to what you know. An agent writes the fix: ours,
            running on your Claude key, or your own agent on your machine. You review every change, and the pull request
            opens in your name.
          </p>
          <div className="flex flex-wrap gap-3">
            {action('key', { wide: true })}
            {action('agent', { wide: true })}
          </div>
          <p className="text-sm text-muted-foreground">
            Free to use. Nothing reaches GitHub without your OK. Leave any time.
          </p>
        </div>

        <figure
          aria-label="Example: from an issue to a merged pull request"
          className="m-0 flex min-w-0 flex-[1_1_400px] flex-col gap-3.5"
        >
          <ExampleCard>
            <div className="flex items-center justify-between gap-3 text-[13px] text-muted-foreground">
              <span className="font-mono">fern-lang/fern · #2481</span>
              <span>picked for you</span>
            </div>
            <span className="font-semibold">Formatter drops a trailing comment in match arms</span>
            <div className="flex flex-wrap gap-1.5">
              <Pill tone="green">good first issue</Pill>
              <Pill>bug</Pill>
              <Pill>Rust</Pill>
            </div>
            <span className="text-[13px] text-muted-foreground">
              Why: you write Rust, and you've contributed to fern-lang/fern-lsp
            </span>
          </ExampleCard>
          <div aria-hidden="true" className="flex items-center gap-2.5 pl-5 font-mono text-xs text-muted-foreground">
            <span className="h-8 w-0.5 bg-violet-200 dark:bg-violet-900" />
            an agent writes the fix · you review · you submit
          </div>
          <ExampleCard>
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full bg-[#8250df] px-2.5 py-0.5 text-xs font-semibold text-white">Merged</span>
              <span className="text-[13px] text-muted-foreground">3 days after you submitted</span>
            </div>
            <span className="font-semibold">Keep trailing comments when formatting match arms</span>
            <div className="flex flex-wrap gap-4 font-mono text-[13px]">
              <span>
                <span className="text-green-700 dark:text-green-400">+18</span>{' '}
                <span className="text-red-700 dark:text-red-400">−3</span>
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
            <p className="max-w-[720px] text-muted-foreground">
              Both get the same issues, the same review before anything is sent, and the same pull request in your name.
              They differ in who runs the agent and whose credits it spends.
            </p>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-5">
            {WAYS.map(({ path, who, title, text, facts }) => (
              <div key={path} className="flex min-w-0 flex-col gap-[18px] rounded-2xl border bg-card p-5 sm:p-7">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-semibold text-violet-700 dark:text-violet-300">{who}</span>
                  <h3 className="text-[22px] font-bold">{title}</h3>
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
                {action(path, { className: 'self-start' })}
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
              <span className="font-mono text-[13px] text-violet-700 dark:text-violet-300">{label}</span>
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
            <p className="max-w-[720px] text-muted-foreground">
              You start with sensible defaults, so there's nothing to configure before your first issue. Settings has
              every one of these.
            </p>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-4">
            {DEFAULTS.map(({ title, text }) => (
              <div key={title} className="flex min-w-0 flex-col gap-1.5 rounded-[14px] border bg-card p-5">
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
            Still unsure which way fits you? Start with either. You can add the other later from Settings.
          </p>
        </div>
        <dl className="flex min-w-0 flex-[2_1_560px] flex-col gap-[22px]">
          {QUESTIONS.map(({ question, answer }) => (
            <div key={question} className="flex flex-col gap-1">
              <dt className="font-bold">{question}</dt>
              <dd className="text-foreground/80">{answer}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="border-t">
        <div className={cn(WIDTH, 'flex flex-wrap items-center justify-between gap-5 pt-12 pb-16')}>
          <h2 className="text-[22px] font-bold">Ready for your first issue?</h2>
          <div className="flex flex-wrap gap-3 max-sm:w-full">
            {action('key', { wide: true })}
            {action('agent', { wide: true })}
          </div>
          <p className="basis-full text-sm text-muted-foreground">
            Maintain a repo?{' '}
            <Link href={MAINTAINERS_PATH} prefetch={false} className="font-semibold text-primary">
              Opt it out →
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
