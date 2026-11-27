import { ArrowLeft, Book, BookMarked, ChevronRight, ExternalLink } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { Fragment, type ReactNode, useId } from 'react';

import { INTERVIEWS_COLUMN } from '../column';
import { CompanyLogo } from '../company-logo';
import { BasisChip } from '../sources/basis-chip';
import { SourcesInPlace } from '../sources/sources-in-place';
import { CompanyBox } from './company-box';
import {
  companyCountsOf,
  courseLineOf,
  coursesLineOf,
  disagreementsWordsOf,
  factsFromWordsOf,
  factWordsOf,
  notOfficialWordsOf,
  planLevelNamesOf,
  planLevelWordsOf,
  planSizeOf,
  plansNoteOf,
  roundOfWordsOf,
  valuesLineOf,
} from '@/lib/interviews/company';
import {
  INTERVIEWS_ABOUT_PATH,
  INTERVIEWS_HOME_PATH,
  interviewCompanyMarkdownPath,
  interviewCoursePath,
  interviewCoursesSearchPath,
  interviewOrgPath,
  interviewPlanPath,
} from '@/lib/interviews/paths';
import {
  dayWordsOf,
  publishedWordsOf,
  SEARCH_SUMMARY_WORDS,
  sourcesOfFacts,
  sourceTitleOf,
} from '@/lib/interviews/sources';
import type {
  InterviewCompanyPage,
  InterviewFact,
  InterviewPlanCard,
  InterviewPlanRow,
  InterviewSource,
} from '@/lib/interviews/types';
import { cn } from '@/lib/utils';

/** Parts of one line, with a dot between them that screen readers skip. */
function Dotted({ parts }: Readonly<{ parts: readonly ReactNode[] }>) {
  return parts.map((part, index) => (
    <Fragment key={index}>
      {index > 0 && <span aria-hidden="true"> · </span>}
      {part}
    </Fragment>
  ));
}

/** A section's heading, with the line under it when it has one. */
function SectionHead({ id, title, line }: Readonly<{ id: string; title: string; line?: string | null }>) {
  return (
    <div className="flex flex-col gap-1">
      <h2 id={id} className="m-0 text-xl font-bold tracking-tight">
        {title}
      </h2>
      {line && <p className="m-0 text-sm text-muted-foreground">{line}</p>}
    </div>
  );
}

