import type { HighlightedCode } from '@/lib/workspace/code-tokens';
import type { LearnQuestion } from '@/lib/workspace/learn-question';

/*
 * The player's fixtures: code as the server highlights it (GitHub's light and dark themes), a review question with the
 * same example in three languages, and a visual of each kind in the courses' own format.
 */

/** `has_duplicate` with a set, in three languages, highlighted. */
export const hasDuplicateCodes: HighlightedCode[] = [
  {
    language: 'python',
    lines: [
      [
        { text: 'def', light: '#d73a49', dark: '#f97583' },
        { text: ' ' },
        { text: 'has_duplicate', light: '#6f42c1', dark: '#b392f0' },
        { text: '(nums):' },
      ],
      [
        { text: '    seen ' },
        { text: '=', light: '#d73a49', dark: '#f97583' },
        { text: ' ' },
        { text: 'set', light: '#005cc5', dark: '#79b8ff' },
        { text: '()' },
      ],
      [
        { text: '    ' },
        { text: 'for', light: '#d73a49', dark: '#f97583' },
        { text: ' n ' },
        { text: 'in', light: '#d73a49', dark: '#f97583' },
        { text: ' nums:' },
      ],
      [
        { text: '        ' },
        { text: 'if', light: '#d73a49', dark: '#f97583' },
        { text: ' n ' },
        { text: 'in', light: '#d73a49', dark: '#f97583' },
        { text: ' seen:' },
      ],
      [
        { text: '            ' },
        { text: 'return', light: '#d73a49', dark: '#f97583' },
        { text: ' ' },
        { text: 'True', light: '#005cc5', dark: '#79b8ff' },
      ],
      [{ text: '        seen.add(n)' }],
      [
        { text: '    ' },
        { text: 'return', light: '#d73a49', dark: '#f97583' },
        { text: ' ' },
        { text: 'False', light: '#005cc5', dark: '#79b8ff' },
      ],
    ],
  },
  {
    language: 'javascript',
    lines: [
      [
        { text: 'function', light: '#d73a49', dark: '#f97583' },
        { text: ' ' },
        { text: 'hasDuplicate', light: '#6f42c1', dark: '#b392f0' },
        { text: '(' },
        { text: 'nums', light: '#e36209', dark: '#ffab70' },
        { text: ') {' },
      ],
      [
        { text: '  ' },
        { text: 'const', light: '#d73a49', dark: '#f97583' },
        { text: ' ' },
        { text: 'seen', light: '#005cc5', dark: '#79b8ff' },
        { text: ' ' },
        { text: '=', light: '#d73a49', dark: '#f97583' },
        { text: ' ' },
        { text: 'new', light: '#d73a49', dark: '#f97583' },
        { text: ' ' },
        { text: 'Set', light: '#6f42c1', dark: '#b392f0' },
        { text: '();' },
      ],
      [
        { text: '  ' },
        { text: 'for', light: '#d73a49', dark: '#f97583' },
        { text: ' (' },
        { text: 'const', light: '#d73a49', dark: '#f97583' },
        { text: ' ' },
        { text: 'n', light: '#005cc5', dark: '#79b8ff' },
        { text: ' ' },
        { text: 'of', light: '#d73a49', dark: '#f97583' },
        { text: ' nums) {' },
      ],
      [
        { text: '    ' },
        { text: 'if', light: '#d73a49', dark: '#f97583' },
        { text: ' (seen.' },
        { text: 'has', light: '#6f42c1', dark: '#b392f0' },
        { text: '(n)) ' },
        { text: 'return', light: '#d73a49', dark: '#f97583' },
        { text: ' ' },
        { text: 'true', light: '#005cc5', dark: '#79b8ff' },
        { text: ';' },
      ],
      [{ text: '    seen.' }, { text: 'add', light: '#6f42c1', dark: '#b392f0' }, { text: '(n);' }],
      [{ text: '  }' }],
      [
        { text: '  ' },
        { text: 'return', light: '#d73a49', dark: '#f97583' },
        { text: ' ' },
        { text: 'false', light: '#005cc5', dark: '#79b8ff' },
        { text: ';' },
      ],
      [{ text: '}' }],
    ],
  },
  {
    language: 'go',
    lines: [
      [
        { text: 'func', light: '#d73a49', dark: '#f97583' },
        { text: ' ' },
        { text: 'hasDuplicate', light: '#6f42c1', dark: '#b392f0' },
        { text: '(' },
        { text: 'nums', light: '#e36209', dark: '#ffab70' },
        { text: ' []' },
        { text: 'int', light: '#d73a49', dark: '#f97583' },
        { text: ') ' },
        { text: 'bool', light: '#d73a49', dark: '#f97583' },
        { text: ' {' },
      ],
      [
        { text: '\tseen ' },
        { text: ':=', light: '#d73a49', dark: '#f97583' },
        { text: ' ' },
        { text: 'map', light: '#d73a49', dark: '#f97583' },
        { text: '[' },
        { text: 'int', light: '#d73a49', dark: '#f97583' },
        { text: ']' },
        { text: 'bool', light: '#d73a49', dark: '#f97583' },
        { text: '{}' },
      ],
      [
        { text: '\t' },
        { text: 'for', light: '#d73a49', dark: '#f97583' },
        { text: ' _, n ' },
        { text: ':=', light: '#d73a49', dark: '#f97583' },
        { text: ' ' },
        { text: 'range', light: '#d73a49', dark: '#f97583' },
        { text: ' nums {' },
      ],
      [{ text: '\t\t' }, { text: 'if', light: '#d73a49', dark: '#f97583' }, { text: ' seen[n] {' }],
      [
        { text: '\t\t\t' },
        { text: 'return', light: '#d73a49', dark: '#f97583' },
        { text: ' ' },
        { text: 'true', light: '#005cc5', dark: '#79b8ff' },
      ],
      [{ text: '\t\t}' }],
      [
        { text: '\t\tseen[n] ' },
        { text: '=', light: '#d73a49', dark: '#f97583' },
        { text: ' ' },
        { text: 'true', light: '#005cc5', dark: '#79b8ff' },
      ],
      [{ text: '\t}' }],
      [
        { text: '\t' },
        { text: 'return', light: '#d73a49', dark: '#f97583' },
        { text: ' ' },
        { text: 'false', light: '#005cc5', dark: '#79b8ff' },
      ],
      [{ text: '}' }],
    ],
  },
];

