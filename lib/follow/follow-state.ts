import type { FollowChannel, FollowEvents, FollowPackage, FollowRow } from './follow.types';
import { packageKeyOf } from '@/lib/packages/registries';

// The signed-in viewer's follows as the slot and its dialog read them. Only an active follow counts: a pending one waits
// for its confirmation, and a removed one is kept a while only for Undo.

/** Every switch on: what a first follow asks for unless the person turns one off. */
export const ALL_EVENTS: FollowEvents = { notable: true, digest: true, milestones: true };

const inSlot = (packages: readonly FollowPackage[]) => {
  const keys = new Set(packages.map(packageKeyOf));
  return (row: FollowRow) => row.status === 'active' && keys.has(`${row.package.registry}/${row.package.name}`);
};

/** The active follows of the slot's packages. */
export const activeFollowsOf = (packages: readonly FollowPackage[], follows: readonly FollowRow[]) =>
  follows.filter(inSlot(packages));

/** Whether every package of the slot is followed on the channel (any channel when none is named). */
export function followsAll(packages: readonly FollowPackage[], follows: readonly FollowRow[], channel?: FollowChannel) {
  const active = activeFollowsOf(packages, follows).filter((row) => !channel || row.channel === channel);
  const followed = new Set(active.map((row) => row.package.name));
  return packages.length > 0 && packages.every(({ name }) => followed.has(name));
}

/** The switches the dialog starts from: those of the viewer's first active follow of the slot, or every one on. */
export function startingEvents(packages: readonly FollowPackage[], follows: readonly FollowRow[]): FollowEvents {
  const first = activeFollowsOf(packages, follows)[0];
  return first ? { ...first.events } : { ...ALL_EVENTS };
}

export const sameEvents = (a: FollowEvents, b: FollowEvents) =>
  a.notable === b.notable && a.digest === b.digest && a.milestones === b.milestones;

/** The follows with the changed rows in place of the ones they replace, by id. */
export function withChanged(follows: readonly FollowRow[], changed: readonly FollowRow[]): FollowRow[] {
  const byId = new Map(changed.map((row) => [row.id, row]));
  return follows.map((row) => byId.get(row.id) ?? row);
}
