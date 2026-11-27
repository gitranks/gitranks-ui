import { describe, expect, it } from 'vitest';

import {
  engineeringManager,
  interviewsHome,
  northwind,
  northwindCard,
  northwindEngineeringManagerCard,
  northwindMidSeniorSreCard,
  northwindStaffSreCard,
  siteReliabilityEngineer,
  softwareEngineer,
  tallgrass,
  tallgrassSreCard,
} from './__fixtures__/companies';
import { interviewsHomeMany } from './__fixtures__/home';
import {
  chooseHomeTag,
  dropHomeTag,
  type HomeChosen,
  homeAddressQueryOf,
  homeChosenOfAddress,
  homeFieldLineOf,
  homeListOf,
  homeNothingOf,
  homeSuggestionsOf,
  lowerFirst,
  NOTHING_CHOSEN,
  positionInTextOf,
  suggestionLineOf,
  wordStartOf,
} from './home-search';

const sre: HomeChosen = { position: siteReliabilityEngineer, company: null };
const names = (home = interviewsHome, query = '', chosen = NOTHING_CHOSEN) =>
  homeSuggestionsOf(home, query, chosen).map((one) =>
    one.tag.kind === 'company' ? `company:${one.tag.company.slug}` : `position:${one.tag.position.slug}`,
  );

describe('wordStartOf', () => {
  it('finds typed letters at the start of a word, capital letters and accents ignored', () => {
    expect(wordStartOf('Northwind', 'nor')).toEqual({ start: 0, end: 3 });
    expect(wordStartOf('Site reliability engineer', 'REL')).toEqual({ start: 5, end: 8 });
    expect(wordStartOf('Zürich Works', 'zur')).toEqual({ start: 0, end: 3 });
    expect(wordStartOf('Zurich Works', 'zür')).toEqual({ start: 0, end: 3 });
  });

  it('finds nothing inside a word, and nothing for nothing typed', () => {
    expect(wordStartOf('Northwind', 'wind')).toBeNull();
    expect(wordStartOf('Northwind', '  ')).toBeNull();
  });
});

describe('homeSuggestionsOf', () => {
  it('offers nothing for nothing typed', () => {
    expect(homeSuggestionsOf(interviewsHome, ' ', NOTHING_CHOSEN)).toEqual([]);
  });

  it('offers companies by name and by other names, then positions, each with its plans', () => {
    expect(names(interviewsHome, 'north')).toEqual(['company:northwind']);
    expect(names(interviewsHome, 'labs')).toEqual(['company:northwind']);
    expect(names(interviewsHome, 'TALL')).toEqual(['company:tallgrass']);
    expect(names(interviewsHome, 'engineer')).toEqual([
      'position:software-engineer',
      'position:site-reliability-engineer',
      'position:engineering-manager',
    ]);
    expect(names(interviewsHome, 'gineer')).toEqual([]);
    expect(names(interviewsHome, 'site')).toEqual(['position:site-reliability-engineer']);
    expect(names(interviewsHome, 's')).toEqual(['position:software-engineer', 'position:site-reliability-engineer']);
  });

  it('marks the typed letters in the name, and counts plans and companies', () => {
    const [company] = homeSuggestionsOf(interviewsHome, 'nor', NOTHING_CHOSEN);
    expect(company.name).toEqual({ before: '', mark: 'Nor', after: 'thwind' });
    expect(company.plans).toBe(7);
    expect(suggestionLineOf(company)).toBe('company · 7 plans');
    const [position] = homeSuggestionsOf(interviewsHome, 'site', NOTHING_CHOSEN);
    expect(position.plans).toBe(3);
    expect(position.companies).toBe(2);
    expect(suggestionLineOf(position)).toBe('position · 3 plans at 2 companies');
    const [manager] = homeSuggestionsOf(interviewsHome, 'manager', NOTHING_CHOSEN);
    expect(manager.name).toEqual({ before: 'Engineering ', mark: 'manager', after: '' });
    expect(suggestionLineOf(manager)).toBe('position · 1 plan at 1 company');
  });

  it('with a position chosen, offers only companies with a plan for it, counted for it', () => {
    const chosen = { position: engineeringManager, company: null };
    expect(names(interviewsHome, 't', chosen)).toEqual([]);
    const [company] = homeSuggestionsOf(interviewsHome, 'n', chosen);
    expect(company.tag).toEqual({ kind: 'company', company: northwind });
    expect(company.plans).toBe(1);
  });

  it('never offers a chosen tag again', () => {
    expect(names(interviewsHome, 'site', sre)).toEqual([]);
    expect(names(interviewsHome, 'tall', { position: siteReliabilityEngineer, company: tallgrass })).toEqual([]);
  });

  it('with a company chosen, offers only the positions it has plans for', () => {
    const chosen = { position: siteReliabilityEngineer, company: tallgrass };
    expect(names(interviewsHome, 's', chosen)).toEqual([]);
    const northwindChosen = { position: siteReliabilityEngineer, company: northwind };
    expect(names(interviewsHome, 's', northwindChosen)).toEqual(['position:software-engineer']);
  });

  it('keeps room for positions when many companies are found, eight at the most', () => {
    const tallgrassCompany = interviewsHome.companies[1];
    const many = {
      ...interviewsHome,
      companies: Array.from({ length: 10 }, (_, index) => ({
        ...tallgrassCompany,
        company: { ...tallgrassCompany.company, slug: `site-${index}`, name: `Site Works ${index}` },
      })),
    };
    const found = homeSuggestionsOf(many, 'site', NOTHING_CHOSEN);
    expect(found.map((one) => one.tag.kind)).toEqual([...Array(7).fill('company'), 'position']);
    expect(homeFieldLineOf(many, 'site', NOTHING_CHOSEN)).toBe('10 companies · 1 position');
  });

  it('finds a company past the first twelve', () => {
    expect(names(interviewsHomeMany, 'zur')).toEqual(['company:zurich-works']);
  });
});

