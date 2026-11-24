import type { PropsWithChildren } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { bothPage } from '@/lib/skills/__fixtures__/skills';

const { loadSkillsPage, fetchProfilePageOverview, cacheLife, cacheTag, learn } = vi.hoisted(() => ({
  loadSkillsPage: vi.fn(),
  fetchProfilePageOverview: vi.fn(),
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  learn: { open: true },
}));
vi.mock('next/cache', () => ({ cacheLife, cacheTag }));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
vi.mock('@/lib/skills/skills.data', () => ({ loadSkillsPage }));
vi.mock('@/app/components/landing/landing-data', () => ({ fetchLearnForVisitors: async () => learn.open }));
vi.mock('@/graphql/helpers/fetch-profile-page-overview', () => ({ fetchProfilePageOverview }));
// The left column and the page's client layer are drawn by their own specs; this one reads what the page hands them.
vi.mock('../components/layout-left-column', () => ({
  LayoutLeftColumn: ({ children }: PropsWithChildren) => children,
}));
vi.mock('../components/skills-screen', () => ({
  SkillsScreen: (props: { login: string; learnOpen: boolean; now: Date }) => (
    <div data-screen={props.login} data-learn-open={String(props.learnOpen)} />
  ),
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
  learn.open = true;
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
    expect(html).toContain('data-learn-open="true"');
    expect(html).toContain('application/ld+json');
    expect(html).toContain('"ProfilePage"');
  });

  it('is not found, the same for everyone, without a public page or a person', async () => {
    loadSkillsPage.mockResolvedValueOnce({ value: null, failed: false });
    await expect(ProfileSkills(props('octocat'))).rejects.toThrow('NEXT_NOT_FOUND');
    fetchProfilePageOverview.mockResolvedValueOnce(null);
    await expect(ProfileSkills(props('octocat'))).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('keeps a failed read for minutes only', async () => {
    loadSkillsPage.mockResolvedValueOnce({ value: null, failed: true });
    await expect(ProfileSkills(props('octocat'))).rejects.toThrow('NEXT_NOT_FOUND');
    expect(cacheLife).toHaveBeenCalledExactlyOnceWith('minutes');
  });
});

describe("a Skills page's metadata", () => {
  it('names the person, says what they did, and points at its Markdown copy', async () => {
    const metadata = await generateMetadata(props('octocat'));
    expect(metadata.title).toEqual({ absolute: 'octocat’s skills · GitRanks' });
    expect(metadata.alternates?.canonical).toBe('/profile/octocat/skills');
    expect(JSON.stringify(metadata.alternates?.types)).toContain('/profile/octocat/skills.md');
  });

  it('is never indexed where there is no page', async () => {
    loadSkillsPage.mockResolvedValueOnce({ value: null, failed: false });
    expect(await generateMetadata(props('octocat'))).toEqual({
      title: 'No Skills page',
      robots: { index: false, follow: false },
    });
  });
});
