import type {
  AccountKind,
  AvailabilityStatus,
  AuditLogEntry,
  Category,
  CollectiveOpportunity,
  ContactMethod,
  ContactMessage,
  GroupContribution,
  Inquiry,
  InquiryEvent,
  InquiryStatus,
  LanguageCode,
  Listing,
  ListingImage,
  ListingKind,
  ListingReport,
  Money,
  Payment,
  PaymentEvent,
  PaymentProviderId,
  PaymentStatus,
  ProducerGroup,
  ProducerType,
  Profile,
  Review,
  Role,
  SiteSettings,
  TourismMeta,
  UnitOfSale,
  VerificationReview,
  VerificationStatus
} from '../types';
import { HOMEPAGE_SECTIONS } from '../types';
import { isThemePreference } from '../theme';
import { DEFAULT_SITE_SETTINGS } from '../settings';
import type {
  AuditLogRow,
  CategoryRow,
  ContactMessageRow,
  ContributionRow,
  GroupMemberRow,
  InquiryEventRow,
  InquiryRow,
  ListingImageRow,
  ListingReportRow,
  ListingWithImagesRow,
  OpportunityRow,
  PaymentEventRow,
  PaymentRow,
  ProducerGroupRow,
  ProfileRow,
  ReviewRow,
  SiteSettingsRow,
  TransportPlanRow,
  VerificationReviewRow
} from './rows';

/**
 * Rows come from Postgres as unvalidated JSON. Every table-backed record is
 * real community data once it is in the database, so isDemo is always false
 * here — that flag is what drives the visible "Sample data" badge.
 */
const NOT_DEMO = false;

function money(cents: number, currency: string): Money {
  if (!Number.isInteger(cents)) {
    throw new Error(`Expected integer cents from the database, received ${cents}`);
  }
  if (currency !== 'ETB') throw new Error(`Unsupported currency in stored row: ${currency}`);
  return { cents, currency: 'ETB' };
}

function optionalMoney(cents: number | null, currency: string): Money | undefined {
  return cents === null ? undefined : money(cents, currency);
}

export function mapContactMethod(value: unknown): ContactMethod {
  if (!value || typeof value !== 'object') return { kind: 'none' };
  const raw = value as Record<string, unknown>;
  switch (raw.kind) {
    case 'none':
    case 'in_app':
      return { kind: raw.kind };
    case 'phone':
    case 'email':
      return typeof raw.value === 'string' && raw.consent === true
        ? { kind: raw.kind, value: raw.value, consent: true }
        : // A contact detail without recorded consent must never be published.
          { kind: 'none' };
    default:
      return { kind: 'none' };
  }
}

export function mapTourismMeta(value: unknown): TourismMeta | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const raw = value as Record<string, unknown>;
  const strings = (input: unknown): string[] => (Array.isArray(input) ? input.filter((v) => typeof v === 'string') : []);
  return {
    packageName: typeof raw.packageName === 'string' ? raw.packageName : '',
    durationHours: typeof raw.durationHours === 'number' ? raw.durationHours : 0,
    groupCapacity: typeof raw.groupCapacity === 'number' ? raw.groupCapacity : 0,
    inclusions: strings(raw.inclusions),
    exclusions: strings(raw.exclusions),
    bookingConditions: typeof raw.bookingConditions === 'string' ? raw.bookingConditions : '',
    meetingPoint: typeof raw.meetingPoint === 'string' ? raw.meetingPoint : '',
    cancellationPolicy: typeof raw.cancellationPolicy === 'string' ? raw.cancellationPolicy : ''
  };
}

