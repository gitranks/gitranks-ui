'use cache';

import { ChevronRight } from 'lucide-react';
import { unstable_cacheLife as cacheLife, unstable_cacheTag as cacheTag } from 'next/cache';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Button } from '@/components/ui/button';

import { RankCard } from './components/rank-card';
import { getBestRankType } from './utils/get-best-rank-type';
import { fetchProfileData } from '../../../../graphql/helpers/fetch-profile-data';
import { LayoutLeftColumn } from '../components/layout-left-column';
import { ProfileRankingSwitcher } from './components/profile-ranking-switcher';
import { ProfileCardsGrid } from '../components/profile-card';

export default async function ProfileRanks({ params }: { params: Promise<{ login: string }> }) {
  const { login } = await params;
  cacheLife('hours');
  cacheTag(`profile:${login}`);

  const { user } = await fetchProfileData(login);

  if (!user) {
    notFound();
  }

  const { s, c, cM, f, sProvisional, cProvisional, fProvisional, sM, fM } = user.rankGlobal ?? {};

  const bestRankType = getBestRankType({ s, c, f });

  return (
    <LayoutLeftColumn user={user}>
      <>
        <ProfileRankingSwitcher login={login} ranking="global" />
        <ProfileCardsGrid>
          <RankCard
            rank={s}
            rankM={sM}
            rankProvisional={sProvisional}
            title="Stars rank"
            entityValue={user.s}
            entityName="stars"
            description="Rank is based on the total number of stars across repositories owned by the user."
          />
          <RankCard
            rank={f}
            rankM={fM}
            rankProvisional={fProvisional}
            showDelta={false}
            title="Followers rank"
            entityValue={user.f}
            entityName="followers"
            description="Rank is based on the number of followers the user has on GitHub."
          />
          <RankCard
            rank={c}
            rankM={cM}
            rankProvisional={cProvisional}
            title="Contributor rank"
            entityValue={user.c}
            entityName="stars"
            description="Rank is based on the total number of stars across repositories where the user has merged pull requests —
              excluding their own repositories."
          />
          <div className="flex p-0 md:p-4 min-w-xs flex-grow basis-0 shrink-0 items-center justify-center">
            <div className="flex flex-col gap-2 items-start">
              <div className="font-semibold">Put Your Rank on Display</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/badge/${login}?rankingType=${bestRankType}&template=small&theme=light`}
                alt="github badge"
              />
              <Button asChild className="mt-2">
                <Link href={`/badge/${login}?rankingType=${bestRankType}&template=small`}>
                  Get a Badge
                  <ChevronRight />
                </Link>
              </Button>
            </div>
          </div>
        </ProfileCardsGrid>
        {/* <div className="text-sm text-muted-foreground mt-6 italic">
          User ranks show how a user compare to other GitHub users across different metrics — like repository stars,
          contribution activity, and more. Ranks are recalculated daily.
        </div> */}
      </>
    </LayoutLeftColumn>
  );
}
