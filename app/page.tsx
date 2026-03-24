import { BadgeSection } from './components/badge-section';
import { CountryRankingSection } from './components/country-ranking-section';
import { GlobalRankingSection } from './components/global-ranking-section';
import { LanguageRankingSection } from './components/language-ranking-section';
import { MessengerIntegrationSection } from './components/messenger-integration-section';
import { SearchProfile } from './components/search-profile';
import { Header } from '@/components/header/header';
import InsightsCarousel from '@/components/insight/insights-carousel';
import { Link } from '@/components/link/link';
import { Page } from '@/components/page/page';

export default function Home() {
  return (
    <>
      <div className="border-b bg-linear-45 from-background to-80% to-landing-page-gradient-start-color">
        <Header />
        <Page className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0">
            <div className="flex flex-col gap-4 p-4 pb-5 md:pb-16 md:pt-16">
              <h1 className="text-3xl sm:text-4xl font-semibold">GitHub Analytics and Rankings</h1>
              <div className="flex flex-col gap-1">
                <h2>
                  The most complete and accurate rankings of developers across the GitHub ecosystem. See where you rank:
                </h2>
                <SearchProfile />
              </div>
            </div>
            <div className="flex flex-col justify-center gap-4 md:ml-10 p-4 pt-5 md:pt-4">
              <div className="flex gap-2 z-1 relative items-baseline">
                <h2 className="text-xl md:text-xl font-semibold">Social Media Posts</h2>
                <Link href="/insights" className="text-sm">
                  Show all
                </Link>
              </div>
              <InsightsCarousel />
            </div>
          </div>
        </Page>
      </div>

      <Page className="gap-4">
        <GlobalRankingSection />
        <LanguageRankingSection />
        <CountryRankingSection />
        <BadgeSection />
        <MessengerIntegrationSection />
      </Page>
    </>
  );
}
