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

// Phase 4: AI Consensus Types
export interface AICandidate {
  title: string;
  rationale: string;
  cost_delta: string;
  currency: string;
  duration_minutes: number;
  adjustments: string[];
  accommodated_users: string[];
}

export interface AICandidateOut {
  revision_id: string;
  proposal_id: string;
  round_number: number;
  candidate: AICandidate;
  constraint_valid: boolean;
  constraint_reason: string;
  status: 'active' | 'accepted' | 'superseded' | 'rejected';
  created_at: string;
}

export interface BranchTriggerOut {
  action: 'keep_blending' | 'branch';
  reason: string;
  suggested_branches: string[];
}

// Phase 5: Branching & Chat Types
export interface BranchMember {
  branch_member_id: string;
  branch_id: string;
  user_id: string;
  status: 'pending' | 'confirmed' | 'modification_requested';
  confirmed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  branch_id: string;
  trip_id: string;
  proposal_id?: string | null;
  parent_branch_id?: string | null;
  title: string;
  preview_deadline: string;
  status: 'preview' | 'confirmed' | 'rejected' | 'modification_requested';
  members: BranchMember[];
  revision_count: number;
  created_at: string;
  updated_at: string;
}

export interface BranchRevision {
  revision_id: string;
  branch_id: string;
  round_number: number;
  ai_candidate_json: string;
  constraint_valid: boolean;
  constraint_reason: string;
  status: string;
  created_at: string;
}

export interface ChatMessage {
  message_id: string;
  trip_id: string;
  user_id: string;
  body: string;
  is_unanimous_override: boolean;
  sent_at: string;
}

// Phase 6: Matching & Photos Types
export interface GroupMatch {
  trip_id: string;
  title: string;
  destination_city_id: string;
  destination_city_name: string;
  start_date: string;
  end_date: string;
  party_size: number;
  current_members_count: number;
  trip_mode: string;
  compatibility_score: number;
  match_reasons: string[];
}

export interface GuideMatch {
  guide_id: string;
  display_name: string;
  city_id: string;
  city_name: string;
  languages: string[];
  specialisation: string;
  secondary_specialisation?: string | null;
  years_experience: number;
  rating?: number | null;
  review_count: number;
  day_rate: string;
  half_day_rate: string;
  currency: string;
  certified: boolean;
  bio: string;
  compatibility_score: number;
  match_reasons: string[];
}

export interface FaceProfile {
  profile_id: string;
  user_id: string;
  registered_at: string;
  has_embeddings: boolean;
  photo_urls: string[];
}

export interface PhotoPerson {
  tag_id: string;
  photo_id: string;
  user_id: string;
  confidence?: number | null;
  is_confirmed: boolean;
  tagged_at: string;
}

export interface Photo {
  photo_id: string;
  trip_id: string;
  uploader_user_id: string;
  cloudinary_url: string;
  thumbnail_url?: string | null;
  caption?: string | null;
  uploaded_at: string;
  person_tags: PhotoPerson[];
}
