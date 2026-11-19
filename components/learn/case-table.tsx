import { RichText } from './rich-text';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

/**
 * A step's table of cases: heads in small caps, each cell plain text with `code` spans, and the row the step is about
 * ringed (said to a screen reader too). Below 520px it scrolls sideways in its own box.
 */
export function CaseTable({
  columns,
  rows,
  ring,
}: {
  columns: readonly string[];
  rows: readonly (readonly string[])[];
  ring: number | null;
}) {
  if (!columns.length || !rows.length) return null;
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Table className="min-w-[520px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((column, index) => (
              // Columns never move: the index is the column.
              <TableHead
                key={index}
                className="h-9 px-4 text-xs font-semibold tracking-wider text-muted-foreground uppercase"
              >
                {column}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => {
            const ringed = index === ring;
            return (
              // Rows never move: the index is the row.
              <TableRow
                key={index}
                data-ring={ringed || undefined}
                className={cn('hover:bg-transparent', ringed && 'ring-1 ring-primary ring-inset')}
              >
                {columns.map((_, at) => (
                  <TableCell key={at} className="px-4 py-2.5 align-top whitespace-normal text-foreground/90">
                    <RichText text={row[at] ?? ''} />
                    {ringed && at === 0 ? <span className="sr-only"> (the case this step is about)</span> : null}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
