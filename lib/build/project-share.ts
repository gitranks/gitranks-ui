import { buildProjectPath } from './paths';
import { absoluteUrl } from '@/lib/seo/site';

/*
 * What a built project's Share and Put it on GitHub say, as the approved designs draw them: the link to the person's
 * build, and the ways to put the code they built on GitHub. Pure: the page, its specs and the catalogue read the same.
 */

/** The link to a person's build of a project: the project's page, with whose build it is. */
export const buildShareUrlOf = (project: string, login: string) =>
  `${absoluteUrl(buildProjectPath(project))}?by=${encodeURIComponent(login)}`;

/** Share's line before the link is copied, and after. */
export const SHARE_LINE =
  'Anyone with the link sees the project, and that you built it once your Skills page is public.';
export const SHARE_COPIED_LINE = 'The link is copied. Paste it in a post or a message.';

/** What was built, as a heading names it: "an MCP server" is "MCP server". */
export const thingNameOf = (thing: string) => thing.trim().replace(/^(?:an?|the)\s+/i, '');

/** The words of "Put it on GitHub" for one project and person. */
export type GithubWords = {
  title: string;
  say: string;
  repository: string;
  commands: string[];
  commit: string;
};

/**
 * "Put it on GitHub": the sentence for the person's agent, the repository's name (the project's slug), and the two
 * commands that push the folder of the build, as its branch `main`, to a new empty repository of theirs.
 */
export function githubWordsOf(project: { slug: string; name: string; thing: string }, login: string): GithubWords {
  const repository = project.slug;
  return {
    title: `Put your ${thingNameOf(project.thing)} on GitHub`,
    say: `Put this project on GitHub as a new public repository named ${repository}`,
    repository,
    // `git branch -M main`: a folder started with a bare `git init` may name its branch otherwise.
    commands: [
      `git remote add origin https://github.com/${login}/${repository}.git`,
      'git branch -M main',
      'git push -u origin main',
    ],
    commit: `git commit -m "${project.name.replace(/"/g, "'")}"`,
  };
}

/** GitHub's page that makes a new repository. */
export const GITHUB_NEW_REPOSITORY = 'https://github.com/new';
