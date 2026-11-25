import type { Screen } from '../registry';
import { Header } from '@/components/header/header';
import { LessonView, type LessonViewProps } from '@/components/learn/lesson/lesson-view';
import { HeaderLine } from '@/components/workspace/header-line';
import {
  LESSON_NOW,
  loopAnswerWrong,
  loopDepths,
  loopExampleCodes,
  loopGroup,
  loopLesson,
  loopQuestionCodes,
  mineLearned,
  mineLearnedRated,
  mineMastered,
  mineNew,
  outputAnswerRight,
  outputExampleCodes,
  outputGroup,
  outputLesson,
  outputQuestionCodes,
  regexDepths,
  regexExampleCodes,
  regexGroup,
  regexLesson,
  setAnswerRight,
  setAnswerWrong,
  setDepths,
  setDepthsLast,
  setExampleCodes,
  setGroup,
  setGroupLast,
  setLesson,
  setLessonFull,
  setLessonLast,
} from '@/lib/learn/__fixtures__/lesson-page';
import { ANSWER_KEPT_NOTE } from '@/lib/learn/kept-answer';
import { learnLessonMarkdownPath, lessonMistakeHref } from '@/lib/learn/paths';

const noop = () => {};
const saved = async () => true;

/** A lesson's page as its route draws it: the site's header and its line, then the page. */
function Page(props: Partial<LessonViewProps>) {
  const lesson = props.lesson ?? setLesson;
  return (
    <>
      <Header section="learn" />
      <HeaderLine />
      <LessonView
        lesson={lesson}
        examples={[{ name: 'main', codes: setExampleCodes }]}
        group={setGroup}
        viewer={null}
        mainLanguage="python"
        links={{ markdown: learnLessonMarkdownPath(lesson.slug), report: lessonMistakeHref(lesson.title) }}
        calls={{ onNext: noop, onSignIn: noop, onRate: saved, onComment: saved }}
        hints
        now={LESSON_NOW}
        timeZone="UTC"
        {...props}
      />
    </>
  );
}

/** Signed in, the two lessons before this one learned. */
const member = (mine = mineNew) => ({ mine, depths: setDepths });

const SOURCES = [
  'components/learn/lesson/lesson-view.tsx',
  'components/learn/lesson/lesson-player.tsx',
  'components/learn/lesson/lesson-article.tsx',
  'components/learn/lesson/lesson-markdown.tsx',
  'components/learn/lesson/lesson-more.tsx',
  'components/learn/lesson/lesson-strip-end.tsx',
  'components/learn/lesson/insights-panel.tsx',
  'components/learn/lesson/lesson-feedback.tsx',
  'components/learn/question/question-part.tsx',
  'lib/learn/lesson-page.ts',
];

const PATH = `/learn/lessons/${setLesson.slug}`;

