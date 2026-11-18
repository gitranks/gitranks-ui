// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DailyUpdatesCard } from './daily-updates-card';
import { EmbedStep } from './embed-step';
import { findBadge } from '@/badge/v3/catalogue';
import { NOW as FIXTURES_NOW, orgBig, repoMid, userBig } from '@/badge/v3/fixtures';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const NOW = Date.parse('2026-11-15T12:00:00Z');
const HOUR = 3_600_000;
const iso = (ms: number) => new Date(ms).toISOString();

let answers: { status?: number; body: unknown }[];
const fetchMock = vi.fn(async () => {
  const answer = answers.shift();
  if (!answer) {
    throw new Error('network down');
  }
  return new Response(JSON.stringify(answer.body), { status: answer.status ?? 200 });
});

// The heading, lines and button, as a reader hears them: one after the other.
const text = (root: ParentNode) =>
  [...root.querySelectorAll('h2, p, button')]
    .map((element) => element.textContent)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
const buttonNamed = (name: string) =>
  [...document.querySelectorAll('button')].find((element) => element.textContent?.trim() === name);

describe('DailyUpdatesCard', () => {
  let container: HTMLDivElement;
  let root: Root;

  const mount = (kind: 'user' | 'repo', name: string) =>
    act(() => root.render(<DailyUpdatesCard kind={kind} name={name} />));

  const press = async (name: string) => {
    const button = buttonNamed(name);
    expect(button, name).toBeDefined();
    await act(async () => button?.click());
    await act(async () => {});
  };

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'], now: NOW });
    answers = [];
    fetchMock.mockClear();
    vi.stubGlobal('fetch', fetchMock);
    localStorage.clear();
    sessionStorage.clear();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('invites a check, and reads nothing until pressed', () => {
    mount('user', 'octo-dev');

    expect(text(container)).toBe(
      'Get daily updates A profile with a badge on GitHub updates every day. Add the code to your README, then check it here. Check my badge',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('checks the profile with no sign-in, and keeps nothing in the browser', async () => {
    mount('user', 'octo-dev');
    answers.push({ body: { status: 'found', until: iso(NOW + 7 * 24 * HOUR) } });
    await press('Check my badge');

    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/api/daily-updates/badge-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'user', name: 'octo-dev' }),
      cache: 'no-store',
    });
    expect(text(container)).toBe(
      'Get daily updates Badge found in the README of octo-dev/octo-dev. Daily updates are on. We look again each week. If the badge is gone, daily updates stop.',
    );
    expect(buttonNamed('Check again')).toBeUndefined();
    expect(localStorage.length + sessionStorage.length).toBe(0);
  });

  it('says a repository’s badge is not there yet, with the checks left, and checks again', async () => {
    mount('repo', 'brightfern/tidepool');
    answers.push({ body: { status: 'not_found', checksLeft: 2 } });
    await press('Check my badge');

    expect(text(container)).toBe(
      'Get daily updates We read the README of brightfern/tidepool and did not find the badge yet. Just added it? GitHub can take a minute. Check again 2 checks left today.',
    );

    answers.push({ body: { status: 'limit', nextAt: iso(NOW + 12 * HOUR) } });
    await press('Check again');
    expect(text(container)).toBe('Get daily updates No more checks for now. The next one opens in 12 h.');
  });

  it('offers the check again once the limit’s time has passed, without a reload', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'], now: NOW });
    mount('user', 'octo-dev');
    answers.push({ body: { status: 'limit', nextAt: iso(NOW + 60_000) } });
    await press('Check my badge');
    expect(text(container)).toBe('Get daily updates No more checks for now. The next one opens in 1 min.');

    await act(async () => vi.advanceTimersByTime(61_000));
    expect(text(container)).toBe('Get daily updates You can check again now. Check again');
  });

  it('reads an answer of another shape as a failed check', async () => {
    mount('user', 'octo-dev');
    answers.push({ body: { status: 'not_found' } });
    await press('Check my badge');

    expect(text(container)).toContain('We could not check the README of octo-dev/octo-dev just now.');
    expect(text(container)).not.toContain('undefined');
  });

  it('shows the failure without a count for an unknown name, an error answer and a failed call', async () => {
    const failed =
      'Get daily updates We could not check the README of octo-dev/octo-dev just now. Please try again later. Check again';
    mount('user', 'octo-dev');

    answers.push({ body: { status: 'unknown' } });
    await press('Check my badge');
    expect(text(container)).toBe(failed);

    answers.push({ status: 500, body: { message: 'down' } });
    await press('Check again');
    expect(text(container)).toBe(failed);

    await press('Check again');
    expect(text(container)).toBe(failed);
  });

  it('shows "Checking…" while the check runs, and ignores another press', async () => {
    let release: (response: Response) => void = () => {};
    fetchMock.mockImplementationOnce(() => new Promise<Response>((resolve) => (release = resolve)));
    mount('user', 'octo-dev');

    await press('Check my badge');
    const busy = buttonNamed('Checking…');
    expect(busy?.disabled).toBe(true);
    await act(async () => busy?.click());
    expect(fetchMock).toHaveBeenCalledOnce();

    await act(async () => release(new Response(JSON.stringify({ status: 'not_found', checksLeft: 0 }))));
    await act(async () => {});
    expect(text(container)).toContain('No checks left today.');
    expect(buttonNamed('Check again')).toBeUndefined();
  });

  it('drops the answer when the builder moves to another entity', async () => {
    mount('user', 'octo-dev');
    answers.push({ body: { status: 'not_found', checksLeft: 2 } });
    await press('Check my badge');

    mount('user', 'mona');
    expect(text(container)).toContain('Check my badge');
  });
  it('moves the focus to the answer when the press leaves no button: a package with no repository', async () => {
    await act(() => root.render(<DailyUpdatesCard kind="package" name="npm/react" />));
    answers.push({ body: { status: 'no_repository' } });
    buttonNamed('Check my badge')?.focus();

    await press('Check my badge');

    expect(buttonNamed('Check my badge')).toBeUndefined();
    expect(document.activeElement?.textContent).toBe(
      'We could not find this package’s repository, so there is no README to check.',
    );
  });

  it('moves the focus to the answer when the badge is found', async () => {
    mount('repo', 'acme/fastqueue');
    answers.push({ body: { status: 'found', until: iso(NOW + 7 * 24 * HOUR) } });

    await press('Check my badge');

    expect(document.activeElement?.textContent).toContain('Badge found in the README of acme/fastqueue.');
  });
});

describe('the card in step 4', () => {
  const embed = (facts: Parameters<typeof EmbedStep>[0]['facts'], badgeId: string) =>
    renderToStaticMarkup(
      <EmbedStep
        headingRef={{ current: null }}
        facts={facts}
        badge={findBadge(facts.kind, badgeId)!}
        style={{}}
        now={FIXTURES_NOW}
        editHref="/badge/builder"
        onEdit={() => {}}
      />,
    );

  it('shows under the code of a profile’s or a repository’s badge', () => {
    expect(embed(userBig, 'profile-card')).toContain('Get daily updates');
    expect(embed(repoMid, 'star-history')).toContain('Get daily updates');
  });

  it('is not shown for an organization, or for the Contribute badge, which shows none of the numbers', () => {
    expect(embed(orgBig, 'rank')).not.toContain('Get daily updates');
    expect(embed(repoMid, 'contribute')).not.toContain('Get daily updates');
  });
});
