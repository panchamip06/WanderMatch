-- KV Hackathon 2026 · travel data model v1.1.0-rc1
-- Only the 14 tables this problem statement needs.

-- SQLite has no DECIMAL type, and NUMERIC affinity would turn '8500.00' into the
-- float 8500.0. Money columns are therefore TEXT so the exact value survives.
PRAGMA foreign_keys = ON;

-- currencies  (Reference & geography)
CREATE TABLE currencies (
  currency_id                  TEXT PRIMARY KEY,
  iso4217                      TEXT NOT NULL UNIQUE,
  name                         TEXT NOT NULL,
  symbol                       TEXT NOT NULL,
  minor_unit_exponent          INTEGER NOT NULL,
  display_locale               TEXT NOT NULL,
  updated_at                   TEXT NOT NULL
);

-- languages  (Reference & geography)
CREATE TABLE languages (
  language_id                  TEXT PRIMARY KEY,
  bcp47                        TEXT NOT NULL UNIQUE,
  english_name                 TEXT NOT NULL,
  native_name                  TEXT NOT NULL,
  script                       TEXT NOT NULL,
  rtl                          INTEGER NOT NULL,
  tts_supported                INTEGER NOT NULL,
  updated_at                   TEXT NOT NULL
);

-- countries  (Reference & geography)
CREATE TABLE countries (
  country_id                   TEXT PRIMARY KEY,
  iso2                         TEXT NOT NULL UNIQUE,
  iso3                         TEXT NOT NULL UNIQUE,
  name                         TEXT NOT NULL,
  default_currency             TEXT NOT NULL,
  calling_code                 TEXT NOT NULL,
  region                       TEXT NOT NULL,
  updated_at                   TEXT NOT NULL,
  FOREIGN KEY (default_currency) REFERENCES currencies(iso4217)
);

-- cities  (Reference & geography)
CREATE TABLE cities (
  city_id                      TEXT PRIMARY KEY,
  name                         TEXT NOT NULL,
  state                        TEXT,
  country_id                   TEXT NOT NULL,
  country_code                 TEXT NOT NULL,
  lat                          NUMERIC(9,6) NOT NULL,
  lng                          NUMERIC(9,6) NOT NULL,
  timezone                     TEXT NOT NULL,
  region                       TEXT NOT NULL,
  population                   INTEGER,
  season_profile               TEXT NOT NULL,
  peak_months                  TEXT NOT NULL,
  primary_language             TEXT NOT NULL,
  description                  TEXT,
  status                       TEXT NOT NULL,
  updated_at                   TEXT NOT NULL,
  FOREIGN KEY (country_id) REFERENCES countries(country_id),
  FOREIGN KEY (primary_language) REFERENCES languages(bcp47)
);

-- tour_guides  (Supply & catalogue)
CREATE TABLE tour_guides (
  guide_id                     TEXT PRIMARY KEY,
  city_id                      TEXT NOT NULL,
  display_name                 TEXT NOT NULL,
  languages                    TEXT NOT NULL,
  specialisation               TEXT NOT NULL,
  secondary_specialisation     TEXT,
  years_experience             INTEGER NOT NULL,
  rating                       NUMERIC(2,1),
  review_count                 INTEGER NOT NULL,
  day_rate                     TEXT NOT NULL,
  half_day_rate                TEXT NOT NULL,
  currency                     TEXT NOT NULL,
  certified                    INTEGER NOT NULL,
  bio                          TEXT NOT NULL,
  status                       TEXT NOT NULL,
  updated_at                   TEXT NOT NULL,
  FOREIGN KEY (city_id) REFERENCES cities(city_id),
  FOREIGN KEY (currency) REFERENCES currencies(iso4217)
);

