/**
 * A question of a lesson, the review or the check, and everything about it that needs no screen: what its content
 * holds, whether it carries its key, the verdict on a pick, the keys that answer it and the words around it. The same
 * rules for all six kinds, so every place that asks behaves the same.
 */

/** The six kinds of question, as the API names them. */
export const LEARN_QUESTION_TYPES = [
  'PICK_ONE',
  'PICK_ALL',
  'PREDICT_OUTPUT',
  'PICK_LINE',
  'PUT_IN_ORDER',
  'MYTH_OR_FACT',
] as const;
export type LearnQuestionType = (typeof LEARN_QUESTION_TYPES)[number];

/** One language's version of the code a question shows. */
export type LearnCode = { language: string; code: string };

/**
 * A question as the API gives it. `content` is keyed for a lesson's own question (it teaches: the page grades it
 * itself) and keyless for the review's and the check's (they measure: the call grades them).
 */
export type LearnQuestion = {
  id: string;
  type: LearnQuestionType;
  prompt: string;
  example: string | null;
  visual: unknown;
  content: unknown;
  codes: LearnCode[];
};

/** A choice of `pick-one`, `pick-all` or `predict-output`: `right` and `why` only when the content is keyed. */
export type LearnOption = { text: string; right?: boolean; why?: string };

/** A row of `put-in-order`: an opaque id and its text. */
export type LearnOrderItem = { id: string; text: string };

/**
 * What a person picked, by kind: an option's index (`pick-one`, `predict-output`); the indexes, smallest first
 * (`pick-all`); the rows' ids in the person's order (`put-in-order`); a line, counted from 1 (`pick-line`); `'myth'` or
 * `'fact'`.
 */
export type LearnPicked = number | number[] | string[] | 'myth' | 'fact';

/** The label of each kind, as the card's pill says it. */
export const QUESTION_TYPE_LABELS: Record<LearnQuestionType, string> = {
  PICK_ONE: 'Pick one',
  PICK_ALL: 'Pick all that apply',
  PREDICT_OUTPUT: 'Predict the output',
  PICK_LINE: 'Pick the line',
  PUT_IN_ORDER: 'Put in order',
  MYTH_OR_FACT: 'Myth or fact',
};

/** The names of the languages a course's examples are written in. */
const LANGUAGE_NAMES: Record<string, string> = {
  python: 'Python',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  go: 'Go',
  rust: 'Rust',
  java: 'Java',
  php: 'PHP',
  ruby: 'Ruby',
  shell: 'Shell',
};

/** "Python" for `python`; an unknown language's own id. */
export const languageNameOf = (language: string) => LANGUAGE_NAMES[language] ?? language;

/** "JavaScript and TypeScript" for a language course of both; "Go" for a course of one. */
export const languageNamesOf = (languages: readonly string[]) =>
  languages.map((language) => languageNameOf(language)).join(' and ');

const recordOf = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const textOf = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value : null);

/** The kinds a person answers by picking from a list of options. */
export const isChoice = (type: LearnQuestionType) =>
  type === 'PICK_ONE' || type === 'PICK_ALL' || type === 'PREDICT_OUTPUT';

/**
 * A choice question's options, in the order given. None for any other kind, or when one option is not of the shape:
 * dropping only that one would move every index after it, and a pick is sent as an index.
 */
export function optionsOf(question: Pick<LearnQuestion, 'type' | 'content'>): LearnOption[] {
  const options = recordOf(question.content).options;
  if (!isChoice(question.type) || !Array.isArray(options)) return [];
  const read: LearnOption[] = [];
  for (const option of options) {
    const { text, right, why } = recordOf(option);
    if (typeof text !== 'string') return [];
    read.push({
      text,
      ...(typeof right === 'boolean' ? { right } : {}),
      ...(typeof why === 'string' ? { why } : {}),
    });
  }
  return read;
}

/** A `put-in-order` question's rows, in the order given (never the right one). None when one is not of the shape. */
export function orderItemsOf(question: Pick<LearnQuestion, 'type' | 'content'>): LearnOrderItem[] {
  const items = recordOf(question.content).items;
  if (question.type !== 'PUT_IN_ORDER' || !Array.isArray(items)) return [];
  const read: LearnOrderItem[] = [];
  for (const item of items) {
    const { id, text } = recordOf(item);
    if (typeof id !== 'string' || typeof text !== 'string') return [];
    read.push({ id, text });
  }
  return read;
}

