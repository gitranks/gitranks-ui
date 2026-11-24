import { beforeEach, describe, expect, it, vi } from 'vitest';

// The Learn page under `/my` takes its title from the gate's helper, with its own name.
const title = vi.hoisted(() => ({ learnPageMetadata: vi.fn(async (name: string) => ({ title: name })) }));
vi.mock('@/lib/workspace/learn-page-title', () => title);
vi.mock('@/components/learn/progress/progress-view', () => ({ ProgressView: () => null }));
const skills = vi.hoisted(() => ({ loadSkillsTab: vi.fn() }));
vi.mock('@/lib/skills/skills.data', () => skills);

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
  /** The Share read the page gives its view. */
  const loadShare = () => {
    const main = pages['Your progress'].default({ searchParams: Promise.resolve({}) } as PageProps<'/my/progress'>);
    return main.props.children.props.children.props.loadShare as (login: string) => Promise<unknown>;
  };

  it('reads Share from the person’s own view of their Skills page', async () => {
    skills.loadSkillsTab.mockResolvedValueOnce({ state: 'HIDDEN', tabNew: false });
    await expect(loadShare()('octocat')).resolves.toEqual({ state: 'hidden', path: '/profile/octocat/skills' });
    expect(skills.loadSkillsTab).toHaveBeenCalledWith('octocat');
  });

  it('leaves Share out when the Skills page could not be read', async () => {
    skills.loadSkillsTab.mockResolvedValueOnce(null);
    await expect(loadShare()('octocat')).resolves.toBeNull();
  });
});
