import type { OwnerIssue } from '../components/profile-contribute-block';

const TS = { name: 'TypeScript', color: '#3178c6' };
const JS = { name: 'JavaScript', color: '#f1e05a' };

const issue = (repo: string, number: number, title: string, language: OwnerIssue['language'], why: string) => ({
  repo,
  number,
  url: `https://github.com/${repo}/issues/${number}`,
  title,
  language,
  why,
});

/** Real ready issues on 2026-11-12, for a TypeScript and JavaScript profile before it connects. */
export const NOT_CONNECTED_ISSUES: OwnerIssue[] = [
  issue(
    'backstage/backstage',
    36155,
    'Bug Report: GitlabUrlReader.readTree/search serve a stale tree forever when merged commits are older than the path’s newest commit',
    TS,
    'A maintainer asked for this change',
  ),
  issue(
    'processing/p5.js',
    9124,
    'default color serialization truncates channel bytes, disagreeing with #rrggbb on the same color',
    JS,
    'Its maintainers review and merge outside pull requests',
  ),
  issue(
    'OrchestratorInc/agent-orchestrator',
    7606,
    'Report delivery to a Claude Code Terminal orchestrator loops forever when Claude Code wraps the paste in <pasted_content>',
    TS,
    'A maintainer agreed this should change',
  ),
];

/** The top 3 of a real contributor's list on 2026-11-12. */
export const CONNECTED_ISSUES: OwnerIssue[] = [
  issue(
    'kunchenguid/gh-axi',
    195,
    'Retrieve exact CI run/attempt/job logs with returned identity and bounded inert text',
    TS,
    'A maintainer asked for this change · Active 4 days ago',
  ),
  issue(
    'kunchenguid/gh-axi',
    240,
    'issue create/edit: support --blocked-by and --add-blocked-by (gh parity)',
    TS,
    'A maintainer asked for this change',
  ),
  issue(
    'zts212653/clowder-ai',
    1879,
    'Bug: 新对话首条回复被要求先调用 set_thread_metadata 起名，一句「你好」也要多跑 1–2 轮模型调用',
    TS,
    'A maintainer asked for this change · Active 3 days ago',
  ),
];
