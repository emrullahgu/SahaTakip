import React, { createContext, useContext, useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { Alert } from 'react-native';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';

export interface VisitState {
  customerId: string;
  customerName: string;
  startTime: string; // ISO
  startLocation: { lat: number; lng: number };
  isActive: boolean;
}

interface VisitContextValue {
  activeVisit: VisitState | null;
  checkIn: (customerId: string, customerName: string) => Promise<boolean>;
  checkOut: (notes?: string, photos?: string[]) => Promise<boolean>;
  loading: boolean;
}

const VisitContext = createContext<VisitContextValue | undefined>(undefined);

export function VisitProvider({ children }: { children: React.ReactNode }) {
  const [activeVisit, setActiveVisit] = useState<VisitState | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const checkIn = async (customerId: string, customerName: string) => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Reddedildi', 'Konum izni olmadan check-in yapılamaz.');
        return false;
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });

      const newVisit: VisitState = {
        customerId,
        customerName,
        startTime: new Date().toISOString(),
        startLocation: {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        },
        isActive: true,
      };

      // if (user) {
      //   await supabase.from('visits').insert({
      //     user_id: user.id,
      //     customer_id: customerId,
      //     start_at: newVisit.startTime,
      //     start_lat: newVisit.startLocation.lat,
      //     start_lng: newVisit.startLocation.lng,
      //     status: 'active'
      //   });
      // }

      setActiveVisit(newVisit);
      return true;
    } catch (error) {
      console.error('Check-in error:', error);
      Alert.alert('Hata', 'Konum alınamadı.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const checkOut = async (notes?: string, photos?: string[]) => {
    if (!activeVisit) return false;
    setLoading(true);
    try {
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const endTime = new Date().toISOString();

      // if (user) {
      //   await supabase.from('visits')
      //     .update({
      //       end_at: endTime,
      //       end_lat: location.coords.latitude,
      //       end_lng: location.coords.longitude,
      //       notes,
      //       status: 'completed'
      //     })
      //     .eq('customer_id', activeVisit.customerId)
      //     .eq('status', 'active');
      // }

      setActiveVisit(null);
      Alert.alert('Başarılı', `${activeVisit.customerName} ziyareti tamamlandı.`);
      return true;
    } catch (error) {
      console.error('Check-out error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <VisitContext.Provider value={{ activeVisit, checkIn, checkOut, loading }}>
      {children}
    </VisitContext.Provider>
  );
}

export function useVisit() {
  const ctx = useContext(VisitContext);
  if (!ctx) throw new Error('useVisit must be used within VisitProvider');
  return ctx;
}