export function mapProfile(row: ProfileRow, groupIds: string[] = []): Profile {
  return {
    id: row.id,
    userId: row.user_id,
    displayName: row.display_name,
    producerType: row.producer_type as ProducerType,
    role: row.role as Role,
    accountKind: row.account_kind as AccountKind,
    organizationName: row.organization_name ?? undefined,
    status: row.status === 'suspended' ? 'suspended' : 'active',
    community: row.community,
    operatingArea: row.operating_area,
    preferredLanguage: row.preferred_language as LanguageCode,
    // Absent on a database that has not had migration 0007 applied, and absent on
    // every account that never chose a scheme. Both mean "no saved choice", which
    // is not the same fact as "chose light" — so the field stays undefined instead
    // of being filled in here.
    theme: isThemePreference(row.theme) ? row.theme : undefined,
    contactMethod: mapContactMethod(row.contact_method),
    shortBio: row.short_bio,
    categories: row.categories,
    imageUrl: row.image_url ?? undefined,
    consentToPublish: row.consent_to_publish,
    verification: row.verification as VerificationStatus,
    verificationNote: row.verification_note ?? undefined,
    groupIds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isDemo: NOT_DEMO
  };
}

function mapImage(row: ListingImageRow): ListingImage {
  return {
    id: row.id,
    listingId: row.listing_id,
    caption: row.caption ?? '',
    src: row.src,
    alt: row.alt,
    consentRecorded: row.consent_recorded,
    isSample: row.is_sample
  };
}

export function mapListing(row: ListingWithImagesRow): Listing {
  return {
    id: row.id,
    slug: row.slug,
    kind: row.kind as ListingKind,
    title: row.title,
    description: row.description,
    categoryId: row.category_id,
    producerId: row.producer_id,
    community: row.community,
    unitPrice: money(row.unit_price_cents, row.currency),
    unitOfSale: row.unit as UnitOfSale,
    availableQuantity: row.available_quantity,
    minOrderQuantity: row.min_order_quantity,
    availability: row.availability as AvailabilityStatus,
    pickupOptions: row.pickup_options,
    deliveryAvailable: row.delivery_available,
    lastUpdated: row.updated_at,
    createdAt: row.created_at,
    verification: row.verification as VerificationStatus,
    published: row.published,
    featured: row.featured,
    archived: row.archived,
    tourism: mapTourismMeta(row.tourism_meta),
    images: row.listing_images.map(mapImage),
    isDemo: NOT_DEMO
  };
}

export function listingToRow(listing: Listing): Record<string, unknown> {
  return {
    id: listing.id,
    slug: listing.slug,
    kind: listing.kind,
    title: listing.title,
    description: listing.description,
    category_id: listing.categoryId,
    producer_id: listing.producerId,
    community: listing.community,
    unit_price_cents: listing.unitPrice.cents,
    currency: listing.unitPrice.currency,
    unit: listing.unitOfSale,
    available_quantity: listing.availableQuantity,
    min_order_quantity: listing.minOrderQuantity,
    availability: listing.availability,
    pickup_options: listing.pickupOptions,
    delivery_available: listing.deliveryAvailable,
    tourism_meta: listing.tourism ?? null,
    published: listing.published,
    featured: listing.featured ?? false,
    archived: listing.archived ?? false,
    verification: listing.verification
  };
}

export function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    kind: row.kind as Category['kind'],
    description: row.description ?? '',
    icon: row.icon ?? undefined,
    sortOrder: row.sort_order,
    active: row.active
  };
}

export function categoryToRow(category: Category): Record<string, unknown> {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    kind: category.kind,
    description: category.description,
    icon: category.icon ?? null,
    sort_order: category.sortOrder ?? 0,
    active: category.active ?? true
  };
}

export function mapInquiry(row: InquiryRow, events: InquiryEventRow[]): Inquiry {
  return {
    id: row.id,
    reference: row.reference,
    listingId: row.listing_id,
    buyerName: row.buyer_name,
    buyerContact: row.buyer_contact,
    buyerProfileId: row.buyer_profile_id ?? undefined,
    quantity: row.quantity,
    unitOfSale: row.unit as UnitOfSale,
    estimatedSubtotalCents: row.estimated_subtotal_cents,
    currency: 'ETB',
    preference: row.preference as Inquiry['preference'],
    preferredDate: row.preferred_date ?? undefined,
    message: row.message ?? '',
    status: row.status as InquiryStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    events: events.map(mapInquiryEvent),
    isDemo: NOT_DEMO,
    idempotencyKey: row.idempotency_key ?? undefined
  };
}

