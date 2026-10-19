import type { HomepageSectionId, SiteSettings } from './types';
import { HOMEPAGE_SECTIONS } from './types';

/**
 * Site settings are stored, not compiled — so anything an administrator saves
 * has to be checked before it reaches the page. Text is kept as plain text and
 * rendered in normal React nodes, which means HTML in these fields is displayed
 * literally rather than executed. There is deliberately no rich-text or code
 * editor in the admin area.
 */

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export const DEFAULT_SITE_SETTINGS: Omit<SiteSettings, 'updatedAt'> = {
  siteName: 'OmoNetTab',
  tagline: 'Connecting Cultures and Commerce',
  heroTitle: 'Sell directly. Price transparently. Deliver together.',
  heroDescription:
    'OmoNetTab helps rural entrepreneurs, local producers, artisans, and community tourism providers in South Omo present their offerings and receive inquiries from potential customers.',
  announcementBar: { enabled: false, text: '' },
  featuredProductIds: [],
  featuredServiceIds: [],
  featuredProducerIds: [],
  homepageSections: HOMEPAGE_SECTIONS.map((id) => ({ id, visible: true })),
  contactEmail: '',
  contactPhone: '',
  addressNote: '',
  socialLinks: [],
  footerNote: '',
  accentColor: '#b2542a',
  isDemo: false
};

export type SettingsIssues = Record<string, string>;

/**
 * Picks black or white text for a filled accent surface. Without this an
 * administrator could choose a pale accent and render the announcement bar
 * unreadable, which would make the setting unsafe to expose.
 */
export function accentContrastColor(hex: string): '#ffffff' | '#111418' {
  if (!HEX_COLOR.test(hex)) return '#ffffff';
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i + 1, i + 3), 16) / 255);
  const linear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * linear(r!) + 0.7152 * linear(g!) + 0.0722 * linear(b!);
  return luminance > 0.45 ? '#111418' : '#ffffff';
}

/** Returns field -> message. An empty object means the patch is safe to save. */
export function validateSiteSettings(patch: Partial<SiteSettings>): SettingsIssues {
  const issues: SettingsIssues = {};
  const text = (value: string | undefined, label: string, max: number) =>
    typeof value === 'string' && value.length > max ? `${label} must be ${max} characters or fewer.` : undefined;

  const checks: [string, string | undefined][] = [
    ['siteName', text(patch.siteName, 'Site name', 60)],
    ['tagline', text(patch.tagline, 'Tagline', 160)],
    ['heroTitle', text(patch.heroTitle, 'Hero title', 120)],
    ['heroDescription', text(patch.heroDescription, 'Hero description', 600)],
    ['announcementBar', text(patch.announcementBar?.text, 'Announcement', 160)],
    ['contactEmail', text(patch.contactEmail, 'Contact email', 200)],
    ['contactPhone', text(patch.contactPhone, 'Contact phone', 40)],
    ['addressNote', text(patch.addressNote, 'Location note', 240)],
    ['footerNote', text(patch.footerNote, 'Footer note', 240)]
  ];
  for (const [key, message] of checks) if (message) issues[key] = message;

  if (patch.siteName !== undefined && !patch.siteName.trim()) issues.siteName = 'A site name is required.';
  if (patch.accentColor !== undefined && !HEX_COLOR.test(patch.accentColor)) {
    issues.accentColor = 'Use a hex colour such as #b2542a.';
  }
  if (patch.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(patch.contactEmail)) {
    issues.contactEmail = 'That does not look like an email address.';
  }
  if (patch.socialLinks) {
    patch.socialLinks.forEach((link, index) => {
      if (!/^(https?:)\/\//i.test(link.url)) {
        issues.socialLinks = `Link ${index + 1} must start with http:// or https://.`;
      }
      if (!link.label.trim()) issues.socialLinks = `Link ${index + 1} needs a label.`;
    });
  }
  if (patch.homepageSections) {
    const unknown = patch.homepageSections.filter((s) => !HOMEPAGE_SECTIONS.includes(s.id));
    if (unknown.length > 0) issues.homepageSections = 'Unknown homepage section: ' + unknown.map((u) => u.id).join(', ');
  }
  return issues;
}

export function sectionIds(settings: SiteSettings): HomepageSectionId[] {
  return settings.homepageSections.filter((s) => s.visible).map((s) => s.id);
}

export function isSectionVisible(settings: SiteSettings, id: HomepageSectionId): boolean {
  const entry = settings.homepageSections.find((s) => s.id === id);
  // A section missing from the stored order defaults to visible, so a partially
  // configured row can never blank out the homepage.
  return entry ? entry.visible : true;
}
