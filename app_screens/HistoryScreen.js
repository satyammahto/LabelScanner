import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { onValue, ref, remove } from 'firebase/database';
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, FONTS, SHADOWS, SPACING } from '../constants/theme.js';
import { auth, database } from '../services/firebaseConfig';

export default function HistoryScreen({ navigation }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(React.useCallback(() => { loadData(); }, []));

  const loadData = async () => {
    const user = auth.currentUser;
    if (!user) { setLoading(false); return; }

    const logsRef = ref(database, `users/${user.uid}/foodLogs`);
    const unsubscribe = onValue(logsRef, (snapshot) => {
      const data = snapshot.val();
      const allLogs = [];

      if (data) {
        Object.keys(data).forEach((key) => {
          allLogs.push({ id: key, ...data[key] });
        });
      }

      // Sort by newest first
      allLogs.sort((a, b) => b.timestamp - a.timestamp);
      setLogs(allLogs);
      setLoading(false);
    });

    return unsubscribe;
  };

  const deleteLog = async (logId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const user = auth.currentUser;
    if (user) {
      const logRef = ref(database, `users/${user.uid}/foodLogs/${logId}`);
      await remove(logRef);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <View style={styles.centerContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <View style={styles.mainContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
      </View>

      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: SPACING.l, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <MaterialIcons name="history" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>No history yet</Text>
            <Text style={styles.emptySubtitle}>Scanned items will appear here.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.logCard}>
            <View style={[styles.logIcon, { backgroundColor: item.vegetarianStatus === 'Vegetarian' ? '#ECFDF5' : '#FEF2F2' }]}>
              <Text style={{ fontSize: 22 }}>{item.vegetarianStatus === 'Vegetarian' ? '🥗' : '🥩'}</Text>
            </View>
            <TouchableOpacity
              style={styles.logContent}
              onPress={() => navigation.navigate('Result', { savedAnalysis: item })}
            >
              <Text style={styles.logDate}>{formatDate(item.timestamp)}</Text>
              <Text style={styles.logName} numberOfLines={1}>{item.productName}</Text>
              <Text style={styles.logNutrition}>{item.calories} kcal • {item.protein}g protein</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => deleteLog(item.id)}
              style={styles.deleteBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons name="delete-outline" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: COLORS.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },

  header: {
    paddingTop: 60,
    paddingBottom: SPACING.m,
    paddingHorizontal: SPACING.l,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  title: { fontSize: 24, fontFamily: FONTS.bold, color: COLORS.textPrimary },

  // Empty State
  emptyBox: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyTitle: { fontSize: 18, fontFamily: FONTS.semiBold, color: COLORS.textPrimary, marginTop: 16 },
  emptySubtitle: { fontSize: 14, fontFamily: FONTS.regular, color: COLORS.textLight, marginTop: 4 },

  // List Item
  logCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.m,
    marginBottom: SPACING.s,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  logIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.m },
  logContent: { flex: 1 },
  logDate: { fontSize: 10, fontFamily: FONTS.regular, color: COLORS.textLight, marginBottom: 2 },
  logName: { fontSize: 16, fontFamily: FONTS.semiBold, color: COLORS.textPrimary },
  logNutrition: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 2 },
  deleteBtn: { padding: SPACING.s },
});
