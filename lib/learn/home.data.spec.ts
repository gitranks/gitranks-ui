import { print } from 'graphql';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect } = vi.hoisted(() => ({ graphqlDirect: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));

const { loadLearnHome } = await import('./home.data');
const { homeDay, homeNoCourses } = await import('./__fixtures__/learn-home-page');

beforeEach(() => {
  graphqlDirect.mockReset();
});

describe("reading a person's Learn home", () => {
  it("reads it for the person, from the page's server, with every field the page draws", async () => {
    graphqlDirect.mockResolvedValueOnce({ learnHome: homeDay });
    expect(await loadLearnHome('octocat')).toEqual(homeDay);
    const [document, variables, options] = graphqlDirect.mock.calls[0];
    expect(variables).toBeUndefined();
    expect(options).toEqual({ source: 'ssr', githubLogin: 'octocat' });
    const query = print(document);
    for (const field of ['highlight', 'nextCourse', 'nextReviewAt', 'otherCourses', 'suggested', 'reason']) {
      expect(query, field).toContain(field);
    }
  });

  it('reads an answer without the newer fields as empty parts', async () => {
    graphqlDirect.mockResolvedValueOnce({ learnHome: { due: 0 } });
    expect(await loadLearnHome('octocat')).toEqual(homeNoCourses);
  });

  it('has no home when the API answers none, or fails', async () => {
    graphqlDirect.mockResolvedValueOnce({ learnHome: null });
    expect(await loadLearnHome('octocat')).toBeNull();
    graphqlDirect.mockRejectedValueOnce(new Error('Cannot query field "suggested" on type "LearnHome".'));
    expect(await loadLearnHome('octocat')).toBeNull();
  });
});
