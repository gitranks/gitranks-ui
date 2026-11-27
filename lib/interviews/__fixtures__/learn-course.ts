import type { InterviewCompanyRef, InterviewsForCourse } from '../types';
import { northwind, tallgrass } from './companies';
import { forNorthwindCourse } from './learn';

/*
 * What Learn's algorithms course (the one Learn's fixtures draw: Big-O, Arrays and strings, Hash maps and sets, Trees,
 * Graphs, Sorting and searching, ...) and its lessons show of Interviews, in every case the boards draw: a group asked
 * at one, two, three and seven companies, one the companies list on their own pages, one nobody reports, and ten
 * companies whose plans use the course. Besides Northwind and Tallgrass the companies are made up and numbered.
 */

/** A made-up company of the list: "Company 3", `company-3`, with a logo on the even ones. */
export const numberedCompany = (n: number): InterviewCompanyRef => ({
  slug: `company-${n}`,
  name: `Company ${n}`,
  logo: n % 2 === 0,
});

/** Ten companies: Northwind, Tallgrass, then Company 3 to Company 10. */
export const tenCompanies: InterviewCompanyRef[] = [
  northwind,
  tallgrass,
  ...[3, 4, 5, 6, 7, 8, 9, 10].map(numberedCompany),
];

/** The algorithms course: ten companies' plans use it, and five of its groups are asked. */
export const forAlgorithmsCourse: InterviewsForCourse = {
  companies: tenCompanies,
  groups: [
    {
      group: 'arrays-and-strings',
      topic: 'arrays and strings',
      companies: tenCompanies.slice(0, 7),
      basis: 'reported',
    },
    { group: 'hash-maps-and-sets', topic: 'hash maps', companies: tenCompanies.slice(0, 4), basis: 'both' },
    { group: 'trees', topic: 'trees', companies: tenCompanies.slice(0, 3), basis: 'reported' },
    { group: 'graphs', topic: 'graphs', companies: [northwind, tallgrass], basis: 'both' },
    { group: 'sorting-and-searching', topic: 'sorting', companies: [tallgrass], basis: 'reported' },
    { group: 'big-o', topic: 'complexity', companies: [northwind, tallgrass], basis: 'official' },
  ],
  own: null,
};

/** The same course used by one company's plans alone. */
export const forAlgorithmsOneCompany: InterviewsForCourse = { ...forAlgorithmsCourse, companies: [tallgrass] };

/** Northwind's own course: its plans, the day its facts were checked. */
export { forNorthwindCourse };
