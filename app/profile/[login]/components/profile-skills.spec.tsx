// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/workspace/masked-issue.actions', () => ({
  lookAtIssue: vi.fn(),
  signInToSeeIssue: vi.fn(),
  skipMaskedIssue: vi.fn(),
}));
const { useSession } = vi.hoisted(() => ({ useSession: vi.fn() }));
vi.mock('next-auth/react', () => ({ useSession }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }));

const { ProfileSkills } = await import('./profile-skills');
const { contributorNumbers, learnerNumbers } = await import('@/lib/skills/__fixtures__/skills');
const { maskedIssue } = await import('@/lib/workspace/__fixtures__/masked-issue');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
let fetchMock: ReturnType<typeof vi.fn>;

const json = (body: unknown) => ({ ok: true, json: async () => body }) as Response;
const NONE = { sides: null, block: null, learnRows: null };
type Answers = { brief?: unknown; picks?: unknown; skills?: unknown };
const answers = ({ brief = null, picks = { kind: 'none' }, skills = NONE }: Answers) =>
  fetchMock.mockImplementation(async (url: string) => {
    if (url.startsWith('/api/skills/')) return json({ brief });
    if (url.startsWith('/api/me/contribute/profile-block')) return json(picks);
    if (url.startsWith('/api/me/skills/profile')) return json(skills);
    throw new Error(`unexpected read ${url}`);
  });
const signedInAs = (login: string | null) =>
  useSession.mockReturnValue({ data: login ? { user: { githubLogin: login } } : null });
const settle = async () => {
  for (let i = 0; i < 5; i++) await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
};
const draw = async () => {
  await act(async () => root.render(<ProfileSkills login="octocat" />));
  await settle();
};
const urls = () => fetchMock.mock.calls.map(([url]) => url as string);
const q = (selector: string) => container.querySelector(selector);

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  // The masked rows' "Why do we hide issue details?" asks the screen's width.
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }));
  signedInAs(null);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("the overview's Skills block", () => {
  it('draws nothing in the server HTML, for a visitor: the block holds no place while it loads', () => {
    expect(renderToStaticMarkup(<ProfileSkills login="octocat" />)).toBe('');
  });

  it('shows everyone the public numbers, with the link to the tab, asking nothing about the reader', async () => {
    answers({ brief: { login: 'octocat', numbers: contributorNumbers } });
    await draw();
    expect(q('h3#profile-skills')?.textContent).toBe('Skills');
    expect(container.textContent).toContain('All 6 fixes');
    expect(q('a[href="/profile/octocat/skills"]')).not.toBeNull();
    expect(urls()).toEqual(['/api/skills/octocat']);
  });

  it('adds nothing without a public page, nor when the numbers cannot be read', async () => {
    answers({ brief: null });
    await draw();
    expect(container.innerHTML).toBe('');
    fetchMock.mockImplementation(async () => ({ ok: false }) as Response);
    await act(async () => root.render(<ProfileSkills login="hubot" />));
    await settle();
    expect(container.innerHTML).toBe('');
  });
});

describe("the owner's own overview", () => {
  /** The owner's reads held until `release`, the public numbers answered at once; the page's top-level insertions. */
  const held = (skills: unknown, picks: unknown = { kind: 'none' }) => {
    let release: () => void = () => {};
    const wait = new Promise<void>((resolve) => {
      release = resolve;
    });
    fetchMock.mockImplementation(async (url: string) => {
      if (url.startsWith('/api/skills/')) {
        return json({ brief: { login: 'octocat', numbers: learnerNumbers } });
      }
      await wait;
      return json(url.startsWith('/api/me/skills/profile') ? skills : picks);
    });
    const batches: MutationRecord[][] = [];
    const observer = new MutationObserver((records) => batches.push(records));
    observer.observe(container, { childList: true });
    return {
      release: () => act(async () => release()),
      added: () => batches.filter((batch) => batch.some((record) => record.addedNodes.length)).length,
      removed: () => batches.flat().some((record) => record.removedNodes.length),
      stop: () => observer.disconnect(),
    };
  };

  it("draws nothing for the owner while a read of theirs is on its way, though everyone else's numbers are in", async () => {
    signedInAs('OctoCat');
    const page = held(NONE);
    await draw();
    expect(container.innerHTML).toBe('');
    await page.release();
    await settle();
    page.stop();
  });

  it('gives an owner whose box comes back empty the block alone, put in once', async () => {
    signedInAs('octocat');
    const page = held({ ...NONE, sides: { usesContribute: false, usesLearn: true }, learnRows: [] });
    await draw();
    await page.release();
    await settle();
    page.stop();
    expect(q('[data-owner-box]')).toBeNull();
    expect(q('h3#profile-skills')).not.toBeNull();
    expect(page.added()).toBe(1);
    expect(page.removed()).toBe(false);
  });

  it('gives an owner with a box the box and the block at once', async () => {
    signedInAs('octocat');
    const page = held({
      ...NONE,
      sides: { usesContribute: false, usesLearn: true },
      learnRows: [{ kind: 'masked', masked: maskedIssue() }],
    });
    await draw();
    await page.release();
    await settle();
    page.stop();
    expect(q('[data-owner-box="learn"]')).not.toBeNull();
    expect(q('h3#profile-skills')).not.toBeNull();
    expect(page.added()).toBe(1);
    expect(page.removed()).toBe(false);
  });

  it('draws nothing while the session is unknown, so the owner never sees the block come and go', async () => {
    useSession.mockReturnValue({ data: null, status: 'loading' });
    answers({ brief: { login: 'octocat', numbers: contributorNumbers } });
    await draw();
    expect(container.innerHTML).toBe('');
  });

  it('puts the box above the block', async () => {
    signedInAs('octocat');
    answers({
      brief: { login: 'octocat', numbers: learnerNumbers },
      skills: {
        ...NONE,
        sides: { usesContribute: false, usesLearn: true },
        learnRows: [{ kind: 'masked', masked: maskedIssue() }],
      },
    });
    await draw();
    const box = q('[data-owner-box="learn"]');
    const block = q('#profile-skills');
    expect(box && block && box.compareDocumentPosition(block) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(urls()).toContain('/api/me/skills/profile?login=octocat');
  });

  it('gives the owner of a hidden page their block, with the line that says so', async () => {
    signedInAs('octocat');
    answers({ brief: null, skills: { ...NONE, block: { numbers: learnerNumbers, state: 'HIDDEN' } } });
    await draw();
    expect(q('[data-skills-block-owner]')?.textContent).toContain(
      'Only you see this block. Your Skills page is hidden.',
    );
    expect(container.textContent).toContain('Open your Skills page');
  });

  it("never draws the owner's block for someone else", async () => {
    signedInAs('someone');
    answers({ brief: null, skills: { ...NONE, block: { numbers: learnerNumbers, state: 'HIDDEN' } } });
    await draw();
    expect(container.innerHTML).toBe('');
    expect(urls()).toEqual(['/api/skills/octocat']);
  });
});
