import { describe, expect, it } from 'vitest';

import { HEAD, STEPS, VISUALS_STEP } from './__fixtures__/lesson';
import type { LessonBlock } from './learn.types';
import { copyPromptOf } from './lesson-format';

const promptOf = (blocks: LessonBlock[]) => copyPromptOf({ ...VISUALS_STEP, blocks }, null, HEAD);
const block = (type: LessonBlock['type']) => VISUALS_STEP.blocks.find((one) => one.type === type)!;

describe('"Copy for my agent"', () => {
  it('reads a diagram as its arrows, a labelled one with its label', () => {
    const flow = VISUALS_STEP.blocks.find((one) => one.type === 'DIAGRAM' && one.layout !== 'SEQUENCE')!;
    expect(promptOf([flow])).toContain(
      [
        'Diagram: The key is the path as typed, so the second spelling misses.',
        '  /docs → cache key (route.path)',
        '  cache key → no entry (cache.get)',
      ].join('\n'),
    );
    // An arrow with no label reads as before.
    expect(copyPromptOf(STEPS[0], null, HEAD)).toContain('  navigate() → resolveLayouts\n');
  });

  it('reads a call sequence as its calls, numbered as drawn, replies and the changed call said so', () => {
    const sequence = VISUALS_STEP.blocks.find((one) => one.layout === 'SEQUENCE')!;
    expect(promptOf([sequence])).toContain(
      [
        'Call sequence: One navigation to `/docs`: the lookup by the raw path misses, so every layout is built again.',
        '  1. Router → resolveLayouts: resolveLayouts(route)',
        '  2. resolveLayouts → layout cache: cache.get(route.path) [changed by the fix]',
        '  3. layout cache → resolveLayouts (reply): undefined: no entry',
        '  4. resolveLayouts → build: build(key)',
        '  5. build → resolveLayouts (reply): every layout, built again',
        '  6. resolveLayouts → Router (reply): layouts',
      ].join('\n'),
    );
  });

  it('reads a before-and-after as Before and After, each side as its own kind', () => {
    const [code, diagrams] = VISUALS_STEP.blocks.filter((one) => one.type === 'COMPARE');
    const codeText = promptOf([code]);
    expect(codeText).toContain(
      'Before and after the fix: The key line before and after the fix.\nBefore:\nCode (src/router/layout-cache.ts, lines 40–44):\n```\nexport function resolveLayouts',
    );
    expect(codeText).toContain('  const key = route.path\n');
    expect(codeText).toContain('After:\nCode (src/router/layout-cache.ts, lines 40–46):\n```');
    expect(codeText).toContain('  const key = normalizePath(route.path)\n');

    expect(promptOf([diagrams])).toContain(
      [
        'Before:',
        '  /docs/ → two entries',
        '  /docs → two entries',
        'After:',
        '  /docs/ → one entry (normalizePath)',
        '  /docs → one entry',
      ].join('\n'),
    );
  });

  it('reads a table as a Markdown table, the ringed row marked', () => {
    expect(promptOf([block('TABLE')])).toContain(
      [
        'Table: Each spelling of the page is its own key.',
        '| Path typed | Cache key | Layouts |',
        '| --- | --- | --- |',
        '| `/docs/` | `"/docs/"` | built, then cached |',
        '| → `/docs` | `"/docs"` | built again: no entry for this key |',
        '| `/docs/#intro` | `"/docs/"` | from the cache |',
        '(→ marks the case this step is about)',
      ].join('\n'),
    );
    const plain = promptOf([{ ...block('TABLE'), ring: null, rows: [['a|b', 'c', 'd']] }]);
    expect(plain).toContain('| a\\|b | c | d |');
    expect(plain).not.toContain('→');
  });

  it('leaves out a block type it does not know', () => {
    const unknown = { ...block('TABLE'), type: 'CHART' } as unknown as LessonBlock;
    expect(promptOf([unknown])).toBe(promptOf([]));
  });
});
