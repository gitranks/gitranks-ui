import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { LearnSettingUp } from './learn-setting-up';
import { ListRow, ListSection } from '@/app/contribute/components/contributions-view';
import { HEADING, PageTitle } from '@/app/contribute/components/primitives';
import { Pill } from '@/components/pill/pill';
import { Button } from '@/components/ui/button';
import { loadLearnOpen, loadLearnProfile, loadLearnSetup, loadMyLessons } from '@/lib/learn/learn.data';
import type { MyLesson } from '@/lib/learn/learn.types';
import { LEARN_PATH, LEARN_PRACTICE_PATH } from '@/lib/learn/learn-path';
import { type MyLessonRow, myLessonGroupsOf } from '@/lib/learn/my-lessons';

function Rows({ rows, quiet = false }: { rows: MyLessonRow[]; quiet?: boolean }) {
  return rows.map((row) => (
    <ListRow
      key={row.key}
      id={row.key}
      kind="lesson"
      state={row.state}
      meta={row.meta}
      pills={<Pill tone={row.pill.tone}>{row.pill.label}</Pill>}
      title={row.title}
      text={row.text}
      href={row.href}
      action={row.action}
      quiet={quiet}
    />
  ));
}

/**
 * No lessons yet: each one is written for an issue the user picks, so the first starts on Learn home (whose state
 * decides what shows: the goal question first when none is saved). A practice lesson first, if they like.
 */
function FirstLesson({ hasGoal }: { hasGoal: boolean }) {
  return (
    <section
      aria-labelledby="first-lesson"
      data-section="no-lessons"
      className="flex flex-col items-start gap-3 rounded-xl border bg-card p-5"
    >
      <h2 id="first-lesson" className={HEADING.card}>
        No lessons yet
      </h2>
      <p className="max-w-prose text-sm text-muted-foreground">
        Each lesson here is written by your agent for an issue you pick, about that exact fix. Your first one starts on
        Learn home.
      </p>
      <div className="flex w-full flex-wrap items-center gap-x-5 gap-y-2">
        <Button asChild className="min-h-11 px-5 font-semibold max-sm:w-full">
          <Link href={LEARN_PATH} prefetch={false}>
            Pick an issue for your first lesson
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
        <Link
          href={hasGoal ? LEARN_PRACTICE_PATH : LEARN_PATH}
          prefetch={false}
          className="text-sm font-semibold text-muted-foreground hover:text-foreground max-sm:inline-flex max-sm:min-h-11 max-sm:items-center"
        >
          Or see a practice lesson first
        </Link>
      </div>
    </section>
  );
}

/**
 * My lessons: the user's Learn attempts and the shared lessons they passed, drawn as My contributions draws its lists.
 * What is still going (in progress, or passed with the pull request to approve) first, then the rest. `lessons` is
 * undefined when the API does not answer.
 */
export function MyLessonsScreen({
  lessons,
  settingUp = false,
  hasGoal = false,
}: {
  lessons: MyLesson[] | undefined;
  /** The viewer has a Learn goal: the empty state's practice link goes straight to Learn home's practice lessons. */
  hasGoal?: boolean;
  /** The viewer's GitRanks account is still being set up: no lessons can be read yet. */
  settingUp?: boolean;
}) {
  const title = <PageTitle title="My lessons" text="Your Learn attempts, and the shared lessons you passed." />;
  if (settingUp) {
    return (
      <>
        {title}
        <LearnSettingUp />
      </>
    );
  }
  if (!lessons) {
    return (
      <>
        {title}
        <div
          data-section="lessons-unavailable"
          className="rounded-xl border border-dashed px-5 py-4 text-sm text-muted-foreground"
        >
          Your lessons are not available right now. Try again in a minute.
        </div>
      </>
    );
  }
  if (!lessons.length) {
    return (
      <>
        {title}
        <FirstLesson hasGoal={hasGoal} />
      </>
    );
  }
  const { going, done } = myLessonGroupsOf(lessons);
  return (
    <>
      {title}
      {going.length ? (
        <ListSection id="lessons-going" title="In progress" count={going.length}>
          <Rows rows={going} />
        </ListSection>
      ) : null}
      {done.length ? (
        <ListSection id="lessons-done" title="Done" count={done.length}>
          <Rows rows={done} quiet />
        </ListSection>
      ) : null}
    </>
  );
}

/** My lessons, read per request. Behind Learn's gate: not found for anyone Learn is not open to. */
export async function MyLessonsView() {
  const lessons = loadMyLessons();
  const settingUp = loadLearnSetup();
  // A failed read of the goal only changes the empty state's link: never the page.
  const profile = loadLearnProfile().catch(() => null);
  if (!(await loadLearnOpen())) notFound();
  return <MyLessonsScreen lessons={await lessons} settingUp={await settingUp} hasGoal={!!(await profile)?.goalKind} />;
}
