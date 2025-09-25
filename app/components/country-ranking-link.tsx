import LinkNext from 'next/link';

import { Link } from '@/components/link/link';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { CountrySummaryQuery } from '@/types/generated/graphql';

export const CountryRankingLink = ({
  countrySummaries,
}: {
  countrySummaries: CountrySummaryQuery['countrySummary'];
}) => {
  return (
    <Card className="flex-grow gap-4">
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(2.25rem,1fr))] auto-rows-[2.25rem] gap-1 overflow-hidden h-[calc(2.25rem*3+0.25rem*2)]">
          {countrySummaries.slice(2, 44).map((countrySummary) => {
            const {
              country: countryName,
              countryData: { flag },
            } = countrySummary;

            return (
              <Tooltip key={countryName}>
                <TooltipTrigger asChild>
                  <LinkNext href={`/country/${countryName}/stars/1`} className="flex items-center justify-center">
                    {flag}
                  </LinkNext>
                </TooltipTrigger>
                <TooltipContent>{countryName}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        <div className="flex flex-grow items-center justify-end">
          <Link href="/countries/stars/1">Browse All Countries</Link>
        </div>
      </CardContent>
    </Card>
  );
};
