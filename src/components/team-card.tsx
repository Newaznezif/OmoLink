import { getT } from '@/lib/i18n/server';
import type { TeamMember } from '@/lib/team';

/**
 * The two profile glyphs, drawn inline the way the footer draws its social icons:
 * no icon package is installed, and one 24x24 path is cheaper than a dependency.
 */
const LINKEDIN_PATH =
  'M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7 0h3.8v1.7h.05A4.2 4.2 0 0 1 17.5 8.7c3.2 0 3.8 2 3.8 4.8V21h-4v-6.3c0-1.5-.3-2.6-1.7-2.6-1.4 0-1.9 1.1-1.9 2.5V21h-3.7V9Z';

const GLOBE_PATH = 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2.2c1.5 1.9 2.4 4.2 2.5 6.8h-5c.1-2.6 1-4.9 2.5-6.8ZM4.3 9.9h3.4a15 15 0 0 1 1.2-5.3 8 8 0 0 0-4.6 5.3Zm8.6-5.3a15 15 0 0 1 1.2 5.3h3.4a8 8 0 0 0-4.6-5.3ZM4.3 14.1h3.4a15 15 0 0 1-1.2 5.3 8 8 0 0 0-2.2-5.3Zm4.6 0h6.2c-.1 2.6-1 4.9-2.5 6.8a12 12 0 0 1-3.7-6.8Zm7.6 5.3a15 15 0 0 1 1.2-5.3h3.4a8 8 0 0 0-4.6 5.3Z';

type ProfileLink = { href: string; label: string; path: string; stroke: boolean };

/**
 * One founding-team member: photograph, name, the role they hold here, the
 * professional background they supplied, and their own profile links.
 *
 * The photograph is the member's own file, cropped by a fixed 4:5 frame with
 * `object-cover` so five differently-framed headshots read as one set without
 * any of them being stretched. `width`/`height` carry the file's real pixel
 * size so the browser can reserve the space before the image arrives.
 */
export function TeamMemberCard({ member, compact = false }: { member: TeamMember; compact?: boolean }) {
  const t = getT();

  const links: ProfileLink[] = [];
  if (member.linkedin) {
    links.push({
      href: member.linkedin,
      label: t('team.linkedinAria', { name: member.name }),
      path: LINKEDIN_PATH,
      stroke: false
    });
  }
  if (member.portfolio) {
    links.push({
      href: member.portfolio,
      label: t('team.portfolioAria', { name: member.name }),
      path: GLOBE_PATH,
      stroke: true
    });
  }

  const backgrounds = compact ? [] : member.backgroundKeys;

  return (
    <article className="h-full border border-ink-100 rounded-2xl bg-white overflow-hidden flex flex-col">
      {/* Plain <img> rather than next/image: the image optimiser needs `sharp`,
          which is not installed here, and these are five small static files. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={member.photo.src}
        alt={t('team.photoAlt', { name: member.name })}
        width={member.photo.width}
        height={member.photo.height}
        loading="lazy"
        decoding="async"
        className="w-full aspect-[4/5] object-cover object-center bg-clay-50"
      />
      <div className="p-5 flex flex-col gap-2 flex-1">
        <div className="min-w-0">
          <h3 className="font-semibold text-ink-900">{member.name}</h3>
          {member.organization && (
            <p className="text-xs uppercase tracking-wide text-ink-500 font-semibold">{member.organization}</p>
          )}
        </div>
        <p className="text-sm text-clay-700 font-medium">{t(member.roleKey)}</p>
        {backgrounds.length > 0 && (
          <div className="text-sm text-ink-700">
            <p className="text-xs uppercase tracking-wide text-ink-500 font-semibold">
              {t('team.backgroundLabel')}
            </p>
            {/* Joined with locale-neutral punctuation so the list reads the same
                whatever language the individual roles are translated into. */}
            <p>{backgrounds.map((key) => t(key)).join(' · ')}</p>
          </div>
        )}
        {links.length > 0 && (
          <ul className="mt-auto pt-3 flex items-center gap-2">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={link.label}
                  title={link.label}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-ink-100 text-ink-700 hover:bg-clay-50 hover:text-clay-800"
                >
                  {link.stroke ? (
                    <svg viewBox="0 0 24 24" aria-hidden className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.7}>
                      <path d={link.path} />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden className="w-5 h-5" fill="currentColor">
                      <path d={link.path} />
                    </svg>
                  )}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
