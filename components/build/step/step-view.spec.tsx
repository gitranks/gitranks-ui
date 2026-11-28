// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    prefetch: _prefetch,
    ref,
    ...rest
  }: {
    href: string;
    children?: ReactNode;
    prefetch?: unknown;
    ref?: React.Ref<HTMLAnchorElement>;
  }) => (
    <a href={href} ref={ref} {...rest}>
      {children}
    </a>
  ),
}));
const hint = vi.hoisted(() => ({ present: false }));
vi.mock('@/lib/session-hint', () => ({ hasSessionHint: () => hint.present }));

const { BuildStepView } = await import('./step-view');
const { BuildStepLive } = await import('./step-live');
const { BUILD_LANGUAGE_KEY } = await import('@/lib/build/use-build-language');
const { listTheToolsStep } = await import('@/lib/build/__fixtures__/step');
const cases = await import('@/lib/build/__fixtures__/step-cases');
const { mcpServerProject } = await import('@/lib/build/__fixtures__/project');
const builds = await import('@/lib/build/__fixtures__/builds');

type ViewProps = Parameters<typeof BuildStepView>[0];

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
  window.localStorage.clear();
  hint.present = false;
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

async function draw(props: Partial<ViewProps> = {}) {
  await act(async () => {
    root.render(
      <BuildStepView
        page={listTheToolsStep}
        project={mcpServerProject}
        codes={[]}
        questionCodes={[]}
        personal={null}
        {...props}
      />,
    );
  });
}

const $ = <T extends Element = HTMLElement>(selector: string) => host.querySelector<T>(selector);
const $$ = (selector: string) => [...host.querySelectorAll<HTMLElement>(selector)];
const textOf = (selector: string) => $(selector)?.textContent ?? null;
const headings = () => $$('h2').map((h) => h.textContent);
const click = async (element: Element | null | undefined) => {
  if (!element) throw new Error('nothing to click');
  await act(async () => (element as HTMLElement).click());
};
const buttonNamed = (name: string) => $$('button').find((button) => button.textContent?.trim() === name);

