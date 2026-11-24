import { connection, type NextRequest } from 'next/server';

import { skillsCardResponse } from '@/components/skills/skills-card-response';
import { loadSkillsCard } from '@/lib/skills/skills-card.data';

/**
 * The picture a posted link to a person's Skills page shows. Answered on request; its numbers come from the page's own
 * cached read, under the person's tag.
 */
export async function GET(req: NextRequest, { params }: RouteContext<'/profile/[login]/skills/card.png'>) {
  await connection();
  const { login } = await params;
  return skillsCardResponse(login, req.nextUrl.search, loadSkillsCard);
}
