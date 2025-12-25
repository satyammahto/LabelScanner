import { Inter_400Regular, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { MaterialIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged } from 'firebase/auth';
import { onValue, ref } from 'firebase/database';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { COLORS, FONTS } from './constants/theme.js';
import { auth, database } from './services/firebaseConfig';

import HistoryScreen from './app_screens/HistoryScreen';
import HomeScreen from './app_screens/HomeScreen';
import LoginScreen from './app_screens/LoginScreen';
import OnboardingScreen from './app_screens/OnboardingScreen';
import ResultScreen from './app_screens/ResultScreen';
import ScanScreen from './app_screens/ScanScreen';
import SettingsScreen from './app_screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          const icons = {
            'Home': 'home',
            'History': 'history',
            'Scan': 'photo-camera',
            'Result': 'assignment',
            'Settings': 'person'
          };
          return <MaterialIcons name={icons[route.name]} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#9CA3AF', // Gray 400
        tabBarStyle: {
          borderTopWidth: 0,
          elevation: 0,
          backgroundColor: COLORS.surface,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerShown: true,
        headerStyle: {
          backgroundColor: COLORS.background,
          elevation: 0, // Android shadow
          shadowOpacity: 0, // iOS shadow
        },
        headerTitleStyle: {
          color: COLORS.textPrimary,
          fontFamily: FONTS.bold,
          fontSize: 18,
        },
        tabBarLabelStyle: {
          fontFamily: FONTS.semiBold,
          fontSize: 10,
        }
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Daily Tracker' }} />
      <Tab.Screen name="History" component={HistoryScreen} options={{ title: 'History' }} />
      <Tab.Screen name="Scan" component={ScanScreen} options={{ title: 'Scan Label' }} />
      <Tab.Screen name="Result" component={ResultScreen} options={{ title: 'Results' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
        setOnboardingComplete(false);
      }
    });

    return unsubAuth;
  }, []);

  useEffect(() => {
    if (user) {
      const settingsRef = ref(database, `users/${user.uid}/settings`);
      const unsubSettings = onValue(settingsRef, (snapshot) => {
        const data = snapshot.val();
        // Check if essential preferences (like 'diet') are set
        if (data && data.diet) {
          setOnboardingComplete(true);
        } else {
          setOnboardingComplete(false);
        }
        setLoading(false);
      });
      return unsubSettings;
    }
  }, [user]);

  if (loading || !fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : !onboardingComplete ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <Stack.Screen name="MainApp" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
