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
type Answers = { brief?: unknown; learnOpen?: boolean; picks?: unknown; skills?: unknown };
const answers = ({ brief = null, learnOpen = true, picks = { kind: 'none' }, skills = NONE }: Answers) =>
  fetchMock.mockImplementation(async (url: string) => {
    if (url.startsWith('/api/skills/')) return json({ brief, learnOpen });
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
    expect(q('[data-owner-box-slot]')).toBeNull();
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

  it('leaves out Learn’s words while Learn is not open to everyone', async () => {
    answers({ brief: { login: 'octocat', numbers: learnerNumbers }, learnOpen: false });
    await draw();
    expect(container.textContent).not.toContain('Learn');
  });
});

describe("the owner's own overview", () => {
  it("keeps the box's place from the moment the session says it is the owner, until the reads are in", async () => {
    signedInAs('OctoCat');
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    fetchMock.mockImplementation(async (url: string) => {
      if (url.startsWith('/api/skills/')) return json({ brief: null, learnOpen: true });
      await held;
      return json(url.startsWith('/api/me/skills/profile') ? NONE : { kind: 'none' });
    });
    await draw();
    expect(q('[data-owner-box-slot]')).not.toBeNull();
    await act(async () => release());
    await settle();
    expect(q('[data-owner-box-slot]')).toBeNull();
  });

  it('puts the box above the block', async () => {
    signedInAs('octocat');
    answers({
      brief: { login: 'octocat', numbers: learnerNumbers },
      skills: {
        ...NONE,
        sides: { usesContribute: false, usesLearn: true, learnOpen: true },
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
    answers({ brief: null, skills: { ...NONE, block: { numbers: learnerNumbers, state: 'HIDDEN', learnOpen: true } } });
    await draw();
    expect(q('[data-skills-block-owner]')?.textContent).toContain(
      'Only you see this block. Your Skills page is hidden.',
    );
    expect(container.textContent).toContain('Open your Skills page');
  });

  it("never draws the owner's block for someone else", async () => {
    signedInAs('someone');
    answers({ brief: null, skills: { ...NONE, block: { numbers: learnerNumbers, state: 'HIDDEN', learnOpen: true } } });
    await draw();
    expect(container.innerHTML).toBe('');
    expect(urls()).toEqual(['/api/skills/octocat']);
  });
});