/** The nested-loop `has_duplicate` of the pick-line fixture, highlighted. */
export const nestedLoopCodes: HighlightedCode[] = [
  {
    language: 'python',
    lines: [
      [
        { text: 'def', light: '#d73a49', dark: '#f97583' },
        { text: ' ' },
        { text: 'has_duplicate', light: '#6f42c1', dark: '#b392f0' },
        { text: '(nums):' },
      ],
      [
        { text: '    ' },
        { text: 'for', light: '#d73a49', dark: '#f97583' },
        { text: ' i ' },
        { text: 'in', light: '#d73a49', dark: '#f97583' },
        { text: ' ' },
        { text: 'range', light: '#005cc5', dark: '#79b8ff' },
        { text: '(' },
        { text: 'len', light: '#005cc5', dark: '#79b8ff' },
        { text: '(nums)):' },
      ],
      [
        { text: '        ' },
        { text: 'for', light: '#d73a49', dark: '#f97583' },
        { text: ' j ' },
        { text: 'in', light: '#d73a49', dark: '#f97583' },
        { text: ' ' },
        { text: 'range', light: '#005cc5', dark: '#79b8ff' },
        { text: '(i ' },
        { text: '+', light: '#d73a49', dark: '#f97583' },
        { text: ' ' },
        { text: '1', light: '#005cc5', dark: '#79b8ff' },
        { text: ', ' },
        { text: 'len', light: '#005cc5', dark: '#79b8ff' },
        { text: '(nums)):' },
      ],
      [
        { text: '            ' },
        { text: 'if', light: '#d73a49', dark: '#f97583' },
        { text: ' nums[i] ' },
        { text: '==', light: '#d73a49', dark: '#f97583' },
        { text: ' nums[j]:' },
      ],
      [
        { text: '                ' },
        { text: 'return', light: '#d73a49', dark: '#f97583' },
        { text: ' ' },
        { text: 'True', light: '#005cc5', dark: '#79b8ff' },
      ],
      [
        { text: '    ' },
        { text: 'return', light: '#d73a49', dark: '#f97583' },
        { text: ' ' },
        { text: 'False', light: '#005cc5', dark: '#79b8ff' },
      ],
    ],
  },
];

