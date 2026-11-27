import type { BuildPart, BuildProjectPage, BuildStepRef } from '../types';
import { codingAgentCard, interpreterCard, mcpServerCard } from './projects';

/*
 * The first project's page as the approved designs show it: 16 base steps and one optional part, the official SDK.
 * The step titles are the boards'; the slugs are what the content will use (`list-the-tools` is the spec's).
 */

const refs = (steps: [slug: string, title: string][]): BuildStepRef[] =>
  steps.map(([slug, title], index) => ({ slug, title, number: index + 1 }));

/** The base, in order. */
export const mcpServerBase: BuildStepRef[] = refs([
  ['what-you-will-build', 'What you will build'],
  ['read-one-message', 'Read one message'],
  ['a-prompt-to-talk-to-your-server', 'A prompt to talk to your server'],
  ['answer-the-hello-message', 'Answer the hello message'],
  ['say-what-you-can-not-do-yet', 'Say what you can not do yet'],
  ['connect-it-to-your-own-agent', 'Connect it to your own agent'],
  ['list-the-tools', 'List the tools'],
  ['run-a-tool', 'Run a tool'],
  ['check-the-input', 'Check the input'],
  ['a-tool-that-fails-well', 'A tool that fails well'],
  ['give-each-tool-its-own-file', 'Give each tool its own file'],
  ['logs-go-to-stderr', 'Logs go to stderr, never stdout'],
  ['tell-the-agent-the-list-changed', 'Tell the agent the list changed'],
  ['stop-cleanly', 'Stop cleanly'],
  ['a-test-for-every-message', 'A test for every message'],
  ['use-it-for-a-day', 'Use it for a day'],
]);

/** A base step by its number, 1 to 16. */
export const mcpServerStep = (number: number): BuildStepRef => {
  const step = mcpServerBase[number - 1];
  if (!step) throw new Error(`The first project has no base step ${number}`);
  return step;
};

/** The optional part: the same server on the official SDK. Its steps count from 1. */
export const mcpServerSdkPart: BuildPart = {
  slug: 'official-sdk',
  name: 'The same server on the official SDK',
  line: 'See what the SDK does for you, now that you know what is under it.',
  steps: refs([
    ['install-the-sdk', 'Install the SDK'],
    ['the-hello-message-done-for-you', 'The hello message, done for you'],
    ['describe-a-tool-with-a-schema', 'Describe a tool with a schema'],
    ['move-the-tools-over', 'Move roll_dice and flip_coin over'],
    ['errors-the-sdk-way', 'Errors, the SDK’s way'],
    ['compare-the-two-servers', 'Compare the two servers'],
  ]),
};

/** The first project's page, the same for everyone. */
export const mcpServerProject: BuildProjectPage = {
  ...mcpServerCard,
  about: [
    'A server your own agent starts and uses, with two tools you wrote.',
    'About 150 lines that you understand line by line, with a test for every message.',
    'A shape you can keep adding tools to: one new file for each tool.',
  ],
  playground: 'Your own agent, with your server connected to it.',
  needsFull: [
    { language: 'typescript', name: 'Node', version: '22', command: 'node --version', why: null },
    { language: 'python', name: 'Python', version: '3.12', command: 'python3 --version', why: null },
    {
      language: null,
      name: 'An agent with a shell',
      version: null,
      command: null,
      why: 'Claude Code, Codex, Cursor, Gemini CLI or VS Code.',
    },
    {
      language: null,
      name: 'git',
      version: null,
      command: 'git --version',
      why: 'Wanted, not required. With it each step is one download and one commit of your own.',
    },
  ],
  base: mcpServerBase,
  partsFull: [mcpServerSdkPart],
  courses: [
    { slug: 'mcp', name: 'Building MCP servers and clients' },
    { slug: 'llm-apis', name: 'Working with LLM APIs' },
  ],
  next: [codingAgentCard, interpreterCard],
};

/** A small project: no optional part, no course, one next project. */
export const smallProject: BuildProjectPage = {
  ...mcpServerProject,
  parts: 0,
  partsFull: [],
  courses: [],
  next: [codingAgentCard],
};
