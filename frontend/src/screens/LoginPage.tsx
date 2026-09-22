import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../services/auth';
import { LogIn, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email or user ID');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(email.trim());
      navigate('/app');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please verify your email.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (identifier: string) => {
    setEmail(identifier);
    setError(null);
    setLoading(true);
    try {
      await login(identifier);
      navigate('/app');
    } catch (err: any) {
      setError(err.message || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center space-x-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md text-lg">
            WM
          </div>
          <span className="text-2xl font-black text-gray-900 tracking-tight">WanderMatch</span>
        </Link>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Sign in to your account</h2>
        <p className="mt-1 text-sm text-gray-500">
          Or{' '}
          <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-500">
            create a new account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-gray-200 rounded-2xl sm:px-10">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start space-x-3 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Email Address or User ID
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  type="text"
                  required
                  placeholder="e.g. alex.carter@example.com or usr_0f22b1"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all"
            >
              {loading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Quick Test Accounts */}
          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-center mb-3">
              Quick Test Seed Personas (PS-11)
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('usr_0f22b1')}
                className="p-2 text-left rounded-lg bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 text-gray-700 hover:text-blue-800 transition-colors"
              >
                <div className="font-bold">Alex Carter</div>
                <div className="text-[10px] text-gray-500">Trip Owner</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('usr_1a2b3c')}
                className="p-2 text-left rounded-lg bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 text-gray-700 hover:text-blue-800 transition-colors"
              >
                <div className="font-bold">Rohan Sharma</div>
                <div className="text-[10px] text-gray-500">Trip Member</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
