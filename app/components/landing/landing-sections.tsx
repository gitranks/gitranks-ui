import type { Route } from 'next';
import Link from 'next/link';
import type { CSSProperties, FC, ReactNode } from 'react';
import { FaTelegramPlane, FaWhatsapp } from 'react-icons/fa';

import BadgeExample from '../../badge/gallery/components/badge-example';
import { SearchProfile } from '../search-profile';
import { BadgeSnippet } from './badge-snippet';
import { type ExampleRank, HeroAside } from './hero-aside';
import { HeroSignIn } from './hero-sign-in';
import { FEATURED_ORG, LEADERBOARD_ROWS } from './landing-data';
import { formatCompact, formatFull, GithubAvatar, LandingSection } from './landing-ui';
import { type Leaderboard, LeaderboardTabs } from './leaderboard-tabs';
import { RANK_DESCRIPTIONS, TELEGRAM_BOT_URL, TIER_FRACTIONS, TIER_NAMES, WHATSAPP_BOT_URL } from '@/app/app.consts';
import { seriesColor } from '@/app/org/[login]/components/pulse/org-pulse.utils';
import { RANK_NAME } from '@/badge/badge.consts';
import { Flag } from '@/components/flag/flag';
import { InsightPostCard } from '@/components/insight/insight-post-card';
import InsightText from '@/components/insight/insight-text';
import { JsonLd } from '@/components/json-ld/json-ld';
import { RankDelta } from '@/components/rank-delta/rank-delta';
import { Button } from '@/components/ui/button';
import { SITE_SOCIAL_LINKS } from '@/lib/seo/site';
import { BadgeMeta, BadgeType } from '@/types/badge.types';
import type {
  CountrySummaryQuery,
  InsightsQuery,
  LanguageSummaryQuery,
  OrgRankingsQuery,
  PageOrgQuery,
} from '@/types/generated/graphql';
import { UserRankProp } from '@/types/ranking.types';
import { getLanguageRankingPath } from '@/utils/get-language-ranking-path';

export const Container: FC<{ children: ReactNode; className?: string }> = ({ children, className }) => (
  <div className={`mx-auto w-full max-w-7xl px-4 ${className ?? ''}`}>{children}</div>
);

type Insight = InsightsQuery['insights'][number];

/** The newest insight as one line above the hero. */
export const InsightTicker: FC<{ insight?: Insight }> = ({ insight }) => {
  if (!insight) {
    return null;
  }

  return (
    <div className="border-y bg-muted/40">
      <Container className="flex items-center gap-3 py-2 text-sm text-muted-foreground">
        <span className="shrink-0 rounded-sm bg-brand-soft px-1.5 text-[11px] font-semibold tracking-wide text-brand-soft-foreground uppercase">
          New
        </span>
        <span className="min-w-0 truncate [&_a]:font-medium [&_a]:no-underline">
          <InsightText insight={insight} />
        </span>
        <Link href={`/insights/${insight.id}`} prefetch={false} className="shrink-0 text-link underline">
          Details
        </Link>
      </Container>
    </div>
  );
};

type StatItem = { value: string; label: string };

export const Hero: FC<{ developersRanked?: number | null; examples: ExampleRank[]; stats: StatItem[] }> = ({
  developersRanked,
  examples,
  stats,
}) => (
  <section aria-labelledby="hero-title" className="border-b">
    <Container className="grid items-center gap-8 py-10 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:py-16 lg:gap-12 lg:py-20">
      <div className="flex min-w-0 flex-col gap-5">
        <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Open source, ranked.
        </span>
        <h1 id="hero-title" className="text-3xl font-semibold tracking-tight text-balance md:text-4xl lg:text-5xl">
          Where do you rank on GitHub?
        </h1>
        <p className="max-w-prose text-lg text-muted-foreground">
          {developersRanked ? `${formatCompact(developersRanked)} developers` : 'Developers'} ranked by stars,
          contributions and followers. Worldwide, in your country and in every language.
        </p>
        <SearchProfile />
        <HeroSignIn />
      </div>
      <HeroAside examples={examples} />
    </Container>
    <Container>
      <dl className="grid grid-cols-2 gap-y-4 border-t py-6 md:grid-cols-4 md:divide-x">
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col-reverse items-center gap-0.5 text-center">
            <dt className="text-xs font-medium text-muted-foreground">{stat.label}</dt>
            <dd className="font-mono text-2xl font-semibold tracking-tight tabular-nums">{stat.value}</dd>
          </div>
        ))}
      </dl>
    </Container>
  </section>
);

