import type { HeroCandidate, HeroMiss, HeroSlot } from '../admin.types';
import {
  byRegistryOrder,
  downloadsCell,
  downloadsHeader,
  full,
  monthYear,
  refusalText,
  registryLabel,
  STATUS_TONE,
  skipConfirm,
  stamp,
  takenTag,
  usageOfRow,
} from '../admin-copy';
import { ConfirmPress } from './confirm-press';
import type { PressAction } from './press';
import { Link } from '@/components/link/link';
import { Pill } from '@/components/pill/pill';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { getRepoPath } from '@/utils/repo-paths';

/** A rule the candidate misses: amber, red when it blocks a slot (no public email, no link from GitHub). */
export function MissLabels({ misses }: Readonly<{ misses: HeroMiss[] }>) {
  if (!misses.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {misses.map((miss) => (
        <Pill key={miss.code} tone={miss.blocks ? 'red' : 'amber'}>
          {miss.label}
        </Pill>
      ))}
    </div>
  );
}

/**
 * Each repository's slot on the board, by its GitHub id: live first, then the coming weeks, then the past. A cancelled
 * slot does not count: its repository may be scheduled again.
 */
export function slotsByRepoOf(slots: readonly HeroSlot[]): Map<string, HeroSlot> {
  const byRepo = new Map<string, HeroSlot>();
  for (const slot of slots) {
    if (slot.status !== 'CANCELLED' && !byRepo.has(slot.repo.githubId)) byRepo.set(slot.repo.githubId, slot);
  }
  return byRepo;
}

/** The row's last live check in one line: ready, or what Schedule would refuse. */
function CheckLine({ candidate }: Readonly<{ candidate: HeroCandidate }>) {
  const check = candidate.liveCheck;
  if (!check) return null;
  const verdict = check.refusals.length
    ? check.refusals.map(refusalText).join(' ')
    : 'nothing stops Schedule (the week aside).';
  return (
    <p className="text-xs text-muted-foreground">
      Checked {stamp(check.at)}: {verdict}
    </p>
  );
}

type RowProps = {
  slots?: ReadonlyMap<string, HeroSlot>;
  action?: PressAction;
  pending?: boolean;
  onSchedule?: (repoGithubId: string) => void;
};

/** The shortlist by registry, in the switch's order: each registry has its own list, numbered on its own. */
export function registryGroupsOf(shortlist: readonly HeroCandidate[]): { registry: string; rows: HeroCandidate[] }[] {
  const byRegistry = new Map<string, HeroCandidate[]>();
  for (const candidate of shortlist) {
    const rows = byRegistry.get(candidate.package.registry) ?? [];
    rows.push(candidate);
    byRegistry.set(candidate.package.registry, rows);
  }
  return [...byRegistry.keys()].sort(byRegistryOrder).map((registry) => ({
    registry,
    rows: [...(byRegistry.get(registry) ?? [])].sort((a, b) => a.position - b.position),
  }));
}

/**
 * One registry's candidates, each with what it misses, its numbers, Skip and Schedule. A candidate with a slot
 * (`slots`, by repository) shows the slot's state and week instead, dimmed, with Schedule off. The downloads column
 * follows the registry's period, and is left out for a registry with no download counts.
 */
