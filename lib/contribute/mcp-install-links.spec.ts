import { describe, expect, it } from 'vitest';

import { MCP_INSTALL_LINKS, mcpInstallLinkOf, mcpInstallLinksOf } from './mcp-install-links';

describe('the MCP install links', () => {
  it('match the forms the clients document, byte for byte', () => {
    expect(Object.fromEntries(MCP_INSTALL_LINKS.map(({ client, href }) => [client, href]))).toEqual({
      'claude-app':
        'https://claude.ai/customize/connectors?modal=add-custom-connector&connectorName=GitRanks%20Contribute&connectorUrl=https%3A%2F%2Fmcp.gitranks.com%2Fmcp',
      cursor:
        'https://cursor.com/en/install-mcp?name=gitranks&config=eyJ1cmwiOiJodHRwczovL21jcC5naXRyYW5rcy5jb20vbWNwIn0%3D',
      'vs-code':
        'https://vscode.dev/redirect/mcp/install?name=gitranks&config=%7B%22type%22%3A%22http%22%2C%22url%22%3A%22https%3A%2F%2Fmcp.gitranks.com%2Fmcp%22%7D',
      kiro: 'https://kiro.dev/launch/mcp/add?name=gitranks&config=%7B%22url%22%3A%22https%3A%2F%2Fmcp.gitranks.com%2Fmcp%22%7D',
    });
  });

  it('are built from the server URL, and say what they do', () => {
    const url = 'https://example.test/mcp';
    const configs = Object.fromEntries(
      mcpInstallLinksOf(url).map(({ client, href }) => {
        const query = new URL(href).searchParams;
        return [client, query.get('connectorUrl') ?? query.get('config')];
      }),
    );
    expect(configs['claude-app']).toBe(url);
    expect(JSON.parse(atob(configs.cursor ?? ''))).toEqual({ url });
    expect(JSON.parse(configs['vs-code'] ?? '')).toEqual({ type: 'http', url });
    expect(JSON.parse(configs.kiro ?? '')).toEqual({ url });
    expect(MCP_INSTALL_LINKS.map(({ label }) => label)).toEqual([
      'Add to Claude',
      'Add to Cursor',
      'Add to VS Code',
      'Add to Kiro',
    ]);
    expect(mcpInstallLinkOf('kiro')?.label).toBe('Add to Kiro');
    expect(mcpInstallLinkOf('codex')).toBeUndefined();
  });
});
