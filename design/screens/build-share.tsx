import type { ReactElement } from 'react';

import type { Screen } from '../registry';
import { BuildShareCard } from '@/components/build/share/build-cards';
import { mcpServerProject } from '@/lib/build/__fixtures__/project';
import { listTheToolsStep } from '@/lib/build/__fixtures__/step';
import { buildProjectMetadata, buildStepMetadata } from '@/lib/build/project-seo';
import { BUILD_HOME_METADATA } from '@/lib/build/seo';
import { type BuildSharedRow, HOME_CARD, personCardOf, projectCardOf, stepCardOf } from '@/lib/build/share-card';

/*
 * Build's share pictures, as a posted link shows each: a project a person built, a project, a step and Build's home.
 * 1,200 by 630, light colours only, drawn at half size inside a post.
 */

/** octocat's build of the first project, as their public Skills page lists it, repeated after a week. */
const SHARED: BuildSharedRow = {
  project: 'mcp-server',
  thing: 'an MCP server',
  languages: ['typescript'],
  steps: 16,
  builtAt: '2026-11-26T10:00:00Z',
  gold: true,
};

/** A posted link as most sites show one: the picture at half size, then the title and description of its page. */
function Post({
  title,
  picture,
  preview,
}: {
  title: string;
  picture: ReactElement;
  preview: { title?: unknown; description?: unknown };
}) {
  return (
    <div className="flex flex-col gap-2" style={{ width: 602 }}>
      <span className="text-sm font-semibold text-foreground">{title}</span>
      <div className="flex flex-col overflow-hidden rounded-xl border bg-card">
        <div className="overflow-hidden" style={{ width: 600, height: 315 }}>
          <div style={{ width: 1200, height: 630, transform: 'scale(.5)', transformOrigin: 'top left' }}>{picture}</div>
        </div>
        <div className="flex flex-col gap-0.5 border-t px-4 py-3">
          <span className="text-xs text-muted-foreground">gitranks.com</span>
          <span className="text-sm font-semibold text-foreground">{String(preview.title ?? '')}</span>
          <span className="text-sm text-muted-foreground">{String(preview.description ?? '')}</span>
        </div>
      </div>
    </div>
  );
}

const person = buildProjectMetadata(mcpServerProject, { login: 'octocat', row: SHARED });
const project = buildProjectMetadata(mcpServerProject);

export const BUILD_SHARE_SCREENS: Screen[] = [
  {
    id: 'build-share',
    title: "Build's share pictures",
    area: 'build',
    route: '/build/[project]/card.png',
    sources: [
      'components/build/share/build-cards.tsx',
      'components/build/share/card-response.tsx',
      'lib/build/share-card.ts',
      'lib/build/project-seo.ts',
      'lib/build/seo.ts',
    ],
    states: [
      {
        id: 'pictures',
        title: 'The four pictures: a project a person built, a project, a step, Build',
        path: '/build/mcp-server',
        width: 1320,
        height: 940,
        render: () => (
          <main className="flex flex-wrap gap-8 p-8">
            <Post
              title="1 · A project a person built · /build/[project]?by=[login]"
              picture={<BuildShareCard words={personCardOf(mcpServerProject, 'octocat', SHARED)} />}
              preview={person.openGraph ?? {}}
            />
            <Post
              title="2 · A project · /build/[project]"
              picture={<BuildShareCard words={projectCardOf(mcpServerProject)} />}
              preview={project.openGraph ?? {}}
            />
            <Post
              title="3 · A step · /build/[project]/[step]"
              picture={<BuildShareCard words={stepCardOf(listTheToolsStep)} />}
              preview={buildStepMetadata(listTheToolsStep).openGraph ?? {}}
            />
            <Post
              title="4 · Build · /build"
              picture={<BuildShareCard words={HOME_CARD} />}
              preview={BUILD_HOME_METADATA.openGraph ?? {}}
            />
          </main>
        ),
      },
    ],
  },
];
