import type { TranslationKey } from './i18n';

/**
 * The five members of the founding team, as the team supplied them.
 *
 * Names, organisations, photograph paths and profile URLs are proper nouns or
 * addresses: they are never translated and never invented. A professional
 * background is recorded only where the member supplied one, and it is kept
 * separate from `roleKey`, which is the job that person holds inside OmoNetTab.
 *
 * The photograph paths are the filenames the team delivered in
 * `public/images/team/`. `Estub.png` is that file's spelling of Etsub's name,
 * and `Boum.png` is the given name of the member listed as Nyak Buom.
 */
export type TeamMember = {
  id: string;
  name: string;
  /** The member's own organisation, where they asked for it to be shown. */
  organization?: string;
  photo: { src: string; width: number; height: number };
  roleKey: TranslationKey;
  backgroundKeys: TranslationKey[];
  linkedin?: string;
  portfolio?: string;
};

export const TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'newaz-nezif',
    name: 'Newaz Nezif',
    organization: 'OmoNetTab',
    photo: { src: '/images/team/Newaz.png', width: 210, height: 291 },
    roleKey: 'team.role.newaz',
    backgroundKeys: [],
    linkedin: 'https://www.linkedin.com/in/newaz-nezif-285439262/',
    portfolio: 'https://newaznezif.netlify.app/'
  },
  {
    id: 'abraham-eshtie',
    name: 'Abraham Eshtie',
    photo: { src: '/images/team/Abraham.png', width: 257, height: 357 },
    roleKey: 'team.role.abraham',
    backgroundKeys: ['team.background.journalist'],
    linkedin: 'https://www.linkedin.com/in/abrahamkeshtie/'
  },
  {
    id: 'nyak-buom',
    name: 'Nyak Buom',
    photo: { src: '/images/team/Boum.png', width: 216, height: 301 },
    roleKey: 'team.role.boum',
    backgroundKeys: [],
    linkedin: 'https://www.linkedin.com/in/buom-chuol-nyak-546b50329/'
  },
  {
    id: 'etsub-abraham',
    name: 'Etsub Abraham',
    photo: { src: '/images/team/Estub.png', width: 217, height: 302 },
    roleKey: 'team.role.etsub',
    backgroundKeys: ['team.background.publicProsecutor'],
    linkedin: 'https://www.linkedin.com/in/etsub-abraham-6b9788440/'
  },
  {
    id: 'tsion-neare',
    name: 'Tsion Neare',
    photo: { src: '/images/team/Tsion.png', width: 283, height: 282 },
    roleKey: 'team.role.tsion',
    backgroundKeys: ['team.background.psychologist', 'team.background.climateNonprofitManager'],
    linkedin: 'https://www.linkedin.com/in/tsionneare/'
  }
];
