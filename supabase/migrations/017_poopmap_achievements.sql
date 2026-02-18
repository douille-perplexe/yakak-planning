-- ============================================================
-- Poop Map Achievements — 4 groups x 4 tiers = 16 definitions
-- ============================================================

INSERT INTO public.achievement_definitions (slug, name, description, icon, category, tier, tier_position, achievement_group, threshold, is_automatic) VALUES
  -- poop_veteran (total poops logged)
  ('poop_veteran_bronze',   'First Drop',         'Log your first poop',             'target',   'special', 'bronze',   0, 'poop_veteran', 1,  true),
  ('poop_veteran_silver',   'Regular Movement',    'Log 5 poops',                     'target',   'special', 'silver',   1, 'poop_veteran', 5,  true),
  ('poop_veteran_gold',     'Poop Machine',        'Log 15 poops',                    'target',   'special', 'gold',     2, 'poop_veteran', 15, true),
  ('poop_veteran_platinum', 'Poop Legend',          'Log 50 poops',                    'target',   'special', 'platinum', 3, 'poop_veteran', 50, true),

  -- poop_rater (poops with a rating)
  ('poop_rater_bronze',   'Poop Critic',           'Rate 3 of your poops',            'star',     'special', 'bronze',   0, 'poop_rater', 3,  true),
  ('poop_rater_silver',   'Connoisseur',           'Rate 10 of your poops',           'star',     'special', 'silver',   1, 'poop_rater', 10, true),
  ('poop_rater_gold',     'Poop Sommelier',        'Rate 25 of your poops',           'star',     'special', 'gold',     2, 'poop_rater', 25, true),
  ('poop_rater_platinum', 'Grand Cru',             'Rate 50 of your poops',           'star',     'special', 'platinum', 3, 'poop_rater', 50, true),

  -- poop_explorer (unique places)
  ('poop_explorer_bronze',   'New Territory',       'Poop in 3 unique places',         'map-pin',  'special', 'bronze',   0, 'poop_explorer', 3,  true),
  ('poop_explorer_silver',   'Wandering Pooper',    'Poop in 10 unique places',        'map-pin',  'special', 'silver',   1, 'poop_explorer', 10, true),
  ('poop_explorer_gold',     'Globe Trotter',       'Poop in 25 unique places',        'map-pin',  'special', 'gold',     2, 'poop_explorer', 25, true),
  ('poop_explorer_platinum', 'World Pooper',        'Poop in 50 unique places',        'map-pin',  'special', 'platinum', 3, 'poop_explorer', 50, true),

  -- poop_streak (consecutive days with a poop)
  ('poop_streak_bronze',   'Three-Day Run',         'Poop 3 days in a row',            'zap',      'special', 'bronze',   0, 'poop_streak', 3,  true),
  ('poop_streak_silver',   'Week of Regularity',    'Poop 7 days in a row',            'zap',      'special', 'silver',   1, 'poop_streak', 7,  true),
  ('poop_streak_gold',     'Fortnight Flow',        'Poop 14 days in a row',           'zap',      'special', 'gold',     2, 'poop_streak', 14, true),
  ('poop_streak_platinum', 'Monthly Movement',      'Poop 30 days in a row',           'zap',      'special', 'platinum', 3, 'poop_streak', 30, true);
