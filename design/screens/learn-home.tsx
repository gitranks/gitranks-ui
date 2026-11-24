import type { ReactNode } from 'react';

import { Header } from '@/components/header/header';
import { LearnBar } from '@/components/learn/bar/learn-bar';
import { LearnHomeError, LearnHomeView } from '@/components/learn/home/learn-home-view';
import { LearnLandingView, type LearnLandingViewProps } from '@/components/learn/landing/learn-landing-view';
import { courseCards } from '@/lib/learn/__fixtures__/course';
import {
  HOME_NOW,
  homeAllDone,
  homeCoursesDone,
  homeDay,
  homeDoneToday,
  homeFirstDays,
  homeNewLearner,
  homeNoCourses,
  homeNothingDue,
  homeSetup,
  launchCourses,
  tryLessons,
} from '@/lib/learn/__fixtures__/learn-home-page';
import { setAnswerRight, setAnswerWrong } from '@/lib/learn/__fixtures__/lesson-page';
import type { LearnHomeRead } from '@/lib/learn/home';
import type { LearnBarState } from '@/lib/learn/learn-bar';

/*
 * Learn home (page 3), the landing (page 4) and How Learn works (page 31): each board a frame of the page as its route
 * draws it, cut at its height, several to a state.
 */

const learner = (due = 0): LearnBarState => ({ kind: 'learner', due, pullRequests: false, pullRequestsNeedYou: 0 });
const setup: LearnBarState = { kind: 'setup', setup: 'open', due: 0, pullRequests: false, pullRequestsNeedYou: 0 };
const visitor: LearnBarState = { kind: 'visitor' };

/** One state on a board: its name, then the page as its route draws it, cut at `height`. */
function Frame({ title, height, children }: { title: string; height: number; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="m-0 text-sm font-semibold text-foreground">{title}</h2>
      <div className="overflow-hidden rounded-xl border bg-background" style={{ height }}>
        {children}
      </div>
    </section>
  );
}

/** A board: its heading, then its frames. */
function Board({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full flex-col gap-8 px-4 pt-8 pb-16" style={{ maxWidth: 1340 }}>
      <header className="flex flex-col gap-2">
        <h1 className="m-0 text-3xl font-bold tracking-tight">{title}</h1>
        <p className="m-0 text-sm text-muted-foreground" style={{ maxWidth: '95ch' }}>
          {intro}
        </p>
      </header>
      {children}
    </main>
  );
}

/** The site's header and Learn's bar, as the layout draws them. */
function Site({ bar, children }: { bar: LearnBarState; children: ReactNode }) {
  return (
    <>
      <Header section="learn" />
      <LearnBar state={bar} place="home" />
      {children}
    </>
  );
}

const Home = ({ home, bar = learner(home.due) }: { home: LearnHomeRead; bar?: LearnBarState }) => (
  <Site bar={bar}>
    <LearnHomeView home={home} setup={homeSetup} now={HOME_NOW} timeZone={null} hints />
  </Site>
);

const Landing = ({ bar = visitor, ...props }: Partial<LearnLandingViewProps> & { bar?: LearnBarState }) => (
  <Site bar={bar}>
    <LearnLandingView viewer="visitor" courses={courseCards} lessons={tryLessons} hints {...props} />
  </Site>
);

/** The answer after a wrong pick, and after the right one. */
const wrong = setAnswerWrong;
const right = setAnswerRight;

/** Every board of the landing on a computer, top to bottom: the whole page, then the top in its other states. */
export function LandingBoards() {
  return (
    <Board
      title="Learn landing"
      intro="At /learn for a visitor, and for a signed-in person who has not set up Learn and has learned no lesson. A real lesson at the top, answered right there."
    >
      <Frame title="Not signed in · the whole page, before an answer" height={3110}>
        <Landing />
      </Frame>
      <Frame title="Not signed in · after a wrong pick: the reason, and you pick again" height={880}>
        <Landing tryDrawn={{ answer: wrong }} />
      </Frame>
      <Frame title="Not signed in · after the right pick: sign in to continue, nothing saved" height={880}>
        <Landing tryDrawn={{ answer: right }} />
      </Frame>
      <Frame title="Signed in, not set up · the answer is saved, then Set up Learn" height={880}>
        <Landing bar={setup} viewer="member" tryDrawn={{ answer: right, saved: true }} />
      </Frame>
      <Frame
        title="Signed in, part-way through fixing an issue with their agent · a link back to the step they reached"
        height={880}
      >
        <Landing bar={setup} viewer="member" resume="/learn/issues" />
      </Frame>
      <Frame title="Launch day · no numbers yet: a course row shows its lessons alone" height={1660}>
        <Landing courses={launchCourses} />
      </Frame>
      <Frame title="No course open yet · no lesson at the top, no courses section" height={2530}>
        <Landing courses={[]} lessons={[]} />
      </Frame>
    </Board>
  );
}

/** The landing and Learn home on a phone. */
export function PhoneBoards() {
  return (
    <main className="flex w-full flex-col gap-8 px-2 pt-6 pb-16">
      <Frame title="Landing on a phone, not signed in" height={5500}>
        <Landing />
      </Frame>
      <Frame title="Learn home on a phone, a normal day" height={2500}>
        <Home home={homeDay} />
      </Frame>
    </main>
  );
}

/** How Learn works for a learner, then Learn home in each of its states. */
export function HomeBoards() {
  return (
    <Board
      title="Learn home and How Learn works"
      intro="Learn home at /learn for a learner: the next lesson and the review, the third column empty until real issues come, the courses started and the others. How Learn works at /learn/about is the landing for a learner, both buttons Back to Learn home."
    >
      <Frame title="How Learn works · a learner, the lesson at the top learned before" height={880}>
        <Landing bar={learner(6)} viewer="learner" tryDrawn={{ answer: right, learnedOn: '14 Oct' }} />
      </Frame>
      <Frame title="Learn home · a normal day: lessons due, so the review has the highlight" height={1240}>
        <Home home={homeDay} />
      </Frame>
      <Frame title="Learn home · nothing due today: the next lesson has the highlight" height={680}>
        <Home home={homeNothingDue} />
      </Frame>
      <Frame title="Learn home · the review done for today" height={680}>
        <Home home={homeDoneToday} />
      </Frame>
      <Frame title="Learn home · the first days: the first review is ahead" height={680}>
        <Home home={homeFirstDays} />
      </Frame>
      <Frame title="Learn home · your courses finished: pick the next one" height={680}>
        <Home home={homeCoursesDone} />
      </Frame>
      <Frame title="Learn home · every course finished and nothing due: both boxes quiet" height={800}>
        <Home home={homeAllDone} />
      </Frame>
      <Frame title="Learn home · a new learner, just set up: pick your first course" height={1090}>
        <Home home={homeNewLearner} bar={learner()} />
      </Frame>
      <Frame title="Learn home · the API has no course yet" height={390}>
        <Home home={homeNoCourses} bar={learner()} />
      </Frame>
      <Frame title="Learn home · it could not be read: try again" height={420}>
        <Site bar={learner()}>
          <LearnHomeError />
        </Site>
      </Frame>
    </Board>
  );
}
