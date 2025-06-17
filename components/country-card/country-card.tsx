import { FC } from 'react';

import { CountrySummaryQuery } from '@/types/generated/graphql';
import { formatNumberShort } from '@/utils/format-number-short';

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { CountryCardStat } from './components/country-card-stat';
import { Link } from '../link/link';

const TOOLTIPS = {
  s: 'Stars on repos owned by developers from this country',
  c: 'Stars on external repos where devs from this country have pull requests merged',
  f: 'Combined GitHub followers of all developers from this country',
};

export const CountryCard: FC<{ countrySummary: CountrySummaryQuery['countrySummary'][number] }> = ({
  countrySummary,
}) => {
  const {
    country: countryName,
    usersCount,
    s,
    c,
    f,
    topUsers,
    countryData: { flag },
  } = countrySummary;

  return (
    <Card className="flex-grow gap-4">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <div>
            {flag}{' '}
            <Link href={`/country/${countryName}/stars/1`} prefetch={false}>
              {countryName}
            </Link>
          </div>
          <div className="text-sm text-muted-foreground">{formatNumberShort(usersCount)} users</div>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-3 divide-x">
        <CountryCardStat
          emoji="⭐"
          value={s}
          label="user stars"
          topUserLabel="Rockstar"
          topUser={topUsers?.s}
          tooltip={TOOLTIPS.s}
        />
        <CountryCardStat
          emoji="🔀"
          value={c}
          label="contrib stars"
          topUserLabel="Contributor"
          topUser={topUsers?.c}
          tooltip={TOOLTIPS.c}
        />
        <CountryCardStat
          emoji="👥"
          value={f}
          label="followers"
          topUserLabel="Influencer"
          topUser={topUsers?.f}
          tooltip={TOOLTIPS.f}
        />
      </CardContent>
    </Card>
  );
};
