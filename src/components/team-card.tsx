import { getT } from '@/lib/i18n/server';
import type { TeamMember } from '@/lib/team';

/**
 * One team member. The avatar is initials in a plain circle on purpose: no
 * photograph was supplied for anyone on the team, and an invented portrait or a
 * stock photo would present a fact about a person that nobody has confirmed.
 */
export function TeamMemberCard({ member, compact = false }: { member: TeamMember; compact?: boolean }) {
  const t = getT();
  return (
    <article className="h-full border border-ink-100 rounded-2xl bg-white p-5 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="w-12 h-12 shrink-0 rounded-full bg-clay-50 border border-clay-200 text-clay-700 grid place-items-center text-base font-bold"
        >
          {member.initials}
        </span>
        <div className="min-w-0">
          <h3 className="font-semibold text-ink-900">{member.name}</h3>
          <p className="text-sm text-clay-700 font-medium">{t(member.roleKey)}</p>
        </div>
      </div>
      {!compact && <p className="text-sm text-ink-700">{t(member.contributionKey)}</p>}
    </article>
  );
}
