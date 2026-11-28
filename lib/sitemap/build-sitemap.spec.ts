import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildSitemapEntries } from './build-sitemap';
import { mcpServerBase, mcpServerProject, mcpServerSdkPart } from '@/lib/build/__fixtures__/project';

const pathsOf = (entries: ReturnType<typeof buildSitemapEntries>) =>
  entries.map((entry) => [entry.url.replace('https://example.test', ''), entry.priority]);

describe('the Build sitemap', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_URI', 'https://example.test');
  });

  it("lists Home, Projects and How Build works, then each project and its base's steps, no part step", () => {
    const urls = pathsOf(
      buildSitemapEntries([
        { slug: mcpServerProject.slug, base: mcpServerProject.base },
        { slug: 'web-server', base: null },
      ]),
    );
    expect(urls.slice(0, 4)).toEqual([
      ['/build', 0.7],
      ['/build/projects', 0.7],
      ['/build/mcp-server', 0.7],
      [`/build/mcp-server/${mcpServerBase[0].slug}`, 0.6],
    ]);
    expect(urls).toHaveLength(2 + 1 + mcpServerBase.length + 1);
    expect(urls.at(-1)).toEqual(['/build/web-server', 0.7]);
    for (const step of mcpServerSdkPart.steps) expect(urls).not.toContainEqual([`/build/mcp-server/${step.slug}`, 0.6]);
    const all = urls.map(([url]) => String(url));
    expect(all.some((url) => /\/(mine|start|test)(\/|$)/.test(url))).toBe(false);
  });

  it('lists the two pages with no project, and leaves out a slug no project can have, or one twice', () => {
    expect(pathsOf(buildSitemapEntries([]))).toHaveLength(2);
    const urls = pathsOf(
      buildSitemapEntries([
        { slug: 'mine', base: [] },
        { slug: 'Bad Slug', base: [] },
        { slug: 'web-server', base: [{ slug: 'test' }, { slug: 'a-socket' }] },
        { slug: 'web-server', base: [] },
      ]),
    );
    expect(urls.slice(2)).toEqual([
      ['/build/web-server', 0.7],
      ['/build/web-server/a-socket', 0.6],
    ]);
  });
});
