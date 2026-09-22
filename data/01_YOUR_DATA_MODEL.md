# PS-11 — your data model

**WanderMatch — Social & Group Travel Planning**  
Kognivera Hackathon 2026 · Travel & Tourism · data model v1.1.0-rc1

> **The problem statement itself, the 24-hour MVP scope and the XR device requirement live in the hackathon application**, on your statement's page. This document is the data you have been given to build it with: every table, every field, and what each one is for.

---

You have **27,428 rows across 14 tables**. 13 of them are the tables this statement is built on; the remaining 1 is a reference table the others point at, included so the database works on its own.

All of it is in the `data/` folder beside this document: as `PS-11.db` (SQLite, indexed, ready to query), as CSV, and as DDL for Postgres and SQLite.

## What the data gives you

270 group trips with real membership and roles, 274 live proposals, 761 votes — including genuine ties — and versioned itineraries so conflict handling is tractable.

## Watch out for this one

`itineraries.version` is how you handle two people editing at once. Bump it, do not overwrite it.

## The tables this statement is built on

| Table | Rows | What you use it for |
|---|---|---|
| `cities` | 60 | The geographic anchor of the whole model. 60 cities; every hotel, POI, package, advisory and weather row hangs off one. |
| `countries` | 30 | ISO country reference. Every city, currency default and calling code resolves here. |
| `currencies` | 25 | carries the true minor-unit exponent so JPY/KWD display correctly even though storage is always DECIMAL(12,2). |
| `itineraries` | 803 | A versioned plan belonging to a trip. version is what makes PS-11's conflict handling tractable. |
| `itinerary_items` | 8,583 | The atom of the portal, and the single most-shared object across the thirteen builds. If a team implements one shared shape, this is it. |
| `trip_members` | 1,407 | Membership and role. PS-11's collaborative editing and PS-08's split lines both key off this. |
| `trips` | 600 | The container that gives dates, party, destination and budget to everything else. Seven statements produce or consume one. |
| `user_preferences` | 1,200 | Explicit preference signal. PS-04's language-preference requirement reads from here. |
| `users` | 1,200 | The traveller identity every personalisation hangs off. Segmented heavy / light / cold_start so APS-04 can prove cold start. |
| `proposals` | 274 | Pre-existing group debate, so PS-11 has something to demo the moment it loads. |
| `tour_guides` | 120 | PS-04's added guide dimension — selectable by language, specialisation, availability and price. |
| `user_interactions` | 12,339 | heavy users with long histories plus a deliberate cold-start cohort with none. One event per user makes everyone cold and APS-04 undemonstrable. |
| `votes` | 761 | One row per member per proposal. Ties are deliberately present in the seed so consensus logic gets exercised. |

## Reference tables, included so the database is valid

You will mostly join through these rather than think about them.

| Table | Rows | What it is |
|---|---|---|
| `languages` | 26 | Rule R6: BCP-47 is the only legal way to say 'language' anywhere in the model. |

## How they fit together

Open `02_DATA_MODEL_DIAGRAM.html` in a browser for the clickable version — it shows these tables and nothing else. Download it first; it will not render inside SharePoint.

Some tables point at "any bookable thing" using an `(entity_type, entity_id)` pair rather than a typed foreign key. That is deliberate: it is what lets one feature refer to a hotel, a flight, a point of interest or a package without a separate join table for each. The legal values of `entity_type` are in `data/enums.json`.

---

## Every field, table by table

Columns marked **PK** are the primary key. **FK** shows what a column points at. Enum columns list their legal values — anything else is rejected by the conformance check.

### `currencies`

*Reference & geography · 25 rows · IDs start `cur_`*

carries the true minor-unit exponent so JPY/KWD display correctly even though storage is always DECIMAL(12,2).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `currency_id` | text | **PK** | cur_ prefixed. |
| `iso4217` | char(3) | UNIQUE · NOT NULL | e.g. INR. |
| `name` | text | NOT NULL |  |
| `symbol` | text | NOT NULL |  |
| `minor_unit_exponent` | smallint | NOT NULL | 0 for JPY/KRW, 2 default, 3 for KWD/BHD. |
| `display_locale` | text | NOT NULL | BCP-47 locale used for formatting. |
| `updated_at` | timestamptz | NOT NULL |  |

### `languages`

*Reference & geography · 26 rows · IDs start `lng_` · reference table*

