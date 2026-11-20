import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));
vi.mock('@/lib/workspace/actions', () => ({}));

const { HostedAgentControl } = await import('./hosted-agent-control');
const { agentTabViews, contributor, NOW, settings, views } = await import(
  '@/lib/contribute/__fixtures__/contribute-views'
);

import type { ContributeAutopilot, ContributeHostedLevel, ContributeView } from '@/lib/workspace/contribute.types';

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ');

const OPEN: ContributeAutopilot = {
  unlocked: false,
  mergedCount: 1,
  closedUnmergedStreak: 0,
  mergedToUnlock: 4,
  lockedAt: null,
  available: true,
  noticeTo: 'm•••@gmail.com',
};
const UNLOCKED: ContributeAutopilot = { ...OPEN, unlocked: true, mergedCount: 6, mergedToUnlock: 0 };

const viewOf = (
  level: ContributeHostedLevel,
  autopilot: ContributeAutopilot = OPEN,
  patch: Partial<ContributeView> = {},
): ContributeView => ({
  ...agentTabViews.both,
  contributor: contributor({ settings: { ...settings, hostedLevel: level }, autopilot }),
  ...patch,
});

const render = (view: ContributeView, prBound = 0) => {
  const html = renderToStaticMarkup(<HostedAgentControl view={view} counts={{ prBound, queued: 0 }} now={NOW} />);
  return { html, plain: text(html) };
};

/** The card of a level, from its opening tag to the next card (or the end of the group). */
const card = (html: string, level: ContributeHostedLevel) => {
  const from = html.indexOf(`data-level-card="${level}"`);
  const next = html.indexOf('data-level-card="', from + 1);
  return html.slice(from, next === -1 ? undefined : next);
};
const checked = (html: string) =>
  [...html.matchAll(/role="radio" aria-checked="true"[^>]*value="([^"]*)"/g)].map(([, value]) => value);

