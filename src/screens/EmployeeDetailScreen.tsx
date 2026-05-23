// ====================================================================
// EmployeeDetailScreen — POZ-DEV-013
// Personel detay: bilgi, son konum, mesai geçmişi, puantaj
// ====================================================================
import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius, typography, brand } from '../theme';
import { RootStackParamList } from '../types';
import { useAppContext } from '../context/AppContext';
import { locationsRepo, LocationRow } from '../services/data/locationsRepo';
import { shiftsRepo, Shift } from '../services/data/shiftsRepo';

type Params = { employeeId: string };

export default function EmployeeDetailScreen() {
  const route = useRoute<RouteProp<Record<string, Params>, string>>();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { employees } = useAppContext();
  const employee = employees.find(e => e.id === route.params.employeeId);

  const [latest, setLatest] = useState<LocationRow | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!employee) return;
      // Konum & shifts (DB user_id employee.id ile eşleşmiyorsa boş döner, sorun değil)
      const all = await locationsRepo.latestAll();
      setLatest(all.find(l => l.employeeId === employee.id || l.userId === employee.id) ?? null);
      const list = await shiftsRepo.listMine(employee.id, 10);
      setShifts(list);
      setLoading(false);
    })();
  }, [employee]);

  const attendanceDays = useMemo(
    () => Object.entries(employee?.attendance ?? {}).slice(-7),
    [employee]
  );

  if (!employee) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.empty}>Personel bulunamadı.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{employee.name.slice(0, 2).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{employee.name}</Text>
            <Text style={styles.role}>{employee.role}</Text>
          </View>
        </View>

        {/* Konum kartı */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="location" size={16} color={brand.green} />
            <Text style={styles.cardTitle}>Son Konum</Text>
          </View>
          {loading ? (
            <ActivityIndicator color={brand.green} />
          ) : latest ? (
            <>
              <Text style={styles.coord}>
                {latest.lat.toFixed(5)}, {latest.lng.toFixed(5)}
              </Text>
              <Text style={styles.meta}>
                {new Date(latest.recordedAt).toLocaleString('tr-TR')}
                {latest.isMock && '  ⚠️ Sahte konum şüphesi'}
              </Text>
            </>
          ) : (
            <Text style={styles.meta}>Konum kaydı yok.</Text>
          )}
        </View>

        {/* Ücret bilgisi */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="wallet" size={16} color={brand.green} />
            <Text style={styles.cardTitle}>Ücret</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.lbl}>Aylık</Text>
            <Text style={styles.val}>₺{employee.monthlyWage.toLocaleString('tr-TR')}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.lbl}>Yevmiye</Text>
            <Text style={styles.val}>₺{employee.dailyRate.toLocaleString('tr-TR')}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.lbl}>Çalışılan Gün (ay)</Text>
            <Text style={styles.val}>{employee.daysWorked}</Text>
          </View>
        </View>

        {/* Mesai geçmişi */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="time" size={16} color={brand.green} />
            <Text style={styles.cardTitle}>Son Vardiyalar</Text>
          </View>
          {shifts.length === 0 ? (
            <Text style={styles.meta}>Henüz vardiya kaydı yok.</Text>
          ) : (
            shifts.map(s => (
              <View key={s.id} style={styles.row}>
                <Text style={styles.lbl}>
                  {new Date(s.startAt).toLocaleDateString('tr-TR')}
                </Text>
                <Text style={styles.val}>
                  {new Date(s.startAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  {' → '}
                  {s.endAt
                    ? new Date(s.endAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
                    : 'devam ediyor'}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Son 7 puantaj */}
        {attendanceDays.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="calendar" size={16} color={brand.green} />
              <Text style={styles.cardTitle}>Son 7 Puantaj</Text>
            </View>
            {attendanceDays.map(([date, status]) => (
              <View key={date} style={styles.row}>
                <Text style={styles.lbl}>{date}</Text>
                <Text style={[styles.val, { color: status === 'Tam' ? brand.green : colors.amber.default }]}>
                  {status}
                </Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: brand.green }]}
          onPress={() =>
            nav.navigate('LocationHistory', { userId: employee.id, employeeName: employee.name })
          }
        >
          <Ionicons name="map" size={18} color="#fff" />
          <Text style={styles.backTxt}>Konum Geçmişi</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => nav.goBack()}
        >
          <Ionicons name="arrow-back" size={18} color="#fff" />
          <Text style={styles.backTxt}>Geri</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.primary },
  empty: { color: colors.text.muted, textAlign: 'center', marginTop: 80 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.bg.card,
    borderRadius: radius.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: brand.green,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '900', fontSize: typography.lg },
  name: { color: colors.text.primary, fontSize: typography.lg, fontWeight: '900' },
  role: { color: colors.text.muted, fontSize: typography.sm, marginTop: 2 },
  card: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  cardTitle: { color: colors.text.primary, fontWeight: '800', fontSize: typography.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  lbl: { color: colors.text.muted, fontSize: typography.sm },
  val: { color: colors.text.primary, fontWeight: '700', fontSize: typography.sm },
  coord: { color: colors.text.primary, fontWeight: '800', fontSize: typography.md },
  meta: { color: colors.text.muted, fontSize: typography.xs, marginTop: 4 },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.bg.secondary,
    paddingVertical: 14,
    borderRadius: radius.md,
  },
  backTxt: { color: '#fff', fontWeight: '700' },
});
