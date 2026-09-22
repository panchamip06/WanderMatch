import React, { useState, useEffect } from 'react';
import type { Trip, ItineraryItem, Proposal } from '../types';
import { ApiService } from '../services/api';
import { useAuth } from '../services/auth';
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
  AlertTriangle
} from 'lucide-react';

interface SlotDetailScreenProps {
  trip: Trip | null;
  selectedItem: ItineraryItem | null;
  onBack: () => void;
  liveProposals: Proposal[];
  onRefreshProposals: () => void;
}

export const SlotDetailScreen: React.FC<SlotDetailScreenProps> = ({
  trip,
  selectedItem,
  onBack,
  liveProposals,
  onRefreshProposals,
}) => {
  const { userId } = useAuth();
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

  const handleVote = async (propId: string, value: 'yes' | 'no' | 'abstain') => {
    if (!trip) return;
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
      await ApiService.castVote(trip.trip_id, propId, value, reason, userId);
      setSuccessMsg(`Vote '${value.toUpperCase()}' recorded!`);
      onRefreshProposals();
      // Clear objection input
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
        userId
      );
      setSuccessMsg('Proposal submitted and broadcast to trip members!');
      setShowNewProp(false);
      setNewTitle('');
      setNewRationale('');
      onRefreshProposals();
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
        userId
      );
      setSuccessMsg(`Proposal successfully ${resolution === 'accept' ? 'accepted & applied to itinerary' : 'rejected'}!`);
      onRefreshProposals();
    } catch (e: any) {
      if (e.status === 409 || e.message.includes('409') || e.message.includes('Conflict')) {
        setConflictMsg(e.message || 'Version Conflict (HTTP 409): Itinerary was modified by another member.');
      } else {
        setErrorMsg(e.message || 'Failed to resolve proposal');
      }
      onRefreshProposals();
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
        >
          ← Back to Itinerary Slots
        </button>
        <button
          onClick={() => setShowNewProp(!showNewProp)}
          className="flex items-center text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
        >
          <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
          Propose Alternative
        </button>
      </div>

      {/* Optimistic Concurrency Conflict Banner (HTTP 409) */}
      {conflictMsg && (
        <div className="bg-amber-50 border-2 border-amber-400 text-amber-900 p-4 rounded-xl text-sm flex items-start shadow-sm">
          <AlertTriangle className="w-5 h-5 mr-3 shrink-0 text-amber-600 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block">Optimistic Concurrency Conflict Detected (HTTP 409):</span>
            <p className="mt-0.5 text-xs text-amber-800">{conflictMsg}</p>
            <button
              onClick={onRefreshProposals}
              className="mt-2 text-xs font-semibold bg-amber-200 hover:bg-amber-300 text-amber-900 px-3 py-1 rounded"
            >
              Sync & Review Latest Version
            </button>
          </div>
        </div>
      )}

      {/* Error / Success Notifications */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm flex items-center">
          <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-xl text-sm flex items-center">
          <CheckCircle2 className="w-4 h-4 mr-2 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Selected Slot Information */}
      {selectedItem && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Selected Slot (Day {selectedItem.day_index})
            </span>
            <StatusBadge status={selectedItem.status} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mt-1">{selectedItem.title}</h3>
          <p className="text-xs text-gray-500 mt-1">
            Cost: {selectedItem.currency} {selectedItem.cost} · Duration: {selectedItem.duration_minutes}m · Source: {selectedItem.source}
          </p>
        </div>
      )}

      {/* New Proposal Drawer / Form */}
      {showNewProp && (
        <form onSubmit={handleCreateProposal} className="bg-blue-50/60 rounded-xl border border-blue-200 p-5 space-y-4">
          <h4 className="text-sm font-bold text-blue-900">Submit New Alternative Proposal</h4>
          <div>
            <label className="block text-xs font-semibold text-gray-700">Proposal Title</label>
            <input
              type="text"
              required={newAction !== 'remove'}
              placeholder={newAction === 'remove' ? `Remove ${selectedItem?.title || 'slot'}` : "e.g., Replace museum visit with heritage walking tour"}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="mt-1 w-full text-sm bg-white border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700">Action (PS-11 4 Actions)</label>
              <select
                value={newAction}
                onChange={(e: any) => setNewAction(e.target.value)}
                className="mt-1 w-full text-sm bg-white border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="replace">replace — Swap out this slot</option>
                <option value="add">add — Add extra activity</option>
                <option value="remove">remove — Remove this slot</option>
                <option value="reschedule">reschedule — Reschedule slot time</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700">Rationale</label>
              <input
                type="text"
                placeholder="Why is this change better?"
                value={newRationale}
                onChange={(e) => setNewRationale(e.target.value)}
                className="mt-1 w-full text-sm bg-white border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowNewProp(false)}
              className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Submit Proposal
            </button>
          </div>
        </form>
      )}

      {/* Active Proposals List */}
      <div className="space-y-4">
        <h4 className="text-base font-bold text-gray-900">
          Open Proposals & Member Votes ({liveProposals.length})
        </h4>

        {liveProposals.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-gray-500 text-sm">
            No open proposals currently being debated for this trip. Click "Propose Alternative" above to start one.
          </div>
        ) : (
          liveProposals.map((prop) => {
            const countdownText = formatCountdown(prop.response_window?.expires_at);
            const isWindowActive = prop.response_window?.active && countdownText !== 'Window Closed';

            return (
              <div key={prop.proposal_id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs space-y-4">
                {/* 10-Minute Response Window Banner (Mode NA) */}
                {isWindowActive && (
                  <div className="bg-amber-50 border border-amber-300 rounded-lg p-2.5 flex items-center justify-between text-xs text-amber-900">
                    <span className="flex items-center font-medium">
                      <Clock className="w-4 h-4 mr-1.5 text-amber-600 animate-pulse" />
                      10-Minute Consensus Response Window active (triggered by first No vote)
                    </span>
                    <span className="font-mono font-bold bg-amber-200 px-2 py-0.5 rounded text-amber-950">
                      ⏱ {countdownText} remaining
                    </span>
                  </div>
                )}

                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-gray-900 text-sm">{prop.title}</span>
                      <StatusBadge status={prop.status} />
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded capitalize font-mono">
                        {prop.action}
                      </span>
                    </div>
                    {prop.rationale && (
                      <p className="text-xs text-gray-600 mt-1">"{prop.rationale}"</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      Proposed by <span className="font-medium text-gray-600">{prop.proposed_by_user_id}</span> · Cost delta: {prop.currency} {prop.cost_delta}
                    </p>
                  </div>

                  {/* Vote Tally Badges */}
                  <div className="flex items-center space-x-2 text-xs font-semibold">
                    <span className="flex items-center text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      <ThumbsUp className="w-3.5 h-3.5 mr-1" /> {prop.yes_votes} Yes
                    </span>
                    <span className="flex items-center text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                      <ThumbsDown className="w-3.5 h-3.5 mr-1" /> {prop.no_votes} No
                    </span>
                    <span className="flex items-center text-gray-600 bg-gray-100 px-2 py-1 rounded-full border border-gray-200">
                      <MinusCircle className="w-3.5 h-3.5 mr-1" /> {prop.abstain_votes} Abstain
                    </span>
                  </div>
                </div>

                {/* Who Voted What: Detailed Member Votes */}
                {prop.votes_detail && prop.votes_detail.length > 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                    <span className="text-xs font-bold text-gray-700 flex items-center">
                      <Users className="w-3.5 h-3.5 mr-1 text-gray-500" />
                      Member Votes & Visibility:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {prop.votes_detail.map((v) => (
                        <div
                          key={v.vote_id}
                          className={`text-xs px-2.5 py-1 rounded-md border flex items-center space-x-1.5 ${
                            v.value === 'yes'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : v.value === 'no'
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-gray-100 text-gray-700 border-gray-200'
                          }`}
                        >
                          <span className="font-semibold">{v.user_id}:</span>
                          <span className="capitalize">{v.value}</span>
                          {v.comment && <span className="italic text-gray-500">("{v.comment}")</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stated Objections List (Mandatory No Reasons) */}
                {prop.no_reasons.length > 0 && (
                  <div className="bg-rose-50/70 border border-rose-200 rounded-lg p-3 space-y-1.5">
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
                  <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <span className="text-xs font-medium text-gray-500">Cast your vote:</span>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleVote(prop.proposal_id, 'yes')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center shadow-xs"
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
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center shadow-xs"
                      >
                        <ThumbsDown className="w-3.5 h-3.5 mr-1" /> Vote No (Reason Req.)
                      </button>

                      <button
                        onClick={() => handleVote(prop.proposal_id, 'abstain')}
                        className="px-3 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-semibold flex items-center"
                      >
                        <MinusCircle className="w-3.5 h-3.5 mr-1" /> Abstain
                      </button>
                    </div>
                  </div>
                )}

                {/* No Reason Input Drawer */}
                {activeVotingProp === prop.proposal_id && (
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-2">
                    <label className="block text-xs font-semibold text-gray-700">
                      Mandatory Objection Reason for Voting 'No':
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        placeholder="Type objection reason (e.g., Too expensive, closed on Mondays, too far)..."
                        value={noReason[prop.proposal_id] || ''}
                        onChange={(e) => setNoReason({ ...noReason, [prop.proposal_id]: e.target.value })}
                        className="flex-1 text-xs bg-white border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-500"
                      />
                      <button
                        onClick={() => handleVote(prop.proposal_id, 'no')}
                        className="px-3 py-2 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700"
                      >
                        Confirm No
                      </button>
                    </div>
                  </div>
                )}

                {/* Proposal Resolution Bar (Accept / Reject) */}
                {prop.status === 'open' && (
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      Itinerary Concurrency v{trip?.active_itinerary?.version || 1}
                    </span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleResolveProposal(prop.proposal_id, 'reject')}
                        className="px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded border border-rose-200 flex items-center"
                      >
                        <X className="w-3.5 h-3.5 mr-1" /> Reject
                      </button>
                      <button
                        onClick={() => handleResolveProposal(prop.proposal_id, 'accept')}
                        className="px-3 py-1 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded shadow-xs flex items-center"
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
