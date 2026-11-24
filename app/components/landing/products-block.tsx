import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { FC } from 'react';

import {
  contributeCardOf,
  HOME_PROMOS,
  type HomeCardWords,
  type HomeProducts,
  learnCardOf,
  PRODUCTS_HEADING,
  PRODUCTS_LINE,
} from './products-block-words';

/**
 * One of a card's parts: the words shown, with the promotion's words under them in the same grid cell, hidden from
 * sight and from screen readers, so the part is as tall as the taller of the two and a card keeps its size at every
 * width when a person's own words replace the promotion's.
 */
const Stacked: FC<{ shown: string; promo: string; className: string }> = ({ shown, promo, className }) => (
  <span className={`grid ${className}`}>
    <span className="col-start-1 row-start-1">{shown}</span>
    {promo !== shown ? (
      <span className="invisible col-start-1 row-start-1" aria-hidden="true" data-promo-layer="">
        {promo}
      </span>
    ) : null}
  </span>
);

/** One card: the product's name with its mark, a title, one line and where it leads, in the same places in every state. */
const ProductCard: FC<{ card: HomeCardWords }> = ({ card }) => {
  const promo = HOME_PROMOS[card.product];
  return (
    <Link
      href={card.href}
      prefetch={false}
      className="group flex min-h-[176px] min-w-0 flex-col gap-2 rounded-xl border bg-card p-5 text-foreground no-underline transition-colors hover:border-foreground/30 focus-visible:outline-2 focus-visible:outline-offset-2"
      data-home-card={card.product}
      data-personal={card.personal ? '' : undefined}
    >
      <span className="flex items-center gap-2">
        <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{card.name}</span>
        {card.mark ? (
          <span className="rounded-sm bg-brand-soft px-1.5 text-[11px] font-semibold tracking-wide text-brand-soft-foreground uppercase">
            {card.mark}
          </span>
        ) : null}
      </span>
      <Stacked shown={card.title} promo={promo.title} className="text-lg font-semibold tracking-tight text-balance" />
      <Stacked shown={card.line} promo={promo.line} className="min-h-5 text-sm text-muted-foreground" />
      <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-medium text-link group-hover:underline">
        <Stacked shown={card.action} promo={promo.action} className="" />
        <ArrowRight aria-hidden="true" className="size-4" />
      </span>
    </Link>
  );
};

/**
 * The home page's block for Contribute and Learn: the heading, one line, and two cards of one size, Contribute on the
 * left. With no `products` (a visitor, or a read that failed) both cards promote their product; otherwise a card whose
 * product the person uses says what it has for them today. `now` words the next review. `id` is the heading's, for a
 * board that draws the block more than once.
 */
export const ProductsBlock: FC<{ products?: HomeProducts | null; now: Date; id?: string }> = ({
  products = null,
  now,
  id = 'products',
}) => (
  <section aria-labelledby={id} className="py-12 lg:py-16" data-products-block="">
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4">
      <div className="flex flex-col gap-2">
        <h2 id={id} className="m-0 text-2xl font-semibold tracking-tight text-balance md:text-3xl">
          {PRODUCTS_HEADING}
        </h2>
        <p className="m-0 max-w-prose text-muted-foreground">{PRODUCTS_LINE}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ProductCard card={contributeCardOf(products)} />
        <ProductCard card={learnCardOf(products, now)} />
      </div>
    </div>
  </section>
);
