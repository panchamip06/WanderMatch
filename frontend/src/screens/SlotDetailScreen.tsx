import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Trip, ItineraryItem, Proposal } from '../types';
import { ApiService } from '../services/api';
import { useAuth } from '../services/auth';
import { TripWebSocketClient } from '../services/websocket';
import { StatusBadge } from '../components/StatusBadge';
import {
  ThumbsUp,
  ThumbsDown,
  MinusCircle,
  AlertCircle,
  PlusCircle,
  CheckCircle2,
  Clock,
  Check,
  X,
  Users,
  AlertTriangle,
  ArrowLeft
} from 'lucide-react';

interface SlotDetailScreenProps {
  trip?: Trip | null;
  selectedItem?: ItineraryItem | null;
  onBack?: () => void;
  liveProposals?: Proposal[];
  onRefreshProposals?: () => void;
}

export const SlotDetailScreen: React.FC<SlotDetailScreenProps> = ({
  trip: propTrip,
  selectedItem: propItem,
  onBack: propBack,
  liveProposals: propProposals,
  onRefreshProposals: propRefreshProposals,
}) => {
  const { tripId, slotId } = useParams<{ tripId: string; slotId: string }>();
  const navigate = useNavigate();
  const { userId, token } = useAuth();

  const effectiveTripId = tripId || propTrip?.trip_id;
  const effectiveSlotId = slotId || propItem?.item_id;

  const [trip, setTrip] = useState<Trip | null>(propTrip || null);
  const [selectedItem, setSelectedItem] = useState<ItineraryItem | null>(propItem || null);
  const [proposals, setProposals] = useState<Proposal[]>(propProposals || []);
  const [loading, setLoading] = useState<boolean>(!propTrip);

  const [noReason, setNoReason] = useState<{ [propId: string]: string }>({});
  const [activeVotingProp, setActiveVotingProp] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [conflictMsg, setConflictMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New proposal form state
  const [showNewProp, setShowNewProp] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newRationale, setNewRationale] = useState('');
  const [newAction, setNewAction] = useState<'replace' | 'add' | 'remove' | 'reschedule'>('replace');

  // Local ticker for live response window countdowns
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadData = useCallback(async () => {
    if (!effectiveTripId) return;
    try {
      const fetchedTrip = await ApiService.getTripDetail(effectiveTripId, token || undefined);
      setTrip(fetchedTrip);

      if (effectiveSlotId && fetchedTrip.active_itinerary?.items) {
        const item = fetchedTrip.active_itinerary.items.find((i) => i.item_id === effectiveSlotId);
        if (item) setSelectedItem(item);
      }

      const fetchedProposals = await ApiService.getProposals(effectiveTripId);
      setProposals(fetchedProposals);
      if (propRefreshProposals) propRefreshProposals();
    } catch (err: any) {
      console.error('Failed to load slot detail data:', err);
      setErrorMsg(err.message || 'Failed to load trip proposals');
    } finally {
      setLoading(false);
    }
  }, [effectiveTripId, effectiveSlotId, token, propRefreshProposals]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time WebSocket connection
  useEffect(() => {
    if (!effectiveTripId) return;

    const wsClient = new TripWebSocketClient(effectiveTripId, userId || 'anon');
    wsClient.connect();

    const unsubscribe = wsClient.subscribe((msg: any) => {
      console.log('[SlotDetail] Received live WebSocket event:', msg);
      if (
        msg.type === 'vote_cast' ||
        msg.type === 'proposal_created' ||
        msg.type === 'proposal_resolved' ||
        msg.type === 'itinerary_updated'
      ) {
        loadData();
      }
    });

    return () => {
      unsubscribe();
      wsClient.disconnect();
    };
  }, [effectiveTripId, userId, loadData]);

  const handleVote = async (propId: string, value: 'yes' | 'no' | 'abstain') => {
    if (!effectiveTripId) return;
    setErrorMsg(null);
    setConflictMsg(null);
    setSuccessMsg(null);

    const reason = noReason[propId] || '';

    if (value === 'no' && !reason.trim()) {
      setErrorMsg('Mandatory typed reason required when voting NO (per WanderMatch consensus rules).');
      setActiveVotingProp(propId);
      return;
    }

    try {
      await ApiService.castVote(effectiveTripId, propId, value, reason, token || undefined);
      setSuccessMsg(`Vote '${value.toUpperCase()}' recorded!`);
      await loadData();
      setNoReason((prev) => ({ ...prev, [propId]: '' }));
      setActiveVotingProp(null);
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to submit vote');
    }
  };

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip || !trip.active_itinerary) return;
    setErrorMsg(null);
    setConflictMsg(null);
    setSuccessMsg(null);

    try {
      await ApiService.createProposal(
        trip.trip_id,
        {
          itinerary_id: trip.active_itinerary.itinerary_id,
          title: newTitle || (newAction === 'remove' ? `Remove ${selectedItem?.title || 'item'}` : 'New Proposal'),
          action: newAction,
          target_item_id: selectedItem?.item_id,
          rationale: newRationale,
        },
        token || undefined
      );
      setSuccessMsg('Proposal submitted and broadcast to trip members!');
      setShowNewProp(false);
      setNewTitle('');
      setNewRationale('');
      await loadData();
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to create proposal');
    }
  };

  const handleResolveProposal = async (proposalId: string, resolution: 'accept' | 'reject') => {
    if (!trip || !trip.active_itinerary) return;
    setErrorMsg(null);
    setConflictMsg(null);
    setSuccessMsg(null);

    const currentVersion = trip.active_itinerary.version;

    try {
      await ApiService.resolveProposal(
        trip.trip_id,
        proposalId,
        resolution,
        currentVersion,
        token || undefined
      );
      setSuccessMsg(`Proposal successfully ${resolution === 'accept' ? 'accepted & applied to itinerary' : 'rejected'}!`);
      await loadData();
    } catch (e: any) {
      if (e.status === 409 || e.message?.includes('409') || e.message?.includes('Conflict')) {
        setConflictMsg(e.message || 'Version Conflict (HTTP 409): Itinerary was modified by another member.');
      } else {
        setErrorMsg(e.message || 'Failed to resolve proposal');
      }
      await loadData();
    }
  };

  const formatCountdown = (expiresAt?: string | null) => {
    if (!expiresAt) return null;
    const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
    if (diff <= 0) return 'Window Closed';
    const m = Math.floor(diff / 60);
    const s = diff % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleBack = () => {
    if (propBack) {
      propBack();
    } else if (effectiveTripId) {
      navigate(`/trips/${effectiveTripId}`);
    } else {
      navigate('/app');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 text-gray-500 space-y-3">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold">Loading slot details & proposals...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleBack}
          className="inline-flex items-center text-xs font-bold text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Trip Itinerary
        </button>
        <button
          onClick={() => setShowNewProp(!showNewProp)}
          className="flex items-center text-xs font-bold px-3.5 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-colors"
        >
          <PlusCircle className="w-4 h-4 mr-1.5" />
          Propose Alternative
        </button>
      </div>

      {/* Optimistic Concurrency Conflict Banner (HTTP 409) */}
      {conflictMsg && (
        <div className="bg-amber-50 border-2 border-amber-400 text-amber-900 p-4 rounded-2xl text-sm flex items-start shadow-sm">
          <AlertTriangle className="w-5 h-5 mr-3 shrink-0 text-amber-600 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block">Optimistic Concurrency Conflict Detected (HTTP 409):</span>
            <p className="mt-0.5 text-xs text-amber-800">{conflictMsg}</p>
            <button
              onClick={loadData}
              className="mt-2 text-xs font-bold bg-amber-200 hover:bg-amber-300 text-amber-900 px-3 py-1.5 rounded-lg"
            >
              Sync & Review Latest Version
            </button>
          </div>
        </div>
      )}

      {/* Error / Success Notifications */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-2xl text-xs sm:text-sm flex items-center">
          <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3.5 rounded-2xl text-xs sm:text-sm flex items-center">
          <CheckCircle2 className="w-4 h-4 mr-2 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Selected Slot Information */}
      {selectedItem ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Selected Slot (Day {selectedItem.day_index})
            </span>
            <StatusBadge status={selectedItem.status} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mt-2">{selectedItem.title}</h3>
          <p className="text-xs text-gray-500 mt-1">
            Cost: {selectedItem.currency} {selectedItem.cost} · Duration: {selectedItem.duration_minutes}m · Source: {selectedItem.source}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
          <h3 className="text-lg font-bold text-gray-900">Trip-Wide Proposals</h3>
          <p className="text-xs text-gray-500 mt-1">Viewing all proposals and debates for this itinerary</p>
        </div>
      )}

      {/* New Proposal Drawer / Form */}
      {showNewProp && (
        <form onSubmit={handleCreateProposal} className="bg-blue-50/70 rounded-2xl border border-blue-200 p-6 space-y-4 shadow-sm">
          <h4 className="text-sm font-bold text-blue-900">Submit New Alternative Proposal</h4>
          <div>
            <label className="block text-xs font-bold text-gray-700">Proposal Title</label>
            <input
              type="text"
              required={newAction !== 'remove'}
              placeholder={newAction === 'remove' ? `Remove ${selectedItem?.title || 'slot'}` : "e.g., Replace museum visit with heritage walking tour"}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="mt-1 w-full text-xs sm:text-sm bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700">Action (PS-11 4 Actions)</label>
              <select
                value={newAction}
                onChange={(e: any) => setNewAction(e.target.value)}
                className="mt-1 w-full text-xs sm:text-sm bg-white border border-gray-300 rounded-xl px-3.5 py-2.5"
              >
                <option value="replace">replace — Swap out this slot</option>
                <option value="add">add — Add extra activity</option>
                <option value="remove">remove — Remove this slot</option>
                <option value="reschedule">reschedule — Reschedule slot time</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700">Rationale</label>
              <input
                type="text"
                placeholder="Why is this change better?"
                value={newRationale}
                onChange={(e) => setNewRationale(e.target.value)}
                className="mt-1 w-full text-xs sm:text-sm bg-white border border-gray-300 rounded-xl px-3.5 py-2.5"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setShowNewProp(false)}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-sm"
            >
              Submit Proposal
            </button>
          </div>
        </form>
      )}

      {/* Active Proposals List */}
      <div className="space-y-4">
        <h4 className="text-lg font-bold text-gray-900">
          Open Proposals & Member Votes ({proposals.length})
        </h4>

        {proposals.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center text-gray-500 text-sm">
            No proposals currently open for debate. Click "Propose Alternative" above to propose changes.
          </div>
        ) : (
          proposals.map((prop) => {
            const countdownText = formatCountdown(prop.response_window?.expires_at);
            const isWindowActive = prop.response_window?.active && countdownText !== 'Window Closed';

            return (
              <div key={prop.proposal_id} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
                {/* 10-Minute Response Window Banner (Mode NA) */}
                {isWindowActive && (
                  <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-amber-900 gap-2">
                    <span className="flex items-center font-bold">
                      <Clock className="w-4 h-4 mr-2 text-amber-600 animate-pulse flex-shrink-0" />
                      10-Minute Consensus Response Window Active (triggered by first No vote)
                    </span>
                    <span className="font-mono font-bold bg-amber-200 px-2.5 py-1 rounded-lg text-amber-950 self-start sm:self-auto">
                      ⏱ {countdownText} remaining
                    </span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-gray-900 text-base">{prop.title}</span>
                      <StatusBadge status={prop.status} />
                      <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-full capitalize font-mono font-medium">
                        {prop.action}
                      </span>
                    </div>
                    {prop.rationale && (
                      <p className="text-xs text-gray-600 mt-1 italic">"{prop.rationale}"</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      Proposed by <span className="font-semibold text-gray-600">{prop.proposed_by_user_id}</span> · Cost delta: {prop.currency} {prop.cost_delta}
                    </p>
                  </div>

                  {/* Vote Tally Badges */}
                  <div className="flex items-center space-x-2 text-xs font-bold">
                    <span className="flex items-center text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                      <ThumbsUp className="w-3.5 h-3.5 mr-1" /> {prop.yes_votes} Yes
                    </span>
                    <span className="flex items-center text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
                      <ThumbsDown className="w-3.5 h-3.5 mr-1" /> {prop.no_votes} No
                    </span>
                    <span className="flex items-center text-gray-600 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
                      <MinusCircle className="w-3.5 h-3.5 mr-1" /> {prop.abstain_votes} Abstain
                    </span>
                  </div>
                </div>

                {/* Who Voted What: Detailed Member Votes */}
                {prop.votes_detail && prop.votes_detail.length > 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-2">
                    <span className="text-xs font-bold text-gray-700 flex items-center">
                      <Users className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
                      Member Votes & Visibility:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {prop.votes_detail.map((v) => (
                        <div
                          key={v.vote_id}
                          className={`text-xs px-2.5 py-1 rounded-lg border flex items-center space-x-1.5 ${
                            v.value === 'yes'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : v.value === 'no'
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-gray-100 text-gray-700 border-gray-200'
                          }`}
                        >
                          <span className="font-bold">{v.user_id}:</span>
                          <span className="capitalize">{v.value}</span>
                          {v.comment && <span className="italic text-gray-500">("{v.comment}")</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stated Objections List (Mandatory No Reasons) */}
                {prop.no_reasons.length > 0 && (
                  <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3.5 space-y-1.5">
                    <span className="text-xs font-bold text-rose-900">
                      Mandatory Objection Reasons ({prop.no_reasons.length}):
                    </span>
                    <ul className="list-disc list-inside text-xs text-rose-800 space-y-1">
                      {prop.no_reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Voting Action Section (if proposal is open) */}
                {prop.status === 'open' && (
                  <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <span className="text-xs font-medium text-gray-500">Cast your vote:</span>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleVote(prop.proposal_id, 'yes')}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center shadow-xs transition-colors"
                      >
                        <ThumbsUp className="w-3.5 h-3.5 mr-1" /> Vote Yes
                      </button>

                      <button
                        onClick={() => {
                          if (activeVotingProp === prop.proposal_id) {
                            handleVote(prop.proposal_id, 'no');
                          } else {
                            setActiveVotingProp(prop.proposal_id);
                          }
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center shadow-xs transition-colors"
                      >
                        <ThumbsDown className="w-3.5 h-3.5 mr-1" /> Vote No (Reason Req.)
                      </button>

                      <button
                        onClick={() => handleVote(prop.proposal_id, 'abstain')}
                        className="px-3.5 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold flex items-center transition-colors"
                      >
                        <MinusCircle className="w-3.5 h-3.5 mr-1" /> Abstain
                      </button>
                    </div>
                  </div>
                )}

                {/* No Reason Input Drawer */}
                {activeVotingProp === prop.proposal_id && (
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2">
                    <label className="block text-xs font-bold text-gray-700">
                      Mandatory Objection Reason for Voting 'No':
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="Type objection reason (e.g., Too expensive, requires life jackets, closed Mondays)..."
                        value={noReason[prop.proposal_id] || ''}
                        onChange={(e) => setNoReason({ ...noReason, [prop.proposal_id]: e.target.value })}
                        className="flex-1 text-xs bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-rose-500"
                      />
                      <button
                        onClick={() => handleVote(prop.proposal_id, 'no')}
                        className="px-4 py-2.5 text-xs font-bold bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-colors"
                      >
                        Confirm No
                      </button>
                    </div>
                  </div>
                )}

                {/* Proposal Resolution Bar (Accept / Reject) */}
                {prop.status === 'open' && (
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-400 font-medium">
                      Itinerary Concurrency v{trip?.active_itinerary?.version || 1}
                    </span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleResolveProposal(prop.proposal_id, 'reject')}
                        className="px-3.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50 rounded-xl border border-rose-200 flex items-center transition-colors"
                      >
                        <X className="w-3.5 h-3.5 mr-1" /> Reject
                      </button>
                      <button
                        onClick={() => handleResolveProposal(prop.proposal_id, 'accept')}
                        className="px-4 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs flex items-center transition-colors"
                      >
                        <Check className="w-3.5 h-3.5 mr-1" /> Accept & Apply to Itinerary
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