/** A lesson's page, each state of page 1's boards. */
export const LEARN_LESSON_SCREEN: Screen = {
  id: 'learn-lesson',
  title: 'A lesson',
  area: 'learn',
  route: '/learn/lessons/[slug]',
  sources: SOURCES,
  states: [
    {
      id: 'reading',
      title: 'Not signed in, before an answer',
      path: PATH,
      signedOut: true,
      height: 1000,
      render: () => <Page />,
    },
    {
      id: 'reading-member',
      title: 'Signed in, before an answer, with the group’s squares',
      path: PATH,
      height: 1000,
      render: () => <Page viewer={member()} />,
    },
    {
      id: 'full',
      title: 'A lesson at its right size: the example where the text reaches it',
      path: PATH,
      signedOut: true,
      height: 1300,
      render: () => <Page lesson={setLessonFull} />,
    },
    {
      id: 'full-phone',
      title: 'At its right size, on a phone: the text, then the question',
      path: PATH,
      signedOut: true,
      width: 390,
      height: 2600,
      render: () => <Page lesson={setLessonFull} />,
    },
    {
      id: 'phone',
      title: 'Not signed in, on a phone',
      path: PATH,
      signedOut: true,
      width: 390,
      height: 2200,
      render: () => <Page />,
    },
    {
      id: 'wrong',
      title: 'A wrong pick: the reason shows in the same place',
      path: PATH,
      signedOut: true,
      height: 1000,
      render: () => <Page drawn={{ answer: setAnswerWrong }} />,
    },
    {
      id: 'right',
      title: 'Signed in, right: the button becomes Next, the rows open in place',
      path: PATH,
      height: 1100,
      render: () => <Page viewer={member(mineLearned)} drawn={{ answer: setAnswerRight }} />,
    },
    {
      id: 'right-visitor',
      title: 'Not signed in, right: the button asks to sign in to keep the answer',
      path: PATH,
      signedOut: true,
      height: 1050,
      render: () => <Page drawn={{ answer: setAnswerRight }} />,
    },
    {
      id: 'right-keep',
      title: 'Signed in without the Learn sign, right: saved, and the button is Keep your progress',
      path: PATH,
      height: 1100,
      render: () => <Page viewer={member(mineLearned)} keep drawn={{ answer: setAnswerRight }} />,
    },
    {
      id: 'right-kept',
      title: 'Signed in, no profile yet, right: nothing saved, the answer kept here, the button is Keep your progress',
      path: PATH,
      height: 1100,
      render: () => <Page viewer={null} signedIn keep note={ANSWER_KEPT_NOTE} drawn={{ answer: setAnswerRight }} />,
    },
    {
      id: 'right-fact',
      title: 'Another row opened: Did you know?',
      path: PATH,
      height: 1150,
      render: () => <Page viewer={member(mineLearned)} drawn={{ answer: setAnswerRight, open: 'fact' }} />,
    },
    {
      id: 'right-last',
      title: 'The last lesson of a group: the button finishes the group',
      path: PATH,
      height: 1100,
      render: () => (
        <Page
          lesson={setLessonLast}
          group={setGroupLast}
          viewer={{ mine: mineLearned, depths: setDepthsLast }}
          drawn={{ answer: setAnswerRight }}
        />
      ),
    },
    {
      id: 'learned',
      title: 'Opened again after it was learned: the answer given, the rows open',
      path: PATH,
      height: 1100,
      render: () => <Page viewer={member(mineLearnedRated)} />,
    },
    {
      id: 'mastered',
      title: 'Mastered: nothing more to do',
      path: `/learn/lessons/${regexLesson.slug}`,
      height: 1050,
      render: () => (
        <Page
          lesson={regexLesson}
          examples={[{ name: 'main', codes: regexExampleCodes }]}
          group={regexGroup}
          viewer={{ mine: mineMastered, depths: regexDepths }}
          mainLanguage="javascript"
        />
      ),
    },
    {
      id: 'line',
      title: 'A line to click: a wrong line crossed out, with why, and picked again',
      path: `/learn/lessons/${loopLesson.slug}`,
      height: 1000,
      render: () => (
        <Page
          lesson={loopLesson}
          examples={[{ name: 'main', codes: loopExampleCodes }]}
          questionCodes={loopQuestionCodes}
          group={loopGroup}
          viewer={{ mine: mineNew, depths: loopDepths }}
          drawn={{ answer: loopAnswerWrong }}
        />
      ),
    },
    {
      id: 'output',
      title: 'Code to read: right, and what it prints shows',
      path: `/learn/lessons/${outputLesson.slug}`,
      height: 1200,
      render: () => (
        <Page
          lesson={outputLesson}
          examples={[{ name: 'main', codes: outputExampleCodes }]}
          questionCodes={outputQuestionCodes}
          group={outputGroup}
          viewer={{ mine: mineLearned, depths: {} }}
          drawn={{ answer: outputAnswerRight }}
        />
      ),
    },
    {
      id: 'feedback',
      title: 'After a rating is saved: a comment is optional',
      path: PATH,
      height: 1100,
      render: () => <Page viewer={member(mineLearnedRated)} drawn={{ answer: setAnswerRight, comment: true }} />,
    },
  ],
};
