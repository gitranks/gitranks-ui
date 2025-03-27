import * as React from "react";
import type { SVGProps } from "react";
const SvgPullRequest = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    {...props}
  >
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M18 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6M13 6h3a2 2 0 0 1 2 2v7M6 9v12"
    />
  </svg>
);
export default SvgPullRequest;