/** A review's question, as the review gets it: no key, the example in each language of the course. */
export const reviewQuestion: LearnQuestion = {
  id: 'q-hash-set-review',
  type: 'PICK_ONE',
  prompt: 'Why does this code keep the numbers it has seen in a set?',
  example: 'main',
  visual: null,
  codes: [
    {
      language: 'python',
      code: 'def has_duplicate(nums):\n    seen = set()\n    for n in nums:\n        if n in seen:\n            return True\n        seen.add(n)\n    return False\n',
    },
    {
      language: 'javascript',
      code: 'function hasDuplicate(nums) {\n  const seen = new Set();\n  for (const n of nums) {\n    if (seen.has(n)) return true;\n    seen.add(n);\n  }\n  return false;\n}\n',
    },
    {
      language: 'go',
      code: 'func hasDuplicate(nums []int) bool {\n\tseen := map[int]bool{}\n\tfor _, n := range nums {\n\t\tif seen[n] {\n\t\t\treturn true\n\t\t}\n\t\tseen[n] = true\n\t}\n\treturn false\n}\n',
    },
  ],
  content: {
    options: [
      { text: 'A set answers “is it here?” in about the same time, however big it is' },
      { text: 'A set keeps the numbers in the order they came' },
      { text: 'A set uses less memory than a list' },
    ],
  },
};

/** The same question with its key, as the call brings it back after an answer. */
export const reviewQuestionKeyed: LearnQuestion = {
  ...reviewQuestion,
  content: {
    options: [
      {
        text: 'A set answers “is it here?” in about the same time, however big it is',
        right: true,
        why: 'A set finds a value by its hash, so each check costs about the same: the whole walk is one pass.',
      },
      {
        text: 'A set keeps the numbers in the order they came',
        right: false,
        why: 'A set keeps no order. The code only asks whether a number is there.',
      },
      {
        text: 'A set uses less memory than a list',
        right: false,
        why: 'A set uses more memory than a list of the same numbers: it trades memory for fast checks.',
      },
    ],
  },
};

/** A table visual: how the pairs grow, the row that matters ringed. */
export const tableVisual = {
  type: 'table',
  caption: 'Pairs a nested loop compares',
  columns: ['Items', 'Pairs compared'],
  rows: [
    ['10', '45'],
    ['1,000', '499,500'],
    ['100,000', 'about 5 billion'],
  ],
  ring: 2,
};

/** A diagram visual: a request and its reply. */
export const diagramVisual = {
  type: 'diagram',
  layout: 'sequence',
  caption: 'One lookup: the key’s hash points at one bucket',
  nodes: [
    { id: 'key', label: '"ada"', tone: 'plain', mono: true },
    { id: 'hash', label: 'hash("ada")', sub: '= 3', tone: 'accent', mono: true },
    { id: 'bucket', label: 'bucket 3', tone: 'plain' },
  ],
  edges: [
    { from: 'key', to: 'hash', label: 'hash it' },
    { from: 'hash', to: 'bucket', label: 'go straight there' },
  ],
};

/** A before-and-after of two diagrams. */
export const compareVisual = {
  type: 'compare',
  of: 'diagram',
  caption: 'A list is read from the start; a set goes straight to the bucket',
  before: {
    nodes: [
      { id: 'a', label: 'item 1', tone: 'plain' },
      { id: 'b', label: 'item 2', tone: 'plain' },
      { id: 'c', label: 'item n', tone: 'warn' },
    ],
    edges: [
      { from: 'a', to: 'b', label: 'no' },
      { from: 'b', to: 'c', label: 'no …' },
    ],
  },
  after: {
    nodes: [
      { id: 'k', label: 'hash(key)', tone: 'accent', mono: true },
      { id: 'b', label: 'its bucket', tone: 'plain' },
    ],
    edges: [{ from: 'k', to: 'b', label: 'one step' }],
  },
};
