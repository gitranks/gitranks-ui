import type { Screen } from '../registry';
import { Header } from '@/components/header/header';
import { LearnBar } from '@/components/learn/bar/learn-bar';
import { FixLearnBlock } from '@/components/learn/fix/fix-learn-block';
import { LearnFromIt } from '@/components/learn/fix/learn-from-it';
import {
  FixChangeCard,
  FixFoot,
  FixIssueCard,
  FixPageFrame,
  FixViewRow,
} from '@/components/workspace/fix-page/fix-frame';
import { MadePage } from '@/components/workspace/fix-page/made-page';
import {
  FIX_PR,
  learnFix,
  learnFixClosed,
  learnFixHeld,
  learnFixNoLesson,
  learnFixOpen,
  marksDone,
  marksFixer,
  marksHalfWay,
} from '@/lib/learn/__fixtures__/fix-page';
import { type FixMarks, fixLearnBlockOf, hasLearnView, type LearnFixPage } from '@/lib/learn/fix-page';
import { LEARN_ABOUT_PATH, LEARN_MAINTAINERS_PATH } from '@/lib/learn/learn-path';
import { fromLearn, learnFixPath } from '@/lib/learn/paths';
import { ALL_FIXES_PATH } from '@/lib/learn/real-issues';
import { fixTitleOf } from '@/lib/learn/seo/fix';
import { closedTimeline, learnTimeline, openTimeline } from '@/lib/workspace/__fixtures__/pr-timeline';
import { pullRequestPath } from '@/lib/workspace/paths';
import type { PrTimeline } from '@/lib/workspace/pr-timeline.types';
import { fixBylineOf, fixChangeOf, fixStatePillOf } from '@/lib/workspace/pr-timeline-made';
import { prTimelineMarkdownPath, prTimelinePath } from '@/lib/workspace/pr-timeline-path';

/**
 * The public page of a fix in its two views (step 16): "Learn from it" for a visitor, a learner half-way, one who is
 * done and the fixer, an open fix and one with no lesson; "How it was made" for a Learn fix, open and closed without
 * a merge (no toggle). From fixtures. Held back from the export (`exported: false`): the export is at its file limit.
 */

const SOURCES = [
  'components/workspace/fix-page/fix-frame.tsx',
  'components/workspace/fix-page/made-page.tsx',
  'components/workspace/fix-page/how-it-was-made.tsx',
  'components/learn/fix/learn-from-it.tsx',
  'components/learn/fix/fix-learn-block.tsx',
  'lib/learn/fix-page.ts',
  'lib/workspace/pr-timeline-made.ts',
];

const LEARN_PATH = learnFixPath(FIX_PR);
const MADE_PATH = prTimelinePath(FIX_PR);
const PULL_REQUEST = fromLearn(pullRequestPath({ repo: FIX_PR.nameWithOwner, issue: 871 }));
const VIEWS = { learn: LEARN_PATH, made: MADE_PATH };
const BACK = { label: 'Issues', href: ALL_FIXES_PATH };

const learnBar = (
  <>
    <Header section="learn" />
    <LearnBar state={{ kind: 'visitor' }} place="issues" />
  </>
);

/** "Learn from it", as the page draws it, the person's marks given rather than read. */
const LearnView = ({
  fix = learnFix,
  timeline = learnTimeline,
  marks = null,
}: {
  fix?: LearnFixPage;
  timeline?: PrTimeline;
  marks?: FixMarks | null;
}) => (
  <>
    {learnBar}
    <FixPageFrame
      row={<FixViewRow back={BACK} views={VIEWS} current="learn" />}
      card={
        <FixIssueCard
          repo={timeline.nameWithOwner}
          issue={timeline.issue.number}
          pr={{ number: timeline.number, url: timeline.url }}
          title={fixTitleOf(timeline)}
          pill={fixStatePillOf(timeline)}
          byline={fixBylineOf(timeline, 'LEARN', fix.agent)}
          stopped={timeline.stopped}
        />
      }
    >
      <LearnFromIt
        pr={FIX_PR}
        fix={fix}
        pullRequest={PULL_REQUEST}
        initial={marks ? { marks, reads: null } : undefined}
      >
        <FixChangeCard change={fixChangeOf(timeline)} />
      </LearnFromIt>
      <FixFoot
        markdownHref={prTimelineMarkdownPath(FIX_PR)}
        about={{ text: 'How Learn works', href: LEARN_ABOUT_PATH }}
      />
    </FixPageFrame>
  </>
);

