import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-auth/react', () => ({ signIn: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/lib/workspace/actions', () => ({ approveContributeOAuth: vi.fn() }));
vi.mock('@/lib/workspace/review-sign-in.actions', () => ({ approveContributeOAuthAsReviewer: vi.fn() }));
vi.mock('@/lib/workspace/setup.actions', () => ({ retryContributeSetup: vi.fn() }));

const { AuthorizeScreen, authorizeStateFor, authorizeWithSetup } = await import('./authorize-view');
const { AuthorizeNextStep } = await import('./authorize-next-step');
const { AGENT_FIRST_PROMPT } = await import('@/lib/workspace/mcp-setup');
const { CONTACT_EMAIL } = await import('@/lib/legal');

import type { ContributeOAuthRequest } from '@/lib/workspace/contribute.types';

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
  waiting: { count: 7 },
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
    expect(plain).toContain('see the issues picked for you, and take one;');
    expect(plain).toContain('hand back changes for you to review here;');
    expect(plain).toContain('see the issues you took and your pull requests.');
    expect(plain).toContain("It won't be able to open a pull request, push, or post on GitHub");
    expect(plain).toContain('You can disconnect it any time on the Agent tab');
    expect(plain).toContain('7 issues are waiting for you.');
    expect(plain).not.toContain('acme/');
    expect(html).toContain('data-authorize="allow"');
    expect(html).toContain(`href="${CANCEL}"`);
    expect(html).not.toContain('data-authorize="replaces"');
    expect(html).not.toContain('role="note"');
  });

  it('warns for a web address it does not know, and says which connection Allow would end', () => {
    const { html, plain } = pending({
      clientWhere: { kind: 'WEB', label: 'agent.example' },
      replaces: { name: 'Cursor' },
      waiting: { count: 0 },
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
    // The directory reviewers' link, to this request's review sign-in.
    expect(html).toContain(`href="/contribute/authorize?request=${ID}&amp;review=1"`);
  });

  it("shows the review sign-in's form, with Cancel and the way back to GitHub sign-in", () => {
    const html = renderToStaticMarkup(<AuthorizeScreen state={{ kind: 'review-sign-in', requestId: ID }} />);
    expect(text(html)).toContain('Review sign-in');
    expect(html).toContain('data-authorize="review-form"');
    expect(html).toContain('autoComplete="current-password"');
    expect(html).toContain(`href="${CANCEL}"`);
    expect(html).toContain(`href="/contribute/authorize?request=${ID}"`);
    expect(html).not.toContain('data-authorize="allow"');
  });

  it('offers only Cancel to an account Contribute is not open for yet', () => {
    const html = renderToStaticMarkup(<AuthorizeScreen state={{ kind: 'not-open', requestId: ID }} />);
    expect(text(html)).toContain("Contribute isn't open for your account yet");
    expect(html).toContain(`href="${CANCEL}"`);
    expect(html).not.toContain('data-authorize="allow"');
    expect(html).toContain('href="/contribute/mcp"');
    expect(html).toContain(`href="mailto:${CONTACT_EMAIL}"`);
  });

  it('says a new account is being set up, with Refresh and Cancel, and never blames the preview', () => {
    const html = renderToStaticMarkup(<AuthorizeScreen state={{ kind: 'setting-up', requestId: ID }} />);
    const plain = text(html);
    expect(plain).toContain('Setting up your GitRanks account');
    expect(plain).toContain('GitRanks is reading your GitHub profile for the first time');
    expect(plain).toContain('Refresh');
    expect(plain).not.toMatch(/preview/i);
    expect(html).toContain(`href="${CANCEL}"`);
    expect(html).not.toContain('data-authorize="allow"');
  });

  it('says Contribute is not open to an account GitRanks does not read, never the preview, an hour, nor "just now"', () => {
    const html = renderToStaticMarkup(<AuthorizeScreen state={{ kind: 'no-profile', requestId: ID }} />);
    const plain = text(html);
    expect(plain).toContain('Not open to your GitHub account');
    expect(plain).toContain('GitRanks does not read your GitHub account, so Contribute is not open to it');
    expect(plain).not.toMatch(/hour|try again/i);
    expect(plain).not.toContain('just now');
    expect(plain).not.toMatch(/preview/i);
    expect(html).not.toContain('data-setup-retry');
    expect(html).toContain(`href="${CANCEL}"`);
    expect(html).not.toContain('data-authorize="allow"');
  });

  it('says a failed first read so, with Try again and Cancel, and nothing about an hour', () => {
    const html = renderToStaticMarkup(<AuthorizeScreen state={{ kind: 'no-profile', requestId: ID, failed: true }} />);
    const plain = text(html);
    expect(plain).toContain('We could not set up your GitRanks account');
    expect(plain).toContain("GitRanks could not read your GitHub profile, so your agent can't connect yet");
    expect(html).toContain('data-setup-retry');
    expect(plain).toContain('Try again');
    expect(plain).not.toMatch(/hour|preview/i);
    expect(html).toContain(`href="${CANCEL}"`);
    expect(html).not.toContain('data-authorize="allow"');
  });

  it('asks to connect "your agent" when the app gave no name, never "An app" as a title', () => {
    const html = renderToStaticMarkup(
      <AuthorizeScreen
        state={{ kind: 'pending', requestId: ID, login: 'octocat', request: { ...REQUEST, clientName: '  ' } }}
      />,
    );
    const plain = text(html);
    expect(plain).toContain('Connect your agent to GitRanks Contribute');
    expect(plain).not.toContain('Connect An app');
    expect(plain).toContain('An app (goes back to');
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

  it('tells a user who allowed already what to ask the agent, where pull requests wait, and the docs', () => {
    const html = renderToStaticMarkup(
      <AuthorizeScreen state={{ kind: 'approved', requestId: ID, clientName: 'Codex' }} />,
    );
    const plain = text(html);
    expect(plain).toContain('Prompt for Codex');
    expect(plain).toContain(AGENT_FIRST_PROMPT);
    expect(plain).toContain(
      'While autopilot is off, each pull request waits for your approval at gitranks.com/contribute',
    );
    expect(html).toContain('href="/contribute"');
    expect(html).toContain('href="/contribute/mcp"');
    expect(text(renderToStaticMarkup(<AuthorizeNextStep />))).toContain('Prompt for your agent');
  });

  it('leads a sign-in it cannot read now to the docs and the contact address', () => {
    const html = renderToStaticMarkup(<AuthorizeScreen state={{ kind: 'unavailable', requestId: ID }} />);
    expect(text(html)).toContain("We can't read this sign-in right now");
    expect(html).toContain(`href="${CANCEL}"`);
    expect(html).toContain('href="/contribute/mcp"');
    expect(html).toContain(`href="mailto:${CONTACT_EMAIL}"`);
  });
});

describe("the consent page's state, from the API's one read", () => {
  const read = (request: ContributeOAuthRequest | null, contributeSetup = false, contributeOpen = true) => ({
    contributeOAuthRequest: request,
    contributeSetup,
    contributeOpen,
  });

  it('says setting up while a new account is read, before anything else', () => {
    expect(authorizeStateFor(read(null, true), ID, 'newbie')).toEqual({ kind: 'setting-up', requestId: ID });
    expect(authorizeStateFor(read(null, true, false), ID, 'newbie')).toEqual({ kind: 'setting-up', requestId: ID });
  });

  it('says no profile once launched, and names the preview only before the launch', () => {
    expect(authorizeStateFor(read(null), ID, 'newbie')).toEqual({ kind: 'no-profile', requestId: ID });
    expect(authorizeStateFor(read(null, false, false), ID, 'newbie')).toEqual({ kind: 'not-open', requestId: ID });
  });

  it('reads a no-profile account by its setup: setting up (or ready since), failed, or not read', () => {
    const noProfile = { kind: 'no-profile', requestId: ID } as const;
    expect(authorizeWithSetup(noProfile, 'setting-up')).toEqual({ kind: 'setting-up', requestId: ID });
    expect(authorizeWithSetup(noProfile, 'none')).toEqual({ kind: 'setting-up', requestId: ID });
    expect(authorizeWithSetup(noProfile, 'failed')).toEqual({ ...noProfile, failed: true });
    expect(authorizeWithSetup(noProfile, 'removed')).toEqual(noProfile);
  });

  it('asks to allow a pending request, and reads expired and approved ones as such', () => {
    expect(authorizeStateFor(read(REQUEST), ID, 'octocat')).toEqual({
      kind: 'pending',
      requestId: ID,
      login: 'octocat',
      request: REQUEST,
    });
    expect(authorizeStateFor(read({ ...REQUEST, status: 'EXPIRED' }), ID, 'octocat')).toEqual({ kind: 'expired' });
    expect(authorizeStateFor(read({ ...REQUEST, status: 'APPROVED' }), ID, 'octocat')).toMatchObject({
      kind: 'approved',
    });
  });
});
