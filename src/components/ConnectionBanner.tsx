// ====================================================================
// ConnectionBanner — POZ-DEV-012
// AppContext.syncState'i okur, üstte küçük durum çubuğu gösterir.
// ====================================================================

import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { navigationRef } from '../navigation';
import { isOnlineMode, getSyncQueue } from '../services/data';

export default function ConnectionBanner() {
  const { syncState } = useAppContext();
  const { isDemoMode } = useAuth();
  const [queueLen, setQueueLen] = useState(0);

  useEffect(() => {
    let mounted = true;
    const tick = async () => {
      const q = await getSyncQueue();
      if (mounted) setQueueLen(q.length);
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [syncState]);

  // Demo modda kuyruk anlamsız (Supabase'e drain edilmez) — banner'ı gizle
  if (isDemoMode) return null;
  // Online + boş kuyruk = gizli (UX kalabalığı yapmaz)
  if (isOnlineMode() && syncState === 'idle' && queueLen === 0) return null;

  let bg = '#475569';
  let icon: keyof typeof Ionicons.glyphMap = 'cloud-offline-outline';
  let label = 'Çevrimdışı mod';

  if (syncState === 'syncing') {
    bg = '#f59e0b';
    icon = 'sync-outline';
    label = 'Senkronize ediliyor…';
  } else if (syncState === 'error') {
    bg = '#dc2626';
    icon = 'alert-circle-outline';
    label = 'Senkronizasyon hatası';
  } else if (queueLen > 0) {
    bg = '#f59e0b';
    icon = 'time-outline';
    label = `${queueLen} işlem bekliyor`;
  }

  const tappable = queueLen > 0;
  const onPress = () => {
    if (tappable && navigationRef.isReady()) {
      navigationRef.navigate('OfflineQueue' as never);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={tappable ? 0.7 : 1}
      disabled={!tappable}
      onPress={onPress}
      style={[styles.banner, { backgroundColor: bg }]}
    >
      <Ionicons name={icon} size={14} color="#fff" />
      <Text style={styles.text}>{label}</Text>
      {tappable ? <Ionicons name="chevron-forward" size={14} color="#fff" /> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    gap: 6,
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
