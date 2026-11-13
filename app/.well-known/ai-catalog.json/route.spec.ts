import { describe, expect, it } from 'vitest';

import { GET, OPTIONS } from './route';

describe('/.well-known/ai-catalog.json', () => {
  it('serves the catalog that points at the Contribute MCP server card, byte for byte', async () => {
    const response = GET();
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/ai-catalog+json; charset=utf-8');
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Expose-Headers')).toBe('ETag');
    expect(response.headers.get('ETag')).toMatch(/^"[A-Za-z0-9_-]{27}"$/);
    expect(await response.text()).toBe(
      '{"specVersion":"1.0","entries":[{"identifier":"urn:air:gitranks.com:mcp:contribute","type":"application/mcp-server-card+json","url":"https://mcp.gitranks.com/mcp/server-card"}]}',
    );
  });

  it('answers a CORS preflight with no body', () => {
    const response = OPTIONS();
    expect(response.status).toBe(204);
    expect(response.body).toBeNull();
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET');
    expect(response.headers.get('Access-Control-Max-Age')).toBe('86400');
  });
});
