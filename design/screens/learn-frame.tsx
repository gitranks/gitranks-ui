import type { Screen } from '../registry';
import { LEARN_GONE_SCREEN } from './learn-gone';
import { LEARN_LESSON_SCREEN } from './learn-lesson';
import { LEARN_PLAYER_SCREEN } from './learn-player';
import { LEARN_QUESTION_SCREEN } from './learn-question';
import { LEARN_SHARE_SCREEN } from './learn-share';
import { LearnBar } from '@/components/learn/bar/learn-bar';
import { type LearnBarFixture, learnBarPhoneRows, learnBarRows } from '@/lib/learn/__fixtures__/learn-bar';

/** One row of the board: its title above the bar in a rounded frame. */
function Row({ row, width }: { row: LearnBarFixture; width?: number }) {
  return (
    <div className="flex flex-col gap-2" style={width ? { width } : undefined}>
      <span className="text-sm font-semibold">{row.title}</span>
      <div className="overflow-hidden rounded-xl border bg-background pt-2.5" style={width ? { width } : undefined}>
        <LearnBar state={row.state} place={row.place} />
      </div>
    </div>
  );
}

/** Learn's frame: the parts every Learn page is built in. */
export const LEARN_FRAME_SCREENS: Screen[] = [
  {
    id: 'learn-bars',
    title: 'Learn’s bar',
    area: 'learn',
    route: '/learn/courses',
    sources: [
      'components/learn/bar/learn-bar.tsx',
      'components/learn/bar/learn-bar-live.tsx',
      'components/tabs/tabs-bar.tsx',
      'lib/learn/learn-bar.ts',
      'app/(learn)/layout.tsx',
    ],
    states: [
      {
        id: 'bars',
        title: 'Learn’s bar in every state, and on a phone',
        path: '/learn',
        height: 1060,
        render: () => (
          <main className="mx-auto flex w-full flex-col gap-8 px-4 pt-8 pb-16" style={{ maxWidth: 1340 }}>
            <section className="flex flex-col gap-5">
              {learnBarRows.map((row) => (
                <Row key={row.title} row={row} />
              ))}
            </section>
            <section className="flex flex-wrap items-start gap-6">
              {learnBarPhoneRows.map((row) => (
                <Row key={row.title} row={row} width={390} />
              ))}
            </section>
          </main>
        ),
      },
    ],
  },
  LEARN_QUESTION_SCREEN,
  LEARN_PLAYER_SCREEN,
  LEARN_LESSON_SCREEN,
  LEARN_GONE_SCREEN,
  LEARN_SHARE_SCREEN,
];
