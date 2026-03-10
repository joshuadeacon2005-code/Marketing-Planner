-- =====================================================
-- PRODUCTION DATABASE MIGRATION: Brands & Brand-Region Assignments
-- =====================================================

-- Step 1: Insert the brands from your list
INSERT INTO brands (id, name, color, is_active)
SELECT gen_random_uuid(), 'Baby Central', '#FF6B6B', true
WHERE NOT EXISTS (SELECT 1 FROM brands WHERE name = 'Baby Central');

INSERT INTO brands (id, name, color, is_active)
SELECT gen_random_uuid(), 'Beaba', '#F15BB5', true
WHERE NOT EXISTS (SELECT 1 FROM brands WHERE name = 'Beaba');

INSERT INTO brands (id, name, color, is_active)
SELECT gen_random_uuid(), 'Bloom Connect', '#95E1D3', true
WHERE NOT EXISTS (SELECT 1 FROM brands WHERE name = 'Bloom Connect');

INSERT INTO brands (id, name, color, is_active)
SELECT gen_random_uuid(), 'Bloom Create', '#F38181', true
WHERE NOT EXISTS (SELECT 1 FROM brands WHERE name = 'Bloom Create');

INSERT INTO brands (id, name, color, is_active)
SELECT gen_random_uuid(), 'Bubble', '#96CEB4', true
WHERE NOT EXISTS (SELECT 1 FROM brands WHERE name = 'Bubble');

INSERT INTO brands (id, name, color, is_active)
SELECT gen_random_uuid(), 'Ergobaby', '#9B5DE5', true
WHERE NOT EXISTS (SELECT 1 FROM brands WHERE name = 'Ergobaby');

INSERT INTO brands (id, name, color, is_active)
SELECT gen_random_uuid(), 'Micro', '#A8E6CF', true
WHERE NOT EXISTS (SELECT 1 FROM brands WHERE name = 'Micro');

INSERT INTO brands (id, name, color, is_active)
SELECT gen_random_uuid(), 'Skip Hop', '#00B4D8', true
WHERE NOT EXISTS (SELECT 1 FROM brands WHERE name = 'Skip Hop');

-- Step 2: Clear existing brand-region assignments
DELETE FROM brand_regions;

-- Step 3: Insert brand-region assignments

-- ID (Indonesia): Ergobaby, Baby Central, Bloom Connect, Bubble, Bloom Create
INSERT INTO brand_regions (id, brand_id, region_id)
SELECT gen_random_uuid(), b.id, r.id FROM brands b, regions r 
WHERE b.name = 'Ergobaby' AND r.name = 'Indonesia';

INSERT INTO brand_regions (id, brand_id, region_id)
SELECT gen_random_uuid(), b.id, r.id FROM brands b, regions r 
WHERE b.name = 'Baby Central' AND r.name = 'Indonesia';

INSERT INTO brand_regions (id, brand_id, region_id)
SELECT gen_random_uuid(), b.id, r.id FROM brands b, regions r 
WHERE b.name = 'Bloom Connect' AND r.name = 'Indonesia';

INSERT INTO brand_regions (id, brand_id, region_id)
SELECT gen_random_uuid(), b.id, r.id FROM brands b, regions r 
WHERE b.name = 'Bubble' AND r.name = 'Indonesia';

INSERT INTO brand_regions (id, brand_id, region_id)
SELECT gen_random_uuid(), b.id, r.id FROM brands b, regions r 
WHERE b.name = 'Bloom Create' AND r.name = 'Indonesia';

-- HK (Hong Kong): Ergobaby, Skip Hop, Bloom Connect, Baby Central, Bloom Create
INSERT INTO brand_regions (id, brand_id, region_id)
SELECT gen_random_uuid(), b.id, r.id FROM brands b, regions r 
WHERE b.name = 'Ergobaby' AND r.name LIKE 'Hong Kong%';

INSERT INTO brand_regions (id, brand_id, region_id)
SELECT gen_random_uuid(), b.id, r.id FROM brands b, regions r 
WHERE b.name = 'Skip Hop' AND r.name LIKE 'Hong Kong%';

INSERT INTO brand_regions (id, brand_id, region_id)
SELECT gen_random_uuid(), b.id, r.id FROM brands b, regions r 
WHERE b.name = 'Bloom Connect' AND r.name LIKE 'Hong Kong%';

