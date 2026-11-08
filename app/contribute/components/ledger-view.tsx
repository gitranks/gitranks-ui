import Link from 'next/link';
import type { ReactNode } from 'react';

import { HEADING, PageTitle, Pill } from './primitives';
import { dayLabel } from '@/lib/contribute/format';
import type {
  ContributeLedger,
  ContributeLedgerPr,
  ContributeLedgerPreview,
  ContributeLedgerRepo,
  ContributeLedgerSaidNo,
  ContributeLedgerState,
  ContributeLedgerTotals,
  ContributeLedgerWeek,
} from '@/lib/contribute/ledger.types';

/**
 * The Contribute ledger (ledger design 2026-11-03 §4): every pull request Contribute users opened in other people's
 * repositories, and how it ended, closed ones included. Outcomes per repository; no person is named.
 */

const MAIN = 'mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-7 pb-16';
const CARD = 'min-w-0 overflow-hidden rounded-xl border bg-card';
const TH = 'px-3 py-2.5 font-medium';

const STATE: Record<ContributeLedgerState, { label: string; tone: 'violet' | 'red' | 'neutral' }> = {
  MERGED: { label: 'Merged', tone: 'violet' },
  CLOSED: { label: 'Closed', tone: 'red' },
  OPEN: { label: 'Open', tone: 'neutral' },
};

const count = (n: number) => n.toLocaleString('en-US');
const plural = (n: number, one: string, many: string) => `${count(n)} ${n === 1 ? one : many}`;

export function LedgerScreen({ ledger }: { ledger: ContributeLedger }) {
  const { totals } = ledger;
  return (
    <main className={MAIN}>
      {ledger.preview ? <PreviewBanner preview={ledger.preview} /> : null}
      <PageTitle
        title="Contribute ledger"
        text="Every pull request GitRanks Contribute users opened in other people’s repositories, and how it ended, closed ones included. Each was reviewed and submitted by a person, under their own name."
      >
        <Pill tone="violet">Beta</Pill>
      </PageTitle>
      <Totals totals={totals} />
      {totals.opened ? (
        <>
          <div className="grid gap-5 lg:grid-cols-[2fr_3fr]">
            <WeeksChart weeks={ledger.weeks} />
            <ReposTable repos={ledger.repos} total={totals.repos} />
          </div>
          <RecentTable recent={ledger.recent} />
        </>
      ) : (
        <p
          data-ledger="empty"
          className="rounded-xl border bg-card px-5 py-8 text-center text-sm text-muted-foreground"
        >
          No pull requests yet. The first one shows here when it is opened.
        </p>
      )}
      <SaidNo saidNo={ledger.saidNo} />
      <HowWeCount readAt={ledger.readAt} />
    </main>
  );
}