Rule R6: BCP-47 is the only legal way to say 'language' anywhere in the model.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `language_id` | text | **PK** | lng_ prefixed. |
| `bcp47` | text | UNIQUE · NOT NULL | e.g. ta, hi, en-IN — never 'Tamil'. |
| `english_name` | text | NOT NULL |  |
| `native_name` | text | NOT NULL |  |
| `script` | text | NOT NULL | ISO-15924, e.g. Taml, Deva, Latn. |
| `rtl` | bool | NOT NULL | Right-to-left rendering flag. |
| `tts_supported` | bool | NOT NULL | Relevant to PS-13 voice output. |
| `updated_at` | timestamptz | NOT NULL |  |

### `countries`

*Reference & geography · 30 rows · IDs start `cnt_`*

ISO country reference. Every city, currency default and calling code resolves here.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `country_id` | text | **PK** | Canonical ID, cnt_ prefixed. |
| `iso2` | char(2) | UNIQUE · NOT NULL | ISO-3166-1 alpha-2, e.g. IN. |
| `iso3` | char(3) | UNIQUE · NOT NULL | ISO-3166-1 alpha-3, e.g. IND. |
| `name` | text | NOT NULL | English short name. |
| `default_currency` | char(3) | FK → `currencies.iso4217` · NOT NULL | ISO-4217 code. |
| `calling_code` | text | NOT NULL | E.164 country calling code, e.g. +91. |
| `region` | text | NOT NULL | UN sub-region grouping. |
| `updated_at` | timestamptz | NOT NULL | Rule R4: UTC, ISO-8601 with offset. |

### `cities`

*Reference & geography · 60 rows · IDs start `cty_`*

The geographic anchor of the whole model. 60 cities; every hotel, POI, package, advisory and weather row hangs off one.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `city_id` | text | **PK** | cty_ prefixed. |
| `name` | text | NOT NULL | City name. |
| `state` | text |  | State / province, nullable for city-states. |
| `country_id` | text | FK → `countries.country_id` · NOT NULL |  |
| `country_code` | char(2) | NOT NULL | Denormalised ISO2 for convenient joins. |
| `lat` | decimal(9,6) | NOT NULL | Rule R7: WGS-84, 6dp. |
| `lng` | decimal(9,6) | NOT NULL | Rule R7: WGS-84, 6dp. |
| `timezone` | text | NOT NULL | IANA zone, e.g. Asia/Kolkata. |
| `region` | text | NOT NULL | Domestic region grouping, e.g. South India. |
| `population` | int |  | Approximate, for demand weighting. |
| `season_profile` | text | NOT NULL · one of `winter`, `summer`, `monsoon`, `post_monsoon`, `spring`, `autumn` | Dominant season at the peak travel window. |
| `peak_months` | text | NOT NULL | Comma-separated month numbers, e.g. 10,11,12. |
| `primary_language` | text | FK → `languages.bcp47` · NOT NULL | Rule R6: BCP-47 tag. |
| `description` | text |  | One-paragraph orientation blurb, used by PS-13. |
| `status` | text | NOT NULL · one of `active`, `inactive`, `archived`, `draft` |  |
| `updated_at` | timestamptz | NOT NULL |  |

### `tour_guides`

*Supply & catalogue · 120 rows · IDs start `gid_`*

PS-04's added guide dimension — selectable by language, specialisation, availability and price.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `guide_id` | text | **PK** | gid_ prefixed. |
| `city_id` | text | FK → `cities.city_id` · NOT NULL |  |
| `display_name` | text | NOT NULL | Synthetic. |
| `languages` | text | NOT NULL | Comma-separated BCP-47 — the PS-04 filter. |
| `specialisation` | text | NOT NULL · one of `heritage`, `food`, `trekking`, `wildlife`, `photography`, `religious`, `shopping`, `accessibility` |  |
| `secondary_specialisation` | text | one of `heritage`, `food`, `trekking`, `wildlife`, `photography`, `religious`, `shopping`, `accessibility` |  |
| `years_experience` | smallint | NOT NULL |  |
| `rating` | decimal(2,1) |  | Null for new guides. |
| `review_count` | int | NOT NULL |  |
| `day_rate` | decimal(12,2) | NOT NULL | D3. |
| `half_day_rate` | decimal(12,2) | NOT NULL |  |
| `currency` | char(3) | FK → `currencies.iso4217` · NOT NULL |  |
| `certified` | bool | NOT NULL |  |
| `bio` | text | NOT NULL | Plausible prose. |
| `status` | text | NOT NULL · one of `active`, `inactive`, `archived`, `draft` |  |
| `updated_at` | timestamptz | NOT NULL |  |

