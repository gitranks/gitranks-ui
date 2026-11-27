import { answerReducerOf, answerStartOf, type LearnAnswerAction, type LearnAnswerState } from '../learn-answer';
import type { LearnQuestion } from '../learn-question';

/** A lesson's own `pick-all`, keyed. */
export const pickAllQuestion: LearnQuestion = {
  id: 'q-hash-map-all',
  type: 'PICK_ALL',
  prompt: 'Which of these does a hash map do in constant time on average?',
  example: 'main',
  visual: null,
  codes: [],
  content: {
    options: [
      { text: 'Look up a value by its key', right: true, why: 'The key’s hash points straight at its bucket.' },
      {
        text: 'Find the smallest key',
        right: false,
        why: 'Keys are not kept in order: finding the smallest reads them all.',
      },
      { text: 'Add a new key', right: true, why: 'Adding hashes the key and writes to its bucket.' },
      { text: 'List the keys in sorted order', right: false, why: 'Sorting the keys takes `n log n`.' },
    ],
  },
};

/** A lesson's own `pick-one`, keyed. */
export const pickOneQuestion: LearnQuestion = {
  id: 'q-binary-search-one',
  type: 'PICK_ONE',
  prompt: 'What must be true of a list before binary search can be used on it?',
  example: 'main',
  visual: null,
  codes: [],
  content: {
    options: [
      {
        text: 'It has no repeated items',
        right: false,
        why: 'Repeated items are fine: the search still halves the list.',
      },
      {
        text: 'It is sorted',
        right: true,
        why: 'Each step throws away the half that cannot hold the item. That needs order.',
      },
      { text: 'It has an even length', right: false, why: 'The middle of an odd list is found the same way.' },
    ],
  },
};

const hasDuplicate = [
  'def has_duplicate(nums):',
  '    for i in range(len(nums)):',
  '        for j in range(i + 1, len(nums)):',
  '            if nums[i] == nums[j]:',
  '                return True',
  '    return False',
].join('\n');

/** A lesson's own `pick-line`, keyed: line 3 is the inner loop. */
export const pickLineQuestion: LearnQuestion = {
  id: 'q-big-o-line',
  type: 'PICK_LINE',
  prompt: 'Which line makes this slow for a big list?',
  example: 'nested',
  visual: null,
  codes: [{ language: 'python', code: `${hasDuplicate}\n` }],
  content: {
    why: 'The inner loop starts again for every item of the outer one: about n² / 2 comparisons.',
    whyNot: 'This line runs once for each item. On its own that grows in step with the list.',
    rightLine: { python: 3 },
  },
};

/** A lesson's own `predict-output`, keyed. */
export const outputQuestion: LearnQuestion = {
  id: 'q-stack-output',
  type: 'PREDICT_OUTPUT',
  prompt: 'What does this print?',
  example: 'stack',
  visual: null,
  codes: [
    { language: 'python', code: 'stack = []\nstack.append(1)\nstack.append(2)\nstack.append(3)\nprint(stack.pop())\n' },
  ],
  content: {
    options: [
      { text: '1', right: false, why: '`1` went in first, so it comes out last.' },
      { text: '3', right: true, why: 'A stack gives back the last item put in: `3`.' },
      { text: '[1, 2]', right: false, why: '`pop` returns the item it takes off, not what is left.' },
    ],
  },
};

/** A lesson's own `put-in-order`, keyed: its rows come in an order that is never the right one. */
export const orderQuestion: LearnQuestion = {
  id: 'q-binary-search-order',
  type: 'PUT_IN_ORDER',
  prompt: 'Put the steps of one round of binary search in order.',
  example: null,
  visual: null,
  codes: [],
  content: {
    items: [
      { id: 'r1', text: 'Keep the half that can hold the item' },
      { id: 'r2', text: 'Look at the middle item' },
      { id: 'r3', text: 'Compare it with the item you want' },
    ],
    order: ['r2', 'r3', 'r1'],
    why: 'Look at the middle, compare, then keep the half that can still hold the item.',
  },
};

/** A lesson's own `myth-or-fact`, keyed: a myth. */
export const mythQuestion: LearnQuestion = {
  id: 'q-index-myth',
  type: 'MYTH_OR_FACT',
  prompt: 'Adding an index to a table makes every query on that table faster.',
  example: 'main',
  visual: null,
  codes: [],
  content: {
    answer: 'myth',
    why: 'An index speeds up the reads that use it. Every insert and update must also update it, so writes get slower.',
  },
};

/** The check's `pick-one`: no key, with the code of its example, since the check has no lesson to show it in. */
export const checkQuestion: LearnQuestion = {
  id: 'q-stack-check',
  type: 'PICK_ONE',
  prompt: 'What does `stack.pop()` return here?',
  example: 'stack',
  visual: null,
  codes: [
    { language: 'python', code: 'stack = []\nstack.append(1)\nstack.append(2)\nstack.append(3)\nprint(stack.pop())\n' },
  ],
  content: {
    options: [
      { text: '`1`, the first one in.' },
      { text: '`3`, the last one in.' },
      { text: '`2`, the one in the middle.' },
    ],
  },
};

/** An answer after these actions, as the engine would move it. */
export function answerAfter(question: LearnQuestion, actions: LearnAnswerAction[]): LearnAnswerState {
  return actions.reduce(answerReducerOf(question), answerStartOf(question));
}
