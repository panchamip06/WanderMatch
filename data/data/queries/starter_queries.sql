-- PS-11 — WanderMatch — Social & Group Travel Planning
-- Starter queries. Every one runs as-is against data/PS-11.db.
--
-- CAST(x AS REAL) appears below only for sorting and rough exploration.
-- Never use it for a value you will show someone or add to another value.

-- ==========================================================================
-- 1. A group trip and everyone on it
-- role decides who can edit. share_weight is what a custom split reads.
-- ==========================================================================
SELECT t.title, u.display_name, m.role, m.share_weight, m.joined_at, m.status
     FROM trip_members m JOIN users u ON u.user_id = m.user_id
     JOIN trips t ON t.trip_id = m.trip_id
    WHERE t.is_group_trip = 1
      AND t.trip_id = (SELECT trip_id FROM trips WHERE is_group_trip=1 ORDER BY trip_id LIMIT 1);

-- ==========================================================================
-- 2. Open proposals with their vote tallies
-- Ties are present in the seed on purpose. Your consensus logic has to have an answer.
-- ==========================================================================
SELECT p.title, p.action, p.status, p.cost_delta, p.currency, p.closes_at,
          SUM(CASE WHEN v.value='yes' THEN 1 ELSE 0 END) AS yes,
          SUM(CASE WHEN v.value='no'  THEN 1 ELSE 0 END) AS no,
          SUM(CASE WHEN v.value='abstain' THEN 1 ELSE 0 END) AS abstain
     FROM proposals p LEFT JOIN votes v ON v.proposal_id = p.proposal_id
    WHERE p.status='open' GROUP BY p.proposal_id ORDER BY yes DESC LIMIT 15;

-- ==========================================================================
-- 3. Proposals that are actually tied
-- These are the demo. Find one before you build the tie-break rule.
-- ==========================================================================
SELECT p.proposal_id, p.title,
          SUM(CASE WHEN v.value='yes' THEN 1 ELSE 0 END) AS yes,
          SUM(CASE WHEN v.value='no'  THEN 1 ELSE 0 END) AS no
     FROM proposals p JOIN votes v ON v.proposal_id = p.proposal_id
    GROUP BY p.proposal_id
   HAVING yes = no AND yes > 0 LIMIT 10;

-- ==========================================================================
-- 4. The shared itinerary the group is editing
-- version is what makes conflict handling tractable. Bump it, do not overwrite.
-- ==========================================================================
SELECT it.itinerary_id, it.version, it.is_active, it.generated_by,
          COUNT(i.item_id) AS items, it.total_cost, it.currency
     FROM itineraries it LEFT JOIN itinerary_items i ON i.itinerary_id = it.itinerary_id
    WHERE it.trip_id IN (SELECT trip_id FROM trips WHERE is_group_trip=1)
    GROUP BY it.itinerary_id ORDER BY it.trip_id, it.version LIMIT 15;

-- ==========================================================================
-- 5. Matching a solo traveller to a compatible group
-- Interests, style and dates. Start heuristic; the statement does not require a model.
-- ==========================================================================
SELECT u.display_name, u.travel_style, u.budget_band, pr.interests, pr.pace,
          t.title AS candidate_trip, t.start_date, t.end_date
     FROM users u JOIN user_preferences pr ON pr.user_id = u.user_id
     JOIN trips t ON t.destination_city_id = u.home_city_id AND t.is_group_trip = 1
    WHERE u.traveller_type='solo' LIMIT 12;
