'use client';

import Link from 'next/link';
import { type ReactNode, useState, useTransition } from 'react';

import { readPracticeLessons } from '../actions';
import { HEADING } from '@/app/contribute/components/primitives';
import { Pill } from '@/components/pill/pill';
import { Button } from '@/components/ui/button';
import { type ContributeSource, contributeSource } from '@/lib/contribute/click-tracking';
import { dayLabel } from '@/lib/contribute/format';
import type { PracticeLesson, PracticeLessons } from '@/lib/learn/learn.types';
import { levelPhraseOf, PRACTICE_ALL, wantedOf } from '@/lib/learn/learn-home';
import { lessonPath } from '@/lib/learn/learn-path';
import { agentNameOf } from '@/lib/learn/lesson-public';

/** "5 steps · 10 min · 14 passed". */
const figuresOf = (lesson: Pick<PracticeLesson, 'steps' | 'minutes' | 'passes'>) =>
  `${lesson.steps} ${lesson.steps === 1 ? 'step' : 'steps'} · ${lesson.minutes} min · ${lesson.passes} passed`;

/**
 * Another learner's finished lesson, offered as practice: the issue it came from, who it was made for and what they
 * wanted to learn, when and with which agent, what it teaches, and Take this lesson.
 */
export function PracticeLessonCard({ lesson, source }: { lesson: PracticeLesson; source?: ContributeSource }) {
  const where = lesson.repo ? `${lesson.repo}${lesson.issue ? ` · issue #${lesson.issue}` : ''}` : null;
  const login = lesson.author.login;
  const level = levelPhraseOf(lesson.writtenFor.level);
  const href = lessonPath(lesson.slug);
  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4" data-practice-lesson={lesson.slug}>
      {where || lesson.language ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          {where ? <span className="font-mono break-all text-foreground/80">{where}</span> : <span />}
          {lesson.language ? <span>{lesson.language}</span> : null}
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
          <Link href={href} prefetch={false} {...(source ? contributeSource(source) : {})}>
            Take this lesson
            <span className="sr-only">: {lesson.title}</span>
          </Link>
        </Button>
      </div>
    </article>
  );
}

/** The cards in a grid, as many to a row as fit. */
export function PracticeGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-[repeat(auto-fill,minmax(min(340px,100%),1fr))] gap-4">{children}</div>;
}

/**
 * Learn home's practice (`#practice`): other learners' lessons for the viewer's goal, marked optional, with how many
 * there are; "Show all" reads up to 30 in place. Left out when no lesson matches the goal, or the API did not answer.
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
  // Only "Show all" is kept here: a new read of the page (Learn home reads itself again while a lesson moves) shows
  // its own lessons.
  const [all, setAll] = useState<PracticeLessons | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const items = all?.items ?? practice?.items ?? [];
  const total = all?.total ?? practice?.total ?? 0;
  if (!items.length) return null;
  const more = total > items.length && items.length < PRACTICE_ALL;

  const showAll = () =>
    startTransition(async () => {
      setFailed(false);
      const result = await readPracticeLessons(PRACTICE_ALL).catch(() => null);
      if (result?.ok && result.data.items.length) {
        setAll(result.data);
      } else {
        setFailed(true);
      }
    });

  return (
    <section aria-labelledby="practice-title" id="practice" className="flex scroll-mt-4 flex-col gap-4 pt-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id="practice-title" className={HEADING.section}>
            {title}
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
      {more ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" disabled={pending} onClick={showAll} className="max-sm:min-h-11">
            {pending ? 'Loading…' : `Show all ${Math.min(total, PRACTICE_ALL)}`}
          </Button>
          {failed ? (
            <span role="alert" className="text-sm text-destructive">
              Couldn’t load them. Try again in a minute.
            </span>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