### `users`

*Identity & preference · 1,200 rows · IDs start `usr_`*

The traveller identity every personalisation hangs off. Segmented heavy / light / cold_start so APS-04 can prove cold start.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `user_id` | text | **PK** | usr_ prefixed. |
| `display_name` | text | NOT NULL | Synthetic — no real people (content policy). |
| `email` | text | UNIQUE · NOT NULL | Synthetic @example.invalid addresses only. |
| `home_city_id` | text | FK → `cities.city_id` · NOT NULL |  |
| `home_currency` | char(3) | FK → `currencies.iso4217` · NOT NULL |  |
| `locale` | text | FK → `languages.bcp47` · NOT NULL | UI language, BCP-47. |
| `budget_band` | text | NOT NULL · one of `shoestring`, `value`, `mid`, `premium`, `luxury` |  |
| `travel_style` | text | NOT NULL · one of `budget`, `comfort`, `luxury`, `adventure`, `slow`, `cultural`, `wellness` |  |
| `traveller_type` | text | NOT NULL · one of `solo`, `couple`, `family`, `business`, `friends`, `senior`, `backpacker` |  |
| `segment` | text | NOT NULL · one of `heavy`, `light`, `cold_start` | heavy / light / cold_start cohorts. |
| `date_of_signup` | date | NOT NULL |  |
| `loyalty_tier` | text |  | none | silver | gold — nullable by design. |
| `status` | text | NOT NULL · one of `active`, `inactive`, `archived`, `draft` |  |
| `created_at` | timestamptz | NOT NULL |  |
| `updated_at` | timestamptz | NOT NULL |  |

### `trips`

*Trip & itinerary · 600 rows · IDs start `trp_`*

The container that gives dates, party, destination and budget to everything else. Seven statements produce or consume one.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `trip_id` | text | **PK** | trp_ prefixed. |
| `owner_user_id` | text | FK → `users.user_id` · NOT NULL |  |
| `title` | text | NOT NULL |  |
| `origin_city_id` | text | FK → `cities.city_id` |  |
| `destination_city_id` | text | FK → `cities.city_id` · NOT NULL |  |
| `start_date` | date | NOT NULL | Rule R4: zoneless calendar date. |
| `end_date` | date | NOT NULL |  |
| `party_size` | smallint | NOT NULL |  |
| `adults` | smallint | NOT NULL |  |
| `children` | smallint | NOT NULL |  |
| `trip_type` | text | NOT NULL · one of `solo`, `couple`, `family`, `business`, `friends`, `senior`, `backpacker` |  |
| `is_group_trip` | bool | NOT NULL | PS-11 / PS-08 filter. |
| `status` | text | NOT NULL · one of `draft`, `planning`, `confirmed`, `in_progress`, `completed`, `cancelled` |  |
| `home_currency` | char(3) | FK → `currencies.iso4217` · NOT NULL |  |
| `notes` | text |  |  |
| `created_at` | timestamptz | NOT NULL |  |
| `updated_at` | timestamptz | NOT NULL |  |

### `user_interactions`

*Signals & evaluation · 12,339 rows · IDs start `uix_`*

heavy users with long histories plus a deliberate cold-start cohort with none. One event per user makes everyone cold and APS-04 undemonstrable.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `interaction_id` | text | **PK** | uix_ prefixed. |
| `user_id` | text | FK → `users.user_id` · NOT NULL |  |
| `entity_type` | text | NOT NULL · one of `hotel`, `room_type`, `rate_plan`, `flight`, `flight_fare`, `poi`, `package`, `package_component`, `guide`, `transfer`, `event`, `xr_scene` |  |
| `entity_id` | text | NOT NULL |  |
| `interaction_type` | text | NOT NULL · one of `view`, `click`, `like`, `save`, `book`, `dismiss`, `share`, `search` |  |
| `occurred_at` | timestamptz | NOT NULL |  |
| `dwell_seconds` | int |  | Null for non-view events. |
| `position_in_list` | smallint |  | Rank at which the item was shown — needed for unbiased offline eval. |
| `query_text` | text |  | Set for interaction_type = search. |
| `query_language` | text | FK → `languages.bcp47` |  |
| `channel` | text | NOT NULL · one of `web`, `mobile_app`, `partner`, `call_centre`, `agent` |  |
| `session_id` | text | NOT NULL |  |
| `implicit_rating` | decimal(3,2) |  | Derived signal, provided for convenience. |

### `user_preferences`

*Identity & preference · 1,200 rows · IDs start `prf_`*

