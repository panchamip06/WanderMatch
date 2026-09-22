import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../services/auth';
import { ApiService } from '../services/api';
import type { Trip } from '../types';
import { Plus, Users, Search, Compass, Calendar, MapPin, ArrowRight, Crown, Sparkles, FolderPlus } from 'lucide-react';

export const DashboardScreen: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, token } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMyTrips = async () => {
    setLoading(true);
    setError(null);
    try {
      const myTrips = await ApiService.getMyTrips(token || undefined);
      setTrips(myTrips);
    } catch (err: any) {
      console.error('Failed to load my trips:', err);
      setError('Could not load your trips. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyTrips();
  }, [token]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/15 text-blue-100 text-xs font-semibold mb-3 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Personalized Travel Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {currentUser?.display_name || 'Traveler'}!
            </h1>
            <p className="mt-2 text-blue-100 text-sm sm:text-base max-w-xl">
              Plan itineraries with friends, participate in consensus voting, and manage your trips with zero friction.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/trips/new"
              className="inline-flex items-center px-4 py-2.5 rounded-xl bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs sm:text-sm shadow-sm transition-all"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Create a Trip
            </Link>
            <Link
              to="/join"
              className="inline-flex items-center px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-semibold text-xs sm:text-sm backdrop-blur-sm transition-all"
            >
              <Users className="w-4 h-4 mr-1.5" />
              Join a Trip
            </Link>
            <Link
              to="/find"
              className="inline-flex items-center px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-semibold text-xs sm:text-sm backdrop-blur-sm transition-all"
            >
              <Search className="w-4 h-4 mr-1.5" />
              Find Trips
            </Link>
          </div>
        </div>
      </div>

      {/* My Trips Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Compass className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">My Trips</h2>
            <span className="text-xs bg-gray-100 text-gray-700 font-bold px-2 py-0.5 rounded-full">
              {trips.length}
            </span>
          </div>

          <button
            onClick={fetchMyTrips}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            Refresh
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-2xl bg-gray-100 animate-pulse border border-gray-200" />
            ))}
          </div>
        ) : trips.length === 0 ? (
          /* Empty State */
          <div className="text-center py-16 px-4 bg-white rounded-3xl border border-dashed border-gray-300">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FolderPlus className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">No trips yet</h3>
            <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
              You haven't created or joined any trips yet. Start planning your next journey with friends or join an open trip.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                to="/trips/new"
                className="inline-flex items-center px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Trip
              </Link>
              <Link
                to="/join"
                className="inline-flex items-center px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm"
              >
                Join Existing Trip
              </Link>
            </div>
          </div>
        ) : (
          /* Trips Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {trips.map((trip) => {
              const isModeA = trip.trip_mode === 'admin_led';
              const isOwner = trip.owner_user_id === currentUser?.user_id;

              return (
                <div
                  key={trip.trip_id}
                  onClick={() => navigate(`/trips/${trip.trip_id}`)}
                  className="bg-white rounded-2xl p-5 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center border ${
                          isModeA
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        {isModeA ? (
                          <>
                            <Crown className="w-3 h-3 mr-1 text-indigo-600" /> Mode A
                          </>
                        ) : (
                          <>
                            <Users className="w-3 h-3 mr-1 text-blue-600" /> Mode NA
                          </>
                        )}
                      </span>
                      <span className="text-xs text-gray-500 font-medium">
                        {isOwner ? 'Creator' : 'Member'}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-gray-900 mb-2 line-clamp-1">
                      {trip.title}
                    </h3>

                    <div className="space-y-1.5 text-xs text-gray-500">
                      <div className="flex items-center">
                        <MapPin className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                        <span>Destination: {trip.destination_city_id}</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                        <span>{trip.start_date} to {trip.end_date}</span>
                      </div>
                      <div className="flex items-center">
                        <Users className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                        <span>Party size: {trip.party_size}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-blue-600">
                    <span>Open Trip Home</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
