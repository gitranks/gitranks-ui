import {
  companyCountsOf,
  courseLineOf,
  coursesLineOf,
  disagreementsWordsOf,
  factWordsOf,
  notOfficialWordsOf,
  planLevelNamesOf,
  planSizeOf,
  plansNoteOf,
  valuesLineOf,
} from './company';
import { planSizeOf as homePlanSizeOf, planRowNameOf } from './home';
import { INTERVIEWS_HOME_DESCRIPTION, INTERVIEWS_HOME_TITLE } from './home-seo';
import {
  INTERVIEWS_ABOUT_PATH,
  INTERVIEWS_HOME_MARKDOWN_PATH,
  INTERVIEWS_HOME_PATH,
  interviewCompanyMarkdownPath,
  interviewCompanyPath,
  interviewCoursePath,
  interviewCoursesSearchPath,
  interviewOrgPath,
  interviewPlanMarkdownPath,
  interviewPlanPath,
} from './paths';
import { aiWordsOf, itemNamesOf, planFactsOf, planNoticeOf, roundSizeWordsOf, thinWordsOf } from './plan';
import { basisWordsOf, publishedWordsOf, SEARCH_SUMMARY_WORDS, sourceKindWordsOf, sourceTitleOf } from './sources';
import type {
  InterviewCompanyPage,
  InterviewFact,
  InterviewItem,
  InterviewPlanCard,
  InterviewPlanPage,
  InterviewRound,
  InterviewSource,
  InterviewsHome,
} from './types';
import { absoluteUrl } from '@/lib/seo/site';

/*
 * The Markdown copies of Interviews home, a company and a plan, for agents: what the pages show everyone, in their
 * order, each fact with who states it and the sources it rests on, and the notice that the page is not official.
 * Nothing of a person: a copy is the same for everyone. Pure, so the routes and the specs agree.
 */

/** One line of text: a name or a fact cannot start a heading or a list of its own. */
const oneLine = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ').trim();

/** Text inside a link's brackets: one line, with none of the characters that would end or escape the link. */
const linkText = (text: string) => oneLine(text).replace(/[[\]\\]/g, '');

/** A line that ends as a sentence does. */
const sentence = (text: string | null | undefined) => {
  const line = oneLine(text);
  return !line || /[.!?:]$/.test(line) ? line : `${line}.`;
};

/** A link to another of our pages, by its path. */
const linkTo = (text: string, path: string) => `[${linkText(text)}](${absoluteUrl(path)})`;

/** Each source's number in the page's list of sources, from 1. */
const numbersOf = (sources: readonly InterviewSource[]) => new Map(sources.map((source, at) => [source.id, at + 1]));

/** "Sources: 1 and 4." for the sources a fact names, by their number in the list at the end; empty with none. */
function sourcesWordsOf(ids: readonly string[], numbers: ReadonlyMap<string, number>): string {
  const found = [...new Set(ids)].map((id) => numbers.get(id)).filter((n): n is number => n !== undefined);
  if (!found.length) return '';
  const words = found.map(String);
  const joined = words.length === 1 ? words[0] : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
  return `${found.length === 1 ? 'Source' : 'Sources'}: ${joined}.`;
}

/** A fact as a list item: its heading, its words, who states it and its sources. */
function factLineOf(fact: InterviewFact, company: string, numbers: ReadonlyMap<string, number>): string | null {
  const name = oneLine(fact.name);
  if (!name) return null;
  const words = sentence(factWordsOf(fact));
  const parts = [words, `${basisWordsOf(fact.basis, company)}.`, sourcesWordsOf(fact.sources, numbers)];
  return `- ${name}: ${parts.filter(Boolean).join(' ')}`;
}

/** The numbered list of sources: each with its site, what it is, when it was published, and how it was read. */
function sourcesListOf(sources: readonly InterviewSource[], company: string): string {
  return sources
    .map((source, at) => {
      const published = publishedWordsOf(source.published);
      const line = [
        oneLine(source.site),
        sourceKindWordsOf(source.kind, company),
        published,
        source.how === 'search_summary' ? SEARCH_SUMMARY_WORDS : null,
      ].filter(Boolean);
      return `${at + 1}. [${linkText(sourceTitleOf(source))}](${source.url}) · ${line.join(' · ')}`;
    })
    .join('\n');
}

/**
 * A plan as a list item: its name linked to its copy, "All levels" for a position's one plan or else the company's
 * names for its levels, and its size.
 */
