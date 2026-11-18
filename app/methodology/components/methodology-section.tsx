import type { ReactNode } from 'react';

/** A section of a methodology page: its heading and its paragraphs, tables or lists. */
export const MethodologySection = ({ id, title, children }: { id?: string; title: string; children: ReactNode }) => (
  <section id={id} className="flex scroll-mt-20 flex-col gap-3">
    <h2 className="text-xl font-semibold">{title}</h2>
    {children}
  </section>
);
