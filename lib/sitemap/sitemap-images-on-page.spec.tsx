import type { ComponentProps, ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { listOrgImageUrls, listProfileImageUrls, listRepoImageUrls, sitemapImageLoc } from './badge-images';
import { LayoutLeftColumn as OrgLayout } from '@/app/org/[login]/components/layout-left-column';
import { LayoutLeftColumn as ProfileLayout } from '@/app/profile/[login]/components/layout-left-column';
import { RepoLayout } from '@/app/repo/[owner]/[name]/components/repo-layout';
import type { EntityFacts, OrgFacts, RepoFacts, UserFacts } from '@/badge/v3/facts';
import { NOW, orgBig, orgMid, repoBig, repoMid, userBig, userMid, userSmall, userUnranked } from '@/badge/v3/fixtures';
import { BadgesCard } from '@/components/badges-card/badges-card';

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status: 'unauthenticated' }),
  signIn: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => '/',
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}));

/**
 * Google takes a sitemap's images as the page's only when the page draws them. Each fixture page here is drawn as its
 * route draws it, the layout with its main image and the Badges card, and every image its sitemap entry lists must be
 * one of the page's `<img src>`s that a light page shows (the dark copies are hidden).
 */

const shownImages = (html: string): string[] =>
  [...html.matchAll(/<img\b[^>]*>/g)]
    .map(([tag]) => tag)
    .filter((tag) => !/class="[^"]*\bhidden dark:block\b/.test(tag))
    .map((tag) => /\bsrc="([^"]+)"/.exec(tag)?.[1].replaceAll('&amp;', '&'))
    .filter((src): src is string => !!src)
    .map(sitemapImageLoc);

const badges = (entity: EntityFacts) => <BadgesCard entity={entity} now={NOW} />;

const renderProfile = (facts: UserFacts) =>
  renderToStaticMarkup(
    <ProfileLayout
      user={
        {
          login: facts.login,
          name: 'Octo Dev',
          avatarUrl: 'https://avatars.githubusercontent.com/u/1?v=4',
          githubCreatedAt: '2015-01-01T00:00:00Z',
          githubFetchedAt: NOW.toISOString(),
          updatedAt: NOW.toISOString(),
          organizations: [],
        } as unknown as ComponentProps<typeof ProfileLayout>['user']
      }
    >
      {badges(facts)}
    </ProfileLayout>,
  );

const renderRepo = (
  facts: RepoFacts,
  children: ReactNode = badges(facts),
  ownerAvatarUrl: string | null = 'https://avatars.githubusercontent.com/u/2?v=4',
) => {
  const [owner, name] = facts.nameWithOwner.split('/');
  return renderToStaticMarkup(
    <RepoLayout
      repo={
        {
          owner,
          name,
          nameWithOwner: facts.nameWithOwner,
          ownerAvatarUrl,
          stars: facts.stars,
          isInOrganization: true,
          createdAt: '2020-01-01T00:00:00Z',
          rank: facts.rank,
        } as unknown as ComponentProps<typeof RepoLayout>['repo']
      }
    >
      {children}
    </RepoLayout>,
  );
};

const renderOrg = (facts: OrgFacts) =>
  renderToStaticMarkup(
    <OrgLayout
      org={
        {
          login: facts.login,
          name: 'Nebula',
          avatarUrl: 'https://avatars.githubusercontent.com/u/3?v=4',
          githubCreatedAt: '2015-01-01T00:00:00Z',
          updatedAt: NOW.toISOString(),
          usersCount: 12,
        } as unknown as ComponentProps<typeof OrgLayout>['org']
      }
    >
      {badges(facts)}
    </OrgLayout>,
  );

describe('sitemap images are on their pages', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_URI', 'https://example.test');
  });

  it.each([
    ['under 100 stars', userSmall],
    ['100–1k stars', userMid],
    ['1k+ stars', userBig],
    ['in no ranking', userUnranked],
  ])("a developer's page (%s)", (_, facts) => {
    const listed = listProfileImageUrls(facts.login, facts);
    const shown = shownImages(renderProfile(facts));

    expect(listed.length).toBeGreaterThan(0);
    expect(shown).toEqual(expect.arrayContaining(listed));
  });

  it.each([
    ['with its star history, stargazers and contributors', repoBig],
    [
      'without them: a 1k+ repository GitRanks has not read',
      { ...repoBig, history: null, starsBest: null, pulse: null } satisfies RepoFacts,
    ],
  ])('a listed repository’s page (%s)', (_, facts) => {
    const listed = listRepoImageUrls(facts.nameWithOwner);
    const shown = shownImages(renderRepo(facts));

    expect(listed).toHaveLength(2);
    expect(shown).toEqual(expect.arrayContaining(listed));
  });

  it("draws a repository owner's avatar without a stored avatar URL too, as the sitemap lists it", () => {
    const shown = shownImages(renderRepo(repoBig, badges(repoBig), null));

    expect(shown).toEqual(expect.arrayContaining(listRepoImageUrls(repoBig.nameWithOwner)));
  });

  it('draws no broken main image for an organization without a login', () => {
    const html = renderToStaticMarkup(
      <OrgLayout
        org={
          {
            login: null,
            name: 'Nebula',
            githubCreatedAt: '2015-01-01T00:00:00Z',
            updatedAt: NOW.toISOString(),
          } as unknown as ComponentProps<typeof OrgLayout>['org']
        }
      >
        {null}
      </OrgLayout>,
    );

    expect(html).not.toContain('/api/avatar/');
  });

  it("draws a repository's star history only once it is read, so the sitemap leaves it out", () => {
    const unread = shownImages(renderRepo({ ...repoBig, history: null }));

    expect(shownImages(renderRepo(repoBig)).join()).toContain('star-history');
    expect(unread.join()).not.toContain('star-history');
    expect(repoMid.history).toBeNull();
  });

  it.each([
    ['1k–10k stars', orgMid],
    ['10k+ stars', orgBig],
  ])('a listed organization’s page (%s)', (_, facts) => {
    const listed = listOrgImageUrls(facts.login);
    const shown = shownImages(renderOrg(facts));

    expect(listed).toHaveLength(3);
    expect(shown).toEqual(expect.arrayContaining(listed));
  });

  it('draws the main image from this site, with descriptive alt text and its size', () => {
    const html = renderOrg(orgBig);

    expect(html).toMatch(
      /<img[^>]*alt="GitHub logo of Nebula \(@nebula\)"[^>]*width="288" height="288"[^>]*src="\/api\/avatar\/nebula"/,
    );
    expect(renderProfile(userBig)).toContain('alt="GitHub avatar of Octo Dev (@octo-dev)"');
    expect(renderRepo(repoBig)).toContain('alt="GitHub avatar of nebula, owner of nebula/ui"');
    for (const page of [renderOrg(orgBig), renderProfile(userBig), renderRepo(repoBig)]) {
      expect(page).not.toContain('avatars.githubusercontent.com');
      expect(page).toMatch(/<img[^>]*fetchPriority="high"[^>]*src="\/api\/avatar\//);
    }
  });
});
