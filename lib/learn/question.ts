import type {
  LessonOption,
  LessonQuestion,
  LessonReportReason,
  LessonStep,
  LessonStepResult,
  LessonStepState,
  LessonWarmupAnswer,
  LessonWhy,
} from './learn.types';

/** A warm-up question's own last option: it costs nothing, and changes nothing. GitRanks adds it, never the lesson. */
export const DONT_KNOW = '__dont_know';
export const DONT_KNOW_TEXT = "I don't know yet";

/** What the user can say is wrong with a question. */
export const REPORT_REASONS: { value: LessonReportReason; label: string }[] = [
  { value: 'WRONG_KEY', label: 'The marked answer is wrong' },
  { value: 'UNCLEAR', label: 'The question is unclear' },
  { value: 'OFF_TOPIC', label: 'It is not about this fix' },
  { value: 'TWO_FIT', label: 'More than one answer fits' },
];

/** A question's options as the card lists them: a warm-up question's end with "I don't know yet". */
export const optionsOf = (question: LessonQuestion, warmup = false): LessonOption[] =>
  warmup ? [...question.options, { id: DONT_KNOW, text: DONT_KNOW_TEXT }] : question.options;

/**
 * The picks after the user ticks or unticks an option: one for a single-answer question, any for a multi-answer one,
 * where "I don't know yet" stands alone (ticking it clears the others, ticking another clears it).
 */
export function pickOf(question: LessonQuestion, picked: readonly string[], optionId: string, on: boolean): string[] {
  if (question.type === 'SINGLE' || optionId === DONT_KNOW) return on ? [optionId] : [];
  const others = picked.filter((id) => id !== DONT_KNOW && id !== optionId);
  return on ? [...others, optionId] : others;
}

/** What a graded question shows. */
export type OptionMark = 'plain' | 'picked' | 'right' | 'hint';

/**
 * The options a question card shows, each with its mark and the `why` line it may show:
 * - not graded: every option, the picked ones marked;
 * - right: every option, the right ones marked, each with its why;
 * - wrong: only the picked options, each with its why as a hint (never the right answer).
 */
export function shownOptionsOf(
  options: readonly LessonOption[],
  picked: readonly string[],
  graded: { correct: boolean; why: readonly LessonWhy[] } | null,
): { option: LessonOption; mark: OptionMark; why: string | null; picked: boolean }[] {
  const whyOf = new Map((graded?.why ?? []).map((line) => [line.optionId, line]));
  if (!graded) {
    return options.map((option) => ({
      option,
      mark: picked.includes(option.id) ? 'picked' : 'plain',
      why: null,
      picked: picked.includes(option.id),
    }));
  }
  if (!graded.correct) {
    return options
      .filter((option) => picked.includes(option.id))
      .map((option) => ({ option, mark: 'hint', why: whyOf.get(option.id)?.why ?? null, picked: true }));
  }
  return options.map((option) => ({
    option,
    mark: whyOf.get(option.id)?.correct ? 'right' : 'plain',
    why: whyOf.get(option.id)?.why ?? null,
    picked: picked.includes(option.id),
  }));
}

/** The line under a step question's prompt. */
export const pickHintOf = (question: LessonQuestion) =>
  question.type === 'MULTI' ? 'Pick every answer that fits.' : 'Pick one.';

/** The warm-up's answers as the API takes them: a question left unanswered counts as "I don't know yet". */
export function warmupAnswersOf(
  questions: readonly LessonQuestion[],
  picks: Readonly<Record<string, readonly string[]>>,
): LessonWarmupAnswer[] {
  return questions.map((question) => {
    const picked = (picks[question.id] ?? []).filter((id) => id !== DONT_KNOW);
    const dontKnow = !picked.length;
    return { questionId: question.id, picked: dontKnow ? [] : picked, dontKnow };
  });
}

/** How many warm-up questions have an answer, "I don't know yet" included. */
export const answeredCountOf = (picks: Readonly<Record<string, readonly string[]>>) =>
  Object.values(picks).filter((picked) => picked.length > 0).length;

/** A step's state as its rail badge says it; nothing while it is open. */
export const STEP_BADGES: Record<
  Exclude<LessonStepState, 'OPEN'>,
  { label: string; tone: 'green' | 'neutral' | 'amber' }
> = {
  KNEW: { label: 'You knew this', tone: 'neutral' },
  FIRST_TRY: { label: 'Passed', tone: 'green' },
  TRY_N: { label: 'Passed', tone: 'green' },
  REPORTED: { label: 'Reported', tone: 'amber' },
};

/** The names of a step's parts, as the rail and the step's eyebrow show them. */
const PART_NAMES: Record<string, string> = {
  before: 'Before',
  cause: 'Cause',
  fix: 'The fix',
  connects: 'How it connects',
  deep_dive: 'Deep dive',
};

/** "Before", "Before and cause", "The fix": what a step covers. */
export function partsLabelOf(step: Pick<LessonStep, 'parts'>): string {
  const names = step.parts.map((part) => PART_NAMES[part] ?? part.replaceAll('_', ' '));
  if (!names.length) return 'Step';
  const joined = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names.at(-1)!.toLowerCase()}`;
  return joined.charAt(0).toUpperCase() + joined.slice(1);
}

/** A step is passed once it is anything but open. */
export const isStepDone = (result: LessonStepResult | undefined) => !!result && result.state !== 'OPEN';

/** "Passed first try", "Passed on try 3", for a step's result. */
export function stepResultLabel(result: LessonStepResult): string {
  switch (result.state) {
    case 'KNEW':
      return 'Knew it before';
    case 'FIRST_TRY':
      return 'Passed first try';
    case 'TRY_N':
      return `Passed on try ${result.tries}`;
    case 'REPORTED':
      return 'Question reported';
    default:
      return 'Not passed yet';
  }
}

/** Text with `code` spans, split into its plain and code parts, in order. */
export function codeSpansOf(text: string): { code: boolean; text: string }[] {
  const parts: { code: boolean; text: string }[] = [];
  const pattern = /`([^`]+)`/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > last) parts.push({ code: false, text: text.slice(last, match.index) });
    parts.push({ code: true, text: match[1] });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ code: false, text: text.slice(last) });
  return parts;
}
