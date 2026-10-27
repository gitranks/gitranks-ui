import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { MIN_PROFILES_THRESHOLD, MIN_VALUE, TIER_FRACTIONS, TIER_NAMES } from '@/app/app.consts';
import { RANK_NAME } from '@/badge/badge.consts';
import { Header } from '@/components/header/header';
import { Link } from '@/components/link/link';
import { Page } from '@/components/page/page';
import { tierTextClass } from '@/components/tier-chip/tier-chip';
import { TierIcon } from '@/components/tier-icon/tier-icon';
import { fetchCountrySummaries } from '@/graphql/helpers/fetch-country-summaries';
import { fetchRankedCounts } from '@/graphql/helpers/fetch-ranked-counts';
import { pageMetadata } from '@/lib/seo/page-metadata';
import { SITE_SOCIAL_LINKS } from '@/lib/seo/site';
import { CountrySummaryOrder } from '@/types/generated/graphql';
import { formatSummaryDate } from '@/utils/format-summary-date';

export const metadata: Metadata = pageMetadata({
  title: { absolute: 'How GitRanks Ranks GitHub Developers' },
  description: `How GitRanks computes its stars, contributor and followers rankings from public GitHub data: what each one counts, who is included (${MIN_VALUE}+ stars or followers), and how often ranks are recalculated.`,
  path: '/methodology',
});

const formatNumber = (value: number) => value.toLocaleString('en-US');

const formatShare = (fraction: number) => `${Math.round(fraction * 100)}%`;

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="flex flex-col gap-3">
    <h2 className="text-xl font-semibold">{title}</h2>
    {children}
  </section>
);

