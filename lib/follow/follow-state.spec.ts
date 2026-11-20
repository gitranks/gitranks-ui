import { describe, expect, it } from 'vitest';

import type { FollowRow } from './follow.types';
import { followsAll, startingEvents, withChanged } from './follow-state';

const row = (
  id: string,
  name: string,
  channel: FollowRow['channel'],
  status: FollowRow['status'] = 'active',
): FollowRow => ({
  id,
  channel,
  package: { registry: 'npm', name },
  status,
  events: { notable: true, digest: false, milestones: true },
});
const packages = [
  { registry: 'npm' as const, name: 'a' },
  { registry: 'npm' as const, name: 'b' },
];

describe('the viewer’s follows of a slot', () => {
  it('follow it all only when every package has an active follow', () => {
    expect(followsAll(packages, [row('1', 'a', 'email'), row('2', 'b', 'telegram')])).toBe(true);
    expect(followsAll(packages, [row('1', 'a', 'email'), row('2', 'b', 'telegram')], 'email')).toBe(false);
    expect(followsAll(packages, [row('1', 'a', 'email'), row('2', 'b', 'email', 'removed')])).toBe(false);
    expect(followsAll(packages, [])).toBe(false);
  });

  it('start the switches from the first active follow, or every one on', () => {
    expect(startingEvents(packages, [row('1', 'a', 'email')])).toEqual({
      notable: true,
      digest: false,
      milestones: true,
    });
    expect(startingEvents(packages, [row('1', 'a', 'email', 'removed')])).toEqual({
      notable: true,
      digest: true,
      milestones: true,
    });
  });

  it('put changed follows in place by id', () => {
    const removed = row('1', 'a', 'email', 'removed');
    expect(withChanged([row('1', 'a', 'email'), row('2', 'b', 'email')], [removed])).toEqual([
      removed,
      row('2', 'b', 'email'),
    ]);
  });
});
