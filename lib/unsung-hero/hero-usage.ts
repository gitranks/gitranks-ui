/**
 * How much a hero is used, as it was picked: its downloads in its registry's period (a week, or a month for a registry
 * counted by the month), or, for a registry that publishes no download counts, how many repositories with 100+ stars
 * use it. Every place that shows a hero's "98.8M downloads a week" reads it from here.
 */
export type HeroDownloadsPer = 'week' | 'month';

export type HeroUsage = {
  downloads: number | null;
  downloadsPer: HeroDownloadsPer | null;
  dependents: number | null;
};

/** The facts as the API answers them: `downloadsPer` in capitals, and a hero picked before months only `weeklyDownloads`. */
export type ApiHeroUsageFacts = {
  weeklyDownloads?: number | null;
  downloads?: number | null;
  downloadsPer?: string | null;
  dependents?: number | null;
};

const count = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : null);

/** The usage of an API answer; one with no `downloadsPer` field is a week, as every hero before months was. */
export function heroUsageOf(facts: ApiHeroUsageFacts): HeroUsage {
  const dependents = count(facts.dependents);
  if (facts.downloadsPer === undefined) {
    return { downloads: count(facts.weeklyDownloads), downloadsPer: 'week', dependents };
  }
  const per = facts.downloadsPer?.toLowerCase();
  return {
    downloads: count(facts.downloads),
    downloadsPer: per === 'week' || per === 'month' ? per : null,
    dependents,
  };
}

/**
 * The usage as a figure and its label: `98.8M` "downloads a week", `4.5M` "downloads a month", or `45` "repositories
 * with 100+ stars use it"; null when nothing is known. `format` writes the number.
 */
export function heroUsageFigure(
  usage: HeroUsage,
  format: (value: number) => string,
): { value: string; label: string } | null {
  if (usage.downloads !== null && usage.downloadsPer) {
    return { value: format(usage.downloads), label: `downloads a ${usage.downloadsPer}` };
  }
  if (usage.dependents !== null && usage.dependents > 0) {
    return {
      value: format(usage.dependents),
      label: `${usage.dependents === 1 ? 'repository' : 'repositories'} with 100+ stars ${usage.dependents === 1 ? 'uses' : 'use'} it`,
    };
  }
  return null;
}

/** The usage in a sentence: "98.8M downloads a week", "used by 45 GitHub repositories with 100+ stars"; null when unknown. */
export function heroUsagePhrase(usage: HeroUsage, format: (value: number) => string): string | null {
  if (usage.downloads !== null && usage.downloadsPer)
    return `${format(usage.downloads)} downloads a ${usage.downloadsPer}`;
  if (usage.dependents !== null && usage.dependents > 0) {
    return `used by ${format(usage.dependents)} GitHub ${usage.dependents === 1 ? 'repository' : 'repositories'} with 100+ stars`;
  }
  return null;
}
