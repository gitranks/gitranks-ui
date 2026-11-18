import type { Route } from 'next';

import { formatCount, formatDay, listText } from './used-by-summary';
import type { SummaryPart } from '@/app/profile/[login]/utils/profile-summary';
import type { PulseFactsData } from '@/components/pulse/pulse.utils';
import type { QuestionItem } from '@/components/questions-block/questions-block';
import { OrgPulseCountryGroup } from '@/types/generated/graphql';

const plural = (count: number, one: string, many: string) => `${formatCount(count)} ${count === 1 ? one : many}`;

type Pulse = Pick<PulseFactsData, 'last12' | 'snapshot' | 'topContributors' | 'countries' | 'computedAt'>;

/** The contributor who changed the most lines in 12 months, when the API names them. */
export const topContributorOf = (pulse: Pick<Pulse, 'topContributors'>) =>
  pulse.topContributors.find(({ login }) => !!login) ?? null;

/** The country most of the top contributors are in: more of them than in any other group. */
function mainCountryOf(pulse: Pick<Pulse, 'countries'>): string | null {
  const [first, second] = [...pulse.countries].sort((a, b) => b.contributors - a.contributors);
  if (!first || first.group !== OrgPulseCountryGroup.Country || !first.country) return null;
  return !second || first.contributors > second.contributors ? first.country : null;
}

/** "85% code and 15% tests" from the lines by type; nothing with one type or none. */
function linesByType(pulse: Pick<Pulse, 'snapshot'>): string | null {
  const types = pulse.snapshot.filter(({ lines }) => lines > 0);
  if (types.length < 2) return null;
  return listText(types.map(({ label, share }) => `${Math.round(share * 100)}% ${label.toLowerCase()}`));
}

/**
 * The Contributors tab in plain sentences, in the Overview's pattern: who was active in 12 months and what they did,
 * the code base, the most active contributor and where the top contributors are, then the date it was read.
 */
export function buildContributorsSummary(nameWithOwner: string, pulse: Pulse): SummaryPart[] {
  const { last12 } = pulse;
  const parts: SummaryPart[] = [];

  const active = `${nameWithOwner} had ${plural(last12.activeContributors, 'active contributor', 'active contributors')} in the last 12 months`;
  parts.push(
    last12.newContributors > 0 ? `${active}, ${formatCount(last12.newContributors)} of them first-time.` : `${active}.`,
  );
  parts.push(
    ` They made ${plural(last12.commits, 'commit', 'commits')} and merged ${plural(last12.pullRequests, 'pull request', 'pull requests')}.`,
  );

  const lines = pulse.snapshot.reduce((sum, { lines: count }) => sum + count, 0);
  if (lines > 0) {
    const types = linesByType(pulse);
    parts.push(
      ` The code base has ${plural(lines, 'line', 'lines')} of code: ${formatCount(last12.added)} added and ${formatCount(last12.deleted)} deleted in the last 12 months${types ? `, ${types}` : ''}.`,
    );
  }

  const top = topContributorOf(pulse);
  const country = mainCountryOf(pulse);
  if (top) {
    parts.push(
      ' The most active contributor is ',
      top.hasProfile ? { text: top.login, href: `/profile/${encodeURIComponent(top.login)}` as Route } : top.login,
      country ? `; most top contributors are in ${country}.` : '.',
    );
  } else if (country) {
    parts.push(` Most top contributors are in ${country}.`);
  }

  const updated = formatDay(pulse.computedAt);
  if (updated) parts.push(` Updated ${updated}.`);
  return parts;
}

/** "How is this counted?" on the Contributors tab. */
export const CONTRIBUTORS_COUNTED = 'People only, bots excluded. A merged pull request counts once, at its merge date.';

/**
 * The Contributors tab's questions, each answered from its own numbers: who contributes, whether it is actively
 * maintained, and how it is counted.
 */
export function buildContributorsQuestions(nameWithOwner: string, pulse: Pulse): QuestionItem[] {
  const { last12 } = pulse;
  const items: QuestionItem[] = [];
  const top = topContributorOf(pulse);

  if (last12.activeContributors > 0) {
    const people = `${plural(last12.activeContributors, 'person', 'people')} in the last 12 months.`;
    items.push({
      question: `Who contributes to ${nameWithOwner}?`,
      answer: top
        ? `${people} ${top.login} made the most changes (${plural(top.linesAdded, 'line', 'lines')} added, ${plural(top.commits, 'commit', 'commits')}).`
        : people,
    });
  }

  items.push({
    question: `Is ${nameWithOwner} actively maintained?`,
    answer:
      last12.commits > 0
        ? `Yes: ${plural(last12.commits, 'commit', 'commits')} and ${plural(last12.pullRequests, 'merged pull request', 'merged pull requests')} in the last 12 months, by ${plural(last12.activeContributors, 'contributor', 'contributors')}.`
        : 'No commits in the last 12 months.',
  });

  items.push({ question: 'How is this counted?', answer: CONTRIBUTORS_COUNTED });
  return items;
}
