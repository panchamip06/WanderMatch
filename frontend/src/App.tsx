import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './services/auth';
import { ApiService } from './services/api';
import { TripWebSocketClient } from './services/websocket';
import type { Trip, ItineraryItem, Proposal } from './types';
import { Navbar } from './components/Navbar';
import { TripHomeScreen } from './screens/TripHomeScreen';
import { SlotDetailScreen } from './screens/SlotDetailScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { CreateTripModal } from './screens/CreateTripModal';
import { BranchViewScreen } from './screens/BranchViewScreen';
import { TripChatScreen } from './screens/TripChatScreen';
import { SoloMatchScreen } from './screens/SoloMatchScreen';
import { FaceRegistrationScreen } from './screens/FaceRegistrationScreen';

const MainApp: React.FC = () => {
  const { userId } = useAuth();
  const [activeScreen, setActiveScreen] = useState<string>('trip-home');
  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [selectedItem, setSelectedItem] = useState<ItineraryItem | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  const fetchTrips = useCallback(async () => {
    try {
      const fetchedTrips = await ApiService.getTrips();
      setTrips(fetchedTrips);
      if (fetchedTrips.length > 0 && !selectedTrip) {
        const fullTrip = await ApiService.getTripDetail(fetchedTrips[0].trip_id);
        setSelectedTrip(fullTrip);
        if (fullTrip.active_itinerary?.items?.length) {
          setSelectedItem(fullTrip.active_itinerary.items[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching trips:', err);
    }
  }, [selectedTrip]);

  const refreshCurrentTrip = useCallback(async () => {
    if (!selectedTrip) return;
    try {
      const refreshed = await ApiService.getTripDetail(selectedTrip.trip_id);
      setSelectedTrip(refreshed);
      // update in trips array
      setTrips((prev) => prev.map((t) => (t.trip_id === refreshed.trip_id ? refreshed : t)));
    } catch (e) {
      console.error('Error refreshing trip:', e);
    }
  }, [selectedTrip]);

  // Health and trips load
  useEffect(() => {
    ApiService.checkHealth()
      .then(() => setBackendOnline(true))
      .catch(() => setBackendOnline(false));

    fetchTrips();
  }, [fetchTrips]);

  // Fetch proposals for the selected trip
  const refreshProposals = useCallback(async () => {
    if (!selectedTrip) return;
    try {
      const fetched = await ApiService.getProposals(selectedTrip.trip_id);
      setProposals(fetched);
    } catch (e) {
      console.error('Error loading proposals:', e);
    }
  }, [selectedTrip]);

  useEffect(() => {
    refreshProposals();
  }, [refreshProposals]);

  // Handle trip selection
  const handleSelectTrip = async (trip: Trip) => {
    try {
      const full = await ApiService.getTripDetail(trip.trip_id);
      setSelectedTrip(full);
      if (full.active_itinerary?.items?.length) {
        setSelectedItem(full.active_itinerary.items[0]);
      } else {
        setSelectedItem(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTripCreatedOrJoined = (trip: Trip) => {
    setTrips((prev) => [trip, ...prev]);
    setSelectedTrip(trip);
    if (trip.active_itinerary?.items?.length) {
      setSelectedItem(trip.active_itinerary.items[0]);
    } else {
      setSelectedItem(null);
    }
    setActiveScreen('trip-home');
  };

  // Real-time WebSocket connection to active trip
  useEffect(() => {
    if (!selectedTrip) return;

    const wsClient = new TripWebSocketClient(selectedTrip.trip_id, userId);
    wsClient.connect();

    const unsubscribe = wsClient.subscribe((msg: any) => {
      console.log('[App] Received live WebSocket event:', msg);
      if (msg.type === 'vote_cast' || msg.type === 'proposal_created') {
        refreshProposals();
      } else if (msg.type === 'itinerary_updated' || msg.type === 'member_joined') {
        refreshCurrentTrip();
      }
    });

    return () => {
      unsubscribe();
      wsClient.disconnect();
    };
  }, [selectedTrip?.trip_id, userId, refreshProposals, refreshCurrentTrip]);

  const handleOpenSlot = (item: ItineraryItem) => {
    setSelectedItem(item);
    setActiveScreen('slot-detail');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
      <Navbar
        activeScreen={activeScreen}
        setActiveScreen={setActiveScreen}
        backendOnline={backendOnline}
        onOpenCreateTrip={() => setIsCreateModalOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeScreen === 'trip-home' && (
          <TripHomeScreen
            trips={trips}
            selectedTrip={selectedTrip}
            onSelectTrip={handleSelectTrip}
            onOpenSlot={handleOpenSlot}
            onRefreshTrip={refreshCurrentTrip}
            onOpenCreateTrip={() => setIsCreateModalOpen(true)}
          />
        )}

        {activeScreen === 'slot-detail' && (
          <SlotDetailScreen
            trip={selectedTrip}
            selectedItem={selectedItem}
            onBack={() => setActiveScreen('trip-home')}
            liveProposals={proposals}
            onRefreshProposals={refreshProposals}
          />
        )}

        {activeScreen === 'profile' && <ProfileScreen />}
        {activeScreen === 'branch-view' && <BranchViewScreen />}
        {activeScreen === 'trip-chat' && <TripChatScreen />}
        {activeScreen === 'solo-match' && <SoloMatchScreen />}
        {activeScreen === 'face-reg' && <FaceRegistrationScreen />}
      </main>

      <CreateTripModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onTripCreatedOrJoined={handleTripCreatedOrJoined}
        availableTrips={trips}
      />

      <footer className="bg-white border-t border-gray-200 py-4 text-center text-xs text-gray-400">
        WanderMatch · KogniVera Hackathon 2026 · PS-11 Architecture
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
};

export default App;
