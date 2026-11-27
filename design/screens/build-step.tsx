import type { Screen } from '../registry';
import { BuildStepView, type BuildStepViewProps } from '@/components/build/step/step-view';
import { Header } from '@/components/header/header';
import { HeaderLine } from '@/components/workspace/header-line';
import { projectMineOne, projectMineTwo, stepMineCurrent, stepMineTwo } from '@/lib/build/__fixtures__/builds';
import { mcpServerProject } from '@/lib/build/__fixtures__/project';
import { listTheToolsQuestion, listTheToolsStep } from '@/lib/build/__fixtures__/step';
import {
  bigStep,
  firstStepNoCode,
  longDiffStep,
  partStep,
  removedFileStep,
  sketchStep,
  smallStep,
} from '@/lib/build/__fixtures__/step-cases';
import { buildStepPath } from '@/lib/build/paths';
import { highlightQuestionCodes, highlightStepCodes } from '@/lib/build/step-code';
import type { BuildStepPage } from '@/lib/build/types';
import { answerAfter } from '@/lib/workspace/__fixtures__/learn-question';
import { verdictOf } from '@/lib/workspace/learn-question';

type PageProps = Partial<Omit<BuildStepViewProps, 'page' | 'codes' | 'questionCodes'>> & { page?: BuildStepPage };

/** A step's page as its route draws it: the site's header and its line, then the page, its code highlighted. */
async function Page({ page = listTheToolsStep, ...props }: PageProps) {
  const [codes, questionCodes] = await Promise.all([highlightStepCodes(page), highlightQuestionCodes(page)]);
  return (
    <>
      <Header />
      <HeaderLine />
      <BuildStepView
        page={page}
        project={mcpServerProject}
        codes={codes}
        questionCodes={questionCodes}
        personal={null}
        hints
        {...props}
      />
    </>
  );
}

/** A wrong pick of the step's question, graded on the page: its reason shows where it stands. */
const wrongAnswer = answerAfter(listTheToolsQuestion, [
  { type: 'pick', at: 0 },
  { type: 'graded', verdict: verdictOf(listTheToolsQuestion, 0, null)! },
]);

const pathOf = (page: BuildStepPage) => buildStepPath(page.project.slug, page.step.slug);
const PATH = pathOf(listTheToolsStep);

const SOURCES = [
  'app/(build-player)/build/[project]/[step]/page.tsx',
  'components/build/step/step-view.tsx',
  'components/build/step/step-live.tsx',
  'components/build/step/step-strip.tsx',
  'components/build/step/agent-row.tsx',
  'components/build/step/step-file.tsx',
  'components/build/step/whole-file-panel.tsx',
  'components/build/step/step-plan.tsx',
  'components/build/step/step-question.tsx',
  'lib/build/step-page.ts',
  'lib/build/step-diff.ts',
];

/** A step of a project: each state of the approved boards. */
export const BUILD_STEP_SCREEN: Screen = {
  id: 'build-step',
  title: 'A step of a project',
  area: 'build',
  route: '/build/[project]/[step]',
  sources: SOURCES,
  states: [
    {
      id: 'visitor',
      title: 'Not signed in: one file changed, three things to try, the question',
      path: PATH,
      signedOut: true,
      height: 2100,
      render: () => <Page />,
    },
    {
      id: 'big',
      title: 'Five files: the first three open, two to show',
      path: pathOf(bigStep),
      signedOut: true,
      height: 2700,
      render: () => <Page page={bigStep} />,
    },
    {
      id: 'small',
      title: 'A short diff under the lines above it, one thing to try',
      path: pathOf(smallStep),
      signedOut: true,
      height: 1500,
      render: () => <Page page={smallStep} />,
    },
    {
      id: 'first',
      title: 'The first step: no code, the steps of the base and what you need',
      path: pathOf(firstStepNoCode),
      signedOut: true,
      height: 1900,
      render: () => <Page page={firstStepNoCode} />,
    },
    {
      id: 'removed',
      title: 'A removed file: no whole file and no link',
      path: pathOf(removedFileStep),
      signedOut: true,
      height: 1700,
      render: () => <Page page={removedFileStep} />,
    },
    {
      id: 'long',
      title: 'A long diff, drawn whole',
      path: pathOf(longDiffStep),
      signedOut: true,
      height: 3400,
      render: () => <Page page={longDiffStep} />,
    },
    {
      id: 'part',
      title: 'A step of a part: the part on the way back, its own squares',
      path: pathOf(partStep),
      signedOut: true,
      height: 1900,
      render: () => <Page page={partStep} />,
    },
    {
      id: 'sketch-python',
      title: 'In Python: a sketch, the note, the question’s code in Python',
      path: pathOf(sketchStep),
      signedOut: true,
      height: 2100,
      render: () => <Page page={sketchStep} startLanguage="python" />,
    },
    {
      id: 'whole-file',
      title: 'The whole file, beside the page',
      path: PATH,
      signedOut: true,
      height: 1100,
      render: () => <Page drawnWholeFile="server.ts" />,
    },
    {
      id: 'current',
      title: 'Signed in, the build on this step',
      path: PATH,
      height: 2100,
      render: () => <Page personal={{ step: stepMineCurrent, project: projectMineOne }} />,
    },
    {
      id: 'done',
      title: 'Signed in, this step passed, the build further on',
      path: PATH,
      height: 2100,
      render: () => <Page personal={{ step: stepMineTwo, project: projectMineTwo }} />,
    },
    {
      id: 'to-come',
      title: 'Signed in, this step still to come in the Python build',
      path: PATH,
      height: 2100,
      render: () => <Page personal={{ step: stepMineTwo, project: projectMineTwo }} startLanguage="python" />,
    },
    {
      id: 'wrong',
      title: 'A wrong pick: its reason shows where it stands',
      path: PATH,
      signedOut: true,
      height: 2200,
      render: () => <Page answer={wrongAnswer} />,
    },
    {
      id: 'phone',
      title: 'On a phone',
      path: PATH,
      signedOut: true,
      width: 390,
      height: 3300,
      render: () => <Page />,
    },
  ],
};

export const BUILD_STEP_SCREENS: Screen[] = [BUILD_STEP_SCREEN];