describe("the hosted agent's levels", () => {
  it('draws the three levels in order, the stored one selected, under one title', () => {
    const { html, plain } = render(viewOf('MANUAL'));
    expect(plain).toContain('How much it does by itself Each level includes the one before it.');
    expect(plain).toMatch(
      /You start each issue Nothing runs until you press Start on an issue\. .*It starts the next issue by itself Paced across your budget\. You review every change before it goes out\. .*Autopilot .*It also submits the pull request, for changes the hosted agent made\. How autopilot works/,
    );
    expect(checked(html)).toEqual(['MANUAL']);
    expect(checked(render(viewOf('NEXT')).html)).toEqual(['NEXT']);
    expect(html).toContain('id="autopilot"');
  });

  it('says when it starts the next issue under a level that does, and nothing at "You start each issue"', () => {
    const next = render(viewOf('NEXT'));
    expect(text(card(next.html, 'NEXT'))).toContain('Next issue: in about 2 hours');
    expect(next.html.match(/data-next-issue/g)).toHaveLength(1);
    expect(render(viewOf('MANUAL')).html).not.toContain('data-next-issue');

    expect(text(card(render(viewOf('NEXT'), 3).html, 'NEXT'))).toContain(
      'Next issue: when a pull request is merged or closed',
    );
    const noRoom = viewOf('AUTOPILOT', UNLOCKED);
    noRoom.contributor = { ...noRoom.contributor!, spend: { ...noRoom.contributor!.spend!, nextAttemptAt: null } };
    expect(text(card(render(noRoom).html, 'AUTOPILOT'))).toContain('Next issue: your budget leaves no room for a run');
    const soon = viewOf('NEXT');
    soon.contributor = {
      ...soon.contributor!,
      spend: { ...soon.contributor!.spend!, nextAttemptAt: NOW.toISOString() },
    };
    expect(text(card(render(soon).html, 'NEXT'))).toContain('Next issue: within a few minutes, when one fits you');
  });

  it('locks Autopilot until 5 merged, with the count in its pill, and since a lock', () => {
    const { html } = render(viewOf('MANUAL'));
    const autopilot = card(html, 'AUTOPILOT');
    expect(autopilot).toContain('data-autopilot="locked"');
    expect(text(autopilot)).toContain('Autopilot After 5 merged pull requests · 1 of 5');
    expect(autopilot).toMatch(/role="radio"[^>]*disabled=""/);

    const relocked = render(viewOf('NEXT', { ...OPEN, lockedAt: '2026-10-20T08:00:00.000Z' }));
    expect(text(card(relocked.html, 'AUTOPILOT'))).toContain('Locked on Oct 20 · 1 of 5 merged since');
  });

  it('says after launch month while autopilot is not open, or not known to be', () => {
    for (const autopilot of [
      { ...UNLOCKED, available: false },
      { ...UNLOCKED, available: undefined },
    ]) {
      const html = card(render(viewOf('NEXT', autopilot)).html, 'AUTOPILOT');
      expect(text(html)).toContain('After launch month');
      expect(html).toMatch(/role="radio"[^>]*disabled=""/);
    }
  });

  it('can be chosen once open and unlocked, and says where its emails go once chosen', () => {
    const open = card(render(viewOf('NEXT', UNLOCKED)).html, 'AUTOPILOT');
    expect(open).toContain('data-autopilot="unlocked"');
    expect(open).not.toMatch(/role="radio"[^>]*disabled=""/);
    expect(text(open)).not.toContain('After');

    const chosen = card(render(viewOf('AUTOPILOT', UNLOCKED)).html, 'AUTOPILOT');
    expect(text(chosen)).toContain('Emails before each submission go to m•••@gmail.com');
  });

  it('is disabled with no email, and says to share one', () => {
    const html = card(render(viewOf('NEXT', { ...UNLOCKED, noticeTo: null })).html, 'AUTOPILOT');
    expect(html).toMatch(/role="radio"[^>]*disabled=""/);
    expect(html).toContain('data-autopilot-no-email');
    expect(text(html)).toContain('Sign in again and share your GitHub email to turn it on.');
    // Chosen with no email: it is on, and its changes wait for the review.
    const on = card(render(viewOf('AUTOPILOT', { ...UNLOCKED, noticeTo: null })).html, 'AUTOPILOT');
    expect(text(on)).toContain('so its changes wait for your review. Sign in again and share your GitHub email.');
    expect(text(on)).not.toContain('to turn it on');
    // Locked, an email would not open it: the line is not said.
    expect(card(render(viewOf('NEXT', { ...OPEN, noticeTo: null })).html, 'AUTOPILOT')).not.toContain(
      'data-autopilot-no-email',
    );
  });

  it('chosen and then locked again, stays selected and says it works as the level above', () => {
    const { html } = render(viewOf('AUTOPILOT', { ...OPEN, lockedAt: '2026-10-20T08:00:00.000Z' }));
    const autopilot = card(html, 'AUTOPILOT');
    expect(checked(html)).toEqual(['AUTOPILOT']);
    expect(autopilot).not.toMatch(/role="radio"[^>]*disabled=""/);
    expect(text(autopilot)).toContain(
      'Paused: 2 pull requests were closed without merging. Until 5 more are merged it works as the level above.',
    );
    expect(text(autopilot)).toContain('Next issue: in about 2 hours');
  });

  it("promises no next issue on a paused account, and has no Resume: the key's row says it", () => {
    const paused = viewOf('NEXT');
    const byKey = render({ ...paused, contributor: { ...paused.contributor!, status: 'PAUSED' } });
    expect(byKey.html).toContain('data-hosted-level=');
    expect(byKey.html).not.toContain('data-next-issue');
    expect(byKey.plain).not.toContain('Resume');
    expect(render(viewOf('NEXT')).plain).not.toContain('Contributing is paused');
  });

  it('is not drawn without settings: the own agent alone has no levels', () => {
    expect(render(agentTabViews.ownOnly).html).toBe('');
    expect(render(views.newcomer).html).toBe('');
  });
});
