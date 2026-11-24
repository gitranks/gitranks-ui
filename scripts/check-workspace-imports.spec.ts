import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  ALLOWED,
  crosses,
  crossingsOf,
  isChecked,
  isServerActionSource,
  moduleOf,
  problemsOf,
  serverActionsUnder,
  zoneOf,
} from './check-workspace-imports.mjs';

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
    // My progress and a pull request's lesson are Learn's own pages under /my.
    expect(zoneOf('app/(workspace)/my/progress/page.tsx')).toBe('app/learn');
    expect(zoneOf('app/(workspace)/my/pull-requests/[owner]/[repo]/[issue]/(latest)/lesson/page.tsx')).toBe(
      'app/learn',
    );
    expect(zoneOf('app/(workspace)/my/pull-requests/[owner]/[repo]/[issue]/earlier/[id]/lesson/page.tsx')).toBe(
      'app/learn',
    );
    expect(zoneOf('app/(workspace)/my/lessons/page.tsx')).toBe('app/shared');
    expect(zoneOf('app/(workspace)/my/progress-old/page.tsx')).toBe('app/shared');
    expect(crosses('app/(workspace)/my/progress/page.tsx', 'components/learn/progress/progress-view')).toBe(false);
    expect(crosses('app/(workspace)/my/progress/page.tsx', 'components/contribute/mode-switch')).toBe(true);
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

  it("names Skills' three folders, shared by both products, and the Learn card's folder as Learn's", () => {
    expect(zoneOf('lib/skills/paths.ts')).toBe('lib/skills');
    expect(zoneOf('components/skills/numbers-box.tsx')).toBe('components/skills');
    expect(zoneOf('app/profile/[login]/skills/page.tsx')).toBe('app/skills');
    expect(zoneOf('app/profile/[login]/skills/card.png/route.ts')).toBe('app/skills');
    expect(zoneOf('app/profile/[login]/page.tsx')).toBeNull();
    expect(zoneOf('app/profile/[login]/skills-old/page.tsx')).toBeNull();
    expect(zoneOf('components/learn/entity/learn-entity-card.tsx')).toBe('components/learn');
    expect(isChecked('components/skills/numbers-box.tsx')).toBe(true);
    expect(isChecked('app/profile/[login]/skills/page.tsx')).toBe(true);
  });

  it("lets Skills read Learn's parts and the shared ones, never Contribute's own code or Learn's server actions", () => {
    const page = 'app/profile/[login]/skills/page.tsx';
    for (const file of ['lib/skills/skills-share-card.ts', 'components/skills/course-card.tsx', page]) {
      for (const own of [
        'lib/contribute/set-format',
        'lib/learn/actions',
        'lib/learn/check.actions',
        'lib/learn/lesson-page.actions',
      ]) {
        expect(crosses(file, own)).toBe(true);
      }
      for (const shared of ['lib/skills/paths', 'lib/learn/paths', 'lib/learn/learn.types', 'lib/workspace/format']) {
        expect(crosses(file, shared)).toBe(false);
      }
      expect(crosses(file, 'lib/utils')).toBe(false);
      expect(crosses(file, 'lib/auth/light-sign-in')).toBe(false);
    }
    const parts = 'components/skills/course-card.tsx';
    expect(crosses(parts, 'components/learn/course/squares')).toBe(false);
    expect(crosses(parts, 'components/workspace/primitives')).toBe(false);
    expect(crosses(parts, 'components/skills/numbers-box')).toBe(false);
    expect(crosses(parts, 'components/contribute/mode-cards')).toBe(true);
    expect(crosses(parts, 'app/learn/components/learn-home')).toBe(true);
    expect(crosses(parts, 'app/profile/[login]/components/overview-page')).toBe(false);
    // The library reads no component; the page may draw any part but Contribute's and Learn's pages.
    expect(crosses('lib/skills/skills-share-card.ts', 'components/skills/numbers-box')).toBe(true);
    expect(crosses('lib/skills/skills-share-card.ts', 'components/learn/course/squares')).toBe(true);
    expect(crosses(page, 'components/learn/course/squares')).toBe(false);
    expect(crosses(page, 'components/skills/numbers-box')).toBe(false);
    expect(crosses(page, 'components/contribute/mode-cards')).toBe(true);
    expect(crosses(page, 'app/contribute/components/landing')).toBe(true);
    expect(crosses(page, 'app/learn/components/learn-home')).toBe(true);
    expect(crosses(page, 'app/profile/[login]/components/overview-page')).toBe(false);
    expect(crossingsOf(page, `import { hide } from '../../../../lib/learn/settings.actions';`)).toEqual([
      `${page} -> lib/learn/settings.actions`,
    ]);
  });

  it("reads a server action module from its file: 'use server' among the directives it starts with", () => {
    expect(isServerActionSource("'use server';\n\nexport async function a() {}")).toBe(true);
    expect(isServerActionSource('﻿// Changes a set.\n/* two */\n"use server"\nexport async function a() {}')).toBe(true);
    expect(isServerActionSource("'use strict';\n'use server';\nexport async function a() {}")).toBe(true);
    expect(isServerActionSource("import 'server-only';\n'use server';")).toBe(false);
    expect(isServerActionSource("export const mark = 'use server';")).toBe(false);
    expect(isServerActionSource("'use client';\nexport function A() {}")).toBe(false);
    expect(isServerActionSource('')).toBe(false);
  });

  it('keeps every server action module off Skills, whatever its name or folder, as its file says', () => {
    const isServerAction = serverActionsUnder('.');
    expect(isServerAction('lib/workspace/issue-actions')).toBe(true);
    expect(isServerAction('lib/workspace/fair-use.actions')).toBe(true);
    expect(isServerAction('lib/workspace/actions')).toBe(true);
    expect(isServerAction('app/following/actions')).toBe(true);
    expect(isServerAction('lib/workspace/format')).toBe(false);
    expect(isServerAction('lib/workspace/no-such-module')).toBe(false);
    for (const file of ['lib/skills/x.ts', 'components/skills/x.tsx', 'app/profile/[login]/skills/page.tsx']) {
      for (const action of ['lib/workspace/issue-actions', 'lib/workspace/fair-use.actions', 'app/following/actions']) {
        expect(crosses(file, action, isServerAction)).toBe(true);
      }
      expect(crosses(file, 'lib/workspace/format', isServerAction)).toBe(false);
      // By its name, without reading the file.
      expect(crosses(file, 'lib/learn/settings.actions')).toBe(true);
    }
    expect(
      crossingsOf('lib/skills/x.ts', `import { hide } from '@/lib/workspace/issue-actions';`, isServerAction),
    ).toEqual(['lib/skills/x.ts -> lib/workspace/issue-actions']);
    // Other folders keep their own rule.
    expect(crosses('components/workspace/x.tsx', 'lib/workspace/issue-actions', isServerAction)).toBe(false);
    expect(crosses('app/following/page.tsx', 'app/following/actions', isServerAction)).toBe(false);
  });

  it("keeps each product's own folders off Skills, and the Learn card's folder off Contribute", () => {
    expect(crosses('lib/learn/course.data.ts', 'lib/skills/paths')).toBe(true);
    expect(crosses('lib/contribute/overview.ts', 'lib/skills/paths')).toBe(true);
    expect(crosses('components/contribute/mode-cards.tsx', 'components/skills/numbers-box')).toBe(true);
    expect(crosses('components/learn/entity/learn-entity-card.tsx', 'lib/learn/paths')).toBe(false);
    expect(crosses('components/learn/entity/learn-entity-card.tsx', 'components/learn/course/squares')).toBe(false);
    expect(crosses('components/learn/entity/learn-entity-card.tsx', 'lib/contribute/overview')).toBe(true);
    expect(crosses('components/learn/entity/learn-entity-card.tsx', 'components/skills/numbers-box')).toBe(true);
    expect(crosses('app/contribute/components/landing.tsx', 'components/learn/entity/learn-entity-card')).toBe(true);
    // Learn's own code still uses its server actions.
    expect(crosses('components/learn/lesson-flow.tsx', 'lib/learn/actions')).toBe(false);
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
