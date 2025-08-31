import { Header } from '@/components/header/header';
import { Page } from '@/components/page/page';

import { BadgeSection } from './components/badge-section';
import { CountryRankingSection } from './components/country-ranking-section';
import { GlobalRankingSection } from './components/global-ranking-section';
import InsightsCarousel from './components/insights-carousel';
import { LanguageRankingSection } from './components/language-ranking-section';
import { MessengerIntegrationSection } from './components/messenger-integration-section';
import { SearchProfile } from './components/search-profiile';

export default function Home() {
  return (
    <>
      <div className="border-b bg-linear-45 from-background to-80% to-landing-page-gradient-start-color">
        <Header />
        <Page className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0">
            <div className="flex flex-col gap-4 p-4 pb-5 md:pb-16 md:pt-16">
              <h1 className="text-3xl sm:text-4xl font-semibold">
                Your GitHub Profile is More Impressive Than You Think
              </h1>
              <div className="flex flex-col gap-1">
                See where you rank:
                <SearchProfile />
              </div>
            </div>
            <div className="flex flex-col justify-center md:ml-10 p-4 pt-5 md:pt-4">
              <h2 className="text-xl md:text-2xl font-semibold z-1 relative">Top Insights</h2>
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