/** A row that opens a page: an icon, a name and a line under it, and an arrow. The whole row is the link. */
function DoorRow({
  href,
  icon,
  name,
  line,
  data,
}: Readonly<{ href: Route; icon: ReactNode; name: string; line: string | null; data: string }>) {
  return (
    <Link
      href={href}
      data-company-door={data}
      className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 hover:bg-accent"
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-medium">{name}</span>
        {line && <span className="text-sm text-muted-foreground">{line}</span>}
      </span>
      <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

/** The title with the logo, the line, how many plans and positions, the day of the last check, and the notice. */
function CompanyHead({ page }: Readonly<{ page: InterviewCompanyPage }>) {
  const counts = companyCountsOf(page);
  return (
    <div className="flex flex-col gap-2">
      <Link
        href={INTERVIEWS_HOME_PATH}
        className="inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground hover:underline"
      >
        <ArrowLeft aria-hidden="true" className="size-4 shrink-0" />
        All companies
      </Link>
      <h1 className="m-0 flex items-center gap-3 text-3xl font-bold tracking-tight text-balance">
        <CompanyLogo company={page.company} size={40} />
        <span className="min-w-0">{page.company.name} interviews</span>
      </h1>
      <p className="m-0 text-base leading-relaxed">{page.line}</p>
      {counts.length > 0 && (
        <p className="m-0 text-sm text-muted-foreground" data-company-counts="">
          <Dotted parts={counts} />
        </p>
      )}
      <p className="m-0 text-xs text-muted-foreground">{notOfficialWordsOf(page.company.name)}</p>
    </div>
  );
}

/** One plan's row: its level in plain words, the company's own name for it, the person's mark, its size. */
function PlanRow({ plan, mine }: Readonly<{ plan: InterviewPlanCard; mine: InterviewPlanRow | undefined }>) {
  const names = planLevelNamesOf(plan);
  const roundOf = mine ? roundOfWordsOf(mine) : null;
  const size = planSizeOf(plan);
  return (
    <li data-plan={plan.slug}>
      <Link
        href={interviewPlanPath(plan.company.slug, plan.slug)}
        className="flex items-center gap-3 px-3 py-2.5 hover:bg-accent"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-1">
          <span className="min-w-0 text-sm sm:flex-1">
            <span className="font-medium">{planLevelWordsOf(plan)}</span>
            {names && (
              <span className="text-muted-foreground">
                <span aria-hidden="true"> · </span>
                {names}
              </span>
            )}
          </span>
          {mine && (
            <span
              data-your-plan=""
              className="self-start rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-brand-soft-foreground sm:self-auto"
            >
              {roundOf ? `Your plan · ${roundOf}` : 'Your plan'}
            </span>
          )}
          {size.length > 0 && (
            <span className="text-xs text-muted-foreground sm:whitespace-nowrap">{size.join(' · ')}</span>
          )}
        </span>
        <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}

/** The plans by position and then by level, with the quiet line on what has no plan of its own. */
function PlansSection({ page, mine }: Readonly<{ page: InterviewCompanyPage; mine: readonly InterviewPlanRow[] }>) {
  const id = useId();
  const yours = new Map(mine.map((row) => [row.plan.slug, row]));
  const positions = page.positions.filter((one) => one.plans.length > 0);
  const note = plansNoteOf(page);
  if (!positions.length) return null;
  return (
    <section className="flex flex-col gap-4" aria-labelledby={id} data-company-section="plans">
      <SectionHead
        id={id}
        title="Plans"
        line="One for each position and level that public sources describe. Each follows the real rounds, in order."
      />
      {positions.map(({ position, plans }) => (
        <div key={position.slug} className="flex flex-col gap-2" data-position={position.slug}>
          <h3 className="m-0 text-base font-semibold">{position.name}</h3>
          <ul className="m-0 flex list-none flex-col rounded-lg border bg-card p-0 [&>li+li]:border-t">
            {plans.map((plan) => (
              <PlanRow key={plan.slug} plan={plan} mine={yours.get(plan.slug)} />
            ))}
          </ul>
        </div>
      ))}
      {note && <p className="m-0 text-xs text-muted-foreground">{note}</p>}
    </section>
  );
}

/** A section's facts, one row each: the heading, who states it, and what it says. */
function FactList({ facts, company }: Readonly<{ facts: readonly InterviewFact[]; company: string }>) {
  return (
    <ul className="m-0 flex list-none flex-col rounded-lg border bg-card p-0 [&>li+li]:border-t">
      {facts.map((fact) => {
        const words = factWordsOf(fact);
        return (
          <li key={fact.key} data-fact={fact.key} className="flex flex-col gap-1.5 px-3 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <span className="text-sm font-medium">{fact.name}</span>
              <BasisChip basis={fact.basis} company={company} />
            </div>
            {words && <span className="text-sm text-muted-foreground">{words}</span>}
          </li>
        );
      })}
    </ul>
  );
}

/** The door to the company's own course in Learn. */
function CourseDoor({ page }: Readonly<{ page: InterviewCompanyPage }>) {
  if (!page.course) return null;
  return (
    <DoorRow
      href={interviewCoursePath(page.course.slug)}
      icon={<Book aria-hidden="true" className="size-4 shrink-0" />}
      name={page.course.name}
      line={courseLineOf(page.course, page.company.name, page.values.length > 0)}
      data="course"
    />
  );
}

/**
 * A section of facts: its heading, its facts, and the line under them that opens their sources and "This is wrong"
 * in place, with the section's key. `after`: the sentence on what the sources disagree on, under the last section.
 */
function FactsSection({
  page,
  fact,
  title,
  line,
  facts,
  after,
  children,
}: Readonly<{
  page: InterviewCompanyPage;
  fact: 'process' | 'values';
  title: string;
  line: string | null;
  facts: readonly InterviewFact[];
  after: string | null;
  children?: ReactNode;
}>) {
  const id = useId();
  const { company } = page;
  return (
    <section className="flex flex-col gap-4" aria-labelledby={id} data-company-section={fact}>
      <SectionHead id={id} title={title} line={facts.length ? line : null} />
      {facts.length > 0 && (
        <>
          <FactList facts={facts} company={company.name} />
          <SourcesInPlace
            sources={sourcesOfFacts(facts, page.sources)}
            company={company.name}
            report={{ company: company.slug, plan: null, fact }}
            label="What is wrong with these facts?"
            after={after}
          />
        </>
      )}
      {children}
    </section>
  );
}

/** The line under one of the company's own pages: its site, and when it was published ("no date" when unknown). */
const officialLineOf = (source: InterviewSource): string[] => [
  source.site,
  publishedWordsOf(source.published) ?? 'no date',
  ...(source.how === 'search_summary' ? [SEARCH_SUMMARY_WORDS] : []),
];

/** What the company itself publishes about its interviews, each page with its date and its one line. */
function OfficialSection({ page }: Readonly<{ page: InterviewCompanyPage }>) {
  const id = useId();
  const { company, official } = page;
  if (!official.length) return null;
  return (
    <section className="flex flex-col gap-4" aria-labelledby={id} data-company-section="official">
      <SectionHead
        id={id}
        title={`${company.name}'s own pages`}
        line={`What ${company.name} itself publishes about its interviews.`}
      />
      <ul className="m-0 flex list-none flex-col gap-3 rounded-lg border bg-card p-3">
        {official.map((source) => (
          <li key={source.id} className="flex flex-col gap-0.5" data-source={source.id}>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-link hover:underline"
            >
              {sourceTitleOf(source)}
              <ExternalLink aria-hidden="true" className="size-3.5 shrink-0" />
            </a>
            <span className="text-xs text-muted-foreground">
              <Dotted parts={officialLineOf(source)} />
            </span>
            {source.says && <span className="text-sm text-muted-foreground">{source.says}</span>}
          </li>
        ))}
      </ul>
      <SourcesInPlace
        sources={[]}
        company={company.name}
        report={{ company: company.slug, plan: null, fact: 'official' }}
        label="What is wrong with these pages?"
      />
    </section>
  );
}

/** "<Company> on GitRanks": Learn's courses its plans use, and its open-source projects. Not drawn with neither. */
function OnGitRanksSection({ page }: Readonly<{ page: InterviewCompanyPage }>) {
  const id = useId();
  const { name } = page.company;
  const courses = coursesLineOf(page.courses);
  if (!courses && !page.githubOrg) return null;
  return (
    <section className="flex flex-col gap-4" aria-labelledby={id} data-company-section="gitranks">
      <SectionHead id={id} title={`${name} on GitRanks`} />
      <div className="flex flex-col gap-2">
        {courses && (
          <DoorRow
            href={interviewCoursesSearchPath(name)}
            icon={<Book aria-hidden="true" className="size-4 shrink-0" />}
            name={`Courses for ${name}'s interviews`}
            line={courses}
            data="courses"
          />
        )}
        {page.githubOrg && (
          <DoorRow
            href={interviewOrgPath(page.githubOrg)}
            icon={<BookMarked aria-hidden="true" className="size-4 shrink-0" />}
            name={`${name}'s open-source projects`}
            line="Its public repositories, ranked. Real code from the company you are preparing for."
            data="org"
          />
        )}
      </div>
    </section>
  );
}

export type CompanyViewProps = {
  page: InterviewCompanyPage;
  /** The person's plans in progress at this company, the one worked on last first; none for a visitor. */
  mine: readonly InterviewPlanRow[];
  /** A browser with a session is reading the person's side: what may change stays hidden in its place. */
  reading?: boolean;
};

/**
 * A company's page, as the approved designs draw it: one reading column. What it is; for a person with a plan in
 * progress here, the box that goes on with it; the plans by position and level; how the company hires; what it looks
 * for, with the door to its own course; its own pages; the company on GitRanks; the foot line. A section with nothing
 * in it is not drawn.
 */
export function CompanyView({ page, mine, reading = false }: CompanyViewProps) {
  const { company } = page;
  const hires = page.timeline ? [...page.process, page.timeline] : page.process;
  const values = page.values;
  const disagreements = disagreementsWordsOf(page.disagreements);
  // The line on disagreements closes the sources of the last section of facts that has sources to open.
  const valuesHaveSources = sourcesOfFacts(values, page.sources).length > 0;
  const disagreementsIn = values.length && valuesHaveSources ? 'values' : 'process';
  const checked = dayWordsOf(page.checkedAt);
  return (
    <main data-interview-company={company.slug} className={INTERVIEWS_COLUMN}>
      <div className="flex flex-col gap-5">
        <CompanyHead page={page} />
        {mine[0] && <CompanyBox row={mine[0]} />}
      </div>
      <div
        data-company-held={reading ? '' : undefined}
        aria-busy={reading || undefined}
        className={cn(
          'flex flex-col gap-10',
          reading && '[html[data-has-session]_&]:invisible [html[data-has-session]_&]:animate-build-reveal',
        )}
      >
        <PlansSection page={page} mine={mine} />
        {(hires.length > 0 || (!values.length && page.course)) && (
          <FactsSection
            page={page}
            fact="process"
            title={`How ${company.name} hires`}
            line="True for every interview there, whatever the position."
            facts={hires}
            after={disagreementsIn === 'process' ? disagreements : null}
          >
            {!values.length && <CourseDoor page={page} />}
          </FactsSection>
        )}
        {values.length > 0 && (
          <FactsSection
            page={page}
            fact="values"
            title={`What ${company.name} looks for`}
            line={valuesLineOf(values, company.name)}
            facts={values}
            after={disagreementsIn === 'values' ? disagreements : null}
          >
            <CourseDoor page={page} />
          </FactsSection>
        )}
        <OfficialSection page={page} />
        <OnGitRanksSection page={page} />
        <p className="m-0 text-xs text-muted-foreground" data-company-foot="">
          <Dotted
            parts={[
              factsFromWordsOf(page.sources.length),
              ...(checked ? [`last checked ${checked}`] : []),
              <Link key="about" href={INTERVIEWS_ABOUT_PATH} className="hover:underline">
                How we research
              </Link>,
              <a key="markdown" href={interviewCompanyMarkdownPath(company.slug)} className="hover:underline">
                Markdown version
              </a>,
            ]}
          />
        </p>
      </div>
    </main>
  );
}
