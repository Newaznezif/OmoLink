/**
 * English is the source language for the interface. Every value here must match
 * the wording the site rendered before it was keyed, byte for byte: the HTTP
 * smoke suites assert exact English sentences, and a translator's improvement is
 * a product decision, not a refactor. Placeholders are `{name}` and are filled in
 * by `translate()` in `./index.ts`.
 */
export const en = {
  // ---------- shared chrome ----------
  'common.skipToMain': 'Skip to main content',
  'common.search': 'Search',
  'common.any': 'Any',
  'common.clear': 'Clear',
  'common.viewAll': 'View all →',
  'common.openLink': 'Open →',
  'common.demoBanner': 'This preview runs in demo mode — sellers are unverified and payments are simulated.',
  'common.interfaceLanguage': 'Interface language',
  'common.membersSample': '{count} members (sample)',

  // ---------- language selector and honesty notices ----------
  'language.suffix.complete': '',
  'language.suffix.partial': ' — partial',
  'language.suffix.draft': ' — draft, needs review',
  'language.suffix.none': ' — no translation yet',
  'language.suffix.unreviewed': ' — complete, needs speaker review',
  'language.notice.draft':
    '{language} wording is a machine draft that has not been reviewed by a competent speaker. Unreviewed text is shown in English.',
  'language.notice.unreviewed':
    'Every {language} interface label has wording, but it is a machine draft that no fluent speaker has reviewed yet.',
  'language.notice.none':
    'No verified {language} translation exists yet, so this page is shown in English.',
  'language.notice.areas':
    'Some pages stay in English until more {language} wording has been reviewed.',
  'language.notice.catalog':
    'Category and sample listing wording in {language} has not been checked by a fluent speaker yet, and the producer’s original text is always kept.',

  // ---------- primary navigation ----------
  'nav.explore': 'Explore',
  'nav.products': 'Products',
  'nav.tourism': 'Tourism',
  'nav.sellers': 'Sellers',
  'nav.collective': 'Collective orders',
  'nav.how': 'How it works',
  'nav.pricing': 'Pricing tool',
  'nav.contact': 'Contact',
  'nav.primaryAria': 'Primary',
  'nav.primaryMobileAria': 'Primary mobile',
  'nav.signIn': 'Sign in',
  'nav.createAccount': 'Create account',
  'nav.register': 'Register',
  'nav.signOut': 'Sign out',
  'nav.myInquiries': 'My inquiries',
  'nav.myDashboard': 'My dashboard',
  'nav.adminArea': 'Admin area',
  'nav.homeAria': '{siteName} home',

  // ---------- status vocabulary ----------
  'status.verified': 'Verified',
  'status.pending': 'Pending review',
  'status.unverified': 'Unverified',
  'status.verifiedHint': 'Approved by an authorised reviewer.',
  'status.pendingHint': 'Awaiting decision from an authorised reviewer.',
  'status.unverifiedHint': 'No verification on record.',
  'status.demoSuffix': ' (Simulated in demo mode.)',
  'status.demoTag': '· demo',
  'status.sampleData': 'Sample data',
  'status.sampleDataHint':
    'This record is sample data used for demonstration. It does not represent a real producer, product, or verified community.',
  'status.available': 'Available',
  'status.availableCount': 'Available ({count})',
  'status.limited': 'Limited ({count})',
  'status.limitedStock': 'Limited stock',
  'status.limitedOption': 'Limited',
  'status.madeToOrder': 'Made to order',
  'status.seasonal': 'Seasonal',
  'status.unavailable': 'Unavailable',
  'status.opportunity.open': 'Open',
  'status.opportunity.closingSoon': 'Closing soon',
  'status.opportunity.closed': 'Closed',
  'status.opportunity.fulfilled': 'Fulfilled',
  'status.opportunity.cancelled': 'Cancelled',

  // ---------- listing cards ----------
  'listing.unitSuffix': '/ {unit}',
  'listing.minOrder': 'Min {count} {unit}',
  'listing.availabilityLabel': 'Availability',

  // ---------- homepage ----------
  'home.browseProducts': 'Browse products',
  'home.browseTourism': 'Browse tourism services',
  'home.searchLabel': 'Search listings',
  'home.searchPlaceholder': 'Search products, services, producers…',
  'home.searchNote': 'Search covers products, tourism services and producers.',
  'home.categoriesEyebrow': 'Browse by',
  'home.categoriesTitle': 'Categories',
  'home.categoriesDescription': 'Every category here has a working results page.',
  'home.featuredProductsTitle': 'Featured local products',
  'home.featuredProductsEyebrow': 'Highlighted by the team',
  'home.featuredTourismTitle': 'Tourism services',
  'home.featuredTourismEyebrow': 'Guided experiences',
  'home.featuredEmpty': 'Nothing has been published here yet.',
  'home.producersEyebrow': 'Community',
  'home.producersTitle': 'Producer highlights',
  'home.producersDescription': 'Producers and guides with a profile on this site.',
  'home.producersEmpty': 'No selling profile has been published yet.',
  'home.collectiveEyebrow': 'Collective selling',
  'home.collectiveTitle': 'Open group orders',
  'home.collectiveDescription': 'Group orders that pool quantities for bulk buyers.',
  'home.collectiveEmpty': 'No group order is open right now.',
  'home.howEyebrow': 'Direct selling',
  'home.howTitle': 'How OmoNetTab helps a producer connect with customers',
  'home.howStep1Title': '1. Publish clearly',
  'home.howStep1Body':
    'Producers list items and services with explicit unit price, unit of sale, availability, minimum order and pickup options. No hidden fees.',
  'home.howStep2Title': '2. Buyers send inquiries',
  'home.howStep2Body':
    'A buyer enters quantity, sees the estimated subtotal, then sends an inquiry that produces a reference number. Nothing is auto-marked as sold.',
  'home.howStep3Title': '3. Coordinate off-platform',
  'home.howStep3Body':
    'Producer and buyer agree payment, pickup and delivery in the real world. The dashboard tracks the inquiry state honestly.',
  'home.poolingTitle': 'Pooling supply for bulk buyers',
  'home.poolingDescription':
    'Producers can join a group opportunity, contribute available quantity, and coordinate shared transport.',
  'home.poolingProducers': 'What producers see',
  'home.poolingProducers1': 'Aggregate quantity vs. target',
  'home.poolingProducers2': 'Number of participating producers',
  'home.poolingProducers3': 'Indicative group price (not imposed)',
  'home.poolingProducers4': 'Estimated transport cost per unit and per producer',
  'home.poolingBuyers': 'What buyers see',
  'home.poolingBuyers1': 'Total available and remaining',
  'home.poolingBuyers2': 'Pickup / transport plan',
  'home.poolingBuyers3': 'Order deadline',
  'home.poolingBuyers4': 'Coordinator contact channel',
  'home.trustEyebrow': 'Trust',
  'home.trustTitle': 'Honest status, clear consent',
  'home.trustVerification': 'Explicit verification',
  'home.trustVerificationBody':
    'Verification has three states: unverified, pending review, and verified. Only an administrator can approve a profile, and no one approves their own request.',
  'home.trustConsent': 'Consent-aware publication',
  'home.trustConsentBody':
    'Cultural performances, ceremonies and community images are only published with recorded consent. A contact detail without stored consent is never published. Sensitive cultural knowledge is never commercialised by default.',
  'home.trustSample': 'Sample vs. real data',
  'home.trustSampleBody':
    'Every demo record carries a visible “Sample data” label. We do not present generic placeholders as documentary evidence of a specific producer or community.',
  'home.ctaProducerTitle': 'Are you a producer?',
  'home.ctaProducerBody':
    'Registration and basic listing remain free during the pilot. You keep full control of your prices.',
  'home.ctaProducerAction': 'Create an account →',
  'home.ctaBulkTitle': 'Buying in bulk?',
  'home.ctaBulkBody':
    'Browse collective orders and see how producer groups pool supply for hotels, retailers, schools and other institutions.',
  'home.ctaBulkAction': 'Explore collective orders →',

  // ---------- marketplace browse ----------
  'market.exploreEyebrow': 'Explore',
  'market.exploreTitle': 'Browse everything',
  'market.exploreDescription':
    'Search across products and services, filter by community and category, and inspect producer information.',
  'market.productsEyebrow': 'Marketplace',
  'market.productsTitle': 'Products',
  'market.productsDescription':
    'Products from South Omo producers, priced per unit in ETB. Ask the producer to confirm current availability.',
  'market.tourismEyebrow': 'Tourism',
  'market.tourismTitle': 'Tourism services',
  'market.tourismDescription':
    'Guided visits, half-day walks and craft demonstrations offered by locally operated guides.',
  'market.emptyTitle': 'No listings match your filters',
  'market.emptyBody': 'Try clearing a filter or broadening your search.',
  'market.filtersAria': 'Filter listings',
  'filter.search': 'Search',
  'filter.category': 'Category',
  'filter.community': 'Community',
  'filter.sort': 'Sort',
  'filter.minPrice': 'Min ETB',
  'filter.maxPrice': 'Max ETB',
  'filter.sortNewest': 'Newest',
  'filter.sortUpdated': 'Recently updated',
  'filter.sortPriceAsc': 'Price: low to high',
  'filter.sortPriceDesc': 'Price: high to low',
  'filter.apply': 'Apply filters',
  'filter.reset': 'Reset',

  // ---------- listing detail ----------
  'listing.eyebrowFallback': 'Listing',
  'listing.descriptionTitle': 'Description',
  'listing.pricingTitle': 'Pricing and stock',
  'listing.unitPrice': 'Unit price',
  'listing.unitOfSale': 'Unit of sale',
  'listing.availableQuantity': 'Available quantity',
  'listing.minimumOrder': 'Minimum order',
  'listing.delivery': 'Delivery',
  'listing.deliveryOnRequest': 'Available on request',
  'listing.deliveryNotOffered': 'Not offered',
  'listing.lastUpdated': 'Last updated',
  'listing.priceNote':
    'Prices are shown per unit in Ethiopian Birr (ETB) with no hidden fees. Any transport or coordination cost is arranged separately and always disclosed.',
  'listing.pickupTitle': 'Pickup options',
  'listing.relatedTitle': 'Related listings',
  'listing.reviewsTitle': 'Reviews',
  'listing.inquiryTitle': 'Send an inquiry',
  'listing.inquiryIntro':
    'This submits an inquiry, not a confirmed sale. The producer will respond with pickup or delivery details and payment arrangements. Nothing here is a payment.',
  'listing.producerTitle': 'About the producer',
  'listing.shareTitle': 'Share this listing',
  'listing.shareBody': 'Scan with another phone to open this listing.',
  'listing.shareQrAria': 'QR for this listing URL',
  'listing.unavailableTitle': 'Currently unavailable',
  'listing.unavailableBody':
    'The producer marked this listing as unavailable. You can still send an inquiry to be notified when it becomes available again.',
  'listing.experienceTitle': 'Experience details',
  'listing.package': 'Package',
  'listing.duration': 'Duration',
  'listing.durationHours': '{hours} hours',
  'listing.groupCapacity': 'Group capacity',
  'listing.groupPeople': '{count} people',
  'listing.meetingPoint': 'Meeting point',
  'listing.inclusions': 'Inclusions',
  'listing.exclusions': 'Exclusions',
  'listing.bookingConditions': 'Booking conditions',
  'listing.cancellation': 'Cancellation',

  // ---------- report a listing ----------
  'report.title': 'Something wrong with this listing?',
  'report.open': 'Report',
  'report.hide': 'Hide',
  'report.reasonLabel': 'Reason',
  'report.reasonPlaceholder':
    'Misleading price, unauthorised cultural content, contact abuse, wrong community, etc.',
  'report.nameLabel': 'Your name',
  'report.contactLabel': 'Contact for follow-up',
  'report.sending': 'Sending…',
  'report.submit': 'Send report',
  'report.incomplete': 'Please fill in reason, your name and a contact so a reviewer can follow up.',
  'report.failed': 'Could not submit the report.',
  'report.received': 'Report received. A reviewer will look at this listing.',
  'report.generic': 'Something went wrong.',

  // ---------- buyer reviews ----------
  'reviews.title': 'Buyer reviews',
  'reviews.empty':
    'No reviews yet. A review appears only once its author has recorded a completed arrangement.',
  'reviews.scoreTail': '/ 5 from',
  'reviews.countOne': 'review',
  'reviews.countMany': 'reviews',
  'reviews.note':
    'Each review is tied to one completed arrangement that the reviewer recorded. Averages hide little: read the wording, and remember that {producer} may have other listings with different experiences.',
  'reviews.leaveFirst': 'You completed an arrangement here — leave a review',
  'reviews.leaveAnother': 'Add your review of a completed arrangement',

  // ---------- inquiry form ----------
  'inquiry.quantityLabel': 'Quantity ({unit})',
  'inquiry.minimumHint': 'Minimum {count} {unit}.',
  'inquiry.decrease': 'Decrease quantity',
  'inquiry.increase': 'Increase quantity',
  'inquiry.subtotal': 'Estimated subtotal',
  'inquiry.subtotalNote':
    'Not a total charge. Transport, coordination or packaging (if any) are agreed separately with the producer and disclosed before payment. Nothing has been paid.',
  'inquiry.nameLabel': 'Your name or organisation',
  'inquiry.contactLabel': 'How the producer can reply',
  'inquiry.contactHint': 'Phone number, email, or a coordinator contact.',
  'inquiry.preferenceLabel': 'Delivery preference',
  'inquiry.preference.pickup': 'Pickup at producer / meeting point',
  'inquiry.preference.delivery': 'Ask about delivery',
  'inquiry.preference.booking': 'Book a service session',
  'inquiry.preference.unsure': 'Not sure yet',
  'inquiry.dateLabel': 'Preferred date (optional)',
  'inquiry.messageLabel': 'Message to producer (optional)',
  'inquiry.queuedNote':
    'This inquiry is waiting on this device. It has not reached the producer yet: send it again once a connection returns.',
  'inquiry.submitting': 'Submitting…',
  'inquiry.submit': 'Submit inquiry',
  'inquiry.inquire': 'Send inquiry',
  'inquiry.submitted': 'Inquiry submitted.',
  'inquiry.referenceLine': 'Reference: {reference}. The producer will see it in their dashboard. Nothing has been paid.',
  'inquiry.openRecord': 'Open it in your records',
  'inquiry.openRecordTail': ' to follow up or cancel it.',
  'inquiry.errorName': 'Enter your name or organisation.',
  'inquiry.errorContact': 'Enter a phone number, email, or coordinator contact so the producer can reply.',
  'inquiry.errorMinQuantity': 'Enter a whole number of at least {count}.',
  'inquiry.errorMaxQuantity': 'Only {count} {unit} available right now.',
  'inquiry.errorOffline':
    'You are offline. This inquiry is saved on this device, and the form keeps its contents. Sending it again once a connection returns reuses the same reference, so the producer will not receive it twice.',
  'inquiry.errorFailed': 'Failed to submit inquiry.',
  'inquiry.errorGeneric': 'Something went wrong. Please retry.',

  // ---------- collective orders ----------
  'collective.indicativePrice': 'Indicative group price',
  'collective.indicativePriceUnknown': 'Buyer offered / TBD',
  'collective.deadline': 'Deadline',
  'collective.deadlineNone': 'No deadline set',
  'collective.pickupPlan': 'Pickup plan',
  'collective.transportPlan': 'Transport plan',
  'collective.transportPlanNone': 'To be agreed',
  'collective.stillNeeded': '{count} {unit} still needed',
  'collective.targetReached': 'Target reached — closing soon.',
  'collective.progressTail': ' / {target} {unit}',

  // ---------- sign in / account ----------
  'auth.signInEyebrow': 'Sign in',
  'auth.signInLiveTitle': 'Sign in to your account',
  'auth.signInLiveDescription': 'Sign in with the email and password on your account.',
  'auth.signInDemoTitle': 'Sign in as a demo account',
  'auth.signInDemoDescription':
    'Demo mode: choose a labelled sample account to look around. These are demonstration records, not real accounts, and nothing you do here reaches a real seller.',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.passwordHint': 'Minimum 6 characters.',
  'auth.signingIn': 'Signing in…',
  'auth.signInFailed': 'Sign in failed.',
  'auth.networkProblem': 'Network problem — sign in needs a connection.',
  'auth.noAccountYet': 'No account yet?',
  'auth.createOne': 'Create one',
  'auth.forgottenPassword': 'Forgotten your password?',
  'auth.resetIt': 'Reset it',
  'auth.noConfirmation': 'Never got the confirmation email?',
  'auth.resendIt': 'Resend it',
  'auth.punctuation': '.',
  'auth.genericError': 'Something went wrong.',

  // ---------- demo account picker (demo mode only) ----------
  'auth.demoSellingTitle': 'Producer and group accounts',
  'auth.demoSellingIntro': 'Open a selling dashboard, publish listings, and answer inquiries.',
  'auth.demoBuyerTitle': 'Buyer and visitor accounts',
  'auth.demoBuyerIntro':
    'See the buyer view of inquiries and arrangements. Tourists and customers share the same permissions.',
  'auth.demoAdminTitle': 'Administrator',
  'auth.demoAdminIntro': 'Review listings, verification requests and messages.',
  'auth.demoNoAccount': 'No sample account of this kind exists.',
  'auth.demoGuestPrefix': 'A buyer can also send an inquiry without an account: press “Send inquiry” on any ',
  'auth.demoGuestProducts': 'product',
  'auth.demoGuestMiddle': ' or ',
  'auth.demoGuestTourism': 'tourism',
  'auth.demoGuestTail': ' listing.',

  // ---------- support pages ----------
  'how.eyebrow': 'How it works',
  'how.title': 'A practical journey from producer to buyer',
  'how.description':
    'OmoNetTab supports a working end-to-end journey: publish clearly, receive an inquiry, and coordinate the exchange honestly. Payments and delivery happen outside the platform during the pilot.',
  'how.step1Title': 'Producer registers',
  'how.step1Body':
    'A producer, guide, group or cooperative creates a profile with display name, community, categories, and a consent flag. No identity documents are collected for a basic account.',
  'how.step2Title': 'Producer publishes',
  'how.step2Body':
    'Each listing includes unit price, unit of sale, available quantity, minimum order, availability, pickup options, and consent-respecting imagery. Prices never hide a mandatory fee.',
  'how.step3Title': 'Buyer discovers',
  'how.step3Body':
    'Buyers browse or search across products, tourism services and collective orders, filter by community, category, price, or availability, and open a listing.',
  'how.step4Title': 'Buyer inquires',
  'how.step4Body':
    'A buyer enters a quantity, sees an estimated subtotal, provides a contact channel, and submits the inquiry. The system responds with a reference number and never marks the record as a completed sale.',
  'how.step5Title': 'Producer responds',
  'how.step5Body':
    'The inquiry appears in the seller dashboard. The producer updates status honestly: new → accepted → awaiting confirmation → fulfillment arranged → completed or cancelled.',
  'how.step6Title': 'Collective orders',
  'how.step6Body':
    'Producers pool available quantities against a group opportunity. The platform aggregates totals, validates contributions against stock, and offers a shared transport cost calculator. Actual savings are never fabricated.',
  'how.trustTitle': 'Trust and transparency',
  'how.trustVerification': 'Verification statuses are explicit',
  'how.trustVerificationBody':
    'Only an authorised reviewer can move a profile to verified. The verification procedure itself is still being designed for the pilot.',
  'how.trustConsent': 'Consent-aware cultural content',
  'how.trustConsentBody':
    'Cultural performances, ceremonies, and community images are only published with recorded consent. The platform never commercialises sensitive cultural knowledge by default.',
  'how.trustSample': 'Sample data is labelled',
  'how.trustSampleBody':
    'Every sample producer, listing, and opportunity carries a visible “Sample data” tag. We never present placeholders as documentary evidence of a real producer.',

  'contact.eyebrow': 'Contact',
  'contact.title': 'Talk to the OmoNetTab team',
  'contact.description':
    'Use this form for anything the marketplace itself: a listing that looks wrong, help contacting a producer, a group that wants to organise a collective order, or feedback from a pilot area. Messages reach an administrator, not the producer — a producer answers you through the inquiry on their listing.',
  'contact.metadataDescription': 'Send a message to the OmoNetTab team about a product, a service, or a concern.',
  'contact.otherWays': 'Other ways to reach us',
  'contact.emailLabel': 'Email:',
  'contact.phoneLabel': 'Phone:',
  'contact.noEmail':
    'No direct email address has been published for this instance yet. An administrator can add one in the admin settings.',
  'contact.noPhone': 'No phone line has been published for this instance yet.',
  'contact.adminMaintained':
    'These details are added by the team, so they only appear once they have been provided.',
  'contact.beforeYouWrite': 'Before you write',
  'contact.before1':
    'To ask about a specific product or experience, use “Send inquiry” on that listing — the producer sees it directly.',
  'contact.before2': 'To report a listing, use the “Report listing” link on the listing page.',
  'contact.before3': 'This form records an enquiry. It is not an order, a booking, or a payment.',
  'contact.noSmsBadge': 'No SMS or phone integration is connected',
  'contact.formName': 'Your name',
  'contact.formEmail': 'Email we can reply to',
  'contact.formSubject': 'Subject',
  'contact.formSubjectHint': 'For example: a product question, a booking, or a reporting concern.',
  'contact.formSubjectDefault': 'General enquiry',
  'contact.formMessage': 'Message',
  'contact.formMessageHint': 'At least 10 characters. Please do not send ID documents or payment details.',
  'contact.formSending': 'Sending…',
  'contact.formSubmit': 'Send message',
  'contact.formSent': 'Thank you. Your message is recorded for an administrator to read. It is not an order or a booking.',
  'contact.formFailed': 'The message could not be sent.',
  'contact.formNetwork': 'Network problem — the message stayed on your device.',
  'contact.noSmsBody': 'OmoNetTab does not send or receive SMS, USSD or payment messages.',

  'privacy.eyebrow': 'Privacy',
  'privacy.title': 'Data minimisation and consent',
  'privacy.description':
    'OmoNetTab is designed to collect the information a marketplace needs. This notice is a draft, to be finalised with community input and legal review.',
  'privacy.storeTitle': 'What we store',
  'privacy.store1':
    'Producer display name, community, operating area and short bio — only after recorded consent.',
  'privacy.store2': 'Listing title, description, price, unit, quantity, availability and pickup options.',
  'privacy.store3': 'Buyer inquiry fields: name, contact channel, quantity, message, preference and optional date.',
  'privacy.store4': 'Group opportunity records and per-producer contributions.',
  'privacy.store5': 'Verification decisions and report submissions for administrative review.',
  'privacy.skipTitle': 'What we do not store',
  'privacy.skip1': 'Identity documents for a basic demo account.',
  'privacy.skip2':
    'Payment card numbers or wallet credentials — a hosted checkout keeps those with the provider, and demo mode only simulates payment.',
  'privacy.skip3': 'Precise geo-coordinates or household locations.',
  'privacy.skip4': 'Ceremony details, sacred knowledge or unconsented community images.',

  'guidelines.eyebrow': 'Community',
  'guidelines.title': 'Community guidelines',
  'guidelines.description':
    'How producers, buyers and coordinators treat one another on OmoNetTab. Drafted for pilot validation with community partners.',
  'guidelines.publishing': 'Publishing rules',
  'guidelines.publishing1':
    'Every listing must state a unit price in ETB and a unit of sale. Hidden fees are not allowed.',
  'guidelines.publishing2':
    'Images must be genuinely of the item or service being offered, and clearly labelled as placeholder if not.',
  'guidelines.publishing3':
    'Ceremonies, sacred sites, and cultural practices are not commercialised without recorded community consent.',
  'guidelines.publishing4':
    'Producer location is published at community level only when the producer consents.',
  'guidelines.behaviour': 'Behaviour',
  'guidelines.behaviour1':
    'Respond to inquiries honestly. Never mark an inquiry “completed” if the goods or service have not been exchanged.',
  'guidelines.behaviour2': 'Never claim that a payment has been received unless it has.',
  'guidelines.behaviour3':
    'Respect coordinators running collective orders. Contributions are commitments to a group.',
  'guidelines.behaviour4':
    'Report misleading listings or inappropriate cultural content through the “Report” action on any listing.',
  'guidelines.disputes': 'Disputes',
  'guidelines.disputesBody':
    'Most disagreements are resolved through direct conversation. When they are not, a reviewer mediates using the recorded inquiry timeline, contributions log and consent records.',
  'guidelines.impact': 'Impact measurement',
  'guidelines.impactBodyPrefix': 'A future pilot should measure net producer benefit ',
  'guidelines.impactBodyAfter': 'after',
  'guidelines.impactBodySuffix':
    ' transport, packaging, coordination and platform costs. Numbers shown in the admin dashboard are demo data, not measured impact. We never publish fabricated statistics, testimonials or endorsement claims.',

  // ---------- footer ----------
  'footer.demoModeNote': 'Running in demo mode with sample listings.',
  'footer.liveModeNote':
    'Connected to a Supabase project; records shown are real data entered by accounts on this instance.',
  'footer.community': 'Community',
  'footer.tourismServices': 'Tourism services',
  'footer.impact': 'Impact',
  'footer.guidelines': 'Community guidelines',
  'footer.privacy': 'Privacy',
  'footer.offline': 'Offline use',
  'footer.contactLead': 'Use the ',
  'footer.contactFormLink': 'contact form',
  'footer.contactTail': ' — messages reach an administrator of this instance.',
  'footer.copyright': '© {year} {siteName}.',
  'footer.workflowNote':
    'Seller verification is still being set up, and payments need a configured provider before any money can move.',

  // ---------- error pages ----------
  'notFound.eyebrow': '404',
  'notFound.title': 'That page does not exist',
  'notFound.description':
    'The address may be mistyped, an old link, or a listing that has been archived by its producer. Nothing was deleted from your side.',
  'notFound.backHome': 'Back to the marketplace',
  'notFound.helpPrefix': 'Looking for a specific producer or listing? Use ',
  'notFound.searchFilters': 'search and filters',
  'notFound.helpMiddle': ', or send a note through ',
  'notFound.contact': 'contact',
  'notFound.helpSuffix': ' and we will help you find it.',
  'accessDenied.eyebrow': 'Not available',
  'accessDenied.title': 'Your account cannot open this area',
  'accessDenied.description':
    'You are signed in, but this part of OmoNetTab is limited to a different account type. Nothing was changed and nothing was exposed. If you believe you should have access, ask an administrator to review your account role.',
  'accessDenied.body':
    'Producers open the selling dashboard, buyers and visitors open the buyer area, and only administrators reach the moderation tools.',
  'accessDenied.dashboard': 'Go to my dashboard',
  'accessDenied.buyerArea': 'Buyer area',

  // ---------- payment workflow ----------
  'payment.heading': 'Payment',
  'payment.proceed': 'Proceed to Payment',
  'payment.opening': 'Opening the payment…',
  'payment.checkStatus': 'Check payment status',
  'payment.checking': 'Asking the provider…',
  'payment.cancelAttempt': 'Cancel this payment attempt',
  'payment.cancelling': 'Cancelling…',
  'payment.simulatedBadge': 'Simulated payment',
  'payment.simulatedNote':
    'Demo mode: this checkout is simulated. No money moves, no provider is contacted, and nothing here is a live payment.',
  'payment.status.pending': 'Awaiting payment',
  'payment.status.confirmed': 'Paid',
  'payment.status.failed': 'Payment failed',
  'payment.status.cancelled': 'Payment cancelled',
  'payment.status.expired': 'Checkout expired',
  'payment.status.refunded': 'Refunded',
  'payment.referenceLine': 'Payment reference: {reference}',
  'payment.windowLine': 'This checkout closes {when}.',
  'payment.attemptLine': '{status} on {when}.',
  'payment.noneYet': 'No payment has been recorded for this inquiry.',
  'payment.awaitingSeller': 'The producer has not answered this inquiry yet, so there is no agreed amount to pay.',
  'payment.noPrice': 'No price was documented for this item, so there is nothing to pay until the producer quotes one.',
  'payment.closed': 'This inquiry is closed, so no new payment can be started against it. Any attempt already made keeps its own record.',
  'payment.suspended': 'This account is suspended, so no payment can be started from it. Ask an administrator to reactivate the account first.',
  'payment.amountLine': 'Amount taken from your inquiry record: {amount}.',
  'payment.amountLabel': 'Amount on the record',
  'payment.windowCloses': 'Checkout closes',
  'payment.receipt': 'Download PDF receipt',
  'payment.quotation': 'Download quotation (PDF)',
  'payment.acknowledgement': 'Download inquiry acknowledgement (PDF)',
  'payment.notPaidReceipt': 'Nothing has been paid, so this document is a quotation rather than a receipt.',
  'payment.refundedNote': 'The money was returned. The original payment and the refund are both on the record.',
  'payment.attemptCount': 'Payment attempts recorded on this inquiry: {count}. Each one keeps its own reference and its own history.',
  'payment.startFailed': 'The payment could not be started.',
  'payment.tryAgain': 'Something went wrong. Please try again.',
  'demoCheckout.title': 'Simulated checkout (demo mode)',
  'demoCheckout.choose': 'Choose how this demonstration ends',
  'demoCheckout.success': 'Pay now (simulated success)',
  'demoCheckout.pending': 'Leave it awaiting payment',
  'demoCheckout.failed': 'Payment fails',
  'demoCheckout.cancelled': 'Cancel the checkout',
  'demoCheckout.footnote':
    'The status on the inquiry comes from the verification step that reads this answer back, not from the button itself.',
  'payment.backToInquiry': 'Back to this inquiry',
  'payment.sellerViewNote':
    'Shown to you read-only because the inquiry came to your listing. The status is whatever a verified provider answer reported; nothing on this page can change it, and it does not mean the money has reached you — settlement is the provider’s and your own arrangement with the buyer.',

  // ---------- printable documents ----------
  'inquiry.status.new': 'New — the producer has not answered',
  'inquiry.status.accepted': 'Accepted by the producer',
  'inquiry.status.awaiting_confirmation': 'Awaiting confirmation',
  'inquiry.status.fulfillment_arranged': 'Pickup or delivery arranged',
  'inquiry.status.completed': 'Completed',
  'inquiry.status.cancelled': 'Cancelled',
  'receipt.kind.receipt': 'Payment receipt',
  'receipt.kind.pending': 'Payment summary — not a receipt',
  'receipt.kind.acknowledgement': 'Inquiry record — not a receipt',
  'receipt.rule.receipt': 'One payment a provider confirmed, printed from the stored record.',
  'receipt.rule.pending': 'No payment has been confirmed, so this document claims no money.',
  'receipt.rule.acknowledgement': 'What was asked for and what it was estimated at. Nothing here has been paid.',
  'receipt.billedTo': 'Billed to',
  'receipt.soldBy': 'Sold by',
  'receipt.listing': 'Listing',
  'receipt.documentNumber': 'Document number',
  'receipt.generatedAt': 'Generated',
  'receipt.paymentReference': 'Payment reference',
  'receipt.inquiry': 'Inquiry reference',
  'receipt.inquiryStatus': 'Inquiry status on the record',
  'receipt.paymentStatus': 'Payment status on the record',
  'receipt.provider': 'Taken through',
  'receipt.method': 'Method reported',
  'receipt.providerReference': 'Provider reference',
  'receipt.openedAt': 'Attempt opened',
  'receipt.confirmedAt': 'Confirmed at',
  'receipt.closedAt': 'Closed at',
  'receipt.checkoutCloses': 'Checkout window closes',
  'receipt.sentAt': 'Inquiry sent',
  'receipt.item': 'Item',
  'receipt.itemHeading': 'What this covers',
  'receipt.description': 'Description',
  'receipt.quantity': 'Quantity',
  'receipt.unitPrice': 'Unit price',
  'receipt.amount': 'Amount',
  'receipt.subtotal': 'Estimate on the inquiry',
  'receipt.amountOnRecord': 'Amount on the payment record',
  'receipt.confirmedAmount': 'Confirmed as received',
  'receipt.refundedAmount': 'Returned to the buyer',
  'receipt.fee': 'Fee the provider reported',
  'receipt.recordHeading': 'The record this document was built from',
  'receipt.notesHeading': 'What this document does and does not mean',
  'receipt.verificationNote':
    'Only a server-side check of the provider’s own record can mark a payment confirmed. A browser arriving back on this site is not proof of payment, so this document exists only after that check.',
  'receipt.refundNote':
    'This payment was refunded: the amount confirmed by the provider was returned, so it is not money the seller kept.',
  'receipt.pendingNotice':
    'This payment is not confirmed, so this is a summary and not a receipt. The amount shown is the figure stored on the record, not a claim that it arrived.',
  'receipt.checkoutNote':
    'A checkout address was opened for this attempt. Opening it pays nothing; a payment appears here only once the provider’s answer has been verified.',
  'receipt.failureLine': 'The provider reported a reason for this outcome, and it is stored on the payment record.',
  'receipt.acknowledgementNotice':
    'This records an inquiry and the server’s estimate at the listing price. It is not an invoice, not a quotation you are obliged by, and not a receipt: no payment is confirmed against it.',
  'receipt.amountMismatch':
    'The amount on the payment record differs from the estimate on the inquiry. Both figures are printed exactly as they are stored.',
  'receipt.demoStamp': 'Simulated payment — demo mode',
  'receipt.demoNotice':
    'This payment was produced by the demo simulator. No money moved, no provider was involved, and this document is not evidence of a real transaction.',
  'receipt.demoInquiryNotice':
    'This inquiry is sample data shipped with the demo build, not a real request from a real buyer.',
  'receipt.charsetNote':
    'Some characters in the stored records cannot be drawn by the font this document uses and are printed as ?. The record itself still holds the original text.',
  'receipt.languageNote.font':
    'This document is printed in English because the font it uses cannot draw the characters of your interface language. The screen shows the same wording in your language.',
  'receipt.languageNote.untranslated':
    'This document is printed in English because OmoNetTab has no reviewed wording for your interface language yet. The screen tells you which languages still need a reviewer.',
  'receipt.footerRegenerate':
    'Generated when asked for, from the stored records. No copy of this document is kept on the server.',
  'receipt.pageOf': 'Page {page} of {pages}',
  'receipt.downloadReceipt': 'Download PDF receipt',
  'receipt.downloadPaymentSummary': 'Download payment summary (PDF)',
  'receipt.downloadInquiryRecord': 'Download inquiry record (PDF)',
  'receipt.downloadNote':
    'Built from the stored record when you ask for it, so it always matches what the platform holds. It is not a second copy of your data.',

  // ---------- appearance ----------
  'settings.theme': 'Theme appearance',
  'settings.themeIntro':
    'Choose light or dark. The colours change straight away and the next page you open is painted with the same choice before it appears. Signed-in accounts also keep the choice on their own profile.',
  'settings.themeLight': 'Light',
  'settings.themeDark': 'Dark',
  'settings.themeSaved': 'Saved on your account and on this browser.',
  'settings.themeSavedDevice': 'Saved on this browser. Nobody is signed in, so another device will not show it.',
  'settings.themeSavedAccountFailed':
    'Saved on this browser, but it could not be saved to your account. Your choice will not follow you to another device.',
  'settings.themeFailed': 'The appearance could not be saved.',

  // ---------- administrator reports ----------
  'reports.title': 'Daily and weekly reports',
  'reports.daily': 'Daily report',
  'reports.weekly': 'Weekly report',
  'reports.custom': 'Custom range',
  'reports.from': 'From',
  'reports.to': 'To',
  'reports.run': 'Run report',
  'reports.exportCsv': 'Export CSV',
  'reports.exportPdf': 'Export PDF',
  'reports.status': 'Status',
  'reports.seller': 'Seller',
  'reports.category': 'Category',
  'reports.provider': 'Payment provider',
  'reports.allOptions': 'All',
  'reports.empty': 'No records fall inside this range.',
  'reports.inquiries': 'Inquiries',
  'reports.attempts': 'Payment attempts',
  'reports.confirmed': 'Confirmed payments',
  'reports.revenue': 'Confirmed revenue',
  'reports.awaiting': 'Awaiting payment',
  'reports.closed': 'Failed, cancelled or expired',
  'reports.refunded': 'Refunded',
  'reports.intro':
    'Activity inside one window of time, counted from the stored records only. The figures below are what the platform has on file: they are not a bank statement, and a confirmed payment means a provider reported receiving the money, not that it has reached the seller’s hands.',
  'reports.range': 'Reporting window',
  'reports.summaryHeading': 'Summary',
  'reports.pdfClaim':
    'A count of the inquiry and payment records stored inside one window. Only payments whose own status is confirmed are counted as revenue.',
  'reports.demoStamp': 'Simulated records — demo mode',
  'reports.countingRules':
    'Pending, failed, cancelled and expired attempts are never added to revenue. A refund is reported apart from revenue rather than subtracted silently. Each payment reference is counted once, so a repeated provider notification and a buyer’s retries do not inflate a total, and an arrangement paid twice still counts as one paid inquiry.',
  'reports.timezoneNote':
    'Days are measured in {timeZone}. An attempt is counted in the day it was opened while it awaits its outcome, and in the day its status was reached once it is confirmed, closed or refunded.',
  'reports.csvNote':
    'The CSV export carries one row per payment attempt, with the window printed on every row, so a total made in a spreadsheet follows the same rule as this page: sum the rows whose counts_as_revenue is true.',
  'reports.inquiryFilterNote':
    'The payment status and provider filters apply to payment figures only. The inquiry count follows the window, the seller and the category.',
  'reports.invalidCustom':
    'The dates given do not make a readable window — wrong format, reversed, or further apart than a year — so today’s report is shown instead.',
  'reports.demoRows':
    'Simulated demo data: {count} of the payment attempts in this window. They are counted here because they are stored, and labelled because no money moved.',
  'reports.paidInquiries': 'Arrangements paid',
  'reports.fees': 'Provider fees reported',
  'reports.count': 'Records',
  'reports.amount': 'Amount on record',
  'reports.countsAsRevenue': 'Counts as revenue',
  'reports.yes': 'Yes',
  'reports.no': 'No',
  'reports.byDay': 'Day by day',
  'reports.bySeller': 'By seller',
  'reports.byCategory': 'By category',
  'reports.byProvider': 'By payment provider',
  'reports.paymentRows': 'Payment attempts in this window',
  'reports.reference': 'Payment reference',
  'reports.inquiryRef': 'Inquiry',
  'reports.simulated': 'Simulated',
  'reports.day': 'Day',
  'reports.notRevenueNote':
    'Only payments whose stored status is confirmed are counted as revenue. Confirmed means a provider’s verification reported an amount matching this record; it does not mean the money has reached the seller, which is the seller’s own arrangement with the buyer.',
  'reports.rowsShown': '{shown} of {total} attempts are listed here; the CSV and PDF exports follow the same window.',
  'reports.emptyDemoNote': 'Demo mode stores no payment attempt until one is made on a buyer’s inquiry page.',
  'reports.emptyLedgerNote':
    'If no attempt appears at all, the payments table may not exist yet: migration 0006 has to be reviewed and applied before attempts can be stored.',
  'reports.receiptsLinkNote':
    'A receipt is printed from the payment record itself, so it is offered on the Payments tab and on the buyer’s and seller’s inquiry pages rather than assembled out of a report row.',
  'reports.openLedger': 'Open the payment ledger',
  'reports.otherReportsTitle': 'This tab is not the reported-listings queue',
  'reports.otherReportsBody':
    'The “Reports” tab in this navigation is the queue of listings visitors have asked to have reviewed. Nothing is decided here: this page only counts the inquiries and payment attempts that are stored, while a decision about a listing is recorded with its reason in that queue.',
  'reports.openListingReports': 'Open the reported-listings queue',
  'reports.rowsOmitted': '{omitted} further rows in “{table}” are not printed here; the CSV export carries all of them.',

  // ---------- brand ----------
  'brand.tagline': 'Connecting Cultures and Commerce'
} as const;

export type TranslationKey = keyof typeof en;
export type TranslationSet = { [K in TranslationKey]: string };
