export interface User {
  user_id: string;
  display_name: string;
  email: string;
  home_city_id: string;
  home_currency: string;
  locale: string;
  budget_band: string;
  travel_style: string;
  traveller_type: string;
  segment: string;
  status: string;
}

export interface TripMember {
  member_id: string;
  trip_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  joined_at: string;
  share_weight: number;
  status: string;
}

export interface ItineraryItem {
  item_id: string;
  itinerary_id: string;
  day_index: number;
  sort_order: number;
  starts_at?: string | null;
  ends_at?: string | null;
  item_type: string;
  entity_type?: string | null;
  entity_id?: string | null;
  title: string;
  cost: string;
  currency: string;
  carbon_kg: number;
  duration_minutes: number;
  source: string;
  explanation?: string | null;
  locked: boolean;
  status: 'proposed' | 'confirmed' | 'removed' | 'replaced';
}

export interface Itinerary {
  itinerary_id: string;
  trip_id: string;
  name: string;
  version: number;
  is_active: boolean;
  generated_by: string;
  total_cost: string;
  currency: string;
  total_duration_minutes: number;
  total_carbon_kg: number;
  status: string;
  items: ItineraryItem[];
}

export interface Trip {
  trip_id: string;
  owner_user_id: string;
  title: string;
  origin_city_id?: string | null;
  destination_city_id: string;
  start_date: string;
  end_date: string;
  party_size: number;
  adults: number;
  children: number;
  trip_type: string;
  is_group_trip: boolean;
  trip_mode?: string;
  status: string;
  home_currency: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  members?: TripMember[];
  active_itinerary?: Itinerary | null;
}

export interface VoteDetail {
  vote_id: string;
  user_id: string;
  value: 'yes' | 'no' | 'abstain';
  weight: number;
  comment?: string | null;
  cast_at: string;
}

export interface ResponseWindowInfo {
  active: boolean;
  first_no_at?: string | null;
  expires_at?: string | null;
  seconds_remaining: number;
}

export interface Proposal {
  proposal_id: string;
  itinerary_id: string;
  proposed_by_user_id: string;
  action: 'add' | 'remove' | 'replace' | 'reschedule';
  target_item_id?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  title: string;
  rationale?: string | null;
  cost_delta: string;
  currency: string;
  closes_at: string;
  status: 'open' | 'accepted' | 'rejected' | 'expired';
  created_at: string;
  updated_at: string;
  yes_votes: number;
  no_votes: number;
  abstain_votes: number;
  no_reasons: string[];
  votes_detail?: VoteDetail[];
  response_window?: ResponseWindowInfo | null;
}

export interface Vote {
  vote_id: string;
  proposal_id: string;
  user_id: string;
  value: 'yes' | 'no' | 'abstain';
  weight: number;
  comment?: string | null;
  cast_at: string;
  updated_at: string;
}

export type SlotStatus = 'Empty' | 'Proposing' | 'Voting' | 'Common-Ground' | 'Branching' | 'Confirmed';
