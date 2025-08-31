import { VscGlobe } from 'react-icons/vsc';

import { Link } from '@/components/link/link';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

import { RANK_DESCRIPTIONS } from '../app.consts';

export const GlobalRankingSection = () => {
  return (
    <div className="flex flex-col gap-4 grow py-8">
      <h2 className="text-2xl md:text-3xl font-semibold flex gap-4 items-center">
        <VscGlobe /> Global Rankings
      </h2>
      <div>
        Discover your developer superpower! Explore ranks based on stars, followers, contributions, and more. Dive into
        dynamic leaderboards and find out how you measure up against developers worldwide.
      </div>
      <div className="flex flex-col md:flex-row gap-4">
        <Card className="flex-grow gap-4">
          <CardHeader>
            <CardTitle>{RANK_DESCRIPTIONS.s.title}ing</CardTitle>
            <CardDescription>{RANK_DESCRIPTIONS.s.descriptionList}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/by/stars/1">View</Link>
          </CardFooter>
        </Card>
        <Card className="flex-grow gap-4">
          <CardHeader>
            <CardTitle>{RANK_DESCRIPTIONS.c.title}ing</CardTitle>
            <CardDescription>{RANK_DESCRIPTIONS.c.descriptionList}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/by/contributions/1">View</Link>
          </CardFooter>
        </Card>
        <Card className="flex-grow gap-4">
          <CardHeader>
            <CardTitle>{RANK_DESCRIPTIONS.f.title}ing</CardTitle>
            <CardDescription>{RANK_DESCRIPTIONS.f.descriptionList}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/by/followers/1">View</Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
