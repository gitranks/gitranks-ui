import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LearnAddressGate } from './address-gate';

const { learnAddressGateOf } = vi.hoisted(() => ({
  learnAddressGateOf: vi.fn(async (_kind: string, _slug: string): Promise<LearnAddressGate> => ({ kind: 'page' })),
}));
vi.mock('./address-gate', () => ({ LEARN_ADDRESS_TIMEOUT_MS: 2000, learnAddressGateOf }));

const { checkGateOf, courseGateOf } = await import('./course-gate');

beforeEach(() => learnAddressGateOf.mockReset());

describe("a course's gate", () => {
  it('asks the address as a course, and answers each state as the page should', async () => {
    const cases: [LearnAddressGate, unknown][] = [
      [{ kind: 'page' }, { kind: 'page' }],
      [{ kind: 'missing' }, { kind: 'missing' }],
      [{ kind: 'paused' }, { kind: 'gone', status: 503, path: '/learn/courses/_gone/algorithms' }],
      [{ kind: 'removed' }, { kind: 'gone', status: 410, path: '/learn/courses/_gone/algorithms' }],
      [
        { kind: 'moved', path: '/learn/courses/algorithms-and-data' as never, slug: 'algorithms-and-data' },
        { kind: 'redirect', path: '/learn/courses/algorithms-and-data' },
      ],
    ];
    for (const [address, gate] of cases) {
      learnAddressGateOf.mockResolvedValueOnce(address);
      expect(await courseGateOf('algorithms'), address.kind).toEqual(gate);
    }
    expect(learnAddressGateOf).toHaveBeenCalledWith('course', 'algorithms', 2000);
  });

  it('lets the page answer when the ask failed or was slow', async () => {
    learnAddressGateOf.mockResolvedValueOnce({ kind: 'unknown' });
    expect(await courseGateOf('algorithms')).toEqual({ kind: 'page' });
  });
});

describe("a course's check's gate", () => {
  it("asks the course, answers as the course's page does, and sends a moved course to the new one's check", async () => {
    const cases: [LearnAddressGate, unknown][] = [
      [{ kind: 'page' }, { kind: 'page' }],
      [{ kind: 'unknown' }, { kind: 'page' }],
      [{ kind: 'missing' }, { kind: 'missing' }],
      [{ kind: 'paused' }, { kind: 'gone', status: 503, path: '/learn/courses/_gone/algorithms' }],
      [{ kind: 'removed' }, { kind: 'gone', status: 410, path: '/learn/courses/_gone/algorithms' }],
      [
        { kind: 'moved', path: '/learn/courses/algorithms-and-data' as never, slug: 'algorithms-and-data' },
        { kind: 'redirect', path: '/learn/check/algorithms-and-data' },
      ],
    ];
    for (const [address, gate] of cases) {
      learnAddressGateOf.mockResolvedValueOnce(address);
      expect(await checkGateOf('algorithms'), address.kind).toEqual(gate);
    }
    expect(learnAddressGateOf).toHaveBeenCalledWith('course', 'algorithms', 2000);
  });
});
