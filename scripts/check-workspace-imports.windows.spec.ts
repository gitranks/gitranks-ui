import { describe, expect, it, vi } from 'vitest';

// Windows' path functions on every machine: they join and normalize with `\`, so the rule must not use them for the
// modules it compares. `win32.posix` is still the `/` one.
vi.mock('node:path', async () => {
  const { win32 } = await vi.importActual<typeof import('node:path')>('node:path');
  return { ...win32, default: win32 };
});

const { crossingsOf, moduleOf, zoneOf } = await import('./check-workspace-imports.mjs');

describe('the workspace import rule, with Windows paths', () => {
  it('names a module with `/` and finds the crossing', () => {
    expect(moduleOf('lib/learn/x.tsx', '@/components/learn/share/cards')).toBe('components/learn/share/cards');
    expect(moduleOf('lib/learn/x.tsx', '../../components/learn/share/cards.tsx')).toBe('components/learn/share/cards');
    expect(crossingsOf('lib/learn/x.tsx', `import { Card } from '../../components/learn/share/cards';`)).toEqual([
      'lib/learn/x.tsx -> components/learn/share/cards',
    ]);
  });

  it("finds a shared page's crossing under the player's /my, and names its walkthrough as Learn's", () => {
    const approve = 'app/(player)/my/pull-requests/[owner]/[repo]/[issue]/approve/page.tsx';
    expect(
      crossingsOf(approve, `import { A } from '../../../../../../../../components/learn/question/answer-part';`),
    ).toEqual([`${approve} -> components/learn/question/answer-part`]);
    expect(
      crossingsOf(approve, `import { P } from '../../../../../../../../components/workspace/player/player-strip';`),
    ).toEqual([]);
    expect(zoneOf('app/(player)/my/pull-requests/[owner]/[repo]/[issue]/walkthrough/page.tsx')).toBe('app/learn');
  });
});
