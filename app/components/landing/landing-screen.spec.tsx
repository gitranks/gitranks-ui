import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const stub =
  (name: string) =>
  ({ contribute }: { contribute?: boolean }) => (
    <div data-part={name} data-contribute={contribute === undefined ? undefined : String(contribute)} />
  );

vi.mock('@/components/header/header', () => ({ Header: stub('header') }));
vi.mock('./landing-sections', () => ({
  BadgesSection: stub('badges'),
  Container: ({ children }: { children: unknown }) => <div data-part="container">{children as never}</div>,
  FaqSection: stub('faq'),
  Hero: stub('hero'),
  InsightsSection: stub('insights'),
  InsightTicker: stub('ticker'),
  LeaderboardSection: stub('leaderboard'),
  OrganizationsSection: stub('orgs'),
  PlacesSection: stub('places'),
  SupportStrip: stub('support'),
  TiersSection: stub('tiers'),
  UpdatesSection: stub('updates'),
}));
vi.mock('./packages-section', () => ({ PackagesSection: stub('packages') }));
vi.mock('./repos-section', () => ({ ReposSection: stub('repos') }));
vi.mock('./products-block-live', () => ({ ProductsBlockLive: stub('products-block') }));

const { landingData } = await import('./__fixtures__/landing');
const { LandingScreen } = await import('./landing-screen');

/** The page's parts, top to bottom, by name. */
const partsOf = (html: string) => [...html.matchAll(/data-part="([a-z-]+)"/g)].map((match) => match[1]);

describe('LandingScreen', () => {
  it('draws the block for Contribute and Learn directly under the hero, then the packages', () => {
    const parts = partsOf(renderToStaticMarkup(<LandingScreen {...landingData} contribute />));
    expect(parts.slice(0, 6)).toEqual(['header', 'ticker', 'hero', 'products-block', 'container', 'packages']);
    expect(parts.filter((part) => part === 'products-block')).toHaveLength(1);
  });

  it('tells the block whether Contribute is launched, so its card is drawn only then', () => {
    expect(renderToStaticMarkup(<LandingScreen {...landingData} contribute />)).toContain(
      'data-part="products-block" data-contribute="true"',
    );
    expect(renderToStaticMarkup(<LandingScreen {...landingData} contribute={false} />)).toContain(
      'data-part="products-block" data-contribute="false"',
    );
  });

  it('keeps the block under the hero when no package ranking could be read', () => {
    const parts = partsOf(renderToStaticMarkup(<LandingScreen {...landingData} packages={null} contribute />));
    expect(parts.slice(0, 6)).toEqual(['header', 'ticker', 'hero', 'products-block', 'container', 'leaderboard']);
  });
});
