import type { Element, Root as HastRoot } from 'hast';
import type { Image, Root as MdastRoot } from 'mdast';
import ReactMarkdown, { type Components } from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import { SKIP, visit } from 'unist-util-visit';

import type { ContributeProofFile } from '@/lib/contribute/contribute.types';
import { proofImageSrcOf, proofImageSrcsOf } from '@/lib/contribute/proof';

/**
 * The proof's section as the pull request will show it, from the agent's Markdown (untrusted): rendered, never set as
 * HTML. Raw HTML is parsed only to be sanitized: `<details>`, `<summary>` and `<br>` stay with Markdown's own elements,
 * everything else goes. `proof:<slot>` images become the page's own route for that screenshot; any other image goes.
 */

/** Markdown's own elements, GitHub's flavour, and the three tags the agent may write. */
const TAGS = [
  'a',
  'blockquote',
  'br',
  'code',
  'del',
  'details',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'img',
  'input',
  'li',
  'ol',
  'p',
  'pre',
  'strong',
  'summary',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'ul',
];

const SCHEMA = {
  ...defaultSchema,
  tagNames: TAGS,
  attributes: {
    a: ['href', 'title'],
    img: ['src', 'alt', 'title'],
    code: [['className', /^language-[\w-]+$/]],
    input: [['type', 'checkbox'], ['disabled', true], 'checked'],
    li: [['className', 'task-list-item']],
    ul: [['className', 'contains-task-list']],
    ol: ['start'],
    td: ['align'],
    th: ['align'],
    details: ['open'],
  },
  protocols: { href: ['http', 'https', 'mailto'], src: ['http', 'https'] },
};

/** `proof:<slot>` images to the screenshot's route, before anything else reads the URL; others left out. */
function remarkProofImages(proofId: string, slots: ReadonlySet<number>) {
  return () => (tree: MdastRoot) => {
    visit(tree, 'image', (node: Image, index, parent) => {
      const src = proofImageSrcOf(node.url, proofId, slots);
      if (src) {
        node.url = src;
        return;
      }
      if (parent && typeof index === 'number') {
        parent.children.splice(index, 1);
        return [SKIP, index];
      }
    });
  };
}

/**
 * After sanitizing: an image whose source is not exactly one of this proof's screenshots goes (`//host/…` is no
 * protocol to block, and `…/files/../x` no slot of ours).
 */
function rehypeOnlyProofImages(allowed: ReadonlySet<string>) {
  return () => (tree: HastRoot) => {
    visit(tree, 'element', (node: Element, index, parent) => {
      if (node.tagName !== 'img') return;
      const src = typeof node.properties?.src === 'string' ? node.properties.src : '';
      if (allowed.has(src) || !parent || typeof index !== 'number') return;
      parent.children.splice(index, 1);
      return [SKIP, index];
    });
  };
}

const COMPONENTS: Components = {
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="text-link break-words">
      {children}
    </a>
  ),
  img: ({ src, alt }) =>
    typeof src === 'string' ? (
      // The screenshot is read per request for its own user: no image optimizer in between.
      <img src={src} alt={alt ?? ''} loading="lazy" className="max-h-96 max-w-full rounded-md border" />
    ) : null,
  pre: ({ children }) => (
    <pre className="overflow-x-auto rounded-md bg-muted px-3 py-2 font-mono text-xs leading-normal">{children}</pre>
  ),
  details: ({ children, open }) => (
    <details open={open} className="rounded-md border bg-muted/40 px-3 py-2">
      {children}
    </details>
  ),
  summary: ({ children }) => <summary className="cursor-pointer font-medium">{children}</summary>,
  h2: ({ children }) => <h3 className="text-base font-semibold">{children}</h3>,
  h3: ({ children }) => <h4 className="text-sm font-semibold">{children}</h4>,
  ul: ({ children }) => <ul className="flex list-disc flex-col gap-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="flex list-decimal flex-col gap-1 pl-5">{children}</ol>,
};

export function ProofPreview({
  proofId,
  heading,
  markdown,
  files,
}: {
  proofId: string;
  heading: string;
  markdown: string;
  files: ContributeProofFile[];
}) {
  const slots = new Set(files.map(({ slot }) => slot));
  return (
    <div
      className="flex min-w-0 flex-col gap-3 rounded-lg border bg-background p-4 text-sm break-words"
      data-proof-preview=""
    >
      <span className="font-mono text-xs text-muted-foreground">Pull request description · {heading}</span>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkProofImages(proofId, slots)]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, SCHEMA], rehypeOnlyProofImages(proofImageSrcsOf(proofId, slots))]}
        components={COMPONENTS}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
