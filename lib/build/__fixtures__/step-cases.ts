import type { BuildFileStatus, BuildLanguage, BuildStepLanguage, BuildStepPage, BuildStepRef } from '../types';
import { mcpServerSdkPart, mcpServerStep } from './project';
import { listTheToolsQuestion, listTheToolsStep } from './step';
import type { LearnQuestion } from '@/lib/workspace/learn-question';

/*
 * More steps of the first project, for every case a step's page draws: a big one with five changed files, a small one
 * with a three-line diff, the first step with no code, one that removes a file, one with a long diff, a step of the
 * optional part, and one with a sketch, a note and a question that shows code. Their diffs are written from the files
 * before and after, as the API's are, so each diff agrees with its files.
 */

const linesOf = (text: string) => {
  const lines = text.split('\n');
  if (lines.at(-1) === '') lines.pop();
  return lines;
};

type Op = { kind: ' ' | '-' | '+'; text: string };

/** The lines of two texts as kept, removed and added, from their longest common run. */
function opsOf(before: string[], after: string[]): Op[] {
  const table = Array.from({ length: before.length + 1 }, () => new Array<number>(after.length + 1).fill(0));
  for (let i = before.length - 1; i >= 0; i -= 1) {
    for (let j = after.length - 1; j >= 0; j -= 1) {
      table[i][j] = before[i] === after[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const ops: Op[] = [];
  let i = 0;
  let j = 0;
  while (i < before.length || j < after.length) {
    if (i < before.length && j < after.length && before[i] === after[j]) {
      ops.push({ kind: ' ', text: before[i] });
      i += 1;
      j += 1;
    } else if (j >= after.length || (i < before.length && table[i + 1][j] >= table[i][j + 1])) {
      ops.push({ kind: '-', text: before[i] });
      i += 1;
    } else {
      ops.push({ kind: '+', text: after[j] });
      j += 1;
    }
  }
  return ops;
}

const CONTEXT = 3;

/** A unified diff of one file, with three lines of context, as git writes it. */
export function unifiedDiffOf(path: string, before: string | null, after: string | null): string {
  const ops = opsOf(before === null ? [] : linesOf(before), after === null ? [] : linesOf(after));
  const changed = ops.map((op, index) => (op.kind === ' ' ? -1 : index)).filter((index) => index >= 0);
  const ranges: [number, number][] = [];
  for (const index of changed) {
    const from = Math.max(0, index - CONTEXT);
    const to = Math.min(ops.length - 1, index + CONTEXT);
    const last = ranges.at(-1);
    if (last && from <= last[1] + 1) last[1] = Math.max(last[1], to);
    else ranges.push([from, to]);
  }
  const out = [
    `--- ${before === null ? '/dev/null' : `a/${path}`}`,
    `+++ ${after === null ? '/dev/null' : `b/${path}`}`,
  ];
  for (const [from, to] of ranges) {
    const oldStart = ops.slice(0, from).filter((op) => op.kind !== '+').length + 1;
    const newStart = ops.slice(0, from).filter((op) => op.kind !== '-').length + 1;
    const part = ops.slice(from, to + 1);
    const oldCount = part.filter((op) => op.kind !== '+').length;
    const newCount = part.filter((op) => op.kind !== '-').length;
    out.push(`@@ -${oldCount ? oldStart : 0},${oldCount} +${newCount ? newStart : 0},${newCount} @@`);
    for (const op of part) out.push(`${op.kind}${op.text}`);
  }
  return `${out.join('\n')}\n`;
}

/** A file a step changes: its text before (none: added) and after (none: removed). */
type Change = { path: string; before: string | null; after: string | null };

/** One language's side of a step from its changes and the files it leaves alone. */
function sideOf(
  language: BuildLanguage,
  commit: string,
  changes: Change[],
  kept: { path: string; text: string }[],
  note: string | null = null,
): BuildStepLanguage {
  const statusOf = (change: Change): BuildFileStatus =>
    change.before === null ? 'added' : change.after === null ? 'removed' : 'changed';
  return {
    language,
    note,
    commit,
    changed: changes.map((change) => ({
      path: change.path,
      status: statusOf(change),
      diff: unifiedDiffOf(change.path, change.before, change.after),
    })),
    files: [
      ...kept,
      ...changes.flatMap((change) => (change.after === null ? [] : [{ path: change.path, text: change.after }])),
    ].sort((a, b) => a.path.localeCompare(b.path)),
  };
}

const IO_TS_BEFORE = `import { createInterface } from "node:readline";

export type Message = { jsonrpc: "2.0"; id: number; method: string; params?: any };

export async function* readMessages() {
  const lines = createInterface({ input: process.stdin });
  for await (const line of lines) {
    if (line.trim()) yield JSON.parse(line) as Message;
  }
}

export function send(message: unknown) {
  process.stdout.write(\`\${JSON.stringify(message)}\\n\`);
}
export function log(text: string) {
  console.log(text);
}
`;

const IO_TS_AFTER = IO_TS_BEFORE.replace('  console.log(text);', '  console.error(text);');

const IO_PY_BEFORE = `import json
import sys


def read_messages():
    for line in sys.stdin:
        if line.strip():
            yield json.loads(line)


def send(message):
    sys.stdout.write(json.dumps(message) + "\\n")
    sys.stdout.flush()


def log(text):
    print(text)
`;

const IO_PY_AFTER = IO_PY_BEFORE.replace('    print(text)', '    print(text, file=sys.stderr)');

const SERVER_TS_10 = `import { readMessages, send } from "./io";

const ROLL_DICE = {
  name: "roll_dice",
  description: "Roll a dice with the number of sides you give.",
  inputSchema: {
    type: "object",
    properties: { sides: { type: "integer", minimum: 2 } },
    required: ["sides"],
  },
};

function rollDice(args: { sides: number }) {
  return String(1 + Math.floor(Math.random() * args.sides));
}

function handle(msg: Message) {
  if (msg.method === "initialize") {
    return reply(msg.id, {
      protocolVersion: msg.params.protocolVersion,
      capabilities: { tools: {} },
      serverInfo: { name: "my-server", version: "0.1.0" },
    });
  }
  if (msg.method === "tools/list") {
    return reply(msg.id, { tools: [ROLL_DICE] });
  }
  if (msg.method === "tools/call") {
    return reply(msg.id, text(rollDice(msg.params.arguments)));
  }
  return fail(msg.id, -32601, "Method not found");
}

function reply(id: number, result: unknown) {
  return { jsonrpc: "2.0", id, result };
}

function fail(id: number, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function text(value: string) {
  return { content: [{ type: "text", text: value }] };
}

for await (const msg of readMessages()) {
  send(handle(msg));
}
`;

const SERVER_TS_11 = `import { readMessages, send } from "./io";
import { flipCoin } from "./tools/flip-coin";
import { rollDice } from "./tools/roll-dice";

const TOOLS = [rollDice, flipCoin];

function handle(msg: Message) {
  if (msg.method === "initialize") {
    return reply(msg.id, {
      protocolVersion: msg.params.protocolVersion,
      capabilities: { tools: {} },
      serverInfo: { name: "my-server", version: "0.1.0" },
    });
  }
  if (msg.method === "tools/list") {
    return reply(msg.id, { tools: TOOLS.map(describe) });
  }
  if (msg.method === "tools/call") {
    const tool = TOOLS.find((t) => t.name === msg.params.name);
    if (!tool) return fail(msg.id, -32602, "Unknown tool");
    return reply(msg.id, text(tool.run(msg.params.arguments)));
  }
  return fail(msg.id, -32601, "Method not found");
}

function describe({ name, description, inputSchema }: Tool) {
  return { name, description, inputSchema };
}

function reply(id: number, result: unknown) {
  return { jsonrpc: "2.0", id, result };
}

function fail(id: number, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function text(value: string) {
  return { content: [{ type: "text", text: value }] };
}

for await (const msg of readMessages()) {
  send(handle(msg));
}
`;

const TOOL_TS = `export type Tool = {
  name: string;
  description: string;
  inputSchema: object;
  run(args: any): string;
};
`;

const ROLL_DICE_TS = `import type { Tool } from "./tool";

export const rollDice: Tool = {
  name: "roll_dice",
  description: "Roll a dice with the number of sides you give.",
  inputSchema: {
    type: "object",
    properties: { sides: { type: "integer", minimum: 2 } },
    required: ["sides"],
  },
  run({ sides }) {
    return String(1 + Math.floor(Math.random() * sides));
  },
};
`;

const FLIP_COIN_TS = `import type { Tool } from "./tool";

export const flipCoin: Tool = {
  name: "flip_coin",
  description: "Flip a coin and return heads or tails.",
  inputSchema: { type: "object", properties: {} },
  run() {
    return Math.random() < 0.5 ? "heads" : "tails";
  },
};
`;

const SERVER_TEST_TS_10 = `import { test } from "node:test";
import assert from "node:assert/strict";
import { ask } from "./ask";

test("answers the hello message", async () => {
  const answer = await ask({ method: "initialize", params: { protocolVersion: "2025-06-18" } });
  assert.equal(answer.result.serverInfo.name, "my-server");
});
`;

const SERVER_TEST_TS_11 = `${SERVER_TEST_TS_10}
test("lists both tools", async () => {
  const answer = await ask({ method: "tools/list" });
  const names = answer.result.tools.map((tool: { name: string }) => tool.name);
  assert.deepEqual(names, ["roll_dice", "flip_coin"]);
});

test("refuses a tool it does not have", async () => {
  const answer = await ask({ method: "tools/call", params: { name: "spin_wheel" } });
  assert.equal(answer.error.message, "Unknown tool");
});
`;

const SERVER_PY_10 = `from io_lines import read_messages, send

ROLL_DICE = {
    "name": "roll_dice",
    "description": "Roll a dice with the number of sides you give.",
    "inputSchema": {
        "type": "object",
        "properties": {"sides": {"type": "integer", "minimum": 2}},
        "required": ["sides"],
    },
}


def roll_dice(args):
    return str(random.randint(1, args["sides"]))


def handle(msg):
    if msg["method"] == "tools/list":
        return reply(msg["id"], {"tools": [ROLL_DICE]})
    if msg["method"] == "tools/call":
        return reply(msg["id"], text(roll_dice(msg["params"]["arguments"])))
    return fail(msg["id"], -32601, "Method not found")
`;

const SERVER_PY_11 = `from io_lines import read_messages, send
from tools.flip_coin import FLIP_COIN
from tools.roll_dice import ROLL_DICE

TOOLS = [ROLL_DICE, FLIP_COIN]


def handle(msg):
    if msg["method"] == "tools/list":
        return reply(msg["id"], {"tools": [describe(tool) for tool in TOOLS]})
    if msg["method"] == "tools/call":
        tool = next((t for t in TOOLS if t["name"] == msg["params"]["name"]), None)
        if tool is None:
            return fail(msg["id"], -32602, "Unknown tool")
        return reply(msg["id"], text(tool["run"](msg["params"]["arguments"])))
    return fail(msg["id"], -32601, "Method not found")
`;

const ROLL_DICE_PY = `import random

ROLL_DICE = {
    "name": "roll_dice",
    "description": "Roll a dice with the number of sides you give.",
    "inputSchema": {
        "type": "object",
        "properties": {"sides": {"type": "integer", "minimum": 2}},
        "required": ["sides"],
    },
    "run": lambda args: str(random.randint(1, args["sides"])),
}
`;

const FLIP_COIN_PY = `import random

FLIP_COIN = {
    "name": "flip_coin",
    "description": "Flip a coin and return heads or tails.",
    "inputSchema": {"type": "object", "properties": {}},
    "run": lambda args: random.choice(["heads", "tails"]),
}
`;

/** Its own question for the big step: four options. */
const bigQuestion: LearnQuestion = {
  id: 'give-each-tool-its-own-file',
  type: 'PICK_ONE',
  prompt: 'You want a third tool, pick_card. After this step, what do you have to change?',
  example: null,
  visual: null,
  codes: [],
  content: {
    options: [
      {
        text: 'Add a new branch for pick_card in the tools/call part of server.ts',
        right: false,
        why: 'The server no longer has a branch for each tool. It finds the tool by its name in one list.',
      },
      {
        text: 'Write tools/pick-card.ts and add its name to the TOOLS list',
        right: true,
        why: 'A new tool is one new file and one more name in the list. Nothing else in the server changes.',
      },
      {
        text: 'Write tools/pick-card.ts, and the server finds it by itself',
        right: false,
        why: 'The server only knows the tools in its list. A file it never imports is never run.',
      },
      {
        text: 'Change io.ts so it can read the new message',
        right: false,
        why: 'A call to a new tool is the same message, tools/call, with another name.',
      },
    ],
  },
};

const step = (number: number): BuildStepRef => mcpServerStep(number);

/** "Give each tool its own file": the biggest step of the base, five files in TypeScript. */
export const bigStep: BuildStepPage = {
  ...listTheToolsStep,
  step: step(11),
  say: [
    'One tool fitted well inside `server.ts`. With a second one, the file starts to mix two jobs: talking to the agent, and doing the work of each tool. That gets harder to read with every tool you add.',
    'This step moves `roll_dice` into a file of its own, adds a second tool, `flip_coin`, beside it, and gives both the same shape: a name, a description, the input, and a `run` function. The server keeps one list of tools and no longer knows what any of them does.',
    'From now on a new tool is one new file and one more name in the list. Nothing else in the server changes.',
    'It is the largest step of the base. Read the three open files in order: the two tools first, then the server.',
  ].join('\n\n'),
  more: 'A list of tools that all have the same shape is the pattern most servers use. The official SDK does the same thing for you, which the optional part shows.',
  play: [
    'Ask your agent which tools your server has now. It should name two.\nWhich tools does my-server have?',
    'Use the new tool.\nFlip a coin with my-server',
    'In the prompt from step 3, call a tool that does not exist and read the error.\n> tools/call spin_wheel {}',
  ],
  question: bigQuestion,
  languages: [
    sideOf(
      'typescript',
      'b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0',
      [
        { path: 'tools/roll-dice.ts', before: null, after: ROLL_DICE_TS },
        { path: 'tools/flip-coin.ts', before: null, after: FLIP_COIN_TS },
        { path: 'server.ts', before: SERVER_TS_10, after: SERVER_TS_11 },
        { path: 'tools/tool.ts', before: null, after: TOOL_TS },
        { path: 'server.test.ts', before: SERVER_TEST_TS_10, after: SERVER_TEST_TS_11 },
      ],
      [{ path: 'io.ts', text: IO_TS_BEFORE }],
    ),
    sideOf(
      'python',
      'c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1',
      [
        { path: 'tools/roll_dice.py', before: null, after: ROLL_DICE_PY },
        { path: 'tools/flip_coin.py', before: null, after: FLIP_COIN_PY },
        { path: 'server.py', before: SERVER_PY_10, after: SERVER_PY_11 },
      ],
      [{ path: 'io_lines.py', text: IO_PY_BEFORE }],
    ),
  ],
  before: step(10),
  after: step(12),
};

/** "Logs go to stderr, never stdout": a three-line diff, and one thing to try. */
export const smallStep: BuildStepPage = {
  ...listTheToolsStep,
  step: step(12),
  say: [
    'Your agent reads everything your server prints to stdout and expects each line to be a message. One stray log line there, and it can not read what comes next.',
    'So logs go to the other output, stderr. This step changes the one place where the server logs.',
  ].join('\n\n'),
  more: '',
  play: [
    'Ask your agent to roll a dice, and watch the terminal where the server runs: the log line shows there, and the agent still gets its answer.\nRoll a dice with my-server',
  ],
  languages: [
    sideOf(
      'typescript',
      'd3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2',
      [{ path: 'io.ts', before: IO_TS_BEFORE, after: IO_TS_AFTER }],
      [{ path: 'server.ts', text: SERVER_TS_11 }],
    ),
    sideOf(
      'python',
      'e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3',
      [{ path: 'io_lines.py', before: IO_PY_BEFORE, after: IO_PY_AFTER }],
      [{ path: 'server.py', text: SERVER_PY_11 }],
    ),
  ],
  before: step(11),
  after: step(13),
};

/** The first step: what you will build. It brings in no code, and has nothing to try yet. */
export const firstStepNoCode: BuildStepPage = {
  ...listTheToolsStep,
  step: step(1),
  say: [
    'An MCP server is a small program that gives an AI agent new tools. The agent starts it, asks what it can do, and calls its tools by sending short messages.',
    'In 16 steps you build one from nothing, with no library: it reads a message, answers it, lists a tool and runs it. From step 6 on, your own agent uses your server, so you see every step work in the agent you already have.',
    'At the end you have about 150 lines that you understand line by line, and a server you can keep adding tools to.',
  ].join('\n\n'),
  more: '',
  play: [],
  languages: [
    { language: 'typescript', note: null, commit: 'f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4', changed: [], files: [] },
    { language: 'python', note: null, commit: 'a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5', changed: [], files: [] },
  ],
  before: null,
  after: step(2),
};

const LOG_TS = `export function log(text: string) {
  console.error(text);
}

export function warn(text: string) {
  console.error(\`warning: \${text}\`);
}
`;

const STOP_SERVER_TS = SERVER_TS_11.replace(
  'for await (const msg of readMessages()) {\n  send(handle(msg));\n}\n',
  'process.on("SIGTERM", () => process.exit(0));\n\nfor await (const msg of readMessages()) {\n  send(handle(msg));\n}\nprocess.exit(0);\n',
);

/** "Stop cleanly": a step that removes a file, and changes another. */
export const removedFileStep: BuildStepPage = {
  ...listTheToolsStep,
  step: step(14),
  say: 'When your agent closes, it closes the server too. This step lets the server stop at once and quietly, and removes `log.ts`, which nothing uses any more.',
  more: '',
  play: ['Close your agent, open it again, and ask which tools your server has.'],
  languages: [
    sideOf(
      'typescript',
      'a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6',
      [
        { path: 'server.ts', before: SERVER_TS_11, after: STOP_SERVER_TS },
        { path: 'log.ts', before: LOG_TS, after: null },
      ],
      [{ path: 'io.ts', text: IO_TS_AFTER }],
    ),
  ],
  before: step(13),
  after: step(15),
};

const MESSAGES = ['initialize', 'tools/list', 'tools/call', 'ping', 'shutdown', 'notifications/initialized'];

/** A long test file: a few lines for each message the server knows. */
const LONG_TEST_TS = `import { test } from "node:test";
import assert from "node:assert/strict";
import { ask } from "./ask";
${MESSAGES.map(
  (method) => `
test("answers ${method}", async () => {
  const answer = await ask({ method: "${method}", params: {} });
  assert.ok(answer, "the server answered ${method}");
  assert.equal(answer.jsonrpc, "2.0");
  assert.equal(typeof answer.id, "number");
  if (answer.error) assert.notEqual(answer.error.code, -32601, "${method} is known");
  assert.ok(!("stack" in (answer.error ?? {})), "no stack trace is sent");
});
`,
).join('')}`;

/** "A test for every message": one long new file of tests. */
export const longDiffStep: BuildStepPage = {
  ...listTheToolsStep,
  step: step(15),
  say: 'Every message your server knows gets a test, so a change that breaks one shows at once.',
  more: '',
  play: ['Run the tests.\nnode --test'],
  languages: [
    sideOf(
      'typescript',
      'b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7',
      [{ path: 'messages.test.ts', before: null, after: LONG_TEST_TS }],
      [
        { path: 'server.test.ts', text: SERVER_TEST_TS_11 },
        { path: 'server.ts', text: STOP_SERVER_TS },
      ],
    ),
  ],
  before: step(14),
  after: step(16),
};

const sdkStep = (number: number): BuildStepRef => {
  const found = mcpServerSdkPart.steps[number - 1];
  if (!found) throw new Error(`The optional part has no step ${number}`);
  return found;
};

/** Step 3 of the optional part, on the official SDK. */
export const partStep: BuildStepPage = {
  ...listTheToolsStep,
  step: sdkStep(3),
  of: mcpServerSdkPart.steps.length,
  part: { slug: mcpServerSdkPart.slug, name: mcpServerSdkPart.name },
  say: 'The SDK describes a tool from a schema you write once. The list and the check of the input come from it.',
  more: '',
  play: ['Ask your agent which tools your server has. Nothing changed for it.'],
  languages: [
    sideOf(
      'typescript',
      'c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8',
      [
        {
          path: 'server.ts',
          before:
            'import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";\n\nconst server = new McpServer({ name: "my-server", version: "0.2.0" });\n',
          after:
            'import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";\nimport { z } from "zod";\n\nconst server = new McpServer({ name: "my-server", version: "0.2.0" });\n\nserver.tool("roll_dice", { sides: z.number().int().min(2) }, async ({ sides }) => ({\n  content: [{ type: "text", text: String(1 + Math.floor(Math.random() * sides)) }],\n}));\n',
        },
      ],
      [],
    ),
  ],
  before: sdkStep(2),
  after: sdkStep(4),
};

/** A question that shows code: what the server answers, in each language. */
const outputQuestion: LearnQuestion = {
  id: 'list-the-tools-output',
  type: 'PREDICT_OUTPUT',
  prompt: 'Your server gets `tools/list`. What does this print?',
  example: null,
  visual: null,
  codes: [
    { language: 'typescript', code: 'const tools = [ROLL_DICE];\nconsole.log(tools.length);\n' },
    { language: 'python', code: 'tools = [ROLL_DICE]\nprint(len(tools))\n' },
  ],
  content: {
    options: [
      { text: '0', right: false, why: 'The list holds `ROLL_DICE`, so it is not empty.' },
      { text: '1', right: true, why: 'One tool is in the list: `roll_dice`.' },
      { text: 'roll_dice', right: false, why: 'The code prints how many tools there are, not their names.' },
    ],
  },
};

/** "List the tools" with a sketch, a note in each language, and a question that shows code. */
export const sketchStep: BuildStepPage = {
  ...listTheToolsStep,
  sketch: [
    'agent                         your server',
    '  | --- tools/list ----------->  |',
    '  | <-- [ roll_dice ] ---------  |',
  ].join('\n'),
  question: outputQuestion,
  languages: listTheToolsStep.languages.map((side) =>
    side.language === 'typescript'
      ? { ...side, note: 'In TypeScript the tool is a plain object; its type comes later, in step 11.' }
      : side,
  ),
};

/** The questions of these steps, for the answers the catalogue draws. */
export const stepCaseQuestions = { bigQuestion, outputQuestion, listTheToolsQuestion };
