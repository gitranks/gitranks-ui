// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MaskedIssueRow } from './masked-issue-row';
import { IssueRow } from '@/components/workspace/issue-row';
import { IssueStartsProvider } from '@/components/workspace/start-control';
import { issue } from '@/lib/contribute/__fixtures__/contribute-overview';
import { fullIssue, looksAtLimit, maskedIssue } from '@/lib/workspace/__fixtures__/masked-issue';
import { issueRowOfContribute } from '@/lib/workspace/issue-row';
import { issuePageHrefOf } from '@/lib/workspace/masked-issue';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock('@/lib/workspace/issue-actions', () => ({ startIssue: vi.fn(), skipIssue: vi.fn() }));
vi.mock('@/lib/workspace/start/start-page.actions', () => ({ readStartPageAttempt: vi.fn() }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const render = (node: ReactNode) => act(async () => root.render(node));
const text = () => container.textContent ?? '';
const button = (label: string) =>
  [...container.querySelectorAll<HTMLElement>('button, a')].find((each) => each.textContent?.trim() === label) ?? null;
const press = (element: HTMLElement | null) =>
  act(async () => {
    if (!element) throw new Error('No button');
    element.click();
  });
const LESSON = { title: 'Find duplicates in one pass with a set', learned: true };

describe('a masked row', () => {
  it('shows the facts, the rewritten title, the lesson and two hints, and nothing that names the issue', async () => {
    await render(<MaskedIssueRow issue={maskedIssue()} lesson={LESSON} />);
    const facts = [...container.querySelectorAll('[data-fact]')].map((each) => each.textContent);
    expect(facts).toEqual(['LanguageTypeScript', 'SizeSsmall', 'KindBug', 'Rank tierPlanet']);
    expect(text()).toContain('Tags show twice in a sidebar after one of them is renamed');
    expect(text()).toContain('Uses Find duplicates in one pass with a set, which you learned.');
    expect([...container.querySelectorAll('[data-hints] li')].map((each) => each.textContent)).toEqual([
      'A maintainer agreed it should be fixed',
      'Merges outside pull requests',
    ]);
    // The tier's glyph and its name, both in the tier's colour.
    const tier = container.querySelector('[data-fact="rank tier"] .text-tier-4-strong');
    expect(tier?.querySelector('svg')).not.toBeNull();
    expect(tier?.textContent).toBe('Planet');
    // No project, number or GitHub link before the press.
    expect(container.querySelector('a[href*="github.com"]')).toBeNull();
    expect(text()).not.toMatch(/#\d|acme/);
    expect(button('See the full issue')?.getAttribute('href')).toBe('/my/issues/q7k2m9xa');
    expect(button('Skip')).not.toBeNull();
  });

  it('says when the lesson is new for the person', async () => {
    await render(
      <MaskedIssueRow issue={maskedIssue()} lesson={{ title: 'A stack: last in, first out', learned: false }} />,
    );
    expect(container.querySelector('[data-lesson]')?.textContent).toBe(
      'Teaches A stack: last in, first out, which is new for you.',
    );
  });

  it('leaves out the facts it does not have, and shows no hints when there are none', async () => {
    await render(
      <MaskedIssueRow
        issue={maskedIssue({ language: null, size: null, kind: 'chore', projectTier: null, hints: [] })}
      />,
    );
    expect(container.querySelectorAll('[data-fact]')).toHaveLength(0);
    expect(container.querySelector('[data-hints]')).toBeNull();
  });

  it('presses "See the full issue" in place, and waits in its place while opening', async () => {
    const onSee = vi.fn();
    await render(<MaskedIssueRow issue={maskedIssue()} onSee={onSee} />);
    await press(button('See the full issue'));
    expect(onSee).toHaveBeenCalledOnce();

    await render(<MaskedIssueRow issue={maskedIssue()} state="opening" onSee={onSee} />);
    const opening = button('Opening…');
    expect(opening?.getAttribute('aria-disabled')).toBe('true');
    await press(opening);
    expect(onSee).toHaveBeenCalledOnce();
    expect(container.querySelector('[data-hints]')).not.toBeNull();
  });

  it("says someone else is looking, in the hints' place, and offers the next one", async () => {
    const onNext = vi.fn();
    await render(<MaskedIssueRow issue={maskedIssue()} state="taken" onNext={onNext} />);
    expect(container.querySelector('[data-row-note]')?.textContent).toBe(
      'Someone else is looking at this one right now.',
    );
    expect(container.querySelector('[data-hints]')).toBeNull();
    expect(button('See the full issue')).toBeNull();
    await press(button('Show the next one'));
    expect(onNext).toHaveBeenCalledOnce();
  });

  it("dims the button at the day's limit, and says when more come", async () => {
    const onSee = vi.fn();
    await render(<MaskedIssueRow issue={maskedIssue()} state="limit" looks={looksAtLimit} onSee={onSee} />);
    expect(container.querySelector('[data-row-note]')?.textContent).toBe(
      'You have seen 10 full issues today. More at 00:00 UTC.',
    );
    const see = button('See the full issue');
    expect(see?.getAttribute('aria-disabled')).toBe('true');
    await press(see);
    expect(onSee).not.toHaveBeenCalled();
  });

  it('says the press gives back the issue held now', async () => {
    await render(<MaskedIssueRow issue={maskedIssue()} state="holding" />);
    expect(container.querySelector('[data-row-note]')?.textContent).toBe(
      'Seeing this one gives back the issue you hold now.',
    );
    expect(button('See the full issue')).not.toBeNull();
  });

  it('shows the project and the issue chip over the same line once the person holds it', async () => {
    await render(<MaskedIssueRow issue={maskedIssue()} state="full" full={fullIssue()} />);
    const line = container.querySelector('[data-full-line]');
    expect(line?.textContent).toContain('acme/notebook');
    expect(line?.textContent).toContain('Issue #1290');
    expect(line?.textContent).toContain('18.4k stars');
    expect(container.querySelector('[data-masked-facts]')).not.toBeNull();
    expect(text()).toContain('Duplicate tags appear in the sidebar after a rename');
    expect(button('Go to the issue')?.getAttribute('href')).toBe('/my/issues/q7k2m9xa');
    expect(button('Skip')).toBeNull();
  });

  it('a label it is given wins over its own, held in full too: "Start fixing it" on the issue a person opened', async () => {
    await render(
      <MaskedIssueRow
        issue={maskedIssue()}
        state="full"
        full={fullIssue()}
        href={issuePageHrefOf('q7k2m9xa', 'contribute')}
        seeLabel="Start fixing it"
        skippable={false}
      />,
    );
    expect(button('Go to the issue')).toBeNull();
    expect(button('Start fixing it')?.getAttribute('href')).toBe('/my/issues/q7k2m9xa?from=contribute');
    expect(button('Skip')).toBeNull();
    await render(<MaskedIssueRow issue={maskedIssue()} seeLabel="Start fixing it" skippable={false} />);
    expect(button('Start fixing it')).not.toBeNull();
    expect(button('See the full issue')).toBeNull();
    expect(button('Skip')).toBeNull();
  });

  it('asks why on Skip, in the row\'s place, with two reasons and "Keep it"', async () => {
    const onSkip = vi.fn();
    await render(<MaskedIssueRow issue={maskedIssue()} onSkip={onSkip} />);
    await press(button('Skip'));
    expect(text()).toContain('Why skip “Tags show twice in a sidebar after one of them is renamed”?');
    expect(document.activeElement?.tagName).toBe('H3');
    await press(button('Keep it'));
    expect(container.querySelector('[data-row-state="masked"]')).not.toBeNull();
    expect(document.activeElement?.textContent).toBe('Skip');

    await press(button('Skip'));
    await press(button('Not interesting to me'));
    expect(onSkip).toHaveBeenCalledWith('NOT_INTERESTING');
    expect(document.activeElement?.textContent).toBe('Skipped. It will not be shown to you again.');
  });

  it("has no live region of its own: a change of state goes to the list's one status line, once", async () => {
    const onStatus = vi.fn();
    await render(<MaskedIssueRow issue={maskedIssue()} onStatus={onStatus} />);
    expect(onStatus).not.toHaveBeenCalled();
    await render(<MaskedIssueRow issue={maskedIssue()} state="taken" onStatus={onStatus} />);
    expect(onStatus).toHaveBeenCalledWith('Someone else is looking at this one right now.');
    await render(<MaskedIssueRow issue={maskedIssue()} state="taken" onStatus={onStatus} />);
    expect(onStatus).toHaveBeenCalledOnce();
    expect(container.querySelector('[role="status"], [aria-live]')).toBeNull();
  });

  it('does not announce the note it is first drawn with', async () => {
    const onStatus = vi.fn();
    await render(<MaskedIssueRow issue={maskedIssue()} state="holding" onStatus={onStatus} />);
    expect(onStatus).not.toHaveBeenCalled();
  });

  it('names the issue to the button that opens it', async () => {
    await render(<MaskedIssueRow issue={maskedIssue()} />);
    const id = button('See the full issue')?.getAttribute('aria-describedby');
    expect(id).toBeTruthy();
    expect(document.getElementById(id ?? '')?.textContent).toBe(
      'Tags show twice in a sidebar after one of them is renamed',
    );
  });

  it('gives a visitor the button without Skip', async () => {
    await render(<MaskedIssueRow issue={maskedIssue()} visitor />);
    expect(button('Skip')).toBeNull();
    expect(button('See the full issue')).not.toBeNull();
  });
});

describe('the issue row', () => {
  it('shows the masked form when the list sends one, and the named row otherwise', async () => {
    const named = issueRowOfContribute(issue());
    const agents = { hosted: true, own: false };
    await render(
      <IssueStartsProvider>
        <IssueRow issue={{ ...named, masked: maskedIssue() }} side="contribute" agents={agents} />
        <IssueRow issue={named} side="contribute" agents={agents} />
      </IssueStartsProvider>,
    );
    expect(container.querySelectorAll('[data-masked-row]')).toHaveLength(1);
    expect(container.querySelectorAll(`[data-issue="${named.issueId}"]`)).toHaveLength(1);
  });
});
