import { describe, expect, it, vi } from 'vitest';

import { interviewsHome, northwindPage } from './__fixtures__/companies';
import { northwindSeniorPlan } from './__fixtures__/plans';
import { interviewCompanyMetadata } from './company-seo';
import { interviewsHomeMetadataOf } from './home-seo';
import { INTERVIEWS_MINE_METADATA, interviewsAboutMetadataOf } from './mine-about-seo';
import { interviewPlanMetadata } from './plan-seo';
import { companyCardUrlOf, interviewsCardUrlOf, planCardUrlOf } from './share-card';

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_URI = 'https://example.test';
});

const NOINDEX = { index: false, follow: false };

/** The picture a page's link preview shows, on both the Open Graph and the X card. */
function expectPicture(metadata: ReturnType<typeof interviewCompanyMetadata>, picture: string, alt: string) {
  const images = [{ url: `https://example.test${picture}`, width: 1200, height: 630, alt }];
  expect(metadata.openGraph?.images).toEqual(images);
  expect(metadata.twitter).toMatchObject({ card: 'summary_large_image', images });
}

describe("Interviews' pages in a link preview", () => {
  it("a company's: its picture, its Markdown copy, its own address kept, not indexed while closed", () => {
    const metadata = interviewCompanyMetadata(northwindPage);
    expectPicture(metadata, companyCardUrlOf(northwindPage), 'Northwind interviews');
    expect(metadata.alternates).toMatchObject({
      canonical: '/interviews/northwind',
      types: { 'text/markdown': '/interviews/northwind.md' },
    });
    expect(metadata.robots).toEqual(NOINDEX);
  });

  it("a plan's: its picture, its Markdown copy, its own address kept, not indexed while closed", () => {
    const metadata = interviewPlanMetadata(northwindSeniorPlan);
    expectPicture(metadata, planCardUrlOf(northwindSeniorPlan), 'Northwind · Senior software engineer');
    expect(metadata.alternates).toMatchObject({
      canonical: '/interviews/northwind/senior-software-engineer',
      types: { 'text/markdown': '/interviews/northwind/senior-software-engineer.md' },
    });
    expect(metadata.robots).toEqual(NOINDEX);
    expect(interviewPlanMetadata(northwindSeniorPlan, true).openGraph?.images).toEqual(metadata.openGraph?.images);
  });

  it("Interviews home: Interviews' picture and the home's Markdown copy, not indexed while closed", () => {
    const metadata = interviewsHomeMetadataOf(interviewsHome);
    expectPicture(metadata, interviewsCardUrlOf(interviewsHome), 'Prepare for the interview at the company you want');
    expect(metadata.alternates).toMatchObject({
      canonical: '/interviews',
      types: { 'text/markdown': '/interviews.md' },
    });
    expect(metadata.robots).toEqual(NOINDEX);
  });

  it("How it works: Interviews' picture, no Markdown copy; My interviews: no picture at all", () => {
    const metadata = interviewsAboutMetadataOf(interviewsHome);
    expectPicture(metadata, interviewsCardUrlOf(interviewsHome), 'Prepare for the interview at the company you want');
    expect(metadata.alternates).toEqual({ canonical: '/interviews/about' });
    expect(metadata.robots).toEqual(NOINDEX);
    expect(INTERVIEWS_MINE_METADATA.openGraph?.images).toBeUndefined();
    expect(INTERVIEWS_MINE_METADATA.robots).toEqual(NOINDEX);
  });
});
