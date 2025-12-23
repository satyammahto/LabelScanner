import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth } from '../services/firebaseConfig';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      console.error(error);
      let msg = error.message;
      if (error.code === 'auth/invalid-email') msg = 'Invalid email address.';
      if (error.code === 'auth/wrong-password') msg = 'Incorrect password.';
      if (error.code === 'auth/email-already-in-use') msg = 'Email already in use.';
      if (error.code === 'auth/weak-password') msg = 'Password should be at least 6 characters.';
      Alert.alert('Authentication Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#208091', '#16a085']}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <MaterialIcons name="local-dining" size={80} color="#fff" />
          <Text style={styles.title}>LabelScanner</Text>
          <Text style={styles.subtitle}>{isLogin ? 'Welcome Back!' : 'Create an Account'}</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.formContainer}
      >
        <View style={styles.card}>
          <View style={styles.inputContainer}>
            <MaterialIcons name="email" size={20} color="#208091" style={styles.icon} />
            <TextInput
              placeholder="Email Address"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputContainer}>
            <MaterialIcons name="lock" size={20} color="#208091" style={styles.icon} />
            <TextInput
              placeholder="Password"
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor="#999"
            />
          </View>

          <TouchableOpacity onPress={handleAuth} disabled={loading}>
            <LinearGradient
              colors={['#208091', '#16a085']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.button}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>{isLogin ? 'Log In' : 'Sign Up'}</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.switchButton}>
            <Text style={styles.switchText}>
              {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  headerGradient: {
    height: 320,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    paddingBottom: 40,
  },
  headerContent: { alignItems: 'center' },
  title: { fontSize: 36, fontWeight: '800', color: '#fff', marginTop: 10, letterSpacing: 0.5 },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.9)', marginTop: 8 },
  formContainer: { flex: 1, marginTop: -60, paddingHorizontal: 24 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  icon: { marginRight: 12 },
  input: { flex: 1, height: '100%', fontSize: 16, color: '#333' },
  button: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#208091',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  switchButton: { alignItems: 'center', marginTop: 20 },
  switchText: { color: '#666', fontSize: 14, fontWeight: '500' },
});
