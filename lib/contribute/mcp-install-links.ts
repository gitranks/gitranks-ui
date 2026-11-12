import { MCP_URL } from './mcp-setup';

/** The name clients give the server, as in every setup line. */
export const MCP_SERVER_NAME = 'gitranks';
/** The name claude.ai shows for the connector. */
export const MCP_CONNECTOR_NAME = 'GitRanks Contribute';

/** A client that takes an install link: the link opens it, and it asks the user to confirm before it adds anything. */
export type McpInstallClient = 'claude-app' | 'cursor' | 'vs-code' | 'kiro';

export type McpInstallLink = { client: McpInstallClient; label: string; href: string };

/** Base64 of an ASCII string, in Node and the browser alike. */
const base64Of = (text: string) => btoa(text);

/**
 * The install links, each in the form its client's docs give (checked 2026-11-11), built from the server's URL:
 * - claude.ai and Claude Desktop: the Add custom connector dialog, name and URL filled in;
 * - Cursor: the server's config (no name key) as base64 JSON, then URL-encoded;
 * - VS Code: the config as URL-encoded JSON, on the https redirect that opens VS Code;
 * - Kiro: the config as URL-encoded JSON (not base64).
 * Every value is URL-encoded on its own (`encodeURIComponent`, so a space is %20, never +).
 */
export function mcpInstallLinksOf(url: string = MCP_URL): McpInstallLink[] {
  const name = encodeURIComponent(MCP_SERVER_NAME);
  const json = (config: object) => encodeURIComponent(JSON.stringify(config));
  return [
    {
      client: 'claude-app',
      label: 'Add to Claude',
      href: `https://claude.ai/customize/connectors?modal=add-custom-connector&connectorName=${encodeURIComponent(MCP_CONNECTOR_NAME)}&connectorUrl=${encodeURIComponent(url)}`,
    },
    {
      client: 'cursor',
      label: 'Add to Cursor',
      href: `https://cursor.com/en/install-mcp?name=${name}&config=${encodeURIComponent(base64Of(JSON.stringify({ url })))}`,
    },
    {
      client: 'vs-code',
      label: 'Add to VS Code',
      href: `https://vscode.dev/redirect/mcp/install?name=${name}&config=${json({ type: 'http', url })}`,
    },
    {
      client: 'kiro',
      label: 'Add to Kiro',
      href: `https://kiro.dev/launch/mcp/add?name=${name}&config=${json({ url })}`,
    },
  ];
}

/** The links for our server, in the order the docs show them. */
export const MCP_INSTALL_LINKS: readonly McpInstallLink[] = mcpInstallLinksOf();

/** A client's install link, if it has one. */
export const mcpInstallLinkOf = (client: string): McpInstallLink | undefined =>
  MCP_INSTALL_LINKS.find((link) => link.client === client);
