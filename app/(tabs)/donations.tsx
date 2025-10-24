import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface DonationOption {
  id: string;
  title: string;
  description: string;
  amount?: string;
  icon: string;
  color: string;
  link: string;
}

const donationOptions: DonationOption[] = [
  {
    id: 'shiduch-event-ny',
    title: 'Shiduch Event - New York',
    description: 'Support our upcoming Shiduch event in New York. Help us create meaningful connections in the community.',
    amount: 'Suggested: $18+',
    icon: 'heart',
    color: '#e91e63',
    link: 'https://example.com/donate/shiduch-event-ny'
  },
  {
    id: 'app-maintenance',
    title: 'App Maintenance',
    description: 'Help us keep the app running smoothly with regular updates, server costs, and technical improvements.',
    amount: 'Suggested: $10+',
    icon: 'settings',
    color: '#2196f3',
    link: 'https://example.com/donate/app-maintenance'
  },
  {
    id: 'community-support',
    title: 'Community Support',
    description: 'Support our community programs, educational resources, and outreach initiatives.',
    amount: 'Suggested: $25+',
    icon: 'people',
    color: '#4caf50',
    link: 'https://example.com/donate/community-support'
  },
  {
    id: 'scholarship-fund',
    title: 'Scholarship Fund',
    description: 'Help young couples with wedding expenses and support families in need.',
    amount: 'Suggested: $50+',
    icon: 'school',
    color: '#ff9800',
    link: 'https://example.com/donate/scholarship-fund'
  },
  {
    id: 'emergency-relief',
    title: 'Emergency Relief',
    description: 'Support families during difficult times with emergency financial assistance.',
    amount: 'Any amount',
    icon: 'medical',
    color: '#f44336',
    link: 'https://example.com/donate/emergency-relief'
  },
  {
    id: 'general-fund',
    title: 'General Fund',
    description: 'Support our general operations and help us grow the Shiduchim community.',
    amount: 'Any amount',
    icon: 'medical',
    color: '#9c27b0',
    link: 'https://example.com/donate/general-fund'
  }
];

export default function DonationsScreen() {
  const handleDonationPress = async (option: DonationOption) => {
    try {
      const supported = await Linking.canOpenURL(option.link);
      if (supported) {
        await Linking.openURL(option.link);
      } else {
        Alert.alert(
          'Unable to Open Link',
          'Please visit our website to make a donation.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'Unable to open donation link. Please try again later.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <FontAwesome5 name="donate" size={40} color="#e91e63" />
        <Text style={styles.title}>Support Our Community</Text>
        <Text style={styles.subtitle}>Your donations help us create meaningful connections</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.donationsList}>
          {donationOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.donationCard}
              onPress={() => handleDonationPress(option)}
            >
              <View style={styles.donationHeader}>
                <View style={[styles.iconContainer, { backgroundColor: option.color }]}>
                  <Ionicons name={option.icon as any} size={24} color="#fff" />
                </View>
                <View style={styles.donationInfo}>
                  <Text style={styles.donationTitle}>{option.title}</Text>
                  {option.amount && (
                    <Text style={styles.donationAmount}>{option.amount}</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </View>
              
              <Text style={styles.donationDescription}>{option.description}</Text>
              
              <View style={styles.donationFooter}>
                <View style={styles.donateButton}>
                  <Ionicons name="heart" size={16} color="#e91e63" />
                  <Text style={styles.donateButtonText}>Donate Now</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            All donations are processed securely and go directly to supporting our community initiatives.
          </Text>
          <Text style={styles.footerText}>
            Thank you for your generosity! 🙏
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    marginTop: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  scrollView: {
    flex: 1,
  },
  donationsList: {
    padding: 16,
  },
  donationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  donationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  donationInfo: {
    flex: 1,
  },
  donationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  donationAmount: {
    fontSize: 14,
    color: '#e91e63',
    fontWeight: '600',
  },
  donationDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  donationFooter: {
    alignItems: 'flex-end',
  },
  donateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e91e63',
  },
  donateButtonText: {
    fontSize: 14,
    color: '#e91e63',
    fontWeight: '600',
    marginLeft: 4,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
});
