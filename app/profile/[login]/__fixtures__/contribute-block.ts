import type { ProfileLanguage, ProfilePick, ProfilePicksStats } from '@/lib/contribute/profile-picks';

/** The pool's numbers on 2026-11-11. */
export const BLOCK_STATS: ProfilePicksStats = { screenedRepos: 78_611, issuesRead: 2_389_083, readyIssues: 3_105 };

export const TYPESCRIPT_PROFILE: ProfileLanguage = { language: 'JS_TS', name: 'TypeScript' };

const pick = (
  repo: string,
  number: number,
  title: string,
  language: string,
  size: string,
  why: string[],
  fit?: ProfilePick['fit'],
): ProfilePick => ({
  repo,
  number,
  url: `https://github.com/${repo}/issues/${number}`,
  title,
  labels: [],
  language,
  kind: 'bug',
  size,
  why,
  testCommand: false,
  ...(fit ? { fit } : {}),
});

/** Real ready issues from the pool on 2026-11-11, for the owner of a TypeScript, Go and Rust profile. */
export const OWN_PICKS: ProfilePick[] = [
  pick(
    'backstage/backstage',
    36155,
    'Bug Report: GitlabUrlReader.readTree/search serve a stale tree forever when merged commits are older than the path’s newest commit',
    'js-ts',
    'M',
    ['A maintainer asked for this change', 'Clear enough to start on'],
    'language',
  ),
  pick(
    'kedacore/keda',
    8239,
    'Operator Prometheus metrics for a deleted ScaledObject/ScaledJob are never removed',
    'go',
    'M',
    ['Its maintainers review and merge outside pull requests'],
    'language',
  ),
  pick(
    'gfx-rs/wgpu',
    10664,
    'GL backend reports vendor id 0 for AMD GPUs on Windows (GL_VENDOR is "ATI Technologies Inc.")',
    'rust',
    'S',
    ['A maintainer agreed this should change'],
    'language',
  ),
];

/** Real ready issues from the pool on 2026-11-11: today's best in JavaScript / TypeScript, for anyone. */
export const VISITOR_PICKS: ProfilePick[] = [
  pick(
    'backstage/backstage',
    36155,
    'Bug Report: GitlabUrlReader.readTree/search serve a stale tree forever when merged commits are older than the path’s newest commit',
    'js-ts',
    'M',
    ['A maintainer asked for this change', 'Clear enough to start on'],
  ),
  pick(
    'processing/p5.js',
    9124,
    'default color serialization truncates channel bytes, disagreeing with #rrggbb on the same color',
    'js-ts',
    'S',
    ['Its maintainers review and merge outside pull requests', 'Clear enough to start on'],
  ),
  pick(
    'OrchestratorInc/agent-orchestrator',
    7606,
    'Report delivery to a Claude Code Terminal orchestrator loops forever when Claude Code wraps the paste in <pasted_content>',
    'js-ts',
    'M',
    ['A maintainer agreed this should change', 'Active 8 days ago'],
  ),
];
