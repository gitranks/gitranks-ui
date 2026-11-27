import Link from 'next/link';

import { BUILD_HOME_PATH } from '@/lib/build/paths';
import { LEARN_HOME_PATH } from '@/lib/learn/paths';
import { type LinePart, PRODUCT_NAMES } from '@/lib/skills/skills-figures';
import { WORKSPACE_PATHS } from '@/lib/workspace/paths';

/** Each product's landing, which its name in a line leads to. */
const LANDING = { CONTRIBUTE: WORKSPACE_PATHS.contribute, LEARN: LEARN_HOME_PATH, BUILD: BUILD_HOME_PATH } as const;

/** A line of words in which each product's name is a link to its landing. */
export function SkillsLine({ parts }: { parts: readonly LinePart[] }) {
  return (
    <>
      {parts.map((part, index) =>
        typeof part === 'string' ? (
          part
        ) : (
          <Link
            // The same product can be named twice in a line, never at the same place.
            key={index}
            href={LANDING[part.product]}
            prefetch={false}
            className="font-semibold text-link hover:underline"
          >
            {PRODUCT_NAMES[part.product]}
          </Link>
        ),
      )}
    </>
  );
}
