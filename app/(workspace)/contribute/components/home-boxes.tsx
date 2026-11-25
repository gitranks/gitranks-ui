'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useLiveActivity } from '@/components/workspace/agent/agent-runs';
import { Action, type ActionMarkers, Eyebrow, HomeBox, Text, Title } from '@/components/workspace/home-box';
import { useEnterKey } from '@/components/workspace/masked-issue/use-enter-key';
import { type HomeBoxes, type HomeBoxesRead, type HomeBoxWords, homeBoxesOf } from '@/lib/contribute/home-boxes';
import type { ContributeActivity } from '@/lib/workspace/contribute.types';
import { useKeyHints } from '@/lib/workspace/use-key-hints';

/** Contribute home's keys find the lit box's button by this mark. */
const HOME_KEYS: ActionMarkers = { enter: 'data-home-enter' };

const NAMES = ['needs-you', 'agent', 'merged'] as const;

function Box({ words, lit, hints, name }: { words: HomeBoxWords; lit: boolean; hints: boolean; name: string }) {
  return (
    <HomeBox lit={lit} quiet={words.quiet} data-home-box={name}>
      <Eyebrow chip={words.chip}>{words.top}</Eyebrow>
      {words.title ? <Title quiet={words.quiet}>{words.title}</Title> : null}
      {words.project ? <span className="font-mono text-xs text-muted-foreground">{words.project}</span> : null}
      {words.lines.map((line) => (
        <Text key={line}>{line}</Text>
      ))}
      {words.link ? (
        <p className={words.button ? 'm-0' : 'm-0 mt-auto'}>
          <Link href={words.link.href as never} className="text-sm font-semibold text-link hover:underline">
            {words.link.label}
          </Link>
        </p>
      ) : null}
      {words.button ? (
        <Action lit={lit} hints={hints} href={words.button.href} markers={HOME_KEYS}>
          {words.button.label}
        </Action>
      ) : null}
    </HomeBox>
  );
}

/**
 * The three boxes at the top of Contribute home, one row (one under the other on a phone), all one height. The lit box
 * has the brand's edge and the one filled button, which Enter opens; its key hint shows where a keyboard is the way in.
 */
export function HomeBoxesView({ home, hints: hintsGiven }: { home: HomeBoxes; hints?: boolean }) {
  const live = useKeyHints();
  const hints = hintsGiven ?? live;
  const router = useRouter();
  const lit = home.lit === null ? null : home.boxes[home.lit].button;
  useEnterKey(
    lit
      ? () => {
          if (lit.href.startsWith('#')) document.querySelector(lit.href)?.scrollIntoView();
          else router.push(lit.href as never);
        }
      : null,
  );
  return (
    <div className="grid gap-4 md:grid-cols-3" data-home-boxes="">
      {home.boxes.map((words, index) => (
        <Box key={NAMES[index]} name={NAMES[index]} words={words} lit={home.lit === index} hints={hints} />
      ))}
    </div>
  );
}

/**
 * Contribute home's boxes as the page reads them, with the agent's runs live: the activity the page read, then each
 * newer one the poll brings, so box 2 follows a run as it starts and ends. A failed read of the runs stays failed until
 * the poll answers.
 */
export function ContributeHomeBoxes({ read, activity }: { read: HomeBoxesRead; activity: ContributeActivity | null }) {
  const live = useLiveActivity(activity);
  const runs = live ? live.runs : read.agent.runs;
  return <HomeBoxesView home={homeBoxesOf({ ...read, agent: { ...read.agent, runs } })} />;
}
