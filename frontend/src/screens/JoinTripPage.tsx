import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ApiService } from '../services/api';
import { useAuth } from '../services/auth';
import type { Trip } from '../types';
import { Users, ArrowLeft, ArrowRight, AlertCircle, Calendar, MapPin } from 'lucide-react';

export const JoinTripPage: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useAuth();

  const [tripIdInput, setTripIdInput] = useState('');
  const [discoverTrips, setDiscoverTrips] = useState<Trip[]>([]);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ApiService.getDiscoverTrips(token || undefined)
      .then((t) => setDiscoverTrips(t))
      .catch((e) => console.error('Failed to load discoverable trips:', e));
  }, [token]);

  const handleJoinTrip = async (id: string) => {
    if (!id.trim()) {
      setError('Please provide a valid Trip ID.');
      return;
    }
    setError(null);
    setJoiningId(id);

    try {
      await ApiService.joinTrip(id.trim(), 'editor', token || undefined);
      navigate(`/trips/${id.trim()}`);
    } catch (err: any) {
      setError(err.message || 'Failed to join trip. Please check the Trip ID.');
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-4 space-y-8">
      <Link
        to="/app"
        className="inline-flex items-center text-xs font-bold text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4 mr-1.5" />
        Back to My Trips
      </Link>

      {/* Direct Trip ID Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xs">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Join a Trip with Code</h1>
            <p className="text-xs text-gray-500">Have a trip ID shared by a friend? Paste it below.</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleJoinTrip(tripIdInput);
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <input
            type="text"
            required
            placeholder="e.g. trp_8c263b46"
            value={tripIdInput}
            onChange={(e) => setTripIdInput(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={joiningId === tripIdInput}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all flex items-center justify-center"
          >
            {joiningId === tripIdInput ? 'Joining...' : 'Join Trip'}
          </button>
        </form>
      </div>

      {/* Discover Open Trips to Join */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3">Or Explore Open Group Trips</h2>
        <div className="space-y-3">
          {discoverTrips.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center text-sm text-gray-500 border border-gray-200">
              No discoverable trips found at the moment.
            </div>
          ) : (
            discoverTrips.slice(0, 10).map((trip) => (
              <div
                key={trip.trip_id}
                className="bg-white rounded-2xl p-5 border border-gray-200 hover:border-blue-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="font-bold text-gray-900 text-base">{trip.title}</h3>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {trip.trip_mode === 'admin_led' ? 'Mode A' : 'Mode NA'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center">
                      <MapPin className="w-3.5 h-3.5 mr-1 text-gray-400" />
                      {trip.destination_city_id}
                    </span>
                    <span className="flex items-center">
                      <Calendar className="w-3.5 h-3.5 mr-1 text-gray-400" />
                      {trip.start_date} to {trip.end_date}
                    </span>
                    <span className="text-gray-400">ID: {trip.trip_id}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleJoinTrip(trip.trip_id)}
                  disabled={joiningId === trip.trip_id}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-gray-100 hover:bg-blue-600 hover:text-white text-gray-700 font-bold text-xs transition-all disabled:opacity-50"
                >
                  {joiningId === trip.trip_id ? 'Joining...' : 'Join Group'}
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