export const LeaderboardSection: FC<{ boards: Leaderboard[] }> = ({ boards }) => (
  <LandingSection
    id="leaderboard"
    eyebrow="Rankings"
    title="Global leaderboard"
    intro={`The top ${LEADERBOARD_ROWS} developers worldwide in each ranking, with their change since last month.`}
    action={
      <Link href="/methodology" prefetch={false} className="text-link underline">
        How rankings work
      </Link>
    }
  >
    <LeaderboardTabs boards={boards} />
  </LandingSection>
);

export const InsightsSection: FC<{ insights: Insight[] }> = ({ insights }) => {
  if (!insights.length) {
    return null;
  }

  return (
    <LandingSection
      id="insights"
      eyebrow="Insights"
      title="Fresh from the data"
      intro="Short posts about records, climbers and hidden gems, written from the rankings and shared on X, Bluesky and Mastodon."
      action={
        <span className="flex flex-wrap gap-x-4 gap-y-1">
          <Link href="/insights" prefetch={false} className="text-link underline">
            All insights
          </Link>
          <a href={SITE_SOCIAL_LINKS.x} target="_blank" rel="noopener noreferrer" className="text-link underline">
            Follow on X
          </a>
        </span>
      }
    >
      {/* A row of cards; phones swipe through them with CSS scroll snap, no carousel script. */}
      <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 lg:grid-cols-3">
        {insights.slice(0, 3).map((insight, index) => (
          <div
            key={insight.id}
            className={`w-[85%] shrink-0 snap-start md:w-auto [&>div]:h-full ${index === 2 ? 'md:hidden lg:block' : ''}`}
          >
            <InsightPostCard insight={insight} />
          </div>
        ))}
      </div>
    </LandingSection>
  );
};

type OrgRow = OrgRankingsQuery['orgRankings'][number];
type FeaturedOrg = NonNullable<PageOrgQuery['organization']>;

const SNAPSHOT_SEGMENTS = 6;

