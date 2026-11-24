import { describe, expect, it } from 'vitest';

import { orderQuestion } from './__fixtures__/learn-question';
import {
  loopLesson,
  mythLesson,
  outputLesson,
  regexLesson,
  setLesson,
  setLessonWithVisual,
} from './__fixtures__/lesson-page';
import { learnLessonMarkdownOf } from './lesson-markdown';
import type { LearnLesson } from './lesson-page';
import { absoluteUrl } from '@/lib/seo/site';

const FENCE = '```';
/** Never in our copy: written by its code point. */
const LONG_DASH = String.fromCodePoint(0x2014);

/** The text between a heading and the next one. */
const sectionOf = (markdown: string, heading: string) =>
  markdown.split(`## ${heading}\n\n`)[1]?.split('\n## ')[0]?.trim();

describe("a lesson's Markdown copy", () => {
  const markdown = learnLessonMarkdownOf(setLesson);

  it('starts with the title, its course, group and level, its page, who checked it and what it builds on', () => {
    expect(markdown.split('\n\n').slice(0, 3)).toEqual([
      '# Find duplicates in one pass with a set',
      [
        `A lesson of the course [Algorithms and data structures](${absoluteUrl('/learn/courses/algorithms')}), in its group "Hash maps and sets". Easy.`,
        `The page: ${absoluteUrl('/learn/lessons/find-duplicates-with-a-set')}`,
        'Written and checked by GitRanks, last checked 21 Oct 2026.',
      ].join('\n'),
      `Builds on: [How a hash map finds a key](${absoluteUrl('/learn/lessons/how-a-hash-map-finds-a-key.md')}).`,
    ]);
  });

  it('holds the body with each example where the text places it, in every language under its name', () => {
    const body = markdown.indexOf('The fast way');
    const python = markdown.indexOf(`Python:\n\n${FENCE}python\ndef has_duplicate(nums):`);
    const ruby = markdown.indexOf(`Ruby:\n\n${FENCE}ruby\n`);
    expect(body).toBeGreaterThan(0);
    expect(python).toBeGreaterThan(body);
    expect(ruby).toBeGreaterThan(python);
    expect(ruby).toBeLessThan(markdown.indexOf('## The question'));
    expect(markdown).not.toContain('[[example');
  });

  it("quotes a project's code with its file and lines linked to that exact version, in its one language", () => {
    const source = {
      repo: 'django/django',
      path: 'django/core/handlers/base.py',
      commit: 'abc123',
      firstLine: 138,
      lastLine: 139,
      at: '2026-11-12',
    };
    const quoted: LearnLesson = {
      ...setLesson,
      course: { ...setLesson.course, project: { name: 'Django', repo: 'django/django', org: null } },
      examples: [
        { name: 'main', codes: [{ language: 'python', code: 'def get_response(self, request):\n    pass' }], source },
      ],
    };
    const text = learnLessonMarkdownOf(quoted);
    expect(text).toContain(
      [
        '[django/core/handlers/base.py, lines 138 to 139](https://github.com/django/django/blob/abc123/django/core/handlers/base.py#L138-L139):',
        `${FENCE}python\ndef get_response(self, request):\n    pass\n${FENCE}`,
        'Django’s own code, as it was on 12 Nov 2026. The link opens this exact version on GitHub, so it still matches the lesson after the project changes the file.',
      ].join('\n\n'),
    );
    expect(text).not.toContain('Python:\n');
    // Its course is linked at its project's address.
    expect(text).toContain(`](${absoluteUrl('/learn/repos/django/django')}), in its group`);
    // Without the project, a quote names its repository.
    expect(learnLessonMarkdownOf({ ...quoted, course: setLesson.course })).toContain('django/django’s own code');
  });

  it('drops a visual, a picture on the page with no words here', () => {
    expect(learnLessonMarkdownOf(setLessonWithVisual)).not.toContain('[[visual');
  });

  it('asks the question with its choices, then gives the key: each choice right or wrong, and why', () => {
    expect(sectionOf(markdown, 'The question')).toBe(
      [
        'Pick one: The list has 1,000,000 numbers, all different. How many times does the function check the set?',
        '',
        '1. About 20, because it halves the list each time',
        '2. 1,000,000, once for each number',
        '3. About 500 billion, once for each pair',
      ].join('\n'),
    );
    expect(sectionOf(markdown, 'The answer')?.split('\n')).toEqual([
      '1. Wrong. Halving the list is binary search, and that needs a sorted list. This function looks at every number once.',
      '2. Right. It goes through the list once and checks the set once per number.',
      '3. Wrong. That is the slow way, which compares every pair. The set is checked once for each number.',
    ]);
  });

  it('numbers the lines of a pick-line question in each language, and keys each language with the reasons', () => {
    const loop = learnLessonMarkdownOf(loopLesson);
    expect(sectionOf(loop, 'The question')).toContain(
      `Python, lines numbered:\n\n${FENCE}python\n1  def has_duplicate`,
    );
    expect(sectionOf(loop, 'The question')).toContain(`JavaScript, lines numbered:\n\n${FENCE}javascript\n1  function`);
    expect(sectionOf(loop, 'The answer')).toBe(
      [
        'The right line:\n- Python: line 3\n- JavaScript: line 4',
        'The inner loop starts again for every item of the outer one: about n² / 2 comparisons.',
        'Any other line: This line runs once for each item. On its own that grows in step with the list.',
      ].join('\n\n'),
    );
  });

  it('keys a myth-or-fact question and a predict-output one', () => {
    const myth = learnLessonMarkdownOf(mythLesson);
    expect(sectionOf(myth, 'The question')).toContain('Myth or fact: ');
    expect(sectionOf(myth, 'The question')).toContain('Answer with myth or fact.');
    expect(sectionOf(myth, 'The answer')).toMatch(/^It is a myth\.\n\n\S/);
    const output = learnLessonMarkdownOf(outputLesson);
    expect(sectionOf(output, 'The question')).toContain(`Python:\n\n${FENCE}python\nstack = []`);
    expect(sectionOf(output, 'The answer')).toContain('2. Right. A stack gives back the last item put in: `3`.');
  });

  it('lists the rows of a put-in-order question, then the right order and why', () => {
    const order = learnLessonMarkdownOf({ ...setLesson, question: orderQuestion });
    expect(sectionOf(order, 'The question')).toBe(
      [
        'Put in order: Put the steps of one round of binary search in order.',
        '',
        '- Keep the half that can hold the item',
        '- Look at the middle item',
        '- Compare it with the item you want',
      ].join('\n'),
    );
    expect(sectionOf(order, 'The answer')).toBe(
      [
        'The right order:\n1. Look at the middle item\n2. Compare it with the item you want\n3. Keep the half that can hold the item',
        'Look at the middle, compare, then keep the half that can still hold the item.',
      ].join('\n\n'),
    );
  });

  it('has no answer section for a question that carries no key', () => {
    const unkeyed = { ...setLesson.question, content: { options: [{ text: 'One' }, { text: 'Two' }] } };
    const copy = learnLessonMarkdownOf({ ...setLesson, question: unkeyed });
    expect(copy).toContain('## The question');
    expect(copy).not.toContain('## The answer');
  });

  it('ends with the interview line, the fact and its source, the prompt to go deeper, and the lessons around it', () => {
    expect(sectionOf(markdown, 'Say it in an interview')).toBe(setLesson.say);
    expect(sectionOf(markdown, 'Did you know?')).toBe(
      [
        '**How one web request froze a server**',
        setLesson.fact?.text,
        `Source: [${setLesson.fact?.source}](${setLesson.fact?.url})`,
      ].join('\n\n'),
    );
    expect(sectionOf(markdown, 'Go deeper')).toContain(
      `A prompt for your own agent:\n\n${FENCE}\n${setLesson.deeper?.trim()}\n${FENCE}\n\nPrevious lesson: `,
    );
    expect(
      markdown.endsWith(
        [
          `Previous lesson: [How a hash map finds a key](${absoluteUrl('/learn/lessons/how-a-hash-map-finds-a-key.md')})`,
          `Next lesson: [Count things with a hash map](${absoluteUrl('/learn/lessons/count-things-with-a-hash-map.md')})`,
          '',
        ].join('\n'),
      ),
    ).toBe(true);
  });

  it('leaves out what a lesson does not have', () => {
    const bare: LearnLesson = {
      ...setLesson,
      buildsOn: [],
      say: ' ',
      fact: null,
      deeper: null,
      previous: null,
      next: null,
    };
    const copy = learnLessonMarkdownOf(bare);
    for (const absent of [
      'Builds on',
      '## Say it',
      '## Did you know?',
      '## Go deeper',
      'Previous lesson',
      'Next lesson',
    ]) {
      expect(copy, absent).not.toContain(absent);
    }
  });

  it('keeps code that holds a fence inside a longer fence, so it stays code', () => {
    const code = `${FENCE}js\nlet x = 1;\n${FENCE}`;
    const copy = learnLessonMarkdownOf({
      ...setLesson,
      body: 'Text.\n\n[[example: main]]',
      examples: [{ name: 'main', codes: [{ language: 'python', code }] }],
    } as unknown as LearnLesson);
    expect(copy).toContain(`Python:\n\n\`\`\`\`python\n${code}\n\`\`\`\``);
  });

  it('keeps one choice on one line, so it cannot start a heading or a list of its own', () => {
    const question = {
      ...setLesson.question,
      content: {
        options: [
          { text: 'One\n# Two', right: true, why: 'Because\n\n- this' },
          { text: 'Three', right: false },
        ],
      },
    };
    const copy = learnLessonMarkdownOf({ ...setLesson, question });
    expect(copy).toContain('1. One # Two\n2. Three');
    expect(copy).toContain('1. Right. Because - this\n2. Wrong.');
  });

  it('never holds a long dash', () => {
    for (const lesson of [setLesson, regexLesson, loopLesson, mythLesson, outputLesson]) {
      expect(learnLessonMarkdownOf(lesson), lesson.slug).not.toContain(LONG_DASH);
    }
  });
});
