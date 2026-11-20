import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { LearnLessonStatePill } from './learn-lesson-state-pill';
import { LearnedLessonCard } from './learned-lesson-card';
import { Pill } from '@/components/pill/pill';
import { ListRow } from '@/components/workspace/list-row';
import { HEADING } from '@/components/workspace/primitives';
import { PullRequestChip, RefChips, repoUrlOf } from '@/components/workspace/ref-chips';
import {
  LESSON_KINDS,
  lessonViewPathOf,
  passedLineOf,
  progressLessonLinksOf,
  progressPath,
  pullRequestPageOf,
  REPO_PRS_SHOWN,
  repoLineOf,
  unfinishedRowOf,
} from '@/lib/learn/progress/progress';
import type {
  LearnProgressLesson,
  LearnProgressMergedPr,
  LearnProgressRepo,
  LearnProgressUnfinished,
} from '@/lib/learn/progress/progress.types';
import { dayLabel } from '@/lib/workspace/format';

/** The rows of one list, in a card. */
export function RowsCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <ul aria-label={label} className="overflow-hidden rounded-xl border bg-card">
      {children}
    </ul>
  );
}

/** A title that opens our page, or plain text when there is none to open. */
function Title({ href, children }: { href: Route | null; children: ReactNode }) {
  return href ? (
    <Link href={href} prefetch={false} className="hover:underline">
      {children}
    </Link>
  ) : (
    children
  );
}

const KindPill = ({ kind }: { kind: LearnProgressLesson['kind'] }) => (
  <Pill tone={LESSON_KINDS[kind].tone}>{LESSON_KINDS[kind].label}</Pill>
);

/** A row's key: its lesson's slug, else its issue, else its title. */
const keyOf = (row: Pick<LearnProgressLesson, 'kind' | 'slug' | 'repo' | 'issueNumber' | 'title'>, index: number) =>
  `${row.kind}:${row.slug ?? (row.repo && row.issueNumber ? `${row.repo}#${row.issueNumber}` : `${row.title}:${index}`)}`;

/**
 * Lessons passed: one row per lesson, newest pass first. An own lesson's pull request shows its real state and
 * `Details`; a practice lesson `See the lesson`. A lesson taken down keeps its row, its title plain text.
 */
export function PassedLessons({ lessons }: { lessons: LearnProgressLesson[] }) {
  return (
    <RowsCard label="Lessons passed">
      {lessons.map((lesson, index) => {
        const links = progressLessonLinksOf(lesson);
        const key = keyOf(lesson, index);
        return (
          <ListRow
            key={key}
            id={key}
            kind="lesson"
            state={lesson.prLabel ?? lesson.kind}
            refs={
              <RefChips
                repo={lesson.repo}
                issue={lesson.issueNumber}
                pr={lesson.prNumber ? { number: lesson.prNumber, url: lesson.prUrl } : null}
              >
                <KindPill kind={lesson.kind} />
              </RefChips>
            }
            title={<Title href={links.lesson}>{lesson.title}</Title>}
            text={[passedLineOf(lesson), links.note].filter(Boolean).join(' · ')}
            aside={lesson.kind === 'OWN' && lesson.prLabel ? <LearnLessonStatePill label={lesson.prLabel} /> : null}
            href={links.action?.href ?? null}
            action={links.action?.label ?? ''}
            quiet
          />
        );
      })}
    </RowsCard>
  );
}

/**
 * Not finished: practice lessons started and not passed (`Continue`), and own Learn attempts that ended with no passed
 * lesson (`Ended`, `Details`). Absent when there is none.
 */
