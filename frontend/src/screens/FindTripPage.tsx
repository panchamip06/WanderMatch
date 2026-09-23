import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ApiService } from '../services/api';
import { useAuth } from '../services/auth';
import type { Trip } from '../types';
import { Search, Sparkles, MapPin, Calendar, Users, ArrowRight, ArrowLeft } from 'lucide-react';

export const FindTripPage: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useAuth();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    ApiService.getDiscoverTrips(token || undefined)
      .then((data) => setTrips(data))
      .catch((e) => console.error('Failed to load trips:', e))
      .finally(() => setLoading(false));
  }, [token]);

  const handleJoin = async (tripId: string) => {
    setJoiningId(tripId);
    try {
      await ApiService.joinTrip(tripId, 'editor', token || undefined);
      navigate(`/trips/${tripId}`);
    } catch (e: any) {
      alert(e.message || 'Failed to join trip');
    } finally {
      setJoiningId(null);
    }
  };

  const filteredTrips = trips.filter((t) =>
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.destination_city_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto py-4 space-y-6">
      <Link
        to="/app"
        className="inline-flex items-center text-xs font-bold text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4 mr-1.5" />
        Back to Dashboard
      </Link>

      {/* Live AI Matching Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-blue-900 flex items-center justify-between gap-4">
        <div className="flex items-start space-x-3">
          <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <span className="font-bold">AI Solo-to-Group & Guide Matching Available</span>
            <p className="mt-0.5 text-blue-800">
              Get personalized compatibility scores and explainable match reasons for group trips and certified guides.
            </p>
          </div>
        </div>
        <Link
          to="/solo-match"
          className="inline-flex items-center px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex-shrink-0 shadow-xs transition-colors"
        >
          Explore Matches
          <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Link>
      </div>

      {/* Search Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Find Open Trips</h1>
          <p className="text-xs text-gray-500">Discover group trips looking for fellow travellers</p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search by title or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Trips List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse border border-gray-200" />
          ))}
        </div>
      ) : filteredTrips.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 text-gray-500 text-sm">
          No matching open trips found.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTrips.map((trip) => (
            <div
              key={trip.trip_id}
              className="bg-white rounded-2xl p-5 border border-gray-200 hover:border-blue-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="font-bold text-gray-900 text-base">{trip.title}</h3>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    {trip.trip_mode === 'admin_led' ? 'Mode A (Admin-Led)' : 'Mode NA (Collaborative)'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center">
                    <MapPin className="w-3.5 h-3.5 mr-1 text-gray-400" />
                    {trip.destination_city_id}
                  </span>
                  <span className="flex items-center">
                    <Calendar className="w-3.5 h-3.5 mr-1 text-gray-400" />
                    {trip.start_date} to {trip.end_date}
                  </span>
                  <span className="flex items-center">
                    <Users className="w-3.5 h-3.5 mr-1 text-gray-400" />
                    Party Size: {trip.party_size}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleJoin(trip.trip_id)}
                disabled={joiningId === trip.trip_id}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm shadow-blue-500/20 transition-all disabled:opacity-50"
              >
                {joiningId === trip.trip_id ? 'Joining...' : 'Join Trip'}
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
