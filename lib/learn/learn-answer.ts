import {
  codeOf,
  isChoice,
  isKeyed,
  type LearnPicked,
  type LearnQuestion,
  type LearnVerdict,
  linesOf,
  optionsOf,
  orderItemsOf,
  rightWhyOf,
  verdictOf,
} from './learn-question';

/**
 * Where an answer stands: open (picking, or picking again after a wrong pick), sending (the call grades it), done (a
 * right pick, the place's extra choice, or the call's answer).
 */
export type LearnAnswerPhase = 'open' | 'sending' | 'done';

/** What the status slot shows: the last verdict, or the place's extra choice once it is the answer. */
export type LearnAnswerShown = { right: boolean; why: string | null; extra?: boolean; missed?: boolean };

/** One question's answer, from the first pick to the verdict. Pure: the card draws it, the hook moves it. */
export type LearnAnswerState = {
  phase: LearnAnswerPhase;
  picked: LearnPicked | null;
  /** The place's extra choice ("I don't know", "I don't remember") is picked. */
  extra: boolean;
  /** `put-in-order`: the row picked by its number or a click, which the arrow keys move. */
  selected: number | null;
  /** Options' indexes or lines' numbers a wrong pick showed to be wrong: crossed out, and no longer picked. */
  struck: number[];
  /** How many times the page graded a pick. */
  tries: number;
  /** The last verdict, until a new pick clears a wrong one; the last one for good once done. */
  shown: LearnAnswerShown | null;
  /** The question with its key: the question itself when keyed, or the one the call's answer brought. */
  key: LearnQuestion | null;
  /** The call failed: the pick stays, and the person can send it again. */
  failed: boolean;
};

export type LearnAnswerAction =
  | { type: 'pick'; at: number }
  | { type: 'extra' }
  | { type: 'myth'; answer: 'myth' | 'fact' }
  | { type: 'move'; from: number; to: number }
  | { type: 'step'; by: -1 | 1 }
  | { type: 'graded'; verdict: LearnVerdict }
  | { type: 'sending' }
  | { type: 'answered'; right: boolean; key: LearnQuestion | null; language: string | null }
  | { type: 'failed' };

/** An answer before anything is picked: `put-in-order` starts from its rows as given. */
export function answerStartOf(question: LearnQuestion): LearnAnswerState {
  return {
    phase: 'open',
    picked: question.type === 'PUT_IN_ORDER' ? orderItemsOf(question).map((item) => item.id) : null,
    extra: false,
    selected: null,
    struck: [],
    tries: 0,
    shown: null,
    key: isKeyed(question) ? question : null,
    failed: false,
  };
}

/** How many things the number keys can pick: options, lines of the code shown, or rows. */
export function pickCountOf(question: LearnQuestion, language: string | null): number {
  if (isChoice(question.type)) return optionsOf(question).length;
  if (question.type === 'PUT_IN_ORDER') return orderItemsOf(question).length;
  if (question.type === 'PICK_LINE') {
    const code = codeOf(question, language);
    return code ? linesOf(code.code).length : 0;
  }
  return 0;
}

/** Whether the main button may send what is picked: the extra choice, or a pick of the kind's shape. */
export function canSendOf(question: LearnQuestion, state: LearnAnswerState): boolean {
  if (state.phase !== 'open') return false;
  if (state.extra) return true;
  switch (question.type) {
    case 'PICK_ALL':
      return Array.isArray(state.picked) && state.picked.length > 0;
    case 'PUT_IN_ORDER':
      return Array.isArray(state.picked) && state.picked.length > 0;
    case 'MYTH_OR_FACT':
      return state.picked === 'myth' || state.picked === 'fact';
    default:
      return typeof state.picked === 'number';
  }
}

/** A new pick clears a wrong verdict and a failed call: the status goes back to what to do. */
const fresh = (state: LearnAnswerState): LearnAnswerState => ({
  ...state,
  shown: state.shown?.right ? state.shown : null,
  failed: false,
});

