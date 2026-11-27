import type { BuildStepPage } from '../types';
import { mcpServerStep } from './project';
import type { LearnQuestion } from '@/lib/workspace/learn-question';

/*
 * Step 7 of the first project, "List the tools", as the approved designs show it, in both languages: one file
 * changed, 10 lines added and 1 removed in TypeScript.
 */

/** The step's question, with its key and reasons: a step's question is public. */
export const listTheToolsQuestion: LearnQuestion = {
  id: 'list-the-tools',
  type: 'PICK_ONE',
  prompt: 'What does your agent read to decide when to use roll_dice?',
  example: null,
  visual: null,
  codes: [],
  content: {
    options: [
      {
        text: 'Only the name of the tool',
        right: false,
        why: 'The name is how the agent calls the tool. A name alone rarely says when to use it.',
      },
      {
        text: 'The description in the list',
        right: true,
        why: 'The description is written for the agent. It is the only place that says what the tool is for, so a clear one makes an agent pick the right tool.',
      },
      {
        text: 'The code of the tool',
        right: false,
        why: 'The agent never sees your code. It only sees what the list tells it.',
      },
    ],
  },
};

const TS_BEFORE = `import { readMessages, send } from "./io";

function handle(msg: Message) {
  if (msg.method === "initialize") {
    return reply(msg.id, {
      protocolVersion: msg.params.protocolVersion,
      capabilities: {},
      serverInfo: { name: "my-server", version: "0.1.0" },
    });
  }
  return fail(msg.id, -32601, "Method not found");
}
`;

const TS_AFTER = `import { readMessages, send } from "./io";

const ROLL_DICE = {
  name: "roll_dice",
  description: "Roll a dice and return a number from 1 to 6.",
  inputSchema: { type: "object", properties: {} },
};

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
  return fail(msg.id, -32601, "Method not found");
}
`;

const TS_DIFF = `--- a/server.ts
+++ b/server.ts
@@ -1,12 +1,21 @@
 import { readMessages, send } from "./io";

+const ROLL_DICE = {
+  name: "roll_dice",
+  description: "Roll a dice and return a number from 1 to 6.",
+  inputSchema: { type: "object", properties: {} },
+};
+
 function handle(msg: Message) {
   if (msg.method === "initialize") {
     return reply(msg.id, {
       protocolVersion: msg.params.protocolVersion,
-      capabilities: {},
+      capabilities: { tools: {} },
       serverInfo: { name: "my-server", version: "0.1.0" },
     });
   }
+  if (msg.method === "tools/list") {
+    return reply(msg.id, { tools: [ROLL_DICE] });
+  }
   return fail(msg.id, -32601, "Method not found");
 }
`;

const PY_AFTER = `from io_lines import read_messages, send

ROLL_DICE = {
    "name": "roll_dice",
    "description": "Roll a dice and return a number from 1 to 6.",
    "inputSchema": {"type": "object", "properties": {}},
}


def handle(msg):
    if msg["method"] == "initialize":
        return reply(msg["id"], {
            "protocolVersion": msg["params"]["protocolVersion"],
            "capabilities": {"tools": {}},
            "serverInfo": {"name": "my-server", "version": "0.1.0"},
        })
    if msg["method"] == "tools/list":
        return reply(msg["id"], {"tools": [ROLL_DICE]})
    return fail(msg["id"], -32601, "Method not found")
`;

const PY_DIFF = `--- a/server.py
+++ b/server.py
@@ -1,11 +1,19 @@
 from io_lines import read_messages, send

+ROLL_DICE = {
+    "name": "roll_dice",
+    "description": "Roll a dice and return a number from 1 to 6.",
+    "inputSchema": {"type": "object", "properties": {}},
+}
+

 def handle(msg):
     if msg["method"] == "initialize":
         return reply(msg["id"], {
             "protocolVersion": msg["params"]["protocolVersion"],
-            "capabilities": {},
+            "capabilities": {"tools": {}},
             "serverInfo": {"name": "my-server", "version": "0.1.0"},
         })
+    if msg["method"] == "tools/list":
+        return reply(msg["id"], {"tools": [ROLL_DICE]})
     return fail(msg["id"], -32601, "Method not found")
`;

const IO_TS = `export function* readMessages() {}
export function send(message: unknown) {
  process.stdout.write(\`\${JSON.stringify(message)}\\n\`);
}
`;

/** The code of the step before, for a page that shows a file as it was. */
export const LIST_THE_TOOLS_TS_BEFORE = TS_BEFORE;

/** "List the tools", whole, in both languages. */
export const listTheToolsStep: BuildStepPage = {
  project: { slug: 'mcp-server', name: 'Build an MCP server' },
  step: mcpServerStep(7),
  of: 16,
  part: null,
  say: [
    'Before an agent uses a server, it asks what the server can do. That question is the message `tools/list`. Until now our server answered it with "Method not found", so your agent saw a server with nothing in it.',
    'This step adds one tool to the answer: `roll_dice`. A tool in the list has three parts: a name the agent calls it by, a description the agent reads to decide when to use it, and the shape of its input. In the hello message we also say that this server has tools.',
    'The tool can not run yet. That is the next step.',
  ].join('\n\n'),
  more: [
    'An agent never guesses what a server offers. Right after the hello message it asks for the list, and it keeps that list until the server says it changed.',
    'The description matters more than it looks. It is the one text written for the agent, so write it the way you would explain the tool to a new teammate.',
  ].join('\n\n'),
  play: [
    'Ask your agent which tools your server has. It should name one.',
    'Ask it to use the tool. It will try and fail, and that is right: we list the tool but can not run it yet.',
    'In the prompt you built in step 3, send the message yourself and read the raw answer.',
  ],
  sketch: null,
  question: listTheToolsQuestion,
  languages: [
    {
      language: 'typescript',
      note: null,
      commit: '3f2c9a1e8b7d6c5f4e3d2c1b0a9f8e7d6c5b4a39',
      changed: [{ path: 'server.ts', status: 'changed', diff: TS_DIFF }],
      files: [
        { path: 'io.ts', text: IO_TS },
        { path: 'server.ts', text: TS_AFTER },
      ],
    },
    {
      language: 'python',
      note: 'In Python the list is a plain dict, and json.dumps writes it as the same JSON.',
      commit: '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b',
      changed: [{ path: 'server.py', status: 'changed', diff: PY_DIFF }],
      files: [{ path: 'server.py', text: PY_AFTER }],
    },
  ],
  before: mcpServerStep(6),
  after: mcpServerStep(8),
};

/** The first step: nothing before it. */
export const firstStep: BuildStepPage = {
  ...listTheToolsStep,
  step: mcpServerStep(1),
  before: null,
  after: mcpServerStep(2),
};
