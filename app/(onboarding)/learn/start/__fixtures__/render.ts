import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';

/** Learn's flow pages, rendered in a spec: their words, and their tree with the server parts awaited. */

export const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .trim();

/** The element tree with every async server component awaited in place. */
export async function resolved(node: ReactNode): Promise<ReactNode> {
  if (Array.isArray(node)) return Promise.all(node.map(resolved));
  if (!isValidElement(node)) return node;
  const { type, props } = node as ReactElement<{ children?: ReactNode }>;
  if (typeof type === 'function' && type.constructor.name === 'AsyncFunction') {
    return resolved(await (type as (props: object) => Promise<ReactNode>)(props));
  }
  if (props.children === undefined) return node;
  return cloneElement(node as ReactElement<{ children?: ReactNode }>, { children: await resolved(props.children) });
}

/** Every element of `type` in a resolved tree, in children and in any prop that holds elements (a slot). */
export function elementsOf(node: ReactNode, type: unknown): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(node)) return node.flatMap((child) => elementsOf(child, type));
  if (!isValidElement(node)) return [];
  const element = node as ReactElement<Record<string, unknown>>;
  const inside = Object.values(element.props).flatMap((value) =>
    Array.isArray(value) || isValidElement(value) ? elementsOf(value as ReactNode, type) : [],
  );
  return [...(element.type === type ? [element] : []), ...inside];
}
