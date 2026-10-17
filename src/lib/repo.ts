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

/**
 * Choose the repository for the configured data mode.
 *
 * demo -> the in-memory store, where the repository itself is the enforcement
 * point because no Row Level Security sits behind it.
 * supabase -> Postgres through the anon key, so Row Level Security decides what
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
