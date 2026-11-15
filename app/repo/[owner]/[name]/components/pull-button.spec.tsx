import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { PullButton } from './pull-button';
import { DailyUpdateReason } from '@/types/generated/graphql';
import type { DailyUpdatesFacts } from '@/utils/daily-updates-view';

vi.mock('next-auth/react', () => ({ useSession: () => ({ data: null, status: 'loading' }), signIn: vi.fn() }));

const on = (...reasons: DailyUpdateReason[]): DailyUpdatesFacts => ({
  reasons,
  nextUpdateAt: '2026-11-15T17:00:00Z',
});

// The buttons as text, the way a reader of the HTML gets it.
const render = (dailyUpdates?: DailyUpdatesFacts) =>
  renderToStaticMarkup(<PullButton owner="acme" name="fastqueue" dailyUpdates={dailyUpdates} />)
    .replaceAll('<!-- -->', '')
    .replace(/<svg[\s\S]*?<\/svg>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

describe('PullButton', () => {
  it('shows Refresh alone while the repository is not on daily updates', () => {
    expect(render(null)).toBe('Refresh');
    expect(render(undefined)).toBe('Refresh');
  });

  it('says a badge in its README keeps it on', () => {
    expect(render(on(DailyUpdateReason.Badge))).toBe('Refresh Updates daily: it has a GitRanks badge in its README.');
  });

  it('says only that a picked repository updates daily', () => {
    expect(render(on(DailyUpdateReason.Pick))).toBe('Refresh Updates daily.');
  });
});
