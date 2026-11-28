import type { ReactNode } from 'react';

import type { Screen } from '../registry';
import { SkillsBlock } from '@/components/skills/skills-block';
import { SkillsBuiltSection } from '@/components/skills/skills-built';
import { SkillsNumbersBox } from '@/components/skills/skills-numbers-box';
import { SkillsPageView } from '@/components/skills/skills-page-view';
import { SkillsStart } from '@/components/skills/skills-start';
import { SkillsStrip } from '@/components/skills/skills-strip';
import {
  allThreeNumbers,
  allThreePage,
  builderNumbers,
  builderPage,
  buildsAndFixesNumbers,
  buildsAndLearnsNumbers,
  builtKeyValue,
  builtMcpServer,
  builtWebServer,
  builtWebServerGold,
  ownerBuildsMine,
  SKILLS_LOGIN,
  SKILLS_NOW,
  skillsMine,
} from '@/lib/skills/__fixtures__/skills';
import { skillsPath } from '@/lib/skills/paths';
import type { SkillsPage } from '@/lib/skills/skills.types';

/*
 * Build on a person's Skills page: the "Built" section between the fixes and the courses, and the numbers with
 * "projects built". Until Build is open to everyone the API sends a person's built projects only to them, on their own
 * page, and every public page is today's.
 */

const TAB_PATH = skillsPath(SKILLS_LOGIN);

const frame = (children: ReactNode) => (
  <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pt-7 pb-16">{children}</main>
);

/** A labelled part of a board that shows several cases one under the other. */
const Case = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="flex flex-col gap-3 border-t pt-4">
    <span className="text-sm font-semibold text-foreground">{title}</span>
    {children}
  </div>
);

const row = (built: Parameters<typeof SkillsBuiltSection>[0]['built']) => (
  <SkillsBuiltSection built={built} login={SKILLS_LOGIN} now={SKILLS_NOW} />
);

const noop = () => {};

/** The owner's page everyone sees, with their built projects from their own view. */
const ownPage = ownerBuildsMine.page as SkillsPage;

const tab = (id: string, title: string, height: number, render: () => ReactNode, width?: number) => ({
  id,
  title,
  path: TAB_PATH,
  height,
  width,
  render: () => frame(render()),
});

export const BUILD_SKILLS_SCREENS: Screen[] = [
  {
    id: 'build-skills',
    title: 'Skills: the Built section and the numbers',
    area: 'build',
    route: '/profile/[login]/skills',
    sources: [
      'components/skills/skills-built.tsx',
      'components/skills/skills-page-view.tsx',
      'components/skills/skills-numbers-box.tsx',
      'lib/skills/skills-built.ts',
      'lib/skills/skills-figures.ts',
      'lib/skills/skills-view.ts',
      'lib/skills/skills-owner.ts',
      'components/skills/skills-start.tsx',
      'components/skills/skills-strip.tsx',
      'components/skills/skills-block.tsx',
    ],
    states: [
      tab('all', 'All three: fixes, then Built, then courses', 2200, () => (
        <SkillsPageView page={allThreePage} now={SKILLS_NOW} />
      )),
      tab('builder', 'Someone who only builds, as anyone sees it once Build is open to everyone', 1000, () => (
        <SkillsPageView page={builderPage} now={SKILLS_NOW} />
      )),
      tab('cases', 'A built project in every case, and the numbers for each kind of person', 2000, () => (
        <>
          <Case title="Built, and no more">{row([{ ...builtKeyValue, languages: ['typescript'] }])}</Case>
          <Case title="Answered every step">{row([builtWebServer])}</Case>
          <Case title="Repeated after a week, with optional parts">{row([builtMcpServer])}</Case>
          <Case title="Gold alone">{row([builtWebServerGold])}</Case>
          <Case title="Built in both languages: one row">{row([builtKeyValue])}</Case>
          <Case title="Only builds">
            <SkillsNumbersBox numbers={builderNumbers} />
          </Case>
          <Case title="Builds and learns">
            <SkillsNumbersBox numbers={buildsAndLearnsNumbers} />
          </Case>
          <Case title="Builds and fixes">
            <SkillsNumbersBox numbers={buildsAndFixesNumbers} />
          </Case>
          <Case title="All three">
            <SkillsNumbersBox numbers={allThreeNumbers} />
          </Case>
        </>
      )),
      tab('new', 'Someone new, as the owner sees it while Build is open to them: Learn, Build, Contribute', 900, () => (
        <>
          <SkillsStrip mine={skillsMine.new} href={TAB_PATH} build />
          <SkillsStart mine={skillsMine.new} build />
        </>
      )),
      tab(
        'only-you',
        'Everyone sees the page, but only its owner sees Built until Build is open to everyone',
        1500,
        () => (
          <SkillsPageView
            page={ownPage}
            now={SKILLS_NOW}
            strip={<SkillsStrip mine={ownerBuildsMine} href={TAB_PATH} onHide={noop} onShow={noop} />}
            builtOnlyYou
          />
        ),
      ),
      tab(
        'block',
        "The profile overview's Skills block of someone who only builds: its link names the projects",
        520,
        () => <SkillsBlock login={SKILLS_LOGIN} numbers={builderNumbers} />,
      ),
      tab(
        'phone',
        'Someone who only builds, on a phone',
        1500,
        () => <SkillsPageView page={builderPage} now={SKILLS_NOW} />,
        390,
      ),
    ],
  },
];
