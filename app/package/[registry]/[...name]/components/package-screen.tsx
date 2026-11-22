import { CalendarDays, GitBranch, PackageSearch, Scale, Tag, Timer, Users } from 'lucide-react';
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
import { hasRanks, PackageRanksCard } from './package-ranks-card';
import { PackageUpdatesButton } from './package-updates-button';
import { ProfileCard, ProfileCardsGrid, ProfileSection } from '@/app/profile/[login]/components/profile-card';
import {
  ActionRow,
  ActionsContainer,
  LeftColumnContainer,
  PageContainer,
} from '@/app/profile/[login]/components/profile-page-backbone';
import { ProfileSummary } from '@/app/profile/[login]/components/profile-summary';
import { formatCount, formatDay } from '@/app/repo/[owner]/[name]/utils/used-by-summary';
import { ExternalIconButton } from '@/components/external-icon-button/external-icon-button';
import { Header } from '@/components/header/header';
import { JsonLd } from '@/components/json-ld/json-ld';
import { FollowSlot } from '@/components/package-follow/follow-slot';
import { Pill } from '@/components/pill/pill';
import { RepoLink } from '@/components/repo-link/repo-link';
import type { PackagePage } from '@/graphql/package-page';
import { REGISTRIES, type RegistryId, registryOf, spelledNameOf } from '@/lib/packages/registries';
import { REGISTRY_ICONS } from '@/lib/packages/registry-icons';
import { PACKAGE_METHODOLOGY_PATH } from '@/utils/package-paths';

