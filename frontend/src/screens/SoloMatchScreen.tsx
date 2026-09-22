import React from 'react';
import { UserCheck, Award, Star } from 'lucide-react';

export const SoloMatchScreen: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Solo Traveller Matching</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Explainable compatibility matching over languages, pace, travel style, and certified tour guides.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Solo to Group Matching */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="font-bold text-sm text-gray-900 flex items-center">
            <Users className="w-4 h-4 mr-2 text-blue-600" /> Compatible Group Trips
          </h3>
          <div className="p-4 rounded-xl border border-gray-100 bg-gray-50 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-sm text-gray-800">Jaipur Heritage & Food Expedition</span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                94% Match
              </span>
            </div>
            <p className="text-xs text-gray-600">
              Matched reasons: Shared interest in 'heritage', budget band 'mid', pacing 'balanced', overlapping travel dates.
            </p>
          </div>
        </div>

        {/* Solo to Guide Matching */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="font-bold text-sm text-gray-900 flex items-center">
            <Award className="w-4 h-4 mr-2 text-amber-600" /> Certified Tour Guides
          </h3>
          <div className="p-4 rounded-xl border border-gray-100 bg-gray-50 space-y-2">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-bold text-sm text-gray-800">Sunita Deshmukh</span>
                <span className="ml-2 text-xs bg-gray-200 px-1.5 py-0.5 rounded text-gray-700">heritage</span>
              </div>
              <span className="text-xs font-bold text-amber-600 flex items-center">
                <Star className="w-3.5 h-3.5 mr-0.5 fill-amber-500 text-amber-500" /> 4.9 (42 reviews)
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Languages: English (en), Hindi (hi), Marathi (mr) · Day Rate: INR 2,500.00
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

function Users(props: any) {
  return (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}
