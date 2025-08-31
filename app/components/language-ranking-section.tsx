import { FaCode } from 'react-icons/fa';

import { PageGrid } from '@/components/grid/grid';
import { NewBadge } from '@/components/new-badge/new-badge';
import { fetchLanguageSummaries } from '@/graphql/helpers/fetch-language-summary';
import { LanguageSummaryOrder } from '@/types/generated/graphql';

import { LanguageRankingLink } from './language-ranking-link';
import { LanguageCard } from '../languages/[country]/[orderBy]/[page]/components/language-card';

export const LanguageRankingSection = async () => {
  const languageSummaries = await fetchLanguageSummaries({ order: LanguageSummaryOrder.Score, offset: 0, limit: 8 });

  return (
    <div className="flex flex-col gap-4 grow py-8">
      <h2 className="text-2xl md:text-3xl font-semibold flex items-center gap-4">
        <FaCode /> Language Rankings <NewBadge />
      </h2>
      <div>
        See which programming languages are the most popular worldwide. Browse detailed summaries by stars and code size
        - and dive into rankings for each language, globally or by country.
      </div>
      <PageGrid>
        {languageSummaries.slice(0, 2).map((languageSummary) => (
          <LanguageCard key={languageSummary.language} data={languageSummary} country="global" />
        ))}
        <LanguageRankingLink languageSummaries={languageSummaries} />
      </PageGrid>
    </div>
  );
};
