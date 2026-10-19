import 'server-only';
import { isDemoMode } from './store';
import { demoRepo } from './demo-repo';
import { supabaseServer } from './supabase/server';
import { createSupabaseRepo } from './supabase/repository';
import type {
  AccountStatus,
  AuditLogEntry,
  Category,
  CollectiveOpportunity,
  ContactMessage,
  GroupContribution,
  Inquiry,
  InquiryStatus,
  Listing,
  ListingReport,
  Payment,
  PaymentProviderId,
  PaymentStatus,
  ProducerGroup,
  Profile,
  Review,
  Role,
  SiteSettings,
  VerificationReview
} from './types';
import type { Actor } from './session';

/**
 * Repository layer.
 *
 * This module is the public entry point and is not safe to import from client
 * components: it carries the `server-only` marker, reads request cookies through
 * `next/headers`, and uses Node APIs. The demo implementation lives in
 * ./demo-repo.ts and the Supabase one in ./supabase/repository.ts; both are kept
 * importable from the test suite by leaving them free of this marker.
 */

export type Repo = {
  /** Active categories in display order — what a shopper sees. */
  listCategories(): Promise<Category[]>;
  /** Every category including deactivated ones; administrator areas only. */
  listAllCategories(): Promise<Category[]>;
  listPublicListings(): Promise<Listing[]>;
  getListing(id: string): Promise<Listing | undefined>;
  getListingBySlug(slug: string): Promise<Listing | undefined>;
  listListingsByProducer(profileId: string): Promise<Listing[]>;
  relatedListings(listing: Listing): Promise<Listing[]>;
  getProfile(id: string): Promise<Profile | undefined>;
  getProfileByUserId(userId: string): Promise<Profile | undefined>;
  listPublicProfiles(): Promise<Profile[]>;
  upsertProfile(profile: Profile): Promise<Profile>;
  createListing(listing: Listing): Promise<Listing>;
  updateListing(id: string, patch: Partial<Listing>, actorProfileId: string): Promise<Listing>;
  listGroups(): Promise<ProducerGroup[]>;
  getGroup(id: string): Promise<ProducerGroup | undefined>;
  listOpportunities(): Promise<CollectiveOpportunity[]>;
  getOpportunity(idOrSlug: string): Promise<CollectiveOpportunity | undefined>;
  listContributions(opportunityId: string): Promise<GroupContribution[]>;
  contribute(input: {
    opportunityId: string;
    producerProfileId: string;
    quantity: number;
    note?: string;
  }): Promise<GroupContribution>;
  listInquiriesForListing(listingId: string): Promise<Inquiry[]>;
  listInquiriesForSeller(sellerProfileId: string): Promise<Inquiry[]>;
  createInquiry(input: CreateInquiryInput): Promise<Inquiry>;
  updateInquiryStatus(inquiryId: string, status: InquiryStatus, actor: 'buyer' | 'seller', detail: string): Promise<Inquiry>;
  listReports(): Promise<ListingReport[]>;
  createReport(report: Omit<ListingReport, 'id' | 'createdAt' | 'status' | 'isDemo'>): Promise<ListingReport>;
  listVerificationReviews(): Promise<VerificationReview[]>;
  recordVerificationReview(input: {
    profileId: string;
    reviewerProfileId: string;
    decision: VerificationReview['decision'];
    reason: string;
  }): Promise<VerificationReview>;
  getTransportPlan(opportunityId: string): Promise<import('./types').TransportPlan | undefined>;
  aggregateStats(): Promise<{
    listings: number;
    producers: number;
    groups: number;
    inquiries: number;
    opportunities: number;
    collectiveContributed: number;
    collectiveTarget: number;
    verified: number;
  }>;

  /** Counts the admin overview needs, including queues by state. */
  adminStats(): Promise<{
    byRole: Record<Role, number>;
    suspended: number;
    pendingVerifications: number;
    openReports: number;
    newInquiries: number;
    openOpportunities: number;
    publishedListings: number;
    archivedListings: number;
    hiddenReviews: number;
    unreadMessages: number;
  }>;

  // --- Accounts and roles (administrator only; enforced again inside each method) ---
  listAllProfiles(): Promise<Profile[]>;
  setProfileRole(profileId: string, role: Role, actor: Actor): Promise<Profile>;
  setProfileStatus(profileId: string, status: AccountStatus, actor: Actor): Promise<Profile>;

  // --- Listing moderation ---
  listAllListings(): Promise<Listing[]>;
  getInquiry(id: string): Promise<Inquiry | undefined>;
  setListingFeatured(id: string, featured: boolean, actor: Actor): Promise<Listing>;
  setListingPublished(id: string, published: boolean, actor: Actor): Promise<Listing>;
  archiveListing(id: string, actor: Actor): Promise<Listing>;
  deleteListing(id: string, actor: Actor): Promise<void>;

  // --- Categories ---
  saveCategory(input: Category, actor: Actor): Promise<Category>;
  deleteCategory(id: string, actor: Actor): Promise<void>;

  // --- Collective selling, coordinator side ---
  saveOpportunity(
    input: Omit<CollectiveOpportunity, 'aggregateQuantity' | 'createdAt' | 'updatedAt' | 'isDemo'> & {
      id?: string;
    },
    actor: Actor
  ): Promise<CollectiveOpportunity>;
  setOpportunityStatus(id: string, status: CollectiveOpportunity['status'], actor: Actor): Promise<CollectiveOpportunity>;
  updateContribution(contributionId: string, quantity: number, actor: Actor): Promise<GroupContribution>;
  withdrawContribution(contributionId: string, actor: Actor): Promise<GroupContribution>;
  confirmContribution(contributionId: string, actor: Actor): Promise<GroupContribution>;

  // --- Buyer accounts ---
  listInquiriesForBuyer(buyerProfileId: string): Promise<Inquiry[]>;

  /**
   * Payment attempts, one record per attempt against an existing inquiry. The
   * inquiry is never duplicated to carry a payment, and an amount is only ever
   * copied from the stored inquiry — see ./payments.ts.
   */
  createPayment(input: CreatePaymentInput): Promise<Payment>;
  /** Accepts either the payment id or its merchant reference. */
  getPayment(idOrReference: string): Promise<Payment | undefined>;
  listPaymentsForBuyer(buyerProfileId: string): Promise<Payment[]>;
  listPaymentsForInquiry(inquiryId: string): Promise<Payment[]>;
  /** Platform-wide payment ledger for the administrator reporting area. */
  listAllPayments(): Promise<Payment[]>;
  /** Stores the hosted checkout address the provider returned for an attempt. */
  attachCheckout(paymentId: string, checkout: AttachCheckoutInput, buyerProfileId: string): Promise<Payment>;
  /**
   * Applies a verified provider answer. Idempotent: a repeated `providerEventId`
   * leaves the record untouched and returns it as it stands.
   */
  settlePayment(input: SettlePaymentInput): Promise<Payment>;

  /** Platform-wide arrangement queue for the administrator area. */
  listAllInquiries(): Promise<Inquiry[]>;

  // --- Reviews ---
  listReviews(input?: { listingId?: string; includeHidden?: boolean }): Promise<Review[]>;
  createReview(input: {
    listingId: string;
    inquiryId: string;
    rating: number;
    comment: string;
    actor: Actor | undefined;
    authorName: string;
  }): Promise<Review>;
  setReviewStatus(id: string, status: Review['status'], note: string, actor: Actor): Promise<Review>;

  // --- Moderation of reports ---
  updateReport(id: string, status: ListingReport['status'], adminNote: string, actor: Actor): Promise<ListingReport>;

  // --- Site content and appearance ---
  getSiteSettings(): Promise<SiteSettings>;
  saveSiteSettings(patch: Partial<SiteSettings>, actor: Actor): Promise<SiteSettings>;

  // --- Audit trail and messages ---
  listAuditLogs(limit?: number): Promise<AuditLogEntry[]>;
  createContactMessage(input: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }): Promise<ContactMessage>;
  listContactMessages(): Promise<ContactMessage[]>;
  setContactMessageStatus(id: string, status: ContactMessage['status'], actor: Actor): Promise<ContactMessage>;
};

