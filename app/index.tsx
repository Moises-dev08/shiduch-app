import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export default function Index() {
  useEffect(() => {
    // Simulate checking authentication status
    const checkAuth = async () => {
      // TODO: Implement actual authentication check
      // For now, redirect to login after a brief delay
      setTimeout(() => {
        router.replace('/auth/login');
      }, 1500);
    };

    checkAuth();
  }, []);

  return (
    <View style={styles.container}>
      <Ionicons name="heart" size={80} color="#e91e63" />
      <Text style={styles.title}>Shiduchim</Text>
      <Text style={styles.subtitle}>Finding your perfect match</Text>
      <ActivityIndicator size="large" color="#e91e63" style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    marginBottom: 40,
  },
  loader: {
    marginTop: 20,
  },
});
