import { notFound } from 'next/navigation';

import { LearnProfileForm } from './learn-profile-form';
import { LearnSettingUp } from './learn-setting-up';
import { HEADING } from '@/components/workspace/primitives';
import { loadLearnOpen, loadLearnProfile, loadLearnSetup } from '@/lib/learn/learn.data';
import type { LearnProfile, PracticeNext } from '@/lib/learn/learn.types';

const SIDE_CARD = 'flex flex-col gap-3 rounded-xl border bg-card p-4.5';

const LESSON_STEPS = [
  'Your agent fixes a real issue, in your terminal.',
  'You take a 10-minute lesson on the fix, here.',
  'You approve the pull request. It opens in your name.',
];

function HowALessonGoes() {
  return (
    <section aria-labelledby="learn-how" className={SIDE_CARD}>
      <h2 id="learn-how" className="text-base font-semibold">
        How a lesson goes
      </h2>
      <ol className="flex flex-col gap-2.5 text-sm">
        {LESSON_STEPS.map((text, index) => (
          <li key={text} className="grid grid-cols-[28px_minmax(0,1fr)] gap-2">
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span>{text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * Goal and level: the form every lesson is written for, beside how a lesson goes (the user's agent is on the Agent
 * tab). `profile` is null before the user has one. While a new account is being set up, the setup line stands in for
 * the form.
 */
export function LearnProfileScreen({
  profile,
  settingUp = false,
  saved,
}: {
  profile: LearnProfile | null;
  /** The viewer's GitRanks account is still being set up: nothing can be saved yet. */
  settingUp?: boolean;
  /** The catalogue's boards: the form just saved, with the next step under it. */
  saved?: { next: PracticeNext | null };
}) {
  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className={HEADING.page}>Goal and level</h1>
        <p className="max-w-prose text-muted-foreground">
          Your agent writes each lesson for these answers. Change them any time; the next lesson follows.
        </p>
      </header>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {settingUp ? <LearnSettingUp /> : <LearnProfileForm profile={profile} saved={saved} />}
        <aside className="flex min-w-0 flex-col gap-4">
          <HowALessonGoes />
        </aside>
      </div>
    </>
  );
}

/** Goal and level, read per request. Behind Learn's gate: not found for anyone Learn is not open to. */
export async function LearnProfileView() {
  const profile = loadLearnProfile();
  const settingUp = loadLearnSetup();
  // Read together; a closed Learn is a 404 whatever the profile read does.
  profile.catch(() => {});
  if (!(await loadLearnOpen())) notFound();
  return <LearnProfileScreen profile={await profile} settingUp={await settingUp} />;
}