function PreviewBanner({ preview }: { preview: ContributeLedgerPreview }) {
  const bars = [
    { label: 'Pull requests', now: preview.prs, goal: preview.goalPrs },
    { label: 'Merged', now: preview.merged, goal: preview.goalMerged },
    { label: 'People besides you', now: preview.peopleBesides, goal: preview.goalPeopleBesides },
  ];
  return (
    <section
      data-ledger="preview"
      className="flex flex-col gap-3 rounded-xl border border-warning/30 bg-warning-soft px-5 py-4 text-warning-soft-foreground"
    >
      <div className="flex flex-col gap-1">
        <h2 className={HEADING.block}>Preview: only you see this page</h2>
        <p className="text-sm">
          Everyone else gets “Page not found”. It opens to everyone, signed out too, when the ledger switch is set to
          public. The bar you set for that:
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {bars.map(({ label, now, goal }) => (
          <div key={label} className="flex min-w-0 flex-col gap-1">
            <span className="flex justify-between text-xs">
              <span>{label}</span>
              <span className="font-mono">
                {count(now)} of {count(goal)}
              </span>
            </span>
            <span className="h-1.5 overflow-hidden rounded-full bg-warning-soft-foreground/15">
              <span
                className="block h-full rounded-full bg-warning-soft-foreground"
                style={{ width: `${goal > 0 ? Math.min(100, (now / goal) * 100) : 0}%` }}
              />
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Tile({ label, value, text, name }: { label: string; value: string; text: ReactNode; name: string }) {
  return (
    <div data-total={name} className="flex min-w-0 flex-col gap-1 rounded-xl border bg-card px-4.5 py-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-mono text-2xl font-bold">{value}</span>
      <span className="text-xs text-muted-foreground">{text}</span>
    </div>
  );
}

function Totals({ totals }: { totals: ContributeLedgerTotals }) {
  const decided = totals.merged + totals.closed;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <Tile
        name="opened"
        label="Pull requests opened"
        value={count(totals.opened)}
        text={`in ${plural(totals.repos, 'repository', 'repositories')}, by ${plural(totals.people, 'person', 'people')}`}
      />
      <Tile
        name="merged"
        label="Merged"
        value={count(totals.merged)}
        text={
          totals.latestMerged ? `latest: ${totals.latestMerged.repo}, ${dayLabel(totals.latestMerged.at)}` : 'none yet'
        }
      />
      <Tile
        name="closed"
        label="Closed without a merge"
        value={count(totals.closed)}
        text={totals.latestClosed ? `latest: ${totals.latestClosed.repo}, ${dayLabel(totals.latestClosed.at)}` : 'none'}
      />
      <Tile
        name="open"
        label="Still open"
        value={count(totals.open)}
        text={totals.oldestOpenAt ? `oldest opened ${dayLabel(totals.oldestOpenAt)}` : 'none'}
      />
      <Tile
        name="merge-rate"
        label="Merge rate"
        value={totals.mergeRate === null ? '—' : `${Math.round(totals.mergeRate * 100)}%`}
        text={decided ? `${count(totals.merged)} of ${count(decided)} decided` : 'none decided yet'}
      />
    </div>
  );
}

const SERIES: { key: 'merged' | 'closed' | 'open'; label: string; className: string }[] = [
  { key: 'merged', label: 'Merged', className: 'fill-series-1 bg-series-1' },
  { key: 'closed', label: 'Closed without a merge', className: 'fill-series-2 bg-series-2' },
  { key: 'open', label: 'Still open', className: 'fill-series-other bg-series-other' },
];

/** PRs opened per week, a stacked bar each, drawn on the server (no chart library here), with the numbers as a table. */
function WeeksChart({ weeks }: { weeks: ContributeLedgerWeek[] }) {
  const height = 150;
  const most = Math.max(1, ...weeks.map((week) => week.merged + week.closed + week.open));
  const slot = 100 / Math.max(1, weeks.length);
  // A bar at most an eighth of the chart wide, centred in its week: three weeks do not draw three slabs.
  const bar = Math.min(slot * 0.7, 12);
  return (
    <section data-ledger="weeks" className="flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4.5">
      <h2 className={HEADING.card}>Opened per week, by how they ended</h2>
      <svg
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        className="h-40 w-full"
        role="img"
        aria-label="Pull requests opened per week, by how they ended"
      >
        {weeks.map((week, i) => {
          let top = height;
          return (
            <g key={week.weekStart}>
              {SERIES.map(({ key, className }) => {
                // A segment of one PR in a busy week still shows: 2 units at least.
                const h = week[key] ? Math.max(2, (week[key] / most) * (height - 4)) : 0;
                if (!h) return null;
                top -= h;
                return (
                  <rect
                    key={key}
                    x={i * slot + (slot - bar) / 2}
                    y={top}
                    width={bar}
                    height={h > 2 ? h - 1 : h}
                    className={className.split(' ')[0]}
                  />
                );
              })}
            </g>
          );
        })}
      </svg>
      <div className="flex justify-between font-mono text-xs text-muted-foreground" aria-hidden="true">
        <span>{dayLabel(weeks[0]?.weekStart)}</span>
        <span>{dayLabel(weeks.at(-1)?.weekStart)}</span>
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {SERIES.map(({ key, label, className }) => (
          <span key={key} className="inline-flex items-center gap-1.5">
            <span className={`size-2.5 rounded-sm ${className.split(' ')[1]}`} />
            {label}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>Pull requests opened per week</caption>
        <thead>
          <tr>
            <th>Week of</th>
            {SERIES.map(({ key, label }) => (
              <th key={key}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week.weekStart}>
              <td>{dayLabel(week.weekStart)}</td>
              {SERIES.map(({ key }) => (
                <td key={key}>{week[key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Num({ value }: { value: number }) {
  return <td className={`px-3 py-2.5 text-right font-mono ${value ? '' : 'text-muted-foreground'}`}>{count(value)}</td>;
}

function ReposTable({ repos, total }: { repos: ContributeLedgerRepo[]; total: number }) {
  return (
    <section data-ledger="repos" className={CARD}>
      <h2 className={`${HEADING.card} border-b px-5 py-3.5`}>
        By repository · {repos.length < total ? `newest ${count(repos.length)} of ${count(total)}` : count(total)}
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-140 border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs tracking-wider text-muted-foreground uppercase">
              <th className="px-5 py-2.5 font-medium">Repository</th>
              <th className={`${TH} text-right`}>Opened</th>
              <th className={`${TH} text-right`}>Merged</th>
              <th className={`${TH} text-right`}>Closed</th>
              <th className={`${TH} text-right`}>Open</th>
              <th className="py-2.5 pr-5 pl-3 font-medium">Takes new PRs</th>
            </tr>
          </thead>
          <tbody>
            {repos.map((repo) => (
              <tr key={repo.repo} className="border-t">
                <td className="px-5 py-2.5 font-mono text-xs">
                  <a
                    href={`https://github.com/${repo.repo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground hover:underline"
                  >
                    {repo.repo}
                  </a>
                </td>
                <td className="px-3 py-2.5 text-right font-mono">{count(repo.opened)}</td>
                <Num value={repo.merged} />
                <Num value={repo.closed} />
                <Num value={repo.open} />
                <td className="py-2.5 pr-5 pl-3 text-xs text-muted-foreground">
                  {repo.takesNewPrs ? 'Yes' : 'Not now'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t px-5 py-3 text-xs text-muted-foreground">
        Newest pull request first. “Not now”: the repo said no, or a maintainer closed one of our pull requests saying
        the project takes no AI-made pull requests, or asking us to stay away. Why each repo said no is not shown here;
        the counts are below.
      </p>
    </section>
  );
}

function RecentTable({ recent }: { recent: ContributeLedgerPr[] }) {
  return (
    <section data-ledger="recent" className={CARD}>
      <h2 className={`${HEADING.card} border-b px-5 py-3.5`}>Recent pull requests</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-140 border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs tracking-wider text-muted-foreground uppercase">
              <th className="px-5 py-2.5 font-medium">Pull request</th>
              <th className={TH}>State</th>
              <th className="py-2.5 pr-5 pl-3 font-medium">Dates</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((pr) => (
              <tr key={pr.url} data-pr={pr.number} className="border-t">
                <td className="px-5 py-3 align-top">
                  <a
                    href={pr.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-foreground hover:underline"
                  >
                    {pr.title || `${pr.repo} #${pr.number}`}
                  </a>
                  <div className="font-mono text-xs text-muted-foreground">
                    {pr.repo} · PR #{pr.number}
                  </div>
                </td>
                <td className="px-3 py-3 align-top">
                  <Pill tone={STATE[pr.state].tone}>{STATE[pr.state].label}</Pill>
                </td>
                <td className="py-3 pr-5 pl-3 align-top text-xs whitespace-nowrap text-muted-foreground">
                  <div>Opened {dayLabel(pr.openedAt)}</div>
                  {pr.endedAt ? (
                    <div>
                      {pr.state === 'MERGED' ? 'Merged' : 'Closed'} {dayLabel(pr.endedAt)}
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t px-5 py-3 text-xs text-muted-foreground">
        No names on this page: each pull request names its author on GitHub. The newest 50; the totals above count them
        all.
      </p>
    </section>
  );
}

function SaidNo({ saidNo }: { saidNo: ContributeLedgerSaidNo }) {
  const tiles = [
    {
      name: 'total',
      label: 'All repos that said no',
      value: saidNo.total,
      text: 'each counted once, by its first reason',
    },
    {
      name: 'opted-out',
      label: 'Opted out by a maintainer',
      value: saidNo.optedOut,
      text: 'on the maintainers page or in .github/gitranks.yml',
    },
    {
      name: 'hostile-close',
      label: 'Asked us to stay away',
      value: saidNo.hostileClose,
      text: 'a maintainer said so when closing one of our pull requests',
    },
    {
      name: 'closed-no-ai',
      label: 'Said no AI-made PRs',
      value: saidNo.closedNoAi,
      text: 'a maintainer said so when closing one of our pull requests',
    },
    {
      name: 'ai-policy',
      label: 'AI policy says no',
      value: saidNo.aiPolicy,
      text: 'their CONTRIBUTING or AI policy forbids AI-made pull requests',
    },
    {
      name: 'outside-prs-closed',
      label: 'Closed to outside PRs',
      value: saidNo.outsidePrsClosed,
      text: 'only collaborators, or approved contributors, open pull requests',
    },
    // Retired: two closed without a merge in a row paused us. Shown while old rows still count.
    ...(saidNo.paused > 0
      ? [
          {
            name: 'paused',
            label: 'Paused after 2 closed',
            value: saidNo.paused,
            text: 'two closed without a merge in a row, under a retired rule',
          },
        ]
      : []),
  ];
  return (
    <section data-ledger="said-no" className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className={HEADING.section}>Repos that said no</h2>
        <Link href="/contribute/maintainers" className="text-sm font-semibold text-link hover:underline">
          For maintainers: opt your repo out ›
        </Link>
      </div>
      <p className="max-w-prose text-sm text-muted-foreground">
        Contribute never opens a pull request where a repo said no. These are the repos it leaves alone today, out of{' '}
        {count(saidNo.inPool)} it may suggest issues from.
      </p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {tiles.map(({ name, label, value, text }) => (
          <Tile key={name} name={name} label={label} value={count(value)} text={text} />
        ))}
      </div>
    </section>
  );
}

function HowWeCount({ readAt }: { readAt: string }) {
  const lines = [
    'A pull request counts once, when its user submits it from their own fork. Follow-up pushes to it are not new pull requests.',
    'Merge rate = merged ÷ (merged + closed without a merge). Open ones wait.',
    'Not counted: pull requests to a user’s own repositories or to our test repository, and ones opened outside our submit flow.',
    'A pull request GitHub no longer shows counts as closed and is not listed. A user who deletes their GitRanks data leaves this page within minutes.',
    'Never shown: who opened how many, or what anyone spent. This page is about outcomes in repositories, not about people.',
    `Open pull requests are read from GitHub every 2 hours, the newest within a minute; an ended one is not read again. These numbers are from ${dayLabel(readAt)}.`,
  ];
  return (
    <section data-ledger="how-we-count" className="flex min-w-0 flex-col gap-2.5 rounded-xl border bg-card p-4.5">
      <h2 className={HEADING.card}>How we count</h2>
      <ul className="flex max-w-prose list-disc flex-col gap-1.5 pl-4.5 text-sm text-foreground/80">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </section>
  );
}
