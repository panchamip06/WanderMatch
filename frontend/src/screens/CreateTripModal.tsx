import React, { useState, useEffect } from 'react';
import { useAuth } from '../services/auth';
import { ApiService } from '../services/api';
import type { Trip } from '../types';
import { X, PlusCircle, LogIn, Crown, Users, Check, AlertCircle } from 'lucide-react';

interface CreateTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTripCreatedOrJoined: (trip: Trip) => void;
  availableTrips: Trip[];
}

export const CreateTripModal: React.FC<CreateTripModalProps> = ({
  isOpen,
  onClose,
  onTripCreatedOrJoined,
  availableTrips,
}) => {
  const { userId } = useAuth();
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [cities, setCities] = useState<any[]>([]);

  // Create Form State
  const [title, setTitle] = useState('');
  const [destinationCityId, setDestinationCityId] = useState('');
  const [startDate, setStartDate] = useState('2026-11-10');
  const [endDate, setEndDate] = useState('2026-11-15');
  const [partySize, setPartySize] = useState(3);
  const [tripMode, setTripMode] = useState<'admin_led' | 'no_admin'>('no_admin');
  const [notes, setNotes] = useState('');

  // Join Form State
  const [selectedJoinTripId, setSelectedJoinTripId] = useState('');
  const [joinRole, setJoinRole] = useState<'editor' | 'viewer'>('editor');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ApiService.getCities()
      .then((c) => {
        setCities(c);
        if (c.length > 0) setDestinationCityId(c[0].city_id);
      })
      .catch((e) => console.log('Cities load:', e));
  }, []);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const newTrip = await ApiService.createTrip(
        {
          title,
          destination_city_id: destinationCityId,
          start_date: startDate,
          end_date: endDate,
          party_size: partySize,
          adults: partySize,
          children: 0,
          trip_mode: tripMode,
          trip_type: 'friends',
          is_group_trip: true,
          notes,
        },
        userId
      );
      onTripCreatedOrJoined(newTrip);
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to create trip');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJoinTripId) return;
    setLoading(true);
    setError(null);
    try {
      await ApiService.joinTrip(selectedJoinTripId, joinRole, userId);
      const joinedTrip = await ApiService.getTripDetail(selectedJoinTripId);
      onTripCreatedOrJoined(joinedTrip);
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to join trip');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xl max-w-xl w-full overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div className="flex space-x-4">
            <button
              onClick={() => setTab('create')}
              className={`text-sm font-bold pb-1 transition-colors flex items-center ${
                tab === 'create'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <PlusCircle className="w-4 h-4 mr-1.5" />
              Create Group Trip
            </button>
            <button
              onClick={() => setTab('join')}
              className={`text-sm font-bold pb-1 transition-colors flex items-center ${
                tab === 'join'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <LogIn className="w-4 h-4 mr-1.5" />
              Join Existing Trip
            </button>
          </div>

          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center">
            <AlertCircle className="w-4 h-4 mr-1.5 shrink-0" />
            {error}
          </div>
        )}

        {/* Tab 1: Create Trip */}
        {tab === 'create' ? (
          <form onSubmit={handleCreate} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <div>
              <label className="block text-xs font-semibold text-gray-700">Trip Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Rajasthan Heritage Expedition"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full text-sm bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700">Destination City (PS-11)</label>
                <select
                  value={destinationCityId}
                  onChange={(e) => setDestinationCityId(e.target.value)}
                  className="mt-1 w-full text-sm bg-gray-50 border border-gray-300 rounded-lg px-3 py-2"
                >
                  {cities.map((c) => (
                    <option key={c.city_id} value={c.city_id}>
                      {c.name} ({c.country_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">Party Size</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={partySize}
                  onChange={(e) => setPartySize(parseInt(e.target.value) || 1)}
                  className="mt-1 w-full text-sm bg-gray-50 border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700">Start Date</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 w-full text-sm bg-gray-50 border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700">End Date</label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1 w-full text-sm bg-gray-50 border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
            </div>

            {/* Trip Mode Selection Cards */}
            <div>
              <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">
                Consensus Mode (Documented Architecture)
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Mode NA Card */}
                <div
                  onClick={() => setTripMode('no_admin')}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    tripMode === 'no_admin'
                      ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-blue-900 flex items-center">
                      <Users className="w-4 h-4 mr-1 text-blue-600" /> Mode NA (No-Admin)
                    </span>
                    {tripMode === 'no_admin' && <Check className="w-4 h-4 text-blue-600" />}
                  </div>
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    Decentralized consensus. First No vote starts a 10-minute AI window. Automatically branches on 3rd unresolved conflict.
                  </p>
                </div>

                {/* Mode A Card */}
                <div
                  onClick={() => setTripMode('admin_led')}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    tripMode === 'admin_led'
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-indigo-900 flex items-center">
                      <Crown className="w-4 h-4 mr-1 text-indigo-600" /> Mode A (Admin-Led)
                    </span>
                    {tripMode === 'admin_led' && <Check className="w-4 h-4 text-indigo-600" />}
                  </div>
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    Trip owner holds final decision authority. AI invocation is triggered manually by admin without auto-timers.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700">Trip Notes / Intent</label>
              <textarea
                rows={2}
                placeholder="Brief notes about preferred pacing, budget, or activities..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 w-full text-xs bg-gray-50 border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Trip & Base Plan'}
              </button>
            </div>
          </form>
        ) : (
          /* Tab 2: Join Trip */
          <form onSubmit={handleJoin} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700">Select Existing Group Trip</label>
              <select
                value={selectedJoinTripId}
                onChange={(e) => setSelectedJoinTripId(e.target.value)}
                className="mt-1 w-full text-sm bg-gray-50 border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="">-- Choose a Trip --</option>
                {availableTrips.map((t) => (
                  <option key={t.trip_id} value={t.trip_id}>
                    {t.title} ({t.trip_id}) — Mode: {t.trip_mode}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700">Join Role</label>
              <select
                value={joinRole}
                onChange={(e: any) => setJoinRole(e.target.value)}
                className="mt-1 w-full text-sm bg-gray-50 border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="editor">Editor (Can propose & vote on slots)</option>
                <option value="viewer">Viewer (Read-only itinerary)</option>
              </select>
            </div>

            <div className="pt-4 flex justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !selectedJoinTripId}
                className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs disabled:opacity-50"
              >
                {loading ? 'Joining...' : 'Join Trip'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
