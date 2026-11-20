'use client';

import Link from 'next/link';
import { type ReactNode, useState, useTransition } from 'react';

import { Pill } from '@/components/pill/pill';
import { Button } from '@/components/ui/button';
import { HEADING } from '@/components/workspace/primitives';
import { RefChips } from '@/components/workspace/ref-chips';
import { ShowMore } from '@/components/workspace/show-more';
import { useStableRows } from '@/components/workspace/use-stable-rows';
import { readPracticeLessons } from '@/lib/learn/actions';
import type { PracticeLesson, PracticeLessons } from '@/lib/learn/learn.types';
import { levelPhraseOf, wantedOf } from '@/lib/learn/learn-home';
import { lessonPath } from '@/lib/learn/learn-path';
import { grownTo, PRACTICE_FIRST, PRACTICE_MAX } from '@/lib/learn/learn-tab';
import { agentNameOf } from '@/lib/learn/lesson-public';
import { cn } from '@/lib/utils';
import { type ContributeSource, contributeSource } from '@/lib/workspace/click-tracking';
import { dayLabel } from '@/lib/workspace/format';

/** "5 steps · 10 min · 14 passed". */
const figuresOf = (lesson: Pick<PracticeLesson, 'steps' | 'minutes' | 'passes'>) =>
  `${lesson.steps} ${lesson.steps === 1 ? 'step' : 'steps'} · ${lesson.minutes} min · ${lesson.passes} passed`;

/**
 * Another learner's finished lesson, offered as practice: the issue it came from, who it was made for and what they
 * wanted to learn, when and with which agent, what it teaches, and Take this lesson.
 */
export function PracticeLessonCard({ lesson, source }: { lesson: PracticeLesson; source?: ContributeSource }) {
  const login = lesson.author.login;
  const level = levelPhraseOf(lesson.writtenFor.level);
  const href = lessonPath(lesson.slug);
  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4" data-practice-lesson={lesson.slug}>
      {lesson.repo || lesson.language ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          {lesson.repo ? <RefChips repo={lesson.repo} issue={lesson.issue} className="min-w-0" /> : <span />}
          {lesson.language ? <Pill>{lesson.language}</Pill> : null}
        </div>
      ) : null}
      <div className="flex flex-col gap-1">
        <h3 className="font-semibold text-pretty">
          <Link href={href} prefetch={false} className="hover:underline">
            {lesson.title}
          </Link>
        </h3>
        {lesson.issueTitle?.trim() ? (
          <p className="text-sm text-muted-foreground">The issue: “{lesson.issueTitle.trim()}”</p>
        ) : null}
      </div>
      <dl className="flex flex-col gap-1.5 text-sm">
        <div className="flex gap-2">
          <dt className="w-19 flex-none text-muted-foreground">Made for</dt>
          <dd className="min-w-0">
            {login ? (
              <Link
                href={`/profile/${encodeURIComponent(login)}`}
                prefetch={false}
                className="font-medium hover:underline"
              >
                {login}
              </Link>
            ) : (
              'A learner'
            )}
            , {wantedOf(lesson.writtenFor)} <span className="font-medium">{lesson.writtenFor.value}</span>
            {level ? ` (${level})` : ''}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-19 flex-none text-muted-foreground">Made</dt>
          <dd className="min-w-0">
            {[dayLabel(lesson.publishedAt), `by ${agentNameOf(lesson)}`].filter(Boolean).join(', ')}
          </dd>
        </div>
      </dl>
      {lesson.topics.length ? (
        <div className="flex flex-wrap gap-1.5">
          {lesson.topics.map((topic) => (
            <Pill key={topic}>{topic}</Pill>
          ))}
        </div>
      ) : null}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t pt-3">
        <span className="font-mono text-xs text-muted-foreground tabular-nums">{figuresOf(lesson)}</span>
        <Button asChild variant="outline" className="max-sm:min-h-11 max-sm:w-full">
          <Link
            href={href}
            prefetch={false}
            aria-label={`Take this lesson: ${lesson.title}`}
            {...(source ? contributeSource(source) : {})}
          >
            Take this lesson
          </Link>
        </Button>
      </div>
    </article>
  );
}