describe('chooseHomeTag and dropHomeTag', () => {
  it('opens a company chosen alone', () => {
    expect(chooseHomeTag(NOTHING_CHOSEN, { kind: 'company', company: tallgrass })).toEqual({
      open: tallgrass,
      chosen: NOTHING_CHOSEN,
    });
  });

  it('keeps a position as a chip, and a company beside it as a second chip', () => {
    const first = chooseHomeTag(NOTHING_CHOSEN, { kind: 'position', position: siteReliabilityEngineer });
    expect(first).toEqual({ open: null, chosen: sre });
    const second = chooseHomeTag(first.chosen, { kind: 'company', company: tallgrass });
    expect(second).toEqual({ open: null, chosen: { position: siteReliabilityEngineer, company: tallgrass } });
  });

  it('puts a new position in place of the one before', () => {
    expect(chooseHomeTag(sre, { kind: 'position', position: softwareEngineer }).chosen).toEqual({
      position: softwareEngineer,
      company: null,
    });
  });

  it('takes one chip out', () => {
    const both = { position: siteReliabilityEngineer, company: tallgrass };
    expect(dropHomeTag(both, 'company')).toEqual(sre);
    expect(dropHomeTag(both, 'position')).toEqual({ position: null, company: tallgrass });
  });
});

describe('homeListOf', () => {
  it('is the companies with nothing chosen', () => {
    expect(homeListOf(interviewsHome, NOTHING_CHOSEN)).toEqual({
      kind: 'companies',
      companies: interviewsHome.companies,
      hidden: 0,
    });
  });

  it('lists the first twelve of many, in the read’s order, and all of them on asking', () => {
    const list = homeListOf(interviewsHomeMany, NOTHING_CHOSEN);
    expect(list.kind === 'companies' && list.companies.map((card) => card.company.slug)).toEqual(
      interviewsHomeMany.companies.slice(0, 12).map((card) => card.company.slug),
    );
    expect(list.kind === 'companies' && list.hidden).toBe(4);
    const all = homeListOf(interviewsHomeMany, NOTHING_CHOSEN, true);
    expect(all.kind === 'companies' && [all.companies.length, all.hidden]).toEqual([16, 0]);
  });

  it('turns into the plans for a position across companies', () => {
    expect(homeListOf(interviewsHome, sre)).toEqual({
      kind: 'plans',
      title: 'Plans for a site reliability engineer',
      plans: [northwindMidSeniorSreCard, northwindStaffSreCard, tallgrassSreCard],
    });
    expect(homeListOf(interviewsHome, { position: engineeringManager, company: null })).toEqual({
      kind: 'plans',
      title: 'Plans for an engineering manager',
      plans: [northwindEngineeringManagerCard],
    });
  });

  it('narrows to one company with a company chip beside the position', () => {
    expect(homeListOf(interviewsHome, { position: siteReliabilityEngineer, company: tallgrass })).toEqual({
      kind: 'plans',
      title: 'Plans for a site reliability engineer at Tallgrass',
      plans: [tallgrassSreCard],
    });
    expect(homeListOf(interviewsHome, { position: null, company: northwind })).toEqual({
      kind: 'plans',
      title: 'Plans at Northwind',
      plans: northwindCard.plans,
    });
  });
});