const Table = ({ head, rows }: { head: string[]; rows: ReactNode[][] }) => (
  <div className="overflow-x-auto">
    <table className="w-full border-collapse text-left text-sm">
      <thead>
        <tr>
          {head.map((cell) => (
            <th key={cell} className="border-b p-2 font-medium">
              {cell}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(([first, ...rest], rowIndex) => (
          <tr key={rowIndex}>
            <th scope="row" className="border-b p-2 align-top font-normal">
              {first}
            </th>
            {rest.map((cell, index) => (
              <td key={index} className="border-b p-2 align-top">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/** Live counts, in sentences a reader can quote. Left out when the data is empty. */
const InNumbers = async () => {
  const [counts, countries] = await Promise.all([
    fetchRankedCounts('global'),
    fetchCountrySummaries(CountrySummaryOrder.Users),
  ]);

  const largest = countries.slice(0, 3);

  if (!counts?.sUsers && !largest.length) {
    return null;
  }

  return (
    <Section title="GitRanks in numbers">
      {!!counts?.sUsers && (
        <p>
          At the latest weekly count, {formatNumber(counts.sUsers)} developers are in the worldwide stars ranking,{' '}
          {formatNumber(counts.cUsers)} in the contributor ranking and {formatNumber(counts.fUsers)} in the followers
          ranking.
        </p>
      )}
      {!!largest.length && (
        <p>
          The country summary of {formatSummaryDate(largest[0].date)} covers {formatNumber(countries.length)} countries.
          The countries with the most developers on GitRanks are{' '}
          {largest.map((country, index) => (
            <span key={country.country}>
              {index > 0 && (index === largest.length - 1 ? ' and ' : ', ')}
              <Link href={`/country/${encodeURIComponent(country.countryData.name)}/stars/1`}>
                {country.countryData.name}
              </Link>{' '}
              ({formatNumber(country.usersCount)})
            </span>
          ))}
          .
        </p>
      )}
    </Section>
  );
};

export default function MethodologyPage() {
  return (
    <>
      <Header />
      <Page className="max-w-3xl gap-8 leading-relaxed">
        <div className="flex flex-col gap-3">
          <h1 className="text-2xl md:text-3xl font-semibold">How GitRanks ranks GitHub developers</h1>
          <p>
            GitRanks ranks GitHub developers and organizations using public data from the GitHub API. There are three
            developer rankings: by stars on their own repositories, by stars on the repositories they contribute to, and
            by followers. Each one is available worldwide and by country, and the stars ranking also by programming
            language. This page explains what each ranking counts, who is included and how often the numbers change.
          </p>
        </div>

        <InNumbers />

        <Section title="What each ranking counts">
          <Table
            head={['Ranking', 'Score', 'Who is included']}
            rows={[
              [
                <Link key="s" href="/by/stars/1">
                  {RANK_NAME.s}
                </Link>,
                'Stars on the public repositories the developer owns',
                `Developers with ${MIN_VALUE}+ stars on repositories they own`,
              ],
              [
                <Link key="c" href="/by/contributions/1">
                  {RANK_NAME.c}
                </Link>,
                'Stars on repositories owned by other accounts, organizations included, where the developer has merged pull requests; each repository counts once',
                `Developers with ${MIN_VALUE}+ stars in total across the repositories they contributed to`,
              ],
              [
                <Link key="f" href="/by/followers/1">
                  {RANK_NAME.f}
                </Link>,
                'Followers on GitHub',
                `Developers with ${MIN_VALUE}+ followers`,
              ],
            ]}
          />
          <p>
            Rank #1 has the highest score. Equal scores get consecutive ranks, and the profile GitRanks found first
            ranks higher. A developer is listed in every ranking they qualify for: up to three worldwide ranks, and the
            same three in their country.
          </p>
          <p>
            Stars that don&apos;t look like organic interest in a project may not count toward the stars and language
            rankings, either while they are under review or after a review; the developer&apos;s profile then says how
            many.
          </p>
        </Section>

        <Section title="Countries, languages and organizations">
          <p>
            <strong>Country rankings</strong> use the location on the developer&apos;s GitHub profile. GitRanks
            recognizes country names as well as regions and cities, so &quot;Berlin&quot; counts as Germany, and a
            country name wins over a city. A developer without a recognizable location is ranked worldwide only.{' '}
            <Link href="/countries/stars/1">Browse country rankings</Link>.
          </p>
          <p>
            <strong>Language rankings</strong> split the stars of each repository a developer owns by its language
            breakdown. A repository with 100 stars that is 60% JavaScript gives 60 stars to JavaScript. A language
            counts when it makes up at least 2% of a repository, and each developer is ranked in their top 5 languages,
            worldwide and in their country. <Link href="/languages/global/score/1">Browse language rankings</Link>.
          </p>
          <p>
            <strong>Organization rankings</strong> rank GitHub organizations by the stars on the public repositories
            they own. <Link href="/orgs/1">Browse organization rankings</Link>.
          </p>
        </Section>

        <Section title="Tiers">
          <p>
            Every ranking with at least {MIN_PROFILES_THRESHOLD} profiles is split into {TIER_NAMES.length} tiers. Each
            tier holds a fixed share of the ranked profiles, so the shares stay the same as more developers join:
          </p>
          <Table
            head={['Tier', 'Share of ranked profiles']}
            rows={TIER_NAMES.map((name, index) => [
              <span key={name} className="inline-flex items-center gap-1.5">
                <TierIcon tier={index + 1} className={`size-4 ${tierTextClass(index + 1)}`} />
                {name}
              </span>,
              formatShare(TIER_FRACTIONS[index]),
            ]).reverse()}
          />
        </Section>

        <Section title="How often the data is updated">
          <Table
            head={['What', 'How often']}
            rows={[
              [
                'GitHub profile data',
                'Every few weeks: a profile is re-read from GitHub no more often than every 2 weeks, its pull-request history no more often than every 45 days. Signed-in visitors can also refresh a profile on request.',
              ],
              ['Worldwide ranks', 'About every second day'],
              ['Organization ranks', 'About every second day'],
              ['Country ranks', 'About every fourth day'],
              ['Language ranks, worldwide and by country', 'About every fourth day'],
              ['Tiers', 'Weekly; monthly for language rankings within a country'],
              ['Monthly change', 'Measured against a snapshot taken on the 1st of each month'],
              ['Country and language summaries', 'On the 1st of each month'],
            ]}
          />
          <p>
            A profile fetched on request gets a <strong>provisional</strong> worldwide and country rank at once: it is
            placed just above the closest profile with a lower score. The next recalculation replaces it, usually within
            2 days worldwide and 4 days in the country.
          </p>
        </Section>

        <Section title="Data source and limits">
          <p>
            All data comes from public GitHub profiles, repositories, pull requests and followers. Private repositories
            and private contributions are not counted. GitRanks finds developers through public repositories with{' '}
            {MIN_VALUE}+ stars: their owners and the people who contribute to them.
          </p>
          <p>
            A developer who is missing can be added: open their profile at <code>/profile/&lt;login&gt;</code>, sign in
            with GitHub and press the fetch button. To get a country rank, set a location on your GitHub profile.
          </p>
        </Section>

        <Section title="About GitRanks">
          <p>
            GitRanks is built by{' '}
            <Link href="https://github.com/maslianok" target="_blank" rel="noopener noreferrer">
              @maslianok
            </Link>
            . Follow the project on{' '}
            <Link href={SITE_SOCIAL_LINKS.github} target="_blank" rel="noopener noreferrer">
              GitHub
            </Link>
            ,{' '}
            <Link href={SITE_SOCIAL_LINKS.x} target="_blank" rel="noopener noreferrer">
              X
            </Link>
            ,{' '}
            <Link href={SITE_SOCIAL_LINKS.bluesky} target="_blank" rel="noopener noreferrer">
              Bluesky
            </Link>{' '}
            and{' '}
            <Link href={SITE_SOCIAL_LINKS.mastodon} target="_blank" rel="me noopener noreferrer">
              Mastodon
            </Link>
            . Show your own ranks in a README with a <Link href="/badge/gallery">GitRanks badge</Link>.
          </p>
        </Section>
      </Page>
    </>
  );
}
