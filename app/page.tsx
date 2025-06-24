import { Header } from '@/components/header/header';
import { Page } from '@/components/page/page';

import { BadgeSection } from './components/badge-section';
import { CountryRankingSection } from './components/country-ranking-section';
import { GlobalRankingSection } from './components/global-ranking-section';
import { MessengerIntegrationSection } from './components/messenger-integration-section';
import { SearchProfile } from './components/search-profiile';
import MainImage from './main-image';

export default function Home() {
  return (
    <>
      <div className="border-b bg-linear-45 from-background to-80% to-landing-page-gradient-start-color">
        <Header />
        <Page>
          <div className="flex flex-col md:flex-row gap-4 grow items-center">
            <div className="flex flex-col gap-4 md:max-w-lg">
              <h1 className="text-3xl sm:text-4xl font-semibold">
                Your GitHub Profile is More Impressive Than You Think
              </h1>
              <div>Just one repo with 5 stars puts you ahead of 95% of developers. See where you rank:</div>
              <SearchProfile />
            </div>
            <div className="flex flex-grow items-center justify-center w-full md:w-auto min-w-xs">
              <MainImage />
            </div>
          </div>
        </Page>
      </div>
      <Page className="gap-4">
        <GlobalRankingSection />
        <CountryRankingSection />
        <MessengerIntegrationSection />
        <BadgeSection />
      </Page>
    </>
  );
}
