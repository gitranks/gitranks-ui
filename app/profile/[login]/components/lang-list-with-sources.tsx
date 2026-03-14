import type { FC } from 'react';

import { Link } from '@/components/link/link';
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { PageProfileOverviewQuery } from '@/types/generated/graphql';
import { formatNumberShort } from '@/utils/format-number-short';
import { getPercentageIcon } from '@/utils/get-percentage-icon';
import { getRepoName, getRepoUrl } from '@/utils/repositories';

export type RepoSource = {
  name: string;
  stargazerCount: number;
  percentage: number;
  year?: number | null;
};

export type ContributionSource = RepoSource & {
  prsCount: number;
  linesAdded: number;
  linesRemoved: number;
  url: string;
};

export type LanguageSource = RepoSource | ContributionSource;

type LangListWithSourcesProps = {
  languages?:
    | NonNullable<PageProfileOverviewQuery['user']>['sLangs']
    | NonNullable<PageProfileOverviewQuery['user']>['cLangs'];
  login: string;
};

const isContributionSources = (sources: LanguageSource[]): sources is ContributionSource[] =>
  sources.length > 0 && sources.every((s): s is ContributionSource => 'url' in s);

export const LangListWithSources: FC<LangListWithSourcesProps> = ({ languages, login }) => {
  if (!languages?.length) {
    return null;
  }

  const getRepoStats = (sources: LanguageSource[] | undefined | null, languageName: string) => {
    if (!sources?.length) {
      return null;
    }

    const showContributionColumns = isContributionSources(sources);
    const showYearColumn = sources.some((source) => source.year);

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Stars</TableHead>
            <TableHead>Lang %</TableHead>
            {showContributionColumns && (
              <>
                <TableHead>PRs</TableHead>
                <TableHead>Changes</TableHead>
              </>
            )}
            {showYearColumn && <TableHead>Year</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody className="text-xs">
          {sources.map((source) => {
            const pct = source.percentage * 100;
            const { Icon, fillClass } = getPercentageIcon(pct);

            return (
              <TableRow key={source.name}>
                <TableCell className="font-medium text-sm">
                  <Link target="_blank" href={getRepoUrl(source, login)}>
                    {getRepoName(source)}
                  </Link>
                </TableCell>
                <TableCell>{source.stargazerCount.toLocaleString()}</TableCell>
                <TableCell
                  className="font-semibold gap-1"
                  title={`${languageName} accounts for ${formatNumberShort(pct)}% of the code in this repository`}
                >
                  <div className="flex items-center gap-1">
                    <Icon className={cn('size-4 shrink-0', fillClass)} />
                    {formatNumberShort(pct)}
                  </div>
                </TableCell>
                {showContributionColumns && 'prsCount' in source && (
                  <>
                    <TableCell>{formatNumberShort(source.prsCount)}</TableCell>
                    <TableCell className="font-semibold gap-1">
                      <span className="text-positive">+{formatNumberShort(source.linesAdded)}</span>&nbsp;
                      <span className="text-negative">-{formatNumberShort(source.linesRemoved)}</span>
                    </TableCell>
                  </>
                )}
                {showYearColumn && <TableCell>{source.year}</TableCell>}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  const renderLanguageName = (lang: (typeof languages)[number]) => {
    if (!lang.sources?.length) {
      return <span>{lang.name}</span>;
    }

    return (
      <Popover>
        <PopoverTrigger asChild>
          <span className="underline decoration-dotted underline-offset-4 cursor-pointer">{lang.name}</span>
        </PopoverTrigger>
        <PopoverContent className="w-max">
          <PopoverHeader>
            <PopoverTitle>
              Top 5 <b>{lang.name}</b> Repositories by Lines Changed
            </PopoverTitle>
          </PopoverHeader>
          {getRepoStats(lang.sources, lang.name)}
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <>
      {languages.map((lang) => (
        <div key={lang.name} className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: lang.color ?? '#cccccc' }} />
          {renderLanguageName(lang)}
        </div>
      ))}
    </>
  );
};