export type CreateInquiryInput = {
  listingId: string;
  buyerName: string;
  buyerContact: string;
  quantity: number;
  preference: Inquiry['preference'];
  preferredDate?: string;
  message: string;
  idempotencyKey?: string;
  /** Set by the API route from the signed-in actor, never by the browser. */
  buyerProfileId?: string;
};

export type CreatePaymentInput = {
  inquiryId: string;
  /** The signed-in buyer. The repository refuses anyone who is not that buyer. */
  actorProfileId: string;
  /**
   * Which money-mover the workflow is about to use, taken from
   * resolvePaymentProvider() by the route. Never read from the request body — a
   * browser that could name the provider could name 'demo_simulated'.
   */
  provider: PaymentProviderId;
  /** Only honoured in demo mode; a live provider ignores it entirely. */
  demoOutcome?: 'success' | 'pending' | 'failed' | 'cancelled';
};

export type AttachCheckoutInput = {
  checkoutUrl: string;
  providerReference?: string;
  expiresAt?: string;
};

export type SettlePaymentInput = {
  /** Our payment reference, the merchant_reference the provider was given. */
  merchantReference: string;
  /** Already translated by resolveVerifiedStatus(); never a raw provider string. */
  status: PaymentStatus;
  detail: string;
  /**
   * The amount and currency the provider says it charged. When present they must
   * match the stored amount exactly or the settle is refused.
   */
  reportedAmount?: unknown;
  reportedCurrency?: unknown;
  providerReference?: string;
  paymentMethod?: string;
  feeCents?: number;
  /** The provider's own event id, so a repeated notification cannot double-count. */
  providerEventId?: string;
  /** Who caused it: the buyer's own session, or an administrator recording a refund. */
  actorProfileId?: string;
};

/**
 * Choose the repository for the configured data mode.
 *
 * demo -> the in-memory store, where the repository itself is the enforcement
 * point because no Row Level Security sits behind it.
 * supabase -> Postgres through the public key, so Row Level Security decides what
 * the current visitor may see. Building the Supabase client without credentials
 * throws inside requireSupabaseConfig(): the app never falls back to demo data
 * while pretending to be live.
 *
 * The Supabase client is created per call because it is bound to the current
 * request's auth cookies; caching it would leak one visitor's session into
 * another request.
 */
export function getRepo(): Repo {
  if (isDemoMode()) return demoRepo;
  return createSupabaseRepo(supabaseServer());
}