export const OrganizationsSection: FC<{
  orgs: OrgRow[];
  flags: Map<string, string>;
  featured: FeaturedOrg | null;
}> = ({ orgs, flags, featured }) => {
  const pulse = featured?.pulse;
  const segments = pulse?.snapshot.slice(0, SNAPSHOT_SEGMENTS) ?? [];
  const facts = pulse
    ? [
        { label: 'Active contributors, last 12 months', value: formatFull(pulse.last12.activeContributors) },
        { label: 'First-time contributors', value: formatFull(pulse.last12.newContributors) },
        { label: 'Pull requests merged', value: formatFull(pulse.last12.pullRequests) },
        { label: 'Net lines of code', value: `${pulse.last12.net > 0 ? '+' : ''}${formatCompact(pulse.last12.net)}` },
      ]
    : [];

  return (
    <LandingSection
      id="organizations"
      eyebrow="Organizations"
      title="Organizations, ranked and analysed"
      intro="Who leads by stars, and what their code looks like: the mix of languages and file types, and the people behind it."
      action={
        <Link href="/orgs/1" prefetch={false} className="text-link underline">
          All organizations
        </Link>
      }
    >
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b">
                <th scope="col" className="w-20 px-4 py-2 text-left font-medium">
                  #
                </th>
                <th scope="col" className="px-2 py-2 text-left font-medium">
                  Organization
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  Stars
                </th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((row) => {
                const org = row.organization;
                if (!org) return null;
                const flag = org.country ? flags.get(org.country) : undefined;
                return (
                  <tr key={row.githubId} className="border-b last:border-0 hover:bg-accent/60">
                    <td className="px-4 py-2.5 font-mono whitespace-nowrap tabular-nums">
                      {row.s} <RankDelta current={row.s} previous={row.sM} className="ml-1 font-mono" />
                    </td>
                    <td className="max-w-0 px-2 py-2.5 sm:max-w-none">
                      <Link
                        href={`/org/${org.login}`}
                        prefetch={false}
                        className="flex min-w-0 items-center gap-2 font-medium hover:underline"
                      >
                        <GithubAvatar url={org.avatarUrl} size={24} className="rounded-md" />
                        <Flag flag={flag} label={org.country} />
                        <span className="truncate" translate="no">
                          {org.login}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums">{formatFull(org.s)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {featured && pulse && (
          <div className="flex min-w-0 flex-col gap-5 rounded-xl border bg-card p-5 shadow-sm md:p-6">
            <div className="flex items-center justify-between gap-3">
              <Link href={`/org/${FEATURED_ORG}`} prefetch={false} className="flex items-center gap-3 hover:underline">
                <GithubAvatar url={featured.avatarUrl} size={32} className="rounded-md" />
                <span className="font-semibold">{featured.name || featured.login}</span>
              </Link>
              <span className="text-xs text-muted-foreground">Example analysis</span>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              {facts.map((fact) => (
                <div key={fact.label} className="flex flex-col-reverse gap-0.5">
                  <dt className="text-xs text-muted-foreground">{fact.label}</dt>
                  <dd className="font-mono text-xl font-semibold tabular-nums">{fact.value}</dd>
                </div>
              ))}
            </dl>
            <div className="hidden flex-col gap-2 sm:flex">
              <span className="text-xs text-muted-foreground">Lines of code by type</span>
              <div className="flex h-3 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                {segments.map((segment, index) => (
                  <span
                    key={segment.label}
                    style={{ width: `${segment.share * 100}%`, background: seriesColor(segment.label, index) }}
                  />
                ))}
              </div>
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                {segments.map((segment, index) => (
                  <li key={segment.label} className="flex items-center gap-1.5">
                    <i
                      className="inline-block size-2.5 rounded-sm"
                      style={{ background: seriesColor(segment.label, index) }}
                    />
                    {segment.label}
                    <span className="font-mono text-muted-foreground tabular-nums">
                      {(segment.share * 100).toFixed(1)}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <Link href={`/org/${FEATURED_ORG}`} prefetch={false} className="self-start text-sm text-link underline">
              Open the full analysis
            </Link>
          </div>
        )}
      </div>
    </LandingSection>
  );
};

type CountryRow = CountrySummaryQuery['countrySummary'][number];
type LanguageRow = LanguageSummaryQuery['languageSummary'][number];

const PLACES_ROWS = 5;

export const PlacesSection: FC<{ countries: CountryRow[]; languages: LanguageRow[] }> = ({ countries, languages }) => (
  <LandingSection
    id="places"
    eyebrow="Countries and languages"
    title="Close to home, and in your language"
    intro="Every country and every language has its own leaderboard. Find yours and see who leads it."
  >
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-sm md:p-6">
        <h3 className="font-semibold">Top countries by stars</h3>
        <ol className="flex flex-col divide-y text-sm">
          {countries.slice(0, PLACES_ROWS).map((country) => (
            <li key={country.country} className="flex items-center justify-between gap-3 py-2.5">
              <Link
                href={`/country/${country.country}/stars/1`}
                prefetch={false}
                className="flex min-w-0 items-center gap-2 font-medium hover:underline"
              >
                <Flag flag={country.countryData.flag} />
                <span className="truncate">{country.country}</span>
              </Link>
              <span className="flex shrink-0 items-center gap-4 text-muted-foreground">
                <span className="hidden sm:inline">{formatCompact(country.usersCount)} developers</span>
                <span className="font-mono text-foreground tabular-nums">{formatCompact(country.s)} ★</span>
              </span>
            </li>
          ))}
        </ol>
        <Link href="/countries/stars/1" prefetch={false} className="self-start text-sm text-link underline">
          All countries
        </Link>
      </div>
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-sm md:p-6">
        <h3 className="font-semibold">Top languages by stars</h3>
        <ol className="flex flex-col divide-y text-sm">
          {languages.slice(0, PLACES_ROWS).map((language) => (
            <li key={language.language} className="flex items-center justify-between gap-3 py-2.5">
              <Link
                href={getLanguageRankingPath(language.language, 'global')}
                prefetch={false}
                className="flex min-w-0 items-center gap-2 font-medium hover:underline"
              >
                <i
                  className="inline-block size-2.5 shrink-0 rounded-full"
                  style={{ background: language.languageData?.color ?? 'var(--series-unknown)' }}
                />
                <span className="truncate">{language.language}</span>
              </Link>
              <span className="flex shrink-0 items-center gap-4 text-muted-foreground">
                <span className="hidden sm:inline">{formatCompact(language.usersCount)} developers</span>
                <span className="font-mono text-foreground tabular-nums">{formatCompact(language.score)} ★</span>
              </span>
            </li>
          ))}
        </ol>
        <Link href="/languages/global/score/1" prefetch={false} className="self-start text-sm text-link underline">
          All languages
        </Link>
      </div>
    </div>
  </LandingSection>
);

export const BadgesSection: FC<{ origin: string }> = ({ origin }) => (
  <LandingSection
    id="badges"
    eyebrow="Badges"
    title="Put your rank on your README"
    intro="A live badge for your GitHub profile, a project README or your site. It updates as your rank moves."
    action={
      <Link href="/badge/gallery" prefetch={false} className="text-link underline">
        Badge gallery
      </Link>
    }
  >
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <BadgeSnippet origin={origin} />
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-sm">
        <span className="text-xs text-muted-foreground">README.md</span>
        <div className="flex flex-wrap gap-2">
          <BadgeExample label={RANK_NAME.s} />
          <BadgeExample label={RANK_NAME.c} ranking={UserRankProp.c} type={BadgeType.Tier} valueBgColor="#7c3aed" />
          <BadgeExample label={RANK_NAME.s} meta={BadgeMeta.MonthlyChange} />
          <BadgeExample
            label="Total Followers"
            ranking={UserRankProp.f}
            meta={BadgeMeta.Percentile}
            valueBgColor="#1e3a8a"
          />
        </div>
      </div>
    </div>
  </LandingSection>
);

// Literal class names so Tailwind generates them.
const TIER_BAR_CLASSES = ['bg-tier-1', 'bg-tier-2', 'bg-tier-3', 'bg-tier-4', 'bg-tier-5', 'bg-tier-6', 'bg-tier-7'];
const TIER_TEXT_CLASSES = [
  'text-tier-1',
  'text-tier-2',
  'text-tier-3',
  'text-tier-4',
  'text-tier-5',
  'text-tier-6',
  'text-tier-7',
];

const percent = (fraction: number) => `${Math.round(fraction * 100)}%`;

export const TiersSection = () => (
  <LandingSection
    id="tiers"
    eyebrow="Tiers"
    title="From Beginner to Legend"
    intro="Every ranked profile lands in one of seven tiers, each split into five levels. The share of profiles in each tier is fixed; the cut-offs move every Monday."
  >
    <ol className="grid grid-cols-1 gap-2 sm:grid-cols-7 sm:items-end sm:gap-3">
      {TIER_NAMES.map((name, index) => (
        <li key={name} className="flex items-center gap-3 sm:flex-col-reverse sm:items-stretch sm:gap-2">
          <span
            className={`${TIER_BAR_CLASSES[index]} block h-2 w-16 shrink-0 rounded-full sm:h-(--bar) sm:w-auto sm:rounded-md`}
            style={{ '--bar': `${24 + index * 16}px` } as CSSProperties}
          />
          <span className="flex items-baseline gap-2 sm:flex-col sm:gap-0">
            <span className={`font-semibold ${TIER_TEXT_CLASSES[index]}`}>{name}</span>
            <span className="text-xs text-muted-foreground">
              {index === 0 ? 'Bottom' : index === TIER_NAMES.length - 1 ? 'Top' : 'Next'}{' '}
              {percent(TIER_FRACTIONS[index])}
            </span>
          </span>
        </li>
      ))}
    </ol>
  </LandingSection>
);

export const UpdatesSection = () => (
  <LandingSection
    id="updates"
    eyebrow="Rank updates"
    title="Your rank, in your messenger"
    intro="Get your GitHub rank daily or weekly, right in Telegram or WhatsApp."
  >
    <div className="flex flex-wrap gap-3">
      <Button asChild variant="outline">
        <a href={TELEGRAM_BOT_URL} target="_blank" rel="noopener">
          <FaTelegramPlane />
          Telegram bot
        </a>
      </Button>
      <Button asChild variant="outline">
        <a href={WHATSAPP_BOT_URL} target="_blank" rel="noopener">
          <FaWhatsapp />
          WhatsApp bot
        </a>
      </Button>
    </div>
  </LandingSection>
);

const FAQ: { q: string; a: string; link?: { href: string; label: string } }[] = [
  {
    q: 'How is my GitHub rank calculated?',
    a: `There are three rankings. ${RANK_DESCRIPTIONS.s.title}: ${RANK_DESCRIPTIONS.s.descriptionList} ${RANK_DESCRIPTIONS.c.title}: ${RANK_DESCRIPTIONS.c.descriptionList} ${RANK_DESCRIPTIONS.f.title}: ${RANK_DESCRIPTIONS.f.descriptionList}`,
    link: { href: '/methodology', label: 'How rankings work' },
  },
  {
    q: 'Why am I not ranked?',
    a: `Each ranking has a minimum. ${RANK_DESCRIPTIONS.s.notRankedMessage} ${RANK_DESCRIPTIONS.c.notRankedMessage} ${RANK_DESCRIPTIONS.f.notRankedMessage}`,
  },
  {
    q: 'What do the tiers mean?',
    a: `Tiers group ranked profiles by share: Beginner is the bottom ${percent(TIER_FRACTIONS[0])} and Legend the top ${percent(TIER_FRACTIONS[6])}. Each tier has five levels. The cut-offs are recalculated every Monday.`,
  },
  {
    q: 'Can I refresh my profile?',
    a: 'Signed-in developers can refresh their own profile once a day from their profile page, in return for a star on the GitRanks repository.',
  },
  {
    q: 'How do I add a badge to my README?',
    a: 'Open the badge builder with your GitHub username, pick a ranking and a style, and copy the snippet into your README or website.',
    link: { href: '/badge/builder', label: 'Badge builder' },
  },
];

export const FaqSection = () => (
  <LandingSection id="faq" eyebrow="Questions" title="How GitRanks works">
    <JsonLd
      payloads={[
        {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: FAQ.map(({ q, a }) => ({
            '@type': 'Question',
            name: q,
            acceptedAnswer: { '@type': 'Answer', text: a },
          })),
        },
      ]}
    />
    <div className="grid gap-x-8 lg:grid-cols-2">
      {FAQ.map(({ q, a, link }) => (
        <details key={q} className="group border-b py-4">
          <summary className="flex cursor-pointer list-none items-center [&::-webkit-details-marker]:hidden justify-between gap-4 font-medium">
            {q}
            <span aria-hidden="true" className="text-muted-foreground transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <p className="mt-2 text-sm text-muted-foreground">
            {a}
            {link && (
              <>
                {' '}
                <Link href={link.href as Route} prefetch={false} className="text-link underline">
                  {link.label}
                </Link>
              </>
            )}
          </p>
        </details>
      ))}
    </div>
  </LandingSection>
);

export const SupportStrip = () => (
  <div className="border-t bg-muted/40">
    <Container className="flex flex-col items-start justify-between gap-3 py-6 sm:flex-row sm:items-center">
      <p className="text-sm">
        <span className="font-semibold">GitRanks is free and open source.</span>{' '}
        <span className="text-muted-foreground">A star on GitHub keeps it going.</span>
      </p>
      <Button asChild variant="outline" size="sm">
        <a href={SITE_SOCIAL_LINKS.github} target="_blank" rel="noopener noreferrer">
          ★ Star on GitHub
        </a>
      </Button>
    </Container>
  </div>
);
