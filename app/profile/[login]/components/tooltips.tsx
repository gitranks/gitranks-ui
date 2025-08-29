import { RANK_NAME } from '@/badge/badge.consts';

export const PersonaTooltip = () => (
  <div className="max-w-80">
    The Persona reflects where the profile ranks best:
    <ul className="list-disc pl-4">
      <li>
        <b>Creator:</b> Top rank comes from {RANK_NAME.s}
      </li>
      <li>
        <b>Contributor:</b> Top rank is in {RANK_NAME.c}
      </li>
      <li>
        <b>Influencer:</b> Top rank is in {RANK_NAME.f}
      </li>
    </ul>
  </div>
);

export const GlobalRankTooltip = () => (
  <div className="max-w-72">
    This is your <b>highest rank</b> among {RANK_NAME.s}, {RANK_NAME.c}, and {RANK_NAME.f}. Go to the <b>Ranks</b> tab
    to see detailed explanations of each ranking.
  </div>
);
