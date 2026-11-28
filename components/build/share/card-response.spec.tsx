import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { homeCardResponse, projectCardResponse, stepCardResponse } = await import('./card-response');
const { mcpServerProject } = await import('@/lib/build/__fixtures__/project');
const { listTheToolsStep } = await import('@/lib/build/__fixtures__/step');
const { BUILD_HOME_CARD_URL, personCardUrlOf, projectCardUrlOf, stepCardUrlOf } = await import(
  '@/lib/build/share-card'
);
type Row = import('@/lib/build/share-card').BuildSharedRow;

/** A PNG's width and height, from its header. */
const sizeOf = (png: Uint8Array) => {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
};

const row: Row = {
  project: 'mcp-server',
  thing: 'an MCP server',
  languages: ['typescript'],
  steps: 16,
  builtAt: '2026-11-26T10:00:00Z',
  gold: true,
};
const queryOf = (url: string) => url.slice(url.indexOf('?'));
const project = async () => mcpServerProject;
const builtOf = vi.fn(async () => ({ value: [row], failed: false }));
const nobody = async () => ({ value: [], failed: false });
const drawn = vi.fn(async () => new Uint8Array([1, 2, 3]));

describe("Build's pictures, as answered", () => {
  it('are drawn at 1200 × 630: a person, a project, a step and Build', async () => {
    const responses = {
      person: await projectCardResponse(
        queryOf(personCardUrlOf(mcpServerProject, 'octocat', row)),
        'octocat',
        project,
        builtOf,
      ),
      project: await projectCardResponse(queryOf(projectCardUrlOf(mcpServerProject)), null, project, nobody),
      step: await stepCardResponse(queryOf(stepCardUrlOf(listTheToolsStep)), async () => listTheToolsStep),
      home: await homeCardResponse(queryOf(BUILD_HOME_CARD_URL)),
    };
    for (const [name, response] of Object.entries(responses)) {
      expect(response.status, name).toBe(200);
      expect(response.headers.get('content-type'), name).toBe('image/png');
      expect(sizeOf(new Uint8Array(await response.arrayBuffer())), name).toEqual({ width: 1200, height: 630 });
    }
  }, 30_000);

  it("draw a person's build only when their public page lists the project as built", async () => {
    const person = queryOf(personCardUrlOf(mcpServerProject, 'octocat', row));
    const yes = await projectCardResponse(person, 'octocat', project, builtOf, drawn);
    expect(yes.status).toBe(200);
    // Not built there: the project's own picture, at its own address.
    const no = await projectCardResponse(person, 'octocat', project, nobody, drawn);
    expect(no.status).toBe(308);
    expect(no.headers.get('location')).toBe(projectCardUrlOf(mcpServerProject));
    // A login of no login's shape is not read.
    builtOf.mockClear();
    const odd = await projectCardResponse('?by=a%20b', 'a b', project, builtOf, drawn);
    expect(builtOf).not.toHaveBeenCalled();
    expect(odd.headers.get('location')).toBe(projectCardUrlOf(mcpServerProject));
  });

  it('send any other query to the current address, and draw nothing for it', async () => {
    drawn.mockClear();
    const old = await projectCardResponse('?by=octocat&v=old', 'octocat', project, builtOf, drawn);
    expect(old.status).toBe(308);
    expect(old.headers.get('location')).toBe(personCardUrlOf(mcpServerProject, 'octocat', row));
    expect(old.headers.get('cache-control')).toBe('private, no-store');
    expect((await homeCardResponse('', drawn)).headers.get('location')).toBe(BUILD_HOME_CARD_URL);
    expect(drawn).not.toHaveBeenCalled();
  });

  it('answer 404 for no project or step, and 503 for a read that failed', async () => {
    expect((await projectCardResponse('', null, async () => null, nobody, drawn)).status).toBe(404);
    expect((await stepCardResponse('', async () => null, drawn)).status).toBe(404);
    const failed = await projectCardResponse(
      '?by=octocat&v=x',
      'octocat',
      project,
      async () => ({ value: [], failed: true }),
      drawn,
    );
    expect(failed.status).toBe(503);
    expect(failed.headers.get('retry-after')).toBe('60');
  });

  it('are kept as Learn keeps its pictures: five minutes in a browser, ten in a shared cache', async () => {
    const response = await homeCardResponse(queryOf(BUILD_HOME_CARD_URL), drawn);
    expect(response.headers.get('cache-control')).toBe('public, max-age=300');
    expect(response.headers.get('cloudflare-cdn-cache-control')).toBe('max-age=600');
  });
});
