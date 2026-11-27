import { doc, QUESTION, STEP_REF } from './build.documents';
import type { BuildLanguage, BuildTest, BuildTestAnswer, BuildTestKind, BuildTestRun } from './types';

/* A test of a build: reading it (which writes nothing), starting a run, and answering one question. */

const RUN = `run questions { ${QUESTION} } answered`;
const RESULT = `run right passed items { question { ${QUESTION} } pick step { ${STEP_REF} } }`;

type TestOf = { project: string; kind: BuildTestKind; language?: BuildLanguage | null };

/** The person's test of a project's build: the open run, the last result, whether a run can start. */
export const BuildTestDocument = doc<{ buildTest: BuildTest | null }, TestOf>(
  `query BuildTest($project: String!, $kind: String!, $language: String) {
    buildTest(project: $project, kind: $kind, language: $language) {
      kind project { slug name } language need open { ${RUN} } last { ${RESULT} } canStart nextTryAt
    }
  }`,
);

/** Starts a run, or answers the open one as it is. */
export const StartBuildTestDocument = doc<{ startBuildTest: BuildTestRun | null }, TestOf>(
  `mutation StartBuildTest($project: String!, $kind: String!, $language: String) {
    startBuildTest(project: $project, kind: $kind, language: $language) { ${RUN} }
  }`,
);

/** One answer: the option's place in the run's order, or null for "I don't know". The tenth brings the result. */
export const AnswerBuildTestDocument = doc<
  { answerBuildTest: BuildTestAnswer | null },
  { run: string; question: string; pick: number | null }
>(
  `mutation AnswerBuildTest($run: String!, $question: String!, $pick: Int) {
    answerBuildTest(run: $run, question: $question, pick: $pick) { run { ${RUN} } result { ${RESULT} } }
  }`,
);
