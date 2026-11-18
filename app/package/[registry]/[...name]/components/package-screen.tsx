import {
  CalendarDays,
  ExternalLink,
  FileText,
  GitBranch,
  Package,
  PackageSearch,
  Scale,
  Tag,
  Timer,
  Users,
} from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import type { FC, ReactNode } from 'react';

import { PACKAGE_UNAVAILABLE_TEXT } from '../seo';
import { weeksRangeText } from '../utils/package-downloads';
import { PACKAGE_NOT_READ } from '../utils/package-refresh-messages';
import { buildPackageSummary, formatCountLong } from '../utils/package-summary';
import DownloadsChart from './downloads-chart';
import { PackageBadgeSection } from './package-badge-section';
import { PackageDependentsList } from './package-dependents-list';
import { PackageDownloadsCard } from './package-downloads-card';
import { PackageRanksCard } from './package-ranks-card';
import { PackageUpdatesButton } from './package-updates-button';
import {
  ProfileCard,
  ProfileCardHeader,
  ProfileCardsGrid,
  ProfileSection,
} from '@/app/profile/[login]/components/profile-card';
import { ProfileListItem } from '@/app/profile/[login]/components/profile-list-item';
import {
  ActionsContainer,
  DetailsContainer,
  LeftColumnContainer,
  PageContainer,
} from '@/app/profile/[login]/components/profile-page-backbone';
import { ProfileSummary } from '@/app/profile/[login]/components/profile-summary';
import { formatCount, formatDay } from '@/app/repo/[owner]/[name]/utils/used-by-summary';
import { Header } from '@/components/header/header';
import { JsonLd } from '@/components/json-ld/json-ld';
import { FollowSlot } from '@/components/package-follow/follow-slot';
import { Pill } from '@/components/pill/pill';
import { RepoLink } from '@/components/repo-link/repo-link';
import { Button } from '@/components/ui/button';
import type { PackagePage } from '@/graphql/package-page';
import { PACKAGE_METHODOLOGY_PATH } from '@/utils/package-paths';

type PackageScreenProps = {
  /** The package's name as the URL names it: shown while its data cannot be read. */
  name: string;
  /** Its data; "unavailable" while package data cannot be read. */
  pkg: PackagePage | 'unavailable';
  /** The page's JSON-LD. */
  jsonLd?: object[];
};

/** Maintainers shown by name; the rest are counted. */
const MAINTAINERS_SHOWN = 5;

/** In UTC, as the registry stores the dates. */
const SHORT_DATE = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });

const shortDate = (value: string | null | undefined) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? SHORT_DATE.format(date) : undefined;
};

const npmUrl = (name: string) => `https://www.npmjs.com/package/${name}` as Route;

/** The name as a heading: a scope muted before the name, as a repository's owner is. */
const PackageName: FC<{ name: string }> = ({ name }) => {
  const slash = name.startsWith('@') ? name.indexOf('/') : -1;
  return (
    <h1 className="text-2xl font-semibold tracking-tight [overflow-wrap:anywhere]" translate="no">
      {slash > 0 ? (
        <>
          <span className="text-muted-foreground">{name.slice(0, slash + 1)}</span>
          {name.slice(slash + 1)}
        </>
      ) : (
        name
      )}
    </h1>
  );
};

const OpenOnNpm: FC<{ name: string }> = ({ name }) => (
  <Button size="sm" variant="outline" className="flex-grow" asChild>
    <Link href={npmUrl(name)} target="_blank" rel="noopener noreferrer">
      <Package aria-hidden />
      Open on npm
      <ExternalLink className="size-4 text-muted-foreground" aria-hidden />
    </Link>
  </Button>
);

/** The left column's top: the name, the "npm package" chip and the description with the registry's deprecation. */
const Head: FC<{ name: string; description?: string | null; deprecated?: string | null }> = ({
  name,
  description,
  deprecated,
}) => (
  <>
    <div className="flex min-w-0 flex-col gap-2">
      <PackageName name={name} />
      <span className="self-start">
        <Pill>npm package</Pill>
      </span>
    </div>
    {!!description && <p className="text-sm [overflow-wrap:anywhere]">{description}</p>}
    {!!deprecated && (
      <p className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning-soft-foreground [overflow-wrap:anywhere]">
        Deprecated: {deprecated}
      </p>
    )}
  </>
);