function planItemOf(plan: InterviewPlanCard): string {
  const levels = plan.slug === plan.position.slug ? 'All levels' : planLevelNamesOf(plan);
  const size = [levels, ...planSizeOf(plan)].filter(Boolean).join(' · ');
  const link = linkTo(plan.name, interviewPlanMarkdownPath(plan.company.slug, plan.slug));
  return size ? `- ${link}: ${size}` : `- ${link}`;
}

/** The sections joined, each once, with nothing empty. */
const joined = (sections: readonly (string | null | undefined)[]) =>
  `${sections.filter((section): section is string => !!section?.trim()).join('\n\n')}\n`;

/**
 * Interviews home's copy: what a plan is, where the facts come from, then each company linked to its copy with its
 * plans, in the home's order. With no company read (a failed read), the words alone.
 */
export function interviewsHomeMarkdownOf(home: Pick<InterviewsHome, 'companies'>): string {
  const sections = [
    `# ${INTERVIEWS_HOME_TITLE.replace(/ · GitRanks$/, '')}`,
    [
      INTERVIEWS_HOME_DESCRIPTION,
      `The page: ${absoluteUrl(INTERVIEWS_HOME_PATH)}`,
      `How it works: ${absoluteUrl(INTERVIEWS_ABOUT_PATH)}`,
    ].join('\n'),
    'Each plan is built from public sources: what a company publishes about its interviews, and what candidates report in public. Each fact says who states it. These are not official pages of the companies.',
  ];
  const companies = home.companies.filter((card) => card.company?.slug && card.plans.length > 0);
  if (companies.length) {
    sections.push(
      '## Companies',
      companies
        .map((card) => {
          const head = `- ${linkTo(card.company.name, interviewCompanyMarkdownPath(card.company.slug))}: ${card.plans.length} ${card.plans.length === 1 ? 'plan' : 'plans'}`;
          const plans = card.plans.map((plan) => {
            const size = homePlanSizeOf(plan);
            const link = linkTo(
              planRowNameOf(plan, { levelNames: true }),
              interviewPlanMarkdownPath(plan.company.slug, plan.slug),
            );
            return `  - ${size ? `${link}: ${size}` : link}`;
          });
          return [head, ...plans].join('\n');
        })
        .join('\n'),
    );
  }
  return joined(sections);
}

/**
 * A company's copy, in the page's order: what it is with the notice, its plans by position, how it hires, what it
 * looks for (with its own course), its own pages, the company on GitRanks, and the sources.
 */
export function interviewCompanyMarkdownOf(page: InterviewCompanyPage): string {
  const { company } = page;
  const name = company.name;
  const numbers = numbersOf(page.sources);
  const counts = companyCountsOf(page);
  const sections: (string | null)[] = [
    `# ${oneLine(name)} interviews`,
    [
      sentence(page.line),
      counts.length ? sentence(counts.join(' · ')) : null,
      notOfficialWordsOf(name),
      `The page: ${absoluteUrl(interviewCompanyPath(company.slug))}`,
      `All companies: ${absoluteUrl(INTERVIEWS_HOME_MARKDOWN_PATH)}`,
    ]
      .filter(Boolean)
      .join('\n'),
  ];

  const positions = page.positions.filter((one) => one.plans.length > 0);
  if (positions.length) {
    sections.push(
      '## Plans',
      ...positions.map((one) =>
        [`### ${oneLine(one.position.name)}`, one.plans.map((plan) => planItemOf(plan)).join('\n')].join('\n\n'),
      ),
      plansNoteOf(page),
    );
  }

  const hires = [...page.process, ...(page.timeline ? [page.timeline] : [])]
    .map((fact) => factLineOf(fact, name, numbers))
    .filter((line): line is string => !!line);
  if (hires.length) sections.push(`## How ${oneLine(name)} hires`, hires.join('\n'));

  const values = page.values.map((fact) => factLineOf(fact, name, numbers)).filter((line): line is string => !!line);
  const course = page.course
    ? `${name}'s own course: ${linkTo(page.course.name, `${interviewCoursePath(page.course.slug)}.md`)}. ${sentence(courseLineOf(page.course, name, values.length > 0))}`
    : null;
  if (values.length) {
    sections.push(`## What ${oneLine(name)} looks for`, valuesLineOf(page.values, name), values.join('\n'), course);
  } else if (course) {
    sections.push(course);
  }

  if (page.official.length) {
    sections.push(
      `## ${oneLine(name)}'s own pages`,
      `What ${name} itself publishes about its interviews.`,
      page.official
        .map((source) => {
          const line = [oneLine(source.site), publishedWordsOf(source.published) ?? 'no date'].join(' · ');
          const says = source.says?.trim() ? ` ${sentence(source.says)}` : '';
          return `- [${linkText(sourceTitleOf(source))}](${source.url}) (${line}).${says}`;
        })
        .join('\n'),
    );
  }

  const courses = coursesLineOf(page.courses);
  const doors = [
    courses ? `- ${linkTo(`Courses for ${name}'s interviews`, interviewCoursesSearchPath(name))}: ${courses}` : null,
    page.githubOrg
      ? `- ${linkTo(`${name}'s open-source projects`, interviewOrgPath(page.githubOrg))}: its public repositories, ranked.`
      : null,
  ].filter(Boolean);
  if (doors.length) sections.push(`## ${oneLine(name)} on GitRanks`, doors.join('\n'));

  if (page.sources.length) {
    sections.push('## Sources', disagreementsWordsOf(page.disagreements), sourcesListOf(page.sources, name));
  }
  return joined(sections);
}

