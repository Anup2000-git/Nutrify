-- =====================================================
-- Seed data — minimal Indian foods for Phase 0 testing
-- =====================================================
-- Run after 0001_initial_schema.sql.
-- Phase 4 will replace this with the full IFCT 2017 + USDA import.

insert into foods (name, name_hindi, region, category, serving_size_g, serving_label, calories_per_100g, protein_g, carbs_g, fat_g, fiber_g, source, verified) values
  ('Chapati', 'चपाती', 'global', 'grain', 40, '1 medium', 297, 11.0, 56.0, 4.0, 5.0, 'ifct', true),
  ('Basmati Rice (cooked)', 'बासमती चावल', 'global', 'grain', 150, '1 katori', 121, 2.7, 25.2, 0.3, 0.4, 'ifct', true),
  ('Dal Tadka (Toor)', 'दाल तड़का', 'global', 'dal', 150, '1 katori', 116, 7.6, 14.5, 3.2, 4.5, 'ifct', true),
  ('Paneer (cooked)', 'पनीर', 'north', 'dairy', 50, '1 small bowl', 296, 18.3, 1.2, 25.0, 0.0, 'ifct', true),
  ('Idli', 'इडली', 'south', 'grain', 30, '1 piece', 118, 4.0, 23.0, 0.5, 1.0, 'ifct', true),
  ('Dosa (plain)', 'डोसा', 'south', 'grain', 80, '1 medium', 168, 4.0, 27.0, 5.0, 1.0, 'ifct', true),
  ('Roti (whole wheat)', 'रोटी', 'global', 'grain', 35, '1 medium', 264, 9.0, 50.0, 3.5, 6.5, 'ifct', true),
  ('Egg (boiled)', 'अंडा', 'global', 'meat', 50, '1 large', 155, 13.0, 1.1, 11.0, 0.0, 'usda', true),
  ('Banana', 'केला', 'global', 'fruit', 120, '1 medium', 89, 1.1, 23.0, 0.3, 2.6, 'usda', true),
  ('Curd (dahi)', 'दही', 'global', 'dairy', 100, '1 katori', 60, 3.5, 4.7, 3.3, 0.0, 'ifct', true);
