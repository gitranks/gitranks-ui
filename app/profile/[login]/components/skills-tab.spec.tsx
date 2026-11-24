// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { useSession, path } = vi.hoisted(() => ({ useSession: vi.fn(), path: { name: '/profile/octocat' } }));
vi.mock('next-auth/react', () => ({ useSession }));
vi.mock('next/navigation', () => ({ usePathname: () => path.name }));

const { isSkillsTabPath, SkillsTab } = await import('./skills-tab');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
let fetchMock: ReturnType<typeof vi.fn>;

const json = (body: unknown) => ({ ok: true, json: async () => body }) as Response;
const answers = (brief: unknown, tabNew: boolean) =>
  fetchMock.mockImplementation(async (url: string) =>
    url.startsWith('/api/skills/') ? json({ brief }) : json({ tabNew }),
  );
const signedInAs = (login: string | null) =>
  useSession.mockReturnValue({ data: login ? { user: { githubLogin: login } } : null });
const draw = async () => {
  await act(async () => root.render(<SkillsTab login="octocat" />));
  for (let i = 0; i < 5; i++) await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
};
const tab = () => container.querySelector('a[data-skills-tab]');

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  signedInAs(null);
  path.name = '/profile/octocat';
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('isSkillsTabPath', () => {
  it('knows the Skills tab of a login in any spelling, and nothing else', () => {
    expect(isSkillsTabPath('/profile/OctoCat/skills', 'octocat')).toBe(true);
    expect(isSkillsTabPath('/profile/octocat', 'octocat')).toBe(false);
    expect(isSkillsTabPath('/profile/octocat/skills', 'hubot')).toBe(false);
  });
});

describe("the profile's Skills tab", () => {
  it('shows to everyone when the person has a public Skills page, without asking about the reader', async () => {
    answers({ login: 'octocat' }, false);
    await draw();
    expect(tab()?.getAttribute('href')).toBe('/profile/octocat/skills');
    expect(tab()?.textContent).toBe('Skills');
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('is not there for anyone else without a public page', async () => {
    answers(null, false);
    await draw();
    expect(tab()).toBeNull();
  });

  it('is always there for the owner, with "New" until they open it', async () => {
    signedInAs('OctoCat');
    answers(null, true);
    await draw();
    expect(tab()?.textContent).toBe('Skills New');
    expect(tab()?.getAttribute('data-skills-tab')).toBe('new');
    expect(fetchMock).not.toHaveBeenCalledWith('/api/me/skills/seen', { method: 'POST' });
  });

  it('loses "New" when the owner opens it, telling the API and this browser once', async () => {
    signedInAs('octocat');
    path.name = '/profile/octocat/skills';
    answers(null, true);
    await draw();
    expect(tab()?.textContent).toBe('Skills');
    expect(fetchMock).toHaveBeenCalledWith('/api/me/skills/seen', { method: 'POST' });
    expect(fetchMock.mock.calls.filter(([url]) => url === '/api/me/skills/seen')).toHaveLength(1);
  });

  it('stays without "New" when its mark cannot be read', async () => {
    signedInAs('octocat');
    fetchMock.mockRejectedValue(new Error('down'));
    await draw();
    expect(tab()?.textContent).toBe('Skills');
  });
});
