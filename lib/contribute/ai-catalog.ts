import { MCP_URL } from './mcp-setup';

/**
 * The AI Catalog (SEP-2127) for gitranks.com: domain-level discovery starts from the domain a client sees, and it
 * points at the Contribute MCP server's Server Card. The same document `mcp.gitranks.com` serves at this path.
 */
export const AI_CATALOG = {
  specVersion: '1.0',
  entries: [
    {
      identifier: 'urn:air:gitranks.com:mcp:contribute',
      type: 'application/mcp-server-card+json',
      url: `${MCP_URL}/server-card`,
    },
  ],
} as const;
