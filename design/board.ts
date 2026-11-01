import type { Screen, ScreenState } from './registry';

/** The board's path on the canvas, under `project/`. */
export const boardPathOf = (screen: Screen, state: ScreenState) =>
  `current/${screen.area}/${screen.id}--${state.id}.dc.html`;

/** The stylesheet every current board loads: the app's own, built from this commit. */
export const STYLESHEET = 'current/gitranks.css';

// A boolean attribute React writes as `x=""` reads as false once the canvas turns markup back into React props.
const BOOLEAN_ATTRIBUTES = /\s(hidden|disabled|checked|open|selected|readonly|required|multiple)=""/g;

/** Markup the canvas reads as written: booleans spelled out, and no `{{` it would take for a hole. */
export const canvasSafe = (html: string) =>
  html.replace(BOOLEAN_ATTRIBUTES, ' $1="$1"').replaceAll('{{', '{&#123;').replaceAll('}}', '}&#125;');

const escapeHtml = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

/** One board: the state's markup in the app's own root, fonts and stylesheet, as a Design canvas artboard. */
export function boardOf(screen: Screen, state: ScreenState, markup: string, commit: string): string {
  const width = state.width ?? 1280;
  const depth = boardPathOf(screen, state).split('/').length - 1;
  const stylesheet = `${'../'.repeat(depth)}${STYLESHEET}`;
  const props = JSON.stringify({ $preview: { width, height: state.height } });
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(`${screen.title} · ${state.title}`)}</title>
<script src="./support.js"></script>
<link rel="stylesheet" href="${stylesheet}">
</head>
<body>
<x-dc>
<helmet>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;family=JetBrains+Mono:wght@400;500;600;700&amp;display=swap">
<style>body{margin:0}</style>
</helmet>
<div class="bg-background text-foreground font-sans antialiased" style="--font-inter: Inter; --font-jetbrains-mono: 'JetBrains Mono'; min-height: 100%" data-design-screen="${screen.id}" data-design-state="${state.id}" data-design-commit="${commit}">
${canvasSafe(markup)}
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='${props}'>
class Component extends DCLogic {
  renderVals() { return {}; }
}
</script>
</body>
</html>
`;
}
