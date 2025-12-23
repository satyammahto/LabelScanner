import { MaterialIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged } from 'firebase/auth';
import { onValue, ref } from 'firebase/database';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { auth, database } from './services/firebaseConfig';

import LoginScreen from './app_screens/LoginScreen';
import OnboardingScreen from './app_screens/OnboardingScreen';
import ResultScreen from './app_screens/ResultScreen';
import ScanScreen from './app_screens/ScanScreen';
import SettingsScreen from './app_screens/SettingsScreen';
import TodayScreen from './app_screens/TodayScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          const icons = {
            'Scan': 'photo-camera',
            'Result': 'assignment',
            'Today': 'today',
            'Settings': 'person'
          };
          return <MaterialIcons name={icons[route.name]} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#208091',
        tabBarInactiveTintColor: '#ccc',
        headerShown: true,
        headerTitleStyle: { color: '#208091', fontWeight: '600' },
      })}
    >
      <Tab.Screen name="Scan" component={ScanScreen} options={{ title: 'Scan Label' }} />
      <Tab.Screen name="Result" component={ResultScreen} options={{ title: 'Results' }} />
      <Tab.Screen name="Today" component={TodayScreen} options={{ title: "Today's Log" }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

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

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#208091" />
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
