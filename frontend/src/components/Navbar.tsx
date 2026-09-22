import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../services/auth';
import { Compass, User, Plus, LogOut, Search } from 'lucide-react';

interface NavbarProps {
  backendOnline: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ backendOnline }) => {
  const { isAuthenticated, currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <Link
            to={isAuthenticated ? '/app' : '/'}
            className="flex items-center space-x-3 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md">
              WM
            </div>
            <div>
              <span className="text-xl font-bold text-gray-900 tracking-tight">WanderMatch</span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                PS-11
              </span>
            </div>
          </Link>

          {/* Navigation Links for Authenticated Users */}
          {isAuthenticated && (
            <nav className="hidden md:flex space-x-1">
              <Link
                to="/app"
                className={`flex items-center px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  isActive('/app')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Compass className="w-4 h-4 mr-1.5" />
                My Trips
              </Link>

              <Link
                to="/find"
                className={`flex items-center px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  isActive('/find')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Search className="w-4 h-4 mr-1.5" />
                Find Trips
              </Link>

              <Link
                to="/profile"
                className={`flex items-center px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  isActive('/profile')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <User className="w-4 h-4 mr-1.5" />
                Preferences
              </Link>
            </nav>
          )}

          {/* Right Action Controls */}
          <div className="flex items-center space-x-3">
            {/* Backend Health Indicator */}
            <div className="hidden sm:flex items-center space-x-1.5 text-[11px] text-gray-500 mr-1">
              <span className={`w-2 h-2 rounded-full ${backendOnline ? 'bg-green-500' : 'bg-red-500'}`} />
              <span>{backendOnline ? 'Online' : 'Offline'}</span>
            </div>

            {isAuthenticated ? (
              <>
                <Link
                  to="/trips/new"
                  className="flex items-center px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  New Trip
                </Link>

                {/* User Info & Avatar */}
                <div className="flex items-center space-x-2 pl-2 border-l border-gray-200">
                  <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                    {currentUser?.display_name?.charAt(0) || 'U'}
                  </div>
                  <span className="hidden sm:inline text-xs font-bold text-gray-700 max-w-[120px] truncate">
                    {currentUser?.display_name}
                  </span>
                  <button
                    onClick={handleLogout}
                    title="Sign Out"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  Create Account
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
