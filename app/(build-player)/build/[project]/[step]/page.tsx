import { BUILD_PLACEHOLDER_METADATA, BuildPlaceholder } from '@/components/build/build-placeholder';

/** A step, until its page is built: it has the strip, and no bar. */
export const metadata = BUILD_PLACEHOLDER_METADATA;

export default function BuildStepPage() {
  return <BuildPlaceholder title="A step" />;
}
