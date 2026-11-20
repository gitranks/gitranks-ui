import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { ALLOWED, crosses, crossingsOf, isChecked, moduleOf, problemsOf, zoneOf } from './check-workspace-imports.mjs';

describe('the workspace import rule', () => {
  it('names the folders, and leaves the site-wide modules free', () => {
    expect(zoneOf('lib/workspace/paths.ts')).toBe('lib/workspace');
    expect(zoneOf('components/workspace/pull-request/review-view.tsx')).toBe('components/workspace/pull-request');
    expect(zoneOf('app/contribute/components/landing.tsx')).toBe('app/contribute');
    expect(zoneOf('app/(workspace)/learn/page.tsx')).toBe('app/learn');
    expect(zoneOf('app/(onboarding)/contribute/start/page.tsx')).toBe('app/contribute');
    expect(zoneOf('app/(onboarding)/learn/start/page.tsx')).toBe('app/learn');
    expect(zoneOf('components/ui/button.tsx')).toBeNull();
    expect(zoneOf('lib/utils.ts')).toBeNull();
    expect(zoneOf('app/(pr-timeline)/contribute/pr/[owner]/route.ts')).toBeNull();
  });

  it('keeps the shared library to itself', () => {
    expect(crosses('lib/workspace/needs-you.ts', 'lib/workspace/paths')).toBe(false);
    expect(crosses('lib/workspace/needs-you.ts', 'lib/utils')).toBe(false);
    expect(crosses('lib/workspace/needs-you.ts', 'lib/learn/learn-path')).toBe(true);
    expect(crosses('lib/workspace/needs-you.ts', 'lib/contribute/set-format')).toBe(true);
    expect(crosses('lib/workspace/needs-you.ts', 'components/workspace/primitives')).toBe(true);
  });

  it('lets every folder use the light sign-in, which imports neither side', () => {
    expect(zoneOf('lib/auth/light-sign-in.ts')).toBe('lib/auth');
    expect(crosses('lib/contribute/maintainers.data.ts', 'lib/auth/light-sign-in')).toBe(false);
    expect(crosses('lib/learn/actions.ts', 'lib/auth/light-sign-in')).toBe(false);
    expect(crosses('lib/auth/light-sign-in.ts', 'lib/workspace/paths')).toBe(false);
    expect(crosses('lib/auth/light-sign-in.ts', 'lib/learn/learn-path')).toBe(true);
    expect(crosses('lib/auth/light-sign-in.ts', 'lib/contribute/profile-issues')).toBe(true);
  });

  it('keeps the two sides apart, both ways', () => {
    expect(crosses('lib/contribute/overview.ts', 'lib/workspace/format')).toBe(false);
    expect(crosses('lib/contribute/overview.ts', 'lib/learn/learn-path')).toBe(true);
    expect(crosses('lib/learn/learn-home.ts', 'lib/contribute/overview')).toBe(true);
    expect(crosses('components/contribute/mode-cards.tsx', 'components/workspace/primitives')).toBe(false);
    expect(crosses('components/contribute/mode-cards.tsx', 'lib/contribute/set-format')).toBe(false);
    expect(crosses('components/contribute/mode-cards.tsx', 'components/learn/lesson-block')).toBe(true);
    expect(crosses('components/learn/lesson-flow.tsx', 'lib/learn/actions')).toBe(false);
    expect(crosses('components/learn/lesson-flow.tsx', 'components/contribute/mode-cards')).toBe(true);
    expect(crosses('app/contribute/components/landing.tsx', 'lib/learn/learn-path')).toBe(true);
    expect(crosses('app/contribute/components/landing.tsx', 'components/workspace/primitives')).toBe(false);
    expect(crosses('app/learn/components/learn-home.tsx', 'app/contribute/components/landing')).toBe(true);
    expect(crosses('app/learn/components/learn-home.tsx', 'components/workspace/primitives')).toBe(false);
  });

  it('lets only the pull request folder of the shared components read Learn', () => {
    expect(crosses('components/workspace/pull-request/review-view.tsx', 'lib/learn/learn.types')).toBe(false);
    expect(crosses('components/workspace/agent/agent-connect.tsx', 'lib/learn/learn.types')).toBe(true);
    expect(crosses('components/workspace/pull-request/review-view.tsx', 'lib/contribute/overview')).toBe(true);
  });

  it('reads every kind of import line, from the file or from the root', () => {
    const source = `import 'server-only';
import { a } from './paths';
import type { B } from '@/lib/learn/learn.types';
import {
  c,
} from '../contribute/set-format';
export { d } from '@/lib/workspace/format';
const e = await import('@/lib/learn/learn-path');`;
    expect(crossingsOf('lib/workspace/x.ts', source)).toEqual([
      'lib/workspace/x.ts -> lib/learn/learn.types',
      'lib/workspace/x.ts -> lib/contribute/set-format',
      'lib/workspace/x.ts -> lib/learn/learn-path',
    ]);
    expect(moduleOf('lib/workspace/x.ts', 'react')).toBeNull();
    expect(moduleOf('lib/workspace/x.ts', './y.mjs')).toBe('lib/workspace/y');
  });

  it('checks the code, not its specs or fixtures', () => {
    expect(isChecked('lib/workspace/paths.ts')).toBe(true);
    expect(isChecked('lib/workspace/paths.spec.ts')).toBe(false);
    expect(isChecked('lib/contribute/__fixtures__/needs-you.ts')).toBe(false);
    expect(isChecked('components/ui/button.tsx')).toBe(false);
  });

  it('fails on a new crossing and on an allowed one that is gone', () => {
    expect(problemsOf(['a -> b'], ['a -> b'])).toEqual([]);
    expect(problemsOf(['a -> b', 'c -> d'], ['a -> b'])).toEqual(['not allowed: c -> d']);
    expect(problemsOf([], ['a -> b'])).toEqual(['no longer crosses, remove it from ALLOWED: a -> b']);
  });

  it('allows today only crossings that still exist', () => {
    const crossings = ALLOWED.map((entry) => entry.split(' -> ')[0]).flatMap((file) =>
      crossingsOf(file, readFileSync(file, 'utf8')),
    );
    expect(problemsOf(crossings).filter((problem) => problem.startsWith('no longer'))).toEqual([]);
  });
});
