import type {
  AvailabilityStatus,
  Category,
  CollectiveOpportunity,
  ContactMethod,
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
  ProducerGroup,
  ProducerType,
  Profile,
  TourismMeta,
  UnitOfSale,
  VerificationReview,
  VerificationStatus
} from '../types';
import type {
  CategoryRow,
  ContributionRow,
  GroupMemberRow,
  InquiryEventRow,
  InquiryRow,
  ListingImageRow,
  ListingReportRow,
  ListingWithImagesRow,
  OpportunityRow,
  ProducerGroupRow,
  ProfileRow,
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
    community: row.community,
    operatingArea: row.operating_area,
    preferredLanguage: row.preferred_language as LanguageCode,
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
    verification: listing.verification
  };
}

export function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    kind: row.kind as Category['kind'],
    description: row.description ?? ''
  };
}

export function mapInquiry(row: InquiryRow, events: InquiryEventRow[]): Inquiry {
  return {
    id: row.id,
    reference: row.reference,
    listingId: row.listing_id,
    buyerName: row.buyer_name,
    buyerContact: row.buyer_contact,
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

export function profileToRow(profile: Profile): Record<string, unknown> {  return {
    id: profile.id,
    user_id: profile.userId,
    display_name: profile.displayName,
    producer_type: profile.producerType,
    community: profile.community,
    operating_area: profile.operatingArea,
    preferred_language: profile.preferredLanguage,
    contact_method: profile.contactMethod,
    short_bio: profile.shortBio,
    categories: profile.categories,
    image_url: profile.imageUrl ?? null,
    consent_to_publish: profile.consentToPublish,
    verification: profile.verification,
    verification_note: profile.verificationNote ?? null
  };
}
