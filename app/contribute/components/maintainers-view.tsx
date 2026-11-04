import Link from 'next/link';
import type { ReactNode } from 'react';

import { signInAsMaintainer } from '../maintainers/actions';
import { CopyButton } from './copy-button';
import { MAINTAINER_SETTINGS_SHOWN } from './maintainer-repo-extras';
import { MaintainerReposForm } from './maintainer-repos-form';
import { PrCardFacts } from './pr-card';
import { PrLinkForm } from './pr-link-form';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { ContributeMaintainerFacts, ContributePrCard } from '@/lib/contribute/contribute.types';
import { MAINTAINERS_PATH } from '@/lib/contribute/contribute-path';
import { type MaintainerErrorCode, maintainerErrorMessage } from '@/lib/contribute/errors';
import {
  anyPageKey,
  BADGE_EXAMPLE_REPO,
  CONFIG_FILE,
  type ConfigExampleLine,
  configAbilitiesOf,
  configExampleOf,
  contributeBadgeMarkdown,
  countOf,
  liveKeysOf,
} from '@/lib/contribute/maintainer-config';
import type { MaintainerReposView } from '@/lib/contribute/maintainers.data';
import { reportPathOf } from '@/lib/contribute/pr-feedback';
import { CONTACT_EMAIL } from '@/lib/legal';
import { cn } from '@/lib/utils';

/** The page's sections, in order, as "On this page" lists them. */
export const MAINTAINER_SECTIONS = [
  { id: 'how-it-works', title: 'How it works' },
  { id: 'checks', title: 'Checks and limits' },
  { id: 'work-with-us', title: 'Work with us' },
  { id: 'feedback', title: 'Feedback on a PR' },
  { id: 'opt-out', title: 'Opt out' },
] as const;

const H2 = 'text-2xl font-semibold tracking-tight text-balance md:text-[28px] md:leading-tight';
const SUB = 'max-w-[44rem] text-[15px] leading-relaxed text-muted-foreground';
const CARD = 'gap-3 rounded-xl p-5 shadow-none';
const MUTED = 'rounded-xl bg-muted/50 p-5';
const SMALL = 'text-[13px] leading-normal text-muted-foreground';

const STEPS = [
  { title: 'An issue you want fixed', text: 'Open, nobody assigned, no PR yet, and your docs allow AI help.' },
  {
    title: 'Claude Opus reads it and writes the fix',
    text: 'It reads the whole thread and your CONTRIBUTING, proves the bug with a failing test, then makes it pass.',
  },
  {
    title: 'A person reviews every line',
    text: 'On GitRanks, before anything reaches GitHub. They can send it back or drop it.',
  },
  {
    title: 'One pull request, in their name',
    text: 'It says it was made with AI. They answer your review, not a bot.',
  },
];