Explicit preference signal. PS-04's language-preference requirement reads from here.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `preference_id` | text | **PK** | prf_ prefixed. |
| `user_id` | text | FK → `users.user_id` · UNIQUE · NOT NULL | One row per user. |
| `preferred_languages` | text | NOT NULL | Comma-separated BCP-47 tags, most-preferred first. |
| `guide_language` | text | FK → `languages.bcp47` | PS-04 — preferred language for guide/tour delivery. |
| `interests` | text | NOT NULL | Comma-separated category codes. |
| `dietary_flags` | text |  | vegetarian | vegan | halal | jain | none. |
| `accessibility_needs` | text |  | step_free | hearing | vision | none. |
| `preferred_currency` | char(3) | FK → `currencies.iso4217` · NOT NULL |  |
| `max_daily_budget` | decimal(12,2) |  | decimal, paired with currency below. |
| `max_daily_budget_currency` | char(3) | FK → `currencies.iso4217` |  |
| `pace` | text | NOT NULL | relaxed | balanced | packed — feeds PS-01 and APS-09. |
| `updated_at` | timestamptz | NOT NULL |  |

### `itineraries`

*Trip & itinerary · 803 rows · IDs start `itn_`*

A versioned plan belonging to a trip. version is what makes PS-11's conflict handling tractable.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `itinerary_id` | text | **PK** | itn_ prefixed. |
| `trip_id` | text | FK → `trips.trip_id` · NOT NULL |  |
| `name` | text | NOT NULL |  |
| `version` | int | NOT NULL | Monotonic per itinerary. |
| `is_active` | bool | NOT NULL | Exactly one active version per trip. |
| `generated_by` | text | NOT NULL · one of `user`, `ai_planner`, `optimizer`, `agent`, `vote`, `import` | Which subsystem produced this version. |
| `total_cost` | decimal(12,2) | NOT NULL | sum of item costs, half-up at the end. |
| `currency` | char(3) | FK → `currencies.iso4217` · NOT NULL |  |
| `total_duration_minutes` | int | NOT NULL |  |
| `total_carbon_kg` | decimal(10,3) | NOT NULL | APS-09 objective. |
| `optimizer_weights` | text |  | JSON string: {cost, time, carbon} weights that produced it. |
| `status` | text | NOT NULL · one of `active`, `inactive`, `archived`, `draft` |  |
| `created_at` | timestamptz | NOT NULL |  |
| `updated_at` | timestamptz | NOT NULL |  |

### `itinerary_items`

*Trip & itinerary · 8,583 rows · IDs start `itm_`*

The atom of the portal, and the single most-shared object across the thirteen builds. If a team implements one shared shape, this is it.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `item_id` | text | **PK** | itm_ prefixed. |
| `itinerary_id` | text | FK → `itineraries.itinerary_id` · NOT NULL |  |
| `day_index` | smallint | NOT NULL | 1-based. |
| `sort_order` | smallint | NOT NULL | Order within the day. |
| `starts_at` | timestamptz |  | Rule R4: offset-carrying; null for unscheduled items. |
| `ends_at` | timestamptz |  |  |
| `item_type` | text | NOT NULL · one of `hotel`, `flight`, `poi`, `package`, `guide`, `transfer`, `meal`, `free` |  |
| `entity_type` | text | one of `hotel`, `room_type`, `rate_plan`, `flight`, `flight_fare`, `poi`, `package`, `package_component`, `guide`, `transfer`, `event`, `xr_scene` | Polymorphic supply reference. |
| `entity_id` | text |  | Canonical ID of the referenced supply row. |
| `title` | text | NOT NULL |  |
| `cost` | decimal(12,2) | NOT NULL | D3. |
| `currency` | char(3) | FK → `currencies.iso4217` · NOT NULL |  |
| `carbon_kg` | decimal(8,3) | NOT NULL |  |
| `duration_minutes` | int | NOT NULL |  |
| `source` | text | NOT NULL · one of `user`, `ai_planner`, `optimizer`, `agent`, `vote`, `import` | user | ai_planner | optimizer | agent | vote — makes a mixed plan auditable. |
| `explanation` | text |  | Where APS-04 and PS-01 surface reasoning without a parallel structure. |
| `locked` | bool | NOT NULL | APS-09 hard constraint: must-see items cannot be dropped. |
| `status` | text | NOT NULL · one of `proposed`, `confirmed`, `removed`, `replaced` | Rule R8: removed items stay visible. |
| `created_at` | timestamptz | NOT NULL |  |
| `updated_at` | timestamptz | NOT NULL |  |

