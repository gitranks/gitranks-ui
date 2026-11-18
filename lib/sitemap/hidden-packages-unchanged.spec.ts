import { createHash } from 'node:crypto';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET as llmsTxt } from '@/app/llms.txt/route';
import { GET as sitemapIndex } from '@/app/sitemap.xml/route';
import { fetchOrgSitemapParts } from '@/graphql/helpers/fetch-org-sitemap-parts';
import { fetchRepoSitemapParts } from '@/graphql/helpers/fetch-repo-sitemap-parts';
import { contributeOpen } from '@/lib/contribute/preview-gate';
import { packagesPublic } from '@/lib/packages/packages-gate';
import * as packageSitemapData from '@/lib/sitemap/package-sitemap-data';

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_URI = 'https://example.test';
});

vi.mock('next/server', () => ({ connection: vi.fn(async () => undefined) }));
vi.mock('@/graphql/helpers/fetch-repo-sitemap-parts', () => ({ fetchRepoSitemapParts: vi.fn() }));
vi.mock('@/graphql/helpers/fetch-org-sitemap-parts', () => ({ fetchOrgSitemapParts: vi.fn() }));
vi.mock('@/lib/contribute/preview-gate', () => ({ contributeOpen: vi.fn() }));
vi.mock('@/lib/packages/packages-gate', () => ({ packagesPublic: vi.fn() }));
vi.mock('@/lib/sitemap/package-sitemap-data', () => ({
  fetchPackageSitemapParts: vi.fn(),
  fetchPackagesForSitemap: vi.fn(),
  fetchRepoTabSitemapParts: vi.fn(),
  fetchRepoTabsForSitemap: vi.fn(),
}));

/**
 * The sitemap index and llms.txt, byte for byte and with their headers, as they were before package pages existed.
 * While package pages are not open to everyone (hidden, or shown to a preview list alone), both must answer exactly
 * this, and nothing about packages is read for them.
 */
const answerOf = async (response: Response) => {
  const body = await response.text();
  return {
    status: response.status,
    contentType: response.headers.get('Content-Type'),
    cacheControl: response.headers.get('Cache-Control'),
    // The body's exact bytes: an inline snapshot evens out indentation, the hash does not.
    sha256: createHash('sha256').update(body).digest('hex'),
    body,
  };
};

