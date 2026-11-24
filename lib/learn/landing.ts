import { type HighlightedCode, highlightedOf } from './code-tokens';
import { type CourseSection, courseSectionsOf, type LearnCourseCard, lessonsWords } from './course';
import { LEARN_MAINTAINERS_PATH } from './learn-path';
import { languageNameOf } from './learn-question';
import type { LearnLesson } from './lesson-page';
import { courseMarkdownPath, LEARN_COURSES_MARKDOWN_PATH, LEARN_COURSES_PATH, LEARN_HOME_PATH } from './paths';
import { lessonPlainTextOf } from './seo/lesson';
import { clipText } from '@/lib/seo/clip-text';
import { absoluteUrl } from '@/lib/seo/site';

/*
 * Learn's landing (page 4) and How Learn works (page 31): the words both pages, the Markdown copy and the structured
 * data share, and the rules of what the landing shows.
 */

export const LANDING_TITLE = 'Learn one idea in two minutes. Then fix a real issue with it.';
export const LANDING_TEXT =
  'Short lessons on algorithms, databases, design patterns, system design and seven languages. When you are ready, your coding agent fixes a real open-source issue that uses what you learned, and you learn from the fix.';
/** The title search engines show for `/learn`. */
export const LANDING_SEARCH_TITLE = 'GitRanks Learn: two-minute programming lessons and real issues to use them on';

/** How it works: the three depths. */
export const LANDING_STEPS = [
  {
    depth: 'learned',
    label: 'Learned',
    title: 'Learn it',
    text: 'One small idea, an example and one question. A wrong pick only shows you why.',
  },
  {
    depth: 'practised',
    label: 'Practised',
    title: 'Repeat it',
    text: 'We ask you again a few days later, with a new question, so it stays.',
  },
  {
    depth: 'mastered',
    label: 'Mastered',
    title: 'Use it on a real issue',
    text: 'Your coding agent fixes an open-source issue that uses the idea. You answer questions about the fix, and the pull request opens in your name.',
  },
] as const;

/** What you get. */
export const LANDING_GAINS = [
  {
    title: 'An answer for the interview',
    text: 'Every lesson ends with two or three sentences you can say out loud, and tells you which companies are reported to ask about it.',
  },
  {
    title: 'A Skills page',
    text: 'A public page of what you learned, practised and mastered. Put the link in your CV.',
  },
  {
    title: 'Pull requests in your name',
    text: 'Merged fixes in real projects, on your GitHub profile, each one you can explain.',
  },
] as const;

/** Honest with maintainers. */
export const LANDING_MAINTAINERS_TEXT =
  'Every pull request made through Learn says an agent wrote the fix and that you studied it. Learn follows each project’s rules on AI, and stays out of projects that ask it to.';

/** The questions, on the landing, on How Learn works and in the Markdown copy. */
export const LANDING_QUESTIONS = [
  {
    question: 'Does it cost anything?',
    answer: 'GitRanks Learn is free. When you fix a real issue, your coding agent uses the plan you already have.',
  },
  {
    question: 'Do I need an account?',
    answer:
      'You can open any lesson and answer its question without one. To save your progress, repeat lessons and go on, you sign in with GitHub.',
  },
  {
    question: 'Do I need a coding agent?',
    answer:
      'Not for the lessons. To fix a real issue you connect your own: Claude Code, Codex, Cursor, Gemini CLI and others.',
  },
  {
    question: 'Which languages?',
    answer:
      'Python, JavaScript, Go, Rust, Java, PHP and Ruby. Each topic course names on its page the languages its examples come in.',
  },
  { question: 'What if I answer wrong?', answer: 'Nothing bad. You see why, and you pick again.' },
  {
    question: 'Who writes the code in a real fix?',
    answer:
      'Your agent. You learn what it did and why, answer questions about it, and then decide whether to submit it.',
  },
  {
    question: 'How is it different from GitRanks Contribute?',
    answer:
      'Contribute is for fixing: your agent writes the fix and you review it. Learn teaches first: short lessons, and when you fix an issue, a few questions on what went wrong before the pull request can be sent.',
  },
] as const;

/** The landing shows this many courses in each column. */
export const LANDING_COURSES_PER_KIND = 4;

/** The landing's course columns: each kind's first four, a kind with none left out. */
export const landingSectionsOf = (courses: readonly LearnCourseCard[]): CourseSection[] =>
  courseSectionsOf(courses).map((section) => ({
    ...section,
    courses: section.courses.slice(0, LANDING_COURSES_PER_KIND),
  }));

/** Who reads the landing: a visitor, a signed-in person not set up, or a learner (How Learn works). */
export type LandingViewer = 'visitor' | 'member' | 'learner';

