import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { answerBy, jsonResponse, NOT_FOUND_ANSWER, sentOf } from './__fixtures__/api';
import { boardOf, slotOf } from './__fixtures__/board';

const { auth, signedFetch } = vi.hoisted(() => ({ auth: vi.fn(), signedFetch: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/auth', () => ({ auth }));
vi.mock('@/lib/signed-fetch', () => ({ signedFetch }));
vi.mock('@/components/header/header', () => ({ Header: () => null }));

const { default: Page, generateMetadata, instant } = await import('./page');

const ADMIN = { user: { githubLogin: 'octocat', email: 'octocat@example.com' } };
const NOT_FOUND_DIGEST = 'NEXT_HTTP_ERROR_FALLBACK;404';

/** The page as the server sends it, or the digest of the error it throws (a 404 is `notFound()`). */
async function render(): Promise<{ html: string } | { digest: unknown }> {
  try {
    return { html: renderToStaticMarkup(await Page()) };
  } catch (error) {
    return { digest: (error as { digest?: unknown }).digest };
  }
}

beforeEach(() => {
  auth.mockReset();
  signedFetch.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('/admin/unsung-hero for anyone the API does not answer the board to', () => {
  it('renders on request (the proxy gives a visitor without a session the 404 status)', () => {
    expect(instant).toBe(false);
  });

  it('is a 404 for a visitor who is not signed in, without asking the API', async () => {
    auth.mockResolvedValue(null);
    expect(await render()).toEqual({ digest: NOT_FOUND_DIGEST });
    expect(await generateMetadata()).toEqual({});
    expect(signedFetch).not.toHaveBeenCalled();
  });

  it('is a 404 for a session that broke, without asking the API', async () => {
    auth.mockResolvedValue({ ...ADMIN, error: 'RefreshTokenError' });
    expect(await render()).toEqual({ digest: NOT_FOUND_DIGEST });
    expect(signedFetch).not.toHaveBeenCalled();
  });

  it('is a 404 for a signed-in viewer the API answers "not found" (not an admin), and shows nothing of the board', async () => {
    auth.mockResolvedValue({ user: { githubLogin: 'someone' } });
    signedFetch.mockResolvedValue(jsonResponse(NOT_FOUND_ANSWER));
    expect(await render()).toEqual({ digest: NOT_FOUND_DIGEST });
    expect(await generateMetadata()).toEqual({});
    expect(sentOf(signedFetch)[0]).toMatchObject({
      operation: 'UnsungHeroAdmin',
      source: 'ssr',
      githubLogin: 'someone',
    });
  });

  it('is a 404 too when the API does not answer, or answers no board', async () => {
    auth.mockResolvedValue(ADMIN);
    signedFetch.mockRejectedValue(new Error('down'));
    expect(await render()).toEqual({ digest: NOT_FOUND_DIGEST });
    signedFetch.mockResolvedValue(jsonResponse({ data: { unsungHeroAdmin: null } }));
    expect(await render()).toEqual({ digest: NOT_FOUND_DIGEST });
  });

  it('is a 404 for a query the API cannot read, logged as a failure (not taken for a refusal)', async () => {
    auth.mockResolvedValue(ADMIN);
    signedFetch.mockResolvedValue(jsonResponse({ errors: [{ message: 'Cannot query field "unsungHeroAdmin"' }] }, 400));
    expect(await render()).toEqual({ digest: NOT_FOUND_DIGEST });
    expect(console.error).toHaveBeenCalledWith('unsung hero admin: the board was not read (failed)');
  });

  it('logs nothing for the API’s own "not found"', async () => {
    auth.mockResolvedValue({ user: { githubLogin: 'someone' } });
    signedFetch.mockResolvedValue(jsonResponse(NOT_FOUND_ANSWER));
    await render();
    expect(console.error).not.toHaveBeenCalled();
  });
});

describe('/admin/unsung-hero for the admin', () => {
  beforeEach(() => {
    auth.mockResolvedValue(ADMIN);
    answerBy(signedFetch, { UnsungHeroAdmin: () => jsonResponse({ data: { unsungHeroAdmin: boardOf() } }) });
  });

  it('draws the board, noindex', async () => {
    const result = await render();
    expect(result).toHaveProperty('html');
    const { html } = result as { html: string };
    for (const text of [
      'Unsung hero',
      'Shortlist',
      'Past heroes',
      'Opt-outs',
      'hubot/size-watch',
      'mona/scroll-guard',
    ]) {
      expect(html).toContain(text);
    }
    expect(await generateMetadata()).toEqual({
      title: 'Unsung hero · Admin',
      robots: { index: false, follow: false },
    });
  });

  it('changes nothing on a GET: the render asks the board alone, as the signed-in admin, from the server', async () => {
    await render();
    expect(sentOf(signedFetch)).toEqual([
      {
        operation: 'UnsungHeroAdmin',
        variables: {},
        source: 'ssr',
        githubLogin: 'octocat',
        accountEmail: 'octocat@example.com',
      },
    ]);
  });

  it('puts every action in a POST form of its own, never a link', async () => {
    const { html } = (await render()) as { html: string };
    const forms = html.match(/<form[^>]*>/g) ?? [];
    expect(forms.length).toBeGreaterThan(0);
    for (const form of forms) expect(form).not.toMatch(/method="get"/i);
    expect(html).not.toMatch(/href="[^"]*intent=/);
    const intents = [...html.matchAll(/name="intent" value="([^"]+)"/g)].map(([, intent]) => intent);
    expect(new Set(intents)).toEqual(new Set(['cancel']));
  });

  it('asks the API which slots have no heads-up, and what a check refuses without one', async () => {
    await render();
    const { query } = JSON.parse(String((signedFetch.mock.calls[0][1] as RequestInit).body)) as { query: string };
    expect(query).toContain('noHeadsUp');
    expect(query).toContain('refusalsWithoutHeadsUp');
  });

  it('says how scheduling closes with the heads-up and with none', async () => {
    const { html } = (await render()) as { html: string };
    expect(html).toContain('With the heads-up, scheduling for a week closes 97 hours before it starts');
    expect(html).toContain('With no heads-up, a week can be scheduled until it starts');
  });

  it('marks a slot with no heads-up in the Weeks list, and lets it be cancelled while live', async () => {
    const quiet = slotOf({ id: '6721a0f0c0ffee0000000020', status: 'LIVE', noHeadsUp: true, headsUp: null });
    answerBy(signedFetch, {
      UnsungHeroAdmin: () => jsonResponse({ data: { unsungHeroAdmin: boardOf({ live: [quiet], upcoming: [] }) } }),
    });
    const { html } = (await render()) as { html: string };
    expect(html).toContain('No heads-up: the maintainer gets no email before the week');
    expect(html).toMatch(/<button(?![^>]*disabled="")[^>]*>Cancel<\/button>/);
    expect(html).toContain(`name="id" value="${quiet.id}"`);
  });

  it('puts Skip and Mark notified behind a confirm step: their buttons on the board post nothing', async () => {
    const { html } = (await render()) as { html: string };
    for (const label of ['Skip', 'Mark notified']) {
      const buttons = html.match(new RegExp(`<button[^>]*>${label}</button>`, 'g')) ?? [];
      expect(buttons.length, label).toBeGreaterThan(0);
      for (const button of buttons) {
        expect(button).toContain('type="button"');
        expect(button).toContain('aria-haspopup="dialog"');
      }
    }
  });
});
