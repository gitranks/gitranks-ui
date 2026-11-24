'use client';

import { ArrowRight, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import type { FC, ReactNode } from 'react';

import { OWNER_BLOCK_SHOWN, type OwnerIssue, OwnerIssueRows } from './profile-contribute-block';
import { buttonVariants } from '@/components/ui/button';
import { LEARN_ISSUES_PAGE_BUILT } from '@/lib/learn/built-pages';
import type { LearnQueueTopRow } from '@/lib/learn/learn-queue-top';
import { LEARN_HOME_PATH, LEARN_ISSUES_PATH } from '@/lib/learn/paths';
import { cn } from '@/lib/utils';
import { contributeSource } from '@/lib/workspace/click-tracking';
import { ABOUT_PATH } from '@/lib/workspace/paths';
import { languageColorOf } from '@/utils/language-colors';

/*
 * The owner's box on their own profile for someone who does not contribute: issues picked for someone who uses
 * neither product, or the top of a learner's own list. Both keep the frame of Contribute's own box, in the "yours"
 * violet, so they never read as part of the profile.
 */

/** The frame every owner's box shares: its label, heading, line and links (when it has any), then its rows. */
const OwnerBoxFrame: FC<{
  id: string;
  label: string;
  title: string;
  lead: ReactNode;
  links?: ReactNode;
  box: string;
  children: ReactNode;
}> = ({ id, label, title, lead, links, box, children }) => (
  <section
    aria-labelledby={id}
    data-owner-box={box}
    {...contributeSource('profile_issues_block')}
    className="flex flex-col gap-4 rounded-xl border border-violet-200 bg-violet-50/50 p-4 dark:border-violet-900 dark:bg-violet-950/20"
  >
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{label}</span>
        <h2 id={id} className="text-xl font-semibold tracking-tight text-balance">
          {title}
        </h2>
        <p className="max-w-prose text-sm text-muted-foreground">{lead}</p>
      </div>
      {links ? <div className="flex shrink-0 flex-wrap items-center gap-2 max-sm:w-full">{links}</div> : null}
    </div>
    {children}
  </section>
);

const linkClass = (primary: boolean) =>
  cn(
    buttonVariants({ size: 'sm', variant: primary ? 'default' : 'outline' }),
    'shrink-0 font-semibold max-sm:min-h-11 max-sm:flex-1',
  );

const n = (value: number) => <span className="font-mono tabular-nums">{value.toLocaleString('en-US')}</span>;

/**
 * Issues picked for an owner who uses neither product, with a way into each: "See GitRanks Contribute" and, while
 * Learn is open to them, "See GitRanks Learn" and "or learn from one". The ready issues are named only above zero.
 */
export const ProfilePickedBox: FC<{
  issues: OwnerIssue[];
  /** The pool's ready issues now. */
  readyIssues?: number | null;
  /** The profile's languages the picks were matched to ("TypeScript, Rust and Go"). */
  matchedTo?: string;
  learnOpen: boolean;
}> = ({ issues, readyIssues, matchedTo, learnOpen }) => {
  if (!issues.length) return null;
  return (
    <OwnerBoxFrame
      id="profile-picked"
      box="picked"
      label="Only you see this"
      title="Issues picked for you"
      lead={
        <>
          Picked for your {matchedTo ?? 'languages'} from{' '}
          {readyIssues && readyIssues > 0 ? <>{n(readyIssues)} </> : null}open-source issues ready to fix today. Fix one
          with your AI agent{learnOpen ? ', or learn from one' : ''}.
        </>
      }
      links={
        <>
          <Link href={ABOUT_PATH} prefetch={false} className={linkClass(true)}>
            See GitRanks Contribute
            <ArrowRight aria-hidden />
          </Link>
          {learnOpen ? (
            <Link href={LEARN_HOME_PATH} prefetch={false} className={linkClass(false)}>
              See GitRanks Learn
            </Link>
          ) : null}
        </>
      }
    >
      <OwnerIssueRows issues={issues.slice(0, OWNER_BLOCK_SHOWN)} from="contribute" />
    </OwnerBoxFrame>
  );
};

/** A row of the learner's list as the owner's rows draw it: masked, or named with its language's colour. */
export const learnOwnerIssueOf = (row: LearnQueueTopRow, colors?: Readonly<Record<string, string>>): OwnerIssue =>
  row.kind === 'masked'
    ? { repo: '', number: 0, url: '', title: null, language: null, why: null, masked: row.masked }
    : {
        repo: row.repo,
        number: row.number,
        url: row.url,
        title: row.title,
        language: row.language ? { name: row.language, color: languageColorOf(row.language, colors) } : null,
        why: null,
        masked: null,
      };

/**
 * The top of a learner's own list of issues ("For you" on), with the way to all of it once the Issues page is built.
 * Nothing without a row.
 */
export const ProfileLearnListBox: FC<{ rows: LearnQueueTopRow[]; colors?: Readonly<Record<string, string>> }> = ({
  rows,
  colors,
}) => {
  if (!rows.length) return null;
  return (
    <OwnerBoxFrame
      id="profile-learn-list"
      box="learn"
      label="GitRanks Learn · Only you see this"
      title="Issues for you to learn on"
      lead="From your own list, best first. Your agent fixes one, and its walkthrough teaches you the change."
      links={
        LEARN_ISSUES_PAGE_BUILT ? (
          <Link href={LEARN_ISSUES_PATH} prefetch={false} className={linkClass(true)}>
            All my issues
            <ArrowRight aria-hidden />
          </Link>
        ) : null
      }
    >
      <OwnerIssueRows
        issues={rows.slice(0, OWNER_BLOCK_SHOWN).map((row) => learnOwnerIssueOf(row, colors))}
        from="learn"
        whyIcon={GraduationCap}
      />
    </OwnerBoxFrame>
  );
};
