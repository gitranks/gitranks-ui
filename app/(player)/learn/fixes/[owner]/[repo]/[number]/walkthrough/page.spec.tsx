import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadWalkthrough, loadFixPage, notFound } = vi.hoisted(() => ({
  loadWalkthrough: vi.fn(),
  loadFixPage: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ notFound }));
vi.mock('@/lib/learn/walkthrough.data', () => ({ loadWalkthrough }));
vi.mock('@/lib/learn/fix-page.data', () => ({ loadFixPage }));
vi.mock('@/components/learn/walkthrough/walkthrough-player', () => ({ PublicWalkthroughPlayer: () => null }));
vi.mock('@/components/learn/walkthrough/walkthrough-not-here', () => ({ WalkthroughNotHere: () => null }));

const { default: WalkthroughPage, generateMetadata } = await import('./page');
const { walkthrough, walkthroughNoLesson } = await import('@/lib/learn/__fixtures__/walkthrough');

const props = (number = '57') => ({
  params: Promise.resolve({ owner: 'acme', repo: 'widgets', number }),
});
type Player = { pr: unknown; version: number; questions: unknown[]; articles: unknown[]; next: string };
const drawn = async (number?: string) => {
  const page = (await WalkthroughPage(props(number))) as ReactElement<{ children: ReactElement[] }>;
  return page.props.children;
};

beforeEach(() => {
  loadWalkthrough.mockReset();
  loadFixPage.mockReset();
  loadFixPage.mockResolvedValue(null);
});

describe("a fix's public walkthrough page", () => {
  it('draws every part with its keyed question and its structured data, indexed', async () => {
    loadWalkthrough.mockResolvedValue(walkthrough);
    const [jsonLd, player] = await drawn();
    expect((jsonLd as ReactElement<{ payloads: unknown[] }>).props.payloads).toHaveLength(2);
    const live = (player as ReactElement<Player>).props;
    expect(live.pr).toEqual({ nameWithOwner: 'acme/widgets', number: 57 });
    expect(live.version).toBe(3);
    expect(live.articles).toHaveLength(4);
    expect(live.questions).toHaveLength(4);
    expect(live.next).toBe('/learn/lessons/validate-input/real-world');
    expect(loadWalkthrough).toHaveBeenCalledWith({ nameWithOwner: 'acme/widgets', number: 57 });
    const metadata = await generateMetadata(props());
    expect(metadata.title).toBe('Fix walkthrough: Saving a widget with an empty name breaks the list');
    expect(metadata.robots).toBeUndefined();
  });

  it('hands the box about the fix how it stands, and nothing when that read fails', async () => {
    loadWalkthrough.mockResolvedValue(walkthrough);
    const stand = { repo: 'acme/widgets', number: 57, made: 'LEARN', state: 'CLOSED' };
    loadFixPage.mockResolvedValueOnce(stand);
    const aboutOf = async () =>
      ((await drawn())[1] as ReactElement<{ about: ReactElement<{ fix: unknown }> }>).props.about.props.fix;
    expect(await aboutOf()).toBe(stand);
    expect(loadFixPage).toHaveBeenCalledWith({ nameWithOwner: 'acme/widgets', number: 57 });
    loadFixPage.mockRejectedValueOnce(new Error('down'));
    expect(await aboutOf()).toBeNull();
  });

  it('leads a finished fix that used no lesson to Issues', async () => {
    loadWalkthrough.mockResolvedValue(walkthroughNoLesson);
    const [, player] = await drawn();
    expect((player as ReactElement<Player>).props.next).toBe('/learn/issues');
  });

  it('says in place that a walkthrough the read does not bring is not open, never indexed', async () => {
    loadWalkthrough.mockResolvedValue(null);
    const page = (await WalkthroughPage(props())) as ReactElement<{ pr: unknown }>;
    expect(page.props.pr).toEqual({ nameWithOwner: 'acme/widgets', number: 57 });
    expect((await generateMetadata(props())).robots).toEqual({ index: false, follow: false });
  });

  it('is not there for an address that names no pull request, without asking', async () => {
    await expect(WalkthroughPage(props('x'))).rejects.toThrow('NEXT_NOT_FOUND');
    expect(loadWalkthrough).not.toHaveBeenCalled();
  });
});
