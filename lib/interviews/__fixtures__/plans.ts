import type { InterviewItem, InterviewPlanPage, InterviewRound } from '../types';
import {
  CHECKED_AT,
  northwindEngineeringManagerCard,
  northwindEntrySoftwareEngineerCard,
  northwindMidSeniorSreCard,
  northwindMidSoftwareEngineerCard,
  northwindSeniorSoftwareEngineerCard,
  northwindSources,
  northwindStaffSoftwareEngineerCard,
  northwindStaffSreCard,
  tallgrassSources,
  tallgrassSreCard,
} from './companies';

/*
 * Two plans: Northwind's senior software engineer, with five rounds and what comes after them, and Tallgrass's site
 * reliability engineer, the short case with a round that has nothing to prepare with yet and no part after the rounds.
 * The courses and groups are the kind Learn has; their names and sizes are examples.
 */

const lessons = (
  course: [slug: string, name: string],
  group: [slug: string, name: string],
  count: number,
  first: string,
): InterviewItem => ({
  type: 'lessons',
  key: `${course[0]}/${group[0]}`,
  course: { slug: course[0], name: course[1] },
  group: { slug: group[0], name: group[1] },
  lessons: count,
  first,
});

const ALGORITHMS: [string, string] = ['algorithms', 'Algorithms and data structures'];
const SYSTEM_DESIGN: [string, string] = ['system-design-basics', 'System design basics'];
const INTERVIEW_SKILLS: [string, string] = ['interview-skills', 'Interview skills'];
const NORTHWIND_COURSE: [string, string] = ['interviewing-at-northwind', 'Interviewing at Northwind'];
const LINUX: [string, string] = ['linux-basics', 'Linux basics'];

export const tellingYourStory = lessons(
  INTERVIEW_SKILLS,
  ['telling-your-story', 'Telling a clear story'],
  6,
  'a-story-in-three-parts',
);
export const hashMaps = lessons(ALGORITHMS, ['hash-maps', 'Hash maps'], 9, 'what-a-hash-map-is');
export const graphs = lessons(ALGORITHMS, ['graphs', 'Graphs'], 11, 'what-a-graph-is');
export const dynamicProgramming = lessons(
  ALGORITHMS,
  ['dynamic-programming', 'Dynamic programming'],
  12,
  'overlapping-subproblems',
);
export const thinkingAloud = lessons(INTERVIEW_SKILLS, ['thinking-aloud', 'Thinking aloud'], 5, 'say-what-you-try');
export const scalingAService = lessons(
  SYSTEM_DESIGN,
  ['scaling-a-service', 'Scaling a service'],
  8,
  'one-server-to-many',
);
export const storingData = lessons(SYSTEM_DESIGN, ['storing-data', 'Storing data'], 8, 'picking-a-database');
export const northwindValuesGroup = lessons(
  NORTHWIND_COURSE,
  ['northwind-values', "Northwind's values"],
  6,
  'ownership-in-practice',
);
export const processes = lessons(LINUX, ['processes', 'Processes'], 10, 'what-a-process-is');

const round = (fields: Omit<InterviewRound, 'notes' | 'thin'> & Partial<InterviewRound>): InterviewRound => ({
  notes: null,
  thin: false,
  ...fields,
});

const SENIOR = 'software-engineer/senior';

