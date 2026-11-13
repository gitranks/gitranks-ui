import type { LessonDiagramEdge, LessonDiagramNode } from './learn.types';

const node = (
  id: string,
  label: string,
  extra: Partial<Omit<LessonDiagramNode, 'id' | 'label'>> = {},
): LessonDiagramNode => ({ id, label, sub: null, tone: 'PLAIN', mono: false, ...extra });

/**
 * The landing's example: one step of a lesson on a made-up fix, and its question. Static, never read from the API, so
 * the front door shows the same lesson to everyone.
 */
export const EXAMPLE_LESSON = {
  subject: 'driftwood-js/driftwood · #871',
  parts: ['Before', 'Cause', 'The fix', 'How it connects', 'Deep dive'],
  /** The part the example step covers, marked among `parts`. */
  part: 'Cause',
  title: 'Two spellings of one route got two cache entries',
  diagram: {
    nodes: [
      node('a', '/docs/', { mono: true }),
      node('b', '/docs', { mono: true }),
      node('key', 'cache key = route.path', { sub: 'the raw text of the path', tone: 'ACCENT' }),
      node('one', '"/docs/"', { mono: true, sub: 'entry 1: layouts built' }),
      node('two', '"/docs"', { mono: true, sub: 'no entry: built again', tone: 'WARN' }),
    ],
    edges: [
      { from: 'a', to: 'key' },
      { from: 'b', to: 'key' },
      { from: 'key', to: 'one' },
      { from: 'key', to: 'two' },
    ] satisfies LessonDiagramEdge[],
    label: 'Two spellings of one route become two cache keys, so the second one misses and the layouts are built again',
  },
  question: {
    prompt: 'Why did the cache miss when you went from /docs/ to /docs?',
    options: [
      { id: 'emptied', text: 'The cache was emptied on every navigation', correct: false },
      { id: 'strings', text: 'The two paths are different strings, so they were different keys', correct: true },
    ],
  },
} as const;