/** "octo-dev, mona", the first five, then "and N more". */
function maintainersText({ maintainers, maintainersCount }: Pick<PackagePage, 'maintainers' | 'maintainersCount'>) {
  const shown = maintainers.slice(0, MAINTAINERS_SHOWN);
  const more = Math.max(maintainersCount, maintainers.length) - shown.length;
  return shown.length ? `${shown.join(', ')}${more > 0 ? ` and ${formatCount(more)} more` : ''}` : undefined;
}

/** "12.3.0 · 125 releases". */
function latestText({ latestVersion, releaseCount }: Pick<PackagePage, 'latestVersion' | 'releaseCount'>) {
  const releases = releaseCount ? `${formatCount(releaseCount)} ${releaseCount === 1 ? 'release' : 'releases'}` : null;
  return [latestVersion, releases].filter(Boolean).join(' · ') || undefined;
}

const Facts: FC<{ pkg: PackagePage }> = ({ pkg }) => {
  const downloadsRead = shortDate(pkg.downloadsReadAt);
  const dependentsRead = shortDate(pkg.dependentsReadAt);
  const firstPublished = shortDate(pkg.firstPublishedAt);
  const latest = latestText(pkg);

  return (
    <DetailsContainer>
      <div className="flex flex-col gap-1.5">
        <ProfileListItem
          value={
            pkg.repo ? (
              <RepoLink nameWithOwner={pkg.repo.nameWithOwner} className="hover:underline" />
            ) : (
              (pkg.repositoryName ?? undefined)
            )
          }
          prefix="Repository: "
          Icon={GitBranch}
        />
        <ProfileListItem value="npm" prefix="Registry: " Icon={Package} />
        <ProfileListItem value={latest} prefix="Latest: " Icon={Tag} />
        <ProfileListItem value={firstPublished} prefix="First published: " Icon={CalendarDays} />
        <ProfileListItem value={maintainersText(pkg)} prefix="Maintainers: " Icon={Users} />
        <ProfileListItem value={pkg.license ?? undefined} prefix="License: " Icon={Scale} />
        <ProfileListItem value={downloadsRead && `Downloads read ${downloadsRead}`} Icon={Timer} />
        <ProfileListItem value={dependentsRead && `Dependents read ${dependentsRead} · monthly`} Icon={FileText} />
      </div>
    </DetailsContainer>
  );
};

const Frame: FC<{ left: ReactNode; children: ReactNode }> = ({ left, children }) => (
  <>
    <Header />
    <PageContainer>
      <LeftColumnContainer>{left}</LeftColumnContainer>
      <section className="flex min-w-0 flex-col gap-6">{children}</section>
    </PageContainer>
  </>
);

/** One state in place of the main column: a title when there is one, and its line. */
const EmptyState: FC<{ title?: string; text: string }> = ({ title, text }) => (
  <ProfileCard className="items-center gap-3 text-center">
    <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
      <PackageSearch className="size-5" aria-hidden />
    </span>
    {title && <h2 className="font-medium">{title}</h2>}
    <p className="text-sm text-muted-foreground">{text}</p>
  </ProfileCard>
);

const COUNTED =
  "Counted from each repository's own manifests, workspaces included. Lockfiles, forks, and examples, docs or test folders don't count. We read every repository with 100+ stars once a month";

/** Who uses it: the sentence, the list with "Show more" and how it is counted; with none yet, the empty state. */
const UsedBy: FC<{ pkg: PackagePage }> = ({ pkg }) => {
  const { name, dependentsCount: count, dependentsStars: stars, dependents } = pkg;
  const read = shortDate(pkg.dependentsReadAt);
  const next = formatDay(pkg.nextDependentsReadAt);
  const intro =
    count > 0
      ? `${formatCount(count)} ${count === 1 ? 'repository' : 'repositories'} with 100+ stars ${count === 1 ? 'lists' : 'list'} ${name} in their own package.json.${count > 1 ? ` Together they have ${formatCount(stars)} stars.` : ''}`
      : undefined;

  return (
    <ProfileSection id="used-by" title="Used by" intro={intro}>
      {count > 0 && dependents && dependents.items.length > 0 ? (
        <>
          <PackageDependentsList name={name} initial={dependents} />
          <p className="text-xs text-muted-foreground">
            {COUNTED}
            {read ? `; last read ${read}.` : '.'}{' '}
            <Link href={PACKAGE_METHODOLOGY_PATH} prefetch={false} className="text-link underline">
              How we count
            </Link>
          </p>
        </>
      ) : (
        <EmptyState
          title={`No repository with 100+ stars uses ${name} directly yet`}
          text={[
            'We read every repository with 100+ stars once a month.',
            next ? ` The next read is on ${next}.` : '',
            pkg.downloads ? ` It is downloaded ${formatCount(pkg.downloads.lastWeek)} times a week on npm.` : '',
          ].join('')}
        />
      )}
    </ProfileSection>
  );
};

