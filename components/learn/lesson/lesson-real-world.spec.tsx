// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const actions = vi.hoisted(() => ({ lookAtIssue: vi.fn(), signInToSeeIssue: vi.fn(), skipMaskedIssue: vi.fn() }));
vi.mock('@/lib/workspace/masked-issue.actions', () => actions);
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }) }));

const { LessonRealWorld, LessonRealWorldStreamed } = await import('./lesson-real-world');
const { issueRows, learnFixes } = await import('@/lib/learn/__fixtures__/issues');
const { lessonRealIssues, lessonRealWithFix, myFixMerged } = await import('@/lib/learn/__fixtures__/real-issues');
const { maskedIssue } = await import('@/lib/workspace/__fixtures__/masked-issue');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
window.matchMedia = ((query: string) => ({
  matches: true,
  media: query,
  addEventListener: () => {},
  removeEventListener: () => {},
})) as unknown as typeof window.matchMedia;

let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
  for (const action of Object.values(actions)) action.mockReset();
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

const draw = (node: ReactNode) =>
  act(async () => {
    root.render(node);
  });
const $ = (selector: string) => host.querySelector<HTMLElement>(selector);
const shownIds = () =>
  [...host.querySelectorAll('[data-real-issue] [data-masked-row]')].map((row) => row.getAttribute('data-masked-row'));
const within = (id: string, label: string) =>
  [...(host.querySelector(`[data-masked-row="${id}"]`)?.querySelectorAll<HTMLElement>('button, a') ?? [])].find(
    (each) => each.textContent?.trim() === label,
  ) ?? null;
const press = (element: HTMLElement | null) =>
  act(async () => {
    if (!element) throw new Error('No button');
    element.click();
  });
const skip = async (id: string) => {
  await press(within(id, 'Skip'));
  await press(within(id, 'Too hard for me'));
};

describe('the issues of the person under a lesson', () => {
  // The person's list for the lesson: five rows, three shown.
  const mine = { ...lessonRealIssues, rows: issueRows };

  it("puts the next row of the lesson's own list in a skipped row's place, never the skip's next issue", async () => {
    // The skip answers an issue from the whole list, which may be for another lesson.
    actions.skipMaskedIssue.mockResolvedValue({ ok: true, data: maskedIssue({ id: 'zz-other-lesson' }) });
    await draw(<LessonRealWorld slug="find-duplicates-with-a-set" fixes={null} mine={mine} />);
    const [first, second, third, fourth, fifth] = issueRows.map((row) => row.issue.id);
    expect(shownIds()).toEqual([first, second, third]);
    await skip(second);
    expect(shownIds()).toEqual([first, fourth, third]);
    await skip(first);
    expect(shownIds()).toEqual([fifth, fourth, third]);
    // Nothing of the lesson's list is left: the skipped row leaves.
    await skip(third);
    expect(shownIds()).toEqual([fifth, fourth]);
    expect(host.textContent).not.toContain('zz-other-lesson');
  });
});

describe("the person's own fix under a lesson", () => {
  it('leaves out the column of other people when theirs is the only fix', async () => {
    const only = {
      ...learnFixes,
      rows: [{ ...learnFixes.rows[0], repo: 'harbor-kit/relay', issueNumber: 431 }],
      total: 1,
    };
    await draw(
      <LessonRealWorld
        slug="find-duplicates-with-a-set"
        fixes={only}
        mine={{ ...lessonRealWithFix, real: { fix: myFixMerged, fixAnIssue: null } }}
      />,
    );
    expect($('[data-real-column="mine"]')).not.toBeNull();
    expect($('[data-real-column="others"]')).toBeNull();
    expect(host.textContent).not.toContain('No fix has used this idea yet');
  });

  it("lists other people's fixes beside it while there are some", async () => {
    await draw(<LessonRealWorld slug="find-duplicates-with-a-set" fixes={learnFixes} mine={lessonRealWithFix} />);
    expect($('[data-real-column="others"]')!.querySelectorAll('[data-fix-row]')).toHaveLength(2);
  });
});

describe('merged fixes under a lesson', () => {
  it('leaves out the line naming the lesson, which would link to the page itself', async () => {
    await draw(<LessonRealWorld slug="find-duplicates-with-a-set" fixes={learnFixes} mine={null} />);
    expect($('[data-fix-row]')).not.toBeNull();
    expect($('[data-fix-row] [data-lesson]')).toBeNull();
    expect(host.querySelector('a[href="/learn/lessons/find-duplicates-with-a-set"]')).toBeNull();
  });

  it("draws the person's parts while the fixes are on their way, then the fixes when they come", async () => {
    let resolve!: (fixes: typeof learnFixes | null) => void;
    const fixes = new Promise<typeof learnFixes | null>((done) => {
      resolve = done;
    });
    await draw(
      <LessonRealWorldStreamed
        slug="find-duplicates-with-a-set"
        fixes={fixes}
        mine={{ ...lessonRealIssues, fixes: null }}
      />,
    );
    expect($('[data-real-column="issues"]')).not.toBeNull();
    await act(async () => resolve(learnFixes));
    expect($('[data-real-column="fixes"]')!.textContent).toContain(learnFixes.rows[0].title);
  });

  it('is nothing for a visitor whose fixes come as none', async () => {
    await draw(<LessonRealWorldStreamed slug="find-duplicates-with-a-set" fixes={Promise.resolve(null)} mine={null} />);
    expect($('[data-lesson-real-world]')).toBeNull();
  });
});
