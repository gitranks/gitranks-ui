import type { Metadata, Route } from 'next';
import { notFound } from 'next/navigation';

import { JsonLd } from '@/components/json-ld/json-ld';
import { WalkthroughNotHere } from '@/components/learn/walkthrough/walkthrough-not-here';
import {
  AboutThisFix,
  factsOf,
  WalkthroughHead,
  WalkthroughPartArticle,
  walkthroughCrumbsOf,
} from '@/components/learn/walkthrough/walkthrough-parts';
import { PublicWalkthroughPlayer } from '@/components/learn/walkthrough/walkthrough-player';
import { LEARN_ISSUES_PAGE_BUILT } from '@/lib/learn/built-pages';
import { loadFixPage } from '@/lib/learn/fix-page.data';
import { LEARN_ISSUES_PATH, learnLessonRealWorldPath } from '@/lib/learn/paths';
import { learnWalkthroughJsonLd, learnWalkthroughMetadata } from '@/lib/learn/seo/walkthrough';
import { fixRefOf, playerQuestionOf, type Walkthrough } from '@/lib/learn/walkthrough';
import { loadWalkthrough } from '@/lib/learn/walkthrough.data';

/**
 * A fix's public walkthrough, open to everyone and indexed: the same for everyone, read with no session and
 * cached under the fix's tag. Every part is in the page's HTML. The page streams, so a fix with nothing there gets its
 * real status from the proxy, which asks first (`lib/learn/fix-gate.ts`); a walkthrough the read does not bring (paused,
 * not public yet, a read that failed) says so in place.
 */
export const instant = false;

type Params = PageProps<'/learn/fixes/[owner]/[repo]/[number]/walkthrough'>['params'];

async function readOf(params: Params) {
  const { owner, repo, number } = await params;
  const pr = fixRefOf(owner, repo, number);
  return { pr, walkthrough: pr ? await loadWalkthrough(pr) : null };
}

/** Where "Finish the walkthrough" leads when the person's own list names no issue: the issues like this one. */
const issuesLikeThisOf = (walkthrough: Walkthrough): Route =>
  LEARN_ISSUES_PAGE_BUILT && walkthrough.lesson ? learnLessonRealWorldPath(walkthrough.lesson.slug) : LEARN_ISSUES_PATH;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  return learnWalkthroughMetadata((await readOf(params)).walkthrough);
}

export default async function WalkthroughPage({ params }: { params: Params }) {
  const { pr, walkthrough } = await readOf(params);
  if (!pr) notFound();
  if (!walkthrough) return <WalkthroughNotHere pr={pr} />;
  // How the fix stands, for the button to its own page: none on a failed read, so no button promises the wrong page.
  const fix = await loadFixPage({ nameWithOwner: walkthrough.repo, number: walkthrough.number }).catch(() => null);
  const count = walkthrough.parts.length;
  return (
    <>
      <JsonLd payloads={learnWalkthroughJsonLd(walkthrough)} />
      <PublicWalkthroughPlayer
        pr={{ nameWithOwner: walkthrough.repo, number: walkthrough.number }}
        version={walkthrough.version}
        crumbs={walkthroughCrumbsOf(walkthrough)}
        head={<WalkthroughHead facts={factsOf(walkthrough)} />}
        articles={walkthrough.parts.map((part, index) => (
          <WalkthroughPartArticle
            key={part.id}
            heading={part.heading}
            blocks={part.blocks}
            index={index}
            count={count}
          />
        ))}
        questions={walkthrough.parts.map((part) => playerQuestionOf(part.question, true))}
        about={<AboutThisFix walkthrough={walkthrough} fix={fix} />}
        next={issuesLikeThisOf(walkthrough)}
      />
    </>
  );
}
