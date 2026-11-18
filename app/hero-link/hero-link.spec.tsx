import type { OperationDefinitionNode } from 'graphql';
import { NextRequest } from 'next/server';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { cookieJar } from '@/lib/link-token/__fixtures__/cookie-jar';
import { HERO_TOKEN, heroLinkOf } from '@/lib/link-token/__fixtures__/hero-links';
import type { ApiHeroLink, ApiHeroLinkAnswer } from '@/lib/link-token/hero-links.documents';
import { type HeroLinkState, heroStateOf } from '@/lib/link-token/hero-pages';
import { LINK_PAGE_HEADERS } from '@/lib/link-token/link-token';

const { graphqlDirect, jar } = vi.hoisted(() => ({ graphqlDirect: vi.fn(), jar: { current: null as unknown } }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
vi.mock('next/headers', () => ({ cookies: async () => jar.current }));
vi.mock('@/components/header/header', () => ({ Header: () => null }));

const cookies = cookieJar();
jar.current = cookies.store;

const { GET: land } = await import('@/app/l/[kind]/route');
const { heroOptOutPageState, heroPreviewPageState } = await import('@/lib/link-token/link-pages');
const { pressHeroOptOut } = await import('./opt-out/actions');
const { HeroOptOutView, HeroPreviewView } = await import('./components/hero-link-views');
const { archiveHeroOf, cardHeroOf, isoWeekOf } = await import('./hero-link-previews');

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

/** What was sent to the API: each operation's kind, name and variables. */
const sent = () =>
  graphqlDirect.mock.calls.map(([document, variables]) => {
    const operation = document.definitions[0] as OperationDefinitionNode;
    return { operation: operation.operation, name: operation.name?.value, variables };
  });

const linkState = (overrides: Partial<ApiHeroLink> = {}) =>
  heroStateOf(heroLinkOf(overrides)) as Extract<HeroLinkState, { kind: 'link' }>;
const form = (change: string) => {
  const data = new FormData();
  data.set('change', change);
  return data;
};
const answers = (name: 'unsungHeroOptOut' | 'unsungHeroOptOutUndo', answer: ApiHeroLinkAnswer) =>
  graphqlDirect.mockResolvedValue({ [name]: answer });

beforeEach(() => {
  graphqlDirect.mockReset();
  cookies.clear();
});

describe('/l/hero-preview and /l/hero-opt-out', () => {
  it.each([
    ['hero-preview', '/hero-link/preview'],
    ['hero-opt-out', '/hero-link/opt-out'],
  ])('%s keeps the token in its own HttpOnly cookie and opens a page whose address holds none', async (kind, page) => {
    const response = await land(new NextRequest(`https://gitranks.com/l/${kind}?t=${HERO_TOKEN}`), {
      params: Promise.resolve({ kind }),
    });

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe(page);
    const cookie = response.headers.get('set-cookie') ?? '';
    expect(cookie).toContain(`gitranks-link-${kind}=${HERO_TOKEN}`);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Max-Age=900/);
    expect(Object.fromEntries(response.headers)).toMatchObject({
      'referrer-policy': 'no-referrer',
      'x-robots-tag': 'noindex, nofollow',
      'cache-control': 'private, no-store',
    });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('sends a link without a usable token to its page with ?e=invalid and clears the cookie', async () => {
    const response = await land(new NextRequest('https://gitranks.com/l/hero-opt-out?t=short'), {
      params: Promise.resolve({ kind: 'hero-opt-out' }),
    });
    expect(response.headers.get('location')).toBe('/hero-link/opt-out?e=invalid');
    expect(response.headers.get('set-cookie')).toMatch(/gitranks-link-hero-opt-out=;.*Max-Age=0/i);
  });
});

describe('the two hero pages', () => {
  it.each([
    ['./preview/page', 'Preview your Unsung hero week'],
    ['./opt-out/page', 'Opt out of Unsung hero'],
  ])('%s is noindex and passes no address on', async (path, title) => {
    const { metadata } = await import(/* @vite-ignore */ path);
    expect(metadata).toEqual({ title, robots: { index: false, follow: false }, referrer: 'no-referrer' });
  });

  it('is sent with no-referrer, noindex and no-store headers (next.config)', async () => {
    const { default: config } = await import('@/next.config');
    const entry = ((await config.headers?.()) ?? []).find((each) => each.source === '/hero-link/:path*');
    expect(Object.fromEntries((entry?.headers ?? []).map(({ key, value }) => [key, value]))).toEqual(LINK_PAGE_HEADERS);
  });
});

describe('opening a page changes nothing', () => {
  it.each([
    ['preview', heroPreviewPageState, 'gitranks-link-hero-preview'],
    ['opt-out', heroOptOutPageState, 'gitranks-link-hero-opt-out'],
  ] as const)('%s: reads the week by its cookie with a query, never a mutation', async (_, load, cookie) => {
    cookies.values.set(cookie, HERO_TOKEN);
    graphqlDirect.mockResolvedValue({ unsungHeroLink: heroLinkOf() });

    expect(await load()).toEqual(linkState());
    expect(sent()).toEqual([{ operation: 'query', name: 'UnsungHeroLink', variables: { token: HERO_TOKEN } }]);
    expect(cookies.sets).toEqual([]);
  });

  it("each page reads only its own kind's cookie", async () => {
    cookies.values.set('gitranks-link-hero-preview', HERO_TOKEN);
    expect(await heroOptOutPageState()).toEqual({ kind: 'timed-out' });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('without its cookie: timed out, or does not work after ?e=invalid, asking nothing', async () => {
    expect(await heroOptOutPageState()).toEqual({ kind: 'timed-out' });
    expect(await heroOptOutPageState(true)).toEqual({ kind: 'unknown' });
    expect(await heroPreviewPageState()).toEqual({ kind: 'timed-out' });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('a token no week has, and an API that cannot answer', async () => {
    cookies.values.set('gitranks-link-hero-opt-out', HERO_TOKEN);
    graphqlDirect.mockResolvedValue({ unsungHeroLink: null });
    expect(await heroOptOutPageState()).toEqual({ kind: 'unknown' });
    graphqlDirect.mockRejectedValue(new Error('down'));
    expect(await heroOptOutPageState()).toEqual({ kind: 'unavailable' });
  });
});

describe('Opt out and Undo, the opt-out page’s buttons', () => {
  beforeEach(() => cookies.values.set('gitranks-link-hero-opt-out', HERO_TOKEN));
  const before = linkState();
  const optedOut = heroLinkOf({ state: 'OPTED_OUT', canOptOut: false, undoUntil: '2026-11-25T10:00:00.000Z' });

  it("opts out by the link's cookie, renews it, and shows Undo; the form carries no token", async () => {
    answers('unsungHeroOptOut', { result: 'OPTED_OUT', link: optedOut });
    const pressed = form('opt-out');
    const state = await pressHeroOptOut(before, pressed);

    expect(state).toEqual(heroStateOf(optedOut));
    expect([...pressed.keys()]).toEqual(['change']);
    expect(sent()).toEqual([{ operation: 'mutation', name: 'UnsungHeroOptOut', variables: { token: HERO_TOKEN } }]);
    expect(cookies.sets.map(({ name, value, options }) => [name, value, options.maxAge])).toEqual([
      ['gitranks-link-hero-opt-out', HERO_TOKEN, 900],
    ]);
    expect(JSON.stringify(state)).not.toContain(HERO_TOKEN);
  });

  it('Undo within 7 days: back as it was before the week', async () => {
    answers('unsungHeroOptOutUndo', { result: 'RESTORED', link: heroLinkOf() });
    const state = await pressHeroOptOut(heroStateOf(optedOut), form('undo'));

    expect(state).toEqual({ ...linkState(), note: 'restored' });
    expect(sent()).toEqual([{ operation: 'mutation', name: 'UnsungHeroOptOutUndo', variables: { token: HERO_TOKEN } }]);
  });

  it('Undo once the 7 days are over: still opted out, and says so', async () => {
    answers('unsungHeroOptOutUndo', { result: 'EXPIRED', link: { ...optedOut, undoUntil: null } });
    expect(await pressHeroOptOut(heroStateOf(optedOut), form('undo'))).toMatchObject({
      kind: 'link',
      link: { week: 'opted-out', undoUntil: null, canOptOut: false },
      note: 'undo-expired',
    });
  });

  it('every other answer the press can get', async () => {
    const cases: [ApiHeroLinkAnswer, HeroLinkState['kind'], string | undefined][] = [
      [{ result: 'ALREADY_OPTED_OUT', link: optedOut }, 'link', 'already'],
      [{ result: 'NOT_POSSIBLE', link: heroLinkOf({ state: 'CANCELLED', canOptOut: false }) }, 'link', undefined],
      [{ result: 'UNDONE', link: heroLinkOf({ state: 'OPTED_OUT' }) }, 'link', 'undone'],
      [{ result: 'WEEK_TAKEN', link: heroLinkOf({ state: 'OPTED_OUT' }) }, 'link', 'week-taken'],
      [{ result: 'NOT_OPTED_OUT', link: heroLinkOf() }, 'link', undefined],
      [{ result: 'UNKNOWN', link: null }, 'unknown', undefined],
    ];
    for (const [answer, kind, note] of cases) {
      answers('unsungHeroOptOut', answer);
      const state = await pressHeroOptOut(before, form('opt-out'));
      expect(state.kind, answer.result).toBe(kind);
      expect((state as { note?: string }).note, answer.result).toBe(note);
    }
  });

  it('asks nothing for a press it does not know, or from a page that showed no week', async () => {
    expect(await pressHeroOptOut(before, form('delete'))).toBe(before);
    expect(await pressHeroOptOut(before, new FormData())).toBe(before);
    expect(await pressHeroOptOut({ kind: 'unknown' }, form('opt-out'))).toEqual({ kind: 'unknown' });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('timed out once the cookie is gone, and unavailable when the API cannot answer', async () => {
    graphqlDirect.mockRejectedValue(new Error('down'));
    expect(await pressHeroOptOut(before, form('opt-out'))).toEqual({ kind: 'unavailable' });

    cookies.clear();
    graphqlDirect.mockReset();
    expect(await pressHeroOptOut(before, form('opt-out'))).toEqual({ kind: 'timed-out' });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });
});

describe('/hero-link/opt-out', () => {
  it('before the week: the week, the promise, and one Opt out button', () => {
    const html = renderToStaticMarkup(<HeroOptOutView state={linkState()} />);
    expect(text(html)).toBe(
      'Unsung hero Opt out of Unsung hero? From Monday, November 23, GitRanks features ada-fixture/line-trim-fixture on its ' +
        'home page for a week (Nov 23 – 29), as our Unsung hero. No reason needed. We will not ask again. Opt out',
    );
    expect(html.match(/<button/g)).toHaveLength(1);
    expect(html).toContain('value="opt-out"');
  });

  it('during the week and after it', () => {
    expect(text(renderToStaticMarkup(<HeroOptOutView state={linkState({ state: 'LIVE' })} />))).toContain(
      'ada-fixture/line-trim-fixture is our Unsung hero this week (Nov 23 – 29), on the GitRanks home page.',
    );
    expect(text(renderToStaticMarkup(<HeroOptOutView state={linkState({ state: 'DONE' })} />))).toContain(
      'ada-fixture/line-trim-fixture was our Unsung hero for Nov 23 – 29, and is listed among our past heroes.',
    );
  });

  it('opted out: Undo until the end of its 7 days', () => {
    const html = renderToStaticMarkup(
      <HeroOptOutView
        state={{
          ...linkState({ state: 'OPTED_OUT', canOptOut: false, undoUntil: '2026-11-25T10:00:00.000Z' }),
        }}
      />,
    );
    expect(text(html)).toBe(
      'Opted out You are opted out We will not feature ada-fixture/line-trim-fixture , and we will not ask you again. ' +
        'Changed your mind? You can undo this until November 25. Undo',
    );
    expect(html.match(/<button/g)).toHaveLength(1);
    expect(html).toContain('value="undo"');
  });

  it('opted out with the undo window over: no button', () => {
    const html = renderToStaticMarkup(
      <HeroOptOutView
        state={{ ...linkState({ state: 'OPTED_OUT', canOptOut: false, undoUntil: null }), note: 'undo-expired' }}
      />,
    );
    expect(text(html)).toBe(
      'Opted out You are opted out The 7 days to undo this are over. ' +
        'We will not feature ada-fixture/line-trim-fixture , and we will not ask you again.',
    );
    expect(html).not.toContain('<button');
  });

  it('Undo once the week had started: the week stays empty, and Opt out is offered again', () => {
    const html = renderToStaticMarkup(
      <HeroOptOutView state={{ ...linkState({ state: 'OPTED_OUT', canOptOut: true }), note: 'undone' }} />,
    );
    expect(text(html)).toContain('Opt-out undone. Its week had already started, so it stays empty.');
    expect(html).toContain('value="opt-out"');
  });

  it('a cancelled week: nothing to opt out of', () => {
    const html = renderToStaticMarkup(<HeroOptOutView state={linkState({ state: 'CANCELLED', canOptOut: false })} />);
    expect(text(html)).toBe(
      'Unsung hero This week is off We will not feature ada-fixture/line-trim-fixture for Nov 23 – 29. There is nothing to opt out of.',
    );
    expect(html).not.toContain('<button');
  });

  it('links that do not work, the same words on both pages', () => {
    const cases: [HeroLinkState, string][] = [
      [{ kind: 'timed-out' }, 'This link has timed out Open it from your email again.'],
      [
        { kind: 'unknown' },
        'This link does not work Open it from your latest email about Unsung hero. Nothing was changed.',
      ],
      [
        { kind: 'unavailable' },
        'This page is not available right now Nothing was changed. Try again in a few minutes.',
      ],
    ];
    for (const [state, words] of cases) {
      expect(text(renderToStaticMarkup(<HeroOptOutView state={state} />))).toBe(words);
      expect(text(renderToStaticMarkup(<HeroPreviewView state={state} />))).toBe(words);
    }
  });
});

describe('/hero-link/preview', () => {
  it('the home card and the archive block as visitors will see them, and nothing to press', () => {
    const html = renderToStaticMarkup(<HeroPreviewView state={linkState()} />);
    const words = text(html);

    expect(words).toContain('Your week, as visitors will see it');
    expect(words).toContain('Unsung hero · Nov 23 – 29');
    expect(words).toContain('Ships inside @fixture-ui/editor');
    expect(words).toContain('This week Nov 23 – 29 · live');
    expect(words).toContain('Ada Fixture · since January 2019');
    expect(words).toContain('41.2M downloads a week 512 stars');
    expect(figures(html)).toEqual([
      '41.2M downloads a week',
      '512 stars when featured',
      '+0 stars since Monday',
      '12 contributors',
    ]);
    expect(html).not.toContain('<button');
    expect(html).not.toContain('<form');
    expect(html).not.toContain(HERO_TOKEN);
  });

  it('after the week: its row among the past heroes, not the home card', () => {
    const html = renderToStaticMarkup(
      <HeroPreviewView state={linkState({ state: 'DONE', starsAtStart: 500, stars: 560 })} />,
    );
    const words = text(html);
    expect(words).toContain(
      'Among the past heroes on our page of Unsung heroes Nov 23 – 29 ada-fixture/line-trim-fixture',
    );
    expect(words).toContain('+60 stars that week now 560');
    expect(words).not.toContain('On the home page');
    expect(words).not.toContain('· live');
    expect(html).toContain('id="ada-fixture-line-trim-fixture"');
  });

  it('says a test week is one', () => {
    expect(text(renderToStaticMarkup(<HeroPreviewView state={linkState({ preview: true })} />))).toContain(
      'A test week: only the GitRanks team sees it.',
    );
  });

  it('opted out or called off: nothing to preview', () => {
    const html = renderToStaticMarkup(<HeroPreviewView state={linkState({ state: 'OPTED_OUT', canOptOut: false })} />);
    expect(text(html)).toBe(
      'Unsung hero You are opted out We will not feature ada-fixture/line-trim-fixture for Nov 23 – 29, so there is nothing to preview.',
    );
  });
});

describe('the previews of a week', () => {
  it('the card and the block from the link: stars since Monday only once the week has started', () => {
    const { link } = linkState({ state: 'LIVE', starsAtStart: 500, stars: 540 });
    expect(cardHeroOf(link)).toMatchObject({ week: '2026-W48', starsAtStart: 500, starsGained: 40 });
    expect(archiveHeroOf(link)).toMatchObject({ live: true, starsAtStart: 500, starsNow: 540, starsGained: 40 });
    expect(cardHeroOf(linkState().link)).toMatchObject({ starsAtStart: 512, starsGained: 0 });
  });

  it('names ISO weeks, across a year too', () => {
    expect(isoWeekOf('2026-11-16T00:00:00.000Z')).toBe('2026-W47');
    expect(isoWeekOf('2026-12-28T00:00:00.000Z')).toBe('2026-W53');
    expect(isoWeekOf('2027-01-04T00:00:00.000Z')).toBe('2027-W01');
    expect(isoWeekOf('2024-12-30T00:00:00.000Z')).toBe('2025-W01');
  });
});

describe('no maintainer address, anywhere', () => {
  it('is never asked for, and never passed on when an answer holds one', async () => {
    const documents = await import('@/lib/link-token/hero-links.documents');
    for (const document of [
      documents.UnsungHeroLinkDocument,
      documents.UnsungHeroOptOutDocument,
      documents.UnsungHeroOptOutUndoDocument,
    ]) {
      expect(JSON.stringify(document)).not.toMatch(/email/i);
    }

    const answer = heroLinkOf({
      maintainer: { login: 'ada-fixture', name: 'Ada Fixture', email: 'ada@example.com' } as never,
    });
    const state = heroStateOf({ ...answer, token: HERO_TOKEN } as never);
    expect(JSON.stringify(state)).not.toContain('ada@example.com');
    expect(JSON.stringify(state)).not.toContain(HERO_TOKEN);
    const html =
      renderToStaticMarkup(<HeroPreviewView state={state} />) + renderToStaticMarkup(<HeroOptOutView state={state} />);
    expect(html).not.toContain('ada@example.com');
    expect(html).not.toContain(HERO_TOKEN);
  });
});
