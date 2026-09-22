import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ApiService } from '../services/api';
import { useAuth } from '../services/auth';
import { Crown, Users, ArrowLeft, Plus, AlertCircle } from 'lucide-react';

export const CreateTripPage: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useAuth();

  const [title, setTitle] = useState('');
  const [destinationCityId, setDestinationCityId] = useState('cty_c07454f1');
  const [startDate, setStartDate] = useState('2026-11-01');
  const [endDate, setEndDate] = useState('2026-11-07');
  const [partySize, setPartySize] = useState(4);
  const [tripMode, setTripMode] = useState<'admin_led' | 'no_admin'>('no_admin');
  const [notes, setNotes] = useState('');

  const [cities, setCities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ApiService.getCities()
      .then((c) => {
        setCities(c);
        if (c.length > 0) setDestinationCityId(c[0].city_id);
      })
      .catch((e) => console.error('Failed to load cities:', e));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a trip title.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const payload = {
        title: title.trim(),
        destination_city_id: destinationCityId,
        start_date: startDate,
        end_date: endDate,
        party_size: Number(partySize),
        adults: Number(partySize),
        children: 0,
        trip_type: 'friends',
        is_group_trip: true,
        trip_mode: tripMode,
        home_currency: 'INR',
        notes: notes.trim(),
      };

      const newTrip = await ApiService.createTrip(payload, token || undefined);
      // Directly navigate to dedicated Trip Home route
      navigate(`/trips/${newTrip.trip_id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create trip');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-4">
      <Link
        to="/app"
        className="inline-flex items-center text-xs font-bold text-gray-500 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-1.5" />
        Back to My Trips
      </Link>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xs">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
            <Plus className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Create a New Trip</h1>
            <p className="text-xs text-gray-500">Plan a collaborative journey with friends</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Trip Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
              Trip Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Kerala Backwaters & Spice Trail"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Destination City */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
              Destination City
            </label>
            <select
              value={destinationCityId}
              onChange={(e) => setDestinationCityId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {cities.map((c) => (
                <option key={c.city_id} value={c.city_id}>
                  {c.name}, {c.country_iso2} ({c.city_id})
                </option>
              ))}
            </select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Party Size */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
              Party Size (Travellers)
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={partySize}
              onChange={(e) => setPartySize(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Trip Mode Selection (Mode A vs Mode NA) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
              Trip Governance Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => setTripMode('admin_led')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  tripMode === 'admin_led'
                    ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2 text-indigo-700 font-bold text-sm mb-1">
                  <Crown className="w-4 h-4" />
                  <span>Mode A (Admin-Led)</span>
                </div>
                <p className="text-xs text-gray-500">
                  You are the designated trip owner. You make final decisions and directly resolve proposed changes.
                </p>
              </div>

              <div
                onClick={() => setTripMode('no_admin')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  tripMode === 'no_admin'
                    ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2 text-blue-700 font-bold text-sm mb-1">
                  <Users className="w-4 h-4" />
                  <span>Mode NA (Collaborative)</span>
                </div>
                <p className="text-xs text-gray-500">
                  Full democratic consensus. Any member votes, with 10-minute response-windows on typed objections.
                </p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
              Notes & Preferences
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Focus on eco-friendly homestays and photography spots"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all flex items-center justify-center"
          >
            {loading ? 'Creating Trip in Database...' : 'Create Trip & Open Itinerary'}
          </button>
        </form>
      </div>
    </div>
  );
};
