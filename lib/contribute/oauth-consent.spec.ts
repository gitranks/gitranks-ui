import { describe, expect, it } from 'vitest';

import {
  authorizeCancelHrefOf,
  authorizeHrefOf,
  clientWhereTextOf,
  isPrivateUseScheme,
  isSafeRedirect,
  isSignedInAgent,
  personalTokensOf,
  requestIdOf,
  waitingLineOf,
} from './oauth-consent';

const ID = 'aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789-_abcde';

describe('the consent page of an agent sign-in', () => {
  it('takes a request id of the shape the server makes, and nothing else', () => {
    expect(requestIdOf(ID)).toBe(ID);
    expect(requestIdOf([ID, 'x'])).toBe(ID);
    for (const value of [undefined, null, '', 'short', `${ID}x`, `${ID.slice(1)}/`, '../../settings']) {
      expect(requestIdOf(value), String(value)).toBeNull();
    }
  });

  it('comes back to itself after the sign-in, and cancels through the MCP server', () => {
    expect(authorizeHrefOf(ID)).toBe(`/contribute/authorize?request=${ID}`);
    expect(authorizeCancelHrefOf(ID)).toBe(`https://mcp.gitranks.com/authorize-cancel?request=${ID}`);
  });

  it('lets the browser go to https, to http on this computer, or to an app of its own scheme', () => {
    for (const url of [
      'https://claude.ai/api/mcp/auth_callback?code=c',
      'http://127.0.0.1:53682/callback',
      'http://localhost:8080/cb',
      'http://[::1]:9000/cb',
      'cursor://anysphere.cursor-mcp/oauth/callback',
      'vscode://vscode.github-authentication/did-authenticate',
      'com.example.app:/oauth2redirect',
    ]) {
      expect(isSafeRedirect(url), url).toBe(true);
    }
  });

  it('never lets it go to a script, data, a file, plain http elsewhere, or something that does not parse', () => {
    for (const url of [
      'javascript:alert(1)',
      'JavaScript:alert(1)',
      'data:text/html,<script>1</script>',
      'file:///etc/passwd',
      'blob:https://gitranks.com/x',
      'vbscript:x',
      'http://evil.example/cb',
      'http://127.0.0.1.evil.example/cb',
      'ftp://x/y',
      'mailto:a@b.c',
      'myapp:/cb',
      '/relative',
      '',
      42,
      null,
    ]) {
      expect(isSafeRedirect(url), String(url)).toBe(false);
    }
  });

  it('takes a reverse-domain scheme, or an editor we name, as an app of its own', () => {
    expect(isPrivateUseScheme('cursor:')).toBe(true);
    expect(isPrivateUseScheme('vscode-insiders')).toBe(true);
    expect(isPrivateUseScheme('com.example.app')).toBe(true);
    expect(isPrivateUseScheme('https')).toBe(false);
    expect(isPrivateUseScheme('myapp')).toBe(false);
    expect(isPrivateUseScheme('1bad.scheme')).toBe(false);
  });

  it('says where the browser goes back to, and warns for a web address alone', () => {
    expect(clientWhereTextOf({ kind: 'LOOPBACK', label: 'this computer' })).toEqual({
      text: 'an app on this computer',
      warning: null,
    });
    expect(clientWhereTextOf({ kind: 'KNOWN', label: 'Claude' })).toEqual({ text: 'Claude', warning: null });
    expect(clientWhereTextOf({ kind: 'SCHEME', label: 'cursor://' })).toEqual({
      text: 'the app that opens cursor:// links',
      warning: null,
    });
    expect(clientWhereTextOf({ kind: 'WEB', label: 'agent.example' })).toEqual({
      text: 'agent.example',
      warning: 'Only continue if you started this from agent.example.',
    });
  });

  it('names the repositories waiting, never an issue, and nothing when none waits', () => {
    expect(waitingLineOf({ count: 7, repos: ['a/x', 'b/y', 'c/z'] })).toBe(
      '7 issues are waiting for you, in a/x, b/y and c/z.',
    );
    expect(waitingLineOf({ count: 1, repos: ['a/x'] })).toBe('1 issue is waiting for you, in a/x.');
    expect(waitingLineOf({ count: 1200, repos: [] })).toBe('1,200 issues are waiting for you.');
    expect(waitingLineOf({ count: 0, repos: ['a/x'] })).toBeNull();
    expect(waitingLineOf(null)).toBeNull();
  });

  it('tells an agent that signed in from a token, an older answer without a kind being a token', () => {
    const tokens = [{ kind: 'PERSONAL' as const }, { kind: 'OAUTH' as const }, {}].map((each, at) => ({
      id: `T_${at}`,
      name: 'x',
      last4: null,
      createdAt: '',
      lastUsedAt: null,
      ...each,
    }));
    expect(tokens.map(isSignedInAgent)).toEqual([false, true, false]);
    expect(personalTokensOf(tokens).map(({ id }) => id)).toEqual(['T_0', 'T_2']);
    expect(personalTokensOf(undefined)).toEqual([]);
  });
});
