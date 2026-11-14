import Link from 'next/link';
import { notFound } from 'next/navigation';

import { LearnSettingUp } from './learn-setting-up';
import { CodeBlock } from '@/app/contribute/components/code-block';
import { ListRow, ListSection } from '@/app/contribute/components/contributions-view';
import { PageTitle, Pill } from '@/app/contribute/components/primitives';
import { loadLearnOpen, loadLearnSetup, loadMyLessons } from '@/lib/learn/learn.data';
import type { MyLesson } from '@/lib/learn/learn.types';
import { LEARN_PROFILE_PATH } from '@/lib/learn/learn-path';
import { LEARN_AGENT_PROMPT } from '@/lib/learn/lesson-format';
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

/** No lessons yet: how the first one starts. */
function FirstLesson() {
  return (
    <section
      aria-labelledby="first-lesson"
      data-section="no-lessons"
      className="flex flex-col gap-4 rounded-xl border bg-card p-5 sm:p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 id="first-lesson" className="text-lg font-semibold">
          No lessons yet
        </h2>
        <p className="max-w-prose text-sm text-muted-foreground">
          Your first one starts in your terminal. Ask your agent for an issue to learn from: it fixes it and writes the
          lesson, and the lesson shows here when it is ready.
        </p>
      </div>
      <CodeBlock label="Ask your agent" copyLabel="Copy the prompt" wrap className="max-w-xl">
        {LEARN_AGENT_PROMPT}
      </CodeBlock>
      <Link href={LEARN_PROFILE_PATH} prefetch={false} className="self-start text-sm font-semibold text-link">
        Set your goal and level first →
      </Link>
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
}: {
  lessons: MyLesson[] | undefined;
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
        <FirstLesson />
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
  if (!(await loadLearnOpen())) notFound();
  return <MyLessonsScreen lessons={await lessons} settingUp={await settingUp} />;
}
