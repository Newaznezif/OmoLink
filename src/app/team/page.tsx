import { getT } from '@/lib/i18n/server';
import { Section } from '@/components/ui';
import { TeamMemberCard } from '@/components/team-card';
import { TEAM_MEMBERS } from '@/lib/team';

export const dynamic = 'force-dynamic';

export default function TeamPage() {
  const t = getT();
  return (
    <Section
      title={t('team.title')}
      description={t('team.description')}
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TEAM_MEMBERS.map((member) => (
          <TeamMemberCard key={member.id} member={member} />
        ))}
      </div>
      <p className="mt-6 text-sm text-ink-500 max-w-3xl">{t('team.photoNote')}</p>
    </Section>
  );
}
