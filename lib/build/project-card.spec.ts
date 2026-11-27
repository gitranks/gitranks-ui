import { describe, expect, it } from 'vitest';

import { buildInPart, buildInProgress, buildPythonSecond, buildTestLeft } from './__fixtures__/builds';
import { jsonParserBuiltPlain, webServerBuiltMarked } from './__fixtures__/home';
import { mcpServerCard } from './__fixtures__/projects';
import {
  buildPlaceOf,
  cardPlacesOf,
  minutesWords,
  numberWords,
  numberWordsFirst,
  placeWordsOf,
  projectFactsOf,
} from './project-card';

describe("A project card's words", () => {
  it.each([
    [10, 'about 10 minutes'],
    [30, 'about half an hour'],
    [60, 'about an hour'],
    [90, 'about an hour and a half'],
    [120, 'about two hours'],
    [150, 'about two and a half hours'],
    [180, 'about three hours'],
    [100, 'about an hour and a half'],
  ])('%i minutes read as %s', (minutes, words) => {
    expect(minutesWords(minutes)).toBe(words);
  });

  it('says nothing for no time', () => {
    expect(minutesWords(0)).toBe('');
    expect(minutesWords(Number.NaN)).toBe('');
  });

  it('writes the facts line as the boards do, leaving out what is missing', () => {
    expect(projectFactsOf(mcpServerCard)).toBe('Easy · 16 steps · about an hour and a half');
    expect(projectFactsOf({ level: 3, baseSteps: 24, minutes: 180 })).toBe('Hard · 24 steps · about three hours');
    expect(projectFactsOf({ level: 2, baseSteps: 0, minutes: 0 })).toBe('Medium');
  });

  it('writes small numbers in words and larger ones in digits', () => {
    expect(numberWords(3)).toBe('three');
    expect(numberWordsFirst(3)).toBe('Three');
    expect(numberWordsFirst(14)).toBe('14');
  });
});

describe("A person's place on a card", () => {
  it('is the step, the test left, or Built with its marks', () => {
    expect(buildPlaceOf(buildInProgress)).toEqual({ kind: 'step', number: 9, of: 16 });
    expect(placeWordsOf({ kind: 'step', number: 9, of: 16 })).toBe('Step 9 of 16');
    expect(buildPlaceOf(buildTestLeft)).toEqual({ kind: 'test_left' });
    expect(placeWordsOf({ kind: 'test_left' })).toBe('Every step done, the test is left');
    expect(buildPlaceOf(webServerBuiltMarked)).toEqual({ kind: 'built', marks: ['gold', 'answered'] });
    expect(buildPlaceOf(jsonParserBuiltPlain)).toEqual({ kind: 'built', marks: [] });
  });

  it('keeps Built for a built project with a part in progress', () => {
    expect(buildPlaceOf(buildInPart).kind).toBe('built');
  });

  it('shows the build touched last of two builds of one project', () => {
    const places = cardPlacesOf([buildPythonSecond, buildInProgress]);
    expect(places.get('mcp-server')).toEqual({ kind: 'step', number: 9, of: 16 });
    const older = cardPlacesOf([{ ...buildPythonSecond, lastStepAt: '2026-11-26T10:00:00.000Z' }, buildInProgress]);
    expect(older.get('mcp-server')).toEqual({ kind: 'step', number: 4, of: 16 });
  });
});
