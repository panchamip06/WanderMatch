import type {
  Trip, Proposal, Vote, User, ItineraryItem,
  AICandidateOut, BranchTriggerOut, Branch, BranchRevision, ChatMessage,
  GroupMatch, GuideMatch, FaceProfile, Photo
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export class ApiService {
  private static getHeaders(tokenOrUserId?: string): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    const token = tokenOrUserId || localStorage.getItem('wandermatch_token');
    if (token) {
      if (token.startsWith('mock:') || token.startsWith('eyJ') || token.startsWith('Bearer ')) {
        headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      } else {
        headers['Authorization'] = `Bearer mock:${token}`;
      }
    }
    return headers;
  }

  static async checkHealth(): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
    return res.json();
  }

  // Authentication
  static async login(email: string): Promise<{ user: User; token: string }> {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Login failed');
    }
    return res.json();
  }

  static async register(data: {
    display_name: string;
    email: string;
    home_city_id?: string;
    travel_style?: string;
    budget_band?: string;
    traveller_type?: string;
    pace?: string;
    interests?: string;
  }): Promise<{ user: User; token: string }> {
    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Registration failed');
    }
    return res.json();
  }

  // Reference Data
  static async getCities(): Promise<any[]> {
    const res = await fetch(`${API_BASE_URL}/api/reference/cities?limit=60`);
    if (!res.ok) throw new Error('Failed to load cities');
    return res.json();
  }

  static async getCurrencies(): Promise<any[]> {
    const res = await fetch(`${API_BASE_URL}/api/reference/currencies`);
    if (!res.ok) throw new Error('Failed to load currencies');
    return res.json();
  }

  // Profile
  static async getProfile(userId?: string): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: this.getHeaders(userId),
    });
    if (!res.ok) throw new Error('Failed to load profile');
    return res.json();
  }

  static async updateProfile(data: any, userId?: string): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
      method: 'PUT',
      headers: this.getHeaders(userId),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update profile');
    return res.json();
  }

  // Trips
  static async getMyTrips(tokenOrUserId?: string): Promise<Trip[]> {
    const res = await fetch(`${API_BASE_URL}/api/trips/user/my`, {
      headers: this.getHeaders(tokenOrUserId),
    });
    if (!res.ok) throw new Error(`Failed to fetch my trips: ${res.statusText}`);
    return res.json();
  }

  static async getDiscoverTrips(tokenOrUserId?: string): Promise<Trip[]> {
    const res = await fetch(`${API_BASE_URL}/api/trips/discover`, {
      headers: this.getHeaders(tokenOrUserId),
    });
    if (!res.ok) throw new Error(`Failed to fetch discoverable trips: ${res.statusText}`);
    return res.json();
  }

  static async getTrips(isGroup = true): Promise<Trip[]> {
    const res = await fetch(`${API_BASE_URL}/api/trips?is_group=${isGroup}&limit=30`);
    if (!res.ok) throw new Error(`Failed to fetch trips: ${res.statusText}`);
    return res.json();
  }

  static async getTripDetail(tripId: string, tokenOrUserId?: string): Promise<Trip> {
    const res = await fetch(`${API_BASE_URL}/api/trips/${tripId}`, {
      headers: this.getHeaders(tokenOrUserId),
    });
    if (!res.ok) throw new Error(`Failed to fetch trip detail: ${res.statusText}`);
    return res.json();
  }

  static async createTrip(data: any, userId?: string): Promise<Trip> {
    const res = await fetch(`${API_BASE_URL}/api/trips`, {
      method: 'POST',
      headers: this.getHeaders(userId),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create trip');
    return res.json();
  }

  static async joinTrip(tripId: string, role = 'editor', userId?: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/trips/${tripId}/join`, {
      method: 'POST',
      headers: this.getHeaders(userId),
      body: JSON.stringify({ role }),
    });
    if (!res.ok) throw new Error('Failed to join trip');
    return res.json();
  }

  // Itinerary Items
  static async addItineraryItem(tripId: string, data: any, userId?: string): Promise<ItineraryItem> {
    const res = await fetch(`${API_BASE_URL}/api/trips/${tripId}/itinerary/items`, {
      method: 'POST',
      headers: this.getHeaders(userId),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to add itinerary item');
    return res.json();
  }

  static async updateItineraryItem(tripId: string, itemId: string, data: any, userId?: string): Promise<ItineraryItem> {
    const res = await fetch(`${API_BASE_URL}/api/trips/${tripId}/itinerary/items/${itemId}`, {
      method: 'PATCH',
      headers: this.getHeaders(userId),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update itinerary item');
    return res.json();
  }

  // Proposals & Votes
  static async getProposals(tripId: string): Promise<Proposal[]> {
    const res = await fetch(`${API_BASE_URL}/api/trips/${tripId}/proposals`);
    if (!res.ok) throw new Error(`Failed to fetch proposals: ${res.statusText}`);
    return res.json();
  }

  static async createProposal(
    tripId: string,
    data: {
      itinerary_id: string;
      title: string;
      action: string;
      target_item_id?: string;
      rationale?: string;
      cost_delta?: string;
    },
    userId?: string
  ): Promise<Proposal> {
    const res = await fetch(`${API_BASE_URL}/api/trips/${tripId}/proposals`, {
      method: 'POST',
      headers: this.getHeaders(userId),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to create proposal');
    }
    return res.json();
  }

  static async castVote(
    tripId: string,
    proposalId: string,
    value: 'yes' | 'no' | 'abstain',
    comment?: string,
    userId?: string
  ): Promise<Vote> {
    const res = await fetch(`${API_BASE_URL}/api/trips/${tripId}/votes`, {
      method: 'POST',
      headers: this.getHeaders(userId),
      body: JSON.stringify({
        proposal_id: proposalId,
        value,
        comment,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to cast vote');
    }
    return res.json();
  }

  static async resolveProposal(
    tripId: string,
    proposalId: string,
    resolution: 'accept' | 'reject',
    expectedItineraryVersion: number,
    userId?: string
  ): Promise<Proposal> {
    const res = await fetch(`${API_BASE_URL}/api/trips/${tripId}/proposals/${proposalId}/resolve`, {
      method: 'POST',
      headers: this.getHeaders(userId),
      body: JSON.stringify({
        resolution,
        expected_itinerary_version: expectedItineraryVersion,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const error: any = new Error(err.detail || `Failed to resolve proposal (${res.status})`);
      error.status = res.status;
      throw error;
    }
    return res.json();
  }

  // --- Phase 4: AI Consensus ---
  static async invokeConsensus(
    tripId: string,
    proposalId: string,
    notes?: string,
    userId?: string
  ): Promise<AICandidateOut> {
    const res = await fetch(`${API_BASE_URL}/api/trips/${tripId}/proposals/${proposalId}/consensus/invoke`, {
      method: 'POST',
      headers: this.getHeaders(userId),
      body: JSON.stringify({ notes }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to invoke AI consensus');
    }
    return res.json();
  }

  static async getCandidates(
    tripId: string,
    proposalId: string,
    userId?: string
  ): Promise<AICandidateOut[]> {
    const res = await fetch(`${API_BASE_URL}/api/trips/${tripId}/proposals/${proposalId}/consensus/candidates`, {
      headers: this.getHeaders(userId),
    });
    if (!res.ok) throw new Error('Failed to fetch AI candidates');
    return res.json();
  }

  static async classifyBranchTrigger(
    tripId: string,
    proposalId: string,
    userId?: string
  ): Promise<BranchTriggerOut> {
    const res = await fetch(`${API_BASE_URL}/api/trips/${tripId}/proposals/${proposalId}/consensus/branch-trigger`, {
      method: 'POST',
      headers: this.getHeaders(userId),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to evaluate branch trigger');
    }
    return res.json();
  }

  // --- Phase 5: Branching ---
  static async getBranches(tripId: string, userId?: string): Promise<Branch[]> {
    const res = await fetch(`${API_BASE_URL}/api/trips/${tripId}/branches`, {
      headers: this.getHeaders(userId),
    });
    if (!res.ok) throw new Error('Failed to fetch branches');
    return res.json();
  }

  static async getBranchDetail(tripId: string, branchId: string, userId?: string): Promise<Branch> {
    const res = await fetch(`${API_BASE_URL}/api/trips/${tripId}/branches/${branchId}`, {
      headers: this.getHeaders(userId),
    });
    if (!res.ok) throw new Error('Failed to fetch branch detail');
    return res.json();
  }

  static async createBranch(
    tripId: string,
    data: {
      title: string;
      proposal_id?: string;
      parent_branch_id?: string;
      member_user_ids?: string[];
      preview_deadline?: string;
    },
    userId?: string
  ): Promise<Branch> {
    const res = await fetch(`${API_BASE_URL}/api/trips/${tripId}/branches`, {
      method: 'POST',
      headers: this.getHeaders(userId),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to create branch');
    }
    return res.json();
  }

  static async updateBranchMemberStatus(
    tripId: string,
    branchId: string,
    status: 'confirmed' | 'modification_requested',
    userId?: string
  ): Promise<Branch> {
    const res = await fetch(`${API_BASE_URL}/api/trips/${tripId}/branches/${branchId}/member-status`, {
      method: 'PATCH',
      headers: this.getHeaders(userId),
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update member status');
    }
    return res.json();
  }

  static async finalizeBranch(tripId: string, branchId: string, userId?: string): Promise<Branch> {
    const res = await fetch(`${API_BASE_URL}/api/trips/${tripId}/branches/${branchId}/finalize`, {
      method: 'POST',
      headers: this.getHeaders(userId),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to finalize branch');
    }
    return res.json();
  }

  static async generateBranchRevision(
    tripId: string,
    branchId: string,
    userId?: string
  ): Promise<BranchRevision> {
    const res = await fetch(`${API_BASE_URL}/api/trips/${tripId}/branches/${branchId}/revision`, {
      method: 'POST',
      headers: this.getHeaders(userId),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to generate branch revision');
    }
    return res.json();
  }

  // --- Phase 5: Mandatory Trip Chat ---
  static async getChatMessages(tripId: string, userId?: string): Promise<ChatMessage[]> {
    const res = await fetch(`${API_BASE_URL}/api/trips/${tripId}/chat`, {
      headers: this.getHeaders(userId),
    });
    if (!res.ok) throw new Error('Failed to fetch chat messages');
    return res.json();
  }

  static async sendChatMessage(
    tripId: string,
    data: { body: string; is_unanimous_override?: boolean },
    userId?: string
  ): Promise<ChatMessage> {
    const res = await fetch(`${API_BASE_URL}/api/trips/${tripId}/chat`, {
      method: 'POST',
      headers: this.getHeaders(userId),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to send chat message');
    }
    return res.json();
  }

  // --- Phase 6: Matching ---
  static async getGroupMatches(limit = 15, userId?: string): Promise<GroupMatch[]> {
    const res = await fetch(`${API_BASE_URL}/api/matching/groups?limit=${limit}`, {
      headers: this.getHeaders(userId),
    });
    if (!res.ok) throw new Error('Failed to fetch group matches');
    return res.json();
  }

  static async getGuideMatches(
    params?: { city_id?: string; language?: string; specialisation?: string; max_price?: number; limit?: number },
    userId?: string
  ): Promise<GuideMatch[]> {
    const q = new URLSearchParams();
    if (params?.city_id) q.set('city_id', params.city_id);
    if (params?.language) q.set('language', params.language);
    if (params?.specialisation) q.set('specialisation', params.specialisation);
    if (params?.max_price) q.set('max_price', String(params.max_price));
    if (params?.limit) q.set('limit', String(params.limit));

    const res = await fetch(`${API_BASE_URL}/api/matching/guides?${q.toString()}`, {
      headers: this.getHeaders(userId),
    });
    if (!res.ok) throw new Error('Failed to fetch guide matches');
    return res.json();
  }

  // --- Phase 6: Face Registration ---
  static async registerFace(
    data: { photo_straight: string; photo_left: string; photo_right: string },
    userId?: string
  ): Promise<FaceProfile> {
    const res = await fetch(`${API_BASE_URL}/api/face/register`, {
      method: 'POST',
      headers: this.getHeaders(userId),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Face registration failed');
    }
    return res.json();
  }

  static async getFaceProfile(userId?: string): Promise<FaceProfile | null> {
    const res = await fetch(`${API_BASE_URL}/api/face/profile`, {
      headers: this.getHeaders(userId),
    });
    if (!res.ok) return null;
    return res.json();
  }

  // --- Phase 6: Photos ---
  static async uploadTripPhoto(
    tripId: string,
    data: { image_data: string; caption?: string },
    userId?: string
  ): Promise<Photo> {
    const res = await fetch(`${API_BASE_URL}/api/trips/${tripId}/photos`, {
      method: 'POST',
      headers: this.getHeaders(userId),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to upload photo');
    }
    return res.json();
  }

  static async getTripPhotos(tripId: string, userId?: string): Promise<Photo[]> {
    const res = await fetch(`${API_BASE_URL}/api/trips/${tripId}/photos`, {
      headers: this.getHeaders(userId),
    });
    if (!res.ok) throw new Error('Failed to fetch trip photos');
    return res.json();
  }

  static async getMyPhotos(tripId?: string, userId?: string): Promise<Photo[]> {
    const url = tripId
      ? `${API_BASE_URL}/api/photos/my?trip_id=${tripId}`
      : `${API_BASE_URL}/api/photos/my`;
    const res = await fetch(url, {
      headers: this.getHeaders(userId),
    });
    if (!res.ok) throw new Error('Failed to fetch personal photos');
    return res.json();
  }

  static async confirmPhotoTag(
    photoId: string,
    tagId: string,
    isConfirmed = true,
    userId?: string
  ): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/photos/${photoId}/tags/${tagId}/confirm`, {
      method: 'PATCH',
      headers: this.getHeaders(userId),
      body: JSON.stringify({ is_confirmed: isConfirmed }),
    });
    if (!res.ok) throw new Error('Failed to confirm photo tag');
    return res.json();
  }
}

