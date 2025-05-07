import type { Metadata } from 'next';

import { Header } from '@/components/header/header';

export const metadata: Metadata = {
  title: 'GitRanks · GitHub Profile Analytics & Rankings',
  description:
    'Explore ranks based on stars, followers, contributions, and more. Dive into dynamic leaderboards and find out how you measure up against developers worldwide.',
};

export const revalidate = 10800;
export const dynamicParams = true;

export async function generateStaticParams() {
  const page = '1';
  return [
    { rankingType: 'contributions', page },
    { rankingType: 'followers', page },
    { rankingType: 'stars', page },
  ];
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <Header />
      {children}
    </>
  );
}