function CandidateRows({ rows, slots, action, pending, onSchedule }: Readonly<RowProps & { rows: HeroCandidate[] }>) {
  const downloadsTitle = downloadsHeader(rows.map(usageOfRow));
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr className="border-y">
            <th scope="col" className="px-4 py-2 text-left font-medium">
              Candidate
            </th>
            <th scope="col" className="px-2 py-2 text-right font-medium">
              Stars
            </th>
            {downloadsTitle && (
              <th scope="col" className="px-2 py-2 text-right font-medium">
                {downloadsTitle}
              </th>
            )}
            <th scope="col" className="px-2 py-2 text-right font-medium">
              Used by (100+★)
            </th>
            <th scope="col" className="px-2 py-2 text-right font-medium">
              Owner followers
            </th>
            <th scope="col" className="px-2 py-2 text-left font-medium">
              Last push
            </th>
            <th scope="col" className="px-4 py-2 text-right font-medium">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((candidate) => {
            const slot = slots?.get(candidate.repo.githubId);
            const dim = slot && 'opacity-50';
            return (
              <tr
                key={candidate.repo.githubId}
                className={cn('border-b align-top last:border-0 hover:bg-accent/60', slot && 'bg-muted/40')}
              >
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <Link
                      href={getRepoPath(candidate.repo.nameWithOwner)}
                      className="font-medium text-foreground no-underline hover:underline"
                    >
                      {candidate.repo.nameWithOwner}
                    </Link>
                    <span className="text-xs text-muted-foreground break-all">
                      {registryLabel(candidate.package.registry)} ·{' '}
                      {candidate.package.displayName ?? candidate.package.name}
                    </span>
                    {slot ? (
                      <div id={`slot-of-${candidate.repo.githubId}`} className="flex flex-wrap gap-1">
                        <Pill tone={STATUS_TONE[slot.status]}>{takenTag(slot)}</Pill>
                      </div>
                    ) : (
                      <>
                        <MissLabels misses={candidate.misses} />
                        <CheckLine candidate={candidate} />
                      </>
                    )}
                  </div>
                </td>
                <td className={cn('px-2 py-3 text-right font-mono tabular-nums', dim)}>{full(candidate.stars)}</td>
                {downloadsTitle && (
                  <td className={cn('whitespace-nowrap px-2 py-3 text-right font-mono tabular-nums', dim)}>
                    {downloadsCell(usageOfRow(candidate))}
                  </td>
                )}
                <td className={cn('px-2 py-3 text-right font-mono tabular-nums text-muted-foreground', dim)}>
                  {full(candidate.dependents)}
                </td>
                <td className={cn('px-2 py-3 text-right font-mono tabular-nums', dim)}>
                  {full(candidate.owner.followers)}
                </td>
                <td className={cn('whitespace-nowrap px-2 py-3 text-muted-foreground', dim)}>
                  {monthYear(candidate.pushedAt)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    {!slot && (
                      <ConfirmPress
                        action={action}
                        pending={pending}
                        intent="skip"
                        fields={{ repoGithubId: candidate.repo.githubId }}
                        variant="ghost"
                        label="Skip"
                        copy={skipConfirm(candidate.repo.nameWithOwner)}
                      />
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pending || !!slot}
                      aria-describedby={slot ? `slot-of-${candidate.repo.githubId}` : undefined}
                      onClick={() => onSchedule?.(candidate.repo.githubId)}
                    >
                      Schedule
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The shortlist: the board's rules line, then one list per registry, behind a registry switch when there is more than
 * one (rankings never mix registries, so neither does the shortlist).
 */
export function ShortlistTable({
  shortlist,
  builtAt,
  slots,
  action,
  pending,
  onSchedule,
}: Readonly<
  RowProps & {
    shortlist: HeroCandidate[];
    builtAt: string | null;
  }
>) {
  const groups = registryGroupsOf(shortlist);
  const rowProps = { slots, action, pending, onSchedule };
  return (
    <section className="flex flex-col rounded-xl border bg-card shadow-sm dark:shadow-none">
      <div className="flex flex-col gap-1 p-4">
        <h2 className="text-base font-semibold">Shortlist</h2>
        <p className="text-sm text-muted-foreground">
          Shortlist rules: personal account, owner under 500 followers, repository under 1,000 stars, a push in the last
          12 months, no open security advisory, OSI license. Labels show which rule a candidate misses; you can still
          schedule it. A slot also needs GitHub’s own link from the package and, unless you skip the heads-up, a public
          email (red labels). A candidate that already has a slot shows its week until the next rebuild leaves it out.
        </p>
        <p className="text-xs text-muted-foreground">
          {builtAt ? `Built ${stamp(builtAt)}. Rebuilt every Tuesday.` : 'Not built yet. It is rebuilt every Tuesday.'}
        </p>
      </div>
      {groups.length > 1 ? (
        // Keyed by the registries listed: when Skip empties the open one, the switch opens the first again.
        <Tabs key={groups.map(({ registry }) => registry).join()} defaultValue={groups[0].registry} className="gap-0">
          <div className="px-4 pb-3">
            <TabsList aria-label="Registry">
              {groups.map(({ registry, rows }) => (
                <TabsTrigger key={registry} value={registry}>
                  {registryLabel(registry)}
                  <span className="tabular-nums text-muted-foreground">{rows.length}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {groups.map(({ registry, rows }) => (
            <TabsContent key={registry} value={registry}>
              <CandidateRows rows={rows} {...rowProps} />
            </TabsContent>
          ))}
        </Tabs>
      ) : groups.length ? (
        <CandidateRows rows={groups[0].rows} {...rowProps} />
      ) : (
        <p className="px-4 pb-4 text-sm text-muted-foreground">Nobody on the shortlist.</p>
      )}
    </section>
  );
}
