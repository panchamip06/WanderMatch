import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GroupMatch, GuideMatch } from '../types';
import { ApiService } from '../services/api';
import { useAuth } from '../services/auth';
import {
  UserCheck, Award, Star, Users, MapPin, Calendar,
  ShieldCheck, ArrowRight, Filter, Sparkles
} from 'lucide-react';

export const SoloMatchScreen: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useAuth();

  const [activeTab, setActiveTab] = useState<'groups' | 'guides'>('groups');
  const [groupMatches, setGroupMatches] = useState<GroupMatch[]>([]);
  const [guideMatches, setGuideMatches] = useState<GuideMatch[]>([]);
  const [loading, setLoading] = useState(true);

  // Guide filter states
  const [specialisation, setSpecialisation] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);

  useEffect(() => {
    loadMatches();
  }, [specialisation, maxPrice]);

  const loadMatches = async () => {
    setLoading(true);
    try {
      const [groups, guides] = await Promise.all([
        ApiService.getGroupMatches(15, token || undefined),
        ApiService.getGuideMatches(
          {
            specialisation: specialisation || undefined,
            max_price: maxPrice || undefined,
            limit: 20,
          },
          token || undefined
        ),
      ]);
      setGroupMatches(groups);
      setGuideMatches(guides);
    } catch (e) {
      console.error('Failed to load matches:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 rounded-2xl bg-teal-50 text-teal-600">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Solo Traveller Matching</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Explainable compatibility matching across languages, interests, pacing, budget, and certified tour guides.
            </p>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-gray-100 p-1 rounded-2xl self-start sm:self-auto border border-gray-200">
          <button
            onClick={() => setActiveTab('groups')}
            className={`flex items-center px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'groups'
                ? 'bg-white text-teal-700 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="w-4 h-4 mr-1.5" />
            Group Trips ({groupMatches.length})
          </button>
          <button
            onClick={() => setActiveTab('guides')}
            className={`flex items-center px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'guides'
                ? 'bg-white text-teal-700 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Award className="w-4 h-4 mr-1.5" />
            Tour Guides ({guideMatches.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col justify-center items-center h-64 text-gray-400 space-y-3">
          <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold">Computing explainable matches...</p>
        </div>
      ) : activeTab === 'groups' ? (
        /* Solo to Group Matching Section */
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Ranked by multi-dimensional compatibility algorithm</span>
            <span className="flex items-center text-teal-700 font-semibold">
              <Sparkles className="w-3.5 h-3.5 mr-1" /> Explainable matches
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groupMatches.map((match) => (
              <div
                key={match.trip_id}
                className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3.5 shadow-2xs hover:border-teal-300 transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-gray-900 leading-snug">{match.title}</h4>
                      <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                        <span className="flex items-center">
                          <MapPin className="w-3.5 h-3.5 mr-1 text-gray-400" />
                          {match.destination_city_name}
                        </span>
                        <span>·</span>
                        <span className="flex items-center">
                          <Calendar className="w-3.5 h-3.5 mr-1 text-gray-400" />
                          {match.start_date}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                        {match.compatibility_score}% Match
                      </span>
                      <span className="text-[10px] text-gray-400 mt-1">
                        {match.current_members_count}/{match.party_size} members
                      </span>
                    </div>
                  </div>

                  {/* Explainable Match Reasons */}
                  <div className="bg-teal-50/50 rounded-xl p-3 border border-teal-100 space-y-1">
                    <span className="text-[11px] font-bold text-teal-900 block">Why this matches you:</span>
                    <ul className="text-xs text-teal-800 space-y-0.5">
                      {match.match_reasons.map((r, i) => (
                        <li key={i} className="flex items-start">
                          <span className="text-teal-500 mr-1.5">•</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-gray-400 capitalize">
                    {match.trip_mode.replace('_', ' ')} mode
                  </span>
                  <button
                    onClick={() => navigate(`/trips/${match.trip_id}`)}
                    className="inline-flex items-center text-xs font-bold text-teal-700 hover:text-teal-900 transition-colors"
                  >
                    View Trip Details <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Solo to Guide Matching Section */
        <div className="space-y-4">
          {/* Guide Filters */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 flex flex-wrap items-center gap-3 text-xs">
            <span className="font-bold text-gray-700 flex items-center">
              <Filter className="w-3.5 h-3.5 mr-1 text-gray-400" /> Filter Guides:
            </span>

            <select
              value={specialisation}
              onChange={(e) => setSpecialisation(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 font-medium text-gray-700"
            >
              <option value="">All Specialisations</option>
              <option value="heritage">Heritage & Architecture</option>
              <option value="food">Culinary & Food</option>
              <option value="wildlife">Wildlife & Nature</option>
              <option value="trekking">Trekking & Adventure</option>
              <option value="shopping">Artisan & Markets</option>
            </select>

            <select
              value={maxPrice || ''}
              onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : undefined)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 font-medium text-gray-700"
            >
              <option value="">Any Daily Rate</option>
              <option value="3000">Up to INR 3,000 / day</option>
              <option value="4500">Up to INR 4,500 / day</option>
              <option value="6000">Up to INR 6,000 / day</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {guideMatches.map((guide) => (
              <div
                key={guide.guide_id}
                className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3.5 shadow-2xs hover:border-amber-300 transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-sm text-gray-900">{guide.display_name}</h4>
                        {guide.certified && (
                          <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                            <ShieldCheck className="w-3 h-3 mr-0.5 text-amber-700" /> Certified
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                        <span>{guide.city_name}</span>
                        <span>·</span>
                        <span className="capitalize font-medium text-gray-700">{guide.specialisation}</span>
                        <span>·</span>
                        <span>{guide.years_experience} yrs exp</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className="text-xs font-bold text-amber-600 flex items-center">
                        <Star className="w-3.5 h-3.5 mr-0.5 fill-amber-500 text-amber-500" />
                        {guide.rating ? guide.rating.toFixed(1) : 'New'} ({guide.review_count})
                      </span>
                      <span className="text-xs font-bold text-gray-900 mt-1">
                        {guide.currency} {guide.day_rate} <span className="font-normal text-[10px] text-gray-500">/ day</span>
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 line-clamp-2 italic">"{guide.bio}"</p>

                  {/* Languages Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {guide.languages.map((l, i) => (
                      <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-mono">
                        {l}
                      </span>
                    ))}
                  </div>

                  {/* Explainable Match Reasons */}
                  <div className="bg-amber-50/50 rounded-xl p-3 border border-amber-100 space-y-1">
                    <span className="text-[11px] font-bold text-amber-900 block">Why this guide fits:</span>
                    <ul className="text-xs text-amber-800 space-y-0.5">
                      {guide.match_reasons.map((r, i) => (
                        <li key={i} className="flex items-start">
                          <span className="text-amber-500 mr-1.5">•</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
