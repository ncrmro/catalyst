-- Strip "'s Team" suffix from existing team names
UPDATE team
SET name = REGEXP_REPLACE(name, '''s Team$', '')
WHERE name LIKE '%''s Team';
