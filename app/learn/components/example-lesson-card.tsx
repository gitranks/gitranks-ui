import { Diagram } from './diagram';
import { ExampleQuestion } from './example-question';
import { Badge } from '@/components/ui/badge';
import { EXAMPLE_LESSON } from '@/lib/learn/example-lesson';
import { cn } from '@/lib/utils';

const EYEBROW = 'text-xs font-semibold tracking-wider text-muted-foreground uppercase';

/**
 * One step of the example lesson, with its diagram and its question to try: Learn's front door and the home page's
 * Learn section show it. Static, from a fixed lesson. `heading`: the card's title level on the page.
 */
export function ExampleLessonCard({
  heading: Heading = 'h2',
  diagramId = 'learn-example',
}: {
  heading?: 'h2' | 'h3';
  diagramId?: string;
}) {
  const { subject, parts, part, title, diagram } = EXAMPLE_LESSON;
  return (
    <div className="relative overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-4 py-3">
        <Heading className="flex items-baseline gap-2">
          <span className={EYEBROW}>Example lesson</span>{' '}
          <span className="text-sm text-muted-foreground">about 10 minutes</span>
        </Heading>
        <span className="font-mono text-xs text-muted-foreground">{subject}</span>
      </div>
      <div className="flex flex-col gap-3 p-4">
        <ul aria-label="The lesson's parts" className="flex flex-wrap gap-1.5">
          {parts.map((name) => (
            <li key={name}>
              <Badge
                variant="outline"
                className={cn(name === part && 'border-transparent bg-brand-soft text-brand-soft-foreground')}
                aria-current={name === part ? 'step' : undefined}
              >
                {name}
              </Badge>
            </li>
          ))}
        </ul>
        <span className="font-semibold text-foreground">{title}</span>
        <figure className="m-0 flex flex-col gap-2.5 rounded-lg border bg-muted/40 p-4">
          <Diagram id={diagramId} nodes={diagram.nodes} edges={diagram.edges} label={diagram.label} />
          <figcaption className="text-xs text-muted-foreground">
            Every step has a picture or the code, and a few lines of text.
          </figcaption>
        </figure>
      </div>
      <ExampleQuestion />
    </div>
  );
}
