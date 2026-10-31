'use client';

import { ArrowRight, BriefcaseBusiness, Package, SquareTerminal, Target } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { type FC, useEffect, useState } from 'react';

import { IssueCardCompact } from '@/app/contribute/components/issue-card-compact';
import { buttonVariants } from '@/components/ui/button';
import type { ContributeIssue } from '@/lib/contribute/contribute.types';
import { type ProfileIssuesAnswer, profileIssuesUrl } from '@/lib/contribute/profile-issues';
import { useContributeAllowed } from '@/lib/contribute/use-contribute-allowed';
import { cn } from '@/lib/utils';

const CONTRIBUTE_PATH: Route = '/contribute';
const ISSUES_PATH: Route = '/contribute/issues';

/** Who is looking: a user Contribute is open to, without picks yet, or a contributor with picks of their own. */
export type ContributeViewer = 'member' | 'contributor';

const POINTS = [
  {
    icon: Target,
    title: 'Help the projects you depend on',
    text: 'Point it at your stack, the libraries your repos use, and a fix there makes your own projects better too. Or choose repos yourself, or take any good issue.',
  },
  {
    icon: SquareTerminal,
    title: 'Your agent writes it, you approve it',
    text: 'Claude Code, Codex, Cursor or Gemini CLI, or ours in a sandbox on your Claude key. You review each change on GitRanks before we open the pull request.',
  },
  {
    icon: BriefcaseBusiness,
    title: 'A track record that works for you',
    text: 'Merged pull requests in projects people rely on stay on your GitHub profile: work to point to in your next job search, and to talk through in an interview. They can count toward your Contributor rank too.',
  },
];

const example = (
  issueId: string,
  nameWithOwner: string,
  number: number,
  title: string,
  language: ContributeIssue['language'],
  size: ContributeIssue['size'],
  why: string,
): ContributeIssue => ({
  issueId,
  repositoryId: `R_${issueId}`,
  nameWithOwner,
  number,
  url: '',
  title,
  labels: [],
  language,
  kind: null,
  size,
  score: 0,
  rank: 0,
  why,
});

/** Made-up picks, in the product's own words, for anyone without picks of their own. Marked as examples. */
export const EXAMPLE_PICKS: ContributeIssue[] = [
  example(
    'example-1',
    'fern-lang/fern',
    2481,
    'Formatter drops a trailing comment in match arms',
    'RUST',
    'S',
    'Your stack: fern-fmt · used by 3 of 5 repos · A maintainer asked for a PR',
  ),
  example(
    'example-2',
    'quill-db/quill',
    881,
    'Compaction ignores the configured max level size',
    'GO',
    'M',
    'Your stack: quill · used by 2 of 5 repos · Clear steps, expected and actual',
  ),
  example(
    'example-3',
    'tidepool/tide',
    312,
    'Document the retry semantics of the stream API',
    'RUST',
    'S',
    'Your stack: tide · used by 1 of 5 repos · A maintainer agreed it should change',
  ),
];

const WAYS = [
  { icon: SquareTerminal, title: 'Your own agent', text: 'Ask it to “Find me an issue on GitRanks”' },
  { icon: Package, title: 'Ours, on your Claude key', text: 'Runs in a sandbox and brings you a tested fix' },
];

const ACTION_CLASS = cn(buttonVariants({ size: 'lg' }), 'min-h-11 px-5 text-base font-semibold max-sm:w-full');

/** Into Contribute, where the menu item goes: its onboarding until the user is set up, then their overview. */
const Action: FC<{ viewer: ContributeViewer }> = ({ viewer }) => (
  <Link href={CONTRIBUTE_PATH} prefetch={false} className={ACTION_CLASS}>
    {viewer === 'contributor' ? 'Open Contribute' : 'Start contributing'}
    <ArrowRight aria-hidden />
  </Link>
);

