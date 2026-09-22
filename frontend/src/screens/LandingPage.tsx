import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../services/auth';
import { Users, Vote, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { isAuthenticated, currentUser } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/50 via-white to-gray-50 flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold mb-6 animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            <span>KogniVera Hackathon 2026 · PS-11 Real Architecture</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight max-w-4xl mx-auto">
            Travel Together, <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Without the Drama.</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            The collaborative travel platform built on democratic consensus. Propose activities, vote in real-time, state mandatory objection reasons, and build the ultimate conflict-free group itinerary.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            {isAuthenticated ? (
              <Link
                to="/app"
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-lg shadow-blue-500/25 transition-all transform hover:-translate-y-0.5"
              >
                Go to My Dashboard ({currentUser?.display_name})
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-lg shadow-blue-500/25 transition-all transform hover:-translate-y-0.5"
                >
                  Create Free Account
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
                <Link
                  to="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-xl bg-white hover:bg-gray-50 text-gray-800 font-semibold text-base border border-gray-300 shadow-xs transition-all"
                >
                  Sign In to Existing Account
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 bg-white border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">How WanderMatch Solves Group Planning</h2>
            <p className="mt-2 text-gray-500 text-sm sm:text-base">Built to eliminate messy WhatsApp groups and endless schedule conflicts.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-gray-50 border border-gray-100 hover:border-blue-200 transition-all">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-5">
                <Vote className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Democratic Proposals & Voting</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Any member can propose to add, remove, reschedule, or replace itinerary slots. Real-time voting tallies update instantly via WebSockets across all devices.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-gray-50 border border-gray-100 hover:border-blue-200 transition-all">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-5">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Mandatory Typed Objections</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                No passive-aggressive downvotes. Voting "NO" strictly requires typing a concrete reason, fostering productive compromise and transparent discussion.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-gray-50 border border-gray-100 hover:border-blue-200 transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-5">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Mode A & Mode NA Modes</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Choose between <strong>Admin-Led (Mode A)</strong> where the designated trip owner resolves proposals, or <strong>Collaborative (Mode NA)</strong> featuring 10-minute consensus windows.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Simple CTA Banner */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-indigo-700 text-white text-center">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-extrabold mb-4">Ready to plan your next journey?</h2>
          <p className="text-blue-100 text-base mb-8 max-w-xl mx-auto">
            Experience truly persistent, database-backed collaborative travel planning with zero mock data.
          </p>
          <Link
            to={isAuthenticated ? "/app" : "/register"}
            className="inline-flex items-center px-8 py-3.5 rounded-xl bg-white text-blue-700 hover:bg-blue-50 font-bold text-base shadow-lg transition-all"
          >
            {isAuthenticated ? "Open My Dashboard" : "Start Planning Now"}
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
};