describe("a step's page, read from the top", () => {
  it('draws a normal step in its order: title, row, what it does, the change, try it, the question, more, around', async () => {
    await draw();
    expect(textOf('h1')).toBe('List the tools');
    expect(textOf('[data-build-step-place]')).toBe('Step 7 of 16');
    expect($$('[data-build-squares] a')).toHaveLength(16);
    expect($('[data-build-squares] a[aria-current="step"]')?.getAttribute('aria-label')).toBe('Step 7: List the tools');
    expect(headings()).toEqual([
      'The change',
      'Try it',
      'Check yourself',
      'What does your agent read to decide when to use roll_dice?',
    ]);
    expect(textOf('[data-build-change-counts]')).toBe('1 file · +10 -1');
    expect($$('[data-build-file]').map((file) => file.dataset.buildFile)).toEqual(['server.ts']);
    expect($$('[data-diff-line="added"]')).toHaveLength(10);
    expect($$('[data-diff-line="removed"]')).toHaveLength(1);
    expect($$('[data-build-step-try] li')).toHaveLength(3);
    expect(textOf('[data-build-step-try] p')).toBe(
      'The playground of this project is your own agent, with your server connected to it.',
    );
    expect($<HTMLDetailsElement>('[data-build-step-more]')?.open).toBe(false);
    expect(textOf('[data-build-step-more] summary')).toBe('Explain more');
    expect($$('[data-build-around]').map((card) => card.textContent)).toEqual([
      'Previous stepConnect it to your own agent',
      'Next stepRun a tool',
    ]);
    expect($('[data-build-step-foot] a')?.getAttribute('href')).toBe(
      'https://github.com/gitranks/build/tree/3f2c9a1e8b7d6c5f4e3d2c1b0a9f8e7d6c5b4a39',
    );
  });

  it('gives a visitor the sentence that starts the project, with Copy, and the way to connect an agent', async () => {
    await draw();
    expect($('[data-build-agent-row]')?.dataset.buildAgentRow).toBe('visitor');
    expect(textOf('[data-build-say]')).toBe('Teach me how to build an MCP server with GitRanks');
    expect(textOf('[data-build-row-line]')).toBe(
      'Say this in your agent. It brings in the code of each step, you try it, and GitRanks keeps your place. Connect your agent',
    );
    expect($('[data-build-row-line] a')?.getAttribute('href')).toBe('/build/start?project=mcp-server');
    const writeText = vi.fn(async () => {});
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    await click($('[data-build-copy]'));
    expect(writeText).toHaveBeenCalledWith('Teach me how to build an MCP server with GitRanks');
    expect(textOf('[data-build-copy]')).toBe('Copied');
  });

  it('draws five files of a big step, the first three open and two to show, each with its status', async () => {
    await draw({ page: cases.bigStep });
    expect(textOf('[data-build-change-counts]')).toBe('5 files · +52 -15');
    const files = $$('[data-build-file]');
    expect(files.map((file) => [file.dataset.buildFile, file.dataset.buildFileOpen])).toEqual([
      ['tools/roll-dice.ts', 'true'],
      ['tools/flip-coin.ts', 'true'],
      ['server.ts', 'true'],
      ['tools/tool.ts', 'false'],
      ['server.test.ts', 'false'],
    ]);
    expect(files[0].querySelector('figcaption')?.textContent).toContain('new file');
    expect(files[0].querySelector('[data-diff-counts]')?.textContent).toBe('+14');
    expect(files[2].querySelector('figcaption')?.textContent).not.toContain('new file');
    await click(files[3].querySelector('[data-build-show-change]'));
    expect(files[3].dataset.buildFileOpen).toBe('true');
    expect(files[3].querySelectorAll('[data-diff-line="added"]')).toHaveLength(6);
  });

  it('folds the runs that did not change and the rest of a long removed run, each opened in place', async () => {
    await draw({ page: cases.bigStep });
    const server = $('[data-build-file="server.ts"]');
    const folds = [...(server?.querySelectorAll('button:not([data-build-whole-file])') ?? [])].map(
      (b) => b.textContent,
    );
    expect(folds).toEqual(['7 more removed lines', '4 lines did not change', '12 lines below did not change']);
    await click(buttonNamed('12 lines below did not change'));
    expect(buttonNamed('12 lines below did not change')).toBeUndefined();
    const numbers = [...(server?.querySelectorAll('[data-diff-line="context"] > span:first-child') ?? [])].map(
      (cell) => cell.textContent,
    );
    expect(numbers.at(-1)).toBe('44');
    await click(buttonNamed('7 more removed lines'));
    expect(server?.querySelectorAll('[data-diff-line="removed"]')).toHaveLength(15);
  });

  it('draws a small step: a three-line diff under the lines above it, and one thing to try', async () => {
    await draw({ page: cases.smallStep });
    expect(textOf('[data-build-change-counts]')).toBe('1 file · +1 -1');
    expect(buttonNamed('12 lines above did not change')).toBeDefined();
    expect($$('[data-build-file] [data-diff-line]')).toHaveLength(6);
    expect($$('[data-build-step-try] li')).toHaveLength(1);
    expect(textOf('[data-build-step-try] li code')).toBe('Roll a dice with my-server');
    expect($('[data-build-step-more]')).toBeNull();
  });

  it('draws the first step with no code: the base’s steps and what you need, no change and nothing to try', async () => {
    await draw({ page: cases.firstStepNoCode });
    expect(headings()).toEqual([
      'The 16 steps of the base',
      'What you need',
      'Check yourself',
      'What does your agent read to decide when to use roll_dice?',
    ]);
    expect(textOf('[data-build-step-plan] p')).toBe('About an hour and a half. Each step adds one thing you can try.');
    expect($$('[data-build-step-plan] li')).toHaveLength(16);
    expect($('[data-build-step-plan] a[aria-current="page"]')?.textContent).toBe('What you will build');
    expect($$('[data-build-step-needs] li').map((li) => li.querySelector('span')?.textContent)).toEqual([
      'Node 22 or newer, or Python 3.12 or newer',
      'An agent with a shell',
      'git',
    ]);
    expect($('[data-build-step-change]')).toBeNull();
    expect($('[data-build-step-try]')).toBeNull();
    expect($$('[data-build-around]').map((card) => card.dataset.buildAround)).toEqual(['after']);
  });

  it('marks a removed file, with no whole file and no link to it', async () => {
    await draw({ page: cases.removedFileStep });
    const removed = $('[data-build-file="log.ts"]');
    expect(removed?.dataset.buildFileStatus).toBe('removed');
    expect(removed?.querySelector('figcaption')?.textContent).toContain('removed');
    expect(removed?.querySelector('[data-build-whole-file]')).toBeNull();
    expect(removed?.querySelector('a')).toBeNull();
    expect(removed?.querySelector('[data-diff-counts]')?.textContent).toBe('-7');
    expect($('[data-build-language-switch]')).toBeNull();
  });

  it('draws a long diff whole', async () => {
    await draw({ page: cases.longDiffStep });
    expect($$('[data-build-file] [data-diff-line="added"]').length).toBeGreaterThan(50);
  });

  it('draws a step of a part: the part in the way back, its own squares and place', async () => {
    await draw({ page: cases.partStep });
    expect($('nav[aria-label="Breadcrumb"]')?.textContent).toBe(
      'Build/Build an MCP server/The same server on the official SDK',
    );
    expect(textOf('[data-build-step-place]')).toBe('Step 3 of 6');
    expect($$('[data-build-squares] a')).toHaveLength(6);
    expect($$('[data-build-step-try] li')).toHaveLength(1);
    expect($('[data-build-step-try] p')).toBeNull();
  });

  it('draws a sketch, and leaves the squares out when the project could not be read', async () => {
    await draw({ page: cases.sketchStep, project: null });
    expect(textOf('[data-build-sketch]')).toContain('tools/list');
    expect($('[data-build-squares]')).toBeNull();
    expect(textOf('[data-build-say]')).toBe('Build an MCP server with GitRanks');
  });
});

