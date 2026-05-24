// ====================================================================
// BulkAssignScreen — POZ-DEV-028
// ====================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, brand } from '../theme';
import { RootStackParamList } from '../types';
import { useAppContext } from '../context/AppContext';
import { statusColor } from '../services/workOrderFlow';
import BulkSelectionBar from '../components/BulkSelectionBar';
import EmptyState from '../components/EmptyState';

type Props = NativeStackScreenProps<RootStackParamList, 'BulkAssign'>;

export default function BulkAssignScreen({ navigation }: Props) {
  const { workOrders, employees, bulkAssignWorkOrders } = useAppContext();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [empId, setEmpId] = useState<string | null>(null);

  const eligible = workOrders.filter(
    w => w.status === 'Bekliyor' || w.status === 'Atandı',
  );

  const toggle = (id: string) =>
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  const submit = () => {
    if (!selectedIds.length) {
      Alert.alert('Seçim yok', 'En az bir iş emri seçin.');
      return;
    }
    if (!empId) {
      Alert.alert('Personel yok', 'Bir personel seçin.');
      return;
    }
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;
    bulkAssignWorkOrders(selectedIds, emp.id, emp.name);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. İş Emirlerini Seç</Text>
          {eligible.length === 0 ? (
            <EmptyState
              icon="clipboard-outline"
              title="Atanabilir iş yok"
              subtitle="Şu an bekleyen durumunda iş emri bulunmuyor."
            />
          ) : (
            eligible.map(w => {
              const sel = selectedIds.includes(w.id);
              return (
                <TouchableOpacity key={w.id} style={styles.row} onPress={() => toggle(w.id)}>
                  <Ionicons
                    name={sel ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={sel ? brand.green : colors.text.muted}
                  />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.title}>{w.serviceName}</Text>
                    <Text style={styles.sub}>
                      {w.client} · {w.id}
                    </Text>
                  </View>
                  <View style={[styles.statusDot, { backgroundColor: statusColor(w.status) }]} />
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Personel Seç</Text>
          {employees.map(emp => {
            const sel = empId === emp.id;
            return (
              <TouchableOpacity key={emp.id} style={styles.row} onPress={() => setEmpId(emp.id)}>
                <Ionicons
                  name={sel ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={sel ? brand.green : colors.text.muted}
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.title}>{emp.name}</Text>
                  <Text style={styles.sub}>{emp.role}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <BulkSelectionBar
        count={selectedIds.length}
        onClear={() => setSelectedIds([])}
        onAction={() => submit()}
        actions={[
          { key: 'assign', label: 'Toplu Ata', icon: 'checkmark-circle', color: brand.green }
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  section: {
    margin: 12,
    padding: 12,
    backgroundColor: colors.bg.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  sectionTitle: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  empty: { color: colors.text.muted, fontSize: 13, paddingVertical: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  title: { color: colors.text.primary, fontSize: 14, fontWeight: '600' },
  sub: { color: colors.text.muted, fontSize: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  submit: {
    flexDirection: 'row',
    backgroundColor: brand.green,
    margin: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  submitText: { color: colors.bg.primary, fontWeight: '700' },
});
