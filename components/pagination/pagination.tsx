import { FC } from 'react';

import {
  Pagination as PaginationComponent,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '../ui/pagination';

type PaginationProps = {
  prev?: string;
  next?: string;
};

export const Pagination: FC<PaginationProps> = ({ prev, next }) => {
  if (!prev && !next) {
    return null;
  }

  return (
    <PaginationComponent>
      <PaginationContent>
        {!!prev && (
          <PaginationItem>
            <PaginationPrevious href={prev} />
          </PaginationItem>
        )}
        {!!next && (
          <PaginationItem>
            <PaginationNext href={next} />
          </PaginationItem>
        )}
      </PaginationContent>
    </PaginationComponent>
  );
};
