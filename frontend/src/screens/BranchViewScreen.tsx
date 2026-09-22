import React, { useState } from 'react';
import { GitBranch, Clock, Check, RefreshCw } from 'lucide-react';

export const BranchViewScreen: React.FC = () => {
  const [confirmed, setConfirmed] = useState(false);
  const [modRequested, setModRequested] = useState(false);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
            <GitBranch className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Branch View (Mode NA Split Plan)</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              When preferences are incompatible, WanderMatch branches activities in parallel rather than forcing compromise.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-sm text-gray-900">Day 2 Afternoon Branch</span>
            <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded">
              Preview Window: 10 mins (Silence = Accepted)
            </span>
          </div>
          <div className="flex items-center text-xs text-gray-500 font-medium">
            <Clock className="w-3.5 h-3.5 mr-1 text-gray-400" />
            Time Remaining: 08:42
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-xl border-2 border-blue-500 bg-blue-50/20 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-sm text-blue-900">Branch A: Cultural Heritage Trail</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">Your Branch</span>
            </div>
            <p className="text-xs text-gray-600">
              Assigned members: Alex Carter, Rohan Sharma. Explores Bibi Ka Maqbara & Daulatabad Fort.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-sm text-gray-800">Branch B: Local Artisan & Food Trail</span>
              <span className="text-xs text-gray-500">2 members</span>
            </div>
            <p className="text-xs text-gray-600">
              Assigned members: Priya Patel, Rahul V. Explores textile weaving and Aurangabad street food.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Rule C5: Silence acts as confirmation. Only an explicit "Request Modification" prevents auto-acceptance.
          </p>

          <div className="flex space-x-3">
            <button
              onClick={() => { setModRequested(true); setConfirmed(false); }}
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              {modRequested ? 'Modification Requested' : 'Request Modification'}
            </button>
            <button
              onClick={() => { setConfirmed(true); setModRequested(false); }}
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center"
            >
              <Check className="w-3.5 h-3.5 mr-1" />
              {confirmed ? 'Confirmed' : 'Confirm Branch'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
