import { FC } from 'react';

import { LanguageCountrySelect } from '@/app/languages/[country]/[orderBy]/[page]/components/language-country-select';

type LanguageRankingHeaderProps = {
  country?: string;
  language: string;
  countryNames: string[];
};

export const LanguageRankingHeader: FC<LanguageRankingHeaderProps> = ({ language, country, countryNames }) => {
  const title = `${language} Language Ranking${country === 'global' ? '' : ` in ${country}`}`;

  return (
    <div className="flex justify-between items-center flex-wrap gap-4">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <LanguageCountrySelect value={country} countries={countryNames} />
    </div>
  );
};
