import { describe, expect, it, vi } from 'vitest';

import { llmsTxtOf } from './llms-txt';

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_URI = 'https://example.test';
});

describe('llms.txt', () => {
  it('lists Contribute for agents once launched, and never before', () => {
    expect(llmsTxtOf({ contribute: true, packages: false })).toMatch(/^# GitRanks\n\n> .+\n\n## Contribute\n/);
    expect(llmsTxtOf({ contribute: true, packages: false })).toContain('/contribute/agents.md');
    expect(llmsTxtOf({ contribute: true, packages: false })).toContain('Claude Code, Codex, ChatGPT, Cursor');
    expect(llmsTxtOf({ contribute: false, packages: false })).not.toContain('/contribute');
  });

  it('lists the packages once their pages are open to everyone, and never before', () => {
    const open = llmsTxtOf({ contribute: false, packages: true });

    expect(open).toMatch(/\n## Rankings and badges\n[\s\S]+\n## Packages\n\n- \[npm package rankings\]\(/);
    expect(open).toContain('(https://example.test/packages/npm/downloads/1)');
    expect(open).toContain('- Package page: https://example.test/package/npm/{name} — who uses an npm package');
    expect(open).toContain('- Package facts in markdown: https://example.test/package/npm/{name}/facts.md — the same');
    expect(open).toContain('- Repository "Used by": https://example.test/repo/{owner}/{name}/used-by — the same');
    expect(open).toContain('- [How package rankings work](https://example.test/methodology/packages)');
    expect(open.endsWith('\n')).toBe(true);
    expect(llmsTxtOf({ contribute: true, packages: false })).not.toMatch(/package/i);
  });

  it('lists the Unsung heroes archive once it is open to everyone, and never before', () => {
    const line =
      '- [Unsung heroes](https://example.test/unsung-heroes): one open-source project a week that a lot of software runs on, and few people star\n';

    expect(llmsTxtOf({ contribute: true, packages: true })).toContain(line);
    expect(llmsTxtOf({ contribute: false, packages: true })).toContain(line);
    for (const contribute of [true, false]) {
      expect(llmsTxtOf({ contribute, packages: false })).not.toMatch(/unsung|hero/i);
    }
  });

  it('adds the packages after everything else, which stays as it was', () => {
    const closed = llmsTxtOf({ contribute: true, packages: false });

    expect(llmsTxtOf({ contribute: true, packages: true }).startsWith(closed)).toBe(true);
  });

  it('lists Learn and its recent public lessons once its front door is open, and never before', () => {
    const lesson = (n: number) => ({
      slug: `lesson-${n}-abcdef`,
      title: `Lesson [${n}]\nsecond line`,
      language: n === 1 ? 'Go' : null,
      repo: n === 1 ? 'o/n' : null,
      publishedAt: '2026-11-14T10:00:00.000Z',
      modifiedAt: '2026-11-14T10:00:00.000Z',
    });
    const open = llmsTxtOf({
      contribute: false,
      packages: false,
      learn: Array.from({ length: 25 }, (_, n) => lesson(n + 1)),
    });

    expect(open).toContain('\n## Learn\n\n- [GitRanks Learn](https://example.test/learn): ');
    expect(open).toContain('- [For maintainers](https://example.test/learn/maintainers)');
    expect(open).toContain(
      '- [Lesson 1 second line](https://example.test/learn/lessons/lesson-1-abcdef): a lesson on a fix in o/n (Go)\n',
    );
    expect(open).toContain(
      '- [Lesson 2 second line](https://example.test/learn/lessons/lesson-2-abcdef): a lesson on a fix\n',
    );
    expect(open.match(/\/learn\/lessons\//g)).toHaveLength(20);
    expect(llmsTxtOf({ contribute: false, packages: false, learn: [] })).toContain('## Learn');
    const odd = { ...lesson(1), title: 'A <https://x.test> `b` c\\', repo: 'o/<n>', language: 'Go`' };
    expect(llmsTxtOf({ contribute: false, packages: false, learn: [odd] })).toContain(
      '- [A https://x.test b c](https://example.test/learn/lessons/lesson-1-abcdef): a lesson on a fix in o/n (Go)\n',
    );
    expect(llmsTxtOf({ contribute: true, packages: true })).not.toMatch(/learn/i);
  });
});
