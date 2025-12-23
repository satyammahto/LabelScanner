import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { signOut } from 'firebase/auth';
import { onValue, ref, update } from 'firebase/database';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, database } from '../services/firebaseConfig';

const DIET_TYPES = ['Vegetarian', 'Non-Vegetarian', 'Vegan', 'Eggetarian'];
const HEALTH_GOALS = ['General Health', 'Weight Loss', 'Muscle Gain', 'Diabetes Control', 'Heart Health'];

export default function SettingsScreen({ navigation }) {
    const [diet, setDiet] = useState(['Vegetarian']);
    const [goal, setGoal] = useState('General Health');

    // Personal Details
    const [username, setUsername] = useState('');
    const [profilePic, setProfilePic] = useState(null);
    const [age, setAge] = useState('');
    const [weight, setWeight] = useState('');
    const [height, setHeight] = useState('');
    const [gender, setGender] = useState('Male');

    const [loading, setLoading] = useState(true);
    const [savingDetails, setSavingDetails] = useState(false);

    useEffect(() => {
        const user = auth.currentUser;
        if (user) {
            const settingsRef = ref(database, `users/${user.uid}/settings`);
            const unsub = onValue(settingsRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    if (data.diet) setDiet(Array.isArray(data.diet) ? data.diet : [data.diet]);
                    if (data.goal) setGoal(data.goal);
                    if (data.age) setAge(data.age.toString());
                    if (data.weight) setWeight(data.weight.toString());
                    if (data.height) setHeight(data.height.toString());
                    if (data.gender) setGender(data.gender);
                    if (data.username) setUsername(data.username);
                    if (data.profilePic) setProfilePic(data.profilePic);
                }
                setLoading(false);
            });
            return unsub;
        }
    }, []);

    const pickProfileImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
                base64: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                // Determine if we use URI or Base64. For simple Firebase RTDB text storage, Base64 is easier.
                const imgData = `data:image/jpeg;base64,${result.assets[0].base64}`;
                setProfilePic(imgData);
            }
        } catch (error) {
            Alert.alert('Error', 'Could not pick image');
        }
    };

    const saveDetails = async () => {
        const w = parseFloat(weight);
        const h = parseFloat(height);
        const a = parseFloat(age);

        if (!w || !h || !a) {
            Alert.alert('Error', 'Please enter valid numbers for Age, Weight, and Height');
            return;
        }

        setSavingDetails(true);
        // Recalculate Limits
        let bmr = (10 * w) + (6.25 * h) - (5 * a);
        bmr += (gender === 'Male' ? 5 : -161);
        let tdee = bmr * 1.2;

        let targetCalories = Math.round(tdee);
        let targetProtein = Math.round(w * 0.8);

        switch (goal) {
            case 'Weight Loss': targetCalories -= 500; targetProtein = Math.round(w * 1.5); break;
            case 'Muscle Gain': targetCalories += 300; targetProtein = Math.round(w * 1.8); break;
            case 'Heart Health':
            case 'Diabetes Control':
                targetProtein = Math.round(w * 1.0); break;
        }
        if (targetCalories < 1200) targetCalories = 1200;

        const limits = { calories: targetCalories, protein: targetProtein };

        const user = auth.currentUser;
        if (user) {
            try {
                // Update everything including username and profilePic
                await update(ref(database, `users/${user.uid}/settings`), {
                    age, weight, height, gender, calculatedLimits: limits,
                    username, profilePic
                });
                Alert.alert('Success', 'Profile updated!');
            } catch (error) {
                Alert.alert('Error', 'Failed to save details');
            } finally {
                setSavingDetails(false);
            }
        }
    };

    const saveSetting = async (key, value) => {
        let newValue;
        if (key === 'diet') {
            if (diet.includes(value)) {
                newValue = diet.filter(d => d !== value);
            } else {
                newValue = [...diet, value];
            }
            if (newValue.length === 0) return;
            setDiet(newValue);
        } else {
            newValue = value;
            setGoal(newValue);
        }

        const user = auth.currentUser;
        if (user) {
            try {
                await update(ref(database, `users/${user.uid}/settings`), {
                    [key]: newValue
                });
            } catch (error) {
                Alert.alert('Error', 'Failed to save setting');
            }
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            "Log Out",
            "Are you sure you want to log out?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Log Out",
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await signOut(auth);
                        } catch (error) {
                            Alert.alert("Error", error.message);
                        }
                    }
                }
            ]
        );
    };

    if (loading) return <View style={styles.center}><ActivityIndicator color="#208091" /></View>;

    const OptionGroup = ({ title, options, selected, onSelect, type }) => (
        <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <View style={styles.optionsGrid}>
                {options.map((opt) => {
                    const isSelected = type === 'diet'
                        ? selected.includes(opt)
                        : selected === opt;

                    return (
                        <TouchableOpacity
                            key={opt}
                            style={[styles.option, isSelected && styles.optionSelected]}
                            onPress={() => saveSetting(type, opt)}
                        >
                            <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                                {opt}
                            </Text>
                            {isSelected && <MaterialIcons name="check" size={16} color="#fff" />}
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <LinearGradient
                colors={['#208091', '#16a085']}
                style={styles.headerGradient}
            >
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={pickProfileImage} style={styles.avatarContainer}>
                        {profilePic ? (
                            <Image source={{ uri: profilePic }} style={styles.avatarImage} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarText}>{username ? username[0].toUpperCase() : (auth.currentUser?.email?.[0]?.toUpperCase() || 'U')}</Text>
                            </View>
                        )}
                        <View style={styles.editIconBadge}>
                            <MaterialIcons name="edit" size={12} color="#fff" />
                        </View>
                    </TouchableOpacity>

                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle} numberOfLines={1}>{username || 'User'}</Text>
                        <Text style={styles.headerSubtitle} numberOfLines={1}>{auth.currentUser?.email}</Text>
                    </View>
                </View>
            </LinearGradient>

            <View style={styles.content}>

                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>My Profile</Text>

                    <View style={styles.inputWrapper}>
                        <Text style={styles.label}>Display Name</Text>
                        <TextInput
                            style={styles.input}
                            value={username}
                            onChangeText={setUsername}
                            placeholder="Enter your name"
                            placeholderTextColor="#aaa"
                        />
                    </View>

                    <View style={styles.inputRow}>
                        <View style={styles.inputWrapper}>
                            <Text style={styles.label}>Age</Text>
                            <TextInput style={styles.input} value={age} onChangeText={setAge} keyboardType="numeric" placeholder="25" placeholderTextColor="#aaa" />
                        </View>
                        <View style={styles.inputWrapper}>
                            <Text style={styles.label}>Gender</Text>
                            <TouchableOpacity style={styles.genderToggle} onPress={() => setGender(gender === 'Male' ? 'Female' : 'Male')}>
                                <Text style={styles.genderText}>{gender}</Text>
                                <MaterialIcons name={gender === 'Male' ? 'male' : 'female'} size={20} color="#208091" />
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={styles.inputRow}>
                        <View style={styles.inputWrapper}>
                            <Text style={styles.label}>Weight (kg)</Text>
                            <TextInput style={styles.input} value={weight} onChangeText={setWeight} keyboardType="numeric" placeholder="70" placeholderTextColor="#aaa" />
                        </View>
                        <View style={styles.inputWrapper}>
                            <Text style={styles.label}>Height (cm)</Text>
                            <TextInput style={styles.input} value={height} onChangeText={setHeight} keyboardType="numeric" placeholder="175" placeholderTextColor="#aaa" />
                        </View>
                    </View>
                </View>

                <OptionGroup
                    title="Dietary Preference"
                    options={DIET_TYPES}
                    selected={diet}
                    type="diet"
                />

                <OptionGroup
                    title="Health Goal"
                    options={HEALTH_GOALS}
                    selected={goal}
                    type="goal"
                />

                <TouchableOpacity onPress={saveDetails} disabled={savingDetails}>
                    <LinearGradient
                        colors={['#208091', '#16a085']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.saveButton}
                    >
                        {savingDetails ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Update Profile & Targets</Text>}
                    </LinearGradient>
                </TouchableOpacity>

                {/* About Section */}
                <View style={[styles.sectionContainer, { marginTop: 20 }]}>
                    <Text style={styles.sectionTitle}>About App</Text>
                    <Text style={styles.aboutText}>
                        LabelScanner helps you make healthier food choices by analyzing nutrition labels instantly.
                    </Text>
                    <Text style={[styles.aboutText, { marginTop: 8, fontSize: 13, color: '#999' }]}>Version 1.0.0</Text>
                </View>

                {/* Logout Button */}
                <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                    <MaterialIcons name="logout" size={20} color="#e74c3c" />
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>

            </View>
            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f2f5' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    headerGradient: {
        paddingTop: 60,
        paddingBottom: 40,
        paddingHorizontal: 24,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    headerContent: { flexDirection: 'row', alignItems: 'center', gap: 20 },

    avatarContainer: { position: 'relative' },
    avatarPlaceholder: {
        width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
    },
    avatarImage: {
        width: 70, height: 70, borderRadius: 35, borderWidth: 2, borderColor: '#fff'
    },
    editIconBadge: {
        position: 'absolute', bottom: 0, right: 0, backgroundColor: '#208091',
        width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: '#fff'
    },
    avatarText: { fontSize: 28, fontWeight: 'bold', color: '#fff' },

    headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
    headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

    content: { padding: 20, marginTop: -20 },
    sectionContainer: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 16 },
    optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    option: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: 'transparent',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    optionSelected: { backgroundColor: '#208091', borderColor: '#208091' },
    optionText: { fontSize: 14, color: '#555', fontWeight: '500' },
    optionTextSelected: { color: '#fff', fontWeight: '700' },

    inputRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
    inputWrapper: { flex: 1, marginBottom: 16 },
    label: { fontSize: 13, color: '#666', marginBottom: 6, fontWeight: '500' },
    input: { backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#eee', padding: 14, borderRadius: 12, fontSize: 16, color: '#333' },
    genderToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#eee', padding: 14, borderRadius: 12 },
    genderText: { fontSize: 16, color: '#333' },

    saveButton: { borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 8 },
    saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

    aboutText: { fontSize: 14, color: '#555', lineHeight: 20 },

    logoutButton: {
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        padding: 16, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#ffebee',
        gap: 8, marginBottom: 40
    },
    logoutText: { color: '#e74c3c', fontSize: 16, fontWeight: '700' }
});