export function mapInquiryEvent(row: InquiryEventRow): InquiryEvent {
  return {
    id: row.id,
    inquiryId: row.inquiry_id,
    at: row.at,
    actor: row.actor as InquiryEvent['actor'],
    kind: row.kind as InquiryEvent['kind'],
    detail: row.detail
  };
}

/**
 * A payment row is read as stored. The amount in particular is never taken from
 * a caller — 0006 copies it from the inquiry at insert time — so a receipt built
 * from this mapping cannot be steered by a query string.
 */
export function mapPayment(row: PaymentRow, events: PaymentEventRow[]): Payment {
  return {
    id: row.id,
    reference: row.reference,
    inquiryId: row.inquiry_id,
    listingId: row.listing_id,
    buyerProfileId: row.buyer_profile_id,
    sellerProfileId: row.seller_profile_id,
    provider: row.provider as PaymentProviderId,
    providerReference: row.provider_reference ?? undefined,
    amountCents: money(row.amount_cents, row.currency).cents,
    currency: 'ETB',
    feeCents: row.fee_cents ?? undefined,
    paymentMethod: row.payment_method ?? undefined,
    status: row.status as PaymentStatus,
    checkoutUrl: row.checkout_url ?? undefined,
    checkoutExpiresAt: row.checkout_expires_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    confirmedAt: row.confirmed_at ?? undefined,
    closedAt: row.closed_at ?? undefined,
    failureReason: row.failure_reason ?? undefined,
    // The column, not a constant: the schema refuses a simulated row in a live
    // database, and reading what is stored keeps that refusal honest rather
    // than relying on the mapper to override it.
    isDemo: row.is_demo === true,
    events: events.map(mapPaymentEvent)
  };
}

export function mapPaymentEvent(row: PaymentEventRow): PaymentEvent {
  return {
    id: row.id,
    paymentId: row.payment_id,
    at: row.at,
    actor: row.actor as PaymentEvent['actor'],
    kind: row.kind as PaymentEvent['kind'],
    detail: row.detail,
    providerEventId: row.provider_event_id ?? undefined
  };
}

/**
 * Only the columns the workflow can legitimately send on a fresh attempt. There
 * is deliberately no amount, currency, seller or listing key here: 0006's insert
 * trigger fills those from the stored inquiry, so a hand-made request has no
 * field to tamper with.
 */
export function paymentToRow(input: {
  reference: string;
  inquiryId: string;
  provider: PaymentProviderId;
}): Record<string, unknown> {
  return {
    reference: input.reference,
    inquiry_id: input.inquiryId,
    provider: input.provider,
    status: 'pending',
    is_demo: false
  };
}

export function mapOpportunity(row: OpportunityRow, aggregateQuantity: number): CollectiveOpportunity {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description ?? '',
    categoryId: row.category_id,
    unitOfSale: row.unit as UnitOfSale,
    organizingGroupId: row.organizing_group_id ?? row.coordinator_profile_id,
    coordinatorProfileId: row.coordinator_profile_id,
    targetQuantity: row.target_quantity,
    aggregateQuantity,
    indicativeGroupPrice: optionalMoney(row.indicative_group_price_cents, row.currency),
    buyerOfferedPrice: optionalMoney(row.buyer_offered_price_cents, row.currency),
    pickupPlan: row.pickup_plan,
    transportPlan: row.transport_plan ?? undefined,
    orderDeadline: row.order_deadline ?? undefined,
    status: row.status as CollectiveOpportunity['status'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isDemo: NOT_DEMO
  };
}