-- users  (Identity & preference)
CREATE TABLE users (
  user_id                      TEXT PRIMARY KEY,
  display_name                 TEXT NOT NULL,
  email                        TEXT NOT NULL UNIQUE,
  home_city_id                 TEXT NOT NULL,
  home_currency                TEXT NOT NULL,
  locale                       TEXT NOT NULL,
  budget_band                  TEXT NOT NULL,
  travel_style                 TEXT NOT NULL,
  traveller_type               TEXT NOT NULL,
  segment                      TEXT NOT NULL,
  date_of_signup               TEXT NOT NULL,
  loyalty_tier                 TEXT,
  status                       TEXT NOT NULL,
  created_at                   TEXT NOT NULL,
  updated_at                   TEXT NOT NULL,
  FOREIGN KEY (home_city_id) REFERENCES cities(city_id),
  FOREIGN KEY (home_currency) REFERENCES currencies(iso4217),
  FOREIGN KEY (locale) REFERENCES languages(bcp47)
);

-- trips  (Trip & itinerary)
CREATE TABLE trips (
  trip_id                      TEXT PRIMARY KEY,
  owner_user_id                TEXT NOT NULL,
  title                        TEXT NOT NULL,
  origin_city_id               TEXT,
  destination_city_id          TEXT NOT NULL,
  start_date                   TEXT NOT NULL,
  end_date                     TEXT NOT NULL,
  party_size                   INTEGER NOT NULL,
  adults                       INTEGER NOT NULL,
  children                     INTEGER NOT NULL,
  trip_type                    TEXT NOT NULL,
  is_group_trip                INTEGER NOT NULL,
  status                       TEXT NOT NULL,
  home_currency                TEXT NOT NULL,
  notes                        TEXT,
  created_at                   TEXT NOT NULL,
  updated_at                   TEXT NOT NULL,
  FOREIGN KEY (owner_user_id) REFERENCES users(user_id),
  FOREIGN KEY (origin_city_id) REFERENCES cities(city_id),
  FOREIGN KEY (destination_city_id) REFERENCES cities(city_id),
  FOREIGN KEY (home_currency) REFERENCES currencies(iso4217)
);

-- user_interactions  (Signals & evaluation)
CREATE TABLE user_interactions (
  interaction_id               TEXT PRIMARY KEY,
  user_id                      TEXT NOT NULL,
  entity_type                  TEXT NOT NULL,
  entity_id                    TEXT NOT NULL,
  interaction_type             TEXT NOT NULL,
  occurred_at                  TEXT NOT NULL,
  dwell_seconds                INTEGER,
  position_in_list             INTEGER,
  query_text                   TEXT,
  query_language               TEXT,
  channel                      TEXT NOT NULL,
  session_id                   TEXT NOT NULL,
  implicit_rating              NUMERIC(3,2),
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (query_language) REFERENCES languages(bcp47)
);

-- user_preferences  (Identity & preference)
CREATE TABLE user_preferences (
  preference_id                TEXT PRIMARY KEY,
  user_id                      TEXT NOT NULL UNIQUE,
  preferred_languages          TEXT NOT NULL,
  guide_language               TEXT,
  interests                    TEXT NOT NULL,
  dietary_flags                TEXT,
  accessibility_needs          TEXT,
  preferred_currency           TEXT NOT NULL,
  max_daily_budget             TEXT,
  max_daily_budget_currency    TEXT,
  pace                         TEXT NOT NULL,
  updated_at                   TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (guide_language) REFERENCES languages(bcp47),
  FOREIGN KEY (preferred_currency) REFERENCES currencies(iso4217),
  FOREIGN KEY (max_daily_budget_currency) REFERENCES currencies(iso4217)
);

-- itineraries  (Trip & itinerary)
CREATE TABLE itineraries (
  itinerary_id                 TEXT PRIMARY KEY,
  trip_id                      TEXT NOT NULL,
  name                         TEXT NOT NULL,
  version                      INTEGER NOT NULL,
  is_active                    INTEGER NOT NULL,
  generated_by                 TEXT NOT NULL,
  total_cost                   TEXT NOT NULL,
  currency                     TEXT NOT NULL,
  total_duration_minutes       INTEGER NOT NULL,
  total_carbon_kg              NUMERIC(10,3) NOT NULL,
  optimizer_weights            TEXT,
  status                       TEXT NOT NULL,
  created_at                   TEXT NOT NULL,
  updated_at                   TEXT NOT NULL,
  FOREIGN KEY (trip_id) REFERENCES trips(trip_id),
  FOREIGN KEY (currency) REFERENCES currencies(iso4217)
);