/** Whether the content carries its key, so the page can give the verdict itself. */
export function isKeyed(question: Pick<LearnQuestion, 'type' | 'content'>): boolean {
  const content = recordOf(question.content);
  switch (question.type) {
    case 'PICK_ONE':
    case 'PICK_ALL':
    case 'PREDICT_OUTPUT': {
      const options = optionsOf(question);
      return options.length > 0 && options.every((option) => typeof option.right === 'boolean');
    }
    case 'PICK_LINE':
      return Object.values(recordOf(content.rightLine)).some((line) => Number.isInteger(line));
    case 'PUT_IN_ORDER':
      return Array.isArray(content.order) && content.order.every((id) => typeof id === 'string');
    case 'MYTH_OR_FACT':
      return content.answer === 'myth' || content.answer === 'fact';
  }
}

/** The code in the language asked for, or else in the question's first language; none for a question with no code. */
export const codeOf = (question: Pick<LearnQuestion, 'codes'>, language: string | null): LearnCode | null =>
  question.codes.find((code) => code.language === language) ?? question.codes[0] ?? null;

/** A code's lines as the page numbers them: the last line break ends the last line, it does not start one more. */
export function linesOf(code: string): string[] {
  const lines = code.replace(/\r\n?/g, '\n').split('\n');
  if (lines.length > 1 && lines.at(-1) === '') lines.pop();
  return lines;
}

const isIndexes = (picked: unknown, length: number): picked is number[] =>
  Array.isArray(picked) && picked.every((index) => Number.isInteger(index) && index >= 0 && index < length);

const isIds = (picked: unknown): picked is string[] =>
  Array.isArray(picked) && picked.every((id) => typeof id === 'string');

/**
 * The verdict on a pick, from a keyed question: whether it is right, the reason to show, and what it showed to be
 * wrong (options' indexes, or a line's number) so the card can cross it out. A wrong pick only shows why it is wrong,
 * never which one is right. Null without a key, or for a pick of another kind's shape.
 */
export type LearnVerdict = { right: boolean; why: string | null; wrong: number[] };

export function verdictOf(
  question: LearnQuestion,
  picked: LearnPicked | null,
  language: string | null,
): LearnVerdict | null {
  if (picked === null || !isKeyed(question)) return null;
  const content = recordOf(question.content);
  switch (question.type) {
    case 'PICK_ONE':
    case 'PREDICT_OUTPUT': {
      const options = optionsOf(question);
      if (typeof picked !== 'number' || !options[picked]) return null;
      const right = options[picked].right === true;
      return { right, why: textOf(options[picked].why), wrong: right ? [] : [picked] };
    }
    case 'PICK_ALL': {
      const options = optionsOf(question);
      if (!isIndexes(picked, options.length) || !picked.length) return null;
      const wrong = picked.filter((index) => !options[index].right);
      const missed = options.some((option, index) => option.right && !picked.includes(index));
      if (!wrong.length && !missed) return { right: true, why: rightWhyOf(question, language), wrong: [] };
      return { right: false, why: wrong.length ? textOf(options[wrong[0]].why) : null, wrong };
    }
    case 'PICK_LINE': {
      const rightLine = language ? recordOf(content.rightLine)[language] : undefined;
      if (typeof picked !== 'number' || typeof rightLine !== 'number') return null;
      const right = picked === rightLine;
      return { right, why: textOf(right ? content.why : content.whyNot), wrong: right ? [] : [picked] };
    }
    case 'PUT_IN_ORDER': {
      const order = content.order as string[];
      if (!isIds(picked)) return null;
      const right = picked.length === order.length && picked.every((id, index) => id === order[index]);
      return { right, why: right ? textOf(content.why) : null, wrong: [] };
    }
    case 'MYTH_OR_FACT': {
      if (picked !== 'myth' && picked !== 'fact') return null;
      return { right: picked === content.answer, why: textOf(content.why), wrong: [] };
    }
  }
}

/** What is right, from a keyed question: the options' indexes, the line, the order, or myth or fact. */
export type LearnRight =
  | { kind: 'options'; indexes: number[] }
  | { kind: 'line'; line: number }
  | { kind: 'order'; ids: string[] }
  | { kind: 'myth'; answer: 'myth' | 'fact' };

