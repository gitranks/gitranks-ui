import { beforeEach, describe, expect, it, vi } from 'vitest';

// The two Learn pages under `/my` take their title from one helper, each with its own name.
const title = vi.hoisted(() => ({ learnPageMetadata: vi.fn(async (name: string) => ({ title: name })) }));
vi.mock('@/lib/workspace/learn-page-title', () => title);
vi.mock('@/components/learn/progress/progress-view', () => ({ ProgressView: () => null }));
vi.mock('@/app/(workspace)/my/settings/components/settings-pages', () => ({ GoalSettingsView: () => null }));

const pages = {
  'Your progress': await import('./page'),
  'Goal and level': await import('../settings/goal/page'),
};

beforeEach(() => vi.clearAllMocks());

describe('the Learn pages under /my', () => {
  it.each(Object.entries(pages))('%s asks for its title through the gate, with no static title', async (name, page) => {
    expect('metadata' in page).toBe(false);
    await page.generateMetadata();
    expect(title.learnPageMetadata).toHaveBeenCalledWith(name);
  });
});