/** "How it was made" for a Learn fix: the toggle only while it has a "Learn from it". */
const MadeView = ({ fix = learnFix, timeline = learnTimeline }: { fix?: LearnFixPage; timeline?: PrTimeline }) => {
  const block = fixLearnBlockOf(FIX_PR, fix);
  return (
    <>
      {learnBar}
      <MadePage
        timeline={timeline}
        made="LEARN"
        agent={fix.agent}
        questions={fix.questions}
        row={<FixViewRow back={BACK} views={hasLearnView(fix) ? VIEWS : null} current="made" />}
        learn={block ? <FixLearnBlock words={block} /> : null}
        helped={{ helpedBy: ['mara-k', 'lindqvist'], helpedNamed: 4 }}
        aboutPr={{ text: 'What a GitRanks Learn pull request is', href: LEARN_MAINTAINERS_PATH }}
        aboutProduct={{ text: 'How Learn works', href: LEARN_ABOUT_PATH }}
      />
    </>
  );
};

export const LEARN_FIX_SCREENS: Screen[] = [
  {
    id: 'learn-fix',
    title: 'The public page of a fix',
    area: 'learn',
    route: '/learn/fixes/[owner]/[repo]/[number]',
    exported: false,
    sources: SOURCES,
    states: [
      {
        id: 'learn-visitor',
        title: '"Learn from it" for a visitor: the walkthrough and the lesson, the walkthrough the main action',
        path: LEARN_PATH,
        signedOut: true,
        height: 1300,
        render: () => <LearnView />,
      },
      {
        id: 'learn-half-way',
        title: 'Signed in, half-way through the walkthrough, with similar issues after the change',
        path: LEARN_PATH,
        height: 1700,
        render: () => <LearnView marks={marksHalfWay} />,
      },
      {
        id: 'learn-done',
        title: 'Both done: the main action moves to the first similar issue',
        path: LEARN_PATH,
        height: 1700,
        render: () => <LearnView marks={marksDone} />,
      },
      {
        id: 'learn-fixer',
        title: "The fixer on their fix's public page",
        path: LEARN_PATH,
        viewer: { login: 'mira-dev' },
        height: 1400,
        render: () => <LearnView marks={marksFixer} />,
      },
      {
        id: 'learn-open-no-lesson',
        title: 'Open, not merged yet, with no lesson: the walkthrough alone',
        path: LEARN_PATH,
        signedOut: true,
        height: 1200,
        render: () => (
          <LearnView fix={{ ...learnFixNoLesson, ...learnFixOpen, lesson: null }} timeline={openTimeline} />
        ),
      },
      {
        id: 'learn-phone',
        title: '"Learn from it" on a phone: the cards stacked',
        path: LEARN_PATH,
        signedOut: true,
        width: 390,
        height: 2000,
        render: () => <LearnView />,
      },
      {
        id: 'made-learn',
        title: '"How it was made" for a Learn fix: the walkthrough row and the Learn part',
        path: MADE_PATH,
        signedOut: true,
        height: 1700,
        render: () => <MadeView />,
      },
      {
        id: 'made-held',
        title: 'A held walkthrough: the lesson alone, with no word that something is missing',
        path: MADE_PATH,
        signedOut: true,
        height: 1600,
        render: () => <MadeView fix={learnFixHeld} />,
      },
      {
        id: 'made-closed',
        title: 'Closed without a merge: no toggle, no "Learn from it"',
        path: MADE_PATH,
        signedOut: true,
        height: 1500,
        render: () => <MadeView fix={learnFixClosed} timeline={closedTimeline} />,
      },
    ],
  },
];
