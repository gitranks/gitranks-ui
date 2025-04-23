import { Search } from 'lucide-react';
import Link from 'next/link';

import { Header } from '@/components/header/header';
import { Page } from '@/components/page/page';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

import MainImage from './main-image';

export default function Home() {
  return (
    <>
      <div className="border-b border-border bg-linear-45 from-background to-80% to-landing-page-gradient-start-color">
        <Header />
        <Page>
          <div className="flex flex-col md:flex-row gap-4 grow items-center">
            <div className="flex flex-col gap-4 md:max-w-lg">
              <h1 className="text-3xl sm:text-4xl font-semibold">
                Your GitHub Profile is More Impressive Than You Think
              </h1>
              <div>Just one repo with 5 stars puts you ahead of 95% of developers. See where you rank:</div>
              <div className="flex gap-4">
                <Input placeholder="GitHub login" />
                <Button>
                  <Search className="size-4" />
                  Search
                </Button>
              </div>
            </div>
            <div className="flex flex-grow items-center justify-center w-full md:w-auto min-w-xs">
              <MainImage />
            </div>
          </div>
        </Page>
      </div>
      <Page>
        <div className="flex flex-col gap-4 grow py-8">
          <h2 className="text-2xl font-semibold">Discover Your Developer Superpower</h2>
          <div>
            Curious about where you excel? Explore ranks based on stars, followers, contributions, and more. Dive into
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
                <Link href="/by/stars">View</Link>
              </CardFooter>
            </Card>
            <Card className="flex-grow border-border gap-4">
              <CardHeader>
                <CardTitle>Contribution ranking</CardTitle>
                <CardDescription>
                  Rank is based on the stars from repositories where you&apos;ve merged pull requests — excluding your
                  own
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Link href="/by/contributions">View</Link>
              </CardFooter>
            </Card>
            <Card className="flex-grow border-border gap-4">
              <CardHeader>
                <CardTitle>Follower ranking</CardTitle>
                <CardDescription>Rank is based on the number of followers the user has on GitHub</CardDescription>
              </CardHeader>
              <CardFooter>
                <Link href="/by/followers">View</Link>
              </CardFooter>
            </Card>
          </div>
        </div>
        <div className="flex flex-col gap-4 grow py-8">
          <h2 className="text-2xl font-semibold">Put Your GitHub Rank on Display</h2>
          <div>
            Show off your coding achievements with a dynamic GitHub badge. Let the world see exactly where you stand
            among millions of developers.
          </div>
          <div>
            <Button>Generate a badge</Button>
          </div>
        </div>
      </Page>
    </>
  );
}