INSERT INTO brand_regions (id, brand_id, region_id)
SELECT gen_random_uuid(), b.id, r.id FROM brands b, regions r 
WHERE b.name = 'Baby Central' AND r.name LIKE 'Hong Kong%';

INSERT INTO brand_regions (id, brand_id, region_id)
SELECT gen_random_uuid(), b.id, r.id FROM brands b, regions r 
WHERE b.name = 'Bloom Create' AND r.name LIKE 'Hong Kong%';

-- MY (Malaysia): Bloom Connect, Baby Central, Beaba, Skip Hop, Ergobaby, Bloom Create
INSERT INTO brand_regions (id, brand_id, region_id)
SELECT gen_random_uuid(), b.id, r.id FROM brands b, regions r 
WHERE b.name = 'Bloom Connect' AND r.name = 'Malaysia';

INSERT INTO brand_regions (id, brand_id, region_id)
SELECT gen_random_uuid(), b.id, r.id FROM brands b, regions r 
WHERE b.name = 'Baby Central' AND r.name = 'Malaysia';

INSERT INTO brand_regions (id, brand_id, region_id)
SELECT gen_random_uuid(), b.id, r.id FROM brands b, regions r 
WHERE b.name = 'Beaba' AND r.name = 'Malaysia';

INSERT INTO brand_regions (id, brand_id, region_id)
SELECT gen_random_uuid(), b.id, r.id FROM brands b, regions r 
WHERE b.name = 'Skip Hop' AND r.name = 'Malaysia';

INSERT INTO brand_regions (id, brand_id, region_id)
SELECT gen_random_uuid(), b.id, r.id FROM brands b, regions r 
WHERE b.name = 'Ergobaby' AND r.name = 'Malaysia';

INSERT INTO brand_regions (id, brand_id, region_id)
SELECT gen_random_uuid(), b.id, r.id FROM brands b, regions r 
WHERE b.name = 'Bloom Create' AND r.name = 'Malaysia';

-- SG (Singapore): Bloom Connect, Baby Central, Beaba, Skip Hop, Ergobaby, Micro, Bloom Create
INSERT INTO brand_regions (id, brand_id, region_id)
SELECT gen_random_uuid(), b.id, r.id FROM brands b, regions r 
WHERE b.name = 'Bloom Connect' AND r.name = 'Singapore';

INSERT INTO brand_regions (id, brand_id, region_id)
SELECT gen_random_uuid(), b.id, r.id FROM brands b, regions r 
WHERE b.name = 'Baby Central' AND r.name = 'Singapore';

INSERT INTO brand_regions (id, brand_id, region_id)
SELECT gen_random_uuid(), b.id, r.id FROM brands b, regions r 
WHERE b.name = 'Beaba' AND r.name = 'Singapore';

INSERT INTO brand_regions (id, brand_id, region_id)
SELECT gen_random_uuid(), b.id, r.id FROM brands b, regions r 
WHERE b.name = 'Skip Hop' AND r.name = 'Singapore';

INSERT INTO brand_regions (id, brand_id, region_id)
SELECT gen_random_uuid(), b.id, r.id FROM brands b, regions r 
WHERE b.name = 'Ergobaby' AND r.name = 'Singapore';

INSERT INTO brand_regions (id, brand_id, region_id)
SELECT gen_random_uuid(), b.id, r.id FROM brands b, regions r 
WHERE b.name = 'Micro' AND r.name = 'Singapore';

INSERT INTO brand_regions (id, brand_id, region_id)
SELECT gen_random_uuid(), b.id, r.id FROM brands b, regions r 
WHERE b.name = 'Bloom Create' AND r.name = 'Singapore';

-- Step 4: Delete brands that have no region assignments
DELETE FROM brands 
WHERE id NOT IN (SELECT DISTINCT brand_id FROM brand_regions);

-- Step 5: Verify the results
SELECT 'Remaining Brands:' as status;
SELECT name FROM brands ORDER BY name;

SELECT 'Brand-Region Assignments:' as status;
SELECT b.name as brand, r.name as region 
FROM brand_regions br 
JOIN brands b ON br.brand_id = b.id 
JOIN regions r ON br.region_id = r.id 
ORDER BY r.name, b.name;
