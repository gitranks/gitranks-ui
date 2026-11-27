import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { companyCardResponse, interviewsCardResponse, planCardResponse } = await import('./card-response');
const { interviewsHome, LOGO_PNG_BASE64, northwindPage, tallgrassPage } = await import(
  '@/lib/interviews/__fixtures__/companies'
);
const { northwindSeniorPlan, tallgrassSrePlan } = await import('@/lib/interviews/__fixtures__/plans');
const { companyCardVersionOf, interviewsCardVersionOf, planCardVersionOf } = await import(
  '@/lib/interviews/share-card'
);

/** A PNG's width and height, from its header. */
const sizeOf = (png: Uint8Array) => {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
};

const logosOf = vi.fn(async (companies: readonly { slug: string; logo: boolean }[], _size: number) => {
  return new Map(companies.map((one) => [one.slug, one.logo ? LOGO_PNG_BASE64 : null]));
});
const drawn = vi.fn(async () => new Uint8Array([1, 2, 3]));
const HOME = `?v=${interviewsCardVersionOf(interviewsHome)}`;
const COMPANY = `?v=${companyCardVersionOf(northwindPage)}`;
const PLAN = `?v=${planCardVersionOf(northwindSeniorPlan)}`;
const liveCompany = async () => ({ kind: 'live' as const, page: northwindPage });
const livePlan = async () => ({ kind: 'live' as const, page: northwindSeniorPlan });

describe("Interviews' pictures, as answered", () => {
  it('are drawn at 1200 × 630: Interviews, a company with a logo, one without, a plan, a long plan', async () => {
    const long = { ...tallgrassSrePlan, name: 'Site reliability engineer, mid level and senior '.repeat(3) };
    const responses = {
      home: await interviewsCardResponse(HOME, async () => interviewsHome, logosOf),
      company: await companyCardResponse(COMPANY, liveCompany, logosOf),
      letter: await companyCardResponse(
        `?v=${companyCardVersionOf(tallgrassPage)}`,
        async () => ({ kind: 'live' as const, page: tallgrassPage }),
        logosOf,
      ),
      plan: await planCardResponse(PLAN, livePlan, logosOf),
      long: await planCardResponse(
        `?v=${planCardVersionOf(long)}`,
        async () => ({ kind: 'live' as const, page: long }),
        logosOf,
      ),
    };
    for (const [name, response] of Object.entries(responses)) {
      expect(response.status, name).toBe(200);
      expect(response.headers.get('content-type'), name).toBe('image/png');
      expect(sizeOf(new Uint8Array(await response.arrayBuffer())), name).toEqual({ width: 1200, height: 630 });
    }
  }, 60_000);

  it('asks for the top five’s 128 px logos, and a company’s or a plan’s 256 px one', async () => {
    logosOf.mockClear();
    await interviewsCardResponse(HOME, async () => interviewsHome, logosOf, drawn);
    await companyCardResponse(COMPANY, liveCompany, logosOf, drawn);
    await planCardResponse(PLAN, livePlan, logosOf, drawn);
    expect(logosOf.mock.calls.map(([companies, size]) => [companies.map((one) => one.slug), size])).toEqual([
      [interviewsHome.top.map((one) => one.slug), 128],
      [['northwind'], 256],
      [['northwind'], 256],
    ]);
  });

  it('is kept by no one while Interviews is not open to everyone', async () => {
    for (const response of [
      await interviewsCardResponse(HOME, async () => interviewsHome, logosOf, drawn),
      await companyCardResponse(COMPANY, liveCompany, logosOf, drawn),
      await planCardResponse(PLAN, livePlan, logosOf, drawn),
    ]) {
      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toBe('private, no-store');
    }
  });

  it('sends any other query to its current address, kept nowhere, so no query draws it again', async () => {
    drawn.mockClear();
    for (const search of ['', '?v=', '?v=old', `${PLAN}&x=1`]) {
      const home = await interviewsCardResponse(search, async () => interviewsHome, logosOf, drawn);
      expect([home.status, home.headers.get('location')]).toEqual([308, `/interviews/card.png${HOME}`]);
      const company = await companyCardResponse(search, liveCompany, logosOf, drawn);
      expect([company.status, company.headers.get('location')]).toEqual([
        308,
        `/interviews/northwind/card.png${COMPANY}`,
      ]);
      const plan = await planCardResponse(search, livePlan, logosOf, drawn);
      expect([plan.status, plan.headers.get('location')]).toEqual([
        308,
        `/interviews/northwind/senior-software-engineer/card.png${PLAN}`,
      ]);
      expect(plan.headers.get('cache-control')).toBe('private, no-store');
    }
    expect(drawn).not.toHaveBeenCalled();
  });

  it("follows the page's state: moved to the new picture, gone 410, missing 404, a failed read 503", async () => {
    const moved = await planCardResponse(
      PLAN,
      async () => ({ kind: 'moved' as const, path: '/interviews/northwind/senior-engineer' as never }),
      logosOf,
      drawn,
    );
    expect([moved.status, moved.headers.get('location')]).toEqual([
      308,
      '/interviews/northwind/senior-engineer/card.png',
    ]);
    const gone = await companyCardResponse(COMPANY, async () => ({ kind: 'gone' as const }), logosOf, drawn);
    const missing = await companyCardResponse(COMPANY, async () => ({ kind: 'missing' as const }), logosOf, drawn);
    const failed = await planCardResponse(
      PLAN,
      async () => {
        throw new Error('down');
      },
      logosOf,
      drawn,
    );
    expect([gone.status, missing.status, failed.status]).toEqual([410, 404, 503]);
  });

  it('answers 503 when the picture cannot be drawn or the home cannot be read', async () => {
    const broken = vi.fn(async (): Promise<Uint8Array<ArrayBuffer>> => {
      throw new Error('draw');
    });
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await companyCardResponse(COMPANY, liveCompany, logosOf, broken)).status).toBe(503);
    quiet.mockRestore();
    const home = await interviewsCardResponse(
      HOME,
      async () => {
        throw new Error('down');
      },
      logosOf,
      drawn,
    );
    expect([home.status, home.headers.get('cache-control')]).toEqual([503, 'private, no-store']);
  });

  it('answers 503, kept by no one, when a logo the read promises cannot be read, rather than draw the letter', async () => {
    const unread = vi.fn(async (companies: readonly { slug: string }[], _size: number) => {
      return new Map(companies.map((one) => [one.slug, null]));
    });
    drawn.mockClear();
    const answers = [
      await interviewsCardResponse(HOME, async () => interviewsHome, unread, drawn),
      await companyCardResponse(COMPANY, liveCompany, unread, drawn),
      await planCardResponse(PLAN, livePlan, unread, drawn),
    ];
    for (const answer of answers) {
      expect([answer.status, answer.headers.get('cache-control')]).toEqual([503, 'private, no-store']);
      expect(answer.headers.get('retry-after')).toBe('60');
    }
    expect(drawn).not.toHaveBeenCalled();
    // A company with no logo draws its letter, as before.
    const letter = await companyCardResponse(
      `?v=${companyCardVersionOf(tallgrassPage)}`,
      async () => ({ kind: 'live' as const, page: tallgrassPage }),
      unread,
      drawn,
    );
    expect(letter.status).toBe(200);
  });
});