const oneLine = (text: string) => text.replace(/\s+/g, ' ').trim();
const sentence = (text: string) => {
  const line = oneLine(text);
  return !line || /[.!?]$/.test(line) ? line : `${line}.`;
};

/** The landing's copy as Markdown, for agents: what Learn is, how it works, every course linked to its own copy. */
export function learnLandingMarkdownOf(courses: readonly LearnCourseCard[]): string {
  const sections = [
    '# GitRanks Learn',
    [LANDING_TITLE, '', LANDING_TEXT, '', `The page: ${absoluteUrl(LEARN_HOME_PATH)}`].join('\n'),
    '## How it works',
    LANDING_STEPS.map((step, index) => `${index + 1}. ${step.title} (${step.label}). ${step.text}`).join('\n'),
  ];
  const kinds = courseSectionsOf(courses);
  if (kinds.length) {
    sections.push(
      '## Courses',
      `All courses: ${absoluteUrl(LEARN_COURSES_PATH)} (Markdown: ${absoluteUrl(LEARN_COURSES_MARKDOWN_PATH)})`,
    );
    for (const kind of kinds) {
      sections.push(
        `### ${kind.title}`,
        kind.courses
          .map((course) => {
            const about = [sentence(course.covers), `${lessonsWords(course.lessons)}.`].filter(Boolean).join(' ');
            return `- [${oneLine(course.name)}](${absoluteUrl(courseMarkdownPath(course.slug))}): ${about}`;
          })
          .join('\n'),
      );
    }
  }
  sections.push(
    '## What you get',
    LANDING_GAINS.map((gain) => `- ${gain.title}: ${gain.text}`).join('\n'),
    '## Honest with maintainers',
    `${LANDING_MAINTAINERS_TEXT} For maintainers: ${absoluteUrl(LEARN_MAINTAINERS_PATH)}`,
    '## Questions',
    LANDING_QUESTIONS.map((each) => `### ${each.question}\n\n${each.answer}`).join('\n\n'),
  );
  return `${sections.join('\n\n')}\n`;
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* Try a lesson                                                                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

/** The language the lesson at the top shows its example in, when the lesson has it. */
export const TRY_LANGUAGE = 'python';

/** The lesson at the top as the card draws it: the lesson, its opening words, its example in one language. */
export type TryLesson = {
  lesson: LearnLesson;
  /** The lesson's opening words, plain. */
  text: string;
  /** The example, in Python when the lesson has it, else in its first language; null for a lesson with none. */
  code: HighlightedCode | null;
  /** Every language the example comes in, in the course's order. */
  languages: string[];
  questionCodes: HighlightedCode[];
};

/** The opening words of a lesson: whole sentences, at most about this many characters. */
export const TRY_TEXT_MAX = 260;

/** A lesson's opening words: its first sentences that fit, else its start clipped. */
export function tryTextOf(body: string): string {
  const plain = lessonPlainTextOf(body);
  const sentences = plain.split(/(?<=[.!?])\s+/);
  let text = '';
  for (const sentence of sentences) {
    const next = text ? `${text} ${sentence}` : sentence;
    if (next.length > TRY_TEXT_MAX) break;
    text = next;
  }
  return text || clipText(plain, TRY_TEXT_MAX);
}

/** The lesson at the top, from a lesson's public page: its main example in Python when it has it. */
export function tryLessonOf(page: {
  lesson: LearnLesson;
  examples: readonly { name: string; codes: readonly HighlightedCode[] }[];
  questionCodes: readonly HighlightedCode[];
}): TryLesson {
  // Only the main example: another folder is the question's code, shown with the question.
  const example = page.examples.find((each) => each.name === 'main') ?? null;
  const codes = example?.codes ?? [];
  return {
    lesson: page.lesson,
    text: tryTextOf(page.lesson.body),
    code: highlightedOf(codes, TRY_LANGUAGE),
    languages: codes.map((code) => code.language),
    questionCodes: [...page.questionCodes],
  };
}

/** "Python here. Every example also comes in JavaScript, Go and Rust."; null for an example in one language. */
export function tryLanguagesLineOf(shown: string, languages: readonly string[]): string | null {
  const others = languages.filter((language) => language !== shown).map(languageNameOf);
  if (!others.length) return null;
  const list = others.length === 1 ? others[0] : `${others.slice(0, -1).join(', ')} and ${others[others.length - 1]}`;
  return `${languageNameOf(shown)} here. Every example also comes in ${list}.`;
}

/** The lessons the landing offers at the top: at most this many, the first lesson of each topic course. */
export const TRY_LESSONS_MAX = 5;

/** The courses whose first lesson is offered at the top: topic courses, which work in any language. */
export const tryCoursesOf = (courses: readonly LearnCourseCard[]) =>
  courses.filter((course) => course.kind === 'TOPIC').slice(0, TRY_LESSONS_MAX);
