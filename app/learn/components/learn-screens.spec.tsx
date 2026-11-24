import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

const { Diagram } = await import('@/components/workspace/blocks/diagram');
const { controlNames } = await import('@/lib/learn/__fixtures__/control-names');
const { ExampleQuestion } = await import('./example-question');
const { EXAMPLE_LESSON } = await import('@/lib/learn/example-lesson');
const { STEPS } = await import('@/lib/learn/__fixtures__/lesson');

describe("the front door's example question", () => {
  it('names its radio buttons by their text', () => {
    const html = renderToStaticMarkup(<ExampleQuestion />);
    expect(controlNames(html, 'radio')).toEqual(EXAMPLE_LESSON.question.options.map((option) => option.text));
  });
});

describe('code in lesson text', () => {
  it('keeps the spaces inside a code span, which can be the point of a question', async () => {
    const { RichText } = await import('@/components/workspace/blocks/rich-text');
    const html = renderToStaticMarkup(<RichText text="What does `'a  b'.replace(/ /g, '-')` return?" />);
    expect(html.replaceAll('&#x27;', "'")).toContain("'a  b'.replace(/ /g, '-')");
    expect(html).toMatch(/<code class="[^"]*whitespace-break-spaces/);
  });
});

describe('a diagram', () => {
  it('draws a box per node and an arrow per edge, from the layout, with its own arrow head', () => {
    const block = STEPS[1].blocks[2];
    const html = renderToStaticMarkup(<Diagram id="s2-2" nodes={block.nodes} edges={block.edges} label="Two keys" />);
    expect(html.match(/data-node=/g)).toHaveLength(5);
    expect(html.match(/data-edge=/g)).toHaveLength(4);
    expect(html).toContain('id="arrow-s2-2"');
    expect(html).toContain('marker-end="url(#arrow-s2-2)"');
    expect(html).toContain('aria-label="Two keys"');
    expect(html).toContain('fill="var(--warning-soft)"');
  });

  it('draws nothing without nodes', () => {
    expect(renderToStaticMarkup(<Diagram id="x" nodes={[]} edges={[]} label="" />)).toBe('');
  });
});