/** The page for maintainers: who we are not, how a PR is made, our limits, their say, and the way out. */
export function MaintainersScreen({
  facts,
  strip = null,
  badge = null,
  badgeRepo = BADGE_EXAMPLE_REPO,
  badgeMarkdown,
  prLink = '',
  prLinkForm,
  repos,
  more = null,
}: {
  /** The numbers and keys Contribute enforces; null while the API does not answer them (the numbers are left out). */
  facts: ContributeMaintainerFacts | null;
  /** The PR a footer link came from, above everything. */
  strip?: ReactNode;
  /** The badge's image. */
  badge?: ReactNode;
  /** The repo the badge's Markdown names: the visitor's, when a PR link names it. */
  badgeRepo?: string;
  /** The badge's Markdown and Copy, in place of `badgeRepo`'s: the page streams the footer link's repo into it. */
  badgeMarkdown?: ReactNode;
  /** The PR link form, in place of `prLink`'s: the page streams the footer link's PR into it. */
  prLinkForm?: ReactNode;
  /** The PR link "Tell us how a PR went" starts with: the one a footer link came from. */
  prLink?: string;
  /** "Your repos": the sign-in, or the visitor's repositories. */
  repos: ReactNode;
  /** The other pages about Contribute, at the foot: once it is launched. */
  more?: ReactNode;
}) {
  const liveNames = new Set(liveKeysOf(facts).map(({ key }) => key));
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-14 px-4 pt-6 pb-16 md:gap-[72px] md:pt-10">
      {strip}
      <Hero facts={facts} />
      <Section id="how-it-works" title="How every PR is made">
        <ol className="grid gap-4 md:grid-cols-4">
          {STEPS.map(({ title, text }, index) => (
            <li key={title} className="flex">
              <Card className={cn(CARD, 'flex-1 gap-2')}>
                <Dot>{index + 1}</Dot>
                <strong className="text-[15px] font-semibold">{title}</strong>
                <span className={SMALL}>{text}</span>
              </Card>
            </li>
          ))}
        </ol>
      </Section>
      <Section
        id="checks"
        title="Our own checks and limits come first"
        text="Before your rules, before any code. They hold for every user, with any agent, and nobody can turn them off."
      >
        {facts ? <LimitTiles facts={facts} /> : null}
        <div className="grid gap-4 md:grid-cols-3">
          <Checklist
            title="The issue"
            items={[
              'A maintainer agreed it should be fixed',
              'Nobody assigned, no open PR or claim',
              'Your CONTRIBUTING and AI policy allow it',
              liveNames.has('beginner_issues') && 'Good first issues stay with people if you say so',
            ]}
          />
          <Checklist
            title="The change"
            items={[
              'A test fails before the fix and passes after',
              'Your tests and linters run before it’s sent',
              (liveNames.has('max_changed_lines') || liveNames.has('max_files')) &&
                'Stays under your line and file limits',
              'The model can say “no-go” and stop: it does, often',
            ]}
          />
          <Checklist
            title="The person"
            items={[
              'Reviews and submits every PR by default',
              'Daily caps; new GitHub accounts get fewer',
              'Unfinished claims slow them down',
              'We review abuse flags every day and suspend',
            ]}
          />
        </div>
      </Section>
      <Section
        id="work-with-us"
        title="Tell us how you’d like help"
        text="We read your preferences before every pick and every PR. Set them once; change them any time."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <BadgeCard facts={facts} badge={badge} repo={badgeRepo} markdown={badgeMarkdown} />
          <ConfigCard facts={facts} />
          <Card className={CARD}>
            <Dot small>3</Dot>
            <strong className="text-base font-semibold">Help us get better</strong>
            <span className={SMALL}>
              A check we should add, a limit that’s wrong for your project, a rule we read wrong in your docs. We change
              the product from maintainers’ notes.
            </span>
            <div className={cn(MUTED, 'flex flex-col gap-1.5 p-3.5 text-[13px]')}>
              <span>“Please don’t touch our generated docs folder.”</span>
              <span>
                “Only issues labelled <span className="font-mono">help wanted</span>.”
              </span>
            </div>
            <Button asChild variant="outline" className="mt-auto min-h-11 self-start sm:min-h-10">
              <a href={`mailto:${CONTACT_EMAIL}`}>Write to {CONTACT_EMAIL}</a>
            </Button>
          </Card>
        </div>
      </Section>
      <Section
        id="feedback"
        title="Tell us how a PR went"
        text="Good or bad, one note is enough for us to look. We ask GitHub for your role in the repo first."
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Card className={cn(CARD, 'gap-4 p-6')}>{prLinkForm ?? <PrLinkForm defaultValue={prLink} />}</Card>
          <div className={cn(MUTED, 'flex flex-col gap-3.5 p-6')}>
            <strong className="text-[15px] font-semibold">What you can do depends on your role</strong>
            <Step n={1} title="Anyone signed in">
              tells us a PR helped (the author sees it), or reports one; we review every report within one working day
            </Step>
            <Step n={2} title="Admins and maintainers">
              can also stop work at once: on that PR, from that contributor, or in the whole repo
            </Step>
          </div>
        </div>
      </Section>
      <Section
        id="opt-out"
        title="Rather we stay away? One step, at once"
        text="No questions asked. Open PRs stay as they are; close them if you like."
        className="border-t pt-10"
      >
        <div className="grid gap-4 md:grid-cols-3 md:has-[>[data-wide]]:grid-cols-2">
          <Card className={CARD}>
            <strong className="text-[15px] font-semibold">Add one line to the repo</strong>
            <ConfigFile lines={[{ key: 'contribute', value: 'off' }]} />
            <span className={SMALL}>We read it before every pick and every PR. Delete it to let us back in.</span>
          </Card>
          {repos}
          <Card className={CARD}>
            <strong className="text-[15px] font-semibold">Or just say so in your docs</strong>
            <span className={SMALL}>
              A clear “no AI contributions” in CONTRIBUTING.md or AI_POLICY.md keeps us out. We read AGENTS.md and
              CLAUDE.md too.
            </span>
          </Card>
        </div>
      </Section>
      <section className="flex flex-col items-start justify-between gap-4 rounded-xl bg-muted/50 px-7 py-6 md:flex-row md:items-center">
        <div className="flex flex-col gap-1">
          <strong className="text-[17px] font-semibold">Questions, ideas, anything else</strong>
          <span className={SMALL}>A person reads every message.</span>
        </div>
        <Button asChild variant="outline" className="min-h-11 sm:min-h-10">
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </Button>
      </section>
      {more}
    </main>
  );
}