/** The picks beside the pitch: the contributor's own top picks, or examples from a stack with the two ways to fix one. */
const Picks: FC<{ viewer: ContributeViewer; picks: ContributeIssue[] }> = ({ viewer, picks }) => {
  const own = viewer === 'contributor';

  return (
    <div className="relative min-w-0 pb-5">
      {/* The rest of the stack of picks, peeking out under the card. */}
      <div aria-hidden className="absolute inset-x-6 bottom-2.5 h-10 rounded-xl border bg-card" />
      <div aria-hidden className="absolute inset-x-12 bottom-0 h-10 rounded-xl border bg-card opacity-70" />
      <div
        className="relative overflow-hidden rounded-xl border bg-card shadow-sm"
        data-picks={own ? 'own' : 'example'}
      >
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-4 py-3">
          {own ? (
            <>
              <h3 className="font-semibold">Up next for you</h3>
              <Link href={ISSUES_PATH} prefetch={false} className="text-sm font-medium text-link">
                All picks in Issues →
              </Link>
            </>
          ) : (
            <h3 className="flex items-baseline gap-2">
              <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Example picks
              </span>{' '}
              <span className="text-sm text-muted-foreground">from a stack</span>
            </h3>
          )}
        </div>
        <div className="flex flex-col divide-y">
          {picks.map((issue) => (
            <IssueCardCompact key={issue.issueId} issue={issue} variant="pick" />
          ))}
        </div>
        {own ? null : (
          <div className="flex flex-col gap-2 border-t bg-muted/40 p-4">
            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Fix it with</span>
            <ul className="grid gap-2 sm:grid-cols-2">
              {WAYS.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex min-w-0 gap-2.5 rounded-lg border bg-card px-3 py-2.5 text-sm">
                  <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="flex min-w-0 flex-col">
                    <span className="font-semibold">{title}</span>
                    <span className="text-xs text-muted-foreground">{text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

/** The section as a viewer sees it. `picks`: the contributor's own, else the examples. */
export const ContributeSectionView: FC<{ viewer: ContributeViewer; picks: ContributeIssue[] }> = ({
  viewer,
  picks,
}) => (
  <section
    aria-labelledby="contribute"
    data-contribute-viewer={viewer}
    className="grid items-center gap-10 py-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:py-20"
  >
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex items-center gap-2">
        {viewer === 'contributor' ? null : (
          <span className="rounded-sm bg-brand-soft px-1.5 text-[11px] font-semibold tracking-wide text-brand-soft-foreground uppercase">
            New
          </span>
        )}
        <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          GitRanks Contribute
        </span>
      </div>
      <h2 id="contribute" className="text-2xl font-semibold tracking-tight text-balance md:text-3xl lg:text-4xl">
        Invest in the open source you build on
      </h2>
      <p className="max-w-prose text-muted-foreground lg:text-lg">
        Contribute finds open-source issues that fit you, including in the libraries your own projects depend on. Your
        coding agent writes the fix, you review it, and the pull request opens in your name.
      </p>
      <ul className="flex flex-col gap-4">
        {POINTS.map(({ icon: Icon, title, text }) => (
          <li key={title} className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-3">
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand-soft text-brand-soft-foreground">
              <Icon aria-hidden className="size-4" />
            </span>
            <div className="flex flex-col gap-0.5">
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{text}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-col items-start gap-2">
        <Action viewer={viewer} />
        <span className="text-sm text-muted-foreground">Free to use. Every pull request says it was made with AI.</span>
      </div>
    </div>
    <Picks viewer={viewer} picks={picks} />
  </section>
);

/** The signed-in user's own top picks, read once they may see the section; none for anybody else or on a failure. */
function useOwnPicks(login: string | null): ContributeIssue[] {
  const [picks, setPicks] = useState<ContributeIssue[]>([]);

  useEffect(() => {
    setPicks([]);
    const url = login ? profileIssuesUrl(login, login) : null;
    if (!url) return;
    let live = true;
    fetch(url)
      .then((res) => (res.ok ? (res.json() as Promise<ProfileIssuesAnswer>) : null))
      .then((data) => {
        if (live) setPicks(data?.issues ?? []);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [login]);

  return picks;
}

/**
 * GitRanks Contribute on the home page: the pitch, and picks beside it. Shown on the same answer as the header's
 * Contribute item, to signed-in users Contribute is open to: the preview list now, everyone signed in at launch. A
 * contributor sees their own top picks in place of the examples.
 */
export const ContributeSection: FC = () => {
  const { data: session } = useSession();
  const login = session?.user?.githubLogin ?? null;
  const allowed = useContributeAllowed(login) === true;
  const own = useOwnPicks(allowed ? login : null);

  if (!allowed) return null;

  return (
    <ContributeSectionView viewer={own.length ? 'contributor' : 'member'} picks={own.length ? own : EXAMPLE_PICKS} />
  );
};
