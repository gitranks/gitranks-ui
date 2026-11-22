import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiArchive, apiHeroOf } from './__fixtures__/archive';
import { ARCHIVE_PICK_NOTE, ARCHIVE_UNAVAILABLE, type Archive, archiveOf, heroAnchorOf } from './archive';

const { graphqlDirect } = vi.hoisted(() => ({ graphqlDirect: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
vi.mock('@/components/header/header', () => ({ Header: () => null }));

const { UnsungHeroesScreen } = await import('./components/unsung-heroes-screen');
const { fetchUnsungHeroes } = await import('./archive-read');
const { archiveJsonLdOf, archiveMetadataOf } = await import('./seo');
const { drawArchiveCard } = await import('./archive-card');
const { cacheLife, cacheTag } = await import('next/cache');

const text = (html: string) =>
  html
    .replace(/<!-- -->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .trim();

/** Each figure of a `dl`, its number then what it counts, as drawn. */
const figures = (html: string) =>
  [...html.matchAll(/<dt[^>]*>(.*?)<\/dt><dd[^>]*>(.*?)<\/dd>/g)].map(([, label, value]) => `${value} ${label}`);

const archive = archiveOf(apiArchive);
const render = (value: Archive | typeof ARCHIVE_UNAVAILABLE) =>
  renderToStaticMarkup(<UnsungHeroesScreen archive={value} />);

beforeEach(() => {
  graphqlDirect.mockReset();
  vi.mocked(cacheLife).mockClear();
  vi.mocked(cacheTag).mockClear();
});

describe('/unsung-heroes', () => {
  it('the lead, the four totals and the sentence that says them', () => {
    const words = text(render(archive));
    expect(words).toContain(
      'Open source, ranked. Unsung heroes One open-source project a week that a lot of software runs on, and few ' +
        'people star. Our way to back lesser-known maintainers.',
    );
    expect(figures(render(archive)).slice(0, 4)).toEqual([
      '5 heroes so far',
      '+788 stars while featured',
      '190.9M downloads a week, all of them',
      '0 paid to be here',
    ]);
    expect(words).toContain(
      "This week's Unsung hero is ada-fixture/line-trim-fixture, downloaded 98.8 million times a week with 942 stars. " +
        '5 projects have been featured since October 2026.',
    );
  });

  it("says a registry's own period, or the repositories using it where a registry counts no downloads", () => {
    const monthly = archiveOf({
      ...apiArchive,
      live: apiHeroOf({
        package: { registry: 'PYPI', name: 'line-trim-fixture' },
        facts: { weeklyDownloads: 1_034_000, downloads: 4_480_000, downloadsPer: 'MONTH', contributors: 16 },
      }),
    });
    expect(text(render(monthly))).toContain(
      "This week's Unsung hero is ada-fixture/line-trim-fixture, downloaded 4.5 million times a month with 942 stars.",
    );
    expect(figures(render(monthly)).slice(4, 5)).toEqual(['4.5M downloads a month']);

    const go = archiveOf({
      ...apiArchive,
      live: apiHeroOf({
        package: { registry: 'GO', name: 'example.com/line-trim' },
        facts: { weeklyDownloads: 0, downloads: null, downloadsPer: null, dependents: 45, contributors: 16 },
      }),
    });
    expect(text(render(go))).toContain(
      "This week's Unsung hero is ada-fixture/line-trim-fixture, used by 45 GitHub repositories with 100+ stars with 942 stars.",
    );
    expect(figures(render(go)).slice(4, 5)).toEqual(['45 repositories with 100+ stars use it']);
  });

  it('This week: the dates, the maintainer and age, the text, two links and four figures', () => {
    const html = render(archive);
    const words = text(html);
    expect(words).toContain('This week Nov 16 – 22 · live');
    expect(words).toContain('ada-fixture/line-trim-fixture Ada Fixture · since January 2019');
    expect(words).toContain(apiHeroOf().text);
    expect(figures(html).slice(4)).toEqual([
      '98.8M downloads a week',
      '942 stars when featured',
      '+48 stars since Monday',
      '16 contributors',
    ]);
    expect(html).toMatch(
      /<a [^>]*href="https:\/\/github\.com\/ada-fixture\/line-trim-fixture"[^>]*target="_blank"[^>]*>.*?Star on GitHub<\/a>/,
    );
    expect(html).toMatch(/<a [^>]*href="\/contribute"[^>]*>.*?Find an issue to fix<\/a>/);
    expect(html).toContain('href="/repo/ada-fixture/line-trim-fixture"');
  });

  it('three figures when its contributors are not known', () => {
    const html = render(
      archiveOf({ ...apiArchive, live: apiHeroOf({ facts: { weeklyDownloads: 1, contributors: null } }) }),
    );
    expect(text(html)).not.toContain('contributors');
  });

  it('past heroes newest first, each with its own id for the recap email’s link', () => {
    const html = render(archive);
    const words = text(html);
    expect(words).toContain(
      'Past heroes Newest first Nov 9 – 15 harbor-fixture/path-norm-fixture Normalizes file paths across platforms ' +
        '41.2M downloads a week · 612 stars when featured +318 stars that week now 993',
    );
    const ids = [...html.matchAll(/<li id="([^"]+)"/g)].map(([, id]) => id);
    expect(ids).toEqual([
      'harbor-fixture-path-norm-fixture',
      'lumen-fixture-csv-chunk-fixture',
      'tarn-fixture-tz-lite-fixture',
      'pebble-fixture-glob-quote-fixture',
    ]);
    expect(html).toContain('id="ada-fixture-line-trim-fixture"');
    expect(heroAnchorOf('Some.Owner/some.repo')).toBe('Some.Owner-some.repo');
  });

  it("How we pick says the archive's sentence byte for byte", () => {
    expect(ARCHIVE_PICK_NOTE).toBe(
      'We pick from what 100+ star projects depend on, then a person makes the call. Nobody pays to be here, and ' +
        'nobody gets anything for starring. Star a project only if you use it.',
    );
    expect(render(archive)).toContain(`>${ARCHIVE_PICK_NOTE}<`);
    expect(text(render(archive))).toContain(
      'How we pick Heavily used Repositories with 100+ stars depend on it directly, and it is among the most used ' +
        'packages of its registry. Few stars for its reach Lots of use per star, from a personal account without a big ' +
        'following. Maintainer first We tell the maintainer 4 days ahead. One click opts them out, no questions asked.',
    );
  });

  it('a week with no hero: no This week, and the sentence says the past only', () => {
    const words = text(render(archiveOf({ ...apiArchive, live: null })));
    expect(words).not.toContain('This week');
    expect(words).toContain('5 projects have been featured since October 2026.');
    expect(words).not.toContain("This week's Unsung hero");
  });

  it('no hero yet: no totals, and a line that says so', () => {
    const words = text(
      render({ live: null, past: [], totals: { heroes: 0, starsGained: 0, weeklyDownloads: 0, since: null } }),
    );
    expect(words).toContain('The first Unsung hero is on its way.');
    expect(words).not.toContain('heroes so far');
    expect(words).toContain('How we pick');
  });

  it('while it cannot be read: says so, and shows no hero', () => {
    const words = text(render(ARCHIVE_UNAVAILABLE));
    expect(words).toContain('Unsung heroes are not available right now. Try again in a few minutes.');
    expect(words).not.toContain('heroes so far');
  });
});

describe('the archive read', () => {
  it('is one cached read under the tag unsung-hero, asked as the site', async () => {
    graphqlDirect.mockResolvedValue({ unsungHeroes: apiArchive });
    expect(await fetchUnsungHeroes()).toEqual(archive);
    expect(cacheTag).toHaveBeenCalledWith('unsung-hero');
    expect(graphqlDirect.mock.calls[0]).toHaveLength(1);
  });

  it('unavailable for minutes when it fails or the API answers nothing', async () => {
    graphqlDirect.mockRejectedValue(new Error('down'));
    expect(await fetchUnsungHeroes()).toBe(ARCHIVE_UNAVAILABLE);
    graphqlDirect.mockResolvedValue({ unsungHeroes: null });
    expect(await fetchUnsungHeroes()).toBe(ARCHIVE_UNAVAILABLE);
    expect(cacheLife).toHaveBeenCalledWith('minutes');
  });
});

describe('no maintainer address, anywhere', () => {
  it('is never asked for, and never reaches the page when an answer holds one', async () => {
    const { UnsungHeroesDocument } = await import('./archive.documents');
    expect(JSON.stringify(UnsungHeroesDocument)).not.toMatch(/email|token/i);

    const leaky = {
      ...apiArchive,
      live: { ...apiHeroOf(), maintainer: { login: 'ada-fixture', name: 'Ada Fixture', email: 'ada@example.com' } },
    };
    const shown = archiveOf(leaky as never);
    expect(JSON.stringify(shown)).not.toContain('ada@example.com');
    const html = renderToStaticMarkup(<UnsungHeroesScreen archive={shown} jsonLd={archiveJsonLdOf(shown)} />);
    expect(html).not.toContain('ada@example.com');
    expect(JSON.stringify(archiveMetadataOf(shown))).not.toContain('ada@example.com');
  });
});

describe('search engines', () => {
  it('title, description, canonical and its own preview image naming the week', () => {
    const metadata = archiveMetadataOf(archive);
    expect(metadata.title).toBe('Unsung heroes: the open source your software runs on');
    expect(metadata.description).toBe(
      'One open-source project a week that a lot of software runs on, and few people star. 5 heroes so far, +788 stars while featured.',
    );
    expect(metadata.alternates).toEqual({ canonical: '/unsung-heroes' });
    expect(metadata.robots).toBeUndefined();
    expect(metadata.openGraph?.images).toEqual([
      {
        url: expect.stringMatching(/\/unsung-heroes\/card\.png\?week=2026-11-16$/),
        width: 1200,
        height: 630,
        alt: "This week's Unsung hero on GitRanks: ada-fixture/line-trim-fixture, 98.8M downloads a week, 942 stars",
      },
    ]);
    expect(metadata.twitter).toMatchObject({ card: 'summary_large_image' });
  });

  it('no hero yet: the first sentence alone; unreadable: kept out of search engines', () => {
    const empty = { live: null, past: [], totals: { heroes: 0, starsGained: 0, weeklyDownloads: 0, since: null } };
    expect(archiveMetadataOf(empty).description).toBe(
      'One open-source project a week that a lot of software runs on, and few people star.',
    );
    expect(archiveMetadataOf(null).robots).toEqual({ index: false });
  });

  it('JSON-LD: a CollectionPage listing the heroes as SoftwareSourceCode, and the breadcrumbs', () => {
    const [page, crumbs] = archiveJsonLdOf(archive) as [Record<string, never>, Record<string, never>];
    expect(page).toMatchObject({
      '@type': 'CollectionPage',
      name: 'Unsung heroes: the open source your software runs on',
    });
    const list = page.mainEntity as { '@type': string; itemListElement: { item: Record<string, string> }[] };
    expect(list['@type']).toBe('ItemList');
    expect(list.itemListElement.map(({ item }) => item.name)).toEqual([
      'ada-fixture/line-trim-fixture',
      'harbor-fixture/path-norm-fixture',
      'lumen-fixture/csv-chunk-fixture',
      'tarn-fixture/tz-lite-fixture',
      'pebble-fixture/glob-quote-fixture',
    ]);
    expect(list.itemListElement[1].item).toEqual({
      '@type': 'SoftwareSourceCode',
      name: 'harbor-fixture/path-norm-fixture',
      codeRepository: 'https://github.com/harbor-fixture/path-norm-fixture',
      description: 'Normalizes file paths across platforms',
    });
    expect(crumbs).toMatchObject({ '@type': 'BreadcrumbList' });
    expect((crumbs.itemListElement as { name: string }[]).map(({ name }) => name)).toEqual(['Home', 'Unsung heroes']);
    expect(JSON.stringify(archiveJsonLdOf(archive))).not.toContain('FAQPage');
  });

  it('the preview image is a 1200×630 PNG, with a hero and without', async () => {
    for (const value of [archive, archiveOf({ ...apiArchive, live: null }), null]) {
      const png = await drawArchiveCard(value);
      expect([...png.slice(1, 4)].map((code) => String.fromCharCode(code)).join('')).toBe('PNG');
      const view = new DataView(png.buffer);
      expect([view.getUint32(16), view.getUint32(20)]).toEqual([1200, 630]);
    }
  });
});
