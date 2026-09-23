import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Branch, Trip } from '../types';
import { ApiService } from '../services/api';
import { useAuth } from '../services/auth';
import { TripWebSocketClient } from '../services/websocket';
import {
  GitBranch, Clock, Check, RefreshCw, AlertCircle, Plus,
  ArrowLeft, Users, CheckCircle2, CornerDownRight
} from 'lucide-react';

export const BranchViewScreen: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { userId, token } = useAuth();

  const [effectiveTripId, setEffectiveTripId] = useState<string | null>(tripId || null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Create branch modal/form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newParentBranchId, setNewParentBranchId] = useState<string>('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [creatingBranch, setCreatingBranch] = useState(false);
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});

  // Auto-resolve tripId if navigating via /branch-view
  useEffect(() => {
    if (!effectiveTripId) {
      ApiService.getMyTrips(token || undefined)
        .then((trips) => {
          if (trips && trips.length > 0) {
            setEffectiveTripId(trips[0].trip_id);
          } else {
            setLoading(false);
          }
        })
        .catch((e) => {
          console.error(e);
          setLoading(false);
        });
    }
  }, [effectiveTripId, token]);

  const loadData = useCallback(async () => {
    if (!effectiveTripId) return;
    try {
      const [fetchedTrip, fetchedBranches] = await Promise.all([
        ApiService.getTripDetail(effectiveTripId, token || undefined),
        ApiService.getBranches(effectiveTripId, token || undefined),
      ]);
      setTrip(fetchedTrip);
      setBranches(fetchedBranches);
      if (fetchedTrip.members && fetchedTrip.members.length > 0 && selectedMembers.length === 0) {
        setSelectedMembers([userId || fetchedTrip.members[0].user_id]);
      }
    } catch (e: any) {
      console.error('Failed to load branches:', e);
      setErrorMsg(e.message || 'Failed to load branch data');
    } finally {
      setLoading(false);
    }
  }, [effectiveTripId, token, userId, selectedMembers.length]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time WebSocket connection
  useEffect(() => {
    if (!effectiveTripId) return;

    const wsClient = new TripWebSocketClient(effectiveTripId, userId || 'anon');
    wsClient.connect();

    const unsubscribe = wsClient.subscribe((msg: any) => {
      console.log('[BranchView] WebSocket event:', msg);
      if (
        msg.type === 'branch_created' ||
        msg.type === 'branch_member_updated' ||
        msg.type === 'branch_finalized' ||
        msg.type === 'ai_branch_revision_ready'
      ) {
        loadData();
      }
    });

    return () => {
      unsubscribe();
      wsClient.disconnect();
    };
  }, [effectiveTripId, userId, loadData]);

  const handleMemberStatusUpdate = async (branchId: string, status: 'confirmed' | 'modification_requested') => {
    if (!effectiveTripId) return;
    setErrorMsg(null);
    const key = `status_${branchId}`;
    setActionLoading((prev) => ({ ...prev, [key]: true }));
    try {
      await ApiService.updateBranchMemberStatus(effectiveTripId, branchId, status, token || undefined);
      setSuccessMsg(`Your status updated to '${status}'!`);
      await loadData();
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to update member status');
    } finally {
      setActionLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleFinalize = async (branchId: string) => {
    if (!effectiveTripId) return;
    setErrorMsg(null);
    const key = `finalize_${branchId}`;
    setActionLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await ApiService.finalizeBranch(effectiveTripId, branchId, token || undefined);
      setSuccessMsg(
        res.status === 'confirmed'
          ? 'Branch finalized! Silence accepted: all pending members confirmed.'
          : 'Branch finalized with pending modifications.'
      );
      await loadData();
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to finalize branch');
    } finally {
      setActionLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleRevision = async (branchId: string) => {
    if (!effectiveTripId) return;
    setErrorMsg(null);
    const key = `rev_${branchId}`;
    setActionLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const rev = await ApiService.generateBranchRevision(effectiveTripId, branchId, token || undefined);
      setSuccessMsg(`AI Revision Round ${rev.round_number} generated!`);
      await loadData();
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to generate branch revision');
    } finally {
      setActionLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveTripId || !newTitle.trim()) return;
    setCreatingBranch(true);
    setErrorMsg(null);
    try {
      await ApiService.createBranch(
        effectiveTripId,
        {
          title: newTitle.trim(),
          parent_branch_id: newParentBranchId ? newParentBranchId : undefined,
          member_user_ids: selectedMembers,
          preview_deadline: '',
        },
        token || undefined
      );
      setSuccessMsg('New parallel branch created!');
      setShowCreateModal(false);
      setNewTitle('');
      setNewParentBranchId('');
      await loadData();
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to create branch');
    } finally {
      setCreatingBranch(false);
    }
  };

  const toggleMemberSelection = (uid: string) => {
    setSelectedMembers((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 text-gray-400 space-y-3">
        <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold">Loading trip branches...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          onClick={() => effectiveTripId ? navigate(`/trips/${effectiveTripId}`) : navigate('/app')}
          className="inline-flex items-center text-xs font-bold text-gray-600 hover:text-gray-900 transition-colors self-start"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Trip Itinerary
        </button>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center text-xs font-bold px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Create Parallel Branch
        </button>
      </div>

      {/* Main Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-amber-50 text-amber-600">
            <GitBranch className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Branch View — {trip?.title || 'Parallel Activity Tree'}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              When preferences are incompatible, WanderMatch branches activities in parallel rather than forcing compromise.
              Supports recursive sub-branches, Silence = Accepted auto-confirmation, and 3-round soft caps.
            </p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-center justify-between">
          <span className="flex items-center">
            <AlertCircle className="w-4 h-4 mr-2 text-rose-600 shrink-0" />
            {errorMsg}
          </span>
          <button onClick={() => setErrorMsg(null)} className="text-rose-600 font-bold ml-2">×</button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center justify-between">
          <span className="flex items-center">
            <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600 shrink-0" />
            {successMsg}
          </span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 font-bold ml-2">×</button>
        </div>
      )}

      {/* Silence = Accepted Rule Alert Banner */}
      <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 flex items-start space-x-3 text-xs text-amber-950">
        <Clock className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
        <div className="space-y-0.5">
          <span className="font-bold block">Rule C5: Silence acts as confirmation</span>
          <p className="text-amber-800">
            Members assigned to a branch are automatically accepted unless an explicit "Request Modification" is posted before finalization.
          </p>
        </div>
      </div>

      {/* Branches List */}
      <div className="space-y-4">
        {branches.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 border border-gray-200 text-center space-y-4">
            <GitBranch className="w-10 h-10 text-gray-300 mx-auto" />
            <div>
              <h3 className="font-bold text-gray-800 text-base">No Branches Created Yet</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                All activities currently follow the main group itinerary. When a proposal disagreement triggers branching, parallel paths will appear here.
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors shadow-xs"
            >
              Create First Branch
            </button>
          </div>
        ) : (
          branches.map((branch) => {
            const isUserMember = branch.members.some((m) => m.user_id === userId);
            const userMemberRow = branch.members.find((m) => m.user_id === userId);

            return (
              <div
                key={branch.branch_id}
                className={`bg-white rounded-2xl border transition-all p-5 sm:p-6 space-y-4 ${
                  branch.status === 'confirmed'
                    ? 'border-emerald-200 shadow-xs'
                    : branch.status === 'modification_requested'
                    ? 'border-rose-200 shadow-xs'
                    : 'border-amber-200 shadow-xs'
                }`}
              >
                {/* Branch Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      {branch.parent_branch_id && (
                        <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800">
                          <CornerDownRight className="w-3 h-3 mr-1" /> Sub-branch of {branch.parent_branch_id}
                        </span>
                      )}
                      <h3 className="font-bold text-base text-gray-900">{branch.title}</h3>
                      <span className="font-mono text-xs text-gray-400">({branch.branch_id})</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-500">
                      <span>Created: {new Date(branch.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span>·</span>
                      <span>Assigned Members: {branch.members.length}</span>
                      <span>·</span>
                      <span>AI Revisions: {branch.revision_count}/3</span>
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                        branch.status === 'confirmed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : branch.status === 'modification_requested'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {branch.status.replace('_', ' ')}
                    </span>
                    {isUserMember && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
                        You're in this branch
                      </span>
                    )}
                  </div>
                </div>

                {/* Member Roster with Individual Statuses */}
                <div className="bg-gray-50/80 rounded-xl p-3.5 border border-gray-100 space-y-2">
                  <span className="text-xs font-bold text-gray-700 flex items-center">
                    <Users className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
                    Branch Member Assignments:
                  </span>

                  <div className="flex flex-wrap gap-2">
                    {branch.members.map((m) => (
                      <div
                        key={m.branch_member_id}
                        className={`text-xs px-2.5 py-1 rounded-lg border flex items-center space-x-1.5 ${
                          m.status === 'confirmed'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : m.status === 'modification_requested'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        <span className="font-bold">{m.user_id}</span>
                        <span className="text-[10px] uppercase font-semibold">({m.status.replace('_', ' ')})</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons Toolbar */}
                <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* User Member Actions */}
                    {isUserMember && branch.status !== 'confirmed' && (
                      <>
                        <button
                          onClick={() => handleMemberStatusUpdate(branch.branch_id, 'confirmed')}
                          disabled={actionLoading[`status_${branch.branch_id}`] || userMemberRow?.status === 'confirmed'}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold flex items-center shadow-2xs transition-colors"
                        >
                          <Check className="w-3.5 h-3.5 mr-1" />
                          {userMemberRow?.status === 'confirmed' ? 'You Confirmed' : 'Confirm Participation'}
                        </button>

                        <button
                          onClick={() => handleMemberStatusUpdate(branch.branch_id, 'modification_requested')}
                          disabled={actionLoading[`status_${branch.branch_id}`] || userMemberRow?.status === 'modification_requested'}
                          className="px-3.5 py-1.5 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 disabled:opacity-50 text-xs font-bold flex items-center transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5 mr-1" />
                          {userMemberRow?.status === 'modification_requested' ? 'Modification Requested' : 'Request Modification'}
                        </button>
                      </>
                    )}

                    {/* Finalize Button (Silence = Accepted) */}
                    {branch.status === 'preview' && (
                      <button
                        onClick={() => handleFinalize(branch.branch_id)}
                        disabled={actionLoading[`finalize_${branch.branch_id}`]}
                        className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold flex items-center transition-colors"
                        title="Confirms all pending members automatically under silence acceptance rules."
                      >
                        <Clock className="w-3.5 h-3.5 mr-1 text-gray-500" />
                        Finalize (Silence = Accepted)
                      </button>
                    )}
                  </div>

                  {/* Branch Evolution Tools: AI Revision + Recursive Sub-Branch */}
                  <div className="flex items-center space-x-2 self-end sm:self-auto">
                    <button
                      onClick={() => handleRevision(branch.branch_id)}
                      disabled={actionLoading[`rev_${branch.branch_id}`] || branch.revision_count >= 3}
                      className="px-3 py-1.5 rounded-xl border border-indigo-200 text-indigo-700 hover:bg-indigo-50 disabled:opacity-50 text-xs font-bold flex items-center transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1" />
                      {branch.revision_count >= 3 ? 'Cap (3/3)' : `AI Revision (${branch.revision_count}/3)`}
                    </button>

                    <button
                      onClick={() => {
                        setNewParentBranchId(branch.branch_id);
                        setNewTitle(`Sub-branch of ${branch.title}`);
                        setShowCreateModal(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold flex items-center border border-purple-200 transition-colors"
                    >
                      <CornerDownRight className="w-3.5 h-3.5 mr-1" />
                      Sub-Branch
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Branch Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-xl border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <GitBranch className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Create Parallel Branch</h3>
                  <p className="text-xs text-gray-500">Split into an alternative activity path for distinct preferences.</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBranch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Branch Title</label>
                <input
                  type="text"
                  placeholder="e.g., Artisan & Street Food Trail (Priya & Rahul)"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full text-xs sm:text-sm bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Parent Branch (Optional for Recursive Branching)</label>
                <select
                  value={newParentBranchId}
                  onChange={(e) => setNewParentBranchId(e.target.value)}
                  className="w-full text-xs sm:text-sm bg-white border border-gray-300 rounded-xl px-3.5 py-2.5"
                >
                  <option value="">None (Top-Level Activity Branch)</option>
                  {branches.map((b) => (
                    <option key={b.branch_id} value={b.branch_id}>
                      {b.title} ({b.branch_id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Assign Trip Members to this Branch</label>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 border border-gray-200 rounded-xl bg-gray-50">
                  {trip?.members && trip.members.length > 0 ? (
                    trip.members.map((m) => {
                      const isSelected = selectedMembers.includes(m.user_id);
                      return (
                        <button
                          type="button"
                          key={m.member_id}
                          onClick={() => toggleMemberSelection(m.user_id)}
                          className={`p-2 rounded-lg text-xs font-semibold text-left flex items-center justify-between border transition-colors ${
                            isSelected
                              ? 'bg-amber-100 border-amber-300 text-amber-900'
                              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <span>{m.user_id}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-amber-700" />}
                        </button>
                      );
                    })
                  ) : (
                    <span className="text-xs text-gray-400 col-span-2">No members available</span>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingBranch || !newTitle.trim()}
                  className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl shadow-xs transition-colors"
                >
                  {creatingBranch ? 'Creating...' : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
