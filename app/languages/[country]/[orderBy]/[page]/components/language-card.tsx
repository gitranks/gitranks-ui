import type { FC } from 'react';
import { FiStar } from 'react-icons/fi';
import { PiPackage } from 'react-icons/pi';

import { LanguageCardStat } from './language-card-stat';
import { DEFAULT_LANGUAGE_COLOR, LANGUAGE } from '@/app/app.consts';
import { Link } from '@/components/link/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCard } from '@/components/user-card/user-card';
import type { CountryLanguageSummaryQuery, LanguageSummaryQuery } from '@/types/generated/graphql';
import { formatBytes } from '@/utils/format-bytes';
import { formatNumberShort } from '@/utils/format-number-short';
import { getLanguageRankingPath } from '@/utils/get-language-ranking-path';

type LanguageCardProps = {
  data: LanguageSummaryQuery['languageSummary'][number] | CountryLanguageSummaryQuery['countryLanguageSummary'][number];
  country?: string;
};

export const LanguageCard: FC<LanguageCardProps> = ({ data, country }) => {
  const { language, score, size, usersCount, languageData, topUser } = data;
  const { color } = languageData ?? {};

  return (
    <Card className="grow gap-4">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color || DEFAULT_LANGUAGE_COLOR }}></div>
            <Link href={getLanguageRankingPath(language, country ?? 'global')}>
              {language}
            </Link>
          </div>
          <div className="text-sm text-muted-foreground">{formatNumberShort(usersCount)} users</div>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-3 divide-x px-2">
        <LanguageCardStat
          value={
            <>
              <FiStar />
              {formatNumberShort(score)}
            </>
          }
          label="stars"
          tooltip={LANGUAGE.order.stars}
        />
        <LanguageCardStat
          value={
            <>
              <PiPackage />
              {formatBytes(size)}
            </>
          }
          label="size"
          tooltip={LANGUAGE.order.size}
        />
        <LanguageCardStat
          value={
            <UserCard
              login={topUser?.login}
              avatarUrl={topUser?.avatarUrl}
              size={20}
              className="font-semibold text-sm"
            />
          }
          label="leader"
        />
      </CardContent>
    </Card>
  );
};