describe('while package pages are not open to everyone', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-11-18T12:34:56.000Z'), toFake: ['Date'] });
    vi.mocked(fetchRepoSitemapParts).mockReset().mockResolvedValue(2);
    vi.mocked(fetchOrgSitemapParts).mockReset().mockResolvedValue(1);
    vi.mocked(contributeOpen).mockReset().mockResolvedValue(true);
    vi.mocked(packagesPublic).mockReset().mockResolvedValue(false);
    for (const read of Object.values(packageSitemapData)) {
      vi.mocked(read).mockReset();
    }
  });

  afterEach(() => {
    expect(packagesPublic).toHaveBeenCalled();
    for (const read of Object.values(packageSitemapData)) {
      expect(read).not.toHaveBeenCalled();
    }
    vi.useRealTimers();
  });

  it('the sitemap index answers as before', async () => {
    expect(await answerOf(await sitemapIndex())).toMatchInlineSnapshot(`
      {
        "body": "<?xml version="1.0" encoding="UTF-8"?>
      <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <sitemap>
          <loc>https://example.test/sitemaps/static/sitemap.xml</loc>
          <lastmod>2026-11-01T00:00:00.000Z</lastmod>
        </sitemap>
        <sitemap>
          <loc>https://example.test/sitemaps/rankings/sitemap.xml</loc>
          <lastmod>2026-11-01T00:00:00.000Z</lastmod>
        </sitemap>
        <sitemap>
          <loc>https://example.test/sitemaps/countries/sitemap.xml</loc>
          <lastmod>2026-11-01T00:00:00.000Z</lastmod>
        </sitemap>
        <sitemap>
          <loc>https://example.test/sitemaps/languages/sitemap.xml</loc>
          <lastmod>2026-11-01T00:00:00.000Z</lastmod>
        </sitemap>
        <sitemap>
          <loc>https://example.test/sitemaps/profiles/sitemap.xml</loc>
          <lastmod>2026-11-01T00:00:00.000Z</lastmod>
        </sitemap>
        <sitemap>
          <loc>https://example.test/sitemaps/orgs/sitemap.xml</loc>
          <lastmod>2026-11-01T00:00:00.000Z</lastmod>
        </sitemap>
        <sitemap>
          <loc>https://example.test/sitemaps/insights/sitemap.xml</loc>
          <lastmod>2026-11-01T00:00:00.000Z</lastmod>
        </sitemap>
        <sitemap>
          <loc>https://example.test/sitemaps/repos/sitemap/0.xml</loc>
          <lastmod>2026-11-01T00:00:00.000Z</lastmod>
        </sitemap>
        <sitemap>
          <loc>https://example.test/sitemaps/repos/sitemap/1.xml</loc>
          <lastmod>2026-11-01T00:00:00.000Z</lastmod>
        </sitemap>
        <sitemap>
          <loc>https://example.test/sitemaps/orgs/pages/sitemap/0.xml</loc>
          <lastmod>2026-11-01T00:00:00.000Z</lastmod>
        </sitemap>
      </sitemapindex>
      ",
        "cacheControl": "public, max-age=3600, s-maxage=3600",
        "contentType": "application/xml; charset=utf-8",
        "sha256": "a30bd50a811941d37873f484cb4e348140a347ef407145b67d6a69e6ea9960cc",
        "status": 200,
      }
    `);
  });

  it('the sitemap index answers as before with no repository or organization part', async () => {
    vi.mocked(fetchRepoSitemapParts).mockResolvedValue(0);
    vi.mocked(fetchOrgSitemapParts).mockResolvedValue(0);

    expect(await answerOf(await sitemapIndex())).toMatchInlineSnapshot(`
      {
        "body": "<?xml version="1.0" encoding="UTF-8"?>
      <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <sitemap>
          <loc>https://example.test/sitemaps/static/sitemap.xml</loc>
          <lastmod>2026-11-01T00:00:00.000Z</lastmod>
        </sitemap>
        <sitemap>
          <loc>https://example.test/sitemaps/rankings/sitemap.xml</loc>
          <lastmod>2026-11-01T00:00:00.000Z</lastmod>
        </sitemap>
        <sitemap>
          <loc>https://example.test/sitemaps/countries/sitemap.xml</loc>
          <lastmod>2026-11-01T00:00:00.000Z</lastmod>
        </sitemap>
        <sitemap>
          <loc>https://example.test/sitemaps/languages/sitemap.xml</loc>
          <lastmod>2026-11-01T00:00:00.000Z</lastmod>
        </sitemap>
        <sitemap>
          <loc>https://example.test/sitemaps/profiles/sitemap.xml</loc>
          <lastmod>2026-11-01T00:00:00.000Z</lastmod>
        </sitemap>
        <sitemap>
          <loc>https://example.test/sitemaps/orgs/sitemap.xml</loc>
          <lastmod>2026-11-01T00:00:00.000Z</lastmod>
        </sitemap>
        <sitemap>
          <loc>https://example.test/sitemaps/insights/sitemap.xml</loc>
          <lastmod>2026-11-01T00:00:00.000Z</lastmod>
        </sitemap>
      </sitemapindex>
      ",
        "cacheControl": "public, max-age=3600, s-maxage=3600",
        "contentType": "application/xml; charset=utf-8",
        "sha256": "ef8fee3f43bb523f5c53be89fb14b59df16312b4b4b59d328d269bd0ba577054",
        "status": 200,
      }
    `);
  });

  it('llms.txt answers as before, with Contribute launched', async () => {
    expect(await answerOf(await llmsTxt())).toMatchInlineSnapshot(`
      {
        "body": "# GitRanks

      > GitHub rankings, analytics and README badges for developers, repositories and organizations.

      ## Contribute

      - [For AI agents](https://example.test/contribute/agents.md): open-source issues ready to work on, for your agent over MCP; your person approves every pull request
      - [MCP server docs](https://example.test/contribute/mcp): sign in with GitHub from Claude Code, Codex, ChatGPT, Cursor, Gemini CLI, Antigravity, VS Code, claude.ai, Kiro and more, or use a token
      - [Questions](https://example.test/contribute/faq)

      ## Rankings and badges

      - [Home](https://example.test/): GitHub developers ranked by stars, followers and contributions
      - [Organizations](https://example.test/orgs)
      - [README badges](https://example.test/badge): badges for profiles, organizations and repositories
      - [Badge gallery](https://example.test/badge/gallery)
      - [How ranking works](https://example.test/methodology)
      ",
        "cacheControl": "public, max-age=300, s-maxage=300",
        "contentType": "text/plain; charset=utf-8",
        "sha256": "910d1c6be76fa9b261f8fbb952ea28ccf8cb2d985cb38b0b74203e0521666002",
        "status": 200,
      }
    `);
  });

  it('llms.txt answers as before, before Contribute is launched', async () => {
    vi.mocked(contributeOpen).mockResolvedValue(false);

    expect(await answerOf(await llmsTxt())).toMatchInlineSnapshot(`
      {
        "body": "# GitRanks

      > GitHub rankings, analytics and README badges for developers, repositories and organizations.

      ## Rankings and badges

      - [Home](https://example.test/): GitHub developers ranked by stars, followers and contributions
      - [Organizations](https://example.test/orgs)
      - [README badges](https://example.test/badge): badges for profiles, organizations and repositories
      - [Badge gallery](https://example.test/badge/gallery)
      - [How ranking works](https://example.test/methodology)
      ",
        "cacheControl": "public, max-age=300, s-maxage=300",
        "contentType": "text/plain; charset=utf-8",
        "sha256": "ae54837998992cfcc5830ebc1d68d72e2e7bc7ff1ed9222814ec68ad10d4aeba",
        "status": 200,
      }
    `);
  });
});