/** Northwind's senior software engineer: five rounds, the line going on through the decision, the team match and the offer. */
export const northwindSeniorPlan: InterviewPlanPage = {
  ...northwindSeniorSoftwareEngineerCard,
  line: 'The rounds a senior software engineer goes through at Northwind, and what to learn for each.',
  checkedAt: CHECKED_AT,
  rounds: [
    round({
      number: 1,
      kind: 'recruiter_call',
      title: 'Recruiter call',
      count: '1',
      minutes: '30',
      ai: null,
      checks: 'Whether your experience fits the role, and what you expect from it.',
      format: 'A video call.',
      basis: 'official',
      sources: ['o1'],
      key: `${SENIOR}/rounds/1`,
      items: [tellingYourStory],
    }),
    round({
      number: 2,
      kind: 'online_assessment',
      title: 'Online assessment',
      count: '1',
      minutes: '90',
      ai: 'banned',
      checks: 'Whether you solve two problems on your own, in time.',
      format: 'A timed test in the browser. The code runs against tests you do not see.',
      basis: 'both',
      sources: ['o1', 'r1'],
      key: `${SENIOR}/rounds/2`,
      items: [hashMaps],
    }),
    round({
      number: 3,
      kind: 'live_coding',
      title: 'Coding interviews',
      count: '2-3',
      minutes: '45-60',
      ai: 'banned',
      checks: 'Whether you turn a problem into working code and explain your choices as you go.',
      format: 'A shared editor. The code does not run.',
      basis: 'both',
      sources: ['o1', 'r1', 'r2', 'g1'],
      key: `${SENIOR}/rounds/3`,
      items: [graphs, dynamicProgramming, thinkingAloud],
    }),
    round({
      number: 4,
      kind: 'system_design',
      title: 'System design',
      count: '1',
      minutes: '60',
      ai: 'banned',
      checks: 'Whether you set the scope yourself, go deep on a few parts, and reason about running the system.',
      format: 'A video call with a shared drawing.',
      basis: 'reported',
      sources: ['r1', 'r2'],
      key: `${SENIOR}/rounds/4`,
      items: [scalingAService, storingData],
    }),
    round({
      number: 5,
      kind: 'behavioral',
      title: 'Values interview',
      count: '1',
      minutes: '45',
      ai: null,
      checks: 'How you worked with others, told through your own stories.',
      format: null,
      basis: 'reported',
      sources: ['g1'],
      thin: true,
      key: `${SENIOR}/rounds/5`,
      items: [northwindValuesGroup],
    }),
  ],
  after: [
    {
      key: `${SENIOR}/rounds/6`,
      name: 'Hiring committee',
      value: '1 meeting',
      note: 'A group that did not interview you decides, and at which level.',
      basis: 'both',
      sources: ['o1', 'r1'],
    },
    {
      key: 'process/team-matching',
      name: 'Team match',
      value: 'One or two calls with teams that have an opening.',
      note: null,
      basis: 'reported',
      sources: ['r1', 'r2'],
    },
    {
      key: 'process/offer',
      name: 'Offer',
      value: 'A call with the recruiter, then the offer in writing.',
      note: null,
      basis: 'reported',
      sources: ['r1', 'r2'],
    },
  ],
  timeline: {
    key: `${SENIOR}/timeline`,
    name: 'How long it takes',
    value: '4 to 8 weeks',
    note: 'From the first call to the offer.',
    basis: 'reported',
    sources: ['r1', 'r2'],
  },
  sources: northwindSources,
  others: [
    northwindEntrySoftwareEngineerCard,
    northwindMidSoftwareEngineerCard,
    northwindStaffSoftwareEngineerCard,
    northwindMidSeniorSreCard,
    northwindStaffSreCard,
    northwindEngineeringManagerCard,
  ],
};

const SRE = 'site-reliability-engineer/mid-senior';

/** Tallgrass's site reliability engineer: three rounds, a take-home with nothing to prepare with yet, nothing after. */
export const tallgrassSrePlan: InterviewPlanPage = {
  ...tallgrassSreCard,
  line: 'The rounds a site reliability engineer goes through at Tallgrass, and what to learn for each.',
  checkedAt: CHECKED_AT,
  rounds: [
    round({
      number: 1,
      kind: 'recruiter_call',
      title: 'Recruiter call',
      count: '1',
      minutes: '30',
      ai: null,
      checks: 'Whether your experience fits the role.',
      format: 'A video call.',
      basis: 'official',
      sources: ['t1'],
      key: `${SRE}/rounds/1`,
      items: [tellingYourStory],
    }),
    round({
      number: 2,
      kind: 'take_home',
      title: 'Take-home project',
      count: '0-1',
      minutes: null,
      ai: 'allowed',
      checks: 'Whether you fix a small broken service and explain what you changed.',
      format: 'At home, in your own time, within a week.',
      basis: 'both',
      sources: ['t1', 't2'],
      key: `${SRE}/rounds/2`,
      items: [],
    }),
    round({
      number: 3,
      kind: 'technical_interview',
      title: 'Systems interview',
      count: '1',
      minutes: '60',
      ai: 'banned',
      checks: 'How you find the cause of a failure in a running system.',
      format: null,
      basis: 'reported',
      sources: ['t2', 't3'],
      thin: true,
      key: `${SRE}/rounds/3`,
      items: [processes],
    }),
  ],
  after: [],
  timeline: null,
  sources: tallgrassSources,
  others: [],
};