export function mapContribution(row: ContributionRow): GroupContribution {
  return {
    id: row.id,
    opportunityId: row.opportunity_id,
    producerProfileId: row.producer_profile_id,
    quantity: row.quantity,
    status: row.status as GroupContribution['status'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    note: row.note ?? undefined,
    isDemo: NOT_DEMO
  };
}

export function mapGroup(row: ProducerGroupRow, members: GroupMemberRow[]): ProducerGroup {
  return {
    id: row.id,
    name: row.name,
    community: row.community,
    description: row.description ?? '',
    coordinatorProfileId: row.coordinator_profile_id,
    memberProfileIds: members.filter((m) => m.group_id === row.id).map((m) => m.profile_id),
    createdAt: row.created_at,
    isDemo: NOT_DEMO
  };
}

export function mapTransportPlan(row: TransportPlanRow) {
  return {
    id: row.id,
    opportunityId: row.opportunity_id,
    totalCostCents: row.total_cost_cents,
    totalQuantity: row.total_quantity,
    currency: 'ETB' as const,
    quoteConfirmed: row.quote_confirmed,
    notes: row.notes ?? ''
  };
}

export function mapReport(row: ListingReportRow): ListingReport {
  return {
    id: row.id,
    listingId: row.listing_id,
    reason: row.reason,
    reporterName: row.reporter_name,
    reporterContact: row.reporter_contact,
    status: row.status as ListingReport['status'],
    adminNote: row.admin_note ?? undefined,
    createdAt: row.created_at,
    isDemo: NOT_DEMO
  };
}

export function mapVerificationReview(row: VerificationReviewRow): VerificationReview {
  return {
    id: row.id,
    profileId: row.profile_id,
    reviewerProfileId: row.reviewer_profile_id,
    decision: row.decision as VerificationReview['decision'],
    reason: row.reason,
    createdAt: row.created_at,
    isDemo: NOT_DEMO
  };
}

export function profileToRow(profile: Profile): Record<string, unknown> {
  return {
    id: profile.id,
    user_id: profile.userId,
    display_name: profile.displayName,
    producer_type: profile.producerType,
    account_kind: profile.accountKind,
    organization_name: profile.organizationName ?? null,
    community: profile.community,
    operating_area: profile.operatingArea,
    preferred_language: profile.preferredLanguage,
    contact_method: profile.contactMethod,
    short_bio: profile.shortBio,
    categories: profile.categories,
    image_url: profile.imageUrl ?? null,
    consent_to_publish: profile.consentToPublish,
    verification: profile.verification,
    verification_note: profile.verificationNote ?? null,
    // Written on insert only. The profiles_privileged_columns trigger rejects a
    // row that changes role, verification, or status without an admin behind it.
    role: profile.role,
    status: profile.status,
    // Only included when the account actually chose a scheme, so a profile write
    // still works on a database where migration 0007 has not been applied.
    ...(isThemePreference(profile.theme) ? { theme: profile.theme } : {})
  };
}

export function mapReview(row: ReviewRow): Review {
  return {
    id: row.id,
    listingId: row.listing_id,
    producerProfileId: row.producer_profile_id,
    inquiryId: row.inquiry_id,
    rating: Math.min(5, Math.max(1, Math.round(row.rating))) as Review['rating'],
    comment: row.comment ?? '',
    authorName: row.author_name,
    authorProfileId: row.author_profile_id ?? undefined,
    status: row.status === 'hidden' ? 'hidden' : 'published',
    moderationNote: row.moderation_note ?? undefined,
    createdAt: row.created_at,
    isDemo: NOT_DEMO
  };
}

export function mapAuditLog(row: AuditLogRow): AuditLogEntry {
  return {
    id: row.id,
    at: row.at,
    actorProfileId: row.actor_profile_id ?? '',
    actorName: row.actor_name,
    action: row.action as AuditLogEntry['action'],
    recordType: row.record_type as AuditLogEntry['recordType'],
    recordId: row.record_id,
    summary: row.summary,
    isDemo: NOT_DEMO
  };
}

export function mapContactMessage(row: ContactMessageRow): ContactMessage {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    subject: row.subject,
    message: row.message,
    status: row.status === 'handled' ? 'handled' : 'new',
    createdAt: row.created_at,
    isDemo: NOT_DEMO
  };
}