/** Its weekly downloads over the last 52 weeks, with their total. */
const Downloads: FC<{ downloads: NonNullable<PackagePage['downloads']> }> = ({ downloads }) => {
  const range = weeksRangeText(downloads);
  return (
    <ProfileCard className="gap-3">
      <ProfileCardHeader>
        <h2>Downloads</h2>
      </ProfileCardHeader>
      <p className="text-sm">
        <span className="font-mono font-semibold tabular-nums">{formatCountLong(downloads.last52Weeks)}</span> in the
        last 12 months
      </p>
      {(downloads.weeks?.length ?? 0) > 1 && (
        <div className="h-[220px]">
          <DownloadsChart
            points={(downloads.weeks ?? []).slice(-52)}
            label={`Weekly downloads from npm${range ? `, ${range}` : ''}: ${formatCountLong(downloads.last52Weeks)} in the last 12 months`}
          />
        </div>
      )}
      {range && <p className="text-xs text-muted-foreground">Weekly downloads from npm, {range}.</p>}
    </ProfileCard>
  );
};

/**
 * A package's page from its data: on the left its name, Follow, its Refresh and its facts; on the right its ranks and
 * downloads, the summary, who uses it, its downloads over a year and its badge. A package nobody has read yet shows
 * its name, Refresh and one empty state; while package data cannot be read, one line says so.
 */
export const PackageScreen: FC<PackageScreenProps> = ({ name, pkg, jsonLd }) => {
  if (pkg === 'unavailable') {
    return (
      <Frame
        left={
          <>
            <Head name={name} />
            <ActionsContainer>
              <OpenOnNpm name={name} />
            </ActionsContainer>
          </>
        }
      >
        <ProfileCard>
          <p className="text-sm text-muted-foreground">{PACKAGE_UNAVAILABLE_TEXT}</p>
        </ProfileCard>
      </Frame>
    );
  }

  const button = (
    <PackageUpdatesButton
      name={pkg.name}
      repository={pkg.repo?.nameWithOwner ?? pkg.repositoryName}
      dailyUpdates={pkg.dailyUpdates}
      refreshRunning={pkg.refreshRunning === true}
    />
  );

  if (pkg.state === 'NOT_READ') {
    return (
      <Frame
        left={
          <>
            <Head name={pkg.name} />
            <ActionsContainer>
              {button}
              <OpenOnNpm name={pkg.name} />
            </ActionsContainer>
          </>
        }
      >
        <EmptyState title={PACKAGE_NOT_READ.title} text={PACKAGE_NOT_READ.text} />
      </Frame>
    );
  }

  const top = pkg.dependents?.items[0];

  return (
    <Frame
      left={
        <>
          <Head name={pkg.name} description={pkg.description} deprecated={pkg.deprecated} />
          <ActionsContainer>
            <FollowSlot packages={[{ registry: 'npm', name: pkg.name }]} label={pkg.name} placement="package-page" />
            {button}
            <OpenOnNpm name={pkg.name} />
          </ActionsContainer>
          <Facts pkg={pkg} />
        </>
      }
    >
      {!!jsonLd?.length && <JsonLd payloads={jsonLd} />}
      <ProfileCardsGrid className="grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))]">
        <PackageRanksCard
          dependentsCount={pkg.dependentsCount}
          dependentsStars={pkg.dependentsStars}
          ranks={pkg.ranks}
        />
        {pkg.downloads && <PackageDownloadsCard downloads={pkg.downloads} repo={pkg.repo} />}
      </ProfileCardsGrid>
      <ProfileSummary parts={buildPackageSummary(pkg, top)} />
      <UsedBy pkg={pkg} />
      {pkg.downloads && <Downloads downloads={pkg.downloads} />}
      <PackageBadgeSection name={pkg.name} />
    </Frame>
  );
};
