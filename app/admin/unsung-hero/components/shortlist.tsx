import type { HeroCandidate, HeroMiss } from '../admin.types';
import { compact, full, monthYear, refusalText, skipConfirm, stamp } from '../admin-copy';
import { ConfirmPress } from './confirm-press';
import type { PressAction } from './press';
import { Link } from '@/components/link/link';
import { Pill } from '@/components/pill/pill';
import { Button } from '@/components/ui/button';
import { getRepoPath } from '@/utils/repo-paths';

/** A rule the candidate misses: amber, red when it blocks a real slot (no public email, no link from GitHub). */
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

/** The shortlist: the board's rules line, then each candidate with what it misses, its numbers, Skip and Schedule. */
export function ShortlistTable({
  shortlist,
  builtAt,
  action,
  pending,
  onSchedule,
}: Readonly<{
  shortlist: HeroCandidate[];
  builtAt: string | null;
  action?: PressAction;
  pending?: boolean;
  onSchedule?: (repoGithubId: string) => void;
}>) {
  return (
    <section className="flex flex-col rounded-xl border bg-card shadow-sm dark:shadow-none">
      <div className="flex flex-col gap-1 p-4">
        <h2 className="text-base font-semibold">Shortlist</h2>
        <p className="text-sm text-muted-foreground">
          Shortlist rules: personal account, owner under 500 followers, repository under 1,000 stars, a push in the last
          12 months, no open security advisory, OSI license. Labels show which rule a candidate misses; you can still
          schedule it. A real slot also needs a public email and GitHub’s own link from the package (red labels).
        </p>
        <p className="text-xs text-muted-foreground">
          {builtAt ? `Built ${stamp(builtAt)}. Rebuilt every Tuesday.` : 'Not built yet. It is rebuilt every Tuesday.'}
        </p>
      </div>
      {shortlist.length ? (
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
                <th scope="col" className="px-2 py-2 text-right font-medium">
                  Weekly downloads
                </th>
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
              {shortlist.map((candidate) => (
                <tr key={candidate.repo.githubId} className="border-b align-top last:border-0 hover:bg-accent/60">
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <Link
                        href={getRepoPath(candidate.repo.nameWithOwner)}
                        className="font-medium text-foreground no-underline hover:underline"
                      >
                        {candidate.repo.nameWithOwner}
                      </Link>
                      <span className="text-xs text-muted-foreground break-all">{candidate.package.name}</span>
                      <MissLabels misses={candidate.misses} />
                      <CheckLine candidate={candidate} />
                    </div>
                  </td>
                  <td className="px-2 py-3 text-right font-mono tabular-nums">{full(candidate.stars)}</td>
                  <td className="px-2 py-3 text-right font-mono tabular-nums">{compact(candidate.weeklyDownloads)}</td>
                  <td className="px-2 py-3 text-right font-mono tabular-nums text-muted-foreground">
                    {full(candidate.dependents)}
                  </td>
                  <td className="px-2 py-3 text-right font-mono tabular-nums">{full(candidate.owner.followers)}</td>
                  <td className="whitespace-nowrap px-2 py-3 text-muted-foreground">{monthYear(candidate.pushedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <ConfirmPress
                        action={action}
                        pending={pending}
                        intent="skip"
                        fields={{ repoGithubId: candidate.repo.githubId }}
                        variant="ghost"
                        label="Skip"
                        copy={skipConfirm(candidate.repo.nameWithOwner)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        onClick={() => onSchedule?.(candidate.repo.githubId)}
                      >
                        Schedule
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-4 pb-4 text-sm text-muted-foreground">Nobody on the shortlist.</p>
      )}
    </section>
  );
}
