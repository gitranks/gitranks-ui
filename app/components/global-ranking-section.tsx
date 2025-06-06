import { Link } from '@/components/link/link';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export const GlobalRankingSection = () => {
  return (
    <div className="flex flex-col gap-4 grow py-8">
      <h2 className="text-2xl md:text-3xl font-semibold">Global Rankings</h2>
      <div>
        Discover your developer superpower! Explore ranks based on stars, followers, contributions, and more. Dive into
        dynamic leaderboards and find out how you measure up against developers worldwide.
      </div>
      <div className="flex flex-col md:flex-row gap-4">
        <Card className="flex-grow border-border gap-4">
          <CardHeader>
            <CardTitle>Star ranking</CardTitle>
            <CardDescription>
              Rank is based on the total number of stars across repositories owned by a user
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/by/stars/1">View</Link>
          </CardFooter>
        </Card>
        <Card className="flex-grow border-border gap-4">
          <CardHeader>
            <CardTitle>Contribution ranking</CardTitle>
            <CardDescription>
              Rank is based on the stars from repositories where you&apos;ve merged pull requests — excluding your own
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/by/contributions/1">View</Link>
          </CardFooter>
        </Card>
        <Card className="flex-grow border-border gap-4">
          <CardHeader>
            <CardTitle>Follower ranking</CardTitle>
            <CardDescription>Rank is based on the number of followers the user has on GitHub</CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/by/followers/1">View</Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