describe('the language switch', () => {
  it('changes the files and the note, and is kept in the browser', async () => {
    await draw({ page: cases.sketchStep });
    expect(textOf('[data-build-note]')).toBe(
      'In TypeScript the tool is a plain object; its type comes later, in step 11.',
    );
    expect($('[data-build-language="typescript"]')?.getAttribute('aria-pressed')).toBe('true');
    await click($('[data-build-language="python"]'));
    expect($('[data-build-language="python"]')?.getAttribute('aria-pressed')).toBe('true');
    expect($$('[data-build-file]').map((file) => file.dataset.buildFile)).toEqual(['server.py']);
    expect(textOf('[data-build-note]')).toBe(
      'In Python the list is a plain dict, and json.dumps writes it as the same JSON.',
    );
    expect(window.localStorage.getItem(BUILD_LANGUAGE_KEY)).toBe('python');
    expect($('[data-build-step-foot] a')?.getAttribute('href')).toContain('9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b');
  });

  it('shows a question’s code in the language shown', async () => {
    await draw({ page: cases.sketchStep, startLanguage: 'python' });
    expect(textOf('[data-question-code="output"] pre')).toBe('tools = [ROLL_DICE]print(len(tools))');
  });

  it('starts at the language picked before, else at the person’s build', async () => {
    window.localStorage.setItem(BUILD_LANGUAGE_KEY, 'python');
    await draw();
    expect(host.firstElementChild?.getAttribute('data-build-step-language')).toBe('python');
    await act(async () => root.unmount());
    window.localStorage.clear();
    root = createRoot(host);
    await draw({
      personal: { step: { builds: [{ language: 'python', status: 'to_come' }] }, project: builds.projectMineTwo },
    });
    expect(host.firstElementChild?.getAttribute('data-build-step-language')).toBe('typescript');
  });
});

