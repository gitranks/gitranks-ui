import { describe, expect, it } from 'vitest';

import { MCP_DOC_CLIENTS, TOKEN_PLACEHOLDER } from './mcp-docs';

describe('MCP_DOC_CLIENTS', () => {
  it('shows every client the connect flow knows, then VS Code', () => {
    expect(MCP_DOC_CLIENTS.map(({ id }) => id)).toEqual([
      'claude-code',
      'codex',
      'cursor',
      'gemini-cli',
      'antigravity',
      'vs-code',
    ]);
  });

  it('gives Antigravity the placeholder in its config, where a real token goes, and the Windows path', () => {
    const antigravity = MCP_DOC_CLIENTS.find(({ id }) => id === 'antigravity');
    expect(antigravity?.lines).toContain(`Bearer ${TOKEN_PLACEHOLDER}`);
    expect(antigravity?.where).toContain(`in place of ${TOKEN_PLACEHOLDER}`);
    expect(antigravity?.windows?.label).toBe('%USERPROFILE%\\.gemini\\config\\mcp_config.json');
  });
});