describe('homeFieldLineOf', () => {
  it('says what the letters found while typing, never a zero', () => {
    expect(homeFieldLineOf(interviewsHome, 'north', NOTHING_CHOSEN)).toBe('1 company');
    expect(homeFieldLineOf(interviewsHome, 's', NOTHING_CHOSEN)).toBe('2 positions');
    expect(homeFieldLineOf(interviewsHomeMany, 'e', NOTHING_CHOSEN)).toBe('1 company · 3 positions');
    expect(homeFieldLineOf(interviewsHome, 'acme', NOTHING_CHOSEN)).toBe('No company or position');
  });

  it('says how many plans the chips keep', () => {
    expect(homeFieldLineOf(interviewsHome, '', sre)).toBe('3 plans at 2 companies');
    expect(homeFieldLineOf(interviewsHome, '', { position: engineeringManager, company: null })).toBe(
      '1 plan at 1 company',
    );
    expect(homeFieldLineOf(interviewsHome, '', { position: siteReliabilityEngineer, company: tallgrass })).toBe(
      '1 plan',
    );
  });

  it('says nothing with nothing typed and nothing chosen', () => {
    expect(homeFieldLineOf(interviewsHome, '', NOTHING_CHOSEN)).toBe('');
  });

  it('never draws a zero for any letter typed or any chip', () => {
    const chips: HomeChosen[] = [NOTHING_CHOSEN, sre, { position: siteReliabilityEngineer, company: tallgrass }];
    for (const chosen of chips) {
      for (const query of ['', 'a', 'n', 's', 'e', 'zz', 'manager']) {
        expect(homeFieldLineOf(interviewsHomeMany, query, chosen)).not.toMatch(/\b0\b/);
        for (const one of homeSuggestionsOf(interviewsHomeMany, query, chosen)) {
          expect(suggestionLineOf(one)).not.toMatch(/\b0\b/);
        }
      }
    }
  });
});

describe('homeNothingOf', () => {
  it('says the company has no plan yet when the letters find nothing at all', () => {
    expect(homeNothingOf(interviewsHome, ' acme ', sre)).toBe(
      'No plan for “acme” yet. A company gets its plans when public sources describe its interviews well enough.',
    );
  });

  it('says what is missing for the chips when the letters would find something without them', () => {
    expect(homeNothingOf(interviewsHome, 'tall', { position: engineeringManager, company: null })).toBe(
      'No plan for an engineering manager matches “tall”.',
    );
    expect(homeNothingOf(interviewsHome, 'soft', { position: siteReliabilityEngineer, company: tallgrass })).toBe(
      'No plan for a site reliability engineer at Tallgrass matches “soft”.',
    );
  });
});

describe('the address', () => {
  it('keeps the chosen position, and only one the home has', () => {
    expect(homeAddressQueryOf(sre)).toBe('?position=site-reliability-engineer');
    expect(homeAddressQueryOf({ position: siteReliabilityEngineer, company: tallgrass })).toBe(
      '?position=site-reliability-engineer',
    );
    expect(homeAddressQueryOf(NOTHING_CHOSEN)).toBe('');
    expect(homeChosenOfAddress(interviewsHome, '?position=site-reliability-engineer')).toEqual(sre);
    expect(homeChosenOfAddress(interviewsHome, '?position=data-engineer')).toEqual(NOTHING_CHOSEN);
    expect(homeChosenOfAddress(interviewsHome, '')).toEqual(NOTHING_CHOSEN);
  });
});

describe('words', () => {
  it('writes a position in running text with its article', () => {
    expect(positionInTextOf(siteReliabilityEngineer)).toBe('a site reliability engineer');
    expect(positionInTextOf(engineeringManager)).toBe('an engineering manager');
    expect(lowerFirst('AI engineer')).toBe('AI engineer');
  });
});
