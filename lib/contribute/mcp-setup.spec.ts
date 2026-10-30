import { describe, expect, it } from 'vitest';

import {
  MCP_CLIENTS,
  MCP_SETUPS,
  MCP_TOKEN_NAME_MAX,
  MCP_URL,
  mcpClientSetupOf,
  mcpOsOf,
  mcpSetupLinesOf,
  mcpTokenByHandOf,
  mcpTokenCheckOf,
  mcpTokenNameOf,
  mcpTokenSaveOf,
} from './mcp-setup';

/** A made-up token of the real shape: `gr_` and 43 base62 characters. */
const TOKEN = 'gr_8Kq2vN4tXb7RwL1mZc9HpYe3Ud6SfA0jQg5Ko2Ti8Lm';

describe('mcpOsOf', () => {
  it('reads the client hints first, then the user agent', () => {
    expect(mcpOsOf({ userAgentData: { platform: 'Windows' }, userAgent: 'Mozilla/5.0 (Macintosh)' })).toBe('windows');
    expect(mcpOsOf({ userAgentData: { platform: 'macOS' } })).toBe('mac');
    expect(mcpOsOf({ userAgentData: { platform: 'Linux' } })).toBe('linux');
    expect(mcpOsOf({ userAgentData: { platform: 'Chrome OS' } })).toBe('linux');
  });

  it('tells macOS, Linux and Windows from the user agent alone', () => {
    expect(mcpOsOf({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_6) AppleWebKit/605.1.15' })).toBe('mac');
    expect(mcpOsOf({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36' })).toBe('linux');
    expect(mcpOsOf({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' })).toBe('windows');
    expect(mcpOsOf({ userAgent: 'Mozilla/5.0 (X11; CrOS x86_64 16181.61.0)' })).toBe('linux');
  });

  it('takes macOS for anything unknown, a phone among them', () => {
    expect(mcpOsOf(undefined)).toBe('mac');
    expect(mcpOsOf({})).toBe('mac');
    expect(mcpOsOf({ userAgent: 'Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36' })).toBe('mac');
    expect(mcpOsOf({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X)' })).toBe('mac');
    expect(mcpOsOf({ userAgent: 'SomeBrowser/1.0' })).toBe('mac');
  });
});

describe('the line that saves the token', () => {
  it('carries the token itself, in the profile of each shell', () => {
    expect(mcpTokenSaveOf('mac', TOKEN)).toMatchObject({
      shell: 'Terminal',
      line: `echo 'export GITRANKS_MCP_TOKEN="${TOKEN}"' >> ~/.zshrc && source ~/.zshrc`,
    });
    expect(mcpTokenSaveOf('linux', TOKEN)).toMatchObject({
      shell: 'Terminal',
      line: `echo 'export GITRANKS_MCP_TOKEN="${TOKEN}"' >> ~/.bashrc && source ~/.bashrc`,
    });
    expect(mcpTokenSaveOf('linux', TOKEN).note).toContain('~/.zshrc');
    expect(mcpTokenSaveOf('windows', TOKEN)).toMatchObject({
      shell: 'PowerShell',
      line: `[Environment]::SetEnvironmentVariable("GITRANKS_MCP_TOKEN", "${TOKEN}", "User")`,
    });
    expect(mcpTokenSaveOf('windows', TOKEN).note).toContain('new PowerShell window');
  });

  it('has a way by hand that puts nothing in the shell history', () => {
    expect(mcpTokenByHandOf('mac', TOKEN)).toEqual({
      steps: expect.stringContaining('~/.zshrc'),
      line: `export GITRANKS_MCP_TOKEN="${TOKEN}"`,
    });
    expect(mcpTokenByHandOf('linux', TOKEN).steps).toContain('~/.bashrc');
    expect(mcpTokenByHandOf('windows', TOKEN).line).toBeUndefined();
    expect(mcpTokenByHandOf('windows', TOKEN).steps).toContain('GITRANKS_MCP_TOKEN');
  });

  it('is checked in the shell the agent runs in', () => {
    expect(mcpTokenCheckOf('mac')).toBe('echo $GITRANKS_MCP_TOKEN');
    expect(mcpTokenCheckOf('windows')).toBe('echo $env:GITRANKS_MCP_TOKEN');
  });
});

describe('the setup for each client and computer', () => {
  it('reads the token from the environment, never the token itself', () => {
    for (const client of MCP_CLIENTS) {
      for (const os of ['mac', 'linux', 'windows'] as const) {
        const { lines } = mcpClientSetupOf(client, os);
        expect(lines).toContain(MCP_URL);
        expect(lines).toContain('GITRANKS_MCP_TOKEN');
        expect(lines).not.toMatch(/gr_[0-9A-Za-z]{10,}/);
      }
    }
  });

  it("is in the OS's form on Windows: PowerShell's variable, the paths from %USERPROFILE%", () => {
    expect(mcpClientSetupOf('claude-code', 'windows')).toMatchObject({
      label: 'PowerShell',
      file: false,
      lines: `claude mcp add --scope user --transport http gitranks ${MCP_URL} --header "Authorization: Bearer $env:GITRANKS_MCP_TOKEN"`,
    });
    expect(mcpClientSetupOf('claude-code', 'windows').where).toContain('new PowerShell window');
    expect(mcpClientSetupOf('codex', 'windows').label).toBe('%USERPROFILE%\\.codex\\config.toml');
    expect(mcpClientSetupOf('cursor', 'windows').label).toBe('%USERPROFILE%\\.cursor\\mcp.json');
    expect(mcpClientSetupOf('gemini-cli', 'windows').label).toBe('%USERPROFILE%\\.gemini\\settings.json');
  });

  it('runs Claude Code in the terminal the token was saved in, and names the files under ~ elsewhere', () => {
    expect(mcpClientSetupOf('claude-code', 'mac')).toMatchObject({ label: 'Terminal', file: false });
    expect(mcpClientSetupOf('claude-code', 'mac').lines).toContain('Bearer $GITRANKS_MCP_TOKEN"');
    expect(mcpClientSetupOf('codex', 'linux')).toMatchObject({ label: '~/.codex/config.toml', file: true });
    expect(mcpClientSetupOf('cursor', 'mac').where).toContain('from a terminal');
  });

  it('takes the old entry out of Claude Code before adding it again for a replaced token, its error silenced', () => {
    const add = mcpSetupLinesOf('claude-code', 'mac');
    expect(mcpClientSetupOf('claude-code', 'mac', { replacing: true }).lines).toBe(
      `claude mcp remove --scope user gitranks 2>/dev/null; ${add}`,
    );
    expect(mcpClientSetupOf('claude-code', 'windows', { replacing: true }).lines).toBe(
      `claude mcp remove --scope user gitranks 2>$null; ${mcpSetupLinesOf('claude-code', 'windows')}`,
    );
    expect(mcpClientSetupOf('claude-code', 'mac', { replacing: true }).where).toContain('keeps the old token');
    // The others read the variable when they start: the same lines, and a restart.
    expect(mcpClientSetupOf('codex', 'mac', { replacing: true }).lines).toBe(mcpSetupLinesOf('codex', 'mac'));
    expect(mcpClientSetupOf('codex', 'mac', { replacing: true }).where).toContain('restart it');
    expect(mcpClientSetupOf('gemini-cli', 'linux', { replacing: true }).where).toContain('restart it');
    expect(mcpClientSetupOf('cursor', 'mac', { replacing: true }).where).toBe(mcpClientSetupOf('cursor', 'mac').where);
  });

  it("keeps Settings' lines as they were", () => {
    expect(MCP_SETUPS.map(({ client, lines }) => [client, lines])).toEqual(
      MCP_CLIENTS.map((client) => [client, mcpSetupLinesOf(client, 'mac')]),
    );
    expect(MCP_SETUPS[0].where).toContain('Claude Code keeps the token');
  });
});

describe('mcpTokenNameOf', () => {
  it('names the token for the client and the computer, within the limit', () => {
    expect(mcpTokenNameOf('claude-code', 'mac')).toBe('Claude Code on macOS');
    expect(mcpTokenNameOf('gemini-cli', 'windows')).toBe('Gemini CLI on Windows');
    for (const client of MCP_CLIENTS) {
      expect(mcpTokenNameOf(client, 'windows').length).toBeLessThanOrEqual(MCP_TOKEN_NAME_MAX);
    }
  });
});
