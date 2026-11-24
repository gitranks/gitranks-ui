import type { PropsWithChildren } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchProfilePageOverview, cacheLife, cacheTag } = vi.hoisted(() => ({
  fetchProfilePageOverview: vi.fn(),
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));
vi.mock('next/cache', () => ({ cacheLife, cacheTag }));
vi.mock('@/graphql/helpers/fetch-profile-page-overview', () => ({ fetchProfilePageOverview }));
// The columns are drawn by their own specs; this one reads which column the tab's content, found or not, sits in.
vi.mock('../components/layout-left-column', () => ({
  LayoutLeftColumn: ({ user, children }: PropsWithChildren<{ user: { name: string; login: string } }>) => (
    <div data-column={`${user.name} @${user.login}`}>{children}</div>
  ),
}));
vi.mock('../components/skills-missing-screen', () => ({
  SkillsMissingScreen: () => <p data-skills-missing="" />,
  SkillsLoginColumn: ({ login, children }: PropsWithChildren<{ login: string }>) => (
    <div data-login-column={login}>{children}</div>
  ),
}));

vi.mock('../components/skills-owner', () => ({
  SkillsOwnerProvider: ({ login, children }: PropsWithChildren<{ login: string }>) => (
    <div data-owner={login}>{children}</div>
  ),
}));

const { default: SkillsLayout } = await import('./layout');
const { default: SkillsNotFound } = await import('./not-found');

type Props = Parameters<typeof SkillsLayout>[0];
const draw = async (login: string) =>
  renderToStaticMarkup(
    await SkillsLayout({ params: Promise.resolve({ login }), children: <SkillsNotFound /> } as unknown as Props),
  );

beforeEach(() => {
  vi.clearAllMocks();
  fetchProfilePageOverview.mockResolvedValue({ login: 'octocat', name: 'The Octocat' });
});

describe("a Skills address's layout", () => {
  it("draws the profile's full left column, and the owner's layer, around a page with no public Skills page", async () => {
    const html = await draw('octocat');
    expect(fetchProfilePageOverview).toHaveBeenCalledWith('octocat');
    expect(html).toBe(
      '<div data-column="The Octocat @octocat"><div data-owner="octocat"><p data-skills-missing=""></p></div></div>',
    );
  });

  it("keeps the column under the person's tag, never the Skills page's, so hiding the page does not touch it", async () => {
    await draw('octocat');
    expect(cacheTag).toHaveBeenCalledExactlyOnceWith('profile:octocat');
    expect(cacheLife).toHaveBeenCalledExactlyOnceWith('hours');
  });

  it('keeps the avatar and the login for a login with no profile here', async () => {
    fetchProfilePageOverview.mockResolvedValueOnce(null);
    expect(await draw('octo%2Dcat')).toBe(
      '<div data-login-column="octo-cat"><div data-owner="octo-cat"><p data-skills-missing=""></p></div></div>',
    );
  });
});
