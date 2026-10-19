import type { Category, LanguageCode, Listing } from '../types';

/**
 * Reviewed-in-code translations for catalogue text (categories only).
 *
 * Three deliberate constraints:
 *
 * 1. There is no translation column in the database and adding one is out of
 *    scope for this pass, so translated wording lives here, keyed by the record
 *    id. Demo record ids are stable; a listing created in Supabase mode has a
 *    UUID that will not appear here, and the original producer text is shown
 *    instead. A real pilot should store reviewed translations next to the record
 *    (or in a `listing_translations` table) and read them through the repository
 *    — the lookup shape below is what that would replace.
 *
 * 2. Real producer listings are deliberately absent from this table. The
 *    catalogue now carries products whose names and descriptions were written by
 *    the people making them, and translating that wording is not our call: it
 *    would put words we invented into a producer’s mouth. They stay in the
 *    producer’s own English until a speaker reviews a translation with them.
 *    The sample listings that remain here are our own copy, so translating them
 *    is legitimate and keeps the mechanism demonstrable.
 *
 * 3. `CATALOG_REVIEWED` is false. These strings translate English category copy
 *    written for the demo, and no speaker has checked them, so the UI must never
 *    call them verified.
 */
export const CATALOG_REVIEWED = false;

type CatalogText = { name: string; description?: string };

const catalog: Partial<Record<LanguageCode, Record<string, CatalogText>>> = {
  'zh-Hans': {
    cat_handicraft: { name: '手工艺品', description: '篮子、饰品、陶器、木器及其他手工制品。' },
    cat_honey: { name: '蜂蜜与本地食品', description: '森林蜂蜜、香料、谷物及其他本地食品。' },
    cat_dairy: { name: '乳制品与农产品', description: '牛奶、黄油、奶酪、肉类及其他农场产品。' },
    cat_textile: { name: '纺织品与传统产品', description: '织布、兽皮、服饰与配饰。' },
    cat_tourism: { name: '旅游体验', description: '多日行程、文化景观游览与社区运营的体验项目。' },
    cat_guided: { name: '导览游览', description: '由本地向导带领的半日或全日徒步。' },
    cat_craft_demo: { name: '手工艺演示', description: '生产者向小型团体展示手工艺流程的活动。' },
    cat_other: { name: '其他本地认证服务', description: '不适合上述类别、且经社区认证的服务。' },

    lst_basket_set: {
      name: '示例手织储物篮套装（三种尺寸）',
      description:
        '示例供应，用于演示生产者如何呈现一套手织篮。此处显示的价格、数量与供应情况仅作说明，不得向买家引用。'
    },
    lst_forest_honey: {
      name: '示例森林蜂蜜，500 克罐装',
      description: '示例供应，展示生产者团体如何按罐列出蜂蜜，并提供透明的单价与库存。数字仅作说明。'
    },
    lst_milk_butter: {
      name: '示例澄清黄油，1 千克块装',
      description: '示例供应，演示按公斤计价的乳制品。'
    },
    lst_valley_walk: {
      name: '示例半日山谷徒步（本地向导）',
      description: '示例旅游服务，展示向导如何列出半日徒步，并按人标示透明价格以及清晰的包含与不含项目。'
    },
    lst_craft_session: {
      name: '示例织篮演示活动',
      description:
        '示例手工艺演示供应，由匠人展示编织过程。此处不对敏感的文化知识进行商业化——仅演示实用的编织技艺。'
    }
  },
  it: {
    cat_handicraft: { name: 'Artigianato', description: 'Cestini, gioielli, ceramiche, lavorazioni in legno e altri oggetti fatti a mano.' },
    cat_honey: { name: 'Miele e alimenti locali', description: 'Miele di foresta, spezie, cereali e altri alimenti locali.' },
    cat_dairy: { name: 'Latticini e prodotti agricoli', description: 'Latte, burro, formaggio, carne e altri prodotti dell’azienda agricola.' },
    cat_textile: { name: 'Tessuti e prodotti tradizionali', description: 'Tessuti, pelli, abiti e accessori.' },
    cat_tourism: { name: 'Esperienze turistiche', description: 'Visite di più giorni, escursioni nel paesaggio culturale ed esperienze gestite dalla comunità.' },
    cat_guided: { name: 'Visite guidate', description: 'Passeggiate di mezza giornata o di giornata intera con una guida locale.' },
    cat_craft_demo: { name: 'Dimostrazioni artigianali', description: 'Sessioni in cui i produttori mostrano un processo artigianale a piccoli gruppi.' },
    cat_other: { name: 'Altri servizi locali verificati', description: 'Servizi verificati dalla comunità che non rientrano nelle categorie precedenti.' },

    lst_basket_set: {
      name: 'Set di cesti intrecciati a mano (3 misure) — esempio',
      description:
        'Inserzione di esempio che mostra come un produttore presenta un set di cesti intrecciati a mano. Prezzi, quantità e disponibilità indicati sono solo esemplificativi e non devono essere citati agli acquirenti.'
    },
    lst_forest_honey: {
      name: 'Miele di foresta — esempio, barattolo da 500 g',
      description: 'Inserzione di esempio che mostra come un gruppo di produttori elenca il miele per barattolo con prezzo unitario e scorte trasparenti. I numeri sono esemplificativi.'
    },
    lst_milk_butter: {
      name: 'Burro chiarificato — esempio, panetto da 1 kg',
      description: 'Inserzione di esempio che mostra un prodotto lattiero-caseario con prezzo al chilogrammo.'
    },
    lst_valley_walk: {
      name: 'Passeggiata di mezza giornata nella valle con guida locale — esempio',
      description: 'Servizio turistico di esempio che mostra come una guida elenca una passeggiata di mezza giornata con prezzo trasparente a persona e una chiara lista di cosa è incluso e cosa no.'
    },
    lst_craft_session: {
      name: 'Sessione dimostrativa di intreccio di cesti — esempio',
      description:
        'Inserzione di esempio di dimostrazione artigianale in cui l’artigiano mostra il processo di intreccio. Qui la conoscenza culturale sensibile NON viene commercializzata: viene mostrata solo la dimostrazione pratica dell’intreccio.'
    }
  }
};

export type TranslatedText = { text: string; translated: boolean };

function lookup(lang: LanguageCode, id: string): CatalogText | undefined {
  return catalog[lang]?.[id];
}

export function categoryTexts(lang: LanguageCode, category: Category): { name: TranslatedText; description: TranslatedText } {
  const entry = lookup(lang, category.id);
  return {
    name: { text: entry?.name ?? category.name, translated: Boolean(entry?.name) },
    description: {
      text: entry?.description ?? category.description ?? '',
      translated: Boolean(entry?.description)
    }
  };
}

export function listingTexts(lang: LanguageCode, listing: Listing): { title: TranslatedText; description: TranslatedText } {
  const entry = lookup(lang, listing.id);
  return {
    title: { text: entry?.name ?? listing.title, translated: Boolean(entry?.name) },
    description: {
      text: entry?.description ?? listing.description,
      translated: Boolean(entry?.description)
    }
  };
}

/** Languages that actually have catalogue wording, for the coverage report. */
export const CATALOG_LANGUAGES = Object.keys(catalog) as LanguageCode[];
