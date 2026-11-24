import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/learn/my-progress/my-progress-live', () => ({ MyProgressLive: () => null }));

const { default: MyProgressPage, metadata, instant } = await import('./page');

const propsOf = async (searchParams: Record<string, string | string[] | undefined>) =>
  (
    (await MyProgressPage({
      searchParams: Promise.resolve(searchParams),
      params: Promise.resolve({}),
    })) as ReactElement<{
      view: string;
      day: string | null;
    }>
  ).props;

describe('My progress’s page', () => {
  it('is the person’s own: never indexed, never built ahead', () => {
    expect(metadata).toEqual({ title: 'Your progress', robots: { index: false, follow: false } });
    expect(instant).toBe(false);
  });

  it('opens the view the address asks for, and Courses for anything else', async () => {
    expect(await propsOf({})).toEqual({ view: 'courses', day: null });
    expect(await propsOf({ view: 'fixes' })).toEqual({ view: 'fixes', day: null });
    expect(await propsOf({ view: 'walkthroughs' })).toEqual({ view: 'walkthroughs', day: null });
    expect(await propsOf({ view: 'lessons' })).toEqual({ view: 'courses', day: null });
    expect(await propsOf({ view: 'history' })).toEqual({ view: 'history', day: null });
  });

  it('opens History at a day only for a real date, and the day only means something in History', async () => {
    expect(await propsOf({ view: 'history', day: '2026-11-20' })).toEqual({ view: 'history', day: '2026-11-20' });
    expect(await propsOf({ view: 'history', day: '2026-13-01' })).toEqual({ view: 'history', day: null });
    expect(await propsOf({ view: 'history', day: ['2026-11-20', '2026-11-21'] })).toEqual({
      view: 'history',
      day: null,
    });
    expect(await propsOf({ day: '2026-11-20' })).toEqual({ view: 'courses', day: null });
  });
});
