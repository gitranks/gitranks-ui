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

describe("a project course's gate", () => {
  it("sends a course asked for by its slug to its project's address, and keeps its check at its slug", async () => {
    const elsewhere: LearnAddressGate = { kind: 'elsewhere', path: '/learn/repos/django/django' as never };
    learnAddressGateOf.mockResolvedValueOnce(elsewhere);
    expect(await courseGateOf('django')).toEqual({ kind: 'redirect', path: '/learn/repos/django/django' });
    learnAddressGateOf.mockResolvedValueOnce(elsewhere);
    expect(await checkGateOf('django')).toEqual({ kind: 'page' });
  });

  it("asks the course by its project, and shows a paused or removed one at the project's `_gone` address", async () => {
    const { projectCourseGateOf } = await import('./course-gate');
    const repo = { kind: 'repository', slug: 'django/django' } as const;
    const org = { kind: 'org', slug: 'kubernetes' } as const;
    const cases: [typeof repo | typeof org, LearnAddressGate, unknown][] = [
      [repo, { kind: 'page' }, { kind: 'page' }],
      [repo, { kind: 'unknown' }, { kind: 'page' }],
      [repo, { kind: 'missing' }, { kind: 'missing' }],
      [repo, { kind: 'paused' }, { kind: 'gone', status: 503, path: '/learn/repos/_gone/django/django' }],
      [org, { kind: 'removed' }, { kind: 'gone', status: 410, path: '/learn/orgs/_gone/kubernetes' }],
      [
        org,
        { kind: 'moved', path: '/learn/courses/k8s' as never, slug: 'k8s' },
        { kind: 'redirect', path: '/learn/courses/k8s' },
      ],
    ];
    for (const [route, address, gate] of cases) {
      learnAddressGateOf.mockResolvedValueOnce(address);
      expect(await projectCourseGateOf(route), `${route.kind} ${address.kind}`).toEqual(gate);
    }
    expect(learnAddressGateOf).toHaveBeenCalledWith('repository', 'django/django', 2000);
    expect(learnAddressGateOf).toHaveBeenCalledWith('org', 'kubernetes', 2000);
  });

  it('sends another spelling of the project to its address in lower case, without asking', async () => {
    const { projectCourseGateOf } = await import('./course-gate');
    expect(await projectCourseGateOf({ kind: 'repository', slug: 'Django/Django' })).toEqual({
      kind: 'redirect',
      path: '/learn/repos/django/django',
    });
    expect(await projectCourseGateOf({ kind: 'org', slug: 'Kubernetes' })).toEqual({
      kind: 'redirect',
      path: '/learn/orgs/kubernetes',
    });
    expect(learnAddressGateOf).not.toHaveBeenCalled();
  });
});
