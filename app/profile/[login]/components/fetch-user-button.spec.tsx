import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FetchUserButtonForProfilePage } from './fetch-user-button';
import { DailyUpdateReason } from '@/types/generated/graphql';
import type { DailyUpdatesFacts } from '@/utils/daily-updates-view';

const session = vi.hoisted(() => ({
  current: { data: null, status: 'loading' } as { data: unknown; status: string },
}));

vi.mock('next-auth/react', () => ({ useSession: () => session.current, signIn: vi.fn() }));
vi.mock('next/navigation', () => ({ useParams: () => ({ login: 'Octo-Dev' }), useRouter: () => ({ push: vi.fn() }) }));

const NEXT_UPDATE_AT = '2026-11-15T17:00:00Z';
const on = (...reasons: DailyUpdateReason[]): DailyUpdatesFacts => ({ reasons, nextUpdateAt: NEXT_UPDATE_AT });

// The button as text, the way a reader of the HTML gets it.
const render = (dailyUpdates?: DailyUpdatesFacts) =>
  renderToStaticMarkup(<FetchUserButtonForProfilePage dailyUpdates={dailyUpdates} profileLogin="octo-dev" />)
    .replaceAll('<!-- -->', '')
    .replace(/<svg[\s\S]*?<\/svg>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

describe('FetchUserButtonForProfilePage', () => {
  beforeEach(() => {
    session.current = { data: null, status: 'loading' };
  });

  it("shows today's button while the profile is not on daily updates", () => {
    expect(render(null)).toBe('Refresh');
    expect(render(undefined)).toBe('Refresh');
  });

  it('says who turned daily updates on, with the login as GitHub writes it', () => {
    expect(render(on(DailyUpdateReason.Owner))).toBe('Updates daily Turned on by @octo-dev.');
  });

  it('says a badge keeps it on', () => {
    expect(render(on(DailyUpdateReason.Badge))).toBe('Updates daily Has a GitRanks badge on GitHub.');
  });

  it('leaves the time out of the cached page: the browser adds it', () => {
    expect(render(on(DailyUpdateReason.Owner))).not.toMatch(/Next update/);
  });

  it('shows the same to a signed-out visitor and to someone signed in on another profile', () => {
    session.current = { data: null, status: 'unauthenticated' };
    expect(render(on(DailyUpdateReason.Badge))).toBe('Updates daily Has a GitRanks badge on GitHub.');

    session.current = { data: { user: { githubLogin: 'someone', authMode: 'identity' } }, status: 'authenticated' };
    expect(render(on(DailyUpdateReason.Owner))).toBe('Updates daily Turned on by @octo-dev.');
  });

  it("keeps today's button for the owner and for a token user", () => {
    session.current = { data: { user: { githubLogin: 'octo-dev', authMode: 'identity' } }, status: 'authenticated' };
    expect(render(on(DailyUpdateReason.Owner))).toBe('Refresh');

    session.current = { data: { user: { githubLogin: 'someone', authMode: 'token' } }, status: 'authenticated' };
    expect(render(on(DailyUpdateReason.Badge))).toBe('Refresh');
  });
});
