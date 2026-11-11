import 'server-only';

import { parse } from 'graphql';
import { cache } from 'react';

import type { AgentPage } from './agent-page.types';
import { viewerEmail, viewerLogin } from './contribute.data';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import type DocumentNode from '@/types/typed-document-node';

const AgentPageDocument = parse(`query ContributeAgentPage {
  contributeAgentPage {
    stats { readyIssues repos languages { language issues } checkedAt }
    sample { day items { repo number url title labels language kind size why testCommand } }
    tryWithoutToken
  }
}`) as DocumentNode<{ contributeAgentPage: AgentPage | null }, Record<string, never>>;

/**
 * The page for AI agents' data, or null when the API hides Contribute from this visitor (the preview's list) or the
 * read failed: every reader then leaves its part out. Asked as the signed-in viewer when there is one, so a preview
 * viewer sees it before the launch. Read once per request.
 */
export const loadAgentPage = cache(async (): Promise<AgentPage | null> => {
  try {
    const githubLogin = await viewerLogin();
    const accountEmail = githubLogin ? await viewerEmail() : undefined;
    const { contributeAgentPage } = await graphqlDirect(AgentPageDocument, undefined, {
      source: 'ssr',
      ...(githubLogin ? { githubLogin } : {}),
      ...(accountEmail ? { accountEmail } : {}),
    });
    return contributeAgentPage;
  } catch {
    return null;
  }
});
