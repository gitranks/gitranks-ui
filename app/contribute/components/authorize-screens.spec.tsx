import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-auth/react', () => ({ signIn: vi.fn() }));
vi.mock('@/app/contribute/actions', () => ({ approveContributeOAuth: vi.fn() }));

const { AuthorizeScreen } = await import('./authorize-view');

import type { ContributeOAuthRequest } from '@/lib/contribute/contribute.types';

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ');

const ID = 'aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789-_abcde';
const CANCEL = `https://mcp.gitranks.com/authorize-cancel?request=${ID}`;
const REQUEST: ContributeOAuthRequest = {
  status: 'PENDING',
  clientName: 'Claude Code',
  clientWhere: { kind: 'LOOPBACK', label: 'this computer' },
  previewAllowed: true,
  reusesConnection: false,
  replaces: null,
  waiting: { count: 7, repos: ['acme/widgets', 'acme/gadgets', 'acme/tools'] },
};

const pending = (request: Partial<ContributeOAuthRequest> = {}) => {
  const html = renderToStaticMarkup(
    <AuthorizeScreen
      state={{ kind: 'pending', requestId: ID, login: 'octocat', request: { ...REQUEST, ...request } }}
    />,
  );
  return { html, plain: text(html) };
};

describe('the consent page of an agent sign-in', () => {
  it('names the client as it calls itself, where it goes back, the account, what it can and cannot do', () => {
    const { html, plain } = pending();

    expect(plain).toContain('Connect Claude Code to GitRanks Contribute');
    expect(plain).toContain(
      'Claude Code (calls itself that · goes back to an app on this computer) asks to work on Contribute as @octocat',
    );
    expect(plain).toContain('It will be able to:');
    expect(plain).toContain('see the issues picked for you, and claim one;');
    expect(plain).toContain('hand back changes for you to review here;');
    expect(plain).toContain('see your claims and pull requests.');
    expect(plain).toContain("It won't be able to open a pull request, push, or post on GitHub");
    expect(plain).toContain('You can disconnect it any time in Settings');
    expect(plain).toContain('7 issues are waiting for you, in acme/widgets, acme/gadgets and acme/tools.');
    expect(html).toContain('data-authorize="allow"');
    expect(html).toContain(`href="${CANCEL}"`);
    expect(html).not.toContain('data-authorize="replaces"');
    expect(html).not.toContain('role="note"');
  });

  it('warns for a web address it does not know, and says which connection Allow would end', () => {
    const { html, plain } = pending({
      clientWhere: { kind: 'WEB', label: 'agent.example' },
      replaces: { name: 'Cursor' },
      waiting: { count: 0, repos: [] },
    });
    expect(plain).toContain('goes back to agent.example');
    expect(plain).toContain('Only continue if you started this from agent.example.');
    expect(plain).toContain('Connecting this disconnects Cursor.');
    expect(html).not.toContain('data-authorize="waiting"');
  });

  it('names a known client and an app scheme as the page should', () => {
    expect(pending({ clientWhere: { kind: 'KNOWN', label: 'Claude' } }).plain).toContain('goes back to Claude)');
    expect(pending({ clientWhere: { kind: 'SCHEME', label: 'cursor://' } }).plain).toContain(
      'goes back to the app that opens cursor:// links',
    );
  });

  it('asks a visitor without a session to sign in first, with Cancel beside it', () => {
    const html = renderToStaticMarkup(<AuthorizeScreen state={{ kind: 'signed-out', requestId: ID }} />);
    expect(text(html)).toContain('Sign in with GitHub to connect your agent');
    expect(html).toContain('data-authorize="sign-in"');
    expect(html).toContain(`href="${CANCEL}"`);
    expect(html).not.toContain('data-authorize="allow"');
  });

  it('offers only Cancel to an account Contribute is not open for yet', () => {
    const html = renderToStaticMarkup(<AuthorizeScreen state={{ kind: 'not-open', requestId: ID }} />);
    expect(text(html)).toContain("Contribute isn't open for your account yet");
    expect(html).toContain(`href="${CANCEL}"`);
    expect(html).not.toContain('data-authorize="allow"');
  });

  it('says an expired sign-in has expired, with no button', () => {
    const html = renderToStaticMarkup(<AuthorizeScreen state={{ kind: 'expired' }} />);
    expect(text(html)).toContain('This sign-in has expired');
    expect(text(html)).toContain('Start again from your agent');
    expect(html).not.toContain('data-authorize=');
  });

  it('says an allowed sign-in is allowed already', () => {
    const html = renderToStaticMarkup(
      <AuthorizeScreen state={{ kind: 'approved', requestId: ID, clientName: 'Codex' }} />,
    );
    expect(text(html)).toContain('You allowed Codex already');
    expect(html).not.toContain('data-authorize="allow"');
  });
});