type PackageScreenProps = {
  /** The registry the package is on. */
  registry: RegistryId;
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

/** "Open on npm": the package's page on the registry's own site, as the registry's mark beside the main button. */
const OpenOnRegistry: FC<{ registry: RegistryId; name: string }> = ({ registry, name }) => {
  const Mark = REGISTRY_ICONS[registry];
  return (
    <ExternalIconButton
      href={REGISTRIES[registry].pageUrl(name)}
      label={`Open on ${REGISTRIES[registry].label}`}
      icon={<Mark aria-hidden />}
    />
  );
};

/** The left column's top: the name, the "npm package" chip and the description with the registry's deprecation. */
const Head: FC<{ registry: RegistryId; name: string; description?: string | null; deprecated?: string | null }> = ({
  registry,
  name,
  description,
  deprecated,
}) => (
  <>
    <div className="flex min-w-0 flex-col gap-2">
      <PackageName name={name} />
      <span className="self-start">
        <Pill>{`${REGISTRIES[registry].label} package`}</Pill>
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

/** One fact: its icon says what it is, so the text needs no label. */
const Fact: FC<{ Icon: typeof Tag; children?: ReactNode }> = ({ Icon, children }) =>
  children ? (
    <li className="flex items-start gap-1.5 md:gap-2">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="min-w-0 text-foreground [overflow-wrap:anywhere]">{children}</span>
    </li>
  ) : null;

/**
 * The package's facts: its repository, latest version, first release, maintainers and license. One a line under the
 * buttons; on a phone a wrapped line above them (the column puts the buttons last there).
 */
const Facts: FC<{ pkg: PackagePage }> = ({ pkg }) => {
  const firstPublished = shortDate(pkg.firstPublishedAt);
  const releases = pkg.releaseCount
    ? `${formatCount(pkg.releaseCount)} ${pkg.releaseCount === 1 ? 'release' : 'releases'}`
    : null;

  return (
    <ul
      aria-label="About the package"
      className="flex flex-wrap gap-x-3 gap-y-1.5 text-sm md:flex-col md:gap-1.5 md:border-t md:pt-4"
    >
      <Fact Icon={GitBranch}>
        {pkg.repo ? (
          <RepoLink nameWithOwner={pkg.repo.nameWithOwner} className="hover:underline" />
        ) : (
          pkg.repositoryName
        )}
      </Fact>
      <Fact Icon={Tag}>
        {(pkg.latestVersion || releases) && (
          <>
            {pkg.latestVersion && <span className="font-mono tabular-nums">{pkg.latestVersion}</span>}
            {pkg.latestVersion && releases && ' · '}
            {releases}
          </>
        )}
      </Fact>
      <Fact Icon={CalendarDays}>{firstPublished && `First published ${firstPublished}`}</Fact>
      <Fact Icon={Users}>{maintainersText(pkg)}</Fact>
      <Fact Icon={Scale}>{pkg.license && `${pkg.license} license`}</Fact>
    </ul>
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

/** Who uses it, before anybody with 100+ stars does: when the next read is, and Follow to hear when one starts. */
const UsedByNone: FC<{ registry: RegistryId; pkg: PackagePage }> = ({ registry, pkg }) => {
  const spelled = spelledNameOf(pkg);
  const next = formatDay(pkg.nextDependentsReadAt);
  return (
    <ProfileCard className="flex-row flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 flex-[1_1_18rem] items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <PackageSearch className="size-5" aria-hidden />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="font-medium [overflow-wrap:anywhere]">{`No repository with 100+ stars uses ${spelled} directly yet`}</p>
          <p className="text-sm text-muted-foreground">
            {`We read every repository with 100+ stars once a month${next ? `; the next read is on ${next}` : ''}. Follow to hear when one starts using it.`}
          </p>
        </div>
      </div>
      <FollowSlot packages={[{ registry, name: pkg.name }]} label={spelled} placement="used-by-empty" />
    </ProfileCard>
  );
};

const COUNTED =
  "Counted from each repository's own manifests, workspaces included. Lockfiles, forks, and examples, docs or test folders don't count. We read every repository with 100+ stars once a month";

/**
 * Who uses it: how many and their stars in the title, "Hide archived" beside it, the list with "Show more" and how it is
 * counted; with none yet, when the next read is and Follow.
 */
const UsedBy: FC<{ registry: RegistryId; pkg: PackagePage }> = ({ registry, pkg }) => {
  const { manifest } = registryOf(registry);
  const { name, dependentsCount: count, dependentsStars: stars, dependents } = pkg;
  const read = shortDate(pkg.dependentsReadAt);

  if (!(count > 0 && dependents && dependents.items.length > 0)) {
    return (
      <ProfileSection id="used-by" title="Used by">
        <UsedByNone registry={registry} pkg={pkg} />
      </ProfileSection>
    );
  }

  return (
    <PackageDependentsList
      registry={registry}
      name={name}
      initial={dependents}
      title={
        <>
          Used by <span className="font-mono tabular-nums">{formatCount(count)}</span>{' '}
          {count === 1 ? 'repository' : 'repositories'} with 100+ stars
        </>
      }
      intro={
        count > 1 ? (
          <>
            <span className="font-mono tabular-nums">{formatCount(stars)}</span>
            {` stars between them · direct dependents, in their own ${manifest}`}
          </>
        ) : (
          `A direct dependent, in its own ${manifest}`
        )
      }
      footer={
        <p className="text-xs text-muted-foreground">
          {COUNTED}
          {read ? `; last read ${read}.` : '.'}{' '}
          <Link href={PACKAGE_METHODOLOGY_PATH} prefetch={false} className="text-link underline">
            How we count
          </Link>
        </p>
      }
    />
  );
};

/** Its weekly downloads over the last 52 weeks, with their total. */
const Downloads: FC<{ registry: RegistryId; downloads: NonNullable<PackagePage['downloads']> }> = ({
  registry,
  downloads,
}) => {
  const range = weeksRangeText(downloads);
  const from = `Weekly downloads from ${REGISTRIES[registry].label}`;
  return (
    <ProfileCard className="gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-base font-semibold">Downloads by week</h2>
        <p className="text-sm">
          <span className="font-mono font-semibold tabular-nums">{formatCountLong(downloads.last52Weeks)}</span>{' '}
          <span className="text-muted-foreground">in the last 12 months</span>
        </p>
      </div>
      {(downloads.weeks?.length ?? 0) > 1 && (
        <div className="h-[220px]">
          <DownloadsChart
            points={(downloads.weeks ?? []).slice(-52)}
            label={`${from}${range ? `, ${range}` : ''}: ${formatCountLong(downloads.last52Weeks)} in the last 12 months`}
          />
        </div>
      )}
      {range && (
        <p className="text-xs text-muted-foreground">
          {`${from}, `}
          {range}.
        </p>
      )}
    </ProfileCard>
  );
};

/** "Downloads from npm through Nov 16, 2026 · Dependents read Nov 16, 2026, next read Dec 1, 2026". */
function dataLineOf(registry: RegistryId, pkg: PackagePage): string {
  const through = pkg.downloads && shortDate(pkg.downloads.through);
  const read = shortDate(pkg.dependentsReadAt);
  const next = shortDate(pkg.nextDependentsReadAt);
  return [
    through && `Downloads from ${REGISTRIES[registry].label} through ${through}`,
    read && `Dependents read ${read}${next ? `, next read ${next}` : ''}`,
  ]
    .filter(Boolean)
    .join(' · ');
}

/** The package in plain sentences, last: what a reader without the cards learns, and when its data was read. */
const About: FC<{ registry: RegistryId; pkg: PackagePage }> = ({ registry, pkg }) => {
  const dataLine = dataLineOf(registry, pkg);
  return (
    <section aria-labelledby="about" className="flex flex-col gap-2 border-t pt-6">
      <h2 id="about" className="text-base font-semibold [overflow-wrap:anywhere]">
        {`About ${spelledNameOf(pkg)}`}
      </h2>
      <ProfileSummary parts={buildPackageSummary(registry, pkg, pkg.dependents?.items[0])} />
      {dataLine && (
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Timer className="mt-px size-3.5 shrink-0" aria-hidden />
          {dataLine}
        </p>
      )}
    </section>
  );
};

/**
 * A package's page from its data: on the left its name, Follow, Refresh beside the registry's mark, and its facts; on
 * the right its ranks (once ranked) and downloads, who uses it, its downloads by week, its badge, and last the package
 * in sentences. A package nobody has read yet shows its name, Refresh and one empty state; while package data cannot
 * be read, one line says so.
 */
export const PackageScreen: FC<PackageScreenProps> = ({ registry, name, pkg, jsonLd }) => {
  if (pkg === 'unavailable') {
    return (
      <Frame
        left={
          <>
            <Head registry={registry} name={name} />
            <ActionsContainer className="items-start">
              <OpenOnRegistry registry={registry} name={name} />
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

  const spelled = spelledNameOf(pkg);
  const button = (
    <PackageUpdatesButton
      registry={registry}
      name={pkg.name}
      spelledName={spelled}
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
            <Head registry={registry} name={spelled} />
            <ActionsContainer>
              <ActionRow>
                {button}
                <OpenOnRegistry registry={registry} name={pkg.name} />
              </ActionRow>
            </ActionsContainer>
          </>
        }
      >
        <EmptyState title={PACKAGE_NOT_READ.title} text={PACKAGE_NOT_READ.text} />
      </Frame>
    );
  }

  const ranked = hasRanks(pkg.ranks);

  return (
    <Frame
      left={
        <>
          <Head registry={registry} name={spelled} description={pkg.description} deprecated={pkg.deprecated} />
          {/* On a phone the facts come first, as one wrapped line, and the buttons after them. */}
          <ActionsContainer className="max-md:order-1">
            <FollowSlot packages={[{ registry, name: pkg.name }]} label={spelled} placement="package-page" />
            <ActionRow>
              {button}
              <OpenOnRegistry registry={registry} name={pkg.name} />
            </ActionRow>
          </ActionsContainer>
          <Facts pkg={pkg} />
        </>
      }
    >
      {!!jsonLd?.length && <JsonLd payloads={jsonLd} />}
      {(ranked || pkg.downloads) && (
        <ProfileCardsGrid className="grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))]">
          {ranked && <PackageRanksCard registry={registry} ranks={pkg.ranks} />}
          {pkg.downloads && <PackageDownloadsCard registry={registry} downloads={pkg.downloads} repo={pkg.repo} />}
        </ProfileCardsGrid>
      )}
      <UsedBy registry={registry} pkg={pkg} />
      {pkg.downloads && <Downloads registry={registry} downloads={pkg.downloads} />}
      <PackageBadgeSection registry={registry} name={pkg.name} />
      <About registry={registry} pkg={pkg} />
    </Frame>
  );
};
