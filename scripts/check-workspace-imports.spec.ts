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
    expect(zoneOf('app/(learn)/layout.tsx')).toBe('app/learn');
    expect(zoneOf('app/(learn)/learn/courses/page.tsx')).toBe('app/learn');
    expect(zoneOf('app/(player)/learn/review/page.tsx')).toBe('app/learn');
    expect(zoneOf('app/(public)/learn/about/page.tsx')).toBe('app/learn');
    expect(zoneOf('app/(public)/contribute/faq/page.tsx')).toBeNull();
    expect(zoneOf('components/ui/button.tsx')).toBeNull();
    expect(zoneOf('lib/utils.ts')).toBeNull();
    expect(zoneOf('app/(pr-timeline)/contribute/pr/[owner]/route.ts')).toBeNull();
  });

  it("names the shared pages under /my, Approve among them, and the fixer's walkthrough as Learn's", () => {
    expect(zoneOf('app/(workspace)/my/settings/page.tsx')).toBe('app/shared');
    expect(zoneOf('app/(workspace)/my/pull-requests/[owner]/[repo]/[issue]/(latest)/page.tsx')).toBe('app/shared');
    expect(zoneOf('app/(player)/my/layout.tsx')).toBe('app/shared');
    expect(zoneOf('app/(player)/my/pull-requests/[owner]/[repo]/[issue]/approve/page.tsx')).toBe('app/shared');
    expect(zoneOf('app/(player)/my/pull-requests/[owner]/[repo]/[issue]/walkthrough/page.tsx')).toBe('app/learn');
    expect(zoneOf('app/(player)/my/walkthrough/parts/answer.tsx')).toBe('app/learn');
    // A segment that only starts with the word is not the walkthrough.
    expect(zoneOf('app/(player)/my/walkthroughs/page.tsx')).toBe('app/shared');
    expect(zoneOf('app/(player)/learn/layout.tsx')).toBe('app/learn');
    expect(zoneOf('app/(player)/layout.tsx')).toBe('app/learn');
  });

  it('keeps both products out of a shared page, and lets it use the shared parts and the site-wide ones', () => {
    const approve = 'app/(player)/my/pull-requests/[owner]/[repo]/[issue]/approve/page.tsx';
    for (const own of [
      'lib/learn/learn.data',
      'components/learn/lesson-flow',
      'app/learn/components/lesson-view',
      'lib/contribute/set-format',
      'components/contribute/mode-switch',
      'app/contribute/components/pr-timeline-view',
    ]) {
      expect(crosses(approve, own)).toBe(true);
      expect(crosses('app/(workspace)/my/settings/page.tsx', own)).toBe(true);
    }
    for (const shared of [
      'components/workspace/player/player-strip',
      'components/workspace/player/use-player',
      'components/workspace/blocks/visual-block',
      'components/workspace/timeline-rail',
      'lib/workspace/player',
      'components/header/header',
      'components/ui/button',
    ]) {
      expect(crosses(approve, shared)).toBe(false);
    }
    // The walkthrough is Learn's: Learn's own code, never Contribute's.
    const walkthrough = 'app/(player)/my/pull-requests/[owner]/[repo]/[issue]/walkthrough/page.tsx';
    expect(crosses(walkthrough, 'components/learn/question/answer-part')).toBe(false);
    expect(crosses(walkthrough, 'components/contribute/mode-switch')).toBe(true);
  });

  it("lets both products use the player's frame, the block renderer and the timeline's rail from the shared folder", () => {
    for (const shared of [
      'components/workspace/player/player-strip',
      'components/workspace/blocks/visual-block',
      'components/workspace/timeline-rail',
    ]) {
      expect(crosses('components/learn/review/review-parts.tsx', shared)).toBe(false);
      expect(crosses('app/contribute/components/pr-timeline-view.tsx', shared)).toBe(false);
      expect(crosses('app/(learn)/learn/fixes/page.tsx', shared)).toBe(false);
    }
    for (const file of [
      'components/workspace/player/player-strip.tsx',
      'components/workspace/player/use-player.ts',
      'components/workspace/blocks/visual-block.tsx',
      'components/workspace/blocks/lesson-block.tsx',
      'components/workspace/blocks/rich-text.tsx',
      'components/workspace/timeline-rail.tsx',
      'lib/workspace/player.ts',
      'lib/workspace/blocks/learn-visual.ts',
    ]) {
      expect(crossingsOf(file, readFileSync(file, 'utf8'))).toEqual([]);
    }
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
    expect(crosses('components/contribute/mode-cards.tsx', 'components/learn/lesson-flow')).toBe(true);
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

  it('names a module with `/` on every platform, so a crossing is found on Windows too', () => {
    expect(moduleOf('lib/learn/x.tsx', '@/components/learn/share/cards')).toBe('components/learn/share/cards');
    expect(moduleOf('lib/learn/x.tsx', '../../components/learn/share/cards.tsx')).toBe('components/learn/share/cards');
    expect(crossingsOf('lib/learn/x.tsx', `import { Card } from '@/components/learn/share/cards';`)).toEqual([
      'lib/learn/x.tsx -> components/learn/share/cards',
    ]);
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
