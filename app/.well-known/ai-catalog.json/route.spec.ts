import { describe, expect, it } from 'vitest';

import { GET, OPTIONS } from './route';

describe('/.well-known/ai-catalog.json', () => {
  it('points at the Contribute MCP server card', async () => {
    const response = GET();
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/ai-catalog+json; charset=utf-8');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(await response.json()).toEqual({
      specVersion: '1.0',
      entries: [
        {
          identifier: 'urn:air:gitranks.com:mcp:contribute',
          type: 'application/mcp-server-card+json',
          url: 'https://mcp.gitranks.com/mcp/server-card',
        },
      ],
    });
  });

  it('answers a CORS preflight', () => {
    const response = OPTIONS();
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET');
  });
});
