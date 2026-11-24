import { beforeEach, describe, expect, it, vi } from 'vitest';

import { bothPage, contributorPage, firstLessonPage, hiddenPageFix, longPage, SKILLS_NOW } from './__fixtures__/skills';
import { skillsMarkdownOf } from './skills-markdown';

// The site's address is read once, as the module loads: vitest runs this before the imports.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_URI = 'https://gitranks.com';
});

// The "Learn from it" view of a fix, built or not: each case below sets it.
const built = vi.hoisted(() => ({ fix: true }));
vi.mock('@/lib/learn/built-pages', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  get LEARN_FIXES_PAGE_BUILT() {
    return built.fix;
  },
}));

beforeEach(() => {
  built.fix = true;
});

describe("a Skills page's Markdown copy", () => {
  it('holds the numbers with their line, then each fix with its links, as the page shows them', () => {
    const text = skillsMarkdownOf(contributorPage, { learnOpen: true, now: SKILLS_NOW });
    expect(text).toMatch(/^# octocat’s skills\n\n/);
    expect(text).toContain('[octocat’s profile](https://gitranks.com/profile/octocat)');
    expect(text).toContain(
      '## In numbers\n\n- **5** fixes merged, in 5 projects\n- **41** days active, with work on a fix',
    );
    expect(text).toContain('- **Claude Code** AI agent used, also Codex');
    expect(text).toContain('With [GitRanks Contribute](https://gitranks.com/contribute) since June 2026');
    expect(text).toContain('## Fixes in real projects');
    expect(text).toContain(
      '- [The retry list grows without limit when a webhook keeps failing](https://gitranks.com/contribute/pr/harbor-kit/relay/58) · harbor-kit/relay · Go · merged 20 Nov · [Issue #431](https://github.com/harbor-kit/relay/issues/431) · [PR #58](https://github.com/harbor-kit/relay/pull/58)',
    );
    expect(text).toContain('open, in review');
    expect(text).not.toContain('## Courses');
    expect(text.endsWith('\n')).toBe(true);
  });

  it('names each fix’s product, its lesson and "How it was made" for someone who uses both, then the courses', () => {
    const text = skillsMarkdownOf(bothPage, { learnOpen: true, now: SKILLS_NOW });
    expect(text).toContain('Made with [GitRanks Contribute](https://gitranks.com/contribute) or [GitRanks Learn]');
    expect(text).toContain('· with Learn ·');
    expect(text).toContain(
      'Used [A queue: first in, first out](https://gitranks.com/learn/lessons/a-queue-first-in-first-out)',
    );
    expect(text).toContain('[How it was made](https://gitranks.com/contribute/pr/harbor-kit/relay/58)');
    expect(text).toContain('## Courses');
    expect(text).toContain('### [Algorithms and data structures](https://gitranks.com/learn/courses/algorithms)');
    expect(text).toContain('Topic course · 23 of 86 lessons learned · 6 practised · 1 mastered.');
    expect(text).toContain('- Big-O: all 8');
    expect(text).toContain('Not started: Linked lists, Trees, Graphs, Sorting and searching');
    expect(text).toContain('Topic course · All 62 lessons learned · 20 practised · Finished on 12 Nov.');
  });

  it('names a Learn fix in plain text while its "Learn from it" view is not built, "How it was made" kept', () => {
    built.fix = false;
    const text = skillsMarkdownOf(bothPage, { learnOpen: true, now: SKILLS_NOW });
    expect(text).not.toContain('/learn/fixes/');
    const learnRow = text.split('\n').find((line) => line.includes('· with Learn ·'));
    expect(learnRow?.startsWith('- [')).toBe(false);
    expect(learnRow).toContain('[How it was made](https://gitranks.com/contribute/pr/');
  });

  it('holds nothing of Learn while it is not open to everyone', () => {
    const text = skillsMarkdownOf(bothPage, { learnOpen: false, now: SKILLS_NOW });
    expect(text).not.toMatch(/Learn|lesson|## Courses/);
    expect(text).toContain('Made with [GitRanks Contribute]');
    expect(skillsMarkdownOf(firstLessonPage, { learnOpen: false, now: SKILLS_NOW })).not.toContain('## In numbers');
  });

  it('keeps a fix whose page was hidden with its GitHub links alone, and says how many more the page lists', () => {
    const text = skillsMarkdownOf(
      { ...longPage, fixes: { ...longPage.fixes, rows: [...longPage.fixes.rows, hiddenPageFix] } },
      { learnOpen: true, now: SKILLS_NOW },
    );
    const row = text.split('\n').find((line) => line.includes('quill-db/quill'));
    expect(row?.startsWith(`- ${hiddenPageFix.title} · quill-db/quill`)).toBe(true);
    expect(row).not.toContain('https://gitranks.com');
    expect(text).toContain('And 19 more on the page.');
  });
});
