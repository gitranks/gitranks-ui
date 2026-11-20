'use client';

import { CircleHelp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

/** "How picks work": where the issues come from, in four lines, and Close. */
export function PicksDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" className="h-10 gap-1.5 px-2.5 font-semibold text-link max-sm:min-h-11">
          <CircleHelp aria-hidden="true" className="size-4" />
          How picks work
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" data-picks-dialog="">
        <DialogTitle>How picks work</DialogTitle>
        <DialogDescription asChild>
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-muted-foreground">
            <li>Issues come from active repos that handle outside pull requests.</li>
            <li>They are matched to your languages and topics.</li>
            <li>Maintainers agreed each one should be fixed.</li>
            <li>Skip one and it is not picked for you again. Size is shown where it is known.</li>
          </ul>
        </DialogDescription>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" className="min-h-10 px-4 font-semibold">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