/** An item a round offers, as a list item: a group of lessons linked to its first lesson's copy, with its course. */
function itemLineOf(item: InterviewItem): string {
  const { name, from } = itemNamesOf(item);
  if (item.type !== 'lessons') return `- ${oneLine(name)} · ${oneLine(from)}`;
  const lessons = item.lessons > 0 ? ` · ${item.lessons} ${item.lessons === 1 ? 'lesson' : 'lessons'}` : '';
  const first = item.first ? linkTo(name, `/learn/lessons/${encodeURIComponent(item.first)}.md`) : linkText(name);
  return `- ${first} · ${linkTo(from, `${interviewCoursePath(item.course.slug)}.md`)}${lessons}`;
}

/** A round: its size, what it checks, where, the rule on AI help, who states it, and what prepares for it. */
function roundOf(round: InterviewRound, plan: InterviewPlanPage, numbers: ReadonlyMap<string, number>): string {
  const company = plan.company.name;
  const facts = [
    roundSizeWordsOf(round) ? sentence(roundSizeWordsOf(round)) : null,
    round.checks?.trim() ? `What it checks: ${sentence(round.checks)}` : null,
    round.format?.trim() ? `Where: ${sentence(round.format)}` : null,
    aiWordsOf(round.ai) ? `AI help: ${aiWordsOf(round.ai)}` : null,
    [`${basisWordsOf(round.basis, company)}.`, sourcesWordsOf(round.sources, numbers)].filter(Boolean).join(' '),
    round.thin ? thinWordsOf(round, plan.sources) : null,
    round.notes?.trim() ? sentence(round.notes) : null,
  ].filter(Boolean);
  const items = round.items.map(itemLineOf);
  return [
    `### Round ${round.number}: ${oneLine(round.title)}`,
    facts.join('\n'),
    items.length ? ['To prepare:', ...items].join('\n') : 'Nothing to prepare with us for this round yet.',
  ].join('\n\n');
}

/**
 * A plan's copy, in the page's order: what it is with its facts and the notice, each round with what prepares for
 * it, what happens after the interviews, the sources, and the company's other plans.
 */
export function interviewPlanMarkdownOf(plan: InterviewPlanPage): string {
  const company = plan.company.name;
  const numbers = numbersOf(plan.sources);
  const facts = planFactsOf(plan);
  const sections: (string | null)[] = [
    `# ${oneLine(company)} · ${oneLine(plan.name)}`,
    [
      sentence(plan.line),
      facts.length ? sentence(facts.join(' · ')) : null,
      planNoticeOf(plan),
      `The page: ${absoluteUrl(interviewPlanPath(plan.company.slug, plan.slug))}`,
      `${oneLine(company)}: ${absoluteUrl(interviewCompanyMarkdownPath(plan.company.slug))}`,
    ]
      .filter(Boolean)
      .join('\n'),
  ];
  if (plan.rounds.length) sections.push('## The rounds', ...plan.rounds.map((round) => roundOf(round, plan, numbers)));
  const after = plan.after.map((fact) => factLineOf(fact, company, numbers)).filter((line): line is string => !!line);
  if (after.length) {
    sections.push('## After the interviews', 'Nothing to prepare: it is what happens next.', after.join('\n'));
  }
  if (plan.sources.length) sections.push('## Sources', sourcesListOf(plan.sources, company));
  const others = plan.others.filter((other) => other.slug !== plan.slug);
  if (others.length) {
    sections.push(`## Other plans at ${oneLine(company)}`, others.map((other) => planItemOf(other)).join('\n'));
  }
  return joined(sections);
}
