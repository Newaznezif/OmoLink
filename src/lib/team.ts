import type { TranslationKey } from './i18n';

/**
 * The five members of the founding team, exactly as the team supplied them.
 *
 * Names are proper nouns and are never translated. The role and the contribution
 * statement go through the dictionary like any other interface text, so the page
 * follows the site language. No surname, credential, biography, contact detail or
 * photograph is recorded here, because none was supplied — the avatar is initials
 * only.
 */
export type TeamMember = {
  id: string;
  name: string;
  initials: string;
  roleKey: TranslationKey;
  contributionKey: TranslationKey;
};

export const TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'newaz-nezif',
    name: 'Newaz Nezif',
    initials: 'NN',
    roleKey: 'team.role.newaz',
    contributionKey: 'team.contribution.newaz'
  },
  {
    id: 'tsion',
    name: 'Tsion',
    initials: 'T',
    roleKey: 'team.role.tsion',
    contributionKey: 'team.contribution.tsion'
  },
  {
    id: 'abraham',
    name: 'Abraham',
    initials: 'A',
    roleKey: 'team.role.abraham',
    contributionKey: 'team.contribution.abraham'
  },
  {
    id: 'etsub',
    name: 'Etsub',
    initials: 'E',
    roleKey: 'team.role.etsub',
    contributionKey: 'team.contribution.etsub'
  },
  {
    id: 'boum',
    name: 'Boum',
    initials: 'B',
    roleKey: 'team.role.boum',
    contributionKey: 'team.contribution.boum'
  }
];
