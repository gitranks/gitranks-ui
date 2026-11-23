import type { Screen } from '../registry';
import { Header } from '@/components/header/header';
import { LessonGoneLearnerBox, LessonGoneView } from '@/components/learn/lesson/lesson-gone';
import { HeaderLine } from '@/components/workspace/header-line';
import { goneLearnerMine, pausedAddress, removedAddress } from '@/lib/learn/__fixtures__/lesson-gone';
import type { LearnAddress } from '@/lib/learn/address-gate';
import { lessonGoneLearnerLineOf, lessonGoneStateOf, lessonGoneTextOf } from '@/lib/learn/lesson-gone';

/** A paused or removed lesson's page as its route draws it: the site's header and its line, then the page. */
function Page({ address, learner = false }: { address: LearnAddress; learner?: boolean }) {
  const state = lessonGoneStateOf(address);
  if (!state) return null;
  const line = learner ? lessonGoneLearnerLineOf(state, goneLearnerMine, 'UTC') : null;
  return (
    <>
      <Header section="learn" />
      <HeaderLine />
      <LessonGoneView
        state={state}
        text={lessonGoneTextOf(state, address)}
        course={address.course}
        learner={line && <LessonGoneLearnerBox state={state} line={line} />}
      />
    </>
  );
}

const PATH = `/learn/lessons/${encodeURIComponent('find-duplicates-with-a-set')}`;

/** A paused or a removed lesson's page, each lesson case of page 33's boards. */
export const LEARN_GONE_SCREEN: Screen = {
  id: 'learn-gone',
  title: 'A paused or removed lesson',
  area: 'learn',
  route: '/learn/lessons/_gone/[slug]',
  sources: [
    'components/learn/lesson/lesson-gone.tsx',
    'components/learn/lesson/lesson-gone-learner.tsx',
    'lib/learn/lesson-gone.ts',
    'lib/learn/address-gate.ts',
    'lib/learn/lesson-gate.ts',
  ],
  states: [
    {
      id: 'paused',
      title: 'Paused, not signed in (503)',
      path: PATH,
      signedOut: true,
      height: 540,
      render: () => <Page address={pausedAddress} />,
    },
    {
      id: 'paused-learner',
      title: 'Paused, a learner who learned it (503)',
      path: PATH,
      height: 540,
      render: () => <Page address={pausedAddress} learner />,
    },
    {
      id: 'removed-learner',
      title: 'Removed, a learner who learned it (410)',
      path: PATH,
      height: 540,
      render: () => <Page address={removedAddress} learner />,
    },
    {
      id: 'paused-phone',
      title: 'Paused, a learner, on a phone',
      path: PATH,
      width: 390,
      height: 600,
      render: () => <Page address={pausedAddress} learner />,
    },
  ],
};
