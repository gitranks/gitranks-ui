// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/learn/issues.actions', () => ({ setLearnIssuesEmailAction: vi.fn(), readMoreLearnFixes: vi.fn() }));
vi.mock('@/lib/workspace/masked-issue.actions', () => ({
  lookAtIssue: vi.fn(),
  signInToSeeIssue: vi.fn(),
  skipMaskedIssue: vi.fn(),
}));
// A person with a session.
vi.mock('@/lib/session-hint', () => ({ hasSessionHint: () => true }));

const { MyProgressLive } = await import('./my-progress-live');
const { myProgress, myProgressEmpty } = await import('@/lib/learn/__fixtures__/my-progress');

/*
 * My progress without Interviews' row, as a learner Interviews is closed to gets it: the stored markup was drawn by
 * the page before Interviews joined it, so any change to today's page shows here.
 */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

/** The page once the person's progress is in: Interviews answers that it is closed to them. */
async function markupOf(progress: unknown): Promise<string> {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (path: string) =>
      path.startsWith('/api/me/interviews/') ? json({ open: false, home: null }) : json({ progress, signedOut: false }),
    ),
  );
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(<MyProgressLive view="courses" day={null} />);
  });
  await act(async () => {});
  const markup = host.innerHTML;
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
  return markup;
}

describe("My progress without Interviews' row", () => {
  it("is today's page", async () => {
    const pages = [
      `<!-- progress -->\n${await markupOf(myProgress)}\n`,
      `<!-- nothing yet -->\n${await markupOf(myProgressEmpty)}\n`,
    ];
    await expect(pages.join('\n')).toMatchFileSnapshot('./__snapshots__/my-progress-today.html');
  });
});
