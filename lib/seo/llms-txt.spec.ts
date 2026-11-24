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

  it("lists Contribute's landing in Markdown with Contribute, and the Skills page's Markdown with the rankings", () => {
    expect(llmsTxtOf({ contribute: true })).toContain(
      '- [Contribute in Markdown](https://example.test/contribute.md): what Contribute is, its two ways and its steps\n',
    );
    const skills =
      "- A person's Skills page in Markdown: https://example.test/profile/<login>/skills.md: lessons learned and fixes merged through GitRanks, when the person shows the page\n";
    for (const contribute of [true, false]) {
      const text = llmsTxtOf({ contribute });
      expect(text.slice(text.indexOf('## Rankings and badges'), text.indexOf('## Packages'))).toContain(skills);
    }
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

  it('lists Learn, with its page for maintainers only when Contribute is listed, and no lesson of a fix', () => {
    const open = llmsTxtOf({ contribute: true });
    expect(open).toContain('\n## Learn\n\n- [GitRanks Learn](https://example.test/learn): ');
    expect(open).toContain('- [For maintainers](https://example.test/contribute/maintainers#learn)');
    expect(open).not.toContain('/learn/lessons/');
    expect(open).not.toContain('/learn/maintainers');
    const closed = llmsTxtOf({ contribute: false });
    expect(closed).toContain('## Learn');
    expect(closed).not.toContain('For maintainers');
  });

  it("lists Learn's landing, all courses and each course with its Markdown copy", () => {
    const open = llmsTxtOf({
      contribute: false,
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
  });

  it('lists pull request timelines: what one is, its addresses and its sitemap', () => {
    const text = llmsTxtOf({ contribute: true });
    expect(text).toContain('## Pull request timelines');
    expect(text).toContain('/contribute/pr/<owner>/<repo>/<number>/timeline.md');
    expect(text).toContain('/sitemaps/contribute-prs/sitemap.xml');
  });
});