export function rightOf(question: LearnQuestion, language: string | null): LearnRight | null {
  if (!isKeyed(question)) return null;
  const content = recordOf(question.content);
  switch (question.type) {
    case 'PICK_ONE':
    case 'PICK_ALL':
    case 'PREDICT_OUTPUT':
      return {
        kind: 'options',
        indexes: optionsOf(question).flatMap((option, index) => (option.right ? [index] : [])),
      };
    case 'PICK_LINE': {
      const line = language ? recordOf(content.rightLine)[language] : undefined;
      return typeof line === 'number' ? { kind: 'line', line } : null;
    }
    case 'PUT_IN_ORDER':
      return { kind: 'order', ids: content.order as string[] };
    case 'MYTH_OR_FACT':
      return { kind: 'myth', answer: content.answer as 'myth' | 'fact' };
  }
}

/** Why the right answer is right, from a keyed question: the right options' reasons, in order, for a choice. */
export function rightWhyOf(question: LearnQuestion, language: string | null): string | null {
  const content = recordOf(question.content);
  if (isChoice(question.type)) {
    const whys = optionsOf(question).flatMap((option) => (option.right ? [textOf(option.why)].filter(Boolean) : []));
    return whys.length ? whys.join(' ') : null;
  }
  if (question.type === 'PICK_LINE' && !rightOf(question, language)) return null;
  return textOf(content.why);
}

/** A pick as the API takes it: `pick-all`'s indexes smallest first, each once. */
export function wirePickOf(picked: LearnPicked): LearnPicked {
  if (Array.isArray(picked) && picked.every((index) => typeof index === 'number')) {
    return [...new Set(picked as number[])].sort((a, b) => a - b);
  }
  return picked;
}

/** What a key does on a question: pick the nth thing (from 0), the place's extra choice, myth or fact, move, or main. */
export type LearnKeyAction =
  | { kind: 'pick'; at: number }
  | { kind: 'extra' }
  | { kind: 'myth'; answer: 'myth' | 'fact' }
  | { kind: 'step'; by: -1 | 1 }
  | { kind: 'main' };

/**
 * The key's action on a question of this kind: 1 to 9 pick an option, a line or a row (as far as there are), 0 the
 * place's extra choice, M and F answer myth or fact, the arrows move the picked row, Enter is the main button.
 */
export function keyActionOf(
  type: LearnQuestionType,
  key: string,
  { count, extra }: { count: number; extra: boolean },
): LearnKeyAction | null {
  if (key === 'Enter') return { kind: 'main' };
  if (key === '0') return extra ? { kind: 'extra' } : null;
  if (/^[1-9]$/.test(key) && type !== 'MYTH_OR_FACT') {
    const at = Number(key) - 1;
    return at < count ? { kind: 'pick', at } : null;
  }
  if (type === 'MYTH_OR_FACT' && (key === 'm' || key === 'M')) return { kind: 'myth', answer: 'myth' };
  if (type === 'MYTH_OR_FACT' && (key === 'f' || key === 'F')) return { kind: 'myth', answer: 'fact' };
  if (type === 'PUT_IN_ORDER' && key === 'ArrowUp') return { kind: 'step', by: -1 };
  if (type === 'PUT_IN_ORDER' && key === 'ArrowDown') return { kind: 'step', by: 1 };
  return null;
}

/** What the status slot says before an answer, for each kind; a place may say its own instead. */
export function openNoteOf(type: LearnQuestionType, picked: LearnPicked | null): string {
  switch (type) {
    case 'PICK_ONE':
      return 'Pick one, then check.';
    case 'PREDICT_OUTPUT':
      return 'Pick what the code prints, then check.';
    case 'PICK_ALL': {
      const count = Array.isArray(picked) ? picked.length : 0;
      return count
        ? `${count} picked. Pick every one that is true, then check.`
        : 'Pick every one that is true, then check.';
    }
    case 'PICK_LINE':
      return 'Click a line in the code, or press its number. Then check.';
    case 'PUT_IN_ORDER':
      return 'Drag a row, or pick it with its number and move it with the arrow keys. Then check.';
    case 'MYTH_OR_FACT':
      return 'One press answers. There is no Check on this kind of question.';
  }
}

/** What the status slot adds after a wrong pick that may be tried again. */
export const againNoteOf = (type: LearnQuestionType) =>
  type === 'PUT_IN_ORDER' ? 'Move the rows, then check again.' : 'Pick again.';

/** The reason a `pick-all` shows when every option picked is right but one more is. */
export const MISSED_NOTE = 'Each one you picked is true, but not every true one is picked yet.';

/** The reason a `put-in-order` shows when it is wrong: it never says which rows are out of place. */
export const OUT_OF_ORDER_NOTE = 'Some rows are out of place.';

/** What the status slot says for the place's extra choice when the call brought no reason. */
export const EXTRA_NOTE = 'Noted. You will see this one again.';