describe('what changes with the person', () => {
  it('outlines where the build stands and fills the steps passed, on this step', async () => {
    await draw({
      page: {
        ...listTheToolsStep,
        step:
          builds.buildInProgress.state.kind === 'in_progress'
            ? builds.buildInProgress.state.step
            : listTheToolsStep.step,
      },
      personal: { step: builds.stepMineCurrent, project: builds.projectMineOne },
    });
    expect(
      $$('[data-build-squares] a')
        .map((a) => a.dataset.square?.[0])
        .join(''),
    ).toBe('ddddddddcppppppp');
    expect($('[data-build-agent-row]')?.dataset.buildAgentRow).toBe('current');
    expect(textOf('[data-build-agent-row] span')).toBe('Your build is on this step');
    expect(textOf('[data-build-say]')).toBe('Continue my build');
    expect(textOf('[data-build-row-line]')).toBe(
      'Your build is in TypeScript. Say this in your agent to go on from here. My builds',
    );
  });

  it('says a step passed, and where the build is now', async () => {
    await draw({ personal: { step: builds.stepMineTwo, project: builds.projectMineTwo } });
    expect($('[data-build-agent-row]')?.dataset.buildAgentRow).toBe('done');
    expect(textOf('[data-build-agent-row] span')).toBe('You passed this step');
    expect(textOf('[data-build-row-line]')).toBe('Your build is now on step 9, Check the input. Go to step 9');
    expect($('[data-build-row-line] a')?.getAttribute('href')).toBe('/build/mcp-server/check-the-input');
  });

  it('says a step is still to come in the other language’s build', async () => {
    await draw({ personal: { step: builds.stepMineTwo, project: builds.projectMineTwo } });
    await click($('[data-build-language="python"]'));
    expect($('[data-build-agent-row]')?.dataset.buildAgentRow).toBe('to_come');
    expect(textOf('[data-build-row-line]')).toBe('Your build is now on step 4, Answer the hello message. Go to step 4');
    expect(
      $$('[data-build-squares] a')
        .map((a) => a.dataset.square?.[0])
        .join(''),
    ).toBe('dddcpppppppppppp');
  });

  it('keeps a person’s one build in the squares and the row when the code is shown in the other language', async () => {
    await draw({ personal: { step: builds.stepMineCurrent, project: builds.projectMineOne } });
    await click($('[data-build-language="python"]'));
    expect(host.firstElementChild?.getAttribute('data-build-step-language')).toBe('python');
    expect($('[data-build-agent-row]')?.dataset.buildAgentRow).toBe('current');
    expect(textOf('[data-build-row-line]')).toBe(
      'Your build is in TypeScript. Say this in your agent to go on from here. My builds',
    );
    expect(
      $$('[data-build-squares] a')
        .map((a) => a.dataset.square?.[0])
        .join(''),
    ).toBe('ddddddddcppppppp');
  });

  it('sends the row’s test link to the test of the build it is about', async () => {
    const waiting = {
      ...builds.projectMineTwo,
      builds: [builds.buildTestLeft, { ...builds.buildTestLeft, language: 'python' as const }],
    };
    await draw({ personal: { step: builds.stepMineTwo, project: waiting } });
    await click($('[data-build-language="python"]'));
    const link = $('[data-build-row-line] a');
    expect(link?.textContent).toBe('Take the test');
    expect(link?.getAttribute('href')).toContain('python');
  });

  it('holds everything under the title in its place while a session reads, then shows it', async () => {
    hint.present = true;
    const waits: Array<() => void> = [];
    const fetchMock = vi.fn(
      (path: string) =>
        new Promise((resolve) => {
          const mine = path.includes('/steps/') ? builds.stepMineTwo : builds.projectMineTwo;
          waits.push(() => resolve({ ok: true, json: async () => ({ mine }) }));
        }),
    );
    vi.stubGlobal('fetch', fetchMock);
    await act(async () => {
      root.render(<BuildStepLive page={listTheToolsStep} project={mcpServerProject} codes={[]} questionCodes={[]} />);
    });
    const held = $('[data-build-step-held]');
    expect(held?.className).toContain('[html[data-has-session]_&]:invisible');
    expect(held?.className).toContain('[html[data-has-session]_&]:animate-build-reveal');
    expect(held?.getAttribute('aria-busy')).toBe('true');
    expect(textOf('h1')).toBe('List the tools');
    await act(async () => {
      for (const wait of waits) wait();
    });
    expect($('[data-build-step-held]')).toBeNull();
    expect($('[data-build-agent-row]')?.dataset.buildAgentRow).toBe('done');
  });

  it('holds nothing for a browser with no session', async () => {
    vi.stubGlobal('fetch', vi.fn());
    await act(async () => {
      root.render(<BuildStepLive page={listTheToolsStep} project={mcpServerProject} codes={[]} questionCodes={[]} />);
    });
    expect($('[data-build-step-held]')).toBeNull();
  });

  it('is read in the browser for a session, and changes the row in place', async () => {
    hint.present = true;
    const fetchMock = vi.fn(async (path: string) => ({
      ok: true,
      json: async () => ({
        mine: path.includes('/steps/') ? builds.stepMineTwo : builds.projectMineTwo,
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    await act(async () => {
      root.render(<BuildStepLive page={listTheToolsStep} project={mcpServerProject} codes={[]} questionCodes={[]} />);
    });
    expect(fetchMock.mock.calls.map(([path]) => path)).toEqual([
      '/api/me/build/projects/mcp-server/steps/list-the-tools',
      '/api/me/build/projects/mcp-server',
    ]);
    expect($('[data-build-agent-row]')?.dataset.buildAgentRow).toBe('done');
  });

  it('asks nothing without a session, and stays a visitor’s when the read fails', async () => {
    const fetchMock = vi.fn(async () => ({ ok: false, json: async () => ({}) }));
    vi.stubGlobal('fetch', fetchMock);
    await act(async () => {
      root.render(<BuildStepLive page={listTheToolsStep} project={mcpServerProject} codes={[]} questionCodes={[]} />);
    });
    expect(fetchMock).not.toHaveBeenCalled();
    hint.present = true;
    await act(async () => root.unmount());
    root = createRoot(host);
    await act(async () => {
      root.render(<BuildStepLive page={listTheToolsStep} project={mcpServerProject} codes={[]} questionCodes={[]} />);
    });
    expect(fetchMock).toHaveBeenCalled();
    expect($('[data-build-agent-row]')?.dataset.buildAgentRow).toBe('visitor');
  });
});

describe('the question', () => {
  it('shows the reason of a wrong pick where it stands, then the right one, graded on the page', async () => {
    await draw();
    expect(textOf('[data-status]')).toBe('Pick one, then check. A wrong pick only shows you why, and you pick again.');
    const option = (index: number) => $<HTMLInputElement>(`[data-option="${index}"] input`);
    await act(async () => option(0)?.click());
    await click($('[data-answer-main]'));
    expect($('[data-status]')?.dataset.status).toBe('wrong');
    expect(textOf('[data-status]')).toContain('The name is how the agent calls the tool.');
    await act(async () => option(1)?.click());
    await click($('[data-answer-main]'));
    expect($('[data-status]')?.dataset.status).toBe('right');
    expect(textOf('[data-status]')).toContain('The description is written for the agent.');
    expect(textOf('[data-answer-label]')).toBe('Answered');
    await click($('[data-answer-main]'));
    expect(document.activeElement?.getAttribute('data-build-around')).toBe('after');
  });
});

describe('the whole file', () => {
  it('opens beside the page with every line, the added ones marked, and closes', async () => {
    await draw();
    await click($('[data-build-whole-file]'));
    const panel = document.querySelector<HTMLElement>('[data-build-whole-file-panel]');
    expect(panel?.getAttribute('role')).toBe('dialog');
    expect(panel?.textContent).toContain('The whole file after step 7. The lines this step changed are marked.');
    expect(panel?.querySelectorAll('[data-diff-line]')).toHaveLength(21);
    expect(panel?.querySelectorAll('[data-diff-line="added"]')).toHaveLength(10);
    expect(panel?.querySelector('a')?.getAttribute('href')).toBe(
      'https://github.com/gitranks/build/blob/3f2c9a1e8b7d6c5f4e3d2c1b0a9f8e7d6c5b4a39/server.ts',
    );
    await click(panel?.querySelector('[aria-label="Close"]'));
    expect(document.querySelector('[data-build-whole-file-panel]')).toBeNull();
  });
});
