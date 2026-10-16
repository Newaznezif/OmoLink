import 'server-only';
import { randomUUID } from 'node:crypto';
import { getDemoStore, isDemoMode } from './store';
import { supabaseServer } from './supabase/server';
import { createSupabaseRepo } from './supabase/repository';
import { makeReference } from './ids';
import { multiplyUnitPrice } from './money';
import type {
  Category,
  CollectiveOpportunity,
  GroupContribution,
  Inquiry,
  InquiryEvent,
  InquiryStatus,
  Listing,
  ListingReport,
  ProducerGroup,
  Profile,
  VerificationReview
} from './types';

/**
 * Repository layer. In demo mode this reads/writes the in-memory store.
 * When Supabase credentials are configured the same interface is used to
 * query Postgres via the service-role client (server-side only). This module
 * is not safe to import from client components — the `next/server` cookie
 * helpers and Node APIs are used here.
 */

export type Repo = {
  listCategories(): Promise<Category[]>;
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
};

/**
 * Choose the repository for the configured data mode.
 *
 * demo -> the in-memory store.
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
const demoRepo: Repo = {
  async listCategories() {
    return [...getDemoStore().categories];
  },
  async listPublicListings() {
    return getDemoStore().listings.filter((l) => l.published);
  },
  async getListing(id) {
    return getDemoStore().listings.find((l) => l.id === id);
  },
  async getListingBySlug(slug) {
    return getDemoStore().listings.find((l) => l.slug === slug);
  },
  async listListingsByProducer(profileId) {
    return getDemoStore().listings.filter((l) => l.producerId === profileId);
  },
  async relatedListings(listing) {
    const store = getDemoStore();
    return store.listings
      .filter(
        (l) =>
          l.published &&
          l.id !== listing.id &&
          (l.categoryId === listing.categoryId || l.producerId === listing.producerId)
      )
      .slice(0, 4);
  },
  async getProfile(id) {
    return getDemoStore().profiles.find((p) => p.id === id);
  },
  async getProfileByUserId(userId) {
    return getDemoStore().profiles.find((p) => p.userId === userId);
  },
  async listPublicProfiles() {
    return getDemoStore().profiles;
  },
  async upsertProfile(profile) {
    const store = getDemoStore();
    const idx = store.profiles.findIndex((p) => p.id === profile.id);
    const next = { ...profile, updatedAt: new Date().toISOString() };
    if (idx >= 0) store.profiles[idx] = next;
    else store.profiles.push(next);
    return next;
  },
  async createListing(listing) {
    const store = getDemoStore();
    if (store.listings.some((l) => l.id === listing.id || l.slug === listing.slug)) {
      throw new Error('A listing with this id or slug already exists.');
    }
    store.listings.push(listing);
    return listing;
  },
  async updateListing(id, patch, actorProfileId) {
    const store = getDemoStore();
    const idx = store.listings.findIndex((l) => l.id === id);
    if (idx < 0) throw new Error('Listing not found.');
    const current = store.listings[idx]!;
    if (current.producerId !== actorProfileId) {
      throw new Error('Not allowed to edit another producer’s listing.');
    }
    const next: Listing = { ...current, ...patch, id: current.id, lastUpdated: new Date().toISOString() };
    store.listings[idx] = next;
    return next;
  },
  async listGroups() {
    return [...getDemoStore().groups];
  },
  async getGroup(id) {
    return getDemoStore().groups.find((g) => g.id === id);
  },
  async listOpportunities() {
    const store = getDemoStore();
    return store.opportunities.map((o) => ({
      ...o,
      aggregateQuantity: store.contributions
        .filter((c) => c.opportunityId === o.id && c.status !== 'withdrawn')
        .reduce((sum, c) => sum + c.quantity, 0)
    }));
  },
  async getOpportunity(idOrSlug) {
    const store = getDemoStore();
    const found = store.opportunities.find((o) => o.id === idOrSlug || o.slug === idOrSlug);
    if (!found) return undefined;
    const aggregate = store.contributions
      .filter((c) => c.opportunityId === found.id && c.status !== 'withdrawn')
      .reduce((sum, c) => sum + c.quantity, 0);
    return { ...found, aggregateQuantity: aggregate };
  },
  async listContributions(opportunityId) {
    return getDemoStore().contributions.filter((c) => c.opportunityId === opportunityId);
  },
  async contribute({ opportunityId, producerProfileId, quantity, note }) {
    const store = getDemoStore();
    if (!Number.isInteger(quantity) || quantity <= 0) throw new Error('Quantity must be a positive whole number.');
    const opp = store.opportunities.find((o) => o.id === opportunityId);
    if (!opp) throw new Error('Opportunity not found.');
    if (opp.status === 'closed' || opp.status === 'fulfilled' || opp.status === 'cancelled') {
      throw new Error('This opportunity is not accepting contributions.');
    }
    const producerListings = store.listings.filter((l) => l.producerId === producerProfileId && l.categoryId === opp.categoryId);
    const availableStock = producerListings.reduce((sum, l) => sum + (l.availability === 'unavailable' ? 0 : l.availableQuantity), 0);
    if (availableStock <= 0) throw new Error('No stock in a matching category to contribute.');
    const existing = store.contributions.find(
      (c) => c.opportunityId === opportunityId && c.producerProfileId === producerProfileId && c.status !== 'withdrawn'
    );
    const alreadyCommitted = existing?.quantity ?? 0;
    if (alreadyCommitted + quantity > availableStock) {
      throw new Error(
        `Only ${availableStock - alreadyCommitted} units left to contribute from your stock of ${availableStock}.`
      );
    }
    const aggregate = store.contributions
      .filter((c) => c.opportunityId === opportunityId && c.status !== 'withdrawn')
      .reduce((sum, c) => sum + c.quantity, 0);
    if (aggregate + quantity > opp.targetQuantity * 2) {
      throw new Error('Contribution would exceed twice the target quantity. Please coordinate with the group.');
    }
    const record: GroupContribution = {
      id: `con_${randomUUID().slice(0, 8)}`,
      opportunityId,
      producerProfileId,
      quantity,
      status: 'pending',
      createdAt: new Date().toISOString(),
      note,
      isDemo: true
    };
    if (existing) {
      existing.quantity += quantity;
      existing.updatedAt = new Date().toISOString();
      return existing;
    }
    store.contributions.push(record);
    opp.updatedAt = new Date().toISOString();
    return record;
  },
  async listInquiriesForListing(listingId) {
    return getDemoStore().inquiries.filter((i) => i.listingId === listingId);
  },
  async listInquiriesForSeller(sellerProfileId) {
    const store = getDemoStore();
    const listingIds = new Set(store.listings.filter((l) => l.producerId === sellerProfileId).map((l) => l.id));
    return store.inquiries.filter((i) => listingIds.has(i.listingId));
  },
  async createInquiry(input) {
    const store = getDemoStore();
    if (input.idempotencyKey) {
      const dup = store.inquiries.find((i) => i.idempotencyKey === input.idempotencyKey);
      if (dup) return dup;
    }
    const listing = store.listings.find((l) => l.id === input.listingId);
    if (!listing) throw new Error('Listing not found.');
    if (!Number.isInteger(input.quantity) || input.quantity < listing.minOrderQuantity) {
      throw new Error(`Quantity must be a whole number of at least ${listing.minOrderQuantity}.`);
    }
    if (listing.availability === 'unavailable') throw new Error('This listing is currently unavailable.');
    if (input.quantity > listing.availableQuantity && listing.availability !== 'made_to_order') {
      throw new Error(`Only ${listing.availableQuantity} ${listing.unitOfSale} available right now.`);
    }
    const subtotal = multiplyUnitPrice(listing.unitPrice.cents, input.quantity);
    const nowIso = new Date().toISOString();
    const createdEvent: InquiryEvent = {
      id: `ev_${randomUUID().slice(0, 8)}`,
      inquiryId: '',
      at: nowIso,
      actor: 'buyer',
      kind: 'created',
      detail: `Inquiry submitted for ${input.quantity} ${listing.unitOfSale}.`
    };
    const inquiry: Inquiry = {
      id: `inq_${randomUUID().slice(0, 8)}`,
      reference: makeReference(),
      listingId: listing.id,
      buyerName: input.buyerName.trim(),
      buyerContact: input.buyerContact.trim(),
      quantity: input.quantity,
      unitOfSale: listing.unitOfSale,
      estimatedSubtotalCents: subtotal,
      currency: listing.unitPrice.currency,
      preference: input.preference,
      preferredDate: input.preferredDate,
      message: input.message.trim(),
      status: 'new',
      createdAt: nowIso,
      updatedAt: nowIso,
      events: [{ ...createdEvent, inquiryId: '' }],
      isDemo: true,
      idempotencyKey: input.idempotencyKey
    };
    inquiry.events[0]!.inquiryId = inquiry.id;
    store.inquiries.push(inquiry);
    return inquiry;
  },
  async updateInquiryStatus(inquiryId, status, actor, detail) {
    const store = getDemoStore();
    const idx = store.inquiries.findIndex((i) => i.id === inquiryId);
    if (idx < 0) throw new Error('Inquiry not found.');
    const current = store.inquiries[idx]!;
    if (current.status === 'completed' || current.status === 'cancelled') {
      throw new Error('Cannot change a closed inquiry.');
    }
    const next: Inquiry = {
      ...current,
      status,
      updatedAt: new Date().toISOString(),
      events: [
        ...current.events,
        {
          id: `ev_${randomUUID().slice(0, 8)}`,
          inquiryId: current.id,
          at: new Date().toISOString(),
          actor,
          kind: 'status_changed',
          detail
        }
      ]
    };
    store.inquiries[idx] = next;
    return next;
  },
  async listReports() {
    return getDemoStore().reports;
  },
  async createReport(input) {
    const store = getDemoStore();
    const report: ListingReport = {
      ...input,
      id: `rep_${randomUUID().slice(0, 8)}`,
      createdAt: new Date().toISOString(),
      status: 'open',
      isDemo: true
    };
    store.reports.push(report);
    return report;
  },
  async listVerificationReviews() {
    return getDemoStore().verificationReviews;
  },
  async recordVerificationReview(input) {
    const store = getDemoStore();
    const record: VerificationReview = {
      id: `vr_${randomUUID().slice(0, 8)}`,
      profileId: input.profileId,
      reviewerProfileId: input.reviewerProfileId,
      decision: input.decision,
      reason: input.reason,
      createdAt: new Date().toISOString(),
      isDemo: true
    };
    store.verificationReviews.push(record);
    const profile = store.profiles.find((p) => p.id === input.profileId);
    if (profile) {
      profile.verification =
        input.decision === 'approved' ? 'verified' : input.decision === 'rejected' ? 'unverified' : 'pending_review';
      profile.verificationNote = input.reason;
      profile.updatedAt = new Date().toISOString();
    }
    return record;
  },
  async getTransportPlan(opportunityId) {
    return getDemoStore().transportPlans.find((t) => t.opportunityId === opportunityId);
  },
  async aggregateStats() {
    const store = getDemoStore();
    return {
      listings: store.listings.filter((l) => l.published).length,
      producers: store.profiles.length,
      groups: store.groups.length,
      inquiries: store.inquiries.length,
      opportunities: store.opportunities.length,
      collectiveContributed: store.contributions.filter((c) => c.status !== 'withdrawn').reduce((s, c) => s + c.quantity, 0),
      collectiveTarget: store.opportunities.reduce((s, o) => s + o.targetQuantity, 0),
      verified: store.profiles.filter((p) => p.verification === 'verified').length
    };
  }
};
