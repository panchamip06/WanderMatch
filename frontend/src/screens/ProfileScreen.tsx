import React, { useState, useEffect } from 'react';
import { useAuth } from '../services/auth';
import { ApiService } from '../services/api';
import { User, CheckCircle2, Save, Sliders, Shield } from 'lucide-react';

export const ProfileScreen: React.FC = () => {
  const { userId, currentUser, setCurrentUser } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [travelStyle, setTravelStyle] = useState('comfort');
  const [pace, setPace] = useState('balanced');
  const [budgetBand, setBudgetBand] = useState('mid');
  const [interests, setInterests] = useState('heritage, food, nature');
  const [prefLanguages, setPrefLanguages] = useState('en-IN');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.display_name);
      setTravelStyle(currentUser.travel_style || 'comfort');
      setBudgetBand(currentUser.budget_band || 'mid');
    }
    // Fetch latest profile from DB
    ApiService.getProfile(userId)
      .then((u: any) => {
        setDisplayName(u.display_name);
        setTravelStyle(u.travel_style);
        setBudgetBand(u.budget_band);
        if (u.preferences) {
          setPace(u.preferences.pace || 'balanced');
          setInterests(u.preferences.interests || 'heritage, food');
          setPrefLanguages(u.preferences.preferred_languages || 'en-IN');
        }
      })
      .catch((e) => console.log('Profile load:', e));
  }, [userId, currentUser]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const updated = await ApiService.updateProfile(
        {
          display_name: displayName,
          travel_style: travelStyle,
          pace,
          budget_band: budgetBand,
          interests,
          preferred_languages: prefLanguages,
        },
        userId
      );
      setCurrentUser(updated);
      setMsg('Profile and travel preferences saved to system of record!');
    } catch (e: any) {
      setMsg(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Traveller Profile & Preferences</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              User ID: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-800">{userId}</code> · System of Record: PostgreSQL/SQLite
            </p>
          </div>
        </div>
      </div>

      {msg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-sm flex items-center">
          <CheckCircle2 className="w-4 h-4 mr-2 shrink-0 text-emerald-600" />
          {msg}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6 shadow-xs">
        <div>
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center">
            <Sliders className="w-4 h-4 mr-2 text-blue-600" /> Identity & Travel Style
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="mt-1 w-full text-sm bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700">Travel Style (PS-11)</label>
              <select
                value={travelStyle}
                onChange={(e) => setTravelStyle(e.target.value)}
                className="mt-1 w-full text-sm bg-gray-50 border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="comfort">Comfort</option>
                <option value="adventure">Adventure</option>
                <option value="culture">Culture</option>
                <option value="luxury">Luxury</option>
                <option value="budget">Budget</option>
              </select>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-6">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
            Travel Preferences (`user_preferences`)
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700">Itinerary Pace</label>
              <select
                value={pace}
                onChange={(e) => setPace(e.target.value)}
                className="mt-1 w-full text-sm bg-gray-50 border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="relaxed">Relaxed (1-2 activities/day)</option>
                <option value="balanced">Balanced (2-3 activities/day)</option>
                <option value="packed">Packed (4+ activities/day)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700">Budget Band</label>
              <select
                value={budgetBand}
                onChange={(e) => setBudgetBand(e.target.value)}
                className="mt-1 w-full text-sm bg-gray-50 border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="low">Low (Economy)</option>
                <option value="mid">Mid (Standard)</option>
                <option value="high">High (Premium)</option>
                <option value="luxury">Luxury</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700">Interests (comma-separated)</label>
              <input
                type="text"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                className="mt-1 w-full text-sm bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 focus:bg-white focus:ring-2 focus:ring-blue-500"
                placeholder="heritage, food, nature, photography, hiking"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-6 flex items-center justify-between">
          <div className="flex items-center text-xs text-gray-400">
            <Shield className="w-4 h-4 mr-1.5 text-gray-400" />
            Preferences guide the AI Blended Common-Ground generator.
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-1.5" />
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </form>
    </div>
  );
};
