import type { FC } from 'react';
import { FiStar } from 'react-icons/fi';
import { PiPackage } from 'react-icons/pi';

import { LanguageCardStat } from '@/app/languages/[country]/[orderBy]/[page]/components/language-card-stat';
import { Link } from '@/components/link/link';
import { RepoLink } from '@/components/repo-link/repo-link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { RepoLanguagesQuery } from '@/types/generated/graphql';
import { formatNumberShort } from '@/utils/format-number-short';
import { getRepoLanguageRankingPath } from '@/utils/repo-paths';

type RepoLanguageCardProps = {
  data: RepoLanguagesQuery['repoLanguages'][number];
};

export const RepoLanguageCard: FC<RepoLanguageCardProps> = ({ data }) => {
  const { language, repos, stars, topRepo } = data;

  return (
    <Card className="grow gap-4">
      <CardHeader>
        <CardTitle>
          <Link href={getRepoLanguageRankingPath(language)}>{language ?? 'No language'}</Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-3 divide-x px-2">
        <LanguageCardStat
          value={
            <>
              <PiPackage />
              {formatNumberShort(repos)}
            </>
          }
          label="repositories"
        />
        <LanguageCardStat
          value={
            <>
              <FiStar />
              {formatNumberShort(stars)}
            </>
          }
          label="stars"
        />
        <LanguageCardStat
          value={
            topRepo ? (
              <RepoLink
                nameWithOwner={topRepo.nameWithOwner}
                ownerAvatarUrl={topRepo.ownerAvatarUrl}
                size={20}
                className="font-semibold text-sm min-w-0 [&>span]:truncate"
              />
            ) : null
          }
          label="leader"
        />
      </CardContent>
    </Card>
  );
};
