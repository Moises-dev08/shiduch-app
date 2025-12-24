import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { engagementService, EngagementWithProfiles } from '../lib/engagementService';

export default function SuccessfulMatchesScreen() {
  const [engagements, setEngagements] = useState<EngagementWithProfiles[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadEngagements();
  }, []);

  const loadEngagements = async () => {
    const result = await engagementService.getConfirmedEngagements();
    if (result.success && result.engagements) {
      setEngagements(result.engagements);
    }
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEngagements();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} ${months === 1 ? 'month' : 'months'} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Successful Matches</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#03a9f4" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Successful Matches</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Statistics Card */}
      <View style={styles.statsCard}>
        <View style={styles.statsContent}>
          <Ionicons name="heart" size={40} color="#ff4d4d" />
          <View style={styles.statsTextContainer}>
            <Text style={styles.statsNumber}>{engagements.length}</Text>
            <Text style={styles.statsLabel}>
              {engagements.length === 1 ? 'Couple Engaged' : 'Couples Engaged'}
            </Text>
          </View>
        </View>
        <Text style={styles.statsSubtext}>
          Mazel Tov to all the happy couples! 🎉
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#03a9f4']}
            tintColor="#03a9f4"
          />
        }
      >
        {engagements.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="heart-outline" size={80} color="#ccc" />
            <Text style={styles.emptyText}>No Engagements Yet</Text>
            <Text style={styles.emptySubtext}>
              Be the first to share your success story!
            </Text>
          </View>
        ) : (
          <View style={styles.engagementsContainer}>
            {engagements.map((engagement) => (
              <View key={engagement.id} style={styles.engagementCard}>
                <View style={styles.couplesContainer}>
                  {/* User 1 */}
                  <View style={styles.personContainer}>
                    <Text style={styles.personName}>
                      {engagement.user1_profile?.first_name || 'User'} {engagement.user1_profile?.last_name || ''}
                    </Text>
                  </View>

                  {/* Heart Icon */}
                  <View style={styles.heartContainer}>
                    <Ionicons name="heart" size={32} color="#ff4d4d" />
                  </View>

                  {/* User 2 */}
                  <View style={styles.personContainer}>
                    <Text style={styles.personName}>
                      {engagement.user2_profile?.first_name || 'User'} {engagement.user2_profile?.last_name || ''}
                    </Text>
                  </View>
                </View>

                {/* Date */}
                <View style={styles.dateContainer}>
                  <Ionicons name="calendar-outline" size={16} color="#666" />
                  <Text style={styles.dateText}>
                    Engaged {engagement.confirmed_at ? formatDate(engagement.confirmed_at) : 'recently'}
                  </Text>
                </View>

                {/* Congratulations Message */}
                <View style={styles.congratsContainer}>
                  <Text style={styles.congratsText}>
                    Mazel Tov! 🎊
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  statsCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statsTextContainer: {
    marginLeft: 16,
  },
  statsNumber: {
    fontSize: 36,
    fontWeight: '700',
    color: '#333',
  },
  statsLabel: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  statsSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  engagementsContainer: {
    paddingHorizontal: 16,
  },
  engagementCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  couplesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingVertical: 12,
  },
  personContainer: {
    alignItems: 'center',
    flex: 1,
  },
  personName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    lineHeight: 24,
  },
  heartContainer: {
    paddingHorizontal: 16,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  dateText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  congratsContainer: {
    backgroundColor: '#fff5f5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffe0e0',
  },
  congratsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff4d4d',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});

