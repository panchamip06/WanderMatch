import React, { createContext, useContext, useState } from 'react';
import type { User } from '../types';

interface AuthContextType {
  currentUser: User | null;
  setCurrentUser: (u: User | null) => void;
  userId: string;
  setUserId: (id: string) => void;
  availableSeedUsers: { id: string; name: string; role: string }[];
}

const DEFAULT_USERS = [
  { id: 'usr_0f22b1', name: 'Alex Carter (Owner)', role: 'Trip Admin' },
  { id: 'usr_1a2b3c', name: 'Rohan Sharma', role: 'Trip Member' },
  { id: 'usr_2d3e4f', name: 'Priya Patel', role: 'Trip Member' },
  { id: 'usr_3g4h5i', name: 'Ananya Iyer', role: 'Solo Traveller' },
];

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  setCurrentUser: () => {},
  userId: DEFAULT_USERS[0].id,
  setUserId: () => {},
  availableSeedUsers: DEFAULT_USERS,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userId, setUserId] = useState<string>(DEFAULT_USERS[0].id);
  const [currentUser, setCurrentUser] = useState<User | null>({
    user_id: DEFAULT_USERS[0].id,
    display_name: DEFAULT_USERS[0].name,
    email: 'alex.carter@example.invalid',
    home_city_id: 'cty_b52d9a',
    home_currency: 'INR',
    locale: 'en-IN',
    budget_band: 'mid',
    travel_style: 'comfort',
    traveller_type: 'friends',
    segment: 'heavy',
    status: 'active',
  });

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        userId,
        setUserId,
        availableSeedUsers: DEFAULT_USERS,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
