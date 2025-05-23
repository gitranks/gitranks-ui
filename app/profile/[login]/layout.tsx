import { Header } from '@/components/header/header';
import { Tab } from '@/components/tabs/tabs';
import { TabsBar } from '@/components/tabs/tabs-bar';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { TopRanksDocument } from '@/types/generated/graphql';

type ProfileLayoutProps = Readonly<{ children: React.ReactNode; params: Promise<{ login: string }> }>;

// Next.js will invalidate the cache when a
// request comes in, at most once every 10800 seconds.
export const revalidate = 10800;

// We'll prerender only the params from `generateStaticParams` at build time.
// If a request comes in for a path that hasn't been generated,
// Next.js will server-render the page on-demand.
export const dynamicParams = true;

export async function generateStaticParams() {
  const { byStars, byContribution, byFollowers } = (await graphqlDirect(TopRanksDocument)) ?? {};
  const mergedRanks = [...byStars, ...byContribution, ...byFollowers];

  const uniqueLogins = new Set<string>();

  mergedRanks.forEach((rank) => {
    if (rank.user) {
      uniqueLogins.add(rank.user.login);
    }
  });

  return [...uniqueLogins].map((login) => ({ login }));
}

export default async function ProfileLayout({ children, params }: ProfileLayoutProps) {
  const { login } = await params;

  return (
    <>
      <Header login={login} />
      <TabsBar className="mb-4">
        <Tab href={`/profile/${login}`} active>
          Overview
        </Tab>
        <Tab href={`/profile/${login}/ranks`}>Ranks</Tab>
        <Tab href={`/profile/${login}/repositories`}>Repositories</Tab>
      </TabsBar>
      {children}
    </>
  );
}
