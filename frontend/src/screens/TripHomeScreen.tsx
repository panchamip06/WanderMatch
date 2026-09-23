import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { Trip, ItineraryItem } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { ApiService } from '../services/api';
import { useAuth } from '../services/auth';
import { TripWebSocketClient } from '../services/websocket';
import {
  Calendar, MapPin, Users, Lock, ChevronRight, Sparkles,
  Plus, Crown, CheckCircle, ArrowLeft, Copy, Check, MessageSquare, GitBranch, Camera
} from 'lucide-react';

interface TripHomeScreenProps {
  // Optional props for backwards compatibility
  trips?: Trip[];
  selectedTrip?: Trip | null;
  onSelectTrip?: (t: Trip) => void;
  onOpenSlot?: (item: ItineraryItem) => void;
  onRefreshTrip?: () => void;
  onOpenCreateTrip?: () => void;
}

export const TripHomeScreen: React.FC<TripHomeScreenProps> = ({
  selectedTrip: propTrip,
  onRefreshTrip: propRefresh,
}) => {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { userId, token } = useAuth();

  const [trip, setTrip] = useState<Trip | null>(propTrip || null);
  const [loading, setLoading] = useState<boolean>(!propTrip);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const [showAddSlotDay, setShowAddSlotDay] = useState<number | null>(null);
  const [slotTitle, setSlotTitle] = useState('');
  const [slotType, setSlotType] = useState('activity');
  const [slotStartsAt, setSlotStartsAt] = useState('10:00');
  const [slotCost, setSlotCost] = useState('200.00');
  const [slotDuration, setSlotDuration] = useState(90);
  const [slotExplanation, setSlotExplanation] = useState('');
  const [addingSlot, setAddingSlot] = useState(false);

  const effectiveTripId = tripId || propTrip?.trip_id;

  const loadTrip = useCallback(async () => {
    if (!effectiveTripId) return;
    try {
      const fetched = await ApiService.getTripDetail(effectiveTripId, token || undefined);
      setTrip(fetched);
      if (propRefresh) propRefresh();
    } catch (e: any) {
      console.error('Failed to load trip detail:', e);
      setError(e.message || 'Trip not found');
    } finally {
      setLoading(false);
    }
  }, [effectiveTripId, token, propRefresh]);

  useEffect(() => {
    loadTrip();
  }, [loadTrip]);

  // Real-time WebSocket connection to this trip
  useEffect(() => {
    if (!effectiveTripId) return;

    const wsClient = new TripWebSocketClient(effectiveTripId, userId || 'anon');
    wsClient.connect();

    const unsubscribe = wsClient.subscribe((msg: any) => {
      console.log('[TripHomeScreen] Live event received:', msg);
      if (msg.type === 'itinerary_updated' || msg.type === 'member_joined' || msg.type === 'proposal_resolved') {
        loadTrip();
      }
    });

    return () => {
      unsubscribe();
      wsClient.disconnect();
    };
  }, [effectiveTripId, userId, loadTrip]);

  const handleCopyTripId = () => {
    if (!effectiveTripId) return;
    navigator.clipboard.writeText(effectiveTripId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddSlot = async (dayIndex: number) => {
    if (!slotTitle.trim() || !trip) return;
    setAddingSlot(true);
    try {
      await ApiService.addItineraryItem(
        trip.trip_id,
        {
          day_index: dayIndex,
          title: slotTitle.trim(),
          item_type: slotType,
          starts_at: slotStartsAt,
          cost: slotCost,
          duration_minutes: slotDuration,
          explanation: slotExplanation,
          source: 'user',
        },
        token || undefined
      );
      setSlotTitle('');
      setSlotExplanation('');
      setShowAddSlotDay(null);
      await loadTrip();
    } catch (e: any) {
      alert(`Failed to add slot: ${e.message}`);
    } finally {
      setAddingSlot(false);
    }
  };

  const handleConfirmSlot = async (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!trip) return;
    try {
      await ApiService.updateItineraryItem(
        trip.trip_id,
        itemId,
        { status: 'confirmed' },
        token || undefined
      );
      await loadTrip();
    } catch (e: any) {
      alert(`Failed to confirm slot: ${e.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 text-gray-500 space-y-3">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold">Loading trip itinerary from database...</p>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="text-center py-16 bg-white rounded-3xl border border-gray-200 max-w-lg mx-auto p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Trip Not Found</h2>
        <p className="text-sm text-gray-500 mb-6">
          {error || 'This trip does not exist or you do not have permission to view it.'}
        </p>
        <Link
          to="/app"
          className="inline-flex items-center px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to My Trips
        </Link>
      </div>
    );
  }

  const activeItn = trip.active_itinerary;
  const items = activeItn?.items || [];
  const isModeA = trip.trip_mode === 'admin_led';
  const isOwner = trip.owner_user_id === userId;

  // Group items by day_index
  const days = items.reduce((acc, item) => {
    acc[item.day_index] = acc[item.day_index] || [];
    acc[item.day_index].push(item);
    return acc;
  }, {} as Record<number, ItineraryItem[]>);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/app"
          className="inline-flex items-center text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to My Trips
        </Link>

        {/* Share Trip ID */}
        <button
          onClick={handleCopyTripId}
          className="inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 mr-1 text-green-600" />
              <span>Copied Trip ID!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 mr-1 text-gray-500" />
              <span>Copy ID: {trip.trip_id}</span>
            </>
          )}
        </button>
      </div>

      {/* Trip Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{trip.title}</h1>
              <span className="text-xs bg-indigo-100 text-indigo-800 font-semibold px-2.5 py-0.5 rounded-full">
                v{activeItn?.version || 1}
              </span>

              {/* Trip Mode Badge */}
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center border ${
                  isModeA
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}
              >
                {isModeA ? (
                  <>
                    <Crown className="w-3.5 h-3.5 mr-1 text-indigo-600" /> Mode A (Admin-Led)
                  </>
                ) : (
                  <>
                    <Users className="w-3.5 h-3.5 mr-1 text-blue-600" /> Mode NA (Collaborative)
                  </>
                )}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
              <span className="flex items-center">
                <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                Destination: {trip.destination_city_id}
              </span>
              <span className="flex items-center">
                <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                {trip.start_date} to {trip.end_date}
              </span>
              <span className="flex items-center">
                <Users className="w-4 h-4 mr-1 text-gray-400" />
                Members: {trip.members?.length || 1} ({isOwner ? 'You are Admin' : 'Member'})
              </span>
            </div>
          </div>

          {/* Quick Hub Navigation */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 md:pt-0">
            <Link
              to={`/trips/${trip.trip_id}/chat`}
              className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors shadow-2xs"
            >
              <MessageSquare className="w-4 h-4 mr-1.5 text-purple-600" />
              Trip Chat
            </Link>
            <Link
              to={`/trips/${trip.trip_id}/branches`}
              className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors shadow-2xs"
            >
              <GitBranch className="w-4 h-4 mr-1.5 text-amber-600" />
              Branches
            </Link>
            <Link
              to={`/trips/${trip.trip_id}/photos`}
              className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-bold bg-pink-50 text-pink-700 hover:bg-pink-100 border border-pink-200 transition-colors shadow-2xs"
            >
              <Camera className="w-4 h-4 mr-1.5 text-pink-600" />
              Photos
            </Link>
          </div>
        </div>
      </div>

      {/* Member Roster Card (Database-backed) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-gray-700">Trip Members:</span>
          <div className="flex flex-wrap gap-2">
            {trip.members && trip.members.length > 0 ? (
              trip.members.map((m) => (
                <span
                  key={m.member_id}
                  className={`px-2.5 py-1 rounded-lg font-medium border flex items-center space-x-1.5 ${
                    m.role === 'owner'
                      ? 'bg-indigo-50 text-indigo-800 border-indigo-200 font-bold'
                      : 'bg-gray-50 text-gray-700 border-gray-200'
                  }`}
                >
                  <span>{m.user_id}</span>
                  <span className="text-[10px] text-gray-400">({m.role})</span>
                </span>
              ))
            ) : (
              <span className="text-gray-400">No members loaded</span>
            )}
          </div>
        </div>

        <div className="text-gray-400 text-[11px]">
          Share weights: 1.000 (PS-11 largest-remainder split ready)
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200">
          <span className="text-xs text-gray-500 font-medium">Estimated Total Cost</span>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {activeItn?.currency || trip.home_currency} {activeItn?.total_cost || '0.00'}
          </p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200">
          <span className="text-xs text-gray-500 font-medium">Carbon Footprint</span>
          <p className="text-xl font-bold text-emerald-700 mt-1">
            {activeItn?.total_carbon_kg || 0} kg CO₂
          </p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200">
          <span className="text-xs text-gray-500 font-medium">Itinerary Generator</span>
          <div className="flex items-center mt-1">
            <Sparkles className="w-4 h-4 text-purple-600 mr-1.5" />
            <p className="text-sm font-semibold text-purple-900 capitalize">
              {activeItn?.generated_by || 'user'}
            </p>
          </div>
        </div>
      </div>

      {/* Day by Day Slots */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Day-by-Day Shared Itinerary</h2>
          <button
            onClick={() => setShowAddSlotDay(1)}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Activity Slot
          </button>
        </div>

        {/* Add Slot Drawer */}
        {showAddSlotDay !== null && (
          <div className="bg-blue-50/70 rounded-2xl border border-blue-200 p-5 space-y-4 shadow-sm">
            <div className="flex justify-between items-center">
              <span className="font-bold text-sm text-blue-900">
                Add Activity Slot for Day {showAddSlotDay}
              </span>
              <button
                onClick={() => setShowAddSlotDay(null)}
                className="text-xs text-gray-500 hover:text-gray-700 font-semibold"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-gray-700">Activity Title</label>
                <input
                  type="text"
                  placeholder="e.g. Visit Daulatabad Fort & Caves"
                  value={slotTitle}
                  onChange={(e) => setSlotTitle(e.target.value)}
                  className="mt-1 w-full text-xs bg-white border border-gray-300 rounded-xl px-3.5 py-2.5"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700">Day Index</label>
                <input
                  type="number"
                  min={1}
                  max={14}
                  value={showAddSlotDay}
                  onChange={(e) => setShowAddSlotDay(parseInt(e.target.value) || 1)}
                  className="mt-1 w-full text-xs bg-white border border-gray-300 rounded-xl px-3.5 py-2.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700">Type</label>
                <select
                  value={slotType}
                  onChange={(e) => setSlotType(e.target.value)}
                  className="mt-1 w-full text-xs bg-white border border-gray-300 rounded-xl px-3 py-2"
                >
                  <option value="activity">Activity</option>
                  <option value="meal">Meal / Dining</option>
                  <option value="transport">Transport</option>
                  <option value="lodging">Lodging</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700">Start Time</label>
                <input
                  type="text"
                  placeholder="10:00"
                  value={slotStartsAt}
                  onChange={(e) => setSlotStartsAt(e.target.value)}
                  className="mt-1 w-full text-xs bg-white border border-gray-300 rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700">Cost ({trip.home_currency})</label>
                <input
                  type="text"
                  value={slotCost}
                  onChange={(e) => setSlotCost(e.target.value)}
                  className="mt-1 w-full text-xs bg-white border border-gray-300 rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700">Duration (m)</label>
                <input
                  type="number"
                  value={slotDuration}
                  onChange={(e) => setSlotDuration(parseInt(e.target.value) || 60)}
                  className="mt-1 w-full text-xs bg-white border border-gray-300 rounded-xl px-3 py-2"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-700">Notes / Explanation</label>
              <input
                type="text"
                placeholder="Why should we include this activity?"
                value={slotExplanation}
                onChange={(e) => setSlotExplanation(e.target.value)}
                className="mt-1 w-full text-xs bg-white border border-gray-300 rounded-xl px-3.5 py-2.5"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowAddSlotDay(null)}
                className="px-3.5 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAddSlot(showAddSlotDay)}
                disabled={addingSlot || !slotTitle.trim()}
                className="px-4 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-50 shadow-sm"
              >
                {addingSlot ? 'Adding...' : 'Add Slot'}
              </button>
            </div>
          </div>
        )}

        {/* Render Days */}
        {Object.keys(days).length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-gray-200 text-center text-gray-500">
            <p className="text-base font-semibold mb-2">No activity slots in this itinerary yet.</p>
            <p className="text-xs text-gray-400 mb-4">Click "Add Activity Slot" above to propose your first activity for Day 1.</p>
          </div>
        ) : (
          Object.entries(days).map(([dayIdx, dayItems]) => (
            <div key={dayIdx} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
              <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex justify-between items-center">
                <span className="font-bold text-gray-800 text-sm">Day {dayIdx}</span>
                <button
                  onClick={() => setShowAddSlotDay(parseInt(dayIdx))}
                  className="text-xs font-bold text-blue-600 hover:underline flex items-center"
                >
                  <Plus className="w-3 h-3 mr-1" /> Add to Day {dayIdx}
                </button>
              </div>

              <div className="divide-y divide-gray-100">
                {dayItems.map((item) => (
                  <div
                    key={item.item_id}
                    onClick={() => navigate(`/trips/${trip.trip_id}/slots/${item.item_id}`)}
                    className="p-5 hover:bg-blue-50/40 transition-colors cursor-pointer flex items-center justify-between group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-gray-900 text-sm group-hover:text-blue-600 transition-colors">
                          {item.title}
                        </span>
                        <StatusBadge status={item.status} />
                        {item.locked && (
                          <span title="Locked constraint" className="text-amber-600 flex items-center text-xs">
                            <Lock className="w-3 h-3 ml-1" />
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        Type: <span className="capitalize">{item.item_type}</span> · Cost: {item.currency} {item.cost} · Duration: {item.duration_minutes}m
                      </p>
                      {item.explanation && (
                        <p className="text-xs text-gray-400 italic">"{item.explanation}"</p>
                      )}
                    </div>

                    <div className="flex items-center space-x-3">
                      {item.status !== 'confirmed' && (isModeA ? isOwner : true) && (
                        <button
                          onClick={(e) => handleConfirmSlot(item.item_id, e)}
                          title="Confirm this slot"
                          className="px-3 py-1.5 text-xs rounded-xl font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 flex items-center border border-emerald-200 transition-colors"
                        >
                          <CheckCircle className="w-3.5 h-3.5 mr-1" />
                          Confirm
                        </button>
                      )}

                      <span className="text-xs font-bold text-blue-600 group-hover:underline">
                        View Debate
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
