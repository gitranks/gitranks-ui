import { Package, PackageSearch } from 'lucide-react';
import type { Route } from 'next';
import NextLink from 'next/link';
import type { FC } from 'react';

import { PACKAGES_UNAVAILABLE_TEXT } from '../../../tab-seo';
import {
  buildUsedByQuestions,
  buildUsedBySummary,
  listText,
  noDependentsNote,
  noDependentsTitle,
} from '../../../utils/used-by-summary';
import { PackageCard } from './package-card';
import { PackagesTable } from './packages-table';
import { UsedByList } from './used-by-list';
import { ProfileCard } from '@/app/profile/[login]/components/profile-card';
import { ProfileSummary } from '@/app/profile/[login]/components/profile-summary';
import {
  registryOfRepoPackage,
  repoPackageRefOf,
  spansRegistries,
} from '@/app/repo/[owner]/[name]/utils/repo-package-registry';
import { JsonLd } from '@/components/json-ld/json-ld';
import { FollowSlot } from '@/components/package-follow/follow-slot';
import { QuestionsBlock } from '@/components/questions-block/questions-block';
import { Button } from '@/components/ui/button';
import type { Unavailable } from '@/graphql/helpers/fetch-repo-packages';
import type { RepoPackages, RepoUsedBy } from '@/graphql/repo-packages';
import {
  DEFAULT_REGISTRY,
  DOWNLOADS_UNIT_TEXT,
  downloadsUnitOf,
  REGISTRIES,
  spelledNameOf,
} from '@/lib/packages/registries';
import { packagePath } from '@/utils/package-paths';

type UsedByScreenProps = {
  nameWithOwner: string;
  /** What it publishes; "unavailable" while package data cannot be read. */
  packages: RepoPackages | Unavailable;
  /** The first page of its dependents, unfiltered; `null` without a dependent. */
  firstPage: RepoUsedBy | Unavailable | null;
  /** The tab's JSON-LD, but its questions' (the Questions block draws those). */
  jsonLd?: object[];
};

/**
 * "from npm, weekly", "from npm, weekly, and from PyPI, monthly": where the downloads the tab shows come from and how
 * often each is counted, for the registries of the repository's packages that count them (the default registry while
 * its packages are not known); `null` when none of them counts downloads.
 */
function downloadsFromText(packages: RepoPackages | null): string | null {
  const listed = packages ? [...new Set(packages.items.map(registryOfRepoPackage))] : [];
  const counted = listed.filter((id) => downloadsUnitOf(id));
  // Packages on registries with no download counts (Go, Maven Central, pub.dev before its first): nothing is said of
  // downloads.
  if (listed.length && !counted.length) return null;
  // Packages not known (they could not be read): the default registry's, as the tab always said.
  const ids = counted.length ? counted : [DEFAULT_REGISTRY];
  return (['week', 'month'] as const)
    .flatMap((unit) => {
      const labels = ids.filter((id) => downloadsUnitOf(id) === unit).map((id) => REGISTRIES[id].label);
      return labels.length ? [`from ${listText(labels)}, ${DOWNLOADS_UNIT_TEXT[unit].adjective}`] : [];
    })
    .join(', and ');
}

function introOf(packages: RepoPackages | null): string {
  const from = downloadsFromText(packages);
  return `Repositories with 100+ stars that depend directly on a package this repository publishes. Forks, lockfiles and example folders don't count. Read monthly${from ? `; downloads ${from}` : ''}.`;
}

const Heading: FC<{ packages: RepoPackages | null }> = ({ packages }) => (
  <div className="flex flex-col gap-1">
    <h2 className="text-lg font-semibold">Used by</h2>
    <p className="text-sm text-muted-foreground">{introOf(packages)}</p>
  </div>
);

/** One package: a wide card; two or three: a card each in a row; more: a table of them. */
const PackagesBlock: FC<{ packages: RepoPackages }> = ({ packages }) => {
  if (packages.total === 1) {
    return <PackageCard pkg={packages.items[0]} wide />;
  }
  if (packages.total <= 3) {
    const registryChip = spansRegistries(packages.items);
    return (
      <div className={packages.items.length === 2 ? 'grid gap-4 md:grid-cols-2' : 'grid gap-4 md:grid-cols-3'}>
        {packages.items.map((pkg) => (
          <PackageCard key={`${pkg.registry}/${pkg.name}`} pkg={pkg} registryChip={registryChip} />
        ))}
      </div>
    );
  }
  return <PackagesTable packages={packages} />;
};

/** No repository with 100+ stars depends on it yet: when the next read is, Follow, and its package's page. */
const NoDependents: FC<{ nameWithOwner: string; packages: RepoPackages }> = ({ nameWithOwner, packages }) => {
  const one = packages.total === 1 ? packages.items[0] : null;

  return (
    <ProfileCard className="items-center gap-3 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <PackageSearch className="size-5" aria-hidden />
      </span>
      <span className="font-medium">{noDependentsTitle(packages)}</span>
      <p className="text-sm text-muted-foreground">{noDependentsNote(packages)}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <FollowSlot
          packages={(one ? [one] : packages.items).map(repoPackageRefOf)}
          label={one ? spelledNameOf(one) : `${nameWithOwner} packages`}
          placement="used-by-empty"
        />
        {one && (
          <Button variant="outline" asChild>
            <NextLink href={packagePath(one.name, registryOfRepoPackage(one)) as Route} prefetch={false}>
              <Package aria-hidden />
              Package page
            </NextLink>
          </Button>
        )}
      </div>
    </ProfileCard>
  );
};

/**
 * A repository's Used by tab: the repositories with 100+ stars that depend directly on the packages it publishes,
 * by how many packages it has (one, two or three, more) and with none yet; or the one state while package data cannot
 * be read.
 */
export const UsedByScreen: FC<UsedByScreenProps> = ({ nameWithOwner, packages, firstPage, jsonLd }) => {
  if (packages === 'unavailable' || firstPage === 'unavailable' || (packages.dependents > 0 && !firstPage)) {
    return (
      <>
        <Heading packages={packages === 'unavailable' ? null : packages} />
        <ProfileCard>
          <p className="text-sm text-muted-foreground">{PACKAGES_UNAVAILABLE_TEXT}</p>
        </ProfileCard>
      </>
    );
  }

  const rows = firstPage?.items ?? [];
  const questions = buildUsedByQuestions(nameWithOwner, packages, rows);

  return (
    <>
      {!!jsonLd?.length && <JsonLd payloads={jsonLd} />}
      <Heading packages={packages} />
      <ProfileSummary parts={buildUsedBySummary(nameWithOwner, packages, rows)} />
      {(packages.dependents > 0 || packages.total > 1) && <PackagesBlock packages={packages} />}
      {packages.dependents === 0 || !firstPage ? (
        <NoDependents nameWithOwner={nameWithOwner} packages={packages} />
      ) : (
        <UsedByList nameWithOwner={nameWithOwner} packages={packages.items} total={packages.total} initial={firstPage}>
          {questions.length > 0 && (
            <ProfileCard className="gap-3">
              <h2 className="text-base font-semibold">Questions</h2>
              <QuestionsBlock items={questions} jsonLd className="flex flex-col gap-3 text-sm" />
            </ProfileCard>
          )}
        </UsedByList>
      )}
    </>
  );
};
