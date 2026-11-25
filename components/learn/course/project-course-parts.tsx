import Link from 'next/link';

import type { LearnCourseProject } from '@/lib/learn/course';
import { LEARN_MAINTAINERS_PATH } from '@/lib/learn/learn-path';
import { courseProjectOf, learnProjectIssuesPath } from '@/lib/learn/paths';
import {
  PROJECT_WRITTEN_BY,
  projectAuthorLineOf,
  projectCoversLineOf,
  projectGithubLabelOf,
  projectGitranksLabelOf,
  projectGitranksPathOf,
  projectLanguageOf,
  projectMaintainerLineOf,
  projectOpenIssuesWordsOf,
} from '@/lib/learn/project-course';

/*
 * What a project course's page has of its own: the line of facts, who wrote it, and the foot for
 * the project's maintainers. Everything else on the page is any course's.
 */

const LINK = 'whitespace-nowrap text-link hover:underline';

/**
 * The line of facts after the chip: the project's language, then its links: on GitHub, on GitRanks (only when GitRanks
 * has its page) and its open issues (only with a count).
 */
export function ProjectFacts({
  project,
  slug,
  openIssues,
}: {
  project: LearnCourseProject;
  slug: string;
  openIssues: number | null;
}) {
  const language = projectLanguageOf(project);
  const issues = projectOpenIssuesWordsOf(openIssues);
  const narrowed = courseProjectOf({ slug, project });
  return (
    <>
      {language ? <span className="whitespace-nowrap">{language}</span> : null}
      <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className={LINK} data-project-link="github">
        {projectGithubLabelOf(project)}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
      {project.onGitranks ? (
        <Link href={projectGitranksPathOf(project)} prefetch={false} className={LINK} data-project-link="gitranks">
          {projectGitranksLabelOf(project)}
        </Link>
      ) : null}
      {issues && narrowed ? (
        <Link href={learnProjectIssuesPath(narrowed)} prefetch={false} className={LINK} data-project-link="issues">
          {issues}
        </Link>
      ) : null}
    </>
  );
}

/** Who wrote the course and when it was last checked against the code; for an organisation, what it covers. */
export function ProjectAuthor({ project }: { project: LearnCourseProject }) {
  const covers = projectCoversLineOf(project);
  return (
    <p className="m-0 max-w-[70ch] text-sm text-muted-foreground" data-project-author="">
      {projectAuthorLineOf(project)}
      {covers ? ` ${covers}` : null}
    </p>
  );
}

/** A group's repository, under its name in an organisation's course. */
export function GroupRepo({ repo }: { repo: string | null | undefined }) {
  if (!repo) return null;
  return (
    <span className="block font-mono text-xs font-normal text-muted-foreground" data-group-repo={repo}>
      {repo}
    </span>
  );
}

/** The foot of a project course: who wrote it, its Markdown copy, and the line for its maintainers. */
export function ProjectFoot({ project, markdown }: { project: LearnCourseProject; markdown: string }) {
  return (
    <p className="m-0 text-xs text-muted-foreground" data-project-foot="">
      {PROJECT_WRITTEN_BY} ·{' '}
      <a href={markdown} className="hover:underline">
        Markdown version
      </a>
      {' · '}
      <Link href={LEARN_MAINTAINERS_PATH} prefetch={false} className="hover:underline">
        {projectMaintainerLineOf(project)}
      </Link>
    </p>
  );
}