### `proposals`

*Trip & itinerary · 274 rows · IDs start `prp_`*

Pre-existing group debate, so PS-11 has something to demo the moment it loads.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `proposal_id` | text | **PK** | prp_ prefixed. |
| `itinerary_id` | text | FK → `itineraries.itinerary_id` · NOT NULL |  |
| `proposed_by_user_id` | text | FK → `users.user_id` · NOT NULL |  |
| `action` | text | NOT NULL | add | remove | replace | reschedule. |
| `target_item_id` | text | FK → `itinerary_items.item_id` | Null for an add. |
| `entity_type` | text | one of `hotel`, `room_type`, `rate_plan`, `flight`, `flight_fare`, `poi`, `package`, `package_component`, `guide`, `transfer`, `event`, `xr_scene` |  |
| `entity_id` | text |  |  |
| `title` | text | NOT NULL |  |
| `rationale` | text |  |  |
| `cost_delta` | decimal(12,2) | NOT NULL |  |
| `currency` | char(3) | FK → `currencies.iso4217` · NOT NULL |  |
| `closes_at` | timestamptz | NOT NULL |  |
| `status` | text | NOT NULL · one of `open`, `accepted`, `rejected`, `expired` |  |
| `created_at` | timestamptz | NOT NULL |  |
| `updated_at` | timestamptz | NOT NULL |  |

### `trip_members`

*Trip & itinerary · 1,407 rows · IDs start `tmb_`*

Membership and role. PS-11's collaborative editing and PS-08's split lines both key off this.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `member_id` | text | **PK** | tmb_ prefixed. |
| `trip_id` | text | FK → `trips.trip_id` · NOT NULL |  |
| `user_id` | text | FK → `users.user_id` · NOT NULL |  |
| `role` | text | NOT NULL · one of `owner`, `editor`, `viewer` |  |
| `joined_at` | timestamptz | NOT NULL |  |
| `share_weight` | decimal(6,3) | NOT NULL | Default 1.000; custom splits use this. |
| `invited_by_user_id` | text | FK → `users.user_id` |  |
| `status` | text | NOT NULL · one of `active`, `inactive`, `archived`, `draft` | Rule R8: departed members stay visible. |
| `updated_at` | timestamptz | NOT NULL |  |

*Unique together:* `(trip_id, user_id)`

### `votes`

*Trip & itinerary · 761 rows · IDs start `vot_`*

One row per member per proposal. Ties are deliberately present in the seed so consensus logic gets exercised.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `vote_id` | text | **PK** | vot_ prefixed. |
| `proposal_id` | text | FK → `proposals.proposal_id` · NOT NULL |  |
| `user_id` | text | FK → `users.user_id` · NOT NULL |  |
| `value` | text | NOT NULL · one of `yes`, `no`, `abstain` |  |
| `weight` | decimal(4,2) | NOT NULL | Default 1.00; owner votes may be weighted. |
| `comment` | text |  |  |
| `cast_at` | timestamptz | NOT NULL |  |
| `updated_at` | timestamptz | NOT NULL |  |

*Unique together:* `(proposal_id, user_id)`

---

## The rules that apply to these fields

| # | Rule |
|---|---|
| R1 | **Additive only.** Add columns, tables and stores freely. Never rename, drop or repurpose a field that came with the data. |
| R2 | **IDs are opaque prefixed strings** — `htl_a91f3c`. Never integers, never parsed for meaning. |
| R3 | **Money is a pair**: a 2-place decimal plus an ISO-4217 currency code. Never a float. |
| R4 | **Time is ISO-8601 with an offset.** `_at` fields carry an offset; `_date` fields have no zone. |
| R5 | **Enums are lowercase snake_case** and the legal values are in `data/enums.json`. |
| R6 | **Language is a BCP-47 tag** — `ta`, not "Tamil". |
| R7 | **Geography is WGS-84** to 6 decimal places, `lat` and `lng` together or not at all. |
| R8 | **Nothing is hard-deleted.** Rows carry `status` and `updated_at`. |

Add whatever you like beside these fields — new columns, new tables, your own vector store, your own services. That is the point of R1. What you must not do is rename or re-key the fields that came with the data, because that is what would stop sixteen independent builds being put together afterwards.

`data/WORKING_WITH_THE_DATA.md` has the loading instructions, including how to read money without corrupting it. `tools/validate_conformance.py` tells you in thirty seconds whether you are still conformant.
