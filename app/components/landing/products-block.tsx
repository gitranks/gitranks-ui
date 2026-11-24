import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { FC } from 'react';

import {
  contributeCardOf,
  type HomeCardWords,
  type HomeProducts,
  learnCardOf,
  PRODUCTS_HEADING,
  PRODUCTS_LINE,
} from './products-block-words';

/** One card: the product's name with its mark, a title, one line and where it leads, in the same places in every state. */
const ProductCard: FC<{ card: HomeCardWords }> = ({ card }) => (
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
    <span className="text-lg font-semibold tracking-tight text-balance">{card.title}</span>
    <span className="min-h-5 text-sm text-muted-foreground">{card.line}</span>
    <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-medium text-link group-hover:underline">
      {card.action}
      <ArrowRight aria-hidden="true" className="size-4" />
    </span>
  </Link>
);

/**
 * The home page's block for Contribute and Learn: the heading, one line, and two cards of one size, Contribute on the
 * left. With no `products` (a visitor, or a read that failed) both cards promote their product; otherwise a card whose
 * product the person uses says what it has for them today. `now` words the next review.
 */
export const ProductsBlock: FC<{ products?: HomeProducts | null; now: Date }> = ({ products = null, now }) => (
  <section aria-labelledby="products" className="py-12 lg:py-16" data-products-block="">
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4">
      <div className="flex flex-col gap-2">
        <h2 id="products" className="m-0 text-2xl font-semibold tracking-tight text-balance md:text-3xl">
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
