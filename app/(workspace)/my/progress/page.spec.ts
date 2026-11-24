import { beforeEach, describe, expect, it, vi } from 'vitest';

// The Learn page under `/my` takes its title from the gate's helper, with its own name.
const title = vi.hoisted(() => ({ learnPageMetadata: vi.fn(async (name: string) => ({ title: name })) }));
vi.mock('@/lib/workspace/learn-page-title', () => title);
vi.mock('@/components/learn/progress/progress-view', () => ({ ProgressView: () => null }));

const pages = {
  'Your progress': await import('./page'),
};

beforeEach(() => vi.clearAllMocks());

describe('the Learn page under /my', () => {
  it.each(Object.entries(pages))('%s asks for its title through the gate, with no static title', async (name, page) => {
    expect('metadata' in page).toBe(false);
    await page.generateMetadata();
    expect(title.learnPageMetadata).toHaveBeenCalledWith(name);
  });
});

describe('Your progress', () => {
  it('gives Share the address of the person’s Skills page', () => {
    const main = pages['Your progress'].default({ searchParams: Promise.resolve({}) } as PageProps<'/my/progress'>);
    const view = main.props.children.props.children;
    expect(view.props.shareUrlOf('octocat')).toMatch(/\/profile\/octocat\/skills$/);
  });
});