-- itinerary_items  (Trip & itinerary)
CREATE TABLE itinerary_items (
  item_id                      TEXT PRIMARY KEY,
  itinerary_id                 TEXT NOT NULL,
  day_index                    INTEGER NOT NULL,
  sort_order                   INTEGER NOT NULL,
  starts_at                    TEXT,
  ends_at                      TEXT,
  item_type                    TEXT NOT NULL,
  entity_type                  TEXT,
  entity_id                    TEXT,
  title                        TEXT NOT NULL,
  cost                         TEXT NOT NULL,
  currency                     TEXT NOT NULL,
  carbon_kg                    NUMERIC(8,3) NOT NULL,
  duration_minutes             INTEGER NOT NULL,
  source                       TEXT NOT NULL,
  explanation                  TEXT,
  locked                       INTEGER NOT NULL,
  status                       TEXT NOT NULL,
  created_at                   TEXT NOT NULL,
  updated_at                   TEXT NOT NULL,
  FOREIGN KEY (itinerary_id) REFERENCES itineraries(itinerary_id),
  FOREIGN KEY (currency) REFERENCES currencies(iso4217)
);

-- proposals  (Trip & itinerary)
CREATE TABLE proposals (
  proposal_id                  TEXT PRIMARY KEY,
  itinerary_id                 TEXT NOT NULL,
  proposed_by_user_id          TEXT NOT NULL,
  action                       TEXT NOT NULL,
  target_item_id               TEXT,
  entity_type                  TEXT,
  entity_id                    TEXT,
  title                        TEXT NOT NULL,
  rationale                    TEXT,
  cost_delta                   TEXT NOT NULL,
  currency                     TEXT NOT NULL,
  closes_at                    TEXT NOT NULL,
  status                       TEXT NOT NULL,
  created_at                   TEXT NOT NULL,
  updated_at                   TEXT NOT NULL,
  FOREIGN KEY (itinerary_id) REFERENCES itineraries(itinerary_id),
  FOREIGN KEY (proposed_by_user_id) REFERENCES users(user_id),
  FOREIGN KEY (target_item_id) REFERENCES itinerary_items(item_id),
  FOREIGN KEY (currency) REFERENCES currencies(iso4217)
);

-- trip_members  (Trip & itinerary)
CREATE TABLE trip_members (
  member_id                    TEXT PRIMARY KEY,
  trip_id                      TEXT NOT NULL,
  user_id                      TEXT NOT NULL,
  role                         TEXT NOT NULL,
  joined_at                    TEXT NOT NULL,
  share_weight                 NUMERIC(6,3) NOT NULL,
  invited_by_user_id           TEXT,
  status                       TEXT NOT NULL,
  updated_at                   TEXT NOT NULL,
  FOREIGN KEY (trip_id) REFERENCES trips(trip_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (invited_by_user_id) REFERENCES users(user_id),
  UNIQUE (trip_id, user_id)
);

-- votes  (Trip & itinerary)
CREATE TABLE votes (
  vote_id                      TEXT PRIMARY KEY,
  proposal_id                  TEXT NOT NULL,
  user_id                      TEXT NOT NULL,
  value                        TEXT NOT NULL,
  weight                       NUMERIC(4,2) NOT NULL,
  comment                      TEXT,
  cast_at                      TEXT NOT NULL,
  updated_at                   TEXT NOT NULL,
  FOREIGN KEY (proposal_id) REFERENCES proposals(proposal_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  UNIQUE (proposal_id, user_id)
);
