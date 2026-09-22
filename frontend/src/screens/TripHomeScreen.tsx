import React, { useState } from 'react';
import type { Trip, ItineraryItem } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { ApiService } from '../services/api';
import { useAuth } from '../services/auth';
import { Calendar, MapPin, Users, Lock, ChevronRight, Sparkles, Plus, Crown, CheckCircle } from 'lucide-react';

interface TripHomeScreenProps {
  trips: Trip[];
  selectedTrip: Trip | null;
  onSelectTrip: (t: Trip) => void;
  onOpenSlot: (item: ItineraryItem) => void;
  onRefreshTrip: () => void;
  onOpenCreateTrip: () => void;
}

export const TripHomeScreen: React.FC<TripHomeScreenProps> = ({
  trips,
  selectedTrip,
  onSelectTrip,
  onOpenSlot,
  onRefreshTrip,
  onOpenCreateTrip,
}) => {
  const { userId } = useAuth();
  const [showAddSlotDay, setShowAddSlotDay] = useState<number | null>(null);
  const [slotTitle, setSlotTitle] = useState('');
  const [slotType, setSlotType] = useState('activity');
  const [slotStartsAt, setSlotStartsAt] = useState('10:00');
  const [slotCost, setSlotCost] = useState('200.00');
  const [slotDuration, setSlotDuration] = useState(90);
  const [slotExplanation, setSlotExplanation] = useState('');
  const [addingSlot, setAddingSlot] = useState(false);

  if (!selectedTrip) {
    return (
      <div className="flex justify-center items-center h-64 text-gray-500">
        Loading seeded group trips...
      </div>
    );
  }

  const activeItn = selectedTrip.active_itinerary;
  const items = activeItn?.items || [];
  const isModeA = selectedTrip.trip_mode === 'admin_led';
  const isOwner = selectedTrip.owner_user_id === userId;

  // Group items by day_index
  const days = items.reduce((acc, item) => {
    acc[item.day_index] = acc[item.day_index] || [];
    acc[item.day_index].push(item);
    return acc;
  }, {} as Record<number, ItineraryItem[]>);

  const handleAddSlot = async (dayIndex: number) => {
    if (!slotTitle.trim()) return;
    setAddingSlot(true);
    try {
      await ApiService.addItineraryItem(
        selectedTrip.trip_id,
        {
          day_index: dayIndex,
          title: slotTitle,
          item_type: slotType,
          starts_at: slotStartsAt,
          cost: slotCost,
          duration_minutes: slotDuration,
          explanation: slotExplanation,
          source: 'user',
        },
        userId
      );
      setSlotTitle('');
      setSlotExplanation('');
      setShowAddSlotDay(null);
      onRefreshTrip();
    } catch (e: any) {
      alert(`Failed to add slot: ${e.message}`);
    } finally {
      setAddingSlot(false);
    }
  };

  const handleConfirmSlot = async (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await ApiService.updateItineraryItem(
        selectedTrip.trip_id,
        itemId,
        { status: 'confirmed' },
        userId
      );
      onRefreshTrip();
    } catch (e: any) {
      alert(`Failed to confirm slot: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Trip Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{selectedTrip.title}</h1>
              <span className="text-xs bg-indigo-100 text-indigo-800 font-semibold px-2 py-0.5 rounded">
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

            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
              <span className="flex items-center">
                <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                Destination: {selectedTrip.destination_city_id}
              </span>
              <span className="flex items-center">
                <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                {selectedTrip.start_date} to {selectedTrip.end_date}
              </span>
              <span className="flex items-center">
                <Users className="w-4 h-4 mr-1 text-gray-400" />
                Members: {selectedTrip.members?.length || 1} ({isOwner ? 'You are Admin' : 'Member'})
              </span>
            </div>
          </div>

          {/* Action & Switcher Controls */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onOpenCreateTrip}
              className="flex items-center text-xs font-semibold px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              New / Join Trip
            </button>

            <select
              value={selectedTrip.trip_id}
              onChange={(e) => {
                const found = trips.find((t) => t.trip_id === e.target.value);
                if (found) onSelectTrip(found);
              }}
              className="text-xs bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-2 font-medium text-gray-800"
            >
              {trips.map((t) => (
                <option key={t.trip_id} value={t.trip_id}>
                  {t.title} ({t.trip_mode === 'admin_led' ? 'Mode A' : 'Mode NA'})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Member Roster Card */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-gray-700">Trip Members:</span>
          <div className="flex flex-wrap gap-1.5">
            {selectedTrip.members?.map((m) => (
              <span
                key={m.member_id}
                className={`px-2 py-0.5 rounded-md font-medium border ${
                  m.role === 'owner'
                    ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                    : 'bg-gray-50 text-gray-700 border-gray-200'
                }`}
              >
                {m.user_id} ({m.role})
              </span>
            ))}
          </div>
        </div>

        <div className="text-gray-400 text-[11px]">
          Share weights: 1.000 (Largest-remainder split ready)
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <span className="text-xs text-gray-500 font-medium">Estimated Total Cost</span>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {activeItn?.currency || selectedTrip.home_currency} {activeItn?.total_cost || '0.00'}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <span className="text-xs text-gray-500 font-medium">Carbon Footprint</span>
          <p className="text-xl font-bold text-emerald-700 mt-1">
            {activeItn?.total_carbon_kg || 0} kg CO₂
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
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
          <h2 className="text-lg font-bold text-gray-900">Day-by-Day Shared Itinerary</h2>
          <button
            onClick={() => setShowAddSlotDay(1)}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Activity Slot
          </button>
        </div>

        {/* Add Slot Drawer */}
        {showAddSlotDay !== null && (
          <div className="bg-blue-50/60 rounded-xl border border-blue-200 p-5 space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-bold text-sm text-blue-900">
                Add Activity Slot for Day {showAddSlotDay}
              </span>
              <button
                onClick={() => setShowAddSlotDay(null)}
                className="text-xs text-gray-400 hover:text-gray-600"
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
                  className="mt-1 w-full text-xs bg-white border border-gray-300 rounded-lg px-3 py-2"
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
                  className="mt-1 w-full text-xs bg-white border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700">Type</label>
                <select
                  value={slotType}
                  onChange={(e) => setSlotType(e.target.value)}
                  className="mt-1 w-full text-xs bg-white border border-gray-300 rounded-lg px-3 py-2"
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
                  className="mt-1 w-full text-xs bg-white border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700">Cost ({selectedTrip.home_currency})</label>
                <input
                  type="text"
                  value={slotCost}
                  onChange={(e) => setSlotCost(e.target.value)}
                  className="mt-1 w-full text-xs bg-white border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700">Duration (m)</label>
                <input
                  type="number"
                  value={slotDuration}
                  onChange={(e) => setSlotDuration(parseInt(e.target.value) || 60)}
                  className="mt-1 w-full text-xs bg-white border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-700">Notes / Explanation</label>
              <input
                type="text"
                placeholder="Why should we include this?"
                value={slotExplanation}
                onChange={(e) => setSlotExplanation(e.target.value)}
                className="mt-1 w-full text-xs bg-white border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowAddSlotDay(null)}
                className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAddSlot(showAddSlotDay)}
                disabled={addingSlot || !slotTitle.trim()}
                className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
              >
                {addingSlot ? 'Adding...' : 'Add Slot'}
              </button>
            </div>
          </div>
        )}

        {Object.keys(days).length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-gray-500">
            No slot items in this itinerary yet. Click "Add Activity Slot" above to propose your first activity!
          </div>
        ) : (
          Object.entries(days).map(([dayIdx, dayItems]) => (
            <div key={dayIdx} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
              <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex justify-between items-center">
                <span className="font-bold text-gray-800 text-sm">Day {dayIdx}</span>
                <button
                  onClick={() => setShowAddSlotDay(parseInt(dayIdx))}
                  className="text-xs font-semibold text-blue-600 hover:underline flex items-center"
                >
                  <Plus className="w-3 h-3 mr-1" /> Add to Day {dayIdx}
                </button>
              </div>

              <div className="divide-y divide-gray-100">
                {dayItems.map((item) => (
                  <div
                    key={item.item_id}
                    onClick={() => onOpenSlot(item)}
                    className="p-4 hover:bg-blue-50/40 transition-colors cursor-pointer flex items-center justify-between group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-gray-900 text-sm">{item.title}</span>
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
                          className="px-2.5 py-1 text-xs rounded-md font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 flex items-center border border-emerald-200"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Confirm
                        </button>
                      )}

                      <span className="text-xs font-medium text-blue-600 group-hover:underline">
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
