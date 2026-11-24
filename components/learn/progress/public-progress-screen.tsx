import { ArrowRight } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';

import { LearnedLessonCard } from './learned-lesson-card';
import { LearnViewReport } from '@/components/learn/learn-view-report';
import { Pill } from '@/components/pill/pill';
import { Pagination } from '@/components/workspace/pagination';
import { HEADING, PageTitle } from '@/components/workspace/primitives';
import { LEARN_PATH, lessonResultPath, publicProgressPath } from '@/lib/learn/learn-path';
import { LEARN_PROGRESS_PATH } from '@/lib/learn/paths';
import { LEARN_PROGRESS_PAGE } from '@/lib/learn/progress/progress';
import {
  type LearnPublicLesson,
  type LearnPublicProgress,
  publicNumbersOf,
} from '@/lib/learn/public-progress/public-progress';

/** What the public progress page shows: a person's public record and a page of their public lessons. */
export type PublicProgressScreenProps = {
  /** The login as GitRanks stores it: the page's own. */
  login: string;
  page: number;
  /** The record and the page's lessons; `unavailable` when the read failed. */
  progress: LearnPublicProgress | 'unavailable';
  /** The signed-in viewer is the person: one line to their own page, with everything. */
  own: boolean;
};

const n = (value: number) => value.toLocaleString('en-US');

/** A lesson as the shared card draws it: the pull request only once merged, the pills a public page says. */
function PublicLessonCard({ lesson, login }: { lesson: LearnPublicLesson; login: string }) {
  const pr = lesson.merged && lesson.prNumber ? { number: lesson.prNumber, url: lesson.prUrl } : null;
  return (
    <LearnedLessonCard
      lesson={{ ...lesson, pr }}
      href={lessonResultPath(lesson.slug, login)}
      pills={
        <>
          {lesson.kind === 'PRACTICE' ? <Pill tone="neutral">Practice</Pill> : null}
          {pr ? <Pill tone="violet">Merged</Pill> : null}
        </>
      }
    />
  );
}

function Title({ login }: { login: string }) {
  return (
    <PageTitle
      eyebrow="Learn"
      title={
        <>
          <Link
            href={`/profile/${encodeURIComponent(login)}` as Route}
            prefetch={false}
            className="text-link hover:underline"
          >
            {login}
          </Link>{' '}
          is learning from real open-source fixes
        </>
      }
    />
  );
}

/**
 * A person's public progress page (`/learn/progress/<login>`): what they learned on real open-source fixes, from what is
 * already public alone (lessons whose result is public, and the Learn pull requests that were merged). The same for
 * every reader, but one line for the person themself.
 */
export function PublicProgressScreen({ login, page, progress, own }: PublicProgressScreenProps) {
  if (progress === 'unavailable') {
    return (
      <div data-public-progress="unavailable" className="flex flex-col gap-5">
        <Title login={login} />
        <p className="rounded-xl border border-dashed px-5 py-4 text-sm text-muted-foreground">
          This page is not available right now. Try again in a minute.
        </p>
      </div>
    );
  }
  const { record, items, total } = progress;
  return (
    <div data-public-progress={own ? 'own' : 'found'} className="flex flex-col gap-6">
      <LearnViewReport source="progress_opened" />
      {own ? (
        <p data-own-line="" className="rounded-xl bg-brand-soft px-4 py-3 text-sm text-brand-soft-foreground">
          This is your public page.{' '}
          <Link href={LEARN_PROGRESS_PATH} prefetch={false} className="font-semibold hover:underline">
            Your progress is here →
          </Link>
        </p>
      ) : null}
      <Title login={login} />
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {publicNumbersOf(record).map(({ value, label }) => (
          <div key={label} className="flex flex-col-reverse justify-end gap-0.5 rounded-xl border bg-card p-4">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="font-mono text-3xl font-bold tabular-nums">{n(value)}</dd>
          </div>
        ))}
      </dl>
      <section aria-labelledby="public-lessons" className="flex flex-col gap-4">
        <h2 id="public-lessons" className={HEADING.section}>
          Lessons passed
        </h2>
        <ul className="flex flex-col gap-3">
          {items.map((lesson) => (
            <PublicLessonCard key={lesson.slug} lesson={lesson} login={login} />
          ))}
        </ul>
        <Pagination
          page={page}
          pageSize={LEARN_PROGRESS_PAGE}
          total={total}
          noun="lesson"
          hrefOf={(to) => publicProgressPath(login, to)}
          always
        />
      </section>
      <div className="border-t pt-4">
        <Link
          href={LEARN_PATH}
          prefetch={false}
          className="inline-flex items-center gap-1 text-sm font-semibold text-link hover:underline max-sm:min-h-11"
        >
          Learn from a real fix yourself
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
    </div>
  );
}