/** Practice lessons as short rows: where, how long, who each was made for, and Take this lesson. */
export function PracticeRows({ lessons }: { lessons: readonly PracticeLesson[] }) {
  return (
    <ul className="divide-y overflow-hidden rounded-xl border">
      {lessons.map((lesson) => {
        const where = lesson.repo ? `${lesson.repo}${lesson.issue ? ` · issue #${lesson.issue}` : ''}` : null;
        const level = levelPhraseOf(lesson.writtenFor.level);
        const href = lessonPath(lesson.slug);
        return (
          <li
            key={lesson.slug}
            className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5"
            data-practice-lesson={lesson.slug}
          >
            <div className="flex min-w-0 flex-1 basis-64 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                {where ? <span className="font-mono break-all text-foreground/80">{where}</span> : null}
                {lesson.language ? <span>{lesson.language}</span> : null}
                <span className="tabular-nums">
                  {lesson.steps} {lesson.steps === 1 ? 'step' : 'steps'} · {lesson.minutes} min
                </span>
              </div>
              <Link href={href} prefetch={false} className="font-semibold text-pretty text-foreground hover:underline">
                {lesson.title}
              </Link>
              <span className="text-sm text-muted-foreground">
                Made for {lesson.author.login ?? 'a learner'}, {wantedOf(lesson.writtenFor)} {lesson.writtenFor.value}
                {level ? ` (${level})` : ''}
              </span>
            </div>
            <Button asChild variant="outline" className="max-sm:min-h-11 max-sm:w-full">
              <Link href={href} prefetch={false} aria-label={`Take this lesson: ${lesson.title}`}>
                Take this lesson
              </Link>
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

/** The cards in a grid, as many to a row as fit. */
export function PracticeGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-[repeat(auto-fill,minmax(min(340px,100%),1fr))] gap-4">{children}</div>;
}

const practiceKey = ({ slug }: PracticeLesson) => slug;

/**
 * The Learn tab's practice lessons (`#practice`): other learners' lessons for the viewer's goal, marked optional, with
 * how many there are; the first 3, then "Show 10 more" reads the list again with 10 more (13, 23, … up to 93) and adds
 * the cards not shown yet under the others, which stay in place. Left out when no lesson matches the goal, or the API did not answer.
 */
export function PracticeSection({
  practice,
  goal,
  title,
  text,
}: {
  practice: PracticeLessons | undefined;
  /** The goal's own words: "TypeScript". */
  goal: string;
  title: string;
  text: ReactNode;
}) {
  // The cards shown keep their places: a new read (the page's, or "Show 10 more"'s) only adds the ones not shown yet.
  const { rows: items, add } = useStableRows(practice?.items ?? [], practiceKey);
  const [answered, setAnswered] = useState<number | null>(null);
  const [asked, setAsked] = useState(Math.max(practice?.items.length ?? 0, PRACTICE_FIRST));
  const [ended, setEnded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  if (!items.length) return null;
  const total = Math.max(answered ?? practice?.total ?? 0, items.length);
  const most = Math.min(total, PRACTICE_MAX);

  const showMore = () =>
    startTransition(async () => {
      setFailed(false);
      const first = grownTo(asked, PRACTICE_MAX);
      const result = await readPracticeLessons(first).catch(() => null);
      if (!result?.ok) {
        setFailed(true);
        return;
      }
      setAsked(first);
      setAnswered(result.data.total);
      // Nothing new (the list got shorter meanwhile): the control ends, its count line stays.
      if (!add(result.data.items)) setEnded(true);
    });

  return (
    <section aria-labelledby="practice-title" id="practice" className="flex scroll-mt-24 flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id="practice-title" className={cn(HEADING.section, 'flex flex-wrap items-center gap-2.5')}>
            {title}
            <Pill>Optional</Pill>
          </h2>
          <p className="max-w-prose text-sm text-muted-foreground">{text}</p>
        </div>
        <span className="text-sm text-muted-foreground" data-practice-total={total}>
          <span className="font-mono tabular-nums">{total.toLocaleString('en-US')}</span> for {goal || 'your goal'} you
          haven’t passed
        </span>
      </div>
      <PracticeGrid>
        {items.map((lesson) => (
          <PracticeLessonCard key={lesson.slug} lesson={lesson} source="learn_home_practice" />
        ))}
      </PracticeGrid>
      {ended || asked >= PRACTICE_MAX ? (
        items.length < most ? (
          <p className="text-sm text-muted-foreground" data-show-more-ended="">
            Showing {items.length} of {most} practice lessons
          </p>
        ) : null
      ) : (
        <ShowMore shown={items.length} total={most} noun="practice lesson" pending={pending} onMore={showMore} />
      )}
      {failed ? (
        <p role="alert" className="text-sm text-destructive">
          Couldn’t load them. Try again in a minute.
        </p>
      ) : null}
    </section>
  );
}
