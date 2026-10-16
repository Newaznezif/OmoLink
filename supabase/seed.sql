-- Optional categories seed. Producers, listings and inquiries are NOT seeded
-- into the production schema because they must come from verified community
-- accounts. Demo data lives in src/lib/demo-data.ts and never mixes with
-- Supabase rows.

insert into public.categories (id, name, slug, kind, description) values
  ('cat_handicraft', 'Handicrafts', 'handicrafts', 'product', 'Baskets, jewellery, pottery, woodwork and other handmade items.'),
  ('cat_honey', 'Honey and local foods', 'honey-local-foods', 'product', 'Forest honey, spices, grains and other local foods.'),
  ('cat_dairy', 'Dairy and agricultural products', 'dairy-agri', 'product', 'Milk, butter, cheese, meat and other farm products.'),
  ('cat_textile', 'Textiles and traditional products', 'textiles', 'product', 'Woven cloth, hides, garments and accessories.'),
  ('cat_tourism', 'Tourism experiences', 'tourism-experiences', 'service', 'Multi-day visits, cultural landscape tours and community-run experiences.'),
  ('cat_guided', 'Guided visits', 'guided-visits', 'service', 'Half-day and full-day walks with a local guide.'),
  ('cat_craft_demo', 'Craft demonstrations', 'craft-demonstrations', 'service', 'Sessions where producers show a craft process to small groups.'),
  ('cat_other', 'Other locally verified services', 'other-services', 'product', 'Community-verified services that do not fit the categories above.')
on conflict (id) do nothing;