/** The answer after an action, for a question of this kind. Nothing moves once the answer is sending or done. */
export function answerReducerOf(question: LearnQuestion) {
  return (state: LearnAnswerState, action: LearnAnswerAction): LearnAnswerState => {
    switch (action.type) {
      case 'sending':
        return state.phase === 'open' ? { ...state, phase: 'sending', failed: false } : state;
      case 'failed':
        return state.phase === 'sending' ? { ...state, phase: 'open', failed: true } : state;
      case 'answered':
        return state.phase === 'sending' ? answeredOf(state, action) : state;
      case 'graded':
        return state.phase === 'open' ? gradedOf(question, state, action.verdict) : state;
    }
    if (state.phase !== 'open') return state;
    switch (action.type) {
      case 'extra':
        return fresh({
          ...state,
          extra: !state.extra,
          picked: state.extra || question.type === 'PUT_IN_ORDER' ? state.picked : null,
        });
      case 'myth':
        return question.type === 'MYTH_OR_FACT' ? fresh({ ...state, picked: action.answer, extra: false }) : state;
      case 'pick':
        return pickedOf(question, state, action.at);
      case 'move':
        return movedOf(state, action.from, action.to);
      case 'step':
        return state.selected === null ? state : movedOf(state, state.selected, state.selected + action.by);
    }
  };
}

function pickedOf(question: LearnQuestion, state: LearnAnswerState, at: number): LearnAnswerState {
  if (question.type === 'PUT_IN_ORDER') {
    if (!Array.isArray(state.picked) || at < 0 || at >= state.picked.length) return state;
    return { ...state, selected: state.selected === at ? null : at };
  }
  if (question.type === 'PICK_LINE') {
    const line = at + 1;
    if (state.struck.includes(line) || at < 0) return state;
    return fresh({ ...state, picked: line, extra: false });
  }
  if (!isChoice(question.type) || state.struck.includes(at) || at < 0 || at >= optionsOf(question).length) return state;
  if (question.type !== 'PICK_ALL') return fresh({ ...state, picked: at, extra: false });
  const picked = Array.isArray(state.picked) ? (state.picked as number[]) : [];
  const next = picked.includes(at) ? picked.filter((index) => index !== at) : [...picked, at].sort((a, b) => a - b);
  return fresh({ ...state, picked: next, extra: false });
}

function movedOf(state: LearnAnswerState, from: number, to: number): LearnAnswerState {
  if (!Array.isArray(state.picked)) return state;
  const ids = [...(state.picked as string[])];
  if (from < 0 || from >= ids.length || to < 0 || to >= ids.length || from === to) return state;
  const [id] = ids.splice(from, 1);
  ids.splice(to, 0, id);
  return fresh({ ...state, picked: ids, selected: state.selected === null ? null : to });
}

/**
 * The page's own verdict. Right, or any answer to a myth (one press answers, and two choices leave nothing to try
 * again): done. Wrong: the wrong options or line are crossed out and unpicked, and the person picks again.
 */
function gradedOf(question: LearnQuestion, state: LearnAnswerState, verdict: LearnVerdict): LearnAnswerState {
  const tries = state.tries + 1;
  if (verdict.right || question.type === 'MYTH_OR_FACT') {
    return { ...state, phase: 'done', tries, shown: { right: verdict.right, why: verdict.why }, failed: false };
  }
  const struck = [...new Set([...state.struck, ...verdict.wrong])].sort((a, b) => a - b);
  let picked = state.picked;
  if (question.type === 'PICK_ALL' && Array.isArray(picked)) {
    picked = (picked as number[]).filter((index) => !verdict.wrong.includes(index));
  } else if (question.type !== 'PUT_IN_ORDER') {
    picked = null;
  }
  const missed = question.type === 'PICK_ALL' && !verdict.wrong.length;
  return { ...state, tries, struck, picked, shown: { right: false, why: verdict.why, missed }, failed: false };
}

/**
 * The call's verdict, for a question that came without its key: one answer, right or wrong. The reason shown is why
 * the right answer is right, from the question with its key the call brought, if it brought one.
 */
function answeredOf(
  state: LearnAnswerState,
  { right, key, language }: Extract<LearnAnswerAction, { type: 'answered' }>,
): LearnAnswerState {
  const keyed = key && isKeyed(key) ? key : state.key;
  const own = keyed && !state.extra ? verdictOf(keyed, state.picked, language) : null;
  const why = (right ? own?.why : null) ?? (keyed ? rightWhyOf(keyed, language) : null);
  return {
    ...state,
    phase: 'done',
    tries: state.tries + 1,
    key: keyed,
    shown: { right, why, ...(state.extra ? { extra: true } : {}) },
    failed: false,
  };
}
