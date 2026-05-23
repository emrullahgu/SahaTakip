// ====================================================================
// ConnectionBanner — POZ-DEV-012
// AppContext.syncState'i okur, üstte küçük durum çubuğu gösterir.
// ====================================================================

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../context/AppContext';
import { isOnlineMode, getSyncQueue } from '../services/data';

export default function ConnectionBanner() {
  const { syncState } = useAppContext();
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

  return (
    <View style={[styles.banner, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={14} color="#fff" />
      <Text style={styles.text}>{label}</Text>
    </View>
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
