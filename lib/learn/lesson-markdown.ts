import {
  isChoice,
  isKeyed,
  type LearnQuestion,
  languageNameOf,
  linesOf,
  optionsOf,
  orderItemsOf,
  QUESTION_TYPE_LABELS,
} from './learn-question';
import {
  bodyPartsOf,
  checkedDateOf,
  type LearnExample,
  type LearnLesson,
  type LearnLessonLevel,
  type LearnLessonLink,
  visualsOf,
} from './lesson-page';
import { coursePath, learnLessonMarkdownPath, learnLessonPath } from './paths';
import { absoluteUrl } from '@/lib/seo/site';

/*
 * A lesson's Markdown copy, for agents: everything the lesson's public answer holds, the question's key included, in
 * the order the page shows it. Pure, so the route, the specs and anything else that writes it agree.
 */

const LEVEL_NAMES: Record<LearnLessonLevel, string> = { EASY: 'Easy', MEDIUM: 'Medium', HARD: 'Hard' };

/** A fence longer than any run of backticks in the code, so code holding a fence stays code. */
function fenced(code: string, language: string): string {
  const longest = Math.max(0, ...[...code.matchAll(/`+/g)].map((run) => run[0].length));
  const fence = '`'.repeat(Math.max(3, longest + 1));
  return `${fence}${language}\n${code.replace(/\r\n?/g, '\n').replace(/\n$/, '')}\n${fence}`;
}

/** An example in each language of the course, each under its language's name. */
function exampleOf(example: LearnExample): string {
  return example.codes
    .map((code) => `${languageNameOf(code.language)}:\n\n${fenced(code.code, code.language)}`)
    .join('\n\n');
}

/** One line of text: a choice or a row cannot start a heading or a list of its own. */
const oneLine = (text: string) => text.replace(/\s+/g, ' ').trim();

const linkOf = (link: LearnLessonLink, path: string) => `[${oneLine(link.title)}](${absoluteUrl(path)})`;

/** The question as the page asks it: its kind, its words, its code in each language, and what to pick from. */
function questionOf(question: LearnQuestion): string[] {
  const out = [`${QUESTION_TYPE_LABELS[question.type]}: ${question.prompt.trim()}`];
  for (const code of question.codes) {
    const numbered = question.type === 'PICK_LINE';
    const text = numbered
      ? linesOf(code.code)
          .map((line, at) => `${at + 1}  ${line}`)
          .join('\n')
      : code.code;
    out.push(
      `${languageNameOf(code.language)}${numbered ? ', lines numbered' : ''}:\n\n${fenced(text, code.language)}`,
    );
  }
  if (isChoice(question.type)) {
    out.push(
      optionsOf(question)
        .map((option, at) => `${at + 1}. ${oneLine(option.text)}`)
        .join('\n'),
    );
  }
  if (question.type === 'PUT_IN_ORDER') {
    out.push(
      orderItemsOf(question)
        .map((item) => `- ${oneLine(item.text)}`)
        .join('\n'),
    );
  }
  if (question.type === 'MYTH_OR_FACT') out.push('Answer with myth or fact.');
  return out;
}

const recordOf = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

/** The key: what is right, and why; each wrong choice and why it is wrong. Nothing for a question that has none. */
function keyOf(question: LearnQuestion): string[] {
  if (!isKeyed(question)) return [];
  const content = recordOf(question.content);
  if (isChoice(question.type)) {
    return [
      optionsOf(question)
        .map((option, at) => {
          const why = option.why?.trim() ? ` ${oneLine(option.why)}` : '';
          return `${at + 1}. ${option.right ? 'Right' : 'Wrong'}.${why}`;
        })
        .join('\n'),
    ];
  }
  // Why the right answer is right: one reason for every language.
  const reason = typeof content.why === 'string' && content.why.trim() ? [oneLine(content.why)] : [];
  switch (question.type) {
    case 'PICK_LINE': {
      const lines = Object.entries(recordOf(content.rightLine))
        .filter(([, line]) => Number.isInteger(line))
        .map(([language, line]) => `- ${languageNameOf(language)}: line ${line}`);
      const whyNot =
        typeof content.whyNot === 'string' && content.whyNot.trim()
          ? [`Any other line: ${oneLine(content.whyNot)}`]
          : [];
      return [`The right line:\n${lines.join('\n')}`, ...reason, ...whyNot];
    }
    case 'PUT_IN_ORDER': {
      const text = new Map(orderItemsOf(question).map((item) => [item.id, oneLine(item.text)]));
      const order = (content.order as string[]).map((id, at) => `${at + 1}. ${text.get(id) ?? id}`);
      return [`The right order:\n${order.join('\n')}`, ...reason];
    }
    case 'MYTH_OR_FACT':
      return [`It is a ${content.answer}.`, ...reason];
    default:
      return reason;
  }
}

/** A lesson as Markdown. */
export function learnLessonMarkdownOf(lesson: LearnLesson): string {
  const examples = new Map(lesson.examples.map((example) => [example.name, example]));
  const checked = checkedDateOf(lesson.changedAt);
  const head = [
    `# ${oneLine(lesson.title)}`,
    [
      `A lesson of the course ${linkOf(lesson.course, coursePath(lesson.course.slug))}, in its group "${oneLine(lesson.group.title)}". ${LEVEL_NAMES[lesson.level] ?? lesson.level}.`,
      `The page: ${absoluteUrl(learnLessonPath(lesson.slug))}`,
      `Written and checked by GitRanks${checked ? `, last checked ${checked}` : ''}.`,
    ].join('\n'),
  ];
  if (lesson.buildsOn.length) {
    head.push(
      `Builds on: ${lesson.buildsOn.map((link) => linkOf(link, learnLessonMarkdownPath(link.slug))).join(', ')}.`,
    );
  }

  // The body, an example where the text places it; a visual is a picture on the page and has no words here.
  const body = bodyPartsOf(lesson.body, {
    examples: [...examples.keys()],
    visuals: Object.keys(visualsOf(lesson.visuals)),
  }).flatMap((part) => {
    if (part.kind === 'text') return [part.markdown];
    const example = part.kind === 'example' ? examples.get(part.name) : undefined;
    return example?.codes.length ? [exampleOf(example)] : [];
  });

  const sections = [...head, ...body, '## The question', ...questionOf(lesson.question)];
  const key = keyOf(lesson.question);
  if (key.length) sections.push('## The answer', ...key);
  if (lesson.say.trim()) sections.push('## Say it in an interview', lesson.say.trim());
  if (lesson.fact?.text.trim()) {
    const { title, text, source, url } = lesson.fact;
    sections.push('## Did you know?', `**${oneLine(title)}**`, text.trim());
    if (source.trim() || url.trim())
      sections.push(`Source: ${url.trim() ? `[${oneLine(source || url)}](${url.trim()})` : oneLine(source)}`);
  }
  if (lesson.deeper?.trim())
    sections.push('## Go deeper', 'A prompt for your own agent:', fenced(lesson.deeper.trim(), ''));

  const around = [
    lesson.previous
      ? `Previous lesson: ${linkOf(lesson.previous, learnLessonMarkdownPath(lesson.previous.slug))}`
      : null,
    lesson.next ? `Next lesson: ${linkOf(lesson.next, learnLessonMarkdownPath(lesson.next.slug))}` : null,
  ].filter((line): line is string => line !== null);
  if (around.length) sections.push(around.join('\n'));

  return `${sections.join('\n\n')}\n`;
}
