import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { get, onValue, ref, remove } from 'firebase/database';
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, database } from '../services/firebaseConfig';

export default function TodayScreen({ navigation }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ totalCalories: 0, totalProtein: 0, avgSugar: 0 });

  // Dynamic limits state
  const [limits, setLimits] = useState({ calories: 2000, protein: 50 });

  useFocusEffect(React.useCallback(() => { loadData(); }, []));

  const getRecommendedLimits = (goal) => {
    switch (goal) {
      case 'Muscle Gain': return { calories: 2800, protein: 120 };
      case 'Weight Loss': return { calories: 1800, protein: 90 };
      case 'Heart Health': return { calories: 2000, protein: 60 };
      case 'Diabetes Control': return { calories: 1900, protein: 70 };
      default: return { calories: 2200, protein: 50 }; // General Health
    }
  };

  const loadData = async () => {
    const user = auth.currentUser;
    if (!user) { setLoading(false); return; }

    try {
      const settingsSnap = await get(ref(database, `users/${user.uid}/settings`));
      if (settingsSnap.exists()) {
        const data = settingsSnap.val();
        if (data.calculatedLimits) {
          // Use personalized limits
          setLimits(data.calculatedLimits);
        } else if (data.goal) {
          // Fallback to goal-based estimates
          setLimits(getRecommendedLimits(data.goal));
        }
      }
    } catch (err) {
      console.log("Error fetching settings", err);
    }

    const logsRef = ref(database, `users/${user.uid}/foodLogs`);
    const unsubscribe = onValue(logsRef, (snapshot) => {
      const data = snapshot.val();
      const todayLogs = [];

      if (data) {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        Object.keys(data).forEach((key) => {
          const log = data[key];
          if (log.timestamp >= todayStart) todayLogs.push({ id: key, ...log });
        });
      }

      todayLogs.sort((a, b) => b.timestamp - a.timestamp);
      setLogs(todayLogs);

      const totalCal = todayLogs.reduce((sum, log) => sum + (parseFloat(log.calories) || 0), 0);
      const totalProt = todayLogs.reduce((sum, log) => sum + (parseFloat(log.protein) || 0), 0);
      const avgSug = todayLogs.length > 0 ? todayLogs.reduce((sum, log) => sum + (parseFloat(log.sugar) || 0), 0) / todayLogs.length : 0;

      setSummary({
        totalCalories: Math.round(totalCal),
        totalProtein: Math.round(totalProt * 10) / 10,
        avgSugar: Math.round(avgSug * 10) / 10
      });
      setLoading(false);
    });

    return unsubscribe;
  };

  const deleteLog = async (logId) => {
    const user = auth.currentUser;
    if (user) {
      const logRef = ref(database, `users/${user.uid}/foodLogs/${logId}`);
      await remove(logRef);
    }
  };

  // Helper date
  const todayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  if (loading) return <View style={styles.centerContainer}><ActivityIndicator size="large" color="#208091" /></View>;

  return (
    <View style={styles.mainContainer}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Date Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Hello!</Text>
          <Text style={styles.dateText}>{todayDate}</Text>
        </View>

        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Daily Progress</Text>

          <View style={styles.chartRow}>
            <View style={styles.chartLabelRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialIcons name="local-fire-department" size={18} color="#e74c3c" />
                <Text style={styles.chartLabel}>Calories</Text>
              </View>
              <Text style={styles.chartValue}><Text style={{ fontWeight: 'bold', color: '#333' }}>{summary.totalCalories}</Text> / {limits.calories} kcal</Text>
            </View>
            <View style={styles.progressBarBg}>
              <LinearGradient
                colors={summary.totalCalories > limits.calories ? ['#e74c3c', '#c0392b'] : ['#208091', '#16a085']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBarFill, { width: `${Math.min((summary.totalCalories / limits.calories) * 100, 100)}%` }]}
              />
            </View>
          </View>

          <View style={styles.chartRow}>
            <View style={styles.chartLabelRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialIcons name="fitness-center" size={18} color="#27ae60" />
                <Text style={styles.chartLabel}>Protein</Text>
              </View>
              <Text style={styles.chartValue}><Text style={{ fontWeight: 'bold', color: '#333' }}>{summary.totalProtein}</Text> / {limits.protein} g</Text>
            </View>
            <View style={styles.progressBarBg}>
              <LinearGradient
                colors={['#27ae60', '#2ecc71']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBarFill, { width: `${Math.min((summary.totalProtein / limits.protein) * 100, 100)}%` }]}
              />
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Avg Sugar</Text>
              <Text style={[styles.statValue, { color: summary.avgSugar > 10 ? '#e74c3c' : '#27ae60' }]}>{summary.avgSugar}g</Text>
            </View>
          </View>

        </View>

        <View style={styles.logsSection}>
          <Text style={styles.logsTitle}>Meals Today ({logs.length})</Text>
          {logs.length === 0 ? (
            <View style={styles.emptyBox}>
              <MaterialIcons name="restaurant" size={48} color="#ddd" />
              <Text style={styles.emptyTitle}>No meals logged</Text>
              <Text style={styles.emptySubtitle}>Scan your first item to start tracking!</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('Scan')}>
                <Text style={styles.emptyBtnText}>Scan Now</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={logs}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View style={styles.logCard}>
                  <View style={[styles.logIcon, { backgroundColor: item.vegetarianStatus === 'Vegetarian' ? '#e8f5e9' : '#ffebee' }]}>
                    <Text style={{ fontSize: 20 }}>{item.vegetarianStatus === 'Vegetarian' ? '🥗' : '🥩'}</Text>
                  </View>
                  <View style={styles.logContent}>
                    <Text style={styles.logName} numberOfLines={1}>{item.productName}</Text>
                    <Text style={styles.logNutrition}>{item.calories} kcal • {item.protein}g protein</Text>
                  </View>
                  <TouchableOpacity onPress={() => deleteLog(item.id)} style={styles.deleteBtn}>
                    <MaterialIcons name="close" size={18} color="#aaa" />
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('Scan')}>
        <LinearGradient
          colors={['#208091', '#16a085']}
          style={styles.fabGradient}
        >
          <MaterialIcons name="photo-camera" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#f0f2f5' },
  container: { flex: 1, paddingHorizontal: 20 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: { marginTop: 60, marginBottom: 20 },
  greeting: { fontSize: 28, fontWeight: '800', color: '#333' },
  dateText: { fontSize: 14, color: '#666', fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },

  summarySection: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  summaryTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', marginBottom: 24 },

  chartRow: { marginBottom: 20 },
  chartLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' },
  chartLabel: { fontSize: 14, color: '#555', fontWeight: '600' },
  chartValue: { fontSize: 14, color: '#888' },
  progressBarBg: { height: 12, backgroundColor: '#f0f2f5', borderRadius: 6, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 6 },

  statsRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  statBox: { backgroundColor: '#f8f9fa', padding: 12, borderRadius: 12, alignItems: 'center', flex: 1 },
  statLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: '800' },

  logsSection: { marginBottom: 16 },
  logsTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', marginBottom: 16 },

  // Empty State
  emptyBox: {
    backgroundColor: '#fff',
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f0f2f5',
    borderStyle: 'dashed'
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginTop: 12 },
  emptySubtitle: { fontSize: 14, color: '#999', textAlign: 'center', marginTop: 4, marginBottom: 20 },
  emptyBtn: { backgroundColor: '#208091', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
  emptyBtnText: { color: '#fff', fontWeight: '600' },

  // List Item
  logCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  logIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  logContent: { flex: 1 },
  logName: { fontSize: 15, fontWeight: '700', color: '#333' },
  logNutrition: { fontSize: 13, color: '#666', marginTop: 2 },
  deleteBtn: { padding: 8 },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    shadowColor: '#208091',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fabGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center'
  }
});
