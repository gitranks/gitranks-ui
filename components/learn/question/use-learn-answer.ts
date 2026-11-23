'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';

import {
  answerReducerOf,
  answerStartOf,
  canSendOf,
  type LearnAnswerAction,
  type LearnAnswerState,
  pickCountOf,
} from '@/lib/learn/learn-answer';
import {
  codeOf,
  keyActionOf,
  type LearnPicked,
  type LearnQuestion,
  verdictOf,
  wirePickOf,
} from '@/lib/learn/learn-question';

/** An answer as a place sends it: the pick as the API takes it, or the place's extra choice; and the code's language. */
export type LearnAnswerSent = { picked: LearnPicked | null; extra: boolean; language: string | null };

/** What the call answered: right or not, and the question with its key when it brings one (the review does). */
export type LearnAnswerReply = { right: boolean; question?: LearnQuestion | null };

export type LearnAnswerOptions = {
  question: LearnQuestion;
  /** The language the page shows code in; the question's first language when it has not this one. */
  language: string | null;
  /** Whether the place has an extra choice ("I don't know", "I don't remember"). */
  extra?: boolean;
  /** Whether the place shows a verdict: the lesson and the review do, the check does not. */
  verdict: boolean;
  /**
   * Sends the answer and returns the call's verdict, or null when the call failed. A question without its key is
   * always sent; a keyed one only for the extra choice, when the place has one.
   */
  send?: (answer: LearnAnswerSent) => Promise<LearnAnswerReply | null>;
  /** Each time the page grades a keyed pick: the pick, whether it is right, and how many tries it took. */
  onGraded?: (graded: { picked: LearnPicked; right: boolean; tries: number; language: string | null }) => void;
  /** The main button once the answer is done (at once after sending, where no verdict shows). */
  onDone: () => void;
  /** Whether the keys answer this question: one question on a page at a time listens. */
  keys?: boolean;
};

/** One question's answer, and what the card and the code call to move it. */
export type LearnAnswer = {
  state: LearnAnswerState;
  language: string | null;
  canSend: boolean;
  pick: (at: number) => void;
  extra: () => void;
  myth: (answer: 'myth' | 'fact') => void;
  move: (from: number, to: number) => void;
  step: (by: -1 | 1) => void;
  main: () => void;
};

/** Fields an Enter or a letter belongs to: never answered from here. */
const TYPED_IN =
  'input:not([type=radio]):not([type=checkbox]), textarea, select, [contenteditable=""], [contenteditable="true"]';

/**
 * The engine of one question's answer. Key the component that calls it by the question's id: a new question starts a
 * new answer. With a key the verdict is the page's own; without one it waits for `send`'s.
 */
export function useLearnAnswer(options: LearnAnswerOptions): LearnAnswer {
  const { question } = options;
  const [state, dispatch] = useReducer(
    useMemo(() => answerReducerOf(question), [question]),
    question,
    answerStartOf,
  );
  const language = codeOf(question, options.language)?.language ?? options.language;
  const live = useRef({ state, options, language });
  live.current = { state, options, language };

  const send = useCallback(async (picked: LearnPicked | null, extra: boolean) => {
    const { options, language } = live.current;
    dispatch({ type: 'sending' });
    const reply = options.send
      ? await options
          .send({ picked: picked === null || extra ? null : wirePickOf(picked), extra, language })
          .catch(() => null)
      : { right: false };
    if (!reply) return dispatch({ type: 'failed' });
    if (!options.verdict) return options.onDone();
    dispatch({ type: 'answered', right: reply.right, key: reply.question ?? null, language });
  }, []);

  /** Grades the pick on the page when the question has its key; otherwise sends it. */
  const answer = useCallback(
    (picked: LearnPicked | null, extra: boolean) => {
      const { state, options, language } = live.current;
      const verdict = state.key && !extra && options.verdict ? verdictOf(state.key, picked, language) : null;
      if (verdict && picked !== null) {
        dispatch({ type: 'graded', verdict });
        options.onGraded?.({ picked: wirePickOf(picked), right: verdict.right, tries: state.tries + 1, language });
        return;
      }
      void send(picked, extra);
    },
    [send],
  );

  const main = useCallback(() => {
    const { state, options } = live.current;
    if (state.phase === 'done') return options.onDone();
    if (!canSendOf(options.question, state)) return;
    answer(state.picked, state.extra);
  }, [answer]);

  /** Myth or fact: one press answers where a verdict shows; where none does, it picks, and the main button sends. */
  const myth = useCallback(
    (picked: 'myth' | 'fact') => {
      const { state, options } = live.current;
      if (state.phase !== 'open') return;
      dispatch({ type: 'myth', answer: picked });
      if (options.verdict) answer(picked, false);
    },
    [answer],
  );

  const act = useCallback((action: LearnAnswerAction) => dispatch(action), []);
  const answerView = useMemo(
    () => ({
      pick: (at: number) => act({ type: 'pick', at }),
      extra: () => act({ type: 'extra' }),
      move: (from: number, to: number) => act({ type: 'move', from, to }),
      step: (by: -1 | 1) => act({ type: 'step', by }),
    }),
    [act],
  );

  const keys = options.keys ?? true;
  useEffect(() => {
    if (!keys) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest?.(TYPED_IN)) return;
      const { state, options, language } = live.current;
      const action = keyActionOf(options.question.type, event.key, {
        count: pickCountOf(options.question, language),
        extra: !!options.extra,
      });
      if (!action) return;
      // Enter on a focused button or link is that button's own press.
      if (action.kind === 'main' && target?.closest?.('button, a, summary')) return;
      if (action.kind !== 'main' && state.phase !== 'open') return;
      event.preventDefault();
      if (action.kind === 'main') main();
      else if (action.kind === 'myth') myth(action.answer);
      else if (action.kind === 'extra') answerView.extra();
      else if (action.kind === 'step') answerView.step(action.by);
      else answerView.pick(action.at);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [keys, main, myth, answerView]);

  return { state, language, canSend: canSendOf(question, state), main, myth, ...answerView };
}
