import { CountryCard } from '@/components/country-card/country-card';
import { fetchCountrySummaries } from '@/graphql/helpers/fetch-country-summaries';

import { CountryRankingLink } from './country-ranking-link';

export const CountryRankingSection = async () => {
  const countrySummaries = await fetchCountrySummaries();

  return (
    <div className="flex flex-col gap-4 grow py-8">
      <h2 className="text-2xl md:text-3xl font-semibold flex items-center gap-2">Country Rankings</h2>
      <div>
        Curious how you rank at home? Explore country-specific leaderboards to see the top developers in your nation,
        track your own standing, and celebrate local talent as it rises on the global stage.
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(364px,1fr))] gap-4">
        {countrySummaries.slice(0, 2).map((countrySummary) => (
          <CountryCard key={countrySummary.country} countrySummary={countrySummary} />
        ))}
        <CountryRankingLink countrySummaries={countrySummaries} />
      </div>
    </div>
  );
};
