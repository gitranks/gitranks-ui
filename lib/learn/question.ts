import type { LessonOption, LessonQuestion, LessonReportReason } from './learn.types';

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
