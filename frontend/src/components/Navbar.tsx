import React from 'react';
import { useAuth } from '../services/auth';
import { Compass, Users, MessageSquare, GitBranch, Camera, UserCheck, User, Plus } from 'lucide-react';

interface NavbarProps {
  activeScreen: string;
  setActiveScreen: (s: string) => void;
  backendOnline: boolean;
  onOpenCreateTrip: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeScreen,
  setActiveScreen,
  backendOnline,
  onOpenCreateTrip,
}) => {
  const { userId, setUserId, availableSeedUsers } = useAuth();

  const navItems = [
    { id: 'trip-home', label: 'Trip Home', icon: Compass },
    { id: 'slot-detail', label: 'Slot Detail', icon: Users },
    { id: 'profile', label: 'Profile & Prefs', icon: User },
    { id: 'branch-view', label: 'Branch View', icon: GitBranch },
    { id: 'trip-chat', label: 'Trip Chat', icon: MessageSquare },
    { id: 'solo-match', label: 'Solo Match', icon: UserCheck },
    { id: 'face-reg', label: 'Face Registration', icon: Camera },
  ];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveScreen('trip-home')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md">
              WM
            </div>
            <div>
              <span className="text-xl font-bold text-gray-900 tracking-tight">WanderMatch</span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">PS-11</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeScreen === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveScreen(item.id)}
                  className={`flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 mr-1.5" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Persona Switcher & Controls */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onOpenCreateTrip}
              className="flex items-center px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              New Trip
            </button>

            <div className="flex items-center space-x-1.5 text-[11px] text-gray-500">
              <span className={`w-2 h-2 rounded-full ${backendOnline ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="hidden sm:inline">{backendOnline ? 'Online' : 'Offline'}</span>
            </div>

            <div className="flex items-center">
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="text-xs bg-gray-50 border border-gray-300 rounded-md px-2 py-1.5 font-medium text-gray-700"
              >
                {availableSeedUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
