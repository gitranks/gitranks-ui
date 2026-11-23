import { describe, expect, it, vi } from 'vitest';

import { llmsTxtOf } from './llms-txt';

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_URI = 'https://example.test';
});

describe('llms.txt', () => {
  it('lists Contribute for agents once launched, and never before', () => {
    expect(llmsTxtOf({ contribute: true })).toMatch(/^# GitRanks\n\n> .+\n\n## Contribute\n/);
    expect(llmsTxtOf({ contribute: true })).toContain('/contribute/agents.md');
    expect(llmsTxtOf({ contribute: true })).toContain('Claude Code, Codex, ChatGPT, Cursor');
    expect(llmsTxtOf({ contribute: false })).not.toContain('/contribute');
  });

  it('lists the packages after the rankings', () => {
    const open = llmsTxtOf({ contribute: false });

    expect(open).toMatch(/\n## Rankings and badges\n[\s\S]+\n## Packages\n\n- \[npm package rankings\]\(/);
    expect(open).toContain('(https://example.test/packages/npm/downloads/1)');
    expect(open).toContain('- Package page: https://example.test/package/npm/{name} — who uses an npm package');
    expect(open).toContain('- Package facts in markdown: https://example.test/package/npm/{name}/facts.md — the same');
    expect(open).toContain('- Repository "Used by": https://example.test/repo/{owner}/{name}/used-by — the same');
    expect(open).toContain('- [How package rankings work](https://example.test/methodology/packages)');
    expect(open.endsWith('\n')).toBe(true);
  });

  it('lists the Unsung heroes archive', () => {
    const line =
      '- [Unsung heroes](https://example.test/unsung-heroes): one open-source project a week that a lot of software runs on, and few people star\n';

    expect(llmsTxtOf({ contribute: true })).toContain(line);
    expect(llmsTxtOf({ contribute: false })).toContain(line);
  });

  it('writes the packages section word for word', () => {
    const text = llmsTxtOf({ contribute: false });

    expect(text.slice(text.indexOf('## Packages'))).toMatchInlineSnapshot(`
      "## Packages

      - [npm package rankings](https://example.test/packages/npm/downloads/1): npm packages ranked by weekly downloads, by the stars of the repositories that use them, and by how many do. Beta.
      - Package page: https://example.test/package/npm/{name} — who uses an npm package: every repository with 100+ stars that depends on it directly, with downloads and ranks.
      - Package facts in markdown: https://example.test/package/npm/{name}/facts.md — the same as the package page, for agents: dependents, downloads and ranks, each with its link.
      - [PyPI package rankings](https://example.test/packages/pypi/downloads/1): PyPI packages ranked by monthly downloads, by the stars of the repositories that use them, and by how many do. Beta.
      - Package page: https://example.test/package/pypi/{name} ({name} in lower case, with each run of \`-\`, \`_\` and \`.\` as one \`-\`) — who uses a PyPI package: every repository with 100+ stars that depends on it directly, with downloads and ranks.
      - Package facts in markdown: https://example.test/package/pypi/{name}/facts.md — the same as the package page, for agents: dependents, downloads and ranks, each with its link.
      - [Go package rankings](https://example.test/packages/go/dependents-stars/1): Go packages ranked by the stars of the repositories that use them, and by how many do. Beta. Go publishes no download counts.
      - Package page: https://example.test/package/go/{modulePath} — who uses a Go package: every repository with 100+ stars that depends on it directly, with ranks.
      - Package facts in markdown: https://example.test/package/go/{modulePath}/facts.md — the same as the package page, for agents: dependents and ranks, each with its link.
      - [crates.io package rankings](https://example.test/packages/crates/downloads/1): crates.io packages ranked by weekly downloads, by the stars of the repositories that use them, and by how many do. Beta.
      - Package page: https://example.test/package/crates/{name} ({name} in lower case, with \`_\` for each \`-\`) — who uses a crates.io package: every repository with 100+ stars that depends on it directly, with downloads and ranks.
      - Package facts in markdown: https://example.test/package/crates/{name}/facts.md — the same as the package page, for agents: dependents, downloads and ranks, each with its link.
      - [pub.dev package rankings](https://example.test/packages/pub/dependents-stars/1): pub.dev packages ranked by the stars of the repositories that use them, and by how many do. Beta.
      - Package page: https://example.test/package/pub/{name} — who uses a pub.dev package: every repository with 100+ stars that depends on it directly, with ranks.
      - Package facts in markdown: https://example.test/package/pub/{name}/facts.md — the same as the package page, for agents: dependents and ranks, each with its link.
      - [Packagist package rankings](https://example.test/packages/packagist/downloads/1): Packagist packages ranked by monthly downloads, by the stars of the repositories that use them, and by how many do. Beta.
      - Package page: https://example.test/package/packagist/{vendor}/{package} ({vendor}/{package} in lower case) — who uses a Packagist package: every repository with 100+ stars that depends on it directly, with downloads and ranks.
      - Package facts in markdown: https://example.test/package/packagist/{vendor}/{package}/facts.md — the same as the package page, for agents: dependents, downloads and ranks, each with its link.
      - [Maven Central package rankings](https://example.test/packages/maven/dependents-stars/1): Maven Central packages ranked by the stars of the repositories that use them, and by how many do. Beta. Maven Central publishes no download counts.
      - Package page: https://example.test/package/maven/{groupId}/{artifactId} — who uses a Maven Central package: every repository with 100+ stars that depends on it directly, with ranks.
      - Package facts in markdown: https://example.test/package/maven/{groupId}/{artifactId}/facts.md — the same as the package page, for agents: dependents and ranks, each with its link.
      - [NuGet package rankings](https://example.test/packages/nuget/dependents-stars/1): NuGet packages ranked by the stars of the repositories that use them, and by how many do. Beta.
      - Package page: https://example.test/package/nuget/{name} ({name} in lower case) — who uses a NuGet package: every repository with 100+ stars that depends on it directly, with ranks.
      - Package facts in markdown: https://example.test/package/nuget/{name}/facts.md — the same as the package page, for agents: dependents and ranks, each with its link.
      - [RubyGems package rankings](https://example.test/packages/rubygems/dependents-stars/1): RubyGems packages ranked by the stars of the repositories that use them, and by how many do. Beta.
      - Package page: https://example.test/package/rubygems/{name} — who uses a RubyGems package: every repository with 100+ stars that depends on it directly, with ranks.
      - Package facts in markdown: https://example.test/package/rubygems/{name}/facts.md — the same as the package page, for agents: dependents and ranks, each with its link.
      - Repository "Used by": https://example.test/repo/{owner}/{name}/used-by — the same for every package a repository publishes.
      - [How package rankings work](https://example.test/methodology/packages)
      - [Unsung heroes](https://example.test/unsung-heroes): one open-source project a week that a lot of software runs on, and few people star
      "
    `);
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
    expect(llmsTxtOf({ contribute: false, learn: [] })).toContain('## Learn');
    const odd = { ...lesson(1), title: 'A <https://x.test> `b` c\\', repo: 'o/<n>', language: 'Go`' };
    expect(llmsTxtOf({ contribute: false, learn: [odd] })).toContain(
      '- [A https://x.test b c](https://example.test/learn/lessons/lesson-1-abcdef): a lesson on a fix in o/n (Go)\n',
    );
    expect(llmsTxtOf({ contribute: true })).not.toMatch(/learn/i);
  });

  it("lists Learn's landing, all courses and each course with its Markdown copy while Learn is open", () => {
    const open = llmsTxtOf({
      contribute: false,
      learn: [],
      learnCourses: [
        { slug: 'algorithms', name: 'Algorithms\nand data structures', covers: 'Sets, maps and  sorting.' },
        { slug: 'go', name: 'Go', covers: '' },
      ],
    });
    expect(open).toContain(
      '- [GitRanks Learn](https://example.test/learn): short programming lessons, each one idea with an example and one question, then real open-source issues to use them on ([Markdown](https://example.test/learn.md))\n',
    );
    expect(open).toContain(
      '- [All courses](https://example.test/learn/courses) ([Markdown](https://example.test/learn/courses.md))\n',
    );
    expect(open).toContain(
      '- [Algorithms and data structures](https://example.test/learn/courses/algorithms.md): Sets, maps and sorting.\n',
    );
    expect(open).toContain('- [Go](https://example.test/learn/courses/go.md): a course of GitRanks Learn\n');
    expect(llmsTxtOf({ contribute: false, learnCourses: [{ slug: 'go', name: 'Go', covers: '' }] })).not.toMatch(
      /learn/i,
    );
  });

  it('lists pull request timelines: what one is, its addresses and its sitemap', () => {
    const text = llmsTxtOf({ contribute: true });
    expect(text).toContain('## Pull request timelines');
    expect(text).toContain('/contribute/pr/<owner>/<repo>/<number>/timeline.md');
    expect(text).toContain('/sitemaps/contribute-prs/sitemap.xml');
  });
});
