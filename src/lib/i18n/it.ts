import type { TranslationSet } from './en';

/**
 * Italian interface wording. Typed as a full `TranslationSet`, so a missing key
 * is a build error rather than a silent English fallback. Machine-assisted draft:
 * it has not been reviewed by an Italian-speaking colleague yet.
 */
export const it: TranslationSet = {
  'common.skipToMain': 'Vai al contenuto principale',
  'common.search': 'Cerca',
  'common.any': 'Qualsiasi',
  'common.clear': 'Cancella',
  'common.viewAll': 'Vedi tutto →',
  'common.openLink': 'Apri →',
  'common.demoBanner':
    'Anteprima in modalità dimostrativa — i venditori non sono verificati e i pagamenti sono simulati.',
  'common.interfaceLanguage': 'Lingua dell’interfaccia',
  'common.membersSample': '{count} membri (esempio)',

  'language.suffix.complete': '',
  'language.suffix.partial': ' — parziale',
  'language.suffix.draft': ' — bozza, da revisionare',
  'language.suffix.none': ' — nessuna traduzione',
  'language.suffix.unreviewed': ' — completa, da revisionare',
  'language.notice.draft':
    'I testi in {language} sono una bozza automatica non ancora revisionata da un madrelingua. Il testo non revisionato viene mostrato in inglese.',
  'language.notice.unreviewed':
    'Tutte le etichette dell’interfaccia in {language} hanno un testo, ma è una bozza automatica che nessun madrelingua ha ancora revisionato.',
  'language.notice.none':
    'Non esiste ancora una traduzione verificata in {language}, quindi l’interfaccia resta in inglese. L’opzione rimane selezionabile per poterla provare non appena le traduzioni saranno disponibili.',
  'language.notice.areas':
    'Alcune pagine restano in inglese finché altro testo in {language} non sarà stato revisionato.',
  'language.notice.catalog':
    'Le categorie e il testo degli annunci di esempio in {language} non sono ancora stati verificati da un madrelingua; il testo originale del produttore viene sempre conservato.',

  'nav.explore': 'Esplora',
  'nav.products': 'Prodotti',
  'nav.tourism': 'Turismo',
  'nav.sellers': 'Venditori',
  'nav.collective': 'Ordini collettivi',
  'nav.how': 'Come funziona',
  'nav.pricing': 'Strumento di prezzo',
  'nav.contact': 'Contatti',
  'nav.primaryAria': 'Navigazione principale',
  'nav.primaryMobileAria': 'Navigazione principale per dispositivi mobili',
  'nav.signIn': 'Accedi',
  'nav.createAccount': 'Crea un account',
  'nav.register': 'Registrati',
  'nav.signOut': 'Esci',
  'nav.myInquiries': 'Le mie richieste',
  'nav.myDashboard': 'La mia bacheca',
  'nav.adminArea': 'Area di amministrazione',
  'nav.homeAria': 'Pagina iniziale di {siteName}',

  'status.verified': 'Verificato',
  'status.pending': 'In attesa di revisione',
  'status.unverified': 'Non verificato',
  'status.verifiedHint': 'Approvato da un revisore autorizzato.',
  'status.pendingHint': 'In attesa della decisione di un revisore autorizzato.',
  'status.unverifiedHint': 'Nessuna verifica registrata.',
  'status.demoSuffix': ' (Simulato in modalità dimostrativa.)',
  'status.demoTag': '· demo',
  'status.sampleData': 'Dati di esempio',
  'status.sampleDataHint':
    'Questo record è un dato di esempio usato per la dimostrazione. Non rappresenta un produttore reale, un prodotto reale o una comunità verificata.',
  'status.available': 'Disponibile',
  'status.availableCount': 'Disponibile ({count})',
  'status.limited': 'Limitato ({count})',
  'status.limitedStock': 'Scorte limitate',
  'status.limitedOption': 'Limitate',
  'status.madeToOrder': 'Realizzato su ordinazione',
  'status.seasonal': 'Stagionale',
  'status.unavailable': 'Non disponibile',
  'status.opportunity.open': 'Aperto',
  'status.opportunity.closingSoon': 'In chiusura',
  'status.opportunity.closed': 'Chiuso',
  'status.opportunity.fulfilled': 'Evaso',
  'status.opportunity.cancelled': 'Annullato',

  'listing.unitSuffix': '/ {unit}',
  'listing.minOrder': 'Minimo {count} {unit}',
  'listing.availabilityLabel': 'Disponibilità',

  'home.browseProducts': 'Sfoglia i prodotti',
  'home.browseTourism': 'Sfoglia i servizi turistici',
  'home.searchLabel': 'Cerca inserzioni',
  'home.searchPlaceholder': 'Cerca prodotti, servizi, produttori…',
  'home.searchNote':
    'La ricerca e i filtri della pagina dei risultati agiscono su record reali in questa versione — un risultato vuoto lo dice chiaramente invece di mostrare righe di esempio.',
  'home.categoriesEyebrow': 'Sfoglia per',
  'home.categoriesTitle': 'Categorie',
  'home.categoriesDescription': 'Ogni categoria ha una pagina dei risultati funzionante.',
  'home.featuredProductsTitle': 'Prodotti locali in evidenza',
  'home.featuredProductsEyebrow': 'Selezionati dal team',
  'home.featuredTourismTitle': 'Servizi turistici',
  'home.featuredTourismEyebrow': 'Esperienze guidate',
  'home.featuredEmpty':
    'In questo gruppo non è ancora stato pubblicato nulla. Un’amministratrice o un amministratore può mettere in evidenza le inserzioni dalle impostazioni della pagina iniziale.',
  'home.producersEyebrow': 'Comunità',
  'home.producersTitle': 'Produttori in evidenza',
  'home.producersDescription': 'Profili di esempio. Non presentarli come produttori reali e verificati.',
  'home.producersEmpty': 'Nessun profilo di vendita è ancora stato pubblicato.',
  'home.collectiveEyebrow': 'Vendita collettiva',
  'home.collectiveTitle': 'Ordini di gruppo aperti',
  'home.collectiveDescription':
    'Occasioni di esempio che mostrano come i produttori mettono in comune le quantità per servire acquirenti all’ingrosso.',
  'home.collectiveEmpty': 'Nessun ordine di gruppo è aperto in questo momento.',
  'home.howEyebrow': 'Vendita diretta',
  'home.howTitle': 'Come OmoNetTab aiuta un produttore a entrare in contatto con i clienti',
  'home.howStep1Title': '1. Pubblicare con chiarezza',
  'home.howStep1Body':
    'I produttori elencano prodotti e servizi con prezzo unitario esplicito, unità di vendita, disponibilità, ordine minimo e opzioni di ritiro. Nessun costo nascosto.',
  'home.howStep2Title': '2. Gli acquirenti inviano richieste',
  'home.howStep2Body':
    'L’acquirente inserisce la quantità, vede il subtotale stimato e invia una richiesta che genera un numero di riferimento. Nulla viene contrassegnato automaticamente come venduto.',
  'home.howStep3Title': '3. Concordare fuori dalla piattaforma',
  'home.howStep3Body':
    'Produttore e acquirente concordano pagamento, ritiro e consegna nel mondo reale. La bacheca segue lo stato della richiesta in modo onesto.',
  'home.poolingTitle': 'Mettere in comune l’offerta per gli acquirenti all’ingrosso',
  'home.poolingDescription':
    'I produttori possono aderire a un’occasione di gruppo, contribuire con la quantità disponibile e coordinare un trasporto condiviso.',
  'home.poolingProducers': 'Cosa vedono i produttori',
  'home.poolingProducers1': 'Quantità aggregata rispetto all’obiettivo',
  'home.poolingProducers2': 'Numero di produttori partecipanti',
  'home.poolingProducers3': 'Prezzo indicativo di gruppo (non imposto)',
  'home.poolingProducers4': 'Costo di trasporto stimato per unità e per produttore',
  'home.poolingBuyers': 'Cosa vedono gli acquirenti',
  'home.poolingBuyers1': 'Totale disponibile e residuo',
  'home.poolingBuyers2': 'Piano di ritiro / trasporto',
  'home.poolingBuyers3': 'Scadenza dell’ordine',
  'home.poolingBuyers4': 'Canale di contatto del coordinatore',
  'home.trustEyebrow': 'Fiducia',
  'home.trustTitle': 'Stato onesto, consenso chiaro',
  'home.trustVerification': 'Verifica esplicita',
  'home.trustVerificationBody':
    'La verifica ha tre stati: non verificato, in attesa di revisione e verificato. Solo un’amministratrice o un amministratore può approvare un profilo, e nessuno approva una propria richiesta. La procedura di verifica è ancora in progettazione per la sperimentazione — questo prototipo non afferma che un produttore sia verificato nel mondo reale.',
  'home.trustConsent': 'Pubblicazione rispettosa del consenso',
  'home.trustConsentBody':
    'Performance culturali, cerimonie e immagini della comunità sono pubblicate solo con consenso registrato. Un recapito senza consenso registrato non viene mai pubblicato. La conoscenza culturale sensibile non viene mai commercializzata per impostazione predefinita.',
  'home.trustSample': 'Dati di esempio vs. dati reali',
  'home.trustSampleBody':
    'Ogni record dimostrativo porta un’etichetta visibile “Dati di esempio”. Non presentiamo segnaposto generici come prove documentali di un produttore o di una comunità specifica.',
  'home.ctaProducerTitle': 'Sei un produttore?',
  'home.ctaProducerBody':
    'Durante la sperimentazione l’iscrizione e la pubblicazione di base restano gratuite. Mantieni il pieno controllo dei tuoi prezzi.',
  'home.ctaProducerAction': 'Crea un account →',
  'home.ctaBulkTitle': 'Acquisti all’ingrosso?',
  'home.ctaBulkBody':
    'Sfoglia gli ordini collettivi e vedi come i gruppi di produttori mettono in comune l’offerta per hotel, negozi, scuole e altre istituzioni.',
  'home.ctaBulkAction': 'Esplora gli ordini collettivi →',

  'market.exploreEyebrow': 'Esplora',
  'market.exploreTitle': 'Sfoglia tutto',
  'market.exploreDescription':
    'Cerca tra prodotti e servizi, filtra per comunità e categoria e consulta le informazioni sui produttori.',
  'market.productsEyebrow': 'Mercato',
  'market.productsTitle': 'Prodotti',
  'market.productsDescription':
    'Inserzioni di prodotto di esempio di produttori della South Omo. Le categorie sono indicative e non dimostrano che un prodotto sia disponibile in una comunità specifica.',
  'market.tourismEyebrow': 'Turismo',
  'market.tourismTitle': 'Servizi turistici',
  'market.tourismDescription':
    'Visite guidate, passeggiate di mezza giornata e dimostrazioni artigianali offerte da produttori e guide locali. La conoscenza culturale sensibile non viene mai commercializzata per impostazione predefinita.',
  'market.emptyTitle': 'Nessuna inserzione corrisponde ai filtri',
  'market.emptyBody':
    'Prova a rimuovere un filtro o ad ampliare la ricerca. Tutte le inserzioni di questa versione sono dati di esempio.',
  'market.filtersAria': 'Filtra le inserzioni',
  'filter.search': 'Cerca',
  'filter.category': 'Categoria',
  'filter.community': 'Comunità',
  'filter.sort': 'Ordina',
  'filter.minPrice': 'ETB minimi',
  'filter.maxPrice': 'ETB massimi',
  'filter.sortNewest': 'Più recenti',
  'filter.sortUpdated': 'Aggiornate di recente',
  'filter.sortPriceAsc': 'Prezzo: dal più basso',
  'filter.sortPriceDesc': 'Prezzo: dal più alto',
  'filter.apply': 'Applica filtri',
  'filter.reset': 'Reimposta',

  'listing.eyebrowFallback': 'Inserzione',
  'listing.descriptionTitle': 'Descrizione',
  'listing.pricingTitle': 'Prezzi e scorte',
  'listing.unitPrice': 'Prezzo unitario',
  'listing.unitOfSale': 'Unità di vendita',
  'listing.availableQuantity': 'Quantità disponibile',
  'listing.minimumOrder': 'Ordine minimo',
  'listing.delivery': 'Consegna',
  'listing.deliveryOnRequest': 'Disponibile su richiesta',
  'listing.deliveryNotOffered': 'Non offerta',
  'listing.lastUpdated': 'Ultimo aggiornamento',
  'listing.priceNote':
    'I prezzi sono mostrati per unità in Birr etiope (ETB) senza costi nascosti. Eventuali costi di trasporto o coordinamento sono concordati a parte e sempre dichiarati.',
  'listing.pickupTitle': 'Opzioni di ritiro',
  'listing.relatedTitle': 'Inserzioni correlate',
  'listing.reviewsTitle': 'Recensioni',
  'listing.inquiryTitle': 'Invia una richiesta',
  'listing.inquiryIntro':
    'Questa azione invia una richiesta, non una vendita confermata. Il produttore risponderà con i dettagli di ritiro o consegna e le modalità di pagamento. Nulla di tutto questo è un pagamento.',
  'listing.producerTitle': 'Informazioni sul produttore',
  'listing.shareTitle': 'Condividi questa inserzione',
  'listing.shareBody':
    'Inquadra il QR con un altro telefono per aprire la stessa inserzione pubblica. I codici QR rimandano a URL pubblici reali — mai a un contatto privato o a un certificato di verifica inventato.',
  'listing.shareQrAria': 'QR per l’URL di questa inserzione',
  'listing.unavailableTitle': 'Attualmente non disponibile',
  'listing.unavailableBody':
    'Il produttore ha segnato questa inserzione come non disponibile. Puoi comunque inviare una richiesta per essere avvisato quando torna disponibile.',
  'listing.experienceTitle': 'Dettagli dell’esperienza',
  'listing.package': 'Pacchetto',
  'listing.duration': 'Durata',
  'listing.durationHours': '{hours} ore',
  'listing.groupCapacity': 'Capienza del gruppo',
  'listing.groupPeople': '{count} persone',
  'listing.meetingPoint': 'Punto di ritrovo',
  'listing.inclusions': 'Cosa è incluso',
  'listing.exclusions': 'Cosa non è incluso',
  'listing.bookingConditions': 'Condizioni di prenotazione',
  'listing.cancellation': 'Cancellazione',

  'report.title': 'Qualcosa non va in questa inserzione?',
  'report.open': 'Segnala',
  'report.hide': 'Nascondi',
  'report.reasonLabel': 'Motivo',
  'report.reasonPlaceholder':
    'Prezzo ingannevole, contenuto culturale non autorizzato, abusi nei contatti, comunità errata, ecc.',
  'report.nameLabel': 'Il tuo nome',
  'report.contactLabel': 'Contatto per il follow-up',
  'report.sending': 'Invio in corso…',
  'report.submit': 'Invia segnalazione',
  'report.incomplete': 'Compila il motivo, il tuo nome e un contatto affinché un revisore possa seguire la segnalazione.',
  'report.failed': 'Impossibile inviare la segnalazione.',
  'report.received': 'Segnalazione ricevuta. Un revisore esaminerà questa inserzione.',
  'report.generic': 'Qualcosa è andato storto.',

  'reviews.title': 'Recensioni degli acquirenti',
  'reviews.empty':
    'Nessuna recensione è ancora stata scritta per questa inserzione. Le recensioni compaiono solo dopo che una fornitura è registrata come completata: un elenco vuoto è dunque onesto, non una funzione mancante.',
  'reviews.scoreTail': '/ 5 da',
  'reviews.countOne': 'recensione',
  'reviews.countMany': 'recensioni',
  'reviews.note':
    'Ogni recensione è legata a una fornitura completata che chi l’ha scritta ha registrato. Le medie nascondono molto: leggi i testi e ricorda che {producer} può avere altre inserzioni con esperienze diverse.',
  'reviews.leaveFirst': 'Hai completato una fornitura qui — lascia una recensione',
  'reviews.leaveAnother': 'Aggiungi la tua recensione di una fornitura completata',

  'inquiry.quantityLabel': 'Quantità ({unit})',
  'inquiry.minimumHint': 'Minimo {count} {unit}.',
  'inquiry.decrease': 'Riduci la quantità',
  'inquiry.increase': 'Aumenta la quantità',
  'inquiry.subtotal': 'Subtotale stimato',
  'inquiry.subtotalNote':
    'Non è un addebito totale. Trasporto, coordinamento o imballaggio (se presenti) sono concordati separatamente con il produttore e dichiarati prima del pagamento. Non è stato pagato nulla.',
  'inquiry.nameLabel': 'Il tuo nome o organizzazione',
  'inquiry.contactLabel': 'Come può risponderti il produttore',
  'inquiry.contactHint': 'Numero di telefono, email o un contatto del coordinatore.',
  'inquiry.preferenceLabel': 'Preferenza di consegna',
  'inquiry.preference.pickup': 'Ritiro dal produttore / punto di ritrovo',
  'inquiry.preference.delivery': 'Chiedi della consegna',
  'inquiry.preference.booking': 'Prenota una sessione di servizio',
  'inquiry.preference.unsure': 'Non sono ancora sicuro',
  'inquiry.dateLabel': 'Data preferita (facoltativa)',
  'inquiry.messageLabel': 'Messaggio al produttore (facoltativo)',
  'inquiry.queuedNote':
    'Questa richiesta è in attesa su questo dispositivo. Non ha ancora raggiunto il produttore: inviala di nuovo quando torna la connessione.',
  'inquiry.submitting': 'Invio in corso…',
  'inquiry.submit': 'Invia richiesta',
  'inquiry.inquire': 'Invia richiesta',
  'inquiry.submitted': 'Richiesta inviata.',
  'inquiry.referenceLine':
    'Riferimento: {reference}. Il produttore la vedrà nella sua bacheca. Non è stato pagato nulla.',
  'inquiry.openRecord': 'Aprila nei tuoi record',
  'inquiry.openRecordTail': ' per seguirla o annullarla.',
  'inquiry.errorName': 'Inserisci il tuo nome o la tua organizzazione.',
  'inquiry.errorContact':
    'Inserisci un numero di telefono, un’email o un contatto del coordinatore in modo che il produttore possa risponderti.',
  'inquiry.errorMinQuantity': 'Inserisci un numero intero pari almeno a {count}.',
  'inquiry.errorMaxQuantity': 'In questo momento sono disponibili solo {count} {unit}.',
  'inquiry.errorOffline':
    'Sei offline. Questa richiesta è salvata su questo dispositivo e il modulo conserva i dati. Inviandola di nuovo quando torna la connessione si riusa lo stesso riferimento, quindi il produttore non la riceverà due volte.',
  'inquiry.errorFailed': 'Invio della richiesta non riuscito.',
  'inquiry.errorGeneric': 'Qualcosa è andato storto. Riprova.',

  'collective.indicativePrice': 'Prezzo indicativo di gruppo',
  'collective.indicativePriceUnknown': 'Offerta dell’acquirente / da definire',
  'collective.deadline': 'Scadenza',
  'collective.deadlineNone': 'Nessuna scadenza impostata',
  'collective.pickupPlan': 'Piano di ritiro',
  'collective.transportPlan': 'Piano di trasporto',
  'collective.transportPlanNone': 'Da concordare',
  'collective.stillNeeded': 'Servono ancora {count} {unit}',
  'collective.targetReached': 'Obiettivo raggiunto — in chiusura.',
  'collective.progressTail': ' / {target} {unit}',

  'auth.signInEyebrow': 'Accedi',
  'auth.signInLiveTitle': 'Accedi al tuo account',
  'auth.signInLiveDescription':
    'Questa istanza è collegata a un progetto Supabase, quindi l’accesso usa credenziali reali e la Row Level Security decide cosa puoi vedere.',
  'auth.signInDemoTitle': 'Accedi come account dimostrativo',
  'auth.signInDemoDescription':
    'Modalità dimostrativa: scegli un account di esempio etichettato per esplorare il sito. Sono record dimostrativi, non account reali, e nulla di ciò che fai qui raggiunge un venditore reale.',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.passwordHint': 'Minimo 6 caratteri.',
  'auth.signingIn': 'Accesso in corso…',
  'auth.signInFailed': 'Accesso non riuscito.',
  'auth.networkProblem': 'Problema di rete — l’accesso richiede una connessione.',
  'auth.noAccountYet': 'Non hai ancora un account?',
  'auth.createOne': 'Creane uno',
  'auth.forgottenPassword': 'Hai dimenticato la password?',
  'auth.resetIt': 'Reinizializzala',
  'auth.noConfirmation': 'Non hai mai ricevuto l’email di conferma?',
  'auth.resendIt': 'Reinviala',
  'auth.punctuation': '.',
  'auth.genericError': 'Qualcosa è andato storto.',

  'auth.demoSellingTitle': 'Account produttore e gruppi',
  'auth.demoSellingIntro': 'Apri la bacheca di vendita, pubblica inserzioni e rispondi alle richieste.',
  'auth.demoBuyerTitle': 'Account acquirente e visitatori',
  'auth.demoBuyerIntro':
    'Vedi le richieste e le forniture dal lato dell’acquirente. Turisti e clienti condividono le stesse autorizzazioni.',
  'auth.demoAdminTitle': 'Amministratore',
  'auth.demoAdminIntro':
    'Ruolo di revisione. In modalità dimostrativa i dati di esempio sono tenuti in memoria e si applicano gli stessi controlli dei permessi lato server: è la reale superficie di controllo, con record fittizi.',
  'auth.demoNoAccount': 'Non esiste un account di esempio di questo tipo.',
  'auth.demoGuestPrefix': 'Un acquirente può inviare una richiesta anche senza account: premi “Invia richiesta” su qualsiasi ',
  'auth.demoGuestProducts': 'prodotto',
  'auth.demoGuestMiddle': ' o ',
  'auth.demoGuestTourism': 'servizio turistico',
  'auth.demoGuestTail': '.',

  'how.eyebrow': 'Come funziona',
  'how.title': 'Un percorso concreto dal produttore all’acquirente',
  'how.description':
    'OmoNetTab supporta un percorso end-to-end reale: pubblicare con chiarezza, ricevere una richiesta e coordinare lo scambio in modo onesto. Nella fase di sperimentazione i pagamenti e le consegne avvengono fuori dalla piattaforma.',
  'how.step1Title': 'Il produttore si registra',
  'how.step1Body':
    'Un produttore, una guida, un gruppo o una cooperativa crea un profilo con nome pubblico, comunità, categorie e un flag di consenso. Per un account base non viene raccolto alcun documento d’identità.',
  'how.step2Title': 'Il produttore pubblica',
  'how.step2Body':
    'Ogni inserzione comprende prezzo unitario, unità di vendita, quantità disponibile, ordine minimo, disponibilità, opzioni di ritiro e immagini rispettose del consenso. I prezzi non nascondono mai un costo obbligatorio.',
  'how.step3Title': 'L’acquirente cerca',
  'how.step3Body':
    'Gli acquirenti sfogliano o cercano tra prodotti, servizi turistici e ordini collettivi, filtrano per comunità, categoria, prezzo o disponibilità e aprono un’inserzione.',
  'how.step4Title': 'L’acquirente invia una richiesta',
  'how.step4Body':
    'L’acquirente inserisce una quantità, vede un subtotale stimato, fornisce un canale di contatto e invia la richiesta. Il sistema risponde con un numero di riferimento e non contrassegna mai il record come vendita completata.',
  'how.step5Title': 'Il produttore risponde',
  'how.step5Body':
    'La richiesta compare nella bacheca del venditore. Il produttore aggiorna lo stato in modo onesto: nuova → accettata → in attesa di conferma → consegna organizzata → completata o annullata.',
  'how.step6Title': 'Ordini collettivi',
  'how.step6Body':
    'I produttori mettono in comune le quantità disponibili per un’occasione di gruppo. La piattaforma aggrega i totali, valida i contributi rispetto alle scorte e offre un calcolatore di trasporto condiviso. I risparmi effettivi non vengono mai inventati.',
  'how.trustTitle': 'Fiducia e trasparenza',
  'how.trustVerification': 'Gli stati di verifica sono espliciti',
  'how.trustVerificationBody':
    'Solo un revisore autorizzato può portare un profilo a verificato. La procedura di verifica in sé è ancora in progettazione per la sperimentazione.',
  'how.trustConsent': 'Contenuti culturali rispettosi del consenso',
  'how.trustConsentBody':
    'Performance culturali, cerimonie e immagini della comunità sono pubblicate solo con consenso registrato. La piattaforma non commercializza mai la conoscenza culturale sensibile per impostazione predefinita.',
  'how.trustSample': 'I dati di esempio sono etichettati',
  'how.trustSampleBody':
    'Ogni produttore, inserzione e occasione di esempio porta un’etichetta visibile “Dati di esempio”. Non presentiamo mai segnaposto come prove documentali di un produttore reale.',

  'contact.eyebrow': 'Contatti',
  'contact.title': 'Parla con il team di OmoNetTab',
  'contact.description':
    'Usa questo modulo per tutto ciò che riguarda il marketplace in sé: un’inserzione che sembra errata, aiuto per contattare un produttore, un gruppo che vuole organizzare un ordine collettivo o un riscontro da un’area di sperimentazione. I messaggi raggiungono un’amministratrice o un amministratore, non il produttore — il produttore ti risponde attraverso la richiesta sulla sua inserzione.',
  'contact.metadataDescription':
    'Invia un messaggio al team di OmoNetTab su un prodotto, un servizio o una segnalazione.',
  'contact.otherWays': 'Altri modi per raggiungerci',
  'contact.emailLabel': 'Email:',
  'contact.phoneLabel': 'Telefono:',
  'contact.noEmail':
    'Per questa istanza non è ancora stato pubblicato un indirizzo email diretto. Un’amministratrice o un amministratore può aggiungerlo nelle impostazioni.',
  'contact.noPhone': 'Per questa istanza non è ancora stata pubblicata una linea telefonica.',
  'contact.adminMaintained':
    'Questi recapiti sono gestiti da un’amministratrice o un amministratore nell’area di amministrazione, quindi vengono mostrati solo quando sono stati effettivamente forniti.',
  'contact.beforeYouWrite': 'Prima di scriverci',
  'contact.before1':
    'Per chiedere di un prodotto o di un’esperienza specifica, usa “Invia richiesta” su quell’inserzione: il produttore la vede direttamente.',
  'contact.before2': 'Per segnalare un’inserzione, usa il link “Segnala inserzione” nella pagina dell’inserzione.',
  'contact.before3': 'Questo modulo registra una richiesta. Non è un ordine, una prenotazione o un pagamento.',
  'contact.noSmsBadge': 'Nessuna integrazione SMS o telefonica è collegata',
  'contact.formName': 'Il tuo nome',
  'contact.formEmail': 'Email a cui possiamo rispondere',
  'contact.formSubject': 'Oggetto',
  'contact.formSubjectHint': 'Ad esempio: una domanda su un prodotto, una prenotazione o una segnalazione.',
  'contact.formSubjectDefault': 'Richiesta generale',
  'contact.formMessage': 'Messaggio',
  'contact.formMessageHint': 'Almeno 10 caratteri. Non inviare documenti di identità o dati di pagamento.',
  'contact.formSending': 'Invio in corso…',
  'contact.formSubmit': 'Invia messaggio',
  'contact.formSent':
    'Grazie. Il messaggio è registrato perché un amministratore lo legga. Non è un ordine né una prenotazione.',
  'contact.formFailed': 'Il messaggio non è stato inviato.',
  'contact.formNetwork': 'Problema di rete — il messaggio è rimasto sul tuo dispositivo.',
  'contact.noSmsBody':
    'OmoNetTab non invia né riceve messaggi SMS, USSD o di pagamento in questa versione. Se un servizio del genere sarà aggiunto in seguito, il fornitore dovrà essere configurato e testato prima che venga descritto come funzionante.',

  'privacy.eyebrow': 'Privacy',
  'privacy.title': 'Minimizzazione dei dati e consenso',
  'privacy.description':
    'OmoNetTab è progettato per raccogliere le informazioni necessarie a gestire un marketplace. Questa pagina è un segnaposto che sarà finalizzato con il contributo della comunità e una revisione legale prima di una sperimentazione reale.',
  'privacy.storeTitle': 'Cosa conserviamo',
  'privacy.store1':
    'Nome pubblico del produttore, comunità, area operativa e breve presentazione — solo dopo consenso registrato.',
  'privacy.store2': 'Titolo dell’inserzione, descrizione, prezzo, unità, quantità, disponibilità e opzioni di ritiro.',
  'privacy.store3':
    'Campi della richiesta dell’acquirente: nome, canale di contatto, quantità, messaggio, preferenza e data facoltativa.',
  'privacy.store4': 'Record delle occasioni di gruppo e contributi dei singoli produttori.',
  'privacy.store5': 'Decisioni di verifica e segnalazioni per la revisione amministrativa.',
  'privacy.skipTitle': 'Cosa non conserviamo',
  'privacy.skip1': 'Documenti d’identità per un account dimostrativo base.',
  'privacy.skip2':
    'Numeri di carta o credenziali wallet — un checkout ospitato li trattiene presso il gestore dei pagamenti e la modalità dimostrativa si limita a simulare il pagamento.',
  'privacy.skip3': 'Coordinate geografiche precise o abitazioni.',
  'privacy.skip4': 'Dettagli di cerimonie, conoscenza sacra o immagini della comunità senza consenso.',

  'guidelines.eyebrow': 'Comunità',
  'guidelines.title': 'Linee guida della comunità',
  'guidelines.description':
    'Come produttori, acquirenti e coordinatori si trattano reciprocamente su OmoNetTab. Redatte per essere validate nella sperimentazione insieme ai partner della comunità.',
  'guidelines.publishing': 'Regole di pubblicazione',
  'guidelines.publishing1':
    'Ogni inserzione deve indicare un prezzo unitario in ETB e un’unità di vendita. I costi nascosti non sono consentiti.',
  'guidelines.publishing2':
    'Le immagini devono raffigurare davvero il prodotto o il servizio offerto ed essere chiaramente etichettate come segnaposto in caso contrario.',
  'guidelines.publishing3':
    'Cerimonie, luoghi sacri e pratiche culturali non sono commercializzati senza un consenso registrato della comunità.',
  'guidelines.publishing4':
    'La località del produttore è pubblicata a livello di comunità solo se il produttore acconsente.',
  'guidelines.behaviour': 'Comportamento',
  'guidelines.behaviour1':
    'Rispondi alle richieste in modo onesto. Non contrassegnare mai una richiesta come “completata” se la merce o il servizio non sono stati scambiati.',
  'guidelines.behaviour2': 'Non affermare mai che un pagamento è stato ricevuto se non lo è stato.',
  'guidelines.behaviour3':
    'Rispetta i coordinatori degli ordini collettivi. I contributi sono impegni presi verso il gruppo.',
  'guidelines.behaviour4':
    'Segnala inserzioni ingannevoli o contenuti culturali inappropriati con l’azione “Segnala” su qualsiasi inserzione.',
  'guidelines.disputes': 'Controversie',
  'guidelines.disputesBody':
    'La maggior parte dei disaccordi si risolve con una conversazione diretta. Quando non è così, un revisore autorizzato media usando la cronologia delle richieste registrata, il registro dei contributi e i record di consenso. In questa versione dimostrativa le azioni amministrative sono simulate. La sperimentazione definirà il percorso reale per le controversie insieme ai partner della comunità.',
  'guidelines.impact': 'Misurazione dell’impatto',
  'guidelines.impactBodyPrefix': 'Una futura sperimentazione dovrebbe misurare il beneficio netto per il produttore ',
  'guidelines.impactBodyAfter': 'dopo',
  'guidelines.impactBodySuffix':
    ' i costi di trasporto, imballaggio, coordinamento e piattaforma. I numeri mostrati nella bacheca amministrativa sono dati dimostrativi, non impatto misurato. Non pubblichiamo mai statistiche, testimonianze o endorsements inventati.',

  'footer.demoModeNote': 'In modalità dimostrativa, con annunci di esempio.',
  'footer.liveModeNote':
    'Collegata a un progetto Supabase; i record mostrati sono dati reali inseriti dagli account di questa istanza.',
  'footer.community': 'Comunità',
  'footer.tourismServices': 'Servizi turistici',
  'footer.impact': 'Impatto',
  'footer.guidelines': 'Linee guida della comunità',
  'footer.privacy': 'Privacy',
  'footer.offline': 'Uso offline',
  'footer.contactLead': 'Usa il ',
  'footer.contactFormLink': 'modulo di contatto',
  'footer.contactTail': ' — i messaggi raggiungono un’amministratrice o un amministratore di questa istanza.',
  'footer.copyright': '© {year} {siteName}.',
  'footer.workflowNote':
    'La verifica dei venditori è ancora in fase di configurazione, e i pagamenti richiedono un gestore configurato prima che possa muoversi qualsiasi denaro.',

  'notFound.eyebrow': '404',
  'notFound.title': 'Questa pagina non esiste',
  'notFound.description':
    'L’indirizzo potrebbe essere errato, un link vecchio o un’inserzione archiviata dal suo produttore. Dal tuo lato non è stato eliminato nulla.',
  'notFound.backHome': 'Torna al marketplace',
  'notFound.helpPrefix': 'Cerchi un produttore o un’inserzione specifica? Usa ',
  'notFound.searchFilters': 'ricerca e filtri',
  'notFound.helpMiddle': ', oppure invia una nota tramite ',
  'notFound.contact': 'contatti',
  'notFound.helpSuffix': ' e ti aiuteremo a trovarla.',
  'accessDenied.eyebrow': 'Non disponibile',
  'accessDenied.title': 'Il tuo account non può aprire quest’area',
  'accessDenied.description':
    'Hai effettuato l’accesso, ma questa parte di OmoNetTab è riservata a un altro tipo di account. Non è stato modificato nulla e nulla è stato esposto. Se ritieni di dover avere accesso, chiedi a un’amministratrice o un amministratore di rivedere il ruolo del tuo account.',
  'accessDenied.body':
    'I produttori aprono la bacheca di vendita, acquirenti e visitatori aprono l’area acquirente e solo gli amministratori raggiungono gli strumenti di moderazione. I ruoli sono salvati sul tuo profilo e impostati da un’amministratrice o un amministratore: non sono qualcosa che una pagina o un cookie può cambiare.',
  'accessDenied.dashboard': 'Vai alla mia bacheca',
  'accessDenied.buyerArea': 'Area acquirente',

  // ---------- flusso di pagamento ----------
  'payment.heading': 'Pagamento',
  'payment.proceed': 'Procedi al pagamento',
  'payment.opening': 'Apertura del pagamento…',
  'payment.checkStatus': 'Controlla lo stato del pagamento',
  'payment.checking': 'Stiamo chiedendo al gestore dei pagamenti…',
  'payment.cancelAttempt': 'Annulla questo tentativo di pagamento',
  'payment.cancelling': 'Annullamento…',
  'payment.simulatedBadge': 'Pagamento simulato',
  'payment.simulatedNote':
    'Modalità dimostrativa: questo checkout è simulato. Non si muove alcun denaro, non viene contattato nessun gestore e nulla qui è un pagamento reale.',
  'payment.status.pending': 'In attesa del pagamento',
  'payment.status.confirmed': 'Pagato',
  'payment.status.failed': 'Pagamento fallito',
  'payment.status.cancelled': 'Pagamento annullato',
  'payment.status.expired': 'Checkout scaduto',
  'payment.status.refunded': 'Rimborsato',
  'payment.referenceLine': 'Riferimento del pagamento: {reference}',
  'payment.windowLine': 'Questo checkout si chiude il {when}.',
  'payment.attemptLine': '{status} il {when}.',
  'payment.noneYet': 'Non c’è alcun pagamento registrato per questa richiesta.',
  'payment.awaitingSeller': 'Il produttore non ha ancora risposto a questa richiesta, quindi non c’è un importo concordato da pagare.',
  'payment.noPrice':
    'Per questo articolo non è stato documentato un prezzo, quindi non c’è nulla da pagare finché il produttore non ne indica uno.',
  'payment.closed':
    'Questa richiesta è chiusa, quindi non può essere avviato un nuovo pagamento. Ogni tentativo già effettuato conserva il proprio record.',
  'payment.suspended':
    'Questo account è sospeso, quindi da esso non può essere avviato alcun pagamento. Chiedi prima a un’amministratrice o un amministratore di riattivarlo.',
  'payment.amountLine': 'Importo preso dal tuo record di richiesta: {amount}.',
  'payment.amountLabel': 'Importo a record',
  'payment.windowCloses': 'Il checkout si chiude',
  'payment.receipt': 'Scarica la ricevuta PDF',
  'payment.quotation': 'Scarica il preventivo (PDF)',
  'payment.acknowledgement': 'Scarica il riscontro della richiesta (PDF)',
  'payment.notPaidReceipt': 'Non è stato pagato nulla, quindi questo documento è un preventivo e non una ricevuta.',
  'payment.refundedNote': 'L’importo è stato restituito. Sia il pagamento originale sia il rimborso restano a record.',
  'payment.attemptCount': 'Tentativi di pagamento registrati per questa richiesta: {count}. Ognuno conserva il proprio riferimento e la propria storia.',
  'payment.startFailed': 'Il pagamento non può essere avviato.',
  'payment.tryAgain': 'Qualcosa è andato storto. Riprova.',
  'payment.backToInquiry': 'Torna a questa richiesta',
  'payment.sellerViewNote':
    'Vedi questo in sola lettura perché la richiesta è arrivata al tuo annuncio. Lo stato è ciò che una verifica confermata del gestore dei pagamenti ha riportato; nulla in questa pagina può cambiarlo, e non significa che il denaro sia arrivato a te: l’incasso dipende dal gestore e dagli accordi presi direttamente con l’acquirente.',
  'inquiry.status.new': 'Nuova richiesta — il produttore non ha ancora risposto',
  'inquiry.status.accepted': 'Accettata dal produttore',
  'inquiry.status.awaiting_confirmation': 'In attesa di conferma',
  'inquiry.status.fulfillment_arranged': 'Ritiro o consegna organizzati',
  'inquiry.status.completed': 'Completata',
  'inquiry.status.cancelled': 'Annullata',
  'receipt.kind.receipt': 'Ricevuta di pagamento',
  'receipt.kind.pending': 'Riepilogo del pagamento — non è una ricevuta',
  'receipt.kind.acknowledgement': 'Record della richiesta — non è una ricevuta',
  'receipt.rule.receipt': 'Documenta un pagamento che il gestore dei pagamenti ha confermato, stampato dal record archiviato.',
  'receipt.rule.pending': 'Il pagamento non è confermato, quindi questo documento non attesta alcun denaro ricevuto.',
  'receipt.rule.acknowledgement': 'Riporta quanto è stato chiesto e quanto è stato stimato. Qui nulla risulta pagato.',
  'receipt.billedTo': 'Intestato a',
  'receipt.soldBy': 'Venduto da',
  'receipt.listing': 'Annuncio',
  'receipt.documentNumber': 'Numero del documento',
  'receipt.generatedAt': 'Generato il',
  'receipt.paymentReference': 'Riferimento del pagamento',
  'receipt.inquiry': 'Riferimento della richiesta',
  'receipt.inquiryStatus': 'Stato della richiesta sul record',
  'receipt.paymentStatus': 'Stato del pagamento sul record',
  'receipt.provider': 'Effettuato tramite',
  'receipt.method': 'Metodo riportato dal gestore',
  'receipt.providerReference': 'Riferimento del gestore',
  'receipt.openedAt': 'Tentativo aperto il',
  'receipt.confirmedAt': 'Confermato il',
  'receipt.closedAt': 'Chiuso il',
  'receipt.checkoutCloses': 'La finestra di pagamento si chiude il',
  'receipt.sentAt': 'Richiesta inviata il',
  'receipt.item': 'Articolo',
  'receipt.itemHeading': 'Cosa riguarda questo documento',
  'receipt.description': 'Descrizione',
  'receipt.quantity': 'Quantità',
  'receipt.unitPrice': 'Prezzo unitario',
  'receipt.amount': 'Importo',
  'receipt.subtotal': 'Stima riportata sulla richiesta',
  'receipt.amountOnRecord': 'Importo sul record del pagamento',
  'receipt.confirmedAmount': 'Confermato come ricevuto',
  'receipt.refundedAmount': 'Restituito all’acquirente',
  'receipt.fee': 'Commissione riportata dal gestore',
  'receipt.recordHeading': 'Il record da cui è stato costruito questo documento',
  'receipt.notesHeading': 'Cosa significa e cosa non significa questo documento',
  'receipt.verificationNote':
    'Solo un controllo lato server del record del gestore dei pagamenti può confermare un pagamento. Il ritorno del browser su questo sito non è prova di pagamento: per questo il documento esiste soltanto dopo quel controllo.',
  'receipt.refundNote':
    'Questo pagamento è stato rimborsato: l’importo confermato dal gestore è stato restituito, quindi non è denaro trattenuto dal venditore.',
  'receipt.pendingNotice':
    'Questo pagamento non è confermato, quindi il documento è un riepilogo e non una ricevuta. L’importo mostrato è la cifra conservata sul record, non la prova che sia arrivata.',
  'receipt.checkoutNote':
    'Per questo tentativo è stata aperta una pagina di pagamento. Aprirla non paga nulla: un pagamento compare qui solo dopo la verifica della risposta del gestore.',
  'receipt.failureLine': 'Il gestore ha indicato il motivo di questo esito, e il motivo è conservato sul record del pagamento.',
  'receipt.acknowledgementNotice':
    'Questo documento registra una richiesta e la stima calcolata dal server sul prezzo unitario dell’annuncio. Non è una fattura, non è un preventivo vincolante e non è una ricevuta: nessun pagamento risulta confermato.',
  'receipt.amountMismatch':
    'L’importo sul record del pagamento è diverso dalla stima sulla richiesta. Entrambi i numeri sono stampati esattamente come sono archiviati.',
  'receipt.demoStamp': 'Pagamento simulato — modalità dimostrativa',
  'receipt.demoNotice':
    'Questo pagamento è stato prodotto dal simulatore dimostrativo. Nessun denaro si è mosso, nessun gestore è stato coinvolto e questo documento non è la prova di una transazione reale.',
  'receipt.demoInquiryNotice':
    'Questa richiesta è un campione incluso nella versione dimostrativa, non una richiesta reale di un acquirente reale.',
  'receipt.charsetNote':
    'Alcuni caratteri dei record non possono essere disegnati dal font di questo documento e sono stampati come ?. Il record conserva comunque il testo originale.',
  'receipt.languageNote.font':
    'Questo documento è stampato in inglese perché il font non può disegnare i caratteri della tua lingua dell’interfaccia. Sullo schermo la stessa formulazione appare nella tua lingua.',
  'receipt.languageNote.untranslated':
    'Questo documento è stampato in inglese perché OmoNetTab non ha ancora una formulazione revisionata per la tua lingua. Lo schermo indica quali lingue aspettano ancora un revisore.',
  'receipt.footerRegenerate':
    'Generato quando viene richiesto, a partire dai record archiviati. Il server non conserva una copia di questo documento.',
  'receipt.pageOf': 'Pagina {page} di {pages}',
  'receipt.downloadReceipt': 'Scarica la ricevuta in PDF',
  'receipt.downloadPaymentSummary': 'Scarica il riepilogo del pagamento (PDF)',
  'receipt.downloadInquiryRecord': 'Scarica il record della richiesta (PDF)',
  'receipt.downloadNote':
    'Costruito a partire dal record archiviato quando lo chiedi, così corrisponde sempre a ciò che la piattaforma conserva. Non è una seconda copia dei tuoi dati.',
  'demoCheckout.title': 'Checkout simulato (modalità dimostrativa)',
  'demoCheckout.choose': 'Scegli come finisce questa dimostrazione',
  'demoCheckout.success': 'Paga ora (successo simulato)',
  'demoCheckout.pending': 'Lascialo in attesa di pagamento',
  'demoCheckout.failed': 'Il pagamento fallisce',
  'demoCheckout.cancelled': 'Annulla il checkout',
  'demoCheckout.footnote':
    'Lo stato sulla richiesta proviene dal passaggio di verifica che rilegge questa risposta, non dal pulsante in sé.',

  // ---------- aspetto ----------
  'settings.theme': 'Aspetto del tema',
  'settings.themeIntro':
    'Scegli chiaro o scuro. I colori cambiano subito e la pagina che apri dopo viene disegnata con la stessa scelta prima ancora di comparire. L’account connesso conserva la scelta anche sul proprio profilo.',
  'settings.themeLight': 'Chiaro',
  'settings.themeDark': 'Scuro',
  'settings.themeSaved': 'Salvata sul tuo account e su questo browser.',
  'settings.themeSavedDevice': 'Salvata su questo browser. Nessuno ha effettuato l’accesso, quindi un altro dispositivo non la mostrerà.',
  'settings.themeSavedAccountFailed':
    'Salvata su questo browser, ma non è stato possibile scriverla sul profilo del tuo account. La colonna che la conserva non è ancora stata creata: vedi la migrazione 0007, non applicata.',
  'settings.themeFailed': 'L’aspetto non può essere salvato.',

  // ---------- report per gli amministratori ----------
  'reports.title': 'Report giornalieri e settimanali',
  'reports.daily': 'Report giornaliero',
  'reports.weekly': 'Report settimanale',
  'reports.custom': 'Intervallo personalizzato',
  'reports.from': 'Dal',
  'reports.to': 'Al',
  'reports.run': 'Esegui il report',
  'reports.exportCsv': 'Esporta CSV',
  'reports.exportPdf': 'Esporta PDF',
  'reports.status': 'Stato',
  'reports.seller': 'Venditore',
  'reports.category': 'Categoria',
  'reports.provider': 'Gestore dei pagamenti',
  'reports.allOptions': 'Tutti',
  'reports.empty': 'Nessun record ricade in questo intervallo.',
  'reports.inquiries': 'Richieste',
  'reports.attempts': 'Tentativi di pagamento',
  'reports.confirmed': 'Pagamenti confermati',
  'reports.revenue': 'Entrate confermate',
  'reports.awaiting': 'In attesa di pagamento',
  'reports.closed': 'Falliti, annullati o scaduti',
  'reports.refunded': 'Rimborsati',
  'reports.intro':
    'L’attività di una finestra temporale, contata solo sui record salvati. I numeri qui sotto sono ciò che la piattaforma ha agli atti: non sono un estratto conto, e un pagamento confermato significa che il fornitore ha segnalato di aver ricevuto il denaro, non che è arrivato nelle mani del venditore.',
  'reports.range': 'Finestra di riferimento',
  'reports.summaryHeading': 'Riepilogo',
  'reports.pdfClaim':
    'Un conteggio dei record di richiesta e di pagamento salvati in una finestra. Solo i pagamenti il cui stato è confermato sono contati come ricavo.',
  'reports.demoStamp': 'Record simulati — modalità demo',
  'reports.countingRules':
    'I tentativi in attesa, falliti, annullati o scaduti non entrano mai nel ricavo. Un rimborso è riportato a parte, non sottratto in silenzio. Ogni riferimento di pagamento è contato una volta sola, quindi una notifica ripetuta del fornitore e i nuovi tentativi dell’acquirente non gonfiano il totale, e un accordo pagato due volte conta come un solo acquisto.',
  'reports.timezoneNote':
    'I giorni sono misurati in {timeZone}. Un tentativo è contato nel giorno in cui è stato aperto finché attende l’esito, e nel giorno in cui ha raggiunto il suo stato quando è confermato, chiuso o rimborsato.',
  'reports.csvNote':
    'L’esportazione CSV contiene una riga per tentativo di pagamento, con la finestra riportata su ogni riga, così un totale calcolato in un foglio di calcolo segue la stessa regola di questa pagina: somma le righe il cui counts_as_revenue è true.',
  'reports.inquiryFilterNote':
    'I filtri stato di pagamento e fornitore si applicano solo ai numeri dei pagamenti. Il conteggio delle richieste segue la finestra, il venditore e la categoria.',
  'reports.invalidCustom':
    'Le date indicate non definiscono una finestra leggibile — formato errato, ordine inverso o più di un anno di distanza — quindi viene mostrato il report di oggi.',
  'reports.demoRows':
    'Dati demo simulati: {count} dei tentativi di pagamento in questa finestra. Sono contati perché sono salvati, ed etichettati perché non è stato mosso alcun denaro.',
  'reports.paidInquiries': 'Accordi pagati',
  'reports.fees': 'Commissioni del fornitore segnalate',
  'reports.count': 'Record',
  'reports.amount': 'Importo agli atti',
  'reports.countsAsRevenue': 'Conta come ricavo',
  'reports.yes': 'Sì',
  'reports.no': 'No',
  'reports.byDay': 'Giorno per giorno',
  'reports.bySeller': 'Per venditore',
  'reports.byCategory': 'Per categoria',
  'reports.byProvider': 'Per fornitore di pagamento',
  'reports.paymentRows': 'Tentativi di pagamento in questa finestra',
  'reports.reference': 'Riferimento di pagamento',
  'reports.inquiryRef': 'Richiesta',
  'reports.simulated': 'Simulato',
  'reports.day': 'Giorno',
  'reports.notRevenueNote':
    'Solo i pagamenti il cui stato salvato è confermato entrano nel ricavo. “Confermato” significa che la verifica del fornitore ha segnalato un importo corrispondente a questo record; non significa che il denaro è arrivato nelle mani del venditore, perché la liquidazione resta un accordo fra il venditore e l’acquirente.',
  'reports.rowsShown': '{shown} tentativi su {total} sono elencati qui; le esportazioni CSV e PDF seguono la stessa finestra.',
  'reports.emptyDemoNote': 'In modalità demo non esiste alcun tentativo di pagamento finché non ne viene creato uno sulla pagina della richiesta dell’acquirente.',
  'reports.emptyLedgerNote':
    'Se non compare alcun tentativo, la tabella dei pagamenti potrebbe non esistere ancora: la migrazione 0006 deve essere revisionata e applicata prima che i tentativi possano essere salvati.',
  'reports.receiptsLinkNote':
    'La ricevuta è stampata a partire dal record di pagamento stesso, quindi viene offerta nella scheda Pagamenti e nelle pagine della richiesta dell’acquirente e del venditore, invece di essere assemblata a partire da una riga di questo report.',
  'reports.openLedger': 'Apri il registro dei pagamenti',
  'reports.otherReportsTitle': 'Questa scheda non è la coda delle segnalazioni',
  'reports.otherReportsBody':
    'La scheda “Reports” di questa navigazione è la coda di inserzioni che i visitatori hanno chiesto di rivedere. Qui non si decide nulla: questa pagina conta soltanto le richieste e i tentativi di pagamento salvati, mentre una decisione su un’inserzione si registra con la sua motivazione in quella coda.',
  'reports.openListingReports': 'Apri la coda delle inserzioni segnalate',
  'reports.rowsOmitted': 'In “{table}” ci sono {omitted} righe in più che non sono stampate qui; l’esportazione CSV le contiene tutte.',

  'brand.tagline': 'Collegare culture e commercio'
};
