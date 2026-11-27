import type { InterviewCompanyCard, InterviewPlanCard, InterviewsHome } from '../types';
import { engineeringManager, interviewsHome, northwindCard, softwareEngineer, tallgrassCard } from './companies';

/*
 * Interviews home with many companies: Northwind and Tallgrass, then made-up companies with one plan each, so the
 * page lists the first twelve and the search finds the rest. Their names are made up, as the frame's are.
 */

const MADE_UP = [
  'Ashgrove',
  'Brightwater',
  'Coldharbor',
  'Duskfield',
  'Ember Lane',
  'Foxmere',
  'Greystone',
  'Hollowbrook',
  'Ironvale',
  'Juniper Row',
  'Kestrel Bay',
  'Lowmarsh',
  'Mirelight',
  'Zürich Works',
];

const slugOf = (name: string) =>
  name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');

/** A made-up company with one software engineer plan, and an engineering manager plan for every third. */
const madeUp = (name: string, index: number): InterviewCompanyCard => {
  const company = { slug: slugOf(name), name, logo: index % 2 === 0 };
  const plan = (position = softwareEngineer): InterviewPlanCard => ({
    company,
    slug: position.slug,
    name: position.name,
    position,
    levels: ['mid', 'senior'],
    levelNames: [],
    roundCount: 4,
    lessons: 20 + index,
    projects: 0,
  });
  const plans = index % 3 === 0 ? [plan(), plan(engineeringManager)] : [plan()];
  return { company, otherNames: [], positions: plans.map((one) => one.position), plans };
};

/** Sixteen companies: more than the twelve the page lists first. */
export const interviewsHomeMany: InterviewsHome = {
  companies: [northwindCard, tallgrassCard, ...MADE_UP.map(madeUp)],
  positions: interviewsHome.positions,
  top: [
    northwindCard.company,
    tallgrassCard.company,
    ...MADE_UP.slice(0, 3).map((name, index) => madeUp(name, index).company),
  ],
};

/** Interviews home with one company. */
export const interviewsHomeOne: InterviewsHome = {
  companies: [tallgrassCard],
  positions: tallgrassCard.positions,
  top: [tallgrassCard.company],
};
