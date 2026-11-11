import { ArrowRight } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import type { FC, ReactNode } from 'react';

import { IssueCardCompact } from '@/app/contribute/components/issue-card-compact';
import { buttonVariants } from '@/components/ui/button';
import { contributeSource } from '@/lib/contribute/click-tracking';
import { LANGUAGES } from '@/lib/contribute/format';
import {
  cardOfPick,
  ownMatchOf,
  type ProfileLanguage,
  type ProfilePick,
  type ProfilePicksStats,
} from '@/lib/contribute/profile-picks';
import { cn } from '@/lib/utils';

/** Whose block: the signed-in owner of the profile (not connected yet), or anyone else looking at it. */
export type ContributeBlockAudience = 'own' | 'visitor';

const START_AGENT = '/contribute?start=agent' as Route;
const CONTRIBUTE: Route = '/contribute';
const SOURCE = contributeSource('profile_visitor_block');

const n = (value: number) => <span className="font-mono tabular-nums">{value.toLocaleString('en-US')}</span>;
const millions = (value: number) =>
  value >= 1_000_000 ? (
    <span className="font-mono tabular-nums">{(value / 1_000_000).toFixed(1)} million</span>
  ) : (
    n(value)
  );

/** What the pool is, in its true numbers when they were read. */
function poolLine(stats: ProfilePicksStats | null): ReactNode {
  if (!stats) {
    return 'GitRanks reads the issues of active open-source repositories and keeps the ones ready for an AI agent:';
  }
  return (
    <>
      GitRanks screened {n(stats.screenedRepos)} active repositories and read {millions(stats.issuesRead)} of their
      issues. {n(stats.readyIssues)} are ready for an AI agent today:
    </>
  );
}

const STEPS = [
  { title: 'Connect your agent', text: 'Claude Code, Codex, Cursor, Gemini CLI or Antigravity. About a minute.' },
  { title: 'It fixes an issue', text: 'It picks one of these, writes the change and runs the tests.' },
  { title: 'You approve it', text: 'The pull request opens in your name, on your GitHub profile.' },
];

/**
 * GitRanks Contribute on a profile whose owner hasn't connected: three ready issues matched to the profile, what they
 * are (the pool's true numbers), the steps to a first pull request, and why. `own`: the signed-in owner, "for you";
 * `visitor`: anyone else, worded about the profile's language, never "for you". Nothing without picks.
 */
export const ProfileContributeBlock: FC<{
  audience: ContributeBlockAudience;
  picks: ProfilePick[];
  stats: ProfilePicksStats | null;
  /** The profile's main pool language, for a visitor's words. */
  language: ProfileLanguage | null;
  /** Signed out: the visitor may be the owner, so the block offers the sign-in back to this profile. */
  onSignIn?: () => void;
}> = ({ audience, picks, stats, language, onSignIn }) => {
  if (!picks.length || (audience === 'visitor' && !language)) return null;
  const own = audience === 'own';
  const languageName = language?.name ?? '';
  const poolLanguage = language ? LANGUAGES[language.language] : '';

  return (
    <section
      aria-labelledby="profile-contribute"
      data-contribute-block={audience}
      {...SOURCE}
      className="grid overflow-hidden rounded-xl border bg-card shadow-sm lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] dark:shadow-none"
    >
      <div className="flex min-w-0 flex-col gap-4 p-5 lg:p-6">
        <div className="flex items-center gap-2">
          <span className="rounded-sm bg-brand-soft px-1.5 text-[11px] font-semibold tracking-wide text-brand-soft-foreground uppercase">
            Beta
          </span>
          <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            GitRanks Contribute
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <h2 id="profile-contribute" className="text-xl font-semibold tracking-tight text-balance">
            {own ? 'Open-source issues your agent can fix today' : `${languageName} issues an AI agent can fix today`}
          </h2>
          <p className="text-sm text-muted-foreground">
            {poolLine(stats)}{' '}
            {own
              ? 'clear, wanted by the maintainers, nobody on them. These three fit your stack.'
              : `clear, wanted by the maintainers, nobody on them. Here are today's best in ${languageName}, the main language on this profile.`}
          </p>
        </div>
        <ol className="flex flex-col gap-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="grid grid-cols-[1.5rem_minmax(0,1fr)] items-start gap-3">
              <span className="flex size-6 items-center justify-center rounded-full bg-brand-soft font-mono text-xs font-semibold text-brand-soft-foreground">
                {index + 1}
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-semibold">{step.title}</span>
                <span className="text-xs text-muted-foreground">{step.text}</span>
              </span>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link
            href={START_AGENT}
            prefetch={false}
            className={cn(buttonVariants(), 'font-semibold max-sm:min-h-11 max-sm:w-full')}
          >
            {own ? 'Let my agent fix one' : 'Fix one with your agent'}
            <ArrowRight aria-hidden />
          </Link>
          <Link href={CONTRIBUTE} prefetch={false} className="text-sm font-medium text-link hover:underline">
            How it works
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">
          Help the projects you use. Merged pull requests stay on your GitHub profile and can count toward your
          Contributor rank.
        </p>
      </div>
      <div className="flex min-w-0 flex-col border-t bg-muted/30 lg:border-t-0 lg:border-l">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b px-4 py-3">
          <h3 className="text-sm font-semibold">
            {own ? `Picked for ${ownMatchOf(picks)}` : `Today's best in ${poolLanguage}`}
          </h3>
          <span className="text-xs text-muted-foreground">
            {own ? 'Only you see this' : 'Ready for an agent, nobody on them'}
          </span>
        </div>
        <div className="flex flex-col divide-y bg-card">
          {picks.slice(0, 3).map((pick) => (
            <IssueCardCompact key={`${pick.repo}#${pick.number}`} issue={cardOfPick(pick)} variant="pick" />
          ))}
        </div>
        {!own && onSignIn ? (
          <p className="px-4 py-3 text-xs text-muted-foreground">
            Is this your profile?{' '}
            <button type="button" onClick={onSignIn} className="font-medium text-link hover:underline">
              Sign in to see issues picked for you
            </button>
          </p>
        ) : null}
      </div>
    </section>
  );
};
