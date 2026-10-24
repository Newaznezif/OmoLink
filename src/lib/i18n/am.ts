import type { TranslationSet } from './en';

/**
 * Amharic is deliberately a *small* set of high-confidence interface terms, not a
 * full translation. `amReviewPending` is what makes the UI say so: whenever
 * Amharic is active the page shows a draft notice, and everything without an
 * entry here renders in English instead of pretending to be translated.
 *
 * The whole file must be reviewed and corrected by competent Amharic speakers
 * before it is presented to anyone in a pilot. Contributions are welcomed in the
 * shape of this file — see the README section on translations.
 */
export const amReviewPending = true;

export const am: Partial<TranslationSet> = {
  'common.search': 'ፈልግ',
  'common.any': 'ሁሉም',
  'common.viewAll': 'ሁሉንም ይመልከቱ',
  'common.interfaceLanguage': 'ቋንቋ',

  'nav.explore': 'አስደሰት',
  'nav.products': 'ምርቶች',
  'nav.tourism': 'ቱሪዝም',
  'nav.collective': 'ጋራ ትዕዛዞች',
  'nav.how': 'እንዴት እንደሚሰራ',
  'nav.contact': 'ያግኙን',
  'nav.signIn': 'ግባ',
  'nav.signOut': 'ውጣ',
  'nav.register': 'ተመዝገብ',
  'nav.createAccount': 'መለያ ፍጠር',
  'nav.team': 'ቡድን',
  'nav.pricing': 'የዋጋ ስሌት',
  'nav.myDashboard': 'የእኔ ዳሽቦርድ',
  'nav.myInquiries': 'የእኔ ጠያቆች',
  'nav.adminArea': 'የአስተዳዳሪ ክፍል',
  'nav.primaryAria': 'ዋና ዝርጋ',

  'status.verified': 'ተረጋግጧል',
  'status.pending': 'በማረጋገጥ ላይ',
  'status.unverified': 'አልተረጋገጠም',
  'status.available': 'አለ',
  'status.unavailable': 'የለም',
  'status.sampleData': 'ናሙና መረጃ',

  'listing.descriptionTitle': 'መግለጫ',
  'listing.unitPrice': 'የነጠላ ዋጋ',

  'inquiry.inquire': 'ጠያቅ ላክ',
  'inquiry.submit': 'ጠያቅ ላክ',
  'inquiry.subtotal': 'ንዑስ ድምር',
  'inquiry.nameLabel': 'ስምዎ ወይም ድርጅትዎ',

  'filter.category': 'ምድብ',
  'filter.community': 'ማህበረሰብ',

  'auth.email': 'ኢሜይል',
  'auth.password': 'የይለፍ ቃል',

  'footer.privacy': 'ግላዊነት',
  'footer.community': 'ማህበረሰብ',

  // ---------- homepage ----------
  'common.clear': 'አጽዳ',
  'common.openLink': 'ክፈት →',
  'home.browseProducts': 'ምርቶችን ይመልከቱ',
  'home.browseTourism': 'የቱሪዝም አገልግሎቶችን ይመልከቱ',
  'home.searchLabel': 'ዝርዝሮችን ፈልግ',
  'home.searchPlaceholder': 'ምርት፣ አገልግሎት ወይም ሻጭ ፈልግ…',
  'home.categoriesTitle': 'ምድቦች',
  'home.featuredProductsTitle': 'የተመረጡ የአካባቢ ምርቶች',
  'home.featuredTourismTitle': 'የቱሪዝም አገልግሎቶች',
  'home.producersTitle': 'የተመረጡ አምራቾች',
  'home.collectiveTitle': 'የተከፈቱ የጋራ ትዕዛዞች',
  'home.howTitle': 'OmoNetTab አምራች ከደንበኞች እንዴት እንደሚገናኝ',
  'home.trustTitle': 'ታማኝ ሁኔታ፣ ግልጽ ፈቃድ',
  'home.teamEyebrow': 'መስራቶች እና ቡድን',
  'home.teamTitle': 'OmoNetTab የሚሰሩት አምስት ሰዎች',
  'home.teamLink': 'ቡድኑን ይመልከቱ',

  // ---------- founders & team ----------
  'team.eyebrow': 'መስራቶች እና ቡድን',
  'team.title': 'OmoNetTab የሚሰሩት ሰዎች',
  'team.role.newaz': 'የሳይበር ደህንነት ተንታኝ እና የአርቴፊሻል ኢንተለጀንስ መሐንዲስ',
  'team.role.tsion': 'የሥራ ዕቅድና አስተባባር',
  'team.role.abraham': 'የአቅጣጫ ሐሳብና ጥቅስ ማዘጋጀት',
  'team.role.etsub': 'የሥራ ክትትልና የማቅረብ ድጋፍ',
  'team.role.boum': 'የሰነድ ግምገማና የማቅረብ ድጋፍ',
  'team.contribution.newaz':
    'የቴክኒክ ልማት፣ የመተግበሪያ ንድፍ፣ የሳይበር ደህንነት እና የስርዓት ትግበራ ይመራል።',
  'team.contribution.tsion':
    'የቡድን እንቅስቃሴዎችን ያስተባብራል፣ ሥራዎችን ለመለየትና ለማደራጀት ይረዳል፣ የመጨረሻውን ደረጃ ትግበራ ይደግፋል።',
  'team.contribution.abraham':
    'የፕሮጀክት አቅጣጫ ያዘጋጃል፣ በሐሳብ ጽሑፍ ይተዋወራል፣ የፕሮጀክት ሰነድ ድጋፍ ይሰጣል።',
  'team.contribution.etsub':
    'የሥራ እድገት ይከታከታል፣ የቡድንን ፍጥነት ለመጠበቅ ይረዳል፣ የማቅረብ ዝግጅት ይደግፋል።',
  'team.contribution.boum':
    'የፕሮጀክት ሰነዶችን ለግልጽነትና ተከታታይነት ይገመግማል፣ የማቅረብ ዝግጅት ይተዋወራል።',

  // ---------- listing detail ----------
  'listing.pricingTitle': 'ዋጋና ክምችት',
  'listing.unitOfSale': 'የሽያጭ መለኪያ',
  'listing.availableQuantity': 'የሚገኝ ብዛት',
  'listing.minimumOrder': 'ዝቅተኛ ትዕዛዝ',
  'listing.inquiryTitle': 'ጠያቅ ላክ',
  'listing.relatedTitle': 'የተዛማጅ ዝርዝሮች',
  'listing.pickupTitle': 'የመውሰጃ ምርጫዎች',
  'listing.delivery': 'ማድረስ',
  'listing.lastUpdated': 'የመጨረሻ ማዘመን',

  // ---------- opportunity and contribution status ----------
  'status.opportunity.open': 'ተከፍቷል',
  'status.opportunity.closingSoon': 'በቅርቡ ይዘጋል',
  'status.opportunity.closed': 'ተዘግቷል',
  'status.opportunity.fulfilled': 'ተሟሟል',
  'status.opportunity.cancelled': 'ተሰርዟል',
  'collective.contributionStatus.pending': 'በመጠባበቅ ላይ',
  'collective.contributionStatus.confirmed': 'ተረጋግጧል',
  'collective.contributionStatus.withdrawn': 'ተነስቷል',

  // ---------- collective orders ----------
  'collective.listTitle': 'የተከፈቱ የጋራ ትዕዛዞች',
  'collective.buyTitle': 'ከዚህ የጋራ ትዕዛዝ ይግዙ',
  'collective.buyEmptyTitle': 'እስካሁን ሊዛወር የሚችል ምርት የለም',
  'collective.chooseProduct': 'ምርት ይምረጡ',
  'collective.sellerLabel': 'ሻጭ',
  'collective.progress': 'እድገት',
  'collective.recordedContributions': 'የተመዘገቡ አስተዋጽኦዎች',
  'collective.producerHeader': 'አምራች',
  'collective.deadline': 'የመጨረሻ ቀን',
  'collective.pickupPlan': 'የመውሰጃ እቅድ',
  'collective.transportPlan': 'የማጓጓዣ እቅድ',
  'collective.noteLabel': 'ለአስተባባሪ ማስታወሻ (አማራጭ)',
  'collective.addContribution': 'አስተዋጽኦ ጨምር',
  'collective.contributeAsProducer': 'እንደ አምራች አስተዋጽኦ ያድርጉ',
  'collective.yourStockTitle': 'ለማስገባት የሚችሉት ክምችት',

  // ---------- inquiry form ----------
  'inquiry.quantityLabel': 'ብዛት ({unit})',
  'inquiry.submitting': 'በመላክ ላይ…',
  'inquiry.submitted': 'ጠያቅ ተልኳል።',
  'inquiry.contactLabel': 'አምራች ሊመልስብዎ የሚችልበት መንገድ',
  'inquiry.preferenceLabel': 'የማድረስ ምርጫ',
  'inquiry.messageLabel': 'ለአምራች መልእክት (አማራጭ)',
  'inquiry.errorName': 'ስምዎን ወይም ድርጅትዎን ያስገቡ።',
  'inquiry.errorContact': 'አምራች ሊመልስብዎ እንደሚችል ስልክ፣ ኢሜይል ወይም የአስተባባሪ መገናኛ ያስገቡ።',
  'inquiry.errorMinQuantity': 'ቢያንስ {count} የሆነ ሙሉ ቁጥር ያስገቡ።',
  'inquiry.errorMaxQuantity': 'አሁን {count} {unit} ብቻ ይገኛል።',

  // ---------- sign in ----------
  'auth.signInEyebrow': 'ግባ',
  'auth.signInDemoTitle': 'እንደ ናሙና መለያ ግባ',
  'auth.signInLiveTitle': 'ወደ መለያዎ ግባ'
};
