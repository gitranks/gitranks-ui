import { isValidElement, type ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadInterviewCompany, loadInterviewAddress, notFound, permanentRedirect } = vi.hoisted(() => ({
  loadInterviewCompany: vi.fn(),
  loadInterviewAddress: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  permanentRedirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT ${path}`);
  }),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ notFound, permanentRedirect }));
vi.mock('@/lib/interviews/company.data', () => ({ loadInterviewCompany }));
vi.mock('@/lib/interviews/address.data', () => ({ loadInterviewAddress }));
vi.mock('@/components/interviews/company/company-live', () => ({ CompanyLive: () => null }));

const { default: InterviewCompanyPage, generateMetadata, generateStaticParams } = await import('./page');
const { CompanyLive } = await import('@/components/interviews/company/company-live');
const { northwindPage } = await import('@/lib/interviews/__fixtures__/companies');

const props = (company: string) =>
  ({ params: Promise.resolve({ company }) }) as unknown as PageProps<'/interviews/[company]'>;

beforeEach(() => {
  loadInterviewCompany.mockReset();
  loadInterviewAddress.mockReset();
});

describe("a company's page", () => {
  it('draws the cached company, asking nothing about its address', async () => {
    loadInterviewCompany.mockResolvedValue(northwindPage);
    const page = (await InterviewCompanyPage(props('northwind'))) as ReactElement;
    expect(isValidElement(page)).toBe(true);
    expect(page.type).toBe(CompanyLive);
    expect(page.props).toEqual({ page: northwindPage });
    expect(loadInterviewCompany).toHaveBeenCalledWith('northwind');
    expect(loadInterviewAddress).not.toHaveBeenCalled();
  });

  it('sends a moved address to its new page', async () => {
    loadInterviewCompany.mockResolvedValue(null);
    loadInterviewAddress.mockResolvedValue({ state: 'moved', to: 'northwind-labs' });
    await expect(InterviewCompanyPage(props('northwind'))).rejects.toThrow('NEXT_REDIRECT /interviews/northwind-labs');
    expect(loadInterviewAddress).toHaveBeenCalledWith('northwind', null);
  });

  it.each([
    ['gone', { state: 'gone', to: null }],
    ['missing', { state: 'missing', to: null }],
    ['moved off the site', { state: 'moved', to: 'https://example.com' }],
    ['unknown, on a failed read', null],
  ])('answers the not-found page for an address %s', async (_name, address) => {
    loadInterviewCompany.mockResolvedValue(null);
    loadInterviewAddress.mockResolvedValue(address);
    await expect(InterviewCompanyPage(props('northwind'))).rejects.toThrow('NEXT_NOT_FOUND');
    expect(permanentRedirect).not.toHaveBeenCalled();
  });

  it('names the company in its metadata, never indexed while Interviews is not open to everyone', async () => {
    loadInterviewCompany.mockResolvedValueOnce(northwindPage);
    const live = await generateMetadata(props('northwind'));
    expect(live.title).toBe('Northwind interviews: plans for each position');
    expect(live.description).toBe(
      'How Northwind interviews engineers, and a plan to prepare for each position. Not an official Northwind page.',
    );
    expect(live.alternates?.canonical).toBe('/interviews/northwind');
    expect(live.robots).toEqual({ index: false, follow: false });
    loadInterviewCompany.mockResolvedValueOnce(null);
    const missing = await generateMetadata(props('nope'));
    expect(missing.title).toBe('Company not found');
    expect(missing.robots).toEqual({ index: false, follow: false });
  });

  it('lists one address no company can have when the site is built', async () => {
    expect(await generateStaticParams()).toEqual([{ company: '_' }]);
  });
});
