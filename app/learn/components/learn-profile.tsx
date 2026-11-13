import { Terminal } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { LearnProfileForm } from './learn-profile-form';
import { agentWayOf } from '@/app/contribute/components/overview-sections';
import { HEADING, Pill } from '@/app/contribute/components/primitives';
import type { ContributeOwnAgent } from '@/lib/contribute/contribute.types';
import { loadLearnOpen, loadLearnProfile, loadOwnAgent } from '@/lib/learn/learn.data';
import type { LearnProfile } from '@/lib/learn/learn.types';
import { LEARN_AGENT_PROMPT } from '@/lib/learn/lesson-format';

const SIDE_CARD = 'flex flex-col gap-3 rounded-xl border bg-card p-4.5';

const LESSON_STEPS = [
  'Your agent fixes a real issue, in your terminal.',
  'You take a 10-minute lesson on the fix, here.',
  'You approve the pull request. It opens in your name.',
];

/**
 * The user's own agent, as Contribute's overview reads it: connected (its name, its connections, its last call), not
 * set up yet, or, unread, that it cannot be checked now.
 */
function AgentCard({ ownAgent, now }: { ownAgent: ContributeOwnAgent | undefined; now?: Date }) {
  const way = agentWayOf({ ownAgent }, now);
  const connected = way.state?.label === 'Connected';
  return (
    <section aria-labelledby="learn-agent" className={SIDE_CARD} data-learn-agent={way.state?.label ?? 'unknown'}>
      <div className="flex items-center justify-between gap-2">
        <h2 id="learn-agent" className="text-base font-semibold">
          Your agent
        </h2>
        {way.state ? <Pill tone={way.state.tone}>{way.state.label}</Pill> : null}
      </div>
      <p className="flex items-start gap-2 text-sm">
        <Terminal aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <span>{way.text}</span>
      </p>
      {connected ? <p className="text-xs text-muted-foreground">Ask it: “{LEARN_AGENT_PROMPT}”.</p> : null}
      <Link
        href={way.action.href}
        prefetch={false}
        className="self-start text-sm font-semibold text-link hover:underline"
      >
        {way.action.label}
      </Link>
    </section>
  );
}

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
 * Goal and level: the form every lesson is written for, beside the user's agent and how a lesson goes. `profile` is
 * null before the user has one.
 */
export function LearnProfileScreen({
  profile,
  ownAgent,
  now,
}: {
  profile: LearnProfile | null;
  /** The user's own agent; undefined when it was not read. */
  ownAgent: ContributeOwnAgent | undefined;
  now?: Date;
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
        <LearnProfileForm profile={profile} />
        <aside className="flex min-w-0 flex-col gap-4">
          <AgentCard ownAgent={ownAgent} now={now} />
          <HowALessonGoes />
        </aside>
      </div>
    </>
  );
}

/** Goal and level, read per request. Behind Learn's gate: not found for anyone Learn is not open to. */
export async function LearnProfileView() {
  const profile = loadLearnProfile();
  const ownAgent = loadOwnAgent();
  // Read together; a closed Learn is a 404 whatever the profile read does.
  profile.catch(() => {});
  if (!(await loadLearnOpen())) notFound();
  return <LearnProfileScreen profile={await profile} ownAgent={await ownAgent} />;
}
