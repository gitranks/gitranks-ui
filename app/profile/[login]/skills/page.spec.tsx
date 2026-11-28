import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { bothPage } from '@/lib/skills/__fixtures__/skills';

const { loadSkillsPage, fetchProfilePageOverview, cacheLife, cacheTag } = vi.hoisted(() => ({
  loadSkillsPage: vi.fn(),
  fetchProfilePageOverview: vi.fn(),
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));
vi.mock('next/cache', () => ({ cacheLife, cacheTag }));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
vi.mock('@/lib/skills/skills.data', () => ({ loadSkillsPage }));
vi.mock('@/graphql/helpers/fetch-profile-page-overview', () => ({ fetchProfilePageOverview }));
// The page's client layer is drawn by its own specs; this one reads what the page hands it.
vi.mock('../components/skills-screen', () => ({
  SkillsScreen: (props: { login: string; now: Date }) => <div data-screen={props.login} />,
}));
vi.mock('../components/skills-owner', () => ({ SkillsHeading: () => <h2>Skills</h2> }));
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_URI = 'https://gitranks.com';
});

const { default: ProfileSkills, generateMetadata } = await import('./page');

type Props = Parameters<typeof ProfileSkills>[0];
const props = (login: string) => ({ params: Promise.resolve({ login }) }) as unknown as Props;
const user = { login: 'octocat', name: 'The Octocat' };

beforeEach(() => {
  vi.clearAllMocks();
  fetchProfilePageOverview.mockResolvedValue(user);
  loadSkillsPage.mockResolvedValue({ value: bothPage, failed: false });
});

describe("a person's Skills page", () => {
  it('draws the page with its structured data, kept fifteen minutes under the person and the page tags', async () => {
    const html = renderToStaticMarkup(await ProfileSkills(props('OctoCat')));
    expect(cacheTag).toHaveBeenCalledWith('profile:octocat', 'skills:octocat');
    expect(cacheLife).toHaveBeenCalledExactlyOnceWith({ stale: 300, revalidate: 900, expire: 86_400 });
    expect(html).toContain('<h2>Skills</h2>');
    expect(html).toContain('data-screen="OctoCat"');
    expect(html).toContain('application/ld+json');
    expect(html).toContain('"ProfilePage"');
  });

  it('is not found, the same for everyone, without a public page or a person, kept only for minutes', async () => {
    loadSkillsPage.mockResolvedValueOnce({ value: null, failed: false });
    await expect(ProfileSkills(props('octocat'))).rejects.toThrow('NEXT_NOT_FOUND');
    expect(cacheLife).toHaveBeenCalledExactlyOnceWith('minutes');
    cacheLife.mockClear();
    fetchProfilePageOverview.mockResolvedValueOnce(null);
    await expect(ProfileSkills(props('octocat'))).rejects.toThrow('NEXT_NOT_FOUND');
    expect(cacheLife).toHaveBeenCalledExactlyOnceWith('minutes');
  });

  it('shows the error page on a failed read, never "no Skills page"', async () => {
    loadSkillsPage.mockResolvedValueOnce({ value: null, failed: true });
    await expect(ProfileSkills(props('octocat'))).rejects.toThrow('The Skills page of octocat could not be read.');
    expect(cacheLife).not.toHaveBeenCalled();
  });

  it('keeps a failed read during the build as "not found" for minutes, so the build goes on', async () => {
    vi.stubEnv('NEXT_PHASE', 'phase-production-build');
    loadSkillsPage.mockResolvedValueOnce({ value: null, failed: true });
    await expect(ProfileSkills(props('octocat'))).rejects.toThrow('NEXT_NOT_FOUND');
    expect(cacheLife).toHaveBeenCalledExactlyOnceWith('minutes');
    vi.unstubAllEnvs();
  });
});

describe("a Skills page's metadata", () => {
  it('names the person, says what they did, and points at its Markdown copy', async () => {
    const metadata = await generateMetadata(props('octocat'));
    expect(metadata.title).toEqual({ absolute: 'octocat’s skills · GitRanks' });
    expect(metadata.alternates?.canonical).toBe('/profile/octocat/skills');
    expect(JSON.stringify(metadata.alternates?.types)).toContain('/profile/octocat/skills.md');
  });

  it('names the page, never indexed, when it cannot be read', async () => {
    loadSkillsPage.mockResolvedValueOnce({ value: null, failed: true });
    expect(await generateMetadata(props('octocat'))).toEqual({
      title: { absolute: 'octocat’s skills · GitRanks' },
      robots: { index: false, follow: false },
    });
  });

  it('is never indexed where there is no page', async () => {
    loadSkillsPage.mockResolvedValueOnce({ value: null, failed: false });
    expect(await generateMetadata(props('octocat'))).toEqual({
      title: 'No Skills page',
      robots: { index: false, follow: false },
    });
  });
});
