import { isValidElement, type ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadLearnAddress, notFound } = vi.hoisted(() => ({
  loadLearnAddress: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ notFound }));
vi.mock('@/lib/learn/lesson-page.data', () => ({ loadLearnAddress }));

const { default: RepoCourseGonePage, generateMetadata, instant } = await import('./page');
const OrgGone = await import('../../../../orgs/%5Fgone/[login]/page');
const { CourseGoneView } = await import('@/components/learn/course/course-gone');

const paused = { state: 'PAUSED', movedTo: null, title: 'Django, from the inside', course: null, project: true };
const removed = { ...paused, state: 'REMOVED' };
const repoProps = (owner: string, name: string) =>
  ({ params: Promise.resolve({ owner, name }) }) as unknown as PageProps<'/learn/repos/_gone/[owner]/[name]'>;
const orgProps = (login: string) =>
  ({ params: Promise.resolve({ login }) }) as unknown as PageProps<'/learn/orgs/_gone/[login]'>;

/** The route's page is the shared page for its project: drawn here as React would. */
const drawn = async (page: Promise<ReactElement> | ReactElement) => {
  const element = await page;
  return (element.type as (props: unknown) => Promise<ReactElement>)(element.props);
};

beforeEach(() => loadLearnAddress.mockReset());

describe("a paused or removed project course's page", () => {
  it('streams, reading nothing ahead of a request', () => {
    expect(instant).toBe(false);
    expect(OrgGone.instant).toBe(false);
  });

  it("draws the state its project's address answers, naming the course", async () => {
    loadLearnAddress.mockResolvedValueOnce(removed);
    const page = await drawn(RepoCourseGonePage(repoProps('Django', 'Django')));
    expect(isValidElement(page) && page.type).toBe(CourseGoneView);
    const { text, state } = (page as { props: { text: { lead: string }; state: string } }).props;
    expect(state).toBe('removed');
    expect(text.lead).toContain('“Django, from the inside”');
    expect(loadLearnAddress).toHaveBeenCalledWith('repository', 'django/django');

    loadLearnAddress.mockResolvedValueOnce(paused);
    const org = await drawn(OrgGone.default(orgProps('kubernetes')));
    expect((org as { props: { state: string } }).props.state).toBe('paused');
    expect(loadLearnAddress).toHaveBeenLastCalledWith('org', 'kubernetes');
  });

  it('is not there for a course that is neither, nor for names GitHub cannot have', async () => {
    for (const address of [null, { ...paused, state: 'LIVE' }]) {
      loadLearnAddress.mockResolvedValueOnce(address);
      await expect(drawn(RepoCourseGonePage(repoProps('django', 'django')))).rejects.toThrow('NEXT_NOT_FOUND');
    }
    loadLearnAddress.mockClear();
    await expect(drawn(OrgGone.default(orgProps('_gone')))).rejects.toThrow('NEXT_NOT_FOUND');
    expect(loadLearnAddress).not.toHaveBeenCalled();
  });

  it('keeps search engines away, even when the address cannot be read', async () => {
    loadLearnAddress.mockRejectedValueOnce(new Error('down'));
    expect((await generateMetadata(repoProps('django', 'django'))).robots).toEqual({ index: false, follow: false });
  });
});
