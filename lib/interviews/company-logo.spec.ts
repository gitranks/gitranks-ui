import { describe, expect, it } from 'vitest';

import { northwind, tallgrass } from './__fixtures__/companies';
import {
  COMPANY_LOGO_LOOK,
  COMPANY_LOGO_SIZES,
  companyLetterOf,
  companyLogoSrcOf,
  logoFileSizeOf,
} from './company-logo';

describe("a company's logo", () => {
  it('is drawn at four sizes, each with its corner and letter', () => {
    expect(COMPANY_LOGO_SIZES).toEqual([16, 20, 28, 40]);
    expect(COMPANY_LOGO_LOOK[16]).toEqual({ radius: 3, letter: 9 });
    expect(COMPANY_LOGO_LOOK[40]).toEqual({ radius: 8, letter: 20 });
  });

  it('reads the 64 px file up to 20 px and the 128 px file above', () => {
    expect(logoFileSizeOf(16)).toBe(64);
    expect(logoFileSizeOf(20)).toBe(64);
    expect(logoFileSizeOf(28)).toBe(128);
    expect(logoFileSizeOf(40)).toBe(128);
    expect(companyLogoSrcOf(northwind, 20)).toBe('/interviews/northwind/logo-64.png');
    expect(companyLogoSrcOf(northwind, 40)).toBe('/interviews/northwind/logo-128.png');
  });

  it('draws the first letter or digit of the name, in capitals, for a company with no logo', () => {
    expect(companyLogoSrcOf(tallgrass, 28)).toBeNull();
    expect(companyLetterOf('Tallgrass')).toBe('T');
    expect(companyLetterOf('  northwind')).toBe('N');
    expect(companyLetterOf('(ünter)')).toBe('Ü');
    expect(companyLetterOf('42 labs')).toBe('4');
    expect(companyLetterOf('...')).toBe('?');
  });
});
