import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { get, push, ref, serverTimestamp } from 'firebase/database';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ImageBackground,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { COLORS, FONTS, SHADOWS, SPACING } from '../constants/theme.js';
import { auth, database } from '../services/firebaseConfig';
import { analyzeImageWithGemini } from '../services/geminiService';

const { height } = Dimensions.get('window');

export default function ResultScreen({ route, navigation }) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [productName, setProductName] = useState('');

  const savedAnalysis = route?.params?.savedAnalysis;
  const imageUri = savedAnalysis?.imageUri || route?.params?.imageUri || '';

  useEffect(() => {
    if (savedAnalysis) {
      setAnalysis(savedAnalysis);
      setProductName(savedAnalysis.productName || '');
    } else if (imageUri) {
      processImage(imageUri);
    }
  }, [imageUri, savedAnalysis]);

  const processImage = async (uri) => {
    setLoading(true);
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });

      // Get User Settings
      const user = auth.currentUser;
      let userProfile = { vegType: 'Vegetarian', goal: 'General Health' };

      if (user) {
        const snapshot = await get(ref(database, `users/${user.uid}/settings`));
        if (snapshot.exists()) {
          const s = snapshot.val();
          const diet = s.diet ? (Array.isArray(s.diet) ? s.diet.join(', ') : s.diet) : 'Vegetarian';
          userProfile = {
            vegType: diet,
            goal: s.goal || 'General Health'
          };
        }
      }

      const data = await analyzeImageWithGemini(base64, userProfile);

      if (data) {
        setAnalysis(data);
        if (data.productName) setProductName(data.productName);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("Process Image Error:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      if (error.message.includes('429')) {
        Alert.alert('Quota Exceeded', 'You are scanning too fast! Please wait a moment and try again.');
      } else {
        Alert.alert('Error', 'Could not analyze image. Please try again. \n' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const saveToLog = async () => {
    if (!analysis || !productName.trim()) {
      Alert.alert('Required', 'Please enter a product name');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'User not logged in');
        return;
      }

      const logsRef = ref(database, `users/${user.uid}/foodLogs`);
      await push(logsRef, {
        timestamp: serverTimestamp(),
        productName,
        ...analysis,
        imageUri,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.navigate('Home');
    } catch (error) {
      Alert.alert('Error', 'Failed to save to Firebase.');
    }
  };

  const shareResult = async () => {
    if (!analysis) return;
    try {
      const message = `I just analyzed ${productName} with LabelScanner!\n\nHealth Score: ${analysis.healthScore}/100\nKey Insight: ${analysis.healthInsight}`;
      await Share.share({ message });
    } catch (error) {
      Alert.alert(error.message);
    }
  };

  // Helper for colors
  const getScoreColor = (score) => {
    if (score >= 75) return COLORS.success;
    if (score >= 40) return COLORS.warning;
    return COLORS.error;
  };

  // Case 1: Accessed via Tab Bar (No Image)
  if (!imageUri && !savedAnalysis) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="qr-code-scanner" size={64} color={COLORS.textLight} />
        <Text style={styles.emptyText}>No label scanned yet</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.navigate('Scan')}>
          <Text style={styles.retryText}>Start Scanning</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Case 2: Analysis Failed (Has Image)
  if (!analysis && !loading) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="broken-image" size={64} color={COLORS.textLight} />
        <Text style={styles.emptyText}>Analysis failed</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => processImage(imageUri)}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
          <Text style={{ color: COLORS.textSecondary }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Analyzing Label...</Text>
        <Text style={styles.loadingSubText}>This may take a few seconds</Text>
      </View>
    );
  }

  const scoreColor = getScoreColor(analysis.healthScore);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {/* Hero Image as Background */}
      <ImageBackground source={{ uri: imageUri }} style={styles.heroBackground} resizeMode="cover">
        <LinearGradient colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.6)']} style={styles.heroGradient}>
          <View style={styles.headerNav}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={shareResult} style={styles.iconBtn}>
              <Ionicons name="share-social-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </ImageBackground>

      {/* Sheet Content */}
      <View style={styles.sheetContainer}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

          {/* Header Section in Sheet */}
          <View style={styles.sheetHeader}>
            <View style={[styles.scoreRing, { borderColor: scoreColor }]}>
              <Text style={[styles.scoreValue, { color: scoreColor }]}>{analysis.healthScore}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <TextInput
                  style={styles.nameInput}
                  value={productName}
                  onChangeText={setProductName}
                  placeholder="Product Name"
                  placeholderTextColor={COLORS.textLight}
                  multiline
                />
                <MaterialIcons name="edit" size={16} color={COLORS.textLight} />
              </View>
              <View style={[styles.statusBadge, { backgroundColor: analysis.vegetarianStatus.toLowerCase().includes('non') ? '#FEF2F2' : '#ECFDF5' }]}>
                <Text style={[styles.statusText, { color: analysis.vegetarianStatus.toLowerCase().includes('non') ? COLORS.error : COLORS.success }]}>
                  {analysis.vegetarianStatus}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Insight Card */}
          <View style={styles.insightBox}>
            <MaterialIcons name="auto-awesome" size={24} color={COLORS.primary} style={{ marginBottom: 8 }} />
            <Text style={styles.insightText}>"{analysis.healthInsight}"</Text>
          </View>

          {/* Nutrition Grid */}
          <Text style={styles.sectionTitle}>Nutrition Facts</Text>
          <View style={styles.gridContainer}>
            <View style={styles.gridItem}>
              <Text style={styles.gridValue}>{analysis.calories}</Text>
              <Text style={styles.gridLabel}>Calories</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridValue}>{analysis.protein}g</Text>
              <Text style={styles.gridLabel}>Protein</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridValue}>{analysis.totalFat}g</Text>
              <Text style={styles.gridLabel}>Fat</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridValue}>{analysis.sugar?.labelSugar || '-'}g</Text>
              <Text style={styles.gridLabel}>Sugar</Text>
            </View>
          </View>

          {/* Warnings */}
          {(analysis.preservatives?.length > 0 || analysis.additives?.length > 0 || analysis.sugar?.estimatedTotalSugar > 10) && (
            <View style={styles.warningCard}>
              <View style={styles.warningHeader}>
                <MaterialIcons name="warning" size={20} color={COLORS.warning} />
                <Text style={styles.warningTitle}>Watch Out</Text>
              </View>

              {analysis.sugar?.estimatedTotalSugar > 10 && (
                <Text style={styles.warningItem}>• High Sugar Content (~{analysis.sugar.estimatedTotalSugar}g)</Text>
              )}

              {analysis.additives?.map((item, i) => (
                <View key={i} style={{ marginTop: 8 }}>
                  <Text style={styles.warningItem}>• {item.name}</Text>
                  <Text style={styles.warningSub}>{item.concern}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Save Button */}
          {!savedAnalysis && (
            <TouchableOpacity style={styles.saveBtn} onPress={saveToLog}>
              <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientEnd]} style={styles.saveGradient}>
                <Text style={styles.saveBtnText}>Save to Diary</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 16, fontFamily: FONTS.regular },
  retryBtn: { marginTop: 16, padding: 12, backgroundColor: COLORS.primary, borderRadius: 8 },
  retryText: { color: COLORS.surface, fontFamily: FONTS.semiBold },
  loadingText: { marginTop: 20, fontSize: 18, fontFamily: FONTS.semiBold, color: COLORS.primary },
  loadingSubText: { marginTop: 8, fontSize: 14, color: COLORS.textLight, fontFamily: FONTS.regular },

  // Layout
  heroBackground: { width: '100%', height: height * 0.45, position: 'absolute', top: 0 },
  heroGradient: { flex: 1 },
  headerNav: { marginTop: 50, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20 },
  iconBtn: { padding: 8, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 20 },

  sheetContainer: {
    marginTop: height * 0.35,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    flex: 1,
    paddingHorizontal: SPACING.l,
    paddingTop: SPACING.xl,
    ...SHADOWS.lg,
  },

  sheetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.l },
  scoreRing: {
    width: 80, height: 80, borderRadius: 40, borderWidth: 6,
    justifyContent: 'center', alignItems: 'center',
    marginRight: SPACING.m
  },
  scoreValue: { fontSize: 28, fontFamily: FONTS.bold },

  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 },
  nameInput: { fontSize: 20, fontFamily: FONTS.bold, color: COLORS.textPrimary, flex: 1, marginRight: 4, minHeight: 30 },

  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  statusText: { fontSize: 12, fontFamily: FONTS.semiBold, textTransform: 'uppercase' },

  divider: { height: 1, backgroundColor: COLORS.border, marginBottom: SPACING.l },

  insightBox: {
    backgroundColor: '#F0FDFA', padding: SPACING.m, borderRadius: 16, marginBottom: SPACING.l,
    borderLeftWidth: 4, borderLeftColor: COLORS.primary
  },
  insightText: { fontSize: 15, fontFamily: FONTS.regular, color: COLORS.textSecondary, fontStyle: 'italic', lineHeight: 22 },

  sectionTitle: { fontSize: 18, fontFamily: FONTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.m },

  gridContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.l, gap: 8 },
  gridItem: {
    flex: 1, backgroundColor: COLORS.background, padding: SPACING.s, borderRadius: 12, alignItems: 'center'
  },
  gridValue: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.textPrimary },
  gridLabel: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 2 },

  warningCard: {
    backgroundColor: '#FFFBEB', padding: SPACING.m, borderRadius: 16, marginBottom: SPACING.l,
    borderWidth: 1, borderColor: '#FCD34D'
  },
  warningHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
  warningTitle: { fontSize: 14, fontFamily: FONTS.semiBold, color: '#B45309' },
  warningItem: { fontSize: 14, fontFamily: FONTS.regular, color: '#92400E', marginBottom: 4 },
  warningSub: { fontSize: 12, color: '#B45309', marginLeft: 10, fontStyle: 'italic' },

  saveBtn: { borderRadius: 16, overflow: 'hidden', marginTop: SPACING.s, marginBottom: 40 },
  saveGradient: { padding: 16, alignItems: 'center' },
  saveBtnText: { color: COLORS.surface, fontFamily: FONTS.bold, fontSize: 16 }
});
