// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { useSession, setSkillsHiddenAction, toastError, params } = vi.hoisted(() => ({
  useSession: vi.fn(),
  setSkillsHiddenAction: vi.fn(),
  toastError: vi.fn(),
  params: { login: 'octocat' },
}));
vi.mock('next-auth/react', () => ({ useSession }));
vi.mock('next/navigation', () => ({
  useParams: () => params,
  usePathname: () => `/profile/${params.login}/skills`,
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));
vi.mock('next/image', () => ({
  default: (props: { alt: string; onError?: () => void }) => <img alt={props.alt} onError={props.onError} />,
}));
vi.mock('sonner', () => ({ toast: { error: toastError } }));
vi.mock('./skills-hidden.actions', () => ({ setSkillsHiddenAction }));

const { SkillsScreen } = await import('./skills-screen');
const { SkillsLoginColumn, SkillsMissingScreen } = await import('./skills-missing-screen');
const { SkillsOwnerProvider } = await import('./skills-owner');
const { contributorPage, hiddenPageFix, longPage, SKILLS_NOW, skillsMine } = await import(
  '@/lib/skills/__fixtures__/skills'
);

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
let fetchMock: ReturnType<typeof vi.fn>;

const json = (body: unknown, ok = true) => ({ ok, json: async () => body }) as Response;
const signedInAs = (login: string | null) =>
  useSession.mockReturnValue({ data: login ? { user: { githubLogin: login } } : null });
const settle = async () => {
  for (let i = 0; i < 5; i++) await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
};
const draw = async (node: ReactNode) => {
  await act(async () => root.render(node));
  await settle();
};
const button = (name: string) =>
  [...container.querySelectorAll('button')].find((element) => element.textContent?.trim() === name);
const mineAnswer = (mine: unknown) => json({ mine, signedOut: false });

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  fetchMock = vi.fn(async () => json({}, false));
  vi.stubGlobal('fetch', fetchMock);
  signedInAs(null);
  params.login = 'octocat';
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('a public Skills page', () => {
  it('is the same for everyone else: no strip, no owner read', async () => {
    signedInAs('someone');
    await draw(<SkillsScreen login="octocat" page={contributorPage} now={SKILLS_NOW} />);
    expect(container.querySelector('[data-skills-page]')).not.toBeNull();
    expect(container.querySelector('[data-skills-strip], [data-skills-strip-row]')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('adds the next fixes in place with "Show 20 more", and drops the button at the end', async () => {
    fetchMock.mockResolvedValueOnce(json({ fixes: { rows: [hiddenPageFix], total: 7, next: null } }));
    await draw(<SkillsScreen login="octocat" page={longPage} now={SKILLS_NOW} />);
    expect(container.querySelectorAll('[data-skills-fix]')).toHaveLength(6);
    await act(async () => button('Show 20 more')?.click());
    await settle();
    expect(fetchMock).toHaveBeenCalledWith('/api/skills/octocat/fixes?after=cursor-6');
    expect(container.querySelectorAll('[data-skills-fix]')).toHaveLength(7);
    expect(button('Show 20 more')).toBeUndefined();
  });

  it('keeps the button when the next fixes cannot be read', async () => {
    fetchMock.mockResolvedValueOnce(json({ fixes: null }));
    await draw(<SkillsScreen login="octocat" page={longPage} now={SKILLS_NOW} />);
    await act(async () => button('Show 20 more')?.click());
    await settle();
    expect(container.querySelectorAll('[data-skills-fix]')).toHaveLength(6);
    expect(button('Show 20 more')).toBeDefined();
  });

  it("holds the strip's row for its owner, then the strip; hiding changes only the strip", async () => {
    signedInAs('OctoCat');
    let answer: (response: Response) => void = () => {};
    fetchMock.mockImplementationOnce(() => new Promise<Response>((resolve) => (answer = resolve)));
    await draw(<SkillsScreen login="octocat" page={contributorPage} now={SKILLS_NOW} />);
    expect(container.querySelector('[data-skills-strip-row]')).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledWith('/api/me/skills', { cache: 'no-store' });

    await act(async () => answer(mineAnswer(skillsMine.publicLearner)));
    await settle();
    expect(container.querySelector('[data-skills-strip-row]')).toBeNull();
    expect(container.querySelector('[data-skills-strip]')?.getAttribute('data-skills-strip')).toBe('PUBLIC');

    setSkillsHiddenAction.mockResolvedValueOnce({ ok: true, mine: skillsMine.hiddenLearner });
    await act(async () => button('Hide this page')?.click());
    await settle();
    expect(setSkillsHiddenAction).toHaveBeenCalledWith(true);
    expect(container.querySelector('[data-skills-strip]')?.getAttribute('data-skills-strip')).toBe('HIDDEN');
    expect(container.querySelectorAll('[data-skills-fix]')).toHaveLength(contributorPage.fixes.rows.length);
  });

  it('says so when hiding fails, and keeps the strip as it was', async () => {
    signedInAs('octocat');
    fetchMock.mockResolvedValueOnce(mineAnswer(skillsMine.publicLearner));
    await draw(<SkillsScreen login="octocat" page={contributorPage} now={SKILLS_NOW} />);
    setSkillsHiddenAction.mockResolvedValueOnce({ ok: false, error: 'FAILED' });
    await act(async () => button('Hide this page')?.click());
    await settle();
    expect(toastError).toHaveBeenCalledWith('Your page could not be changed. Try again.');
    expect(container.querySelector('[data-skills-strip]')?.getAttribute('data-skills-strip')).toBe('PUBLIC');
  });

  it('draws nothing of the owner when their view cannot be read', async () => {
    signedInAs('octocat');
    fetchMock.mockResolvedValueOnce(json({ mine: null, signedOut: false }));
    await draw(<SkillsScreen login="octocat" page={contributorPage} now={SKILLS_NOW} />);
    expect(container.querySelector('[data-skills-strip], [data-skills-strip-row]')).toBeNull();
  });
});

describe('a Skills address with no public page', () => {
  it('says the login has no Skills page, to everyone else, under the page’s own title', async () => {
    document.title = 'No Skills page | GitRanks';
    await draw(<SkillsMissingScreen />);
    expect(container.querySelector('[data-skills-missing]')?.textContent).toContain('octocat has no Skills page');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(document.title).toBe('No Skills page | GitRanks');
  });

  it('never says "no Skills page" to its owner while their view is on its way', async () => {
    signedInAs('octocat');
    fetchMock.mockReturnValueOnce(new Promise(() => {}));
    await draw(<SkillsMissingScreen />);
    expect(container.querySelector('[data-skills-missing]')).toBeNull();
    expect(container.querySelector('h2')?.textContent).toBe('Skills');
    expect(container.querySelector('[data-skills-strip-row]')).not.toBeNull();
  });

  it('names its owner\'s page in the browser\'s title, not "No Skills page"', async () => {
    document.title = 'No Skills page | GitRanks';
    signedInAs('octocat');
    fetchMock.mockResolvedValueOnce(mineAnswer(skillsMine.hiddenLearner));
    await draw(<SkillsMissingScreen />);
    expect(document.title).toBe('octocat’s skills · GitRanks');
  });

  it('gives its owner what fills the page while nothing is on it, with the strip', async () => {
    signedInAs('octocat');
    fetchMock.mockResolvedValueOnce(mineAnswer(skillsMine.new));
    await draw(<SkillsMissingScreen />);
    expect(container.querySelector('[data-skills-missing]')).toBeNull();
    expect(container.querySelector('[data-skills-start]')?.getAttribute('data-skills-start')).toBe('NEW');
    expect(container.querySelector('[data-skills-strip]')).not.toBeNull();
  });

  it('gives its owner their own hidden page in its place, with the strip to show it again', async () => {
    signedInAs('octocat');
    fetchMock.mockResolvedValueOnce(mineAnswer(skillsMine.hiddenLearner));
    await draw(<SkillsMissingScreen />);
    expect(container.querySelector('[data-skills-missing]')).toBeNull();
    expect(container.querySelector('[data-skills-page]')).not.toBeNull();
    expect(container.querySelector('[data-skills-strip]')?.getAttribute('data-skills-strip')).toBe('HIDDEN');
    expect(button('Show it to everyone')).toBeDefined();
    expect(button('Show 20 more')).toBeUndefined();
    expect(container.querySelector('[data-skills-fixes-left]')).toBeNull();
  });

  it('says how many more fixes its owner has, one or many, where the next ones cannot be read', async () => {
    signedInAs('octocat');
    for (const [more, line] of [
      [20, 'And 20 more, listed once your page is public.'],
      [1, 'And 1 more, listed once your page is public.'],
    ] as const) {
      fetchMock.mockResolvedValueOnce(
        mineAnswer({
          ...skillsMine.hiddenLearner,
          page: { ...longPage, fixes: { ...longPage.fixes, total: 6 + more } },
        }),
      );
      await act(async () => root.unmount());
      root = createRoot(container);
      await draw(<SkillsMissingScreen />);
      expect(container.querySelectorAll('[data-skills-fix]')).toHaveLength(6);
      expect(container.querySelector('[data-skills-fixes-left]')?.textContent).toBe(line);
      expect(button('Show 20 more')).toBeUndefined();
    }
  });

  it('stays "no Skills page" for its owner when their view cannot be read', async () => {
    signedInAs('octocat');
    await draw(<SkillsMissingScreen />);
    expect(container.querySelector('[data-skills-missing]')).not.toBeNull();
  });
});

describe('a Skills address\'s owner layer, kept above its page and its "not found"', () => {
  it('hides and shows the page with no second read and no empty strip row as the screens swap', async () => {
    signedInAs('octocat');
    fetchMock.mockResolvedValueOnce(mineAnswer(skillsMine.publicLearner));
    const publicScreen = (
      <SkillsOwnerProvider login="octocat">
        <SkillsScreen login="octocat" page={contributorPage} now={SKILLS_NOW} />
      </SkillsOwnerProvider>
    );
    const missingScreen = (
      <SkillsOwnerProvider login="octocat">
        <SkillsMissingScreen />
      </SkillsOwnerProvider>
    );
    await draw(publicScreen);
    expect(container.querySelector('[data-skills-strip]')?.getAttribute('data-skills-strip')).toBe('PUBLIC');

    setSkillsHiddenAction.mockResolvedValueOnce({ ok: true, mine: skillsMine.hiddenLearner });
    await act(async () => button('Hide this page')?.click());
    await draw(missingScreen);
    expect(container.querySelector('[data-skills-strip-row]')).toBeNull();
    expect(container.querySelector('[data-skills-missing]')).toBeNull();
    expect(container.querySelector('[data-skills-page]')).not.toBeNull();
    expect(container.querySelector('[data-skills-strip]')?.getAttribute('data-skills-strip')).toBe('HIDDEN');

    setSkillsHiddenAction.mockResolvedValueOnce({ ok: true, mine: skillsMine.publicLearner });
    await act(async () => button('Show it to everyone')?.click());
    await draw(publicScreen);
    expect(container.querySelector('[data-skills-strip-row]')).toBeNull();
    expect(container.querySelector('[data-skills-strip]')?.getAttribute('data-skills-strip')).toBe('PUBLIC');
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('keeps "no Skills page" in the page but out of sight while the session is loading', async () => {
    useSession.mockReturnValue({ data: null, status: 'loading' });
    await draw(<SkillsMissingScreen />);
    const missing = container.querySelector('[data-skills-missing]');
    expect(missing?.textContent).toContain('octocat has no Skills page');
    expect(missing?.closest('.invisible')).not.toBeNull();
  });

  it('shows "no Skills page" once the session says the reader is someone else', async () => {
    useSession.mockReturnValue({ data: null, status: 'unauthenticated' });
    await draw(<SkillsMissingScreen />);
    expect(container.querySelector('[data-skills-missing]')?.closest('.invisible')).toBeNull();
  });
});

describe('the left column of a login with no profile here', () => {
  it('draws the avatar and the login beside the tab', async () => {
    await draw(
      <SkillsLoginColumn login="octocat">
        <p data-tab="" />
      </SkillsLoginColumn>,
    );
    expect(container.querySelector('img')?.getAttribute('alt')).toBeTruthy();
    expect(container.textContent).toContain('octocat');
    expect(container.querySelector('[data-tab]')).not.toBeNull();
  });

  it('keeps the login alone when its avatar cannot be drawn', async () => {
    await draw(<SkillsLoginColumn login="octocat">{null}</SkillsLoginColumn>);
    await act(async () => container.querySelector('img')?.dispatchEvent(new Event('error')));
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('octocat');
  });
});