function Section({
  id,
  title,
  text,
  className,
  children,
}: {
  id: string;
  title: string;
  text?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn('flex scroll-mt-6 flex-col gap-6', className)}>
      <div className="flex flex-col gap-2">
        <h2 id={`${id}-title`} className={H2}>
          {title}
        </h2>
        {text ? <p className={SUB}>{text}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Dot({ children, small = false }: { children: ReactNode; small?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex flex-none items-center justify-center rounded-full bg-primary/10 font-bold text-primary',
        small ? 'size-8 text-[13px]' : 'size-9 text-sm',
      )}
    >
      {children}
    </span>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[36px_1fr] items-start gap-3">
      <Dot>{n}</Dot>
      <div className="flex flex-col gap-0.5">
        <strong className="text-sm font-semibold">{title}</strong>
        <span className={SMALL}>{children}</span>
      </div>
    </div>
  );
}

function Mark({ ok }: { ok: boolean }) {
  return ok ? (
    <span aria-hidden="true" className="flex-none font-bold text-positive">
      ✓
    </span>
  ) : (
    <span aria-hidden="true" className="flex-none font-bold text-negative">
      ×
    </span>
  );
}

/** Hero A: the AI PRs maintainers are used to, beside a GitRanks PR, then the page's sections. */
function Hero({ facts }: { facts: ContributeMaintainerFacts | null }) {
  const bad = [
    'Whatever model is cheapest',
    'Nobody read the change before you did',
    'As many PRs as a script can open',
    'Ignores CONTRIBUTING and your AI policy',
    'A bot answers your review, or nobody does',
  ];
  const good = [
    'Claude Opus reads the thread and writes the fix',
    'A person reviewed every line and submitted it',
    facts && `${facts.attemptsPerRepo} at a time in your repo, ${facts.prsPerMonth} in ${facts.monthDays} days at most`,
    'Your rules first: a “no AI” keeps us out',
    'The author answers your review themselves',
  ].filter((item): item is string => !!item);
  return (
    <section aria-labelledby="maintainers-title" className="flex flex-col gap-6">
      <div className="flex max-w-[52rem] flex-col gap-3.5">
        <span className="text-xs font-semibold tracking-[0.08em] text-primary uppercase">For maintainers</span>
        <h1
          id="maintainers-title"
          className="text-[32px] leading-[1.08] font-bold tracking-tight text-balance md:text-[44px]"
        >
          Not another AI pull-request bot
        </h1>
        <p className="max-w-[40rem] text-base leading-relaxed text-muted-foreground md:text-lg">
          You’ve seen them: a cheap model, nobody reading the diff, twenty PRs in a night. We built GitRanks Contribute
          to be the opposite, and we hold every PR to it.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className={cn(MUTED, 'flex flex-col gap-2.5 p-[22px]')}>
          <span className="text-[13px] font-semibold text-muted-foreground">The AI PRs you’re used to</span>
          <ul className="flex flex-col gap-2.5">
            {bad.map((item) => (
              <li key={item} className="flex gap-2.5 text-[15px] leading-snug">
                <Mark ok={false} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <Card className={cn(CARD, 'gap-2.5 border-primary/40 p-[22px]')}>
          <span className="text-[13px] font-semibold text-primary">A GitRanks PR</span>
          <ul className="flex flex-col gap-2.5">
            {good.map((item) => (
              <li key={item} className="flex gap-2.5 text-[15px] leading-snug">
                <Mark ok />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <nav aria-label="On this page" className="flex flex-wrap items-center gap-x-5 gap-y-1 border-y py-0.5">
        <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">On this page</span>
        {MAINTAINER_SECTIONS.map(({ id, title }, index) => (
          <a
            key={id}
            href={`#${id}`}
            className="inline-flex min-h-11 items-center gap-1.5 px-1 text-sm font-medium whitespace-nowrap hover:underline"
          >
            <span className="font-mono text-muted-foreground">{String(index + 1).padStart(2, '0')}</span>
            {title}
            <span aria-hidden="true" className="text-muted-foreground">
              ↓
            </span>
          </a>
        ))}
      </nav>
    </section>
  );
}

/** Our limits, from the numbers Contribute enforces: never typed here. */
function LimitTiles({ facts }: { facts: ContributeMaintainerFacts }) {
  const tiles = [
    {
      count: facts.attemptsPerRepo,
      title: facts.attemptsPerRepo === 1 ? 'attempt at a time' : 'attempts at a time',
      text: 'in your repo, across all our users',
    },
    { count: facts.prsPerMonth, title: `PRs in ${facts.monthDays} days`, text: 'at most, in your repo' },
    {
      count: facts.pauseStreak,
      title: 'closed in a row',
      text: `pause us for ${countOf(facts.pauseDays, 'day', 'days')}, no ask needed`,
    },
    { count: 0, title: 'bot comments', text: 'every reply comes from the PR’s author' },
    { count: 0, title: 'CI or workflow edits', text: 'nor license files or unrelated lockfiles' },
  ];
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-5">
      {tiles.map(({ count, title, text }) => (
        <li key={title} data-limit={title} className="flex flex-col gap-1.5 rounded-xl bg-muted/50 p-[18px]">
          <span className="font-mono text-[28px] leading-none font-bold text-primary tabular-nums">{count}</span>
          <strong className="text-sm font-semibold">{title}</strong>
          <span className={SMALL}>{text}</span>
        </li>
      ))}
    </ul>
  );
}

function Checklist({ title, items }: { title: string; items: (string | false)[] }) {
  return (
    <Card className={cn(CARD, 'gap-2.5')}>
      <strong className="text-[15px] font-semibold">{title}</strong>
      <ul className="flex flex-col gap-2.5">
        {items
          .filter((item): item is string => !!item)
          .map((item) => (
            <li key={item} className="flex gap-2.5 text-sm leading-snug">
              <Mark ok />
              <span>{item}</span>
            </li>
          ))}
      </ul>
    </Card>
  );
}

/** A `.github/gitranks.yml` as it would be written, each comment above its key. */
function ConfigFile({ lines }: { lines: ConfigExampleLine[] }) {
  return (
    <pre className="dark overflow-x-auto rounded-lg bg-background px-4 py-3.5 font-mono text-[13px] leading-relaxed text-foreground">
      <code>
        <span className="text-muted-foreground"># {CONFIG_FILE}</span>
        {lines.map(({ key, value, comment }) => (
          <span key={key}>
            {comment ? (
              <>
                {'\n'}
                <span className="text-muted-foreground"># {comment}</span>
              </>
            ) : null}
            {'\n'}
            <span className="text-primary">{key}</span>: <span className="text-warning">{value}</span>
          </span>
        ))}
      </code>
    </pre>
  );
}

/** The badge's Markdown for `repo`, with its Copy button. */
export function BadgeMarkdown({ repo }: { repo: string }) {
  const markdown = contributeBadgeMarkdown(repo);
  return (
    <>
      <pre className="dark rounded-lg bg-background px-4 py-3 font-mono text-[11px] leading-relaxed break-all whitespace-pre-wrap text-foreground">
        {markdown}
      </pre>
      <div>
        <CopyButton text={markdown} label="Copy Markdown" />
      </div>
    </>
  );
}

function BadgeCard({
  facts,
  badge,
  repo,
  markdown,
}: {
  facts: ContributeMaintainerFacts | null;
  badge: ReactNode;
  repo: string;
  markdown?: ReactNode;
}) {
  const priority = typeof facts?.badgeBoost === 'number';
  return (
    <Card className={CARD} data-badge-card="">
      <Dot small>1</Dot>
      <strong className="text-base font-semibold">Add the badge</strong>
      <span className={SMALL}>
        Tells contributors you welcome careful AI-assisted help.
        {priority ? ' Repos with the badge come first in their feed.' : null}
      </span>
      {badge ? <div className="dark flex justify-center rounded-lg bg-background p-3.5">{badge}</div> : null}
      {markdown ?? <BadgeMarkdown repo={repo} />}
      {priority ? (
        <span data-badge-priority="" className={SMALL}>
          Priority applies to repos we can suggest: active, with enough stars, and open to outside PRs.
        </span>
      ) : null}
    </Card>
  );
}

function ConfigCard({ facts }: { facts: ContributeMaintainerFacts | null }) {
  const live = liveKeysOf(facts);
  const abilities = configAbilitiesOf(live);
  const lines = live.length ? configExampleOf(live) : [{ key: 'contribute', value: 'off' }];
  return (
    <Card className={CARD} data-config-card="">
      <Dot small>2</Dot>
      <strong className="text-base font-semibold">Set your rules in a file</strong>
      <span className={SMALL}>
        {abilities ? `${abilities} Your file wins over everything else.` : 'We read it before every pick and every PR.'}
      </span>
      <ConfigFile lines={lines} />
      {live.length ? (
        <details className="text-[13px]">
          <summary className="flex min-h-11 cursor-pointer list-none items-center text-link hover:underline sm:min-h-0">
            All keys and what they do →
          </summary>
          <dl className="mt-2 flex flex-col gap-2.5" data-config-keys="">
            {live.map(({ key, values, meaning }) => (
              <div key={key} className="flex flex-col gap-0.5">
                <dt className="font-mono font-medium">
                  {key}: <span className="text-muted-foreground">{values}</span>
                </dt>
                <dd className="text-muted-foreground">{meaning}</dd>
              </div>
            ))}
          </dl>
        </details>
      ) : null}
      {MAINTAINER_SETTINGS_SHOWN && anyPageKey(live) ? (
        <span className={SMALL}>
          No access to the repo’s files?{' '}
          <a href="#opt-out" className="text-link hover:underline">
            Set the same rules after signing in →
          </a>
        </span>
      ) : null}
    </Card>
  );
}

/** The PR a footer link came from, with the two notes on it. */
export function PrStrip({ card }: { card: ContributePrCard }) {
  return (
    <Card
      data-pr-strip={card.attemptId}
      className="flex-col items-stretch justify-between gap-4 border-primary/40 bg-primary/10 p-5 shadow-none md:flex-row md:items-center"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <span className={SMALL}>You came here from this pull request</span>
        <PrCardFacts card={card} />
      </div>
      <div className="flex flex-none flex-wrap gap-2">
        <Button asChild variant="outline" size="lg" className="max-sm:min-h-11">
          <Link href={reportPathOf({ from: card.attemptId }, 'helped')} prefetch={false}>
            This PR helped
          </Link>
        </Button>
        <Button asChild variant="ghost" size="lg" className="max-sm:min-h-11">
          <Link href={reportPathOf({ from: card.attemptId })} prefetch={false}>
            Report this PR
          </Link>
        </Button>
      </div>
    </Card>
  );
}

/** The light GitHub sign-in, back to `returnTo` (this page, or the report page with its query). */
export function MaintainerSignIn({
  label = 'Sign in with GitHub',
  returnTo = MAINTAINERS_PATH,
  caption = true,
  variant = 'default',
}: {
  label?: string;
  returnTo?: string;
  caption?: boolean;
  variant?: 'default' | 'outline' | 'link';
}) {
  return (
    <form action={signInAsMaintainer} className="flex flex-col items-start gap-2">
      <input type="hidden" name="returnTo" value={returnTo} />
      <Button
        type="submit"
        variant={variant}
        className={cn(variant === 'link' ? 'h-auto p-0 text-link' : 'min-h-11 px-5 font-semibold sm:min-h-10')}
      >
        {label}
      </Button>
      {caption ? (
        <span className="text-xs text-muted-foreground">
          This signs you in to GitRanks with GitHub, which lets us read your profile and email addresses. We use that
          access only on these pages, to list your repos and check your role in them, and no longer use it after an
          hour. If you are signed in to GitRanks as another account, you switch to the GitHub account you sign in with.
        </span>
      ) : null}
    </form>
  );
}

export const OPT_OUT_TITLE = 'Or switch it off here';
const OPT_OUT_TEXT =
  'Sign in with GitHub: we list the public repos you administer or maintain. Turn each off in one click.';
const LISTED_TEXT =
  'We check with GitHub that you can administer or maintain each repo, then stop at once. Open PRs stay as they are; close them if you like.';

function OptOutCard({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <Card
      id="your-repos"
      data-wide={wide ? '' : undefined}
      className={cn(CARD, 'scroll-mt-6', wide && 'md:col-span-full md:row-start-2')}
    >
      {children}
    </Card>
  );
}

/** While the visitor's repositories are read from GitHub. */
export function MaintainerReposLoading() {
  return (
    <OptOutCard>
      <strong className="text-[15px] font-semibold">{OPT_OUT_TITLE}</strong>
      <div className="flex flex-col gap-2" aria-busy="true">
        <span className={SMALL}>Reading your repos from GitHub…</span>
        <Skeleton className="h-11 w-full rounded-lg" />
        <Skeleton className="h-11 w-full rounded-lg" />
      </div>
    </OptOutCard>
  );
}

/**
 * "Your repos": a sign-in, the repositories to switch off with what reports did in them, or why they could not be read.
 * `orgAccessUrl` is where an organization's member asks it to approve the sign-in's app.
 */
export function MaintainerReposPanel({
  view,
  orgAccessUrl,
  returnTo = MAINTAINERS_PATH,
}: {
  view: MaintainerReposView;
  orgAccessUrl: string;
  /** Where the sign-in comes back to: the page with its footer link's `?from=`. */
  returnTo?: string;
}) {
  if (view.state === 'listed') {
    return (
      <OptOutCard wide>
        <MaintainerReposForm
          title="Your repos"
          text={LISTED_TEXT}
          login={view.data.login}
          repos={view.data.repos}
          truncated={view.data.truncated}
          orgAccessUrl={orgAccessUrl}
        />
      </OptOutCard>
    );
  }

  const error = view.state === 'failed' ? view.error : null;
  return (
    <OptOutCard>
      <strong className="text-[15px] font-semibold">{OPT_OUT_TITLE}</strong>
      <span className={SMALL}>{OPT_OUT_TEXT}</span>
      {error ? (
        <p role="alert" data-error={error} className="text-sm text-destructive">
          {maintainerErrorMessage(error)}
        </p>
      ) : null}
      <div className="mt-auto">
        <NextStep error={error} returnTo={returnTo} />
      </div>
    </OptOutCard>
  );
}

/** A sign-in when there is none or GitHub refused it; after an outage, another try; nothing for what is not there. */
function NextStep({ error, returnTo }: { error: MaintainerErrorCode | null; returnTo: string }) {
  if (!error) return <MaintainerSignIn variant="outline" returnTo={returnTo} />;
  if (error === 'SIGNED_OUT') return <MaintainerSignIn label="Sign in again" returnTo={returnTo} />;
  if (error === 'NOT_AVAILABLE_YET') return null;
  return (
    <Button asChild variant="outline" className="min-h-11 self-start">
      <a href={`${MAINTAINERS_PATH}#opt-out`}>Try again</a>
    </Button>
  );
}
