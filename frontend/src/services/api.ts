import type { Trip, Proposal, Vote, User, ItineraryItem } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export class ApiService {
  private static getHeaders(userId?: string): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (userId) {
      headers['Authorization'] = `Bearer mock:${userId}`;
    }
    return headers;
  }

  static async checkHealth(): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
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
  static async getTrips(isGroup = true): Promise<Trip[]> {
    const res = await fetch(`${API_BASE_URL}/api/trips?is_group=${isGroup}&limit=30`);
    if (!res.ok) throw new Error(`Failed to fetch trips: ${res.statusText}`);
    return res.json();
  }

  static async getTripDetail(tripId: string): Promise<Trip> {
    const res = await fetch(`${API_BASE_URL}/api/trips/${tripId}`);
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
}