/**
 * The stored document is unvalidated JSON, so every field is checked against the
 * expected type and falls back to the default. A bad row can therefore never take
 * the homepage down or smuggle markup into the page.
 */
export function mapSiteSettings(row: SiteSettingsRow | null): SiteSettings {
  const raw = (row?.settings && typeof row.settings === 'object' ? row.settings : {}) as Record<string, unknown>;
  const text = (key: keyof SiteSettings, fallback: string) =>
    typeof raw[key] === 'string' ? (raw[key] as string) : fallback;
  const list = (key: keyof SiteSettings): string[] =>
    Array.isArray(raw[key]) ? (raw[key] as unknown[]).filter((v): v is string => typeof v === 'string') : [];

  const sections = Array.isArray(raw.homepageSections)
    ? (raw.homepageSections as unknown[])
        .map((entry) => (entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : null))
        .filter((entry): entry is Record<string, unknown> => entry !== null)
        .filter((entry) => HOMEPAGE_SECTIONS.includes(entry.id as never))
        .map((entry) => ({ id: entry.id as SiteSettings['homepageSections'][number]['id'], visible: entry.visible !== false }))
    : [];

  return {
    siteName: text('siteName', DEFAULT_SITE_SETTINGS.siteName),
    tagline: text('tagline', DEFAULT_SITE_SETTINGS.tagline),
    heroTitle: text('heroTitle', DEFAULT_SITE_SETTINGS.heroTitle),
    heroDescription: text('heroDescription', DEFAULT_SITE_SETTINGS.heroDescription),
    announcementBar:
      raw.announcementBar && typeof raw.announcementBar === 'object'
        ? {
            enabled: (raw.announcementBar as Record<string, unknown>).enabled === true,
            text: typeof (raw.announcementBar as Record<string, unknown>).text === 'string'
              ? ((raw.announcementBar as Record<string, unknown>).text as string)
              : ''
          }
        : DEFAULT_SITE_SETTINGS.announcementBar,
    featuredProductIds: list('featuredProductIds'),
    featuredServiceIds: list('featuredServiceIds'),
    featuredProducerIds: list('featuredProducerIds'),
    homepageSections: sections.length > 0 ? sections : DEFAULT_SITE_SETTINGS.homepageSections,
    contactEmail: text('contactEmail', DEFAULT_SITE_SETTINGS.contactEmail),
    contactPhone: text('contactPhone', DEFAULT_SITE_SETTINGS.contactPhone),
    addressNote: text('addressNote', DEFAULT_SITE_SETTINGS.addressNote),
    socialLinks: Array.isArray(raw.socialLinks)
      ? (raw.socialLinks as unknown[])
          .map((entry) => (entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : null))
          .filter((entry): entry is Record<string, unknown> => entry !== null)
          .filter((entry) => typeof entry.url === 'string' && /^(https?:)\/\//i.test(entry.url as string))
          .map((entry) => ({ label: String(entry.label ?? ''), url: entry.url as string }))
      : [],
    footerNote: text('footerNote', DEFAULT_SITE_SETTINGS.footerNote),
    accentColor: /^#[0-9a-fA-F]{6}$/.test(text('accentColor', '')) ? text('accentColor', '#b2542a') : DEFAULT_SITE_SETTINGS.accentColor,
    updatedAt: row?.updated_at ?? new Date().toISOString(),
    updatedByProfileId: row?.updated_by_profile_id ?? undefined,
    // A live row is real content, so it never carries the sample badge.
    isDemo: NOT_DEMO
  };
}

export function siteSettingsToRow(settings: SiteSettings): Record<string, unknown> {
  const { updatedAt: _updatedAt, updatedByProfileId: _updatedBy, isDemo: _isDemo, ...document } = settings;
  return { settings: document };
}