export function NotFinished({ rows }: { rows: LearnProgressUnfinished[] }) {
  if (!rows.length) return null;
  return (
    <section aria-labelledby="not-finished" data-section="not-finished" className="flex flex-col gap-3">
      <h2 id="not-finished" className={HEADING.block}>
        Not finished · {rows.length}
      </h2>
      <RowsCard label="Not finished">
        {rows.map((row, index) => {
          const shown = unfinishedRowOf(row);
          const key = keyOf(row, index);
          return (
            <ListRow
              key={key}
              id={key}
              kind="lesson"
              state={row.kind === 'OWN' ? 'ENDED' : 'STARTED'}
              refs={
                <RefChips repo={row.repo} issue={row.issueNumber}>
                  <KindPill kind={row.kind} />
                </RefChips>
              }
              title={<Title href={shown.href}>{row.title}</Title>}
              text={shown.text}
              aside={row.kind === 'OWN' ? <LearnLessonStatePill label="ENDED" /> : null}
              href={shown.href}
              action={shown.action}
              quiet
            />
          );
        })}
      </RowsCard>
    </section>
  );
}

/** New things learned: one card per lesson that taught one, newest pass first. */
export function LearnedLessons({ lessons }: { lessons: LearnProgressLesson[] }) {
  return (
    <ul aria-label="Lessons that taught you something new" className="flex flex-col gap-4">
      {lessons.map((lesson, index) => (
        <LearnedLessonCard
          key={keyOf(lesson, index)}
          lesson={{
            ...lesson,
            pr: lesson.prNumber ? { number: lesson.prNumber, url: lesson.prUrl } : null,
          }}
          href={progressLessonLinksOf(lesson).lesson}
        />
      ))}
    </ul>
  );
}

/** Pull requests merged: one row per merged Learn pull request, newest merge first, its lesson while it is there. */
export function MergedPullRequests({ prs }: { prs: LearnProgressMergedPr[] }) {
  return (
    <RowsCard label="Pull requests merged">
      {prs.map((pr) => {
        const key = `${pr.repo}#${pr.prNumber}`;
        const day = dayLabel(pr.mergedAt);
        return (
          <ListRow
            key={key}
            id={key}
            state="MERGED"
            refs={<RefChips repo={pr.repo} issue={pr.issueNumber} pr={{ number: pr.prNumber, url: pr.prUrl }} />}
            title={
              <Title href={pullRequestPageOf(pr.repo, pr.issueNumber)}>
                {pr.title?.trim() || `Issue #${pr.issueNumber}`}
              </Title>
            }
            text={day ? `Merged ${day}` : 'Merged'}
            href={pr.hasLesson ? lessonViewPathOf(pr.repo, pr.issueNumber) : null}
            action="Lesson"
            quiet
          />
        );
      })}
    </RowsCard>
  );
}

/**
 * Repos helped: one row per repository, newest merge first: its name (to GitHub), how many were merged and when last,
 * its first pull requests and "and N more" (to the merged view).
 */
export function ReposHelped({ repos }: { repos: LearnProgressRepo[] }) {
  return (
    <RowsCard label="Repos helped">
      {repos.map((repo) => {
        const url = repoUrlOf(repo.repo);
        const more = repo.merged - Math.min(repo.prs.length, REPO_PRS_SHOWN);
        return (
          <li
            key={repo.repo}
            data-repo={repo.repo}
            className="flex flex-col gap-1.5 border-b px-5 py-4 last:border-b-0"
          >
            <span className="font-mono text-sm">
              {url ? (
                <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  {repo.repo}
                  <span className="sr-only"> (opens GitHub)</span>
                </a>
              ) : (
                repo.repo
              )}
            </span>
            <span className="text-xs text-muted-foreground">{repoLineOf(repo)}</span>
            <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {repo.prs.slice(0, REPO_PRS_SHOWN).map((pr) => (
                <PullRequestChip key={pr.prNumber} repo={repo.repo} pr={{ number: pr.prNumber, url: pr.prUrl }} />
              ))}
              {more > 0 ? (
                <Link
                  href={progressPath({ view: 'merged' })}
                  prefetch={false}
                  className="font-semibold text-link hover:underline"
                >
                  and {more} more
                </Link>
              ) : null}
            </span>
          </li>
        );
      })}
    </RowsCard>
  );
}
