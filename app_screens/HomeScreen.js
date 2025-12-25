import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { get, onValue, ref } from 'firebase/database';
import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, FONTS, SHADOWS, SPACING } from '../constants/theme.js';
import { auth, database } from '../services/firebaseConfig';

export default function HomeScreen({ navigation }) {
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState({ totalCalories: 0, totalProtein: 0, avgSugar: 0 });
    const [limits, setLimits] = useState({ calories: 2000, protein: 50 });

    useFocusEffect(React.useCallback(() => { loadData(); }, []));

    const getRecommendedLimits = (goal) => {
        switch (goal) {
            case 'Muscle Gain': return { calories: 2800, protein: 120 };
            case 'Weight Loss': return { calories: 1800, protein: 90 };
            case 'Heart Health': return { calories: 2000, protein: 60 };
            case 'Diabetes Control': return { calories: 1900, protein: 70 };
            default: return { calories: 2200, protein: 50 };
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
                    setLimits(data.calculatedLimits);
                } else if (data.goal) {
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

    const todayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    const calPercent = Math.min((summary.totalCalories / limits.calories) * 100, 100);
    const protPercent = Math.min((summary.totalProtein / limits.protein) * 100, 100);

    if (loading) return <View style={styles.centerContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

    return (
        <View style={styles.mainContainer}>
            <ScrollView
                style={styles.container}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.dateText}>{todayDate}</Text>
                        <Text style={styles.greeting}>Hello!</Text>
                    </View>
                    <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.avatarPlaceholder}>
                        <MaterialIcons name="person" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                </View>

                {/* Main Summary Card */}
                <View style={styles.summarySection}>
                    <Text style={styles.summaryTitle}>Daily Summary</Text>

                    <View style={styles.calorieRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.bigCalValue}>{summary.totalCalories}</Text>
                            <Text style={styles.bigCalLabel}>kcal eaten</Text>
                            <Text style={styles.goalText}>Goal: {limits.calories}</Text>
                        </View>
                        <View style={styles.ringContainer}>
                            <View style={[styles.ringInner, { borderColor: calPercent > 100 ? COLORS.error : COLORS.primary, borderRightColor: '#eee', borderBottomColor: '#eee' }]}>
                                <MaterialIcons name="local-fire-department" size={32} color={calPercent > 100 ? COLORS.error : COLORS.primary} />
                            </View>
                        </View>
                    </View>

                    <View style={styles.progressBarBg}>
                        <LinearGradient
                            colors={calPercent > 100 ? [COLORS.error, '#EF4444'] : [COLORS.gradientStart, COLORS.gradientEnd]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={[styles.progressBarFill, { width: `${calPercent}%` }]}
                        />
                    </View>

                    <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                            <View style={styles.statHeader}>
                                <Text style={styles.statLabel}>Protein</Text>
                                <Text style={styles.statGoal}>{limits.protein}g goal</Text>
                            </View>
                            <View style={styles.miniBarBg}>
                                <View style={[styles.miniBarFill, { width: `${protPercent}%`, backgroundColor: COLORS.secondary }]} />
                            </View>
                            <Text style={styles.statValue}>{summary.totalProtein}g</Text>
                        </View>

                        <View style={styles.statBox}>
                            <View style={styles.statHeader}>
                                <Text style={styles.statLabel}>Avg Sugar</Text>
                            </View>
                            <Text style={[styles.statValue, { color: summary.avgSugar > 10 ? COLORS.warning : COLORS.success, marginTop: 8 }]}>
                                {summary.avgSugar}g
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Action Call */}
                <View style={styles.actionCard}>
                    <Text style={styles.actionTitle}>Track your next meal</Text>
                    <Text style={styles.actionText}>Scan a label to update your daily stats.</Text>
                </View>

            </ScrollView>

            {/* FAB - Quick Scan */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    navigation.navigate('Scan');
                }}
                activeOpacity={0.8}
            >
                <LinearGradient
                    colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                    style={styles.fabGradient}
                >
                    <MaterialIcons name="add-a-photo" size={28} color="#fff" />
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: COLORS.background },
    container: { flex: 1, paddingHorizontal: SPACING.l },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },

    header: {
        marginTop: 60,
        marginBottom: SPACING.l,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    dateText: { fontSize: 13, color: COLORS.textSecondary, fontFamily: FONTS.semiBold, textTransform: 'uppercase', letterSpacing: 0.5 },
    greeting: { fontSize: 28, fontFamily: FONTS.bold, color: COLORS.textPrimary, marginTop: 4 },
    avatarPlaceholder: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: '#E0E7FF',
        justifyContent: 'center', alignItems: 'center'
    },

    summarySection: {
        backgroundColor: COLORS.surface,
        padding: SPACING.l,
        borderRadius: 24,
        marginBottom: SPACING.l,
        ...SHADOWS.md
    },
    summaryTitle: { fontSize: 16, fontFamily: FONTS.semiBold, color: COLORS.textSecondary, marginBottom: SPACING.s },

    calorieRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.m },
    bigCalValue: { fontSize: 36, fontFamily: FONTS.bold, color: COLORS.textPrimary },
    bigCalLabel: { fontSize: 14, fontFamily: FONTS.regular, color: COLORS.textLight },
    goalText: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },

    ringContainer: { width: 60, height: 60 },
    ringInner: {
        width: '100%', height: '100%', borderRadius: 30, borderWidth: 4,
        justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '-45deg' }]
    },

    progressBarBg: { height: 8, backgroundColor: COLORS.background, borderRadius: 4, overflow: 'hidden', marginBottom: SPACING.l },
    progressBarFill: { height: '100%', borderRadius: 4 },

    statsRow: { flexDirection: 'row', gap: SPACING.m },
    statBox: {
        flex: 1, backgroundColor: COLORS.background, padding: SPACING.m,
        borderRadius: 16, justifyContent: 'space-between'
    },
    statHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    statLabel: { fontSize: 12, fontFamily: FONTS.semiBold, color: COLORS.textSecondary },
    statGoal: { fontSize: 10, fontFamily: FONTS.regular, color: COLORS.textLight },
    miniBarBg: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, marginBottom: 8 },
    miniBarFill: { height: '100%', borderRadius: 3 },
    statValue: { fontSize: 18, fontFamily: FONTS.bold, color: COLORS.textPrimary },

    actionCard: {
        backgroundColor: '#ECFDF5',
        padding: SPACING.m,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.primaryLight
    },
    actionTitle: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.primaryDark },
    actionText: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.secondary, marginTop: 4 },

    fab: {
        position: 'absolute',
        bottom: SPACING.l,
        right: SPACING.l,
        ...SHADOWS.lg,
    },
    fabGradient: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center'
    }
});
